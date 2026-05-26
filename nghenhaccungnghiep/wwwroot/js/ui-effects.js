const UIEffects = (() => {
  function setTopbarScrolled(isScrolled) {
    // Not used in new layout but kept for compatibility
  }

  function setPlaybackState({ isPlaying = false, song = null } = {}) {
    $('.music-card, .song-list-item').removeClass('is-playing');
    if (song) {
      $(`.music-card[data-song-id="${song.id}"], .song-list-item[data-song-id="${song.id}"]`).addClass('is-playing');
    }
  }

  function setActivePage(page) {
    $('#main-content').attr('data-page', page);
  }

  function bindShellEvents() {
    // No topbar scroll effect in new layout
  }

  function init() {
    bindShellEvents();
  }

  return { init, setActivePage, setPlaybackState, setTopbarScrolled };
})();
