import { ElectronVersions } from '@electron/fiddle-core';

import releasesJSON from '../../static/releases.json';
import { IpcEvents } from '../ipc-events';
import { ipcMainManager } from './ipc';

export async function setupFiddleCore() {
  // TODO - How to migrate `electron-known-versions` from renderer `localStorage`?
  const electronVersions = await ElectronVersions.create(undefined, {
    initialVersions: releasesJSON,
  });
  electronVersions.fetch();

  const getKnownVersions = () =>
    electronVersions.versions.map(({ version }) => version);

  ipcMainManager.handle(IpcEvents.GET_KNOWN_VERSIONS, getKnownVersions);
  ipcMainManager.handle(IpcEvents.GET_RELEASE_INFO, (_event, version: string) =>
    electronVersions.getReleaseInfo(version),
  );
  ipcMainManager.handle(IpcEvents.REFRESH_KNOWN_VERSIONS, async () => {
    await electronVersions.fetch();

    return getKnownVersions();
  });
}
