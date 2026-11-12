/** Best-effort protection against accidentally closing a game tab while
 * crouch-walking (Ctrl+W). Normal pages CANNOT override a browser's reserved
 * tab-close shortcut; fullscreen keyboard lock is optional and permissioned.
 */
export function isCloseShortcut(event, playing) {
  return !!playing && event.code === 'KeyW' && (event.ctrlKey || event.metaKey) &&
    !event.altKey;
}

export function installBrowserShortcutGuard({
  win = window, doc = document, nav = navigator,
  isPlaying, hasEntered, button = null,
}) {
  if (typeof isPlaying !== 'function' || typeof hasEntered !== 'function')
    throw new TypeError('Browser shortcut guard needs game state predicates');
  const onKeyDown = event => {
    if (isCloseShortcut(event, isPlaying()) && event.cancelable)
      event.preventDefault(); // only works if the browser dispatches the key
  };
  // A real browser-generated leave confirmation, not an unclosable window.
  // This is intentionally session-wide; on tab close pointer lock may
  // already be released, so testing isPlaying() here would be unreliable.
  const onBeforeUnload = event => {
    if (!hasEntered()) return;
    event.preventDefault();
    event.returnValue = ' '; // legacy Firefox compatibility
  };
  const updateButton = () => {
    if (!button) return;
    button.textContent = doc.fullscreenElement ? 'PENCERE MODU' : 'TAM EKRAN';
    button.setAttribute('aria-pressed', String(!!doc.fullscreenElement));
  };
  const onFullscreenChange = () => {
    if (!doc.fullscreenElement) nav.keyboard?.unlock?.();
    updateButton();
  };
  win.addEventListener('keydown', onKeyDown, true);
  win.addEventListener('beforeunload', onBeforeUnload);
  doc.addEventListener('fullscreenchange', onFullscreenChange);
  updateButton();

  const toggleFullscreen = async () => {
    if (doc.fullscreenElement) {
      await doc.exitFullscreen?.();
      return false;
    }
    if (!doc.documentElement?.requestFullscreen) throw new Error('Tam ekran desteklenmiyor');
    // Firefox's newer Fullscreen Keyboard Lock and Chromium's Keyboard API
    // are separate, optional paths. Neither is guaranteed by the website.
    await doc.documentElement.requestFullscreen({ keyboardLock: 'browser' });
    try {
      await nav.keyboard?.lock?.(['KeyW']);
    } catch { /* Browser/OS may reserve Ctrl+W regardless of permissions. */ }
    updateButton();
    return true;
  };
  const onButton = () => {
    void toggleFullscreen().catch(() => {
      if (button) button.title = 'Bu tarayıcıda tam ekran/klavye kilidi engellendi';
    });
  };
  button?.addEventListener('click', onButton);
  return {
    toggleFullscreen,
    dispose() {
      win.removeEventListener('keydown', onKeyDown, true);
      win.removeEventListener('beforeunload', onBeforeUnload);
      doc.removeEventListener('fullscreenchange', onFullscreenChange);
      button?.removeEventListener('click', onButton);
      nav.keyboard?.unlock?.();
    },
  };
}
