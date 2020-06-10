import { StatusBarItem, workspace, LanguageClient } from 'coc.nvim';
import { Dispose } from '../util/dispose';

class StatusBar extends Dispose {
  private isLSPReady = false;
  private statusBar: StatusBarItem | undefined = undefined;

  ready(client: LanguageClient) {
    this.isLSPReady = true;
    // register analyzer status
    client.onNotification('$/analyzerStatus', (params: { isAnalyzing: boolean }) => {
      this.progress(params.isAnalyzing);
    });
  }

  init() {
    this.statusBar = workspace.createStatusBarItem(0, { progress: false });
    this.push(this.statusBar);

    this.push(
      workspace.registerAutocmd({
        event: 'BufEnter',
        request: false,
        callback: async () => {
          if (this.isLSPReady) {
            const doc = await workspace.document;
            if (doc.filetype === 'javascript') {
              this.show('react-native');
            } else {
              this.hide();
            }
          }
        },
      }),
    );
  }

  show(message: string, isProgress?: boolean) {
    if (this.statusBar) {
      this.statusBar.text = message;
      if (isProgress !== undefined) {
        this.statusBar.isProgress = isProgress;
      }
      this.statusBar.show();
    }
  }

  hide() {
    if (this.statusBar) {
      this.statusBar.hide();
    }
  }

  progress(isProgress = true) {
    if (this.statusBar) {
      this.statusBar.isProgress = isProgress;
    }
  }

  dispose() {
    super.dispose();
    this.statusBar = undefined;
  }
}

export const statusBar = new StatusBar();
