#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const rootDir = path.resolve(__dirname, '..');
const sourcePath = path.join(rootDir, 'js', 'odyssey-portraits-data.js');
const loaderPath = path.join(rootDir, 'js', 'odyssey-portraits.js');
const chunksDir = path.join(rootDir, 'js', 'odyssey-portraits-chunks');
const chunkFilePrefix = 'odyssey-portraits-';
const chunkSize = 48;
const assetVersion = '20260704b';

function loadPortraits() {
  const code = fs.readFileSync(sourcePath, 'utf8');
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(code, context, { filename: sourcePath });

  if (!Array.isArray(context.window.odysseyPortraits)) {
    throw new Error('window.odysseyPortraits was not found in js/odyssey-portraits-data.js');
  }

  return context.window.odysseyPortraits;
}

function writeLoader(total, chunkCount) {
  const loader = `(function () {
  const total = ${total};
  const chunkCount = ${chunkCount};
  const chunkSize = ${chunkSize};
  const version = '${assetVersion}';
  const chunkBase = '/js/odyssey-portraits-chunks/${chunkFilePrefix}';
  const root = window;
  const loadedChunks = new Array(chunkCount).fill(false);
  const chunkPromises = new Map();
  const portraits = Array.isArray(root.odysseyPortraits) ? root.odysseyPortraits : [];

  root.odysseyPortraits = portraits;
  root.odysseyPortraitTotal = total;
  root.odysseyPortraitChunkSize = chunkSize;
  root.odysseyPortraitChunkCount = chunkCount;

  function announce(index) {
    root.dispatchEvent(new CustomEvent('taiyzun:odyssey-portraits-chunk', {
      detail: {
        index,
        loaded: loadedChunks.filter(Boolean).length,
        total,
        available: portraits.filter(Boolean).length
      }
    }));
  }

  root.__TAIYZUN_APPEND_ODYSSEY_PORTRAIT_CHUNK__ = function appendPortraitChunk(index, items) {
    if (!Array.isArray(items) || loadedChunks[index]) return;
    loadedChunks[index] = true;
    const start = index * chunkSize;
    for (let offset = 0; offset < items.length; offset += 1) {
      portraits[start + offset] = items[offset];
    }
    announce(index);
  };

  root.TAIYZUN_loadOdysseyPortraitChunk = function loadPortraitChunk(index) {
    if (index < 0 || index >= chunkCount) return Promise.resolve([]);
    if (loadedChunks[index]) return Promise.resolve(portraits.slice(index * chunkSize, Math.min((index + 1) * chunkSize, total)));
    if (chunkPromises.has(index)) return chunkPromises.get(index);

    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = chunkBase + String(index).padStart(3, '0') + '.js?v=' + version;
      script.async = true;
      script.dataset.cfasync = 'false';
      script.fetchPriority = 'low';
      script.onload = () => {
        if (loadedChunks[index]) resolve(portraits.slice(index * chunkSize, Math.min((index + 1) * chunkSize, total)));
        else reject(new Error('Odyssey portrait chunk ' + index + ' did not register.'));
      };
      script.onerror = () => reject(new Error('Failed to load Odyssey portrait chunk ' + index + '.'));
      document.head.appendChild(script);
    }).finally(() => {
      chunkPromises.delete(index);
    });

    chunkPromises.set(index, promise);
    return promise;
  };

  root.TAIYZUN_ensureOdysseyPortraitRange = function ensurePortraitRange(count) {
    const desired = Math.max(0, Math.min(total, Number(count) || 0));
    const lastChunk = Math.max(0, Math.ceil(desired / chunkSize) - 1);
    const jobs = [];
    for (let index = 0; index <= lastChunk; index += 1) {
      jobs.push(root.TAIYZUN_loadOdysseyPortraitChunk(index));
    }
    return Promise.all(jobs).then(() => portraits);
  };

  root.TAIYZUN_loadAllOdysseyPortraits = function loadAllPortraits() {
    return root.TAIYZUN_ensureOdysseyPortraitRange(total);
  };

  root.TAIYZUN_odysseyPortraitsReady = root.TAIYZUN_loadOdysseyPortraitChunk(0).then(() => portraits);
}());
`;

  fs.writeFileSync(loaderPath, loader);
}

function writeChunks(portraits) {
  fs.rmSync(chunksDir, { recursive: true, force: true });
  fs.mkdirSync(chunksDir, { recursive: true });

  for (let index = 0; index < portraits.length; index += chunkSize) {
    const chunkIndex = Math.floor(index / chunkSize);
    const chunk = portraits.slice(index, index + chunkSize);
    const fileName = `${chunkFilePrefix}${String(chunkIndex).padStart(3, '0')}.js`;
    const body = `window.__TAIYZUN_APPEND_ODYSSEY_PORTRAIT_CHUNK__(${chunkIndex}, ${JSON.stringify(chunk)});\n`;
    fs.writeFileSync(path.join(chunksDir, fileName), body);
  }
}

const portraits = loadPortraits();
const chunkCount = Math.ceil(portraits.length / chunkSize);
writeLoader(portraits.length, chunkCount);
writeChunks(portraits);
console.log(`Built Odyssey portrait loader with ${portraits.length} portraits in ${chunkCount} chunks.`);
