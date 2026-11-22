export function createVoicePreviewAudio(url: string): HTMLAudioElement {
  const player = document.createElement('audio');
  player.preload = 'auto';
  player.src = url;
  player.hidden = true;
  player.setAttribute('aria-hidden', 'true');
  document.body.append(player);
  return player;
}

export function disposeVoicePreviewAudio(player: HTMLAudioElement) {
  player.onended = null;
  player.onerror = null;
  player.pause();
  player.removeAttribute('src');
  player.load();
  player.remove();
}
