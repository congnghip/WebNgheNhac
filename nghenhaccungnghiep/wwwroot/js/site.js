const player = {
  audio: new Audio(),
  key: 'nghenhac_player_state',

  init() {
    this.restore();
    this.bindEvents();
  },

  bindEvents() {
    this.audio.addEventListener('timeupdate', () => this.save());
    this.audio.addEventListener('ended', () => this.onEnded());
    this.audio.addEventListener('play', () => this.updateUI());
    this.audio.addEventListener('pause', () => this.updateUI());
    this.audio.addEventListener('loadedmetadata', () => {
      this.updateUI();
      this.save();
    });
  },

  save() {
    const state = {
      src: this.audio.src,
      title: this.audio.dataset?.title || '',
      artist: this.audio.dataset?.artist || '',
      currentTime: this.audio.currentTime,
      duration: this.audio.duration,
      isPlaying: !this.audio.paused,
      timestamp: Date.now()
    };
    try {
      localStorage.setItem(this.key, JSON.stringify(state));
    } catch (e) { /* ignore */ }
  },

  restore() {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return;
      const state = JSON.parse(raw);
      if (!state.src || typeof state.src !== 'string') return;

      this.audio.src = state.src;
      this.audio.dataset.title = state.title || '';
      this.audio.dataset.artist = state.artist || '';
      this.audio.currentTime = state.currentTime || 0;

      this.updateUI();

      if (state.isPlaying) {
        this.audio.play().catch(() => {});
      }
    } catch (e) { /* ignore */ }
  },

  play(options) {
    const { src, title, artist } = options;
    const sameSrc = this.audio.src === src;

    if (!sameSrc) {
      this.audio.src = src;
      this.audio.dataset.title = title || '';
      this.audio.dataset.artist = artist || '';
      this.audio.load();
    }

    this.audio.play().catch(() => {});
    this.save();
    this.updateUI();
  },

  togglePlay() {
    if (this.audio.paused) {
      this.audio.play().catch(() => {});
    } else {
      this.audio.pause();
    }
  },

  seek(time) {
    if (isFinite(time)) {
      this.audio.currentTime = time;
    }
  },

  setVolume(vol) {
    this.audio.volume = vol;
    try { localStorage.setItem('nghenhac_volume', vol); } catch (e) { /* ignore */ }
  },

  restoreVolume() {
    try {
      const vol = localStorage.getItem('nghenhac_volume');
      if (vol !== null) {
        this.audio.volume = parseFloat(vol);
        const volSlider = document.getElementById('volumeSlider');
        if (volSlider) volSlider.value = vol;
      }
    } catch (e) { /* ignore */ }
  },

  onEnded() {
    // Try to play next song in the queue
    const currentCard = document.querySelector('.song-card.playing, .song-list-item.playing');
    if (currentCard) {
      const next = currentCard.nextElementSibling || currentCard.parentElement?.firstElementChild;
      if (next && next.dataset?.src) {
        this.play({
          src: next.dataset.src,
          title: next.dataset.title,
          artist: next.dataset.artist
        });
        this.highlight(next);
      }
    }
  },

  highlight(el) {
    document.querySelectorAll('.song-card.playing, .song-list-item.playing')
      .forEach(e => e.classList.remove('playing'));
    if (el) el.classList.add('playing');
  },

  updateUI() {
    const titleEl = document.getElementById('playerTitle');
    const artistEl = document.getElementById('playerArtist');
    const playBtn = document.getElementById('playPauseBtn');
    const progress = document.getElementById('progressSlider');
    const currentEl = document.getElementById('currentTime');
    const totalEl = document.getElementById('totalTime');

    if (titleEl) titleEl.textContent = this.audio.dataset?.title || 'No track playing';
    if (artistEl) artistEl.textContent = this.audio.dataset?.artist || '';

    if (playBtn) {
      playBtn.innerHTML = this.audio.paused
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
    }

    if (progress && this.audio.duration) {
      progress.max = this.audio.duration;
      progress.value = this.audio.currentTime;
    }

    if (currentEl) currentEl.textContent = this.formatTime(this.audio.currentTime);
    if (totalEl && this.audio.duration) totalEl.textContent = this.formatTime(this.audio.duration);
  },

  formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  player.init();
  player.restoreVolume();

  // Play buttons
  document.querySelectorAll('.btn-play, .btn-play-sm, .song-card, .song-list-item').forEach(el => {
    el.addEventListener('click', function(e) {
      const btn = e.target.closest('.btn-play, .btn-play-sm, .song-card, .song-list-item');
      if (!btn) return;

      const src = btn.dataset?.src || btn.closest('[data-src]')?.dataset?.src;
      if (!src) return;

      e.preventDefault();
      e.stopPropagation();

      const title = btn.dataset?.title || btn.closest('[data-title]')?.dataset?.title || '';
      const artist = btn.dataset?.artist || btn.closest('[data-artist]')?.dataset?.artist || '';

      // If clicking the play button on same song, toggle
      if (player.audio.src === src && e.target.closest('.btn-play, .btn-play-sm')) {
        player.togglePlay();
        return;
      }

      player.play({ src, title, artist });
      player.highlight(btn.closest('.song-card, .song-list-item'));
    });
  });

  // Progress slider
  const progressSlider = document.getElementById('progressSlider');
  if (progressSlider) {
    progressSlider.addEventListener('input', function() {
      player.seek(parseFloat(this.value));
    });
  }

  // Volume slider
  const volumeSlider = document.getElementById('volumeSlider');
  if (volumeSlider) {
    volumeSlider.addEventListener('input', function() {
      player.setVolume(parseFloat(this.value));
    });
  }

  // Play/Pause button
  const playPauseBtn = document.getElementById('playPauseBtn');
  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', () => player.togglePlay());
  }

  // Periodic UI update
  setInterval(() => player.updateUI(), 500);
});
