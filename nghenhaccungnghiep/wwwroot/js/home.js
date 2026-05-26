function _getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function _songCover(song) {
  if (song.coverUrl) return song.coverUrl;
  return `https://placehold.co/400x400/e3e2e2/1b1c1c?text=${encodeURIComponent(song.title.charAt(0) || '?')}`;
}

function _formatDuration(seconds) {
  if (seconds == null || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function _skeletonGrid(count) {
  let html = '<div class="skeleton-grid">';
  for (let i = 0; i < count; i++) {
    html += `<div><div class="skeleton skeleton-card"></div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line short"></div></div>`;
  }
  html += '</div>';
  return html;
}

function _buildSongCard(song) {
  const artists = song.artists && song.artists.length
    ? song.artists.map(a => `<span class="artist-link" data-artist-id="${a.id}" data-artist="${a.name}">${a.name}</span>`).join(', ')
    : API.splitArtists(song.artist).map(a => `<span class="artist-link" data-artist="${a}">${a}</span>`).join(', ');
  return `
    <article class="music-card" data-song-id="${song.id}">
      <div class="music-card-thumb">
        <img src="${_songCover(song)}" alt="${song.title}" loading="lazy" />
        <button class="card-play-btn" data-song-id="${song.id}" title="Play ${song.title}">
          <span class="material-symbols-outlined" style="font-size:20px;">play_arrow</span>
        </button>
      </div>
      <div class="music-card-body">
        <div class="music-card-name">${song.title}</div>
        <div class="music-card-artist">${artists}</div>
      </div>
    </article>`;
}

function _buildHero() {
  return `
    <section class="home-hero" id="home-hero">
      <div class="hero-copy">
        <p class="hero-kicker"><span class="material-symbols-outlined" style="font-size:14px;">radio</span> Welcome</p>
        <h1 class="hero-title">Listen with<br />colleagues</h1>
        <p class="hero-desc">Discover the latest tracks from the community. Upload, share, and enjoy music together.</p>
        <p class="hero-atmosphere">Today's mood: play loud, dive deep, let the light follow the sound.</p>
        <div class="hero-meta">
          <span><span class="material-symbols-outlined" style="font-size:16px;">auto_awesome</span> Constantly updated</span>
          <span><span class="material-symbols-outlined" style="font-size:16px;">group</span> Community & sharing</span>
        </div>
        <div class="hero-actions">
          <button class="btn-primary" id="hero-play-all">
            Play all
            <span class="btn-icon material-symbols-outlined">play_arrow</span>
          </button>
        </div>
      </div>
      <div class="hero-art">
        <img src="https://placehold.co/800x800/e3e2e2/1b1c1c?text=Record" alt="Record" loading="eager" />
      </div>
    </section>`;
}

function _sectionHeading(title, subtitle = '') {
  return `
    <div class="section-heading">
      <div class="section-heading-copy">
        <h2>${title}</h2>
        ${subtitle ? `<p>${subtitle}</p>` : ''}
      </div>
    </div>`;
}

function _buildContentRail(title, subtitle, innerHtml) {
  return `
    <section class="content-rail">
      ${_sectionHeading(title, subtitle)}
      ${innerHtml}
    </section>`;
}

let _allSongs = [];
let _pageOffset = 0;
let _hasMore = true;
let _loadingMore = false;
const PAGE_SIZE = 24;

async function _loadMoreSongs() {
  if (_loadingMore || !_hasMore) return;
  _loadingMore = true;
  try {
    const data = await API.getSongs('', _pageOffset, PAGE_SIZE);
    const songs = data.songs;
    _hasMore = data.hasMore;
    _allSongs.push(...songs);
    _pageOffset += songs.length;

    const $grid = $('#home-song-grid');
    if ($grid.length) {
      const html = songs.map(s => _buildSongCard(s)).join('');
      $grid.append(html);
    }
  } catch { /* ignore */ } finally {
    _loadingMore = false;
  }
}

async function renderHomePage() {
  const $section = $('#page-home');
  $section.empty();

  $section.html(`
    ${_buildHero()}
    <div id="home-rails"></div>
  `);

  const $rails = $('#home-rails');
  $rails.append(_buildContentRail(_getGreeting(), 'Loading songs...', _skeletonGrid(6)));

  try {
    const [data, recent, topData] = await Promise.all([API.getSongs('', 0, PAGE_SIZE), API.getRecentlyPlayed(), API.getTopSongs(6)]);
    const songs = data.songs;
    const topSongs = topData || [];
    _hasMore = data.hasMore;
    _pageOffset = songs.length;
    _allSongs = songs;
    $rails.empty();

    if (recent && recent.length > 0) {
      const recentHtml = recent.map(s => _buildSongCard(s)).join('');
      $rails.append(_buildContentRail('Recently played', 'Continue where you left off.', `<div class="song-grid">${recentHtml}</div>`));
    }

    if (topSongs.length > 0) {
      const topHtml = topSongs.map(s => _buildSongCard(s)).join('');
      $rails.append(_buildContentRail('Top songs', 'Most played this week.', `<div class="song-grid">${topHtml}</div>`));
    }

    if (!songs.length) {
      $rails.append(`<div class="content-rail"><div class="empty-state-panel" style="margin-top:0;"><div class="empty-state-icon"><span class="material-symbols-outlined" style="font-size:28px;">music_note</span></div><h1 class="page-title">No songs yet</h1><p class="page-subtitle">Sign in and upload your first song!</p></div></div>`);
    } else {
      const allHtml = songs.map(s => _buildSongCard(s)).join('');
      $rails.append(_buildContentRail(_getGreeting(), `${songs.length} songs on Record.`, `<div class="song-grid" id="home-song-grid">${allHtml}</div>`));
      $rails.append('<div id="home-sentinel" style="height:1px;"></div>');
    }
  } catch (e) {
    $rails.html('<p style="color:var(--secondary);padding:40px;">Could not load songs.</p>');
  }

  _bindHomeEvents();
  _initInfiniteScroll();
}

function _initInfiniteScroll() {
  const sentinel = document.getElementById('home-sentinel');
  if (!sentinel) return;
  if (window._homeObserver) window._homeObserver.disconnect();
  window._homeObserver = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) _loadMoreSongs();
  }, { rootMargin: '200px' });
  window._homeObserver.observe(sentinel);
}

