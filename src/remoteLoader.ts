import * as React from 'react';
import * as ReactDOM from 'react-dom';

const PLATEFORM_URL =
  import.meta.env.VITE_PLATEFORM_URL ||
  'https://plateform.konitys.fr';

interface RemoteContainer {
  init: (shareScope: Record<string, unknown>) => void;
  get: (module: string) => Promise<() => any>;
}

function ensureSharedScope() {
  const g = globalThis as any;
  g.__federation_shared__ = g.__federation_shared__ || {};
  g.__federation_shared__['default'] = g.__federation_shared__['default'] || {};

  const shared = g.__federation_shared__['default'];

  const reactEntry = {
    get: () => () => React,
    loaded: true,
    scope: 'default',
  };
  const reactDomEntry = {
    get: () => () => ReactDOM,
    loaded: true,
    scope: 'default',
  };

  if (!shared['react']) shared['react'] = {};
  shared['react'][React.version] = reactEntry;
  shared['react']['18.3.1'] = reactEntry;
  shared['react']['18.0.0'] = reactEntry;

  if (!shared['react-dom']) shared['react-dom'] = {};
  shared['react-dom'][React.version] = reactDomEntry;
  shared['react-dom']['18.3.1'] = reactDomEntry;
  shared['react-dom']['18.0.0'] = reactDomEntry;
}

let containerPromise: Promise<RemoteContainer> | null = null;

function loadRemoteEntry(): Promise<RemoteContainer> {
  if (containerPromise) return containerPromise;

  ensureSharedScope();

  containerPromise = import(/* @vite-ignore */ `${PLATEFORM_URL}/assets/remoteEntry.js`)
    .then((container: RemoteContainer) => {
      const g = globalThis as any;
      container.init(g.__federation_shared__?.['default'] || {});
      return container;
    })
    .catch((err) => {
      containerPromise = null;
      throw err;
    });

  return containerPromise;
}

export async function loadRemoteComponent(moduleName: string): Promise<{ default: React.ComponentType<any> }> {
  const container = await loadRemoteEntry();
  const factory = await container.get(moduleName);
  const result = factory();

  if (result && typeof result === 'object' && 'default' in result) {
    return result;
  }
  return { default: result };
}
