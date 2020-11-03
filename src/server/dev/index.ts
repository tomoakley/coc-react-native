import { OutputChannel, workspace, Disposable } from 'coc.nvim';
import os from 'os';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';

import { getRNWorkspaceFolder } from '../../util/fs';
import { lineBreak, devLogName } from '../../util/constant';
import { logger } from '../../util/logger';
import { notification } from '../../lib/notification';
import { Dispose } from '../../util/dispose';

const log = logger.getlog('server');

type callback = (...params: any[]) => void;

class DevServer extends Dispose {
  private stdoutOutput = '';
  private stderrOutput = '';
  private outputChannel: OutputChannel | undefined;
  private task: ChildProcessWithoutNullStreams | undefined;
  private onHandler: callback[] = [];
  private isAutoScroll = false;
  private consoleVisible = false;

  constructor() {
    super();
    this.push({
      dispose: () => {
        if (this.task) {
          try {
            this.task.kill();
            this.task = undefined;
          } catch (error) {
            log(`dispose server error: ${error.message}`);
          }
        }
      },
    });
  }

  private _onError = (err: Error) => {
    this.task = undefined;
    log(`server error: ${err.message}`);
  };

  private _onExit = (code: number) => {
    this.task = undefined;
    log(`server exit with: ${code}`);
  };

  private devLog(message: string) {
    if (this.outputChannel) {
      this.outputChannel.append(message);
    }
  }

  get state(): boolean {
    return !!this.task && this.task.stdin.writable;
  }

  async stop(): Promise<boolean> {
    if (this.task && this.task.stdin.writable) {
      this.task.stdin.write('^C\n');
      this.task.kill();
      notification.show('React Native packager stopped.');
    }
    return Promise.resolve(true);
  }

  async start(args: string[]): Promise<boolean> {
    await this.stop();
    const workspaceFolder = await getRNWorkspaceFolder();
    if (!workspaceFolder) {
      notification.show('React Native project workspaceFolder not found!');
      return false;
    }

    log(`server start at: ${workspaceFolder}`);
    notification.show(`Starting the React Native packager...`);

    this.stdoutOutput = '';

    if (this.outputChannel) {
      this.outputChannel.clear();
    } else {
      this.outputChannel = logger.devOutchannel;
    }

    this.task = spawn('react-native', args, {
      cwd: workspaceFolder,
      detached: false,
      shell: os.platform() === 'win32' ? true : undefined,
    });
    this.task.on('exit', this._onExit);
    this.task.on('error', this._onError);

    if (this.onHandler.length) {
      this.onHandler.forEach(cb => cb());
      this.onHandler = [];
    }
    return true;
  }

  async openDevLog() {
    if (this.task && this.task.stdin.writable) {
      this.task.stdin.write('d\n');
      this.task.kill();
      notification.show('Showing the developer menu...');
    }
    return Promise.resolve(true);
  }

  async reloadApp() {
    if (this.task && this.task.stdin.writable) {
      this.task.stdin.write('r\n');
      this.task.kill();
      notification.show('Reloading the app...');
    }
    return Promise.resolve(true);
  }

  onExit(handler: (...params: any[]) => any) {
    const callback = () => {
      this.task!.on('exit', handler);
    };
    if (this.task) {
      callback();
    } else {
      this.onHandler.push(callback);
    }
  }

  onError(handler: (...params: any[]) => any) {
    if (this.task) {
      this.task.on('error', handler);
    } else {
      this.onHandler.push(() => {
        this.task!.on('error', handler);
      });
    }
  }

  onStdout(handler: (lines: string[]) => void) {
    const callback = () => {
      this.task!.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        this.devLog(text);
        this.stdoutOutput += text;
        const lines = this.stdoutOutput.split(lineBreak);
        if (lines.length > 1) {
          if (lines[lines.length - 1] === '') {
            lines.pop();
            this.stdoutOutput = '';
          } else {
            this.stdoutOutput = lines.pop()!;
          }
          handler(lines);
        }
      });
    };
    if (this.task && this.task.stdout) {
      callback();
    } else {
      this.onHandler.push(callback);
    }
  }

  onStderr(handler: (lines: string[]) => void) {
    const callback = () => {
      this.task!.stderr.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        this.devLog(text);
        this.stderrOutput += text;
        const lines = this.stderrOutput.split(lineBreak);
        if (lines.length > 1) {
          if (lines[lines.length - 1] === '') {
            lines.pop();
            this.stderrOutput = '';
          } else {
            this.stderrOutput = lines.pop()!;
          }
          handler(lines);
        }
      });
    };
    if (this.task && this.task.stderr) {
      callback();
    } else {
      this.onHandler.push(callback);
    }
  }

  sendCommand(cmd?: string) {
    if (!cmd) {
      return;
    }
    if (this.task && this.task.stdin.writable) {
      this.task.stdin.write(cmd);
    } else {
      notification.show('React Native packager is not running!');
    }
  }

  async autoScrollLogWin() {
    if (this.isAutoScroll) {
      return;
    }
    this.isAutoScroll = true;
    const buffers = await workspace.nvim.buffers;
    for (const buf of buffers) {
      const name = await buf.name;
      log(`bufName ${name}`);
      if (name === `output:///${devLogName}`) {
        const isAttach = await buf.attach(false);
        if (!isAttach) {
          log(`Attach buf ${name} error`);
          this.isAutoScroll = false;
          return;
        }
        this.isAutoScroll = true;
        buf.listen('lines', async () => {
          const wins = await workspace.nvim.windows;
          if (!wins || !wins.length) {
            return;
          }
          for (const win of wins) {
            const b = await win.buffer;
            const name = await b.name;
            if (name === `output:///${devLogName}`) {
              const lines = await buf.length;
              const curWin = await workspace.nvim.window;
              // do not scroll when log win get focus
              if (win.id === curWin.id) {
                return;
              }
              win.setCursor([lines, 0]);
              break;
            }
          }
        });
        buf.listen('detach', () => {
          if (this.isAutoScroll) {
            log(`Unexpected detach buf ${name}`);
            this.isAutoScroll = false;
          }
        });
        this.push(
          Disposable.create(() => {
            if (this.isAutoScroll) {
              this.isAutoScroll = false;
              try {
                buf.removeAllListeners();
                buf.detach();
              } catch (error) {
                log(`Detach error ${error.message || error}`);
              }
            }
          }),
        );
        break;
      }
    }
    this.isAutoScroll = false;
  }
}

export const devServer = new DevServer();
