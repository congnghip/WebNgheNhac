const App = (() => {
  let currentPage = 'home';
  let allSongsCache = [];
  let favoriteIds = [];
  let currentUser = null;

  function _activatePage(page) {
    currentPage = page;
    $('.page-section').removeClass('active');
    $(`#page-${page}`).addClass('active');
    $('.nav-item').removeClass('active');
    $(`.nav-item[data-page="${page}"]`).addClass('active');
    $('.mobile-nav-item').removeClass('active');
    $(`.mobile-nav-item[data-page="${page}"]`).addClass('active');
    $('#main-content').scrollTop(0);

    if (typeof UIEffects !== 'undefined') {
      UIEffects.setActivePage(page);
      UIEffects.setTopbarScrolled(false);
    }
  }

  function navigate(page) {
    if (page === currentPage) return;
    _activatePage(page);

    if (page === 'search') _initSearch();
    if (page === 'library') renderLibraryPage();
    if (page === 'admin') renderAdminPage();
    if (page === 'studio') renderStudioPage();
    if (page === 'artist-profile') renderArtistProfilePage();
    if (page === 'settings') renderSettingsPage();
  }

  function openPlaylist(playlistId) {
    API.getPlaylist(playlistId).then(pl => {
      window.__activePlaylist = { id: pl.id, name: pl.name, isPublic: pl.isPublic, ownPlaylist: pl.ownPlaylist, songs: pl.songs || [] };
      _activatePage('playlist');
      renderPlaylistPage(window.__activePlaylist);
    }).catch(() => {});
  }

  function navigateToArtist(artist) {
    _activatePage('artist');
    renderArtistPage(artist);
  }

  function navigateToArtistById(id, name) {
    _activatePage('artist');
    renderArtistPage({ id, name });
  }

  async function refreshFavorites() {
    try {
      const favs = await API.getFavorites();
      favoriteIds = favs.map(s => s.id);
    } catch { favoriteIds = []; }
  }

  function _initSearch() {
    const $input = $('#topnav-search-input');
    const $results = $('#search-results');
    const $suggestions = $('#search-suggestions');
    let suggestionCache = [];

    function _songCover(s) {
      return s.coverUrl || `https://placehold.co/400x400/e3e2e2/1b1c1c?text=${encodeURIComponent(s.title.charAt(0) || '?')}`;
    }

    function _showSuggestions(songs, artists) {
      if (!songs.length && !artists.length) { $suggestions.hide(); return; }
      let html = '';
      artists.forEach(a => {
        html += `<div class="search-suggestion-item" data-artist-id="${a.id}" data-artist="${a.name}">
          <span class="material-symbols-outlined search-suggestion-icon" style="font-size:20px;">person</span>
          <div class="search-suggestion-info">
            <div class="search-suggestion-title search-suggestion-artist">${a.name}</div>
            <div class="search-suggestion-meta">Artist</div>
          </div>
          <span class="material-symbols-outlined" style="font-size:16px;color:var(--secondary);">arrow_forward</span>
        </div>`;
      });
      songs.slice(0, 5).forEach(s => {
        html += `<div class="search-suggestion-item" data-song-id="${s.id}">
          <img src="${_songCover(s)}" alt="" />
          <div class="search-suggestion-info">
            <div class="search-suggestion-title">${s.title}</div>
            <div class="search-suggestion-meta">${s.artist}</div>
          </div>
          <span class="material-symbols-outlined" style="font-size:16px;color:var(--secondary);">play_arrow</span>
        </div>`;
      });
      $suggestions.html(html).show();

      $suggestions.find('[data-song-id]').off('click.suggest').on('click.suggest', function () {
        const id = +$(this).data('song-id');
        const song = suggestionCache.find(s => s.id === id);
        if (song) { $suggestions.hide(); Player.setQueue(suggestionCache, suggestionCache.indexOf(song)); Player.load(song); }
      });
      $suggestions.find('[data-artist]').off('click.suggest').on('click.suggest', function () {
        const id = $(this).data('artist-id');
        const name = $(this).data('artist');
        $suggestions.hide();
        $input.val('');
        if (id) { navigateToArtistById(id, name); }
        else { navigateToArtist(name); }
      });
    }

    $input.off('.search').on('input.search', debounce(async function () {
      const q = $(this).val().trim();
      if (!q) {
        $suggestions.hide();
        $results.empty();
        $('#page-search .empty-state-panel').show();
        return;
      }
      $('#page-search .empty-state-panel').hide();
      try {
        const [data, artistList] = await Promise.all([API.getSongs(q), API.getArtists()]);
        const songs = data.songs;
        suggestionCache = songs;
        const allArtists = artistList
          .filter(a => a.name.toLowerCase().includes(q.toLowerCase()))
          .map(a => ({ id: a.id, name: a.name, imageUrl: a.imageUrl }));
        _showSuggestions(songs, allArtists);

        if (!songs.length) {
          $results.html('<p style="text-align:center;padding:40px;color:var(--secondary);">No results found.</p>');
          return;
        }
        let html = '<div class="song-grid">';
        songs.forEach(s => {
          const artists = s.artists && s.artists.length
            ? s.artists.map(a => `<span class="artist-link" data-artist-id="${a.id}" data-artist="${a.name}">${a.name}</span>`).join(', ')
            : API.splitArtists(s.artist).map(a => `<span class="artist-link" data-artist="${a}">${a}</span>`).join(', ');
          html += `
            <article class="music-card" data-song-id="${s.id}">
              <div class="music-card-thumb">
                <img src="${_songCover(s)}" alt="${s.title}" loading="lazy" />
                <button class="card-play-btn" data-song-id="${s.id}">
                  <span class="material-symbols-outlined" style="font-size:20px;">play_arrow</span>
                </button>
              </div>
              <div class="music-card-body">
                <div class="music-card-name">${s.title}</div>
                <div class="music-card-artist">${artists}</div>
              </div>
            </article>`;
        });
        html += '</div>';
        $results.html(html);

        $results.find('.card-play-btn').on('click', function () {
          const id = +$(this).data('song-id');
          const song = songs.find(s => s.id === id);
          if (song) { Player.setQueue(songs, songs.indexOf(song)); Player.load(song); }
        });
        $results.find('.music-card').on('click', function (ev) {
          if ($(ev.target).closest('.card-play-btn').length) return;
          const id = +$(this).data('song-id');
          const song = songs.find(s => s.id === id);
          if (song) { Player.setQueue(songs, songs.indexOf(song)); Player.load(song); }
        });
        $results.find('.artist-link').on('click', function (e) {
          e.stopPropagation();
          const id = $(this).data('artist-id');
          const name = $(this).data('artist');
          $input.val('');
          if (id) { navigateToArtistById(id, name); }
          else { navigateToArtist(name); }
        });
      } catch { $results.html('<p style="text-align:center;padding:40px;color:var(--secondary);">Search error.</p>'); }
    }, 300));

    $input.on('blur.search', function () {
      setTimeout(() => $suggestions.hide(), 200);
    });
    $input.on('focus.search', function () {
      if ($(this).val().trim()) $suggestions.show();
    });
  }

  function _findAdminTab() {
    const hash = window.location.hash.replace('#tab-', '') || 'pending-artists';
    return hash;
  }

  // ── Admin page (with tabs) ──

  async function renderSettingsPage() {
    const $section = $('#page-settings');
    $section.empty();
    const user = await API.getCurrentUser();
    const displayName = user.displayName || user.userName || '';
    $section.html(`
      <div class="settings-page" style="max-width:560px;margin:0 auto;padding:40px 24px;">
        <h1 class="page-title" style="margin-bottom:4px;">Settings</h1>
        <p class="page-subtitle" style="margin-bottom:32px;">Manage your profile and account.</p>

        <div class="settings-section" style="margin-bottom:32px;">
          <h3 style="font-size:14px;font-weight:600;margin:0 0 16px;text-transform:uppercase;letter-spacing:0.5px;color:var(--secondary);">Profile</h3>
          <label style="display:block;font-size:13px;font-weight:500;margin-bottom:4px;color:var(--on-surface-variant);">Display Name</label>
          <input type="text" id="settings-display-name" value="${displayName}" class="input-field" style="width:100%;padding:10px 14px;border:1px solid var(--outline-variant);border-radius:var(--radius-sm);background:var(--surface-container-low);color:var(--on-surface);font-size:14px;margin-bottom:16px;" />
          <button class="btn-primary" id="btn-save-profile">Save</button>
        </div>

        <div class="settings-section" style="margin-bottom:32px;">
          <h3 style="font-size:14px;font-weight:600;margin:0 0 16px;text-transform:uppercase;letter-spacing:0.5px;color:var(--secondary);">Password</h3>
          <label style="display:block;font-size:13px;font-weight:500;margin-bottom:4px;color:var(--on-surface-variant);">Current Password</label>
          <input type="password" id="settings-current-pw" class="input-field" style="width:100%;padding:10px 14px;border:1px solid var(--outline-variant);border-radius:var(--radius-sm);background:var(--surface-container-low);color:var(--on-surface);font-size:14px;margin-bottom:12px;" />
          <label style="display:block;font-size:13px;font-weight:500;margin-bottom:4px;color:var(--on-surface-variant);">New Password</label>
          <input type="password" id="settings-new-pw" class="input-field" style="width:100%;padding:10px 14px;border:1px solid var(--outline-variant);border-radius:var(--radius-sm);background:var(--surface-container-low);color:var(--on-surface);font-size:14px;margin-bottom:16px;" />
          <button class="btn-primary" id="btn-change-pw">Change Password</button>
        </div>

        <div id="settings-msg" style="font-size:13px;margin-top:8px;"></div>
      </div>
    `);

    $('#btn-save-profile').on('click', async function () {
      const name = $('#settings-display-name').val().trim();
      try {
        await API.updateProfile(name);
        showToast('Profile updated.');
      } catch { showToast('Failed to update profile.'); }
    });

    $('#btn-change-pw').on('click', async function () {
      const current = $('#settings-current-pw').val();
      const newPw = $('#settings-new-pw').val();
      if (!current || !newPw) { showToast('Fill in both password fields.'); return; }
      if (newPw.length < 6) { showToast('New password must be at least 6 characters.'); return; }
      try {
        await API.changePassword(current, newPw);
        showToast('Password changed.');
        $('#settings-current-pw, #settings-new-pw').val('');
      } catch (e) {
        const msg = e.responseJSON?.error || 'Failed to change password.';
        showToast(msg);
      }
    });
  }

  async function renderAdminPage() {
    const $section = $('#page-admin');
    $section.empty();

    $section.html(`
      <div class="admin-header">
        <h1 class="page-title" style="font-size:32px;">Admin dashboard</h1>
      </div>
      <div class="admin-tabs">
        <button class="admin-tab active" data-tab="pending-artists">
          <span class="material-symbols-outlined" style="font-size:16px;">person_add</span> Artist applications
        </button>
        <button class="admin-tab" data-tab="pending-songs">
          <span class="material-symbols-outlined" style="font-size:16px;">music_note</span> Pending songs
        </button>
        <button class="admin-tab" data-tab="manage-songs">
          <span class="material-symbols-outlined" style="font-size:16px;">library_music</span> Manage songs
        </button>
        <button class="admin-tab" data-tab="users">
          <span class="material-symbols-outlined" style="font-size:16px;">group</span> Users
        </button>
      </div>
      <div class="admin-panel" id="admin-panel"></div>
    `);

    _bindAdminTabEvents();
    _loadAdminTab('pending-artists');
  }

  function _bindAdminTabEvents() {
    $('.admin-tab').on('click', function () {
      $('.admin-tab').removeClass('active');
      $(this).addClass('active');
      const tab = $(this).data('tab');
      _loadAdminTab(tab);
    });
  }

  async function _loadAdminTab(tab) {
    const $panel = $('#admin-panel');
    $panel.html('<p style="padding:40px;color:var(--secondary);text-align:center;">Loading...</p>');

    if (tab === 'pending-artists') await _renderPendingArtists($panel);
    else if (tab === 'pending-songs') await _renderPendingSongs($panel);
    else if (tab === 'manage-songs') await _renderManageSongs($panel);
    else if (tab === 'users') await _renderUsers($panel);
  }

  async function _renderPendingArtists($panel) {
    try {
      const apps = await API.getPendingArtists();
      if (!apps.length) {
        $panel.html(`<div class="empty-state-panel"><div class="empty-state-icon"><span class="material-symbols-outlined" style="font-size:28px;">person_add</span></div><h1 class="page-title">No pending applications</h1><p class="page-subtitle">No artists waiting for approval.</p></div>`);
        return;
      }
      let html = `<table class="admin-song-table"><thead><tr><th>Email</th><th>Reason</th><th>Date</th><th></th></tr></thead><tbody>`;
      apps.forEach(a => {
        html += `<tr><td>${a.email}</td><td>${a.reason || '—'}</td><td>${new Date(a.createdAt).toLocaleDateString('vi-VN')}</td>
          <td class="admin-actions-cell">
            <button class="admin-approve-btn" data-artist-app-id="${a.id}"><span class="material-symbols-outlined" style="font-size:16px;">check</span> Approve</button>
            <button class="admin-reject-btn" data-artist-app-id="${a.id}"><span class="material-symbols-outlined" style="font-size:16px;">close</span> Reject</button>
          </td></tr>`;
      });
      html += `</tbody></table>`;
      $panel.html(html);

      $panel.find('.admin-approve-btn').on('click', async function () {
        const id = +$(this).data('artist-app-id');
        try {
          await API.approveArtist(id);
          showToast('Artist approved!');
          _loadAdminTab('pending-artists');
        } catch { showToast('Error approving artist.'); }
      });
      $panel.find('.admin-reject-btn').on('click', async function () {
        const id = +$(this).data('artist-app-id');
        if (!confirm('Reject this artist application?')) return;
        try {
          await API.rejectArtist(id);
          showToast('Artist rejected.');
          _loadAdminTab('pending-artists');
        } catch { showToast('Error rejecting artist.'); }
      });
    } catch { $panel.html('<p style="color:var(--secondary);">Could not load applications.</p>'); }
  }

  async function _renderPendingSongs($panel) {
    try {
      const songs = await API.getPendingSongs();
      if (!songs.length) {
        $panel.html(`<div class="empty-state-panel"><div class="empty-state-icon"><span class="material-symbols-outlined" style="font-size:28px;">music_note</span></div><h1 class="page-title">No pending songs</h1><p class="page-subtitle">All songs have been reviewed.</p></div>`);
        return;
      }
      let html = `<table class="admin-song-table"><thead><tr><th>Title</th><th>Artist</th><th>Uploaded by</th><th>Date</th><th></th></tr></thead><tbody>`;
      songs.forEach(s => {
        html += `<tr><td>${s.title}</td><td>${s.artist}</td><td>${s.uploadedBy}</td><td>${new Date(s.createdAt).toLocaleDateString('vi-VN')}</td>
          <td class="admin-actions-cell">
            <button class="admin-approve-btn" data-song-id="${s.id}"><span class="material-symbols-outlined" style="font-size:16px;">check</span> Approve</button>
            <button class="admin-reject-btn" data-song-id="${s.id}"><span class="material-symbols-outlined" style="font-size:16px;">close</span> Reject</button>
          </td></tr>`;
      });
      html += `</tbody></table>`;
      $panel.html(html);

      $panel.find('.admin-approve-btn').on('click', async function () {
        const id = +$(this).data('song-id');
        try {
          await API.approveSong(id);
          showToast('Song approved!');
          _loadAdminTab('pending-songs');
        } catch { showToast('Error approving song.'); }
      });
      $panel.find('.admin-reject-btn').on('click', async function () {
        const id = +$(this).data('song-id');
        if (!confirm('Reject and delete this song?')) return;
        try {
          await API.rejectSong(id);
          showToast('Song rejected.');
          _loadAdminTab('pending-songs');
        } catch { showToast('Error rejecting song.'); }
      });
    } catch { $panel.html('<p style="color:var(--secondary);">Could not load pending songs.</p>'); }
  }

  async function _renderUsers($panel) {
    try {
      const users = await API.getUsers();
      let html = `<div style="margin-bottom:16px;font-size:13px;color:var(--secondary);">Total: ${users.length} users</div>`;
      html += `<table class="admin-song-table"><thead><tr><th>Email</th><th>Display Name</th><th>Roles</th><th></th></tr></thead><tbody>`;
      users.forEach(u => {
        const roleBadges = (u.roles || []).map(r => `<span style="display:inline-block;padding:2px 8px;border-radius:999px;background:var(--surface-container-high);font-size:11px;margin-right:4px;">${r}</span>`).join('');
        html += `<tr>
          <td>${u.email}</td>
          <td>${u.displayName || '—'}</td>
          <td>${roleBadges || '<span style="color:var(--secondary);">—</span>'}</td>
          <td class="admin-actions-cell">
            <button class="admin-reset-pw-btn" data-user-id="${u.id}" style="padding:4px 12px;border:1px solid var(--outline-variant);border-radius:var(--radius-sm);background:none;color:var(--on-surface);cursor:pointer;font-size:12px;">Reset PW</button>
          </td>
        </tr>`;
      });
      html += `</tbody></table>`;
      $panel.html(html);

      $panel.find('.admin-reset-pw-btn').on('click', async function () {
        const id = $(this).data('user-id');
        if (!confirm('Reset password to 123456 for this user?')) return;
        try {
          await API.resetPassword(id);
          showToast('Password reset to 123456');
        } catch { showToast('Error resetting password.'); }
      });
    } catch { $panel.html('<p style="color:var(--secondary);">Could not load users.</p>'); }
  }

  async function _renderManageSongs($panel) {
    try {
      const songs = await API.getAllSongs();
      let html = `
        <div class="admin-section-header">
          <p style="color:var(--secondary);margin:0;">${songs.length} songs total</p>
          <button class="admin-upload-btn" id="btn-show-upload">
            <span class="material-symbols-outlined" style="font-size:18px;">upload</span> Upload
          </button>
        </div>`;

      if (!songs.length) {
        html += `<div class="empty-state-panel"><div class="empty-state-icon"><span class="material-symbols-outlined" style="font-size:28px;">music_note</span></div><h1 class="page-title">No songs</h1><p class="page-subtitle">Upload your first song.</p></div>`;
      } else {
        html += `<table class="admin-song-table">
          <thead><tr><th>Title</th><th>Artist</th><th>Approved</th><th>Date</th><th></th></tr></thead>
          <tbody>`;
        songs.forEach(s => {
          html += `<tr><td>${s.title}</td><td>${s.artist}</td><td>${s.isApproved ? '<span style="color:var(--primary);font-weight:600;">Yes</span>' : '<span style="color:var(--secondary);">No</span>'}</td>
            <td>${new Date(s.createdAt).toLocaleDateString('vi-VN')}</td>
            <td><button class="admin-delete-btn" data-song-id="${s.id}"><span class="material-symbols-outlined" style="font-size:16px;">delete</span> Delete</button></td></tr>`;
        });
        html += `</tbody></table>`;
      }

      $panel.html(html);
      _bindAdminManageEvents();
    } catch { $panel.html('<p style="color:var(--secondary);">Could not load songs.</p>'); }
  }

  function _bindAdminManageEvents() {
    $('#btn-show-upload').on('click', () => $('#upload-modal').show());
    $('#upload-modal-close, #upload-cancel').on('click', () => { $('#upload-modal').hide(); $('#upload-error').text(''); });
    $('#upload-modal').on('click', function (e) { if (e.target === this) $(this).hide(); });

    $('#upload-confirm').off('click').on('click', async function () {
      const title = $('#upload-title').val().trim();
      const artist = $('#upload-artist').val().trim();
      const file = $('#upload-file')[0]?.files?.[0];
      const coverFile = $('#upload-cover')[0]?.files?.[0];
      if (!title || !artist) { $('#upload-error').text('Please enter title and artist.'); return; }

      const $btn = $(this).prop('disabled', true).text('Uploading...');
      $('#upload-progress').show();
      $('#upload-error').text('');

      try {
        await API.uploadSong(title, artist, file, coverFile);
        $('#upload-modal').hide();
        $('#upload-title, #upload-artist, #upload-file, #upload-cover').val('');
        $('#upload-progress').hide();
        _loadAdminTab('manage-songs');
        renderHomePage();
        showToast('Upload successful!');
      } catch (err) {
        const status = err.status || '';
        const msg = err.responseJSON?.error || err.responseJSON?.title || (err.responseText || '').substring(0, 100) || 'Please try again.';
        $('#upload-error').text(`Upload failed${status ? ' (HTTP ' + status + ')' : ''}: ${msg}`);
      } finally {
        $btn.prop('disabled', false).text('Upload');
      }
    });

    $('#page-admin').off('click', '.admin-delete-btn').on('click', '.admin-delete-btn', async function () {
      if (!confirm('Delete this song?')) return;
      const id = +$(this).data('song-id');
      try {
        await API.deleteSong(id);
        _loadAdminTab('manage-songs');
        renderHomePage();
        showToast('Song deleted.');
      } catch { showToast('Error deleting song.'); }
    });


  }

  // ── Studio (Artist) page ──

  async function renderStudioPage() {
    const $section = $('#page-studio');
    $section.empty();

    if (!currentUser) {
      try { currentUser = await API.getCurrentUser(); } catch { currentUser = null; }
    }

    if (!currentUser) {
      $section.html(`<div class="empty-state-panel"><div class="empty-state-icon"><span class="material-symbols-outlined" style="font-size:28px;">person</span></div><h1 class="page-title">Sign in required</h1><p class="page-subtitle"><a href="/Account/Login" style="color:var(--primary);">Sign in</a> to access your studio.</p></div>`);
      return;
    }

    const isArtist = currentUser.roles && currentUser.roles.includes('Artist');
    const isAdmin = currentUser.roles && currentUser.roles.includes('Admin');

    if (isArtist || isAdmin) {
      _renderArtistDashboard($section);
    } else {
      _renderArtistApplicationPrompt($section);
    }
  }

  async function _renderArtistApplicationPrompt($section) {
    let statusHtml = '';
    try {
      const status = await API.getArtistApplicationStatus();
      if (status.status === 'Pending') {
        statusHtml = `<div class="empty-state-panel"><div class="empty-state-icon"><span class="material-symbols-outlined" style="font-size:28px;">hourglass_top</span></div><h1 class="page-title">Application pending</h1><p class="page-subtitle">Your artist application is under review by an admin.</p></div>`;
      } else if (status.status === 'Rejected') {
        statusHtml = `<div class="empty-state-panel"><div class="empty-state-icon"><span class="material-symbols-outlined" style="font-size:28px;">close</span></div><h1 class="page-title">Application rejected</h1><p class="page-subtitle">Your application was not approved. Contact an admin for details.</p></div>`;
      } else {
        statusHtml = `
          <div class="empty-state-panel">
            <div class="empty-state-icon"><span class="material-symbols-outlined" style="font-size:28px;">mic</span></div>
            <h1 class="page-title">Artist studio</h1>
            <p class="page-subtitle">Apply to become an artist and upload your music.</p>
            <div style="margin-top:16px;display:flex;flex-direction:column;align-items:center;gap:12px;">
              <textarea id="artist-reason-input" placeholder="Why do you want to be an artist? (optional)" style="width:80%;max-width:400px;padding:12px 16px;border:1px solid var(--outline-variant);border-radius:var(--radius-md);font-family:var(--font-family);font-size:14px;resize:vertical;min-height:60px;"></textarea>
              <button id="btn-apply-artist" class="btn-primary">Apply as artist <span class="material-symbols-outlined" style="font-size:16px;">send</span></button>
            </div>
          </div>`;
      }
    } catch {
      statusHtml = `<div class="empty-state-panel"><div class="empty-state-icon"><span class="material-symbols-outlined" style="font-size:28px;">error</span></div><h1 class="page-title">Error</h1><p class="page-subtitle">Could not load application status.</p></div>`;
    }

    $section.html(`
      <div class="admin-header">
        <h1 class="page-title" style="font-size:32px;">Artist studio</h1>
      </div>
      ${statusHtml}
    `);

    $('#btn-apply-artist').on('click', async function () {
      const reason = $('#artist-reason-input').val().trim();
      try {
        await API.applyArtist(reason || null);
        showToast('Application submitted!');
        renderStudioPage();
      } catch { showToast('Error submitting application.'); }
    });
  }

  async function _renderArtistDashboard($section) {
    $section.html(`
      <div class="admin-header">
        <h1 class="page-title" style="font-size:32px;">My studio</h1>
        <button class="admin-upload-btn" id="btn-studio-upload">
          <span class="material-symbols-outlined" style="font-size:18px;">upload</span> Upload song
        </button>
      </div>
      <div id="studio-song-list"></div>
    `);

    try {
      const songs = await API.getMySongs();
      const $list = $('#studio-song-list');

      if (!songs.length) {
        $list.html(`<div class="empty-state-panel"><div class="empty-state-icon"><span class="material-symbols-outlined" style="font-size:28px;">music_note</span></div><h1 class="page-title">No songs yet</h1><p class="page-subtitle">Upload your first song for admin approval.</p></div>`);
      } else {
        let html = `<table class="admin-song-table"><thead><tr><th>Title</th><th>Artist</th><th>Status</th><th>Date</th></tr></thead><tbody>`;
        songs.forEach(s => {
          const status = s.isApproved
            ? '<span style="color:var(--primary);font-weight:600;">Approved</span>'
            : '<span style="color:var(--error);font-weight:500;">Pending review</span>';
          html += `<tr><td>${s.title}</td><td>${s.artist}</td><td>${status}</td><td>${new Date(s.createdAt).toLocaleDateString('vi-VN')}</td></tr>`;
        });
        html += `</tbody></table>`;
        $list.html(html);
      }
    } catch {
      $('#studio-song-list').html('<p style="color:var(--secondary);">Could not load songs.</p>');
    }

    $('#btn-studio-upload').on('click', () => $('#studio-upload-modal').show());
    $('#studio-upload-close, #studio-upload-cancel').on('click', () => { $('#studio-upload-modal').hide(); $('#studio-upload-error').text(''); });
    $('#studio-upload-modal').on('click', function (e) { if (e.target === this) $(this).hide(); });

    $('#studio-upload-confirm').off('click').on('click', async function () {
      const title = $('#studio-upload-title').val().trim();
      const artist = $('#studio-upload-artist').val().trim();
      const file = $('#studio-upload-file')[0]?.files?.[0];
      const coverFile = $('#studio-upload-cover')[0]?.files?.[0];
      if (!title || !artist) { $('#studio-upload-error').text('Please enter title and artist.'); return; }

      const $btn = $(this).prop('disabled', true).text('Uploading...');
      $('#studio-upload-progress').show();
      $('#studio-upload-error').text('');

      try {
        await API.artistUploadSong(title, artist, file, coverFile);
        $('#studio-upload-modal').hide();
        $('#studio-upload-title, #studio-upload-artist, #studio-upload-file, #studio-upload-cover').val('');
        $('#studio-upload-progress').hide();
        renderStudioPage();
        showToast('Song submitted for review!');
      } catch (err) {
        const status = err.status || '';
        const msg = err.responseJSON?.error || (err.responseText || '').substring(0, 100) || 'Please try again.';
        $('#studio-upload-error').text(`Upload failed${status ? ' (HTTP ' + status + ')' : ''}: ${msg}`);
      } finally {
        $btn.prop('disabled', false).text('Upload');
      }
    });
  }

  // ── Artist Profile editing ──

  async function renderArtistProfilePage() {
    const $section = $('#page-artist-profile');
    $section.html(`
      <div class="admin-header">
        <h1 class="page-title" style="font-size:32px;">Artist Profile</h1>
      </div>
      <div id="artist-profile-loading" class="empty-state-panel">
        <div class="empty-state-icon"><span class="material-symbols-outlined" style="font-size:28px;">person</span></div>
        <p>Loading your profile...</p>
      </div>
    `);

    try {
      const profile = await API.getMyArtistProfile();
      const avatarSrc = profile.imageUrl || '';
      const coverSrc = profile.coverUrl || '';
      const initial = profile.name.charAt(0).toUpperCase();

      const avatarHtml = avatarSrc
        ? `<img src="${avatarSrc}" alt="${profile.name}" id="profile-avatar-preview-img" />`
        : `<div id="profile-avatar-preview-init">${initial}</div>`;

      const coverHtml = coverSrc
        ? ` style="background-image:url('${coverSrc}')"`
        : '';

      $section.html(`
        <div class="artist-header" id="artist-header-area">
          <div class="artist-cover" id="profile-cover-preview"${coverHtml}></div>
          <div class="artist-avatar edit-avatar" id="profile-avatar-preview">${avatarHtml}</div>
          <div class="artist-info">
            <h1 class="artist-name">${profile.name}</h1>
            <div class="artist-stats">${profile.songCount} song${profile.songCount !== 1 ? 's' : ''} · ${profile.followerCount} follower${profile.followerCount !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <div class="profile-edit-form">
          <div class="profile-field">
            <label for="profile-bio">Bio</label>
            <textarea id="profile-bio" rows="4" placeholder="Tell your story...">${profile.bio || ''}</textarea>
          </div>
          <div class="profile-field">
            <label for="profile-avatar-file">Avatar Image</label>
            <input type="file" id="profile-avatar-file" accept="image/*" />
            <p style="font-size:12px;color:var(--secondary);margin:4px 0 0;">Recommended: 400x400, square</p>
          </div>
          <div class="profile-field">
            <label for="profile-cover-file">Cover Image</label>
            <input type="file" id="profile-cover-file" accept="image/*" />
            <p style="font-size:12px;color:var(--secondary);margin:4px 0 0;">Recommended: 1200x400, wide</p>
          </div>
          <div class="profile-field" style="margin-top:24px;">
            <button type="button" class="btn btn-primary" id="btn-save-profile">Save Changes</button>
            <span id="profile-save-status" style="margin-left:12px;font-size:14px;color:var(--secondary);"></span>
          </div>
        </div>
      `);

      $('#profile-avatar-file').on('change', function () {
        const file = this.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = function (e) {
            const $preview = $('#profile-avatar-preview');
            $preview.empty();
            $preview.append(`<img src="${e.target.result}" id="profile-avatar-preview-img" />`);
          };
          reader.readAsDataURL(file);
        }
      });

      $('#profile-cover-file').on('change', function () {
        const file = this.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = function (e) {
            $('#profile-cover-preview').css('background-image', `url('${e.target.result}')`);
          };
          reader.readAsDataURL(file);
        }
      });

      $('#btn-save-profile').on('click', async function () {
        const $btn = $(this).prop('disabled', true).text('Saving...');
        $('#profile-save-status').text('');
        try {
          const bio = $('#profile-bio').val();
          const avatarFile = $('#profile-avatar-file')[0].files[0];
          const coverFile = $('#profile-cover-file')[0].files[0];
          await API.updateArtist(profile.id, bio, avatarFile, coverFile);
          $('#profile-save-status').text('Profile updated!').css('color', 'var(--primary)');
        } catch {
          $('#profile-save-status').text('Save failed. Try again.').css('color', '#d32f2f');
        } finally {
          $btn.prop('disabled', false).text('Save Changes');
        }
      });
    } catch {
      $section.html(`
        <div class="empty-state-panel">
          <div class="empty-state-icon"><span class="material-symbols-outlined" style="font-size:28px;">person_off</span></div>
          <h1 class="page-title">No artist profile</h1>
          <p class="page-subtitle">You don't have an artist profile linked to your account yet.</p>
        </div>
      `);
    }
  }

  // ── Artist page ──

  async function renderArtistPage(artist) {
    const $section = $('#page-artist');
    let artistId = typeof artist === 'object' ? artist.id : null;
    let artistName = typeof artist === 'object' ? artist.name : artist;
    let artistProfile = null;

    $section.html(`
      <div class="artist-header" id="artist-header-area">
        <div class="artist-cover" id="artist-cover">
          <div class="artist-avatar" id="artist-avatar-initial">${artistName.charAt(0).toUpperCase()}</div>
        </div>
        <div class="artist-info">
          <h1 class="artist-name" id="artist-name">${artistName}</h1>
          <p class="artist-bio" id="artist-bio"></p>
          <div class="artist-stats" id="artist-stats">Loading...</div>
          <div id="artist-actions"></div>
        </div>
      </div>
      <div class="song-grid" id="artist-song-grid">${_skeletonGrid(4)}</div>
    `);

    try {
      if (artistId) {
        artistProfile = await API.getArtistById(artistId);
      } else {
        const allArtists = await API.getArtists();
        const found = allArtists.find(a => a.name.toLowerCase() === artistName.toLowerCase());
        if (found) { artistId = found.id; artistProfile = found; }
      }

      if (artistProfile) {
        artistName = artistProfile.name;
        $('#artist-name').text(artistProfile.name);

        if (artistProfile.imageUrl) {
          $('#artist-avatar-initial').replaceWith(`<img src="${artistProfile.imageUrl}" alt="${artistProfile.name}" class="artist-avatar-img" />`);
        }
        if (artistProfile.coverUrl) {
          $('#artist-cover').css('background-image', `url(${artistProfile.coverUrl})`);
        }
        if (artistProfile.bio) {
          $('#artist-bio').text(artistProfile.bio);
        }

        const sc = artistProfile.songCount ?? '?';
        const fc = artistProfile.followerCount ?? 0;
        $('#artist-stats').html(`<span>${sc} song${sc !== 1 ? 's' : ''}</span> · <span id="follower-count">${fc} follower${fc !== 1 ? 's' : ''}</span>`);

        if (currentUser) {
          const $actions = $('#artist-actions');
          const $btn = $(`<button class="follow-btn" id="btn-follow-artist" data-artist-id="${artistId}"><span class="material-symbols-outlined" style="font-size:16px;">favorite</span> Follow</button>`);
          $actions.append($btn);

          $btn.on('click', async function () {
            try {
              const result = await API.followArtist(artistId);
              const isFollowing = result.isFollowing;
              const count = result.followerCount;
              $(this).toggleClass('following', isFollowing);
              $(this).html(isFollowing
                ? '<span class="material-symbols-outlined" style="font-size:16px;">favorite</span> Following'
                : '<span class="material-symbols-outlined" style="font-size:16px;">favorite</span> Follow');
              $('#follower-count').text(`${count} follower${count !== 1 ? 's' : ''}`);
            } catch { showToast('Error toggling follow.'); }
          });
        }
      }
    } catch { /* ignore, use name-only fallback */ }

    try {
      const songs = artistId
        ? await API.getArtistSongs(artistId)
        : await API.getArtistSongs(artistName);

      if (!artistProfile) {
        $('#artist-stats').text(`${songs.length} song${songs.length !== 1 ? 's' : ''}`);
      }

      const $grid = $('#artist-song-grid');

      if (!songs.length) {
        $grid.html(`<div class="empty-state-panel" style="grid-column:1/-1;"><div class="empty-state-icon"><span class="material-symbols-outlined" style="font-size:28px;">music_note</span></div><h1 class="page-title">No songs found</h1><p class="page-subtitle">This artist hasn't uploaded anything yet.</p></div>`);
        return;
      }

      $grid.empty();
      songs.forEach(s => {
        const cover = s.coverUrl || `https://placehold.co/400x400/e3e2e2/1b1c1c?text=${encodeURIComponent(s.title.charAt(0) || '?')}`;
        const artists = s.artists && s.artists.length
          ? s.artists.map(a => `<span class="artist-link" data-artist-id="${a.id}" data-artist="${a.name}">${a.name}</span>`).join(', ')
          : API.splitArtists(s.artist).map(a => `<span class="artist-link" data-artist="${a}">${a}</span>`).join(', ');
        $grid.append(`
          <article class="music-card" data-song-id="${s.id}">
            <div class="music-card-thumb">
              <img src="${cover}" alt="${s.title}" loading="lazy" />
              <button class="card-play-btn" data-song-id="${s.id}">
                <span class="material-symbols-outlined" style="font-size:20px;">play_arrow</span>
              </button>
            </div>
            <div class="music-card-body">
              <div class="music-card-name">${s.title}</div>
              <div class="music-card-artist">${artists}</div>
            </div>
          </article>
        `);
      });

      $grid.off('click').on('click', '.card-play-btn, .music-card', function (e) {
        if ($(e.target).closest('.card-play-btn, .artist-link').length === 0 && !$(this).is('.card-play-btn')) return;
        const id = +$(this).closest('.music-card').data('song-id');
        const song = songs.find(s => s.id === id);
        if (song) { Player.setQueue(songs, songs.indexOf(song)); Player.load(song); }
      });
    } catch {
      $('#artist-song-grid').html('<p style="color:var(--secondary);padding:40px;">Could not load artist songs.</p>');
    }
  }

  function _skeletonGrid(count) {
    let html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:24px;">';
    for (let i = 0; i < count; i++) {
      html += `<div><div class="skeleton skeleton-card"></div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line short"></div></div>`;
    }
    html += '</div>';
    return html;
  }

  // ── Sidebar playlists ──

  function _bindSidebarPlaylists() {
    const $container = $('#sidebar-playlists');
    $container.off('click.sidebar');

    $container.on('click.sidebar', '.sidebar-playlist-item[data-playlist-id]', function () {
      openPlaylist(+$(this).data('playlist-id'));
    });
    $container.on('click.sidebar', '.sidebar-playlist-item[data-page]', function () {
      navigate($(this).data('page'));
    });

    $('#btn-create-playlist').off('click').on('click', function () {
      $('#playlist-modal').show();
      $('#playlist-name-input').val('').focus();
      $('#playlist-error').text('');
    });

    $('#playlist-modal .modal-close, #modal-cancel').on('click', () => $('#playlist-modal').hide());
    $('#playlist-modal').on('click', function (e) { if (e.target === this) $(this).hide(); });

    $('#modal-confirm').off('click').on('click', async function () {
      const name = $('#playlist-name-input').val().trim();
      if (!name) { $('#playlist-error').text('Please enter a playlist name.'); return; }
      try {
        await API.createPlaylist(name);
        $('#playlist-modal').hide();
        refreshSidebarPlaylists();
        showToast('Playlist created!');
      } catch { $('#playlist-error').text('Error creating playlist.'); }
    });
  }

  async function refreshSidebarPlaylists() {
    const $container = $('#sidebar-playlists');
    $container.empty();

    $container.append(`
      <div class="sidebar-playlist-item" data-page="library">
        <div class="sidebar-playlist-thumb"><span class="material-symbols-outlined" style="font-size:18px;">favorite</span></div>
        <div class="sidebar-playlist-info">
          <div class="sidebar-playlist-name">Liked Songs</div>
          <div class="sidebar-playlist-meta">${App.favoriteIds.length} songs</div>
        </div>
      </div>
    `);

    try {
      const playlists = await API.getPlaylists();
      playlists.forEach(p => {
        $container.append(`
          <div class="sidebar-playlist-item" data-playlist-id="${p.id}">
            <div class="sidebar-playlist-thumb"><span class="material-symbols-outlined" style="font-size:18px;">queue_music</span></div>
            <div class="sidebar-playlist-info">
              <div class="sidebar-playlist-name">${p.name}</div>
              <div class="sidebar-playlist-meta">${p.songCount} songs</div>
            </div>
          </div>
        `);
      });
    } catch { /* ignore */ }
  }

  function _bindNav() {
    $(document).on('click', '.nav-item[data-page]', function (e) {
      e.preventDefault();
      navigate($(this).data('page'));
    });
    $(document).on('click', '.mobile-nav-item[data-page]', function () {
      navigate($(this).data('page'));
    });
    $(document).on('click', '[data-page="admin"]', function (e) {
      if ($(this).closest('.topnav-dropdown').length || $(this).closest('.sidebar-nav').length) {
        e.preventDefault();
        $('#user-dropdown').removeClass('show');
        navigate('admin');
      }
    });
    $(document).on('click', '[data-page="studio"]', function (e) {
      if ($(this).closest('.topnav-dropdown').length || $(this).closest('.sidebar-nav').length) {
        e.preventDefault();
        $('#user-dropdown').removeClass('show');
        navigate('studio');
      }
    });

    $('#topnav-search-input').on('focus', function () {
      navigate('search');
    });

    $('#btn-user-menu').on('click', function () {
      $('#user-dropdown').toggleClass('show');
    });
    $(document).on('click', function (e) {
      if (!$(e.target).closest('.topnav-user').length) $('#user-dropdown').removeClass('show');
    });

    $('#btn-dark-mode').on('click', function () {
      const html = document.documentElement;
      const isDark = html.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      const icon = $(this);
      icon.text(isDark ? 'light_mode' : 'dark_mode');
      icon.attr('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    });
  }

  // ── Context menu ──

  function _bindContextMenu() {
    const $menu = $('#context-menu');
    let _contextSong = null;
    let _contextSongs = [];

    function _hideMenu() { $menu.hide(); }

    $(document).on('click', _hideMenu);
    $(document).on('contextmenu', function (e) {
      if (!$(e.target).closest('.music-card, .song-list-item, #context-menu').length) _hideMenu();
    });

    $(document).on('contextmenu', '.music-card, .song-list-item', function (e) {
      e.preventDefault();
      e.stopPropagation();
      _hideMenu();

      const $target = $(this).closest('.music-card, .song-list-item');
      const songId = +$target.data('song-id');
      if (!songId) return;

      if ($target.closest('#page-home').length) _contextSongs = window._allSongs || [];
      else if ($target.closest('#page-playlist').length) _contextSongs = window.__activePlaylist?.songs || [];
      else if ($target.closest('#page-search').length) _contextSongs = window.__searchResults || _contextSongs;
      _contextSong = _contextSongs.find(s => s.id === songId);
      if (!_contextSong) return;

      const canEdit = currentUser && (currentUser.roles.includes('Admin') || _contextSong.uploadedById === currentUser.id);
      $('#ctx-edit-song').toggle(canEdit);

      $menu.css({ left: e.pageX + 'px', top: e.pageY + 'px', visibility: 'hidden' }).show();
      const menuRect = $menu[0].getBoundingClientRect();
      const cx = Math.max(8, Math.min(menuRect.left, window.innerWidth - menuRect.width - 8));
      const cy = Math.max(8, Math.min(menuRect.top, window.innerHeight - menuRect.height - 8));
      $menu.css({ left: cx + 'px', top: cy + 'px', visibility: 'visible' });
    });

    $menu.find('[data-action]').off('click').on('click', function () {
      const action = $(this).data('action');
      const song = _contextSong;
      _hideMenu();
      if (!song) return;

      if (action === 'play') {
        Player.setQueue(_contextSongs, _contextSongs.indexOf(song));
        Player.load(song);
      } else if (action === 'add-queue') {
        const q = Player.getQueue();
        const idx = q.indexOf(song);
        if (idx === -1) {
          q.push(song);
          showToast(`Added "${song.title}" to queue`);
        }
      } else if (action === 'add-playlist') {
        $('#context-playlist-select').remove();
        API.getPlaylists().then(playlists => {
          if (!playlists.length) { showToast('No playlists. Create one first.'); return; }
          let html = '<div id="context-playlist-select" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--surface);border:1px solid var(--outline-variant);border-radius:var(--radius-md);z-index:400;padding:16px;min-width:240px;box-shadow:0 4px 20px rgba(0,0,0,0.12);">';
          html += '<h3 style="margin:0 0 12px;font-size:15px;font-weight:600;">Add to playlist</h3>';
          playlists.forEach(p => {
            html += `<div class="context-menu-item" data-playlist-id="${p.id}" style="padding:8px 12px;">${p.name}</div>`;
          });
          html += '</div>';
          $('body').append(html);
          $('#context-playlist-select').on('click', '[data-playlist-id]', async function () {
            const pid = +$(this).data('playlist-id');
            try {
              await API.addSongToPlaylist(pid, song.id);
              showToast(`Added to playlist`);
            } catch { showToast('Error adding to playlist.'); }
            $('#context-playlist-select').remove();
          });
          $(document).one('click', function (e) {
            if (!$(e.target).closest('#context-playlist-select').length) $('#context-playlist-select').remove();
          });
        });
      } else if (action === 'edit') {
        _showEditSongModal(song);
      } else if (action === 'artist') {
        if (song.artists && song.artists.length) {
          const first = song.artists[0];
          navigateToArtistById(first.id, first.name);
        } else {
          navigateToArtist(API.splitArtists(song.artist)[0] || song.artist);
        }
      }
    });
  }

  function _showEditSongModal(song) {
    const overlay = $('<div class="modal-overlay"></div>');
    const modal = $(`
      <div class="edit-modal" style="background:var(--surface);border:1px solid var(--outline-variant);border-radius:var(--radius-lg);padding:24px;max-width:420px;width:90%;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:500;box-shadow:0 8px 32px rgba(0,0,0,0.15);">
        <h3 style="margin:0 0 16px;font-size:16px;font-weight:600;">Edit Song</h3>
        <label style="display:block;font-size:13px;font-weight:500;margin-bottom:4px;color:var(--on-surface-variant);">Title</label>
        <input type="text" id="edit-song-title" value="${song.title.replace(/"/g, '&quot;')}" class="input-field" style="width:100%;padding:10px 14px;border:1px solid var(--outline-variant);border-radius:var(--radius-sm);background:var(--surface-container-low);color:var(--on-surface);font-size:14px;margin-bottom:12px;" />
        <label style="display:block;font-size:13px;font-weight:500;margin-bottom:4px;color:var(--on-surface-variant);">Artist</label>
        <input type="text" id="edit-song-artist" value="${song.artist.replace(/"/g, '&quot;')}" class="input-field" style="width:100%;padding:10px 14px;border:1px solid var(--outline-variant);border-radius:var(--radius-sm);background:var(--surface-container-low);color:var(--on-surface);font-size:14px;margin-bottom:20px;" />
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button class="btn-secondary" id="edit-cancel">Cancel</button>
          <button class="btn-primary" id="edit-save">Save</button>
        </div>
        <div id="edit-error" style="color:var(--error);font-size:13px;margin-top:8px;display:none;"></div>
      </div>
    `);
    overlay.append(modal);
    $('body').append(overlay);

    function close() { overlay.remove(); }

    overlay.on('click', function (e) { if (e.target === overlay[0]) close(); });
    $('#edit-cancel').on('click', close);

    $('#edit-save').on('click', async function () {
      const title = $('#edit-song-title').val().trim();
      const artist = $('#edit-song-artist').val().trim();
      if (!title || !artist) { $('#edit-error').text('Title and artist are required.').show(); return; }
      try {
        await API.updateSong(song.id, title, artist);
        showToast('Song updated.');
        close();
      } catch (e) {
        const msg = e.responseJSON?.error || 'Failed to update song.';
        $('#edit-error').text(msg).show();
      }
    });
  }

  function _applyTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    const html = document.documentElement;
    const isDark = saved === 'dark';
    html.classList.toggle('dark', isDark);
    $('#btn-dark-mode').text(isDark ? 'light_mode' : 'dark_mode');
    $('#btn-dark-mode').attr('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  }

  async function init() {
    _applyTheme();
    currentUser = await API.getCurrentUser();
    await refreshFavorites();
    Player.init();
    if (typeof Room !== 'undefined') { Room.init(); Room.initUI(); }
    if (typeof UIEffects !== 'undefined') UIEffects.init();
    _bindNav();
    _bindSidebarPlaylists();
    _bindContextMenu();
    // Check if user has an artist profile linked
    if (currentUser) {
      try {
        await API.getMyArtistProfile();
        $('#dropdown-artist-profile').show();
      } catch {
        $('#dropdown-artist-profile').hide();
      }
    } else {
      $('#dropdown-artist-profile').hide();
    }
    await Promise.all([renderHomePage(), refreshSidebarPlaylists()]);
    if (typeof UIEffects !== 'undefined') UIEffects.setActivePage(currentPage);
    navigate('home');
  }

  return { init, navigate, openPlaylist, navigateToArtist, navigateToArtistById, get favoriteIds() { return favoriteIds; }, set favoriteIds(v) { favoriteIds = v; } };
})();

function debounce(fn, ms) {
  let timer;
  return function (...args) { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), ms); };
}

function showToast(msg) {
  $('.toast-notification').remove();
  const $t = $(`<div class="toast-notification">${msg}</div>`);
  $('body').append($t);
  setTimeout(() => $t.addClass('show'), 50);
  setTimeout(() => { $t.removeClass('show'); setTimeout(() => $t.remove(), 300); }, 2400);
}

$(function () { App.init(); });