function _bindHomeEvents() {
  const $section = $('#page-home');
  $section.off('.home');

  $section.on('click.home', '.card-play-btn[data-song-id], .music-card[data-song-id]', function (e) {
    if ($(e.target).closest('.card-play-btn').length === 0 && !$(this).is('.card-play-btn')) return;
    const id = +$(this).closest('.music-card').data('song-id');
    const song = _allSongs.find(s => s.id === id);
    if (song) {
      Player.setQueue(_allSongs, _allSongs.indexOf(song));
      Player.load(song);
    }
  });

  $section.on('click.home', '.music-card[data-song-id]', function (e) {
    if ($(e.target).closest('.card-play-btn, .music-card-artist').length) return;
    const id = +$(this).data('song-id');
    const song = _allSongs.find(s => s.id === id);
    if (song) {
      Player.setQueue(_allSongs, _allSongs.indexOf(song));
      Player.load(song);
    }
  });

  $section.on('click.home', '.artist-link', function (e) {
    e.stopPropagation();
    const id = $(this).data('artist-id');
    const name = $(this).data('artist');
    if (id) { App.navigateToArtistById(id, name); }
    else { App.navigateToArtist(name); }
  });

  $('#hero-play-all').on('click', function () {
    if (_allSongs.length) {
      Player.setQueue(_allSongs, 0);
      Player.load(_allSongs[0]);
    }
  });

  $(document).off('keydown.player').on('keydown.player', function (e) {
    const tag = e.target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    if (e.code === 'Space') { e.preventDefault(); Player.toggle(); }
  });
}
