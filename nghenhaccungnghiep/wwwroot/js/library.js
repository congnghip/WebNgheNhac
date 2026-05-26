let _libraryFavorites = [];
let _libraryPlaylists = [];

async function renderLibraryPage() {
  const $section = $('#page-library');
  const $empty = $section.find('.empty-state-panel');
  const $content = $('#library-content');

  try {
    const [favorites, playlists] = await Promise.all([API.getFavorites(), API.getPlaylists()]);
    _libraryFavorites = favorites;
    _libraryPlaylists = playlists;

    if (!favorites.length && !playlists.length) {
      $empty.show();
      $content.empty();
      return;
    }

    $empty.hide();
    let html = '';

    if (favorites.length) {
      html += `
        <div class="library-section">
          <div class="library-section-header">
            <h2>Favorites</h2>
          </div>
          <div class="library-grid">`;
      favorites.forEach(s => {
        const artistHtml = s.artists && s.artists.length
          ? s.artists.map(a => `<span class="artist-link" data-artist-id="${a.id}" data-artist="${a.name}">${a.name}</span>`).join(', ')
          : s.artist;
        html += `
          <div class="library-item" data-song-id="${s.id}">
            <div class="library-item-icon"><span class="material-symbols-outlined">music_note</span></div>
            <div class="library-item-info">
              <div class="library-item-name">${s.title}</div>
              <div class="library-item-meta">${artistHtml}</div>
            </div>
          </div>`;
      });
      html += `</div></div>`;
    }

    if (playlists.length) {
      html += `
        <div class="library-section">
          <div class="library-section-header">
            <h2>Playlists</h2>
          </div>
          <div class="library-grid">`;
      playlists.forEach(p => {
        html += `
          <div class="library-item" data-playlist-id="${p.id}">
            <div class="library-item-icon"><span class="material-symbols-outlined">queue_music</span></div>
            <div class="library-item-info">
              <div class="library-item-name">${p.name}</div>
              <div class="library-item-meta">${p.songCount} songs</div>
            </div>
            <button class="library-item-edit" data-playlist-id="${p.id}" title="Delete playlist">
              <span class="material-symbols-outlined" style="font-size:18px;">delete</span>
            </button>
          </div>`;
      });
      html += `</div></div>`;
    }

    $content.html(html);
    _bindLibraryEvents();
  } catch (e) {
    $content.html('<p style="color:var(--secondary);">Could not load library.</p>');
  }
}

function _bindLibraryEvents() {
  $('#library-content').off('.library');

  $('#library-content').on('click.library', '.library-item[data-song-id]', function () {
    const id = +$(this).data('song-id');
    const song = _libraryFavorites.find(s => s.id === id);
    if (song) { Player.setQueue(_libraryFavorites, _libraryFavorites.indexOf(song)); Player.load(song); }
  });

  $('#library-content').on('click.library', '.library-item[data-playlist-id]', async function (e) {
    if ($(e.target).closest('.library-item-edit').length) return;
    const id = +$(this).data('playlist-id');
    try {
      const pl = await API.getPlaylist(id);
      window.__activePlaylist = { id: pl.id, name: pl.name, songs: pl.songs };
      App.navigate('playlist');
      renderPlaylistPage(window.__activePlaylist);
    } catch (err) { /* ignore */ }
  });

  $('#library-content').on('click.library', '.library-item-edit', async function (e) {
    e.stopPropagation();
    const id = +$(this).data('playlist-id');
    if (!confirm('Delete this playlist?')) return;
    try {
      await API.deletePlaylist(id);
      renderLibraryPage();
    } catch (err) { /* ignore */ }
  });
}
