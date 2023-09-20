import * as React from 'react';

// import { Button, ButtonProps, Spinner } from '@blueprintjs/core';
import { observer } from 'mobx-react';

// import { InstallState } from '../../interfaces';
import { AppState } from '../state';

interface RunnerProps {
  appState: AppState;
}

interface RunnerState {
  focus: boolean;
}

/**
 * The runner component is responsible for actually launching the fiddle
 * with Electron. It also renders the button that does so.
 *
 * @class Runner
 * @extends {React.Component<RunnerProps, RunnerState>}
 */
export const Runner = observer(
  class Runner extends React.Component<RunnerProps, RunnerState> {
    private ref = React.createRef<HTMLIFrameElement>();

    constructor(props: RunnerProps) {
      super(props);

      this.state = {
        focus: false,
      };

      this.onLoad = this.onLoad.bind(this);
    }

    private onLoad() {
      const { port1, port2 } = new MessageChannel();

      port1.addEventListener('message', (event) => {
        const [channel] = event.data;

        switch (channel) {
          case 'FOCUS':
            this.setState({ focus: true });
            break;

          case 'BLUR':
            this.setState({ focus: false });
            break;
        }
      });

      port1.start();

      this.ref.current!.contentWindow!.postMessage('parent-frame', '*', [
        port2,
      ]);
    }

    public render() {
      return (
        <iframe
          id="isolated-runner"
          className={`${this.state.focus ? 'focused' : ''}`}
          src="electron-fiddle-privileged://runner/index.html"
          onLoad={this.onLoad}
          ref={this.ref}
        />
      );
    }
  },
);
