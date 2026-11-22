import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import {
  createVoicePreviewAudio,
  disposeVoicePreviewAudio,
} from '../src/web/lib/audio-preview.ts';

test('voice preview audio stays attached to the document until it is disposed', (t) => {
  const dom = new JSDOM('<!doctype html><body></body>', {
    url: 'https://nod.example.test/settings',
  });
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: dom.window.document,
  });
  t.after(() => {
    dom.window.close();
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
    else Reflect.deleteProperty(globalThis, 'document');
  });

  const url = 'blob:https://nod.example.test/voice-preview';
  const player = createVoicePreviewAudio(url);
  assert.equal(player.src, url);
  assert.equal(player.isConnected, true);
  assert.equal(player.parentElement, dom.window.document.body);
  assert.equal(player.hidden, true);
  assert.equal(player.getAttribute('aria-hidden'), 'true');

  let paused = false;
  let reloaded = false;
  player.pause = () => {
    paused = true;
  };
  player.load = () => {
    reloaded = true;
  };
  player.onended = () => {};
  player.onerror = () => {};

  disposeVoicePreviewAudio(player);
  assert.equal(paused, true);
  assert.equal(reloaded, true);
  assert.equal(player.onended, null);
  assert.equal(player.onerror, null);
  assert.equal(player.hasAttribute('src'), false);
  assert.equal(player.isConnected, false);
});
