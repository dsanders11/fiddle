import * as path from 'node:path';

import { BrowserWindow, MessageChannelMain, shell } from 'electron';

import { createContextMenu } from './context-menu';
import { startFiddle } from './fiddle-core';
import { ipcMainManager } from './ipc';
import { IpcEvents } from '../ipc-events';

// Keep a global reference of the window objects, if we don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
export let browserWindows: Array<BrowserWindow | null> = [];

// Global variables exposed by forge/webpack-plugin to reference
// the entry point of preload and index.html over http://
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

let mainIsReadyResolver: () => void;
const mainIsReadyPromise = new Promise<void>(
  (resolve) => (mainIsReadyResolver = resolve),
);

export function mainIsReady() {
  mainIsReadyResolver();
}

/**
 * Gets default options for the main window
 *
 * @returns {Electron.BrowserWindowConstructorOptions}
 */
export function getMainWindowOptions(): Electron.BrowserWindowConstructorOptions {
  const HEADER_COMMANDS_HEIGHT = 50;
  const MACOS_TRAFFIC_LIGHTS_HEIGHT = 16;

  return {
    width: 1400,
    height: 900,
    minHeight: 600,
    minWidth: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : undefined,
    titleBarOverlay: process.platform === 'darwin',
    trafficLightPosition: {
      x: 20,
      y: HEADER_COMMANDS_HEIGHT / 2 - MACOS_TRAFFIC_LIGHTS_HEIGHT / 2,
    },
    acceptFirstMouse: true,
    backgroundColor: '#1d2427',
    show: false,
    webPreferences: {
      preload: !!process.env.JEST
        ? path.join(process.cwd(), './.webpack/renderer/main_window/preload.js')
        : MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  };
}

/**
 * Creates a new main window.
 *
 * @export
 * @returns {Electron.BrowserWindow}
 */
export function createMainWindow(): Electron.BrowserWindow {
  console.log(`Creating main window`);
  let browserWindow: BrowserWindow | null;
  browserWindow = new BrowserWindow(getMainWindowOptions());
  browserWindow.loadURL(
    !!process.env.JEST
      ? path.join(process.cwd(), './.webpack/renderer/main_window/index.html')
      : MAIN_WINDOW_WEBPACK_ENTRY,
  );

  browserWindow.webContents.once('dom-ready', () => {
    if (browserWindow) {
      browserWindow.show();

      createContextMenu(browserWindow);
    }
  });

  browserWindow.on('focus', () => {
    if (browserWindow) {
      ipcMainManager.send(IpcEvents.SET_SHOW_ME_TEMPLATE);
    }
  });

  browserWindow.on('closed', () => {
    browserWindows = browserWindows.filter((bw) => browserWindow !== bw);

    browserWindow = null;
  });

  browserWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  browserWindow.webContents.on('will-navigate', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  ipcMainManager.on(IpcEvents.RELOAD_WINDOW, () => {
    browserWindow?.reload();
  });

  browserWindows.push(browserWindow);

  const webContents = browserWindow.webContents;

  // Send port along to the preload script
  webContents.on('did-finish-load', () => {
    const { port1, port2 } = new MessageChannelMain();
    webContents.mainFrame.postMessage('port', null, [port1]);
    port2.on('message', (event) => {
      const [channel, ...args] = event.data;
      if (channel === IpcEvents.START_FIDDLE) {
        const params = args[0];
        startFiddle(webContents, params);
      }

      // port2.postMessage({ type: 'response' });
    });
    port2.start();
  });

  return browserWindow;
}

/**
 * Gets or creates the main window, returning it in both cases.
 *
 * @returns {Promise<Electron.BrowserWindow>}
 */
export async function getOrCreateMainWindow(): Promise<Electron.BrowserWindow> {
  await mainIsReadyPromise;
  return (
    BrowserWindow.getFocusedWindow() || browserWindows[0] || createMainWindow()
  );
}
