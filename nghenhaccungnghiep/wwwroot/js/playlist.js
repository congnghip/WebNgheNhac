function _songCover(song) {
  if (song.coverUrl) return song.coverUrl;
  return `https://placehold.co/44x44/e3e2e2/1b1c1c?text=${encodeURIComponent((song.title || '♪').charAt(0) || '?')}`;
}

function _formatDuration(seconds) {
  if (seconds == null || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

async function renderPlaylistPage(playlist) {
  const $section = $('#page-playlist');
  $section.empty();

  if (!playlist) {
    $section.html(`<div class="empty-state-panel"><div class="empty-state-icon"><span class="material-symbols-outlined" style="font-size:28px;">queue_music</span></div><h1 class="page-title">Playlist not found</h1><p class="page-subtitle">Please select another playlist.</p></div>`);
    return;
  }

  const songs = playlist.songs || [];
  const totalDuration = songs.reduce((sum, s) => sum + (s.durationInSeconds || 0), 0);
  const totalFormatted = _formatDuration(totalDuration);

    const cover = songs.length > 0 ? _songCover(songs[0]) : 'https://placehold.co/400x400/e3e2e2/1b1c1c?text=♪';

  const songsHtml = songs.map((song, i) => {
    const artists = song.artists && song.artists.length
      ? song.artists.map(a => `<span class="artist-link" data-artist-id="${a.id}" data-artist="${a.name}">${a.name}</span>`).join(', ')
      : API.splitArtists(song.artist).map(a => `<span class="artist-link" data-artist="${a}">${a}</span>`).join(', ');
    return `
      <div class="song-list-item" draggable="true" data-song-id="${song.id}">
        <div class="song-index">${String(i + 1).padStart(2, '0')}</div>
        <div class="play-icon-hover">
          <span class="material-symbols-outlined" style="font-size:16px;color:var(--primary);">play_arrow</span>
        </div>
        <div class="song-main">
          <div class="song-thumb"><img src="${_songCover(song)}" alt="" /></div>
          <div class="song-info">
            <div class="song-title">${song.title}</div>
            <div class="song-artist">${artists}</div>
          </div>
        </div>
        <div class="song-artist-block">${artists}</div>
        <div class="song-duration">${_formatDuration(song.durationInSeconds)}</div>
        <div class="song-actions">
          <button class="song-play-btn" data-song-id="${song.id}">
            <span class="material-symbols-outlined" style="font-size:18px;">play_arrow</span>
          </button>
        </div>
      </div>`;
  }).join('');

  $section.html(`
    <div class="playlist-header">
      <div class="playlist-header-art">
        <img src="${cover}" alt="${playlist.name}" />
        <div class="playlist-header-overlay">
          <button class="btn-icon-only" data-playlist-id="${playlist.id}">
            <span class="material-symbols-outlined" style="font-size:24px;">play_arrow</span>
          </button>
        </div>
      </div>
      <div class="playlist-header-info">
        <p class="eyebrow">Playlist</p>
        <h1 class="page-title">${playlist.name}</h1>
        <p class="page-subtitle">Curated collection.</p>
        <div class="playlist-meta">
          <span><span class="material-symbols-outlined" style="font-size:16px;">person</span> Record</span>
          <span><span class="material-symbols-outlined" style="font-size:16px;">music_note</span> ${songs.length} songs</span>
          <span><span class="material-symbols-outlined" style="font-size:16px;">schedule</span> ${totalFormatted}</span>
        </div>
        <div class="playlist-actions">
          <button class="btn-primary" data-playlist-id="${playlist.id}">
            Play all
            <span class="btn-icon material-symbols-outlined">play_arrow</span>
          </button>
          ${playlist.ownPlaylist !== false ? `
          <button class="btn-secondary" id="btn-share-playlist" style="margin-left:8px;">
            <span class="material-symbols-outlined" style="font-size:16px;margin-right:4px;">share</span>
            ${playlist.isPublic ? 'Shared' : 'Share'}
          </button>
          ` : ''}
        </div>
        ${playlist.ownPlaylist !== false ? '<div id="share-info" style="margin-top:8px;font-size:13px;"></div>' : ''}
      </div>
    </div>
    <div class="song-list-wrapper">
      <div class="song-list-header">
        <div class="text-center">#</div>
        <div>Title</div>
        <div>Artist</div>
        <div class="text-right">Duration</div>
        <div></div>
      </div>
      <div class="song-list">${songsHtml}</div>
    </div>
  `);

  _bindPlaylistEvents(playlist);
}

function _bindPlaylistEvents(playlist) {
  const $section = $('#page-playlist');
  $section.off('.playlist');

  $section.on('click.playlist', '.song-list-item', function (e) {
    if ($(e.target).closest('button').length || $(e.target).closest('[data-artist]').length) return;
    const id = +$(this).data('song-id');
    const song = (playlist.songs || []).find(s => s.id === id);
    if (song) { Player.setQueue(playlist.songs || [], (playlist.songs || []).indexOf(song)); Player.load(song); }
  });

  $section.on('click.playlist', '.artist-link', function (e) {
    e.stopPropagation();
    const id = $(this).data('artist-id');
    const name = $(this).data('artist');
    if (typeof App !== 'undefined') {
      if (id) { App.navigateToArtistById(id, name); }
      else { App.navigateToArtist(name); }
    }
  });

  $section.on('click.playlist', '.song-play-btn', function (e) {
    e.stopPropagation();
    const id = +$(this).data('song-id');
    const song = (playlist.songs || []).find(s => s.id === id);
    if (song) { Player.setQueue(playlist.songs || [], (playlist.songs || []).indexOf(song)); Player.load(song); }
  });

  $section.on('click.playlist', '.btn-primary[data-playlist-id], .btn-icon-only[data-playlist-id]', function () {
    const songs = playlist.songs || [];
    if (songs.length) { Player.setQueue(songs, 0); Player.load(songs[0]); }
  });

  $section.on('click.playlist', '#btn-share-playlist', async function () {
    const isPublic = playlist.isPublic;
    if (isPublic) {
      await API.updatePlaylist(playlist.id, null, false);
      playlist.isPublic = false;
      $('#btn-share-playlist').html('<span class="material-symbols-outlined" style="font-size:16px;margin-right:4px;">share</span> Share');
      $('#share-info').text('');
    } else {
      await API.updatePlaylist(playlist.id, null, true);
      playlist.isPublic = true;
      $('#btn-share-playlist').html('<span class="material-symbols-outlined" style="font-size:16px;margin-right:4px;">share</span> Shared');
      const link = `${window.location.origin}/api/playlists/${playlist.id}`;
      const info = $('#share-info');
      info.html(`<span style="color:var(--secondary);">Shared! </span><a href="${link}" target="_blank" style="color:var(--primary);text-decoration:underline;word-break:break-all;">${link}</a> <button id="copy-share-link" class="btn-link" style="color:var(--primary);text-decoration:underline;">Copy</button>`);
      $('#copy-share-link').on('click', function () {
        navigator.clipboard.writeText(link).then(() => showToast('Link copied!'));
      });
    }
  });

  // Drag & drop reorder
  let _dragSrcIdx = -1;
  $section.on('dragstart.playlist', '.song-list-item', function (e) {
    _dragSrcIdx = $(this).index();
    $(this).addClass('dragging');
    e.originalEvent.dataTransfer.effectAllowed = 'move';
    e.originalEvent.dataTransfer.setData('text/plain', '');
  });
  $section.on('dragend.playlist', '.song-list-item', function () {
    $('.song-list-item').removeClass('dragging drag-over');
    _dragSrcIdx = -1;
  });
  $section.on('dragover.playlist', '.song-list-item', function (e) {
    e.preventDefault();
    e.originalEvent.dataTransfer.dropEffect = 'move';
    $(this).addClass('drag-over');
  });
  $section.on('dragleave.playlist', '.song-list-item', function (e) {
    const related = e.originalEvent?.relatedTarget;
    if (related && this.contains(related)) return;
    $(this).removeClass('drag-over');
  });
  $section.on('drop.playlist', '.song-list-item', async function (e) {
    e.preventDefault();
    $(this).removeClass('drag-over');
    const targetIdx = $(this).index();
    if (_dragSrcIdx === targetIdx || _dragSrcIdx < 0) return;

    const songs = playlist.songs || [];
    const [moved] = songs.splice(_dragSrcIdx, 1);
    songs.splice(targetIdx, 0, moved);
    playlist.songs = songs;
    renderPlaylistPage(playlist);

    const songIds = songs.map(s => s.id);
    try {
      await API.reorderPlaylistSongs(playlist.id, songIds);
    } catch { showToast('Error saving order.'); }
  });
}
