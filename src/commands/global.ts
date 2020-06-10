import { commands, workspace } from 'coc.nvim';

import { Dispose } from '../util/dispose';
import { cmdPrefix } from '../util/constant';
import { execCommand } from '../util/fs';
import { logger } from '../util/logger';

interface GCmd {
  name?: string;
  cmd: string;
  desc: string;
  execute: (cmd: GCmd, ...args: string[]) => Promise<void>;
  getArgs?: () => Promise<string[]>;
}

const getCmd = () => {
  return async ({ cmd, getArgs }: GCmd, ...inputArgs: string[]): Promise<void> => {
    let args: string[] = [];
    if (getArgs) {
      args = await getArgs();
    }
    if (inputArgs.length) {
      args = args.concat(inputArgs);
    }
    const { err, stdout, stderr } = await execCommand(`react-native ${cmd} ${args.join(' ')}`);
    const devLog = logger.devOutchannel;
    if (stdout) {
      devLog.append(`\n${stdout}\n`);
    }
    if (stderr) {
      devLog.append(`\n${stderr}\n`);
    }
    if (err) {
      devLog.append([err.message, err.stack].join('\n'));
    }
    devLog.show();
  };
};

const cmds: GCmd[] = [
  {
    cmd: 'start',
    desc: 'react-native start',
    execute: getCmd(),
  },
];

export class Global extends Dispose {
  constructor() {
    super();
    cmds.forEach(cmd => {
      const { desc, execute, name } = cmd;
      const cmdId = `${cmdPrefix}.${name || cmd.cmd}`;
      this.push(
        commands.registerCommand(cmdId, async (...args: string[]) => {
          const statusBar = workspace.createStatusBarItem(0, { progress: true });
          this.push(statusBar);
          statusBar.text = desc;
          statusBar.show();
          await execute(cmd, ...args);
          this.remove(statusBar);
        }),
      );
      commands.titles.set(cmdId, desc);
    });
  }
}
