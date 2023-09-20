import { IpcEvents } from '../ipc-events';

import '../less/root.less';

const ports: { mainProcess?: MessagePort; parentFrame?: MessagePort } = {};

window.addEventListener('message', (event) => {
  // Use the port that was transferred to talk to main process
  if (event.data === 'main-process') {
    ports.mainProcess = event.ports[0];
    document!.getElementById('start-fiddle')!.onclick = () => {
      ports.mainProcess!.postMessage([IpcEvents.START_FIDDLE, {}]);
    };
    ports.mainProcess.onmessage = (event) => {
      if (event.data.type === 'response') {
        ports.parentFrame!.postMessage(event.data.data);
      }
    };
  } else if (event.data === 'parent-frame') {
    ports.parentFrame = event.ports[0];
  }
});

const button = document.getElementById('start-fiddle');

button!.onfocus = () => ports.parentFrame!.postMessage(['FOCUS']);
button!.onblur = () => ports.parentFrame!.postMessage(['BLUR']);
