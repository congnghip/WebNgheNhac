const Player = (() => {
  const audio = new Audio();

  let state = {
    currentSong: null,
    isPlaying: false,
    isShuffle: false,
    repeatMode: 0,
    isLiked: false,
    isMuted: false,
    volume: 75,
    queue: [],
    queueIndex: -1,
  };

  const $thumb = $('#player-thumb');
  const $title = $('#player-title');
  const $artist = $('#player-artist');
  const $playIcon = $('#play-icon');
  const $playBtn = $('#btn-play-pause');
  const $progressFill = $('#progress-fill');
  const $timeCurrent = $('#time-current');
  const $timeTotal = $('#time-total');
  const $btnLike = $('#btn-like');
  const $btnShuffle = $('#btn-shuffle');
  const $btnRepeat = $('#btn-repeat');
  const $btnMute = $('#btn-mute');
  const $btnQueue = $('#btn-queue');
  const $volSlider = $('#volume-slider');
  const $progressTrack = $('#progress-track');
  const $volumeIcon = $('#volume-icon');
  const $queuePanel = $('#queue-panel');
  const $queueList = $('#queue-list');
  let _durationReported = false;
  let _pendingPlay = false;

  audio.addEventListener('timeupdate', _onTimeUpdate);
  audio.addEventListener('loadedmetadata', _onLoadedMetadata);
  audio.addEventListener('loadedmetadata', () => console.log(`loadedmetadata fired: duration=${audio.duration}, currentTime=${audio.currentTime}`));
  audio.addEventListener('ended', _onTrackEnd);
  audio.addEventListener('play', () => { state.isPlaying = true; _syncUI(); });
  audio.addEventListener('pause', () => { state.isPlaying = false; _syncUI(); });

  let _lastKnownTime = 0;
  let _isUserSeeking = false;

  function _onTimeUpdate() {
    if (!audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    $progressFill.css('width', pct + '%');
    $timeCurrent.text(formatTime(audio.currentTime));
    if (!_isUserSeeking && _lastKnownTime > 5 && audio.currentTime < _lastKnownTime - 3) {
      console.log(`RESET DETECTED: was ${_lastKnownTime}, now ${audio.currentTime}, duration=${audio.duration}`);
    }
    if (!_isUserSeeking) _lastKnownTime = audio.currentTime;
  }

  function _onLoadedMetadata() {
    $timeTotal.text(formatTime(audio.duration));
    const secs = Math.round(audio.duration);
    if (state.currentSong && !_durationReported && secs > 0) {
      _durationReported = true;
      API.reportDuration(state.currentSong.id, secs);
      API.logRecentlyPlayed(state.currentSong.id);
    }
    if (_pendingPlay) {
      _pendingPlay = false;
      audio.play().catch(() => {});
    }
  }

  function _onTrackEnd() {
    state.isPlaying = false;
    _syncUI();
    if (state.repeatMode === 2) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
      return;
    }
    _playNext();
  }

  function _syncUI() {
    if (state.isPlaying) {
      $playIcon.text('pause');
      $thumb.addClass('playing');
    } else {
      $playIcon.text('play_arrow');
      $thumb.removeClass('playing');
    }
    $('#player-bar').toggleClass('is-playing', state.isPlaying);
    _notifyUIEffects();
  }

  function _notifyUIEffects() {
    if (typeof UIEffects !== 'undefined') {
      UIEffects.setPlaybackState({ isPlaying: state.isPlaying, song: state.currentSong });
    }
  }

  function _songCover(song) {
    if (song.coverUrl) return song.coverUrl;
    return `https://placehold.co/52x52/e3e2e2/1b1c1c?text=${encodeURIComponent((song.title || '♪').charAt(0) || '♪')}`;
  }

  function load(song, autoplay = true) {
    if (!song) return;
    state.currentSong = song;
    _durationReported = false;

    const src = song.filePath || song.audioUrl;
    if (!src) return;

    audio.src = src;
    audio.load();
    if (song.id) $.post(`/api/songs/${song.id}/play`);
    if (typeof Room !== 'undefined') Room.syncPlayback('load', { song, queue: state.queue });
    $thumb.attr('src', _songCover(song));
    $title.text(song.title);
    if (song.artists && song.artists.length) {
      const links = song.artists.map(a => `<span class="player-artist-link" data-artist-id="${a.id}" data-artist="${a.name}">${a.name}</span>`).join(', ');
      $artist.html(links);
    } else {
      $artist.text(song.artist);
    }
    $timeCurrent.text('0:00');
    $timeTotal.text('0:00');
    $progressFill.css('width', '0%');
    _showNowPlayingToast(song);
    _updateLikeState(song.id);

    if (autoplay) _pendingPlay = true;
  }

  function play() {
    if (!state.currentSong) return;
    audio.play().catch(() => {});
    if (typeof Room !== 'undefined') Room.syncPlayback('play');
  }

  function pause() {
    audio.pause();
    if (typeof Room !== 'undefined') Room.syncPlayback('pause');
  }

  function seek(time) {
    if (time != null) audio.currentTime = time;
  }

  function toggle() {
    if (audio.paused) play(); else pause();
  }

  function isPlaying() { return state.isPlaying; }
  function currentSong() { return state.currentSong; }

  function _playNext() {
    if (state.queue.length > 0 && state.queueIndex < state.queue.length - 1) {
      state.queueIndex++;
      const song = state.queue[state.queueIndex];
      if (song) { load(song); return; }
    }
    if (state.repeatMode === 1 && state.queue.length > 0) {
      state.queueIndex = 0;
      const song = state.queue[0];
      if (song) { load(song); return; }
    }
  }

  function setQueue(songs, startIndex = 0) {
    state.queue = songs;
    state.queueIndex = startIndex;
    if (typeof Room !== 'undefined') Room.syncQueue(songs, startIndex);
  }

  function playNext() {
    if (state.isShuffle && state.queue.length > 1) {
      let idx;
      do { idx = Math.floor(Math.random() * state.queue.length); } while (idx === state.queueIndex && state.queue.length > 1);
      state.queueIndex = idx;
      const song = state.queue[state.queueIndex];
      if (song) { load(song); return; }
    }
    _playNext();
  }

  function playPrev() {
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    if (state.queueIndex > 0) {
      state.queueIndex--;
      const song = state.queue[state.queueIndex];
      if (song) load(song);
    }
  }

  function _updateLikeState(songId) {
    if (!songId) return;
    if (typeof App !== 'undefined' && App.favoriteIds && App.favoriteIds.includes(songId)) {
      state.isLiked = true;
      $btnLike.find('.material-symbols-outlined').text('favorite');
      $btnLike.addClass('liked');
    } else {
      state.isLiked = false;
      $btnLike.find('.material-symbols-outlined').text('favorite');
      $btnLike.removeClass('liked');
    }
  }

  function _showNowPlayingToast(song) {
    $('.now-playing-toast').remove();
    const artistHtml = song.artists && song.artists.length
      ? song.artists.map(a => a.name).join(', ')
      : song.artist;
    const $toast = $(`
      <div class="now-playing-toast">
        <span class="material-symbols-outlined" style="font-size:18px;">music_note</span>
        <div>
          <span class="now-playing-toast-label">Now playing</span>
          <span><strong>${song.title}</strong> · ${artistHtml}</span>
        </div>
      </div>
    `);
    $('body').append($toast);
    setTimeout(() => $toast.addClass('show'), 50);
    setTimeout(() => { $toast.removeClass('show'); setTimeout(() => $toast.remove(), 400); }, 2400);
  }

  function _seek(pct) {
    if (!audio.duration) { console.log('SEEK: no duration'); return; }
    const newTime = (pct / 100) * audio.duration;
    console.log(`SEEK: pct=${pct}, duration=${audio.duration}, newTime=${newTime}`);
    _isUserSeeking = true;
    audio.currentTime = newTime;
  }

  function _initProgressDrag() {
    let dragging = false;
    $progressTrack.on('mousedown', function (e) {
      dragging = true;
      const rect = this.getBoundingClientRect();
      _seek(((e.clientX - rect.left) / rect.width) * 100);
    });
    $(document).on('mousemove', function (e) {
      if (!dragging) return;
      const rect = $progressTrack[0].getBoundingClientRect();
      _seek(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
    });
    $(document).on('mouseup', function () {
      dragging = false;
    });
  }

  function _bindEvents() {
    $playBtn.on('click', toggle);

    $btnLike.on('click', async function () {
      if (!state.currentSong) return;
      const res = await API.toggleFavorite(state.currentSong.id);
      state.isLiked = res.isLiked;
      const $icon = $(this).find('.material-symbols-outlined');
      $icon.text('favorite');
      $(this).toggleClass('liked', res.isLiked);
    });

    $btnShuffle.on('click', function () {
      state.isShuffle = !state.isShuffle;
      $(this).toggleClass('active', state.isShuffle);
    });

    $btnRepeat.on('click', function () {
      state.repeatMode = (state.repeatMode + 1) % 3;
      const $icon = $(this).find('.material-symbols-outlined');
      $(this).removeClass('active');
      if (state.repeatMode === 0) $icon.text('repeat');
      else if (state.repeatMode === 1) { $icon.text('repeat'); $(this).addClass('active'); }
      else { $icon.text('repeat_one'); $(this).addClass('active'); }
    });

    $btnMute.on('click', function () {
      state.isMuted = !state.isMuted;
      if (state.isMuted) { $volumeIcon.text('volume_off'); audio.volume = 0; $volSlider.val(0); }
      else { $volumeIcon.text('volume_up'); audio.volume = state.volume / 100; $volSlider.val(state.volume); }
    });

    $volSlider.on('input', function () {
      state.volume = +$(this).val();
      audio.volume = state.volume / 100;
      state.isMuted = state.volume === 0;
      if (state.isMuted) $volumeIcon.text('volume_off');
      else if (state.volume < 50) $volumeIcon.text('volume_down');
      else $volumeIcon.text('volume_up');
    });

    $progressTrack.on('click', function (e) {
      const rect = this.getBoundingClientRect();
      _seek(((e.clientX - rect.left) / rect.width) * 100);
    });

    audio.addEventListener('seeking', () => console.log(`AUDIO seeking: currentTime=${audio.currentTime}`));
    audio.addEventListener('seeked', () => {
      _isUserSeeking = false;
      _lastKnownTime = audio.currentTime;
      console.log(`AUDIO seeked: currentTime=${audio.currentTime}, src=${audio.src}`);
      setTimeout(() => console.log(`AUDIO 500ms after seeked: currentTime=${audio.currentTime}, paused=${audio.paused}`), 500);
    });

    audio.addEventListener('timeupdate', () => {
      if (audio.currentTime < 1 && audio.duration > 10 && !isNaN(audio.duration)) {
        console.log(`CHECK RESET: currentTime=${audio.currentTime}, duration=${audio.duration}`);
      }
    });

    $('#btn-prev').on('click', playPrev);
    $('#btn-next').on('click', playNext);

    $btnQueue.on('click', function () {
      $queuePanel.toggle();
      if ($queuePanel.is(':visible')) _renderQueue();
    });
    $('#queue-close').on('click', () => $queuePanel.hide());
    $(document).on('click', function (e) {
      if ($(e.target).closest('#queue-panel, #btn-queue').length === 0) $queuePanel.hide();
    });
  }

  function _renderQueue() {
    if (!state.queue.length) {
      $queueList.html('<p class="queue-empty">No songs in queue.</p>');
      return;
    }
    let html = '';
    state.queue.forEach((song, i) => {
      const cover = song.coverUrl || `https://placehold.co/36x36/e3e2e2/1b1c1c?text=${encodeURIComponent((song.title || '♪').charAt(0) || '♪')}`;
      const isActive = i === state.queueIndex ? 'active' : '';
      const artistHtml = song.artists && song.artists.length
        ? song.artists.map(a => `<span class="player-artist-link" data-artist-id="${a.id}" data-artist="${a.name}">${a.name}</span>`).join(', ')
        : song.artist;
      html += `
        <div class="queue-item ${isActive}" data-queue-index="${i}">
          <img src="${cover}" alt="" />
          <div class="queue-item-info">
            <div class="queue-item-title">${song.title}</div>
            <div class="queue-item-artist">${artistHtml}</div>
          </div>
          ${i !== state.queueIndex ? `<button class="queue-item-remove" data-queue-index="${i}"><span class="material-symbols-outlined" style="font-size:16px;">close</span></button>` : ''}
        </div>`;
    });
    $queueList.html(html);

    $queueList.find('.queue-item').on('click', function () {
      const idx = +$(this).data('queue-index');
      if (idx >= 0 && idx < state.queue.length) {
        state.queueIndex = idx;
        load(state.queue[idx]);
        $queuePanel.hide();
      }
    });
    $queueList.find('.queue-item-remove').on('click', function (e) {
      e.stopPropagation();
      const idx = +$(this).data('queue-index');
      if (idx >= 0 && idx < state.queue.length) {
        state.queue.splice(idx, 1);
        if (idx < state.queueIndex) state.queueIndex--;
        _renderQueue();
      }
    });
  }

  function init() {
    _bindEvents();
    _initProgressDrag();
    try {
      const vol = localStorage.getItem('player_volume');
      if (vol) { state.volume = +vol; audio.volume = (+vol) / 100; $volSlider.val(+vol); }
    } catch (e) { /* ignore */ }

    $(document).on('click', '.player-artist-link', function (e) {
      e.stopPropagation();
      const id = $(this).data('artist-id');
      const name = $(this).data('artist');
      if (typeof App !== 'undefined') {
        if (id) { App.navigateToArtistById(id, name); }
        else { App.navigateToArtist(name); }
      }
    });
  }

  function getQueue() { return state.queue; }
  function getQueueIndex() { return state.queueIndex; }
  function queueLength() { return state.queue.length; }
  function removeFromQueue(idx) {
    if (idx >= 0 && idx < state.queue.length) {
      state.queue.splice(idx, 1);
      if (idx < state.queueIndex) state.queueIndex--;
    }
  }

  return { init, load, play, pause, toggle, isPlaying, currentSong, setQueue, playNext, playPrev, getQueue, getQueueIndex, queueLength, removeFromQueue };
})();

function formatTime(secs) {
  if (!isFinite(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
