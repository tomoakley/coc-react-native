import { commands, Disposable } from 'coc.nvim';

import { devServer } from '../server/dev';
import { Dispose } from '../util/dispose';
import { opener } from '../util/opener';
import { notification } from '../lib/notification';
import { logger } from '../util/logger';
import { cmdPrefix } from '../util/constant';
import { reduceSpace } from '../util';

const log = logger.getlog('dev-command');

interface DCmd {
  cmd?: string;
  desc: string;
  callback?: (...params: any[]) => any;
}

export const cmds: Record<string, DCmd> = {
  stop: {
    desc: 'Stop the React Native packager',
    callback: () => {
      devServer.stop();
    },
  },
  toggleConsole: {
    desc: 'Hide / show the React Native console',
    callback: () => {
      if (devServer.state) {
        devServer.openDevLog();
      }
    },
  },
  showDevMenu: {
    desc: 'Show the developer menu',
    callback: () => {
      if (devServer.state) {
        devServer.openDevLog();
      }
    },
  },
  reload: {
    desc: 'Reload the app',
    callback: () => {
      if (devServer.state) {
        devServer.reloadApp()
      }
    }
  }
};

export class Dev extends Dispose {
  private profilerUrl: string | undefined;
  private cmds: Disposable[] = [];

  constructor() {
    super();
    ['start'].forEach(cmd => {
      const cmdId = `${cmdPrefix}.${cmd}`;
      this.push(
        commands.registerCommand(
          cmdId,
          (...args: string[]) => {
            this.execute(cmd, args);
          },
          this,
        ),
      );
      this.push(
        (function() {
          commands.titles.set(cmdId, `${cmd} React Native packager`);
          return {
            dispose() {
              commands.titles.delete(cmdId);
            },
          };
        })(),
      );
    });
    this.push(devServer);
    log('register dev command');
  }

  private async execute(cmd: string, args: string[]) {
    log(`${cmd} dev server, devServer state: ${devServer.state}`);
    const state = await devServer.start([cmd].concat(args));
    if (state) {
      devServer.onError(this.onError);
      devServer.onExit(this.onExit);
      devServer.onStdout(this.onStdout);
      devServer.onStderr(this.onStderr);
      this.registerCommands();
    }
  }

  private registerCommands() {
    log('register commands');
    this.cmds.push(
      ...Object.keys(cmds).map(key => {
        const cmdId = `${cmdPrefix}.dev.${key}`;
        commands.titles.set(cmdId, cmds[key].desc);
        const subscription = commands.registerCommand(cmdId, this.execCmd(cmds[key]));
        return {
          dispose() {
            commands.titles.delete(cmdId);
            subscription.dispose();
          },
        };
      }),
    );
  }

  private unRegisterCommands() {
    log('unregister commands');
    if (this.cmds) {
      this.cmds.forEach(cmd => {
        cmd.dispose();
      });
    }
    this.cmds = [];
  }

  private onError = (err: Error) => {
    log(`devServer error: ${err.message}\n${err.stack}`);
    this.unRegisterCommands();
    notification.show(`${err.message}`);
  };

  private onExit = (code: number) => {
    log(`devServer exit with: ${code}`);
    this.unRegisterCommands();
    if (code !== 0 && code !== 1) {
      notification.show(`react native packager exist with ${code}`);
    }
  };

  /**
   * do not display lines:
   * - `W/xxx`
   * - `I/xxx`
   * - `D/xxx`
   * - `🔥  To hot reload xxx`
   * - `An Observatory debugger and profiler xxx`
   * - `For a more detailed help message, press "h" xxx`
   * - `Initializing hot reload...`
   * - `Performing hot reload...`
   * - `Reloaded 1 of 469 libraries in 261ms.`
   */
  private filterInvalidLines(lines: string[]): string[] {
    return lines
      .map(line => reduceSpace(line))
      .filter(line => {
        return (
          line !== '' &&
          !/^[DIW]\//.test(line) &&
          !line.startsWith('🔥 To hot reload') &&
          !line.startsWith('An Observatory debugger and profiler') &&
          !line.startsWith('For a more detailed help message, press "h"') &&
          !line.startsWith('Initializing hot reload') &&
          !line.startsWith('Performing hot reload') &&
          !line.startsWith('Reloaded ') &&
          !line.startsWith('Flutter run key commands.') &&
          !line.startsWith('r Hot reload. 🔥🔥🔥') &&
          !line.startsWith('R Hot restart.') &&
          !line.startsWith('h Repeat this help message.') &&
          !line.startsWith('d Detach (terminate "flutter run" but leave application running).') &&
          !line.startsWith('c Clear the screen') &&
          !line.startsWith('q Quit (terminate the application on the device).') &&
          !line.startsWith('flutter: Another exception was thrown:') &&
          !line.startsWith('An Observatory debugger and profiler on') &&
          !/^flutter: #\d+ +.+$/.test(line)
        );
      });
  }

  private onStdout = (lines: string[]) => {
    lines.forEach(line => {
      const m = line.match(
        /^\s*An Observatory debugger and profiler on .* is available at:\s*(https?:\/\/127\.0\.0\.1:\d+\/.+\/)$/,
      );
      if (m) {
        this.profilerUrl = m[1];
      }
    });
    notification.show(this.filterInvalidLines(lines));
  };

  private onStderr = (/* lines: string[] */) => {
    // TODO: stderr output
  };

  execCmd(cmd: DCmd) {
    return () => {
      if (devServer.state) {
        if (cmd.cmd) {
          devServer.sendCommand(cmd.cmd);
        }
        if (cmd.callback) {
          cmd.callback(this);
        }
      } else {
        notification.show('react native packager is not running!');
      }
    };
  }

  openProfiler() {
    if (!this.profilerUrl) {
      return;
    }
    if (devServer.state) {
      try {
        return opener(this.profilerUrl);
      } catch (error) {
        log(`Open browser fail: ${error.message}\n${error.stack}`);
        notification.show(`Open browser fail: ${error.message || error}`);
      }
    }
    notification.show('react native packager is not running!');
  }

  dispose() {
    super.dispose();
    this.unRegisterCommands();
  }
}
