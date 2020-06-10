import { ExtensionContext, workspace } from 'coc.nvim';

import { logger, logLevel } from './util/logger';
import { Commands } from './commands';

export async function activate(context: ExtensionContext): Promise<void> {
  const config = workspace.getConfiguration('react-native');
  const isEnabled = config.get<boolean>('enabled', true);

  // if not enabled then return
  if (!isEnabled) {
    return;
  }

  context.subscriptions.push(logger);
  // logger init
  logger.init(config.get<logLevel>('trace.server', 'off'));

  // register commands
  context.subscriptions.push(new Commands());
}
