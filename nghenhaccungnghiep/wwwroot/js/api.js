const API = {
  async getSongs(search, offset = 0, limit = 24) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('offset', offset);
    params.set('limit', limit);
    return $.getJSON(`/api/songs?${params}`);
  },

  async getSong(id) {
    return $.getJSON(`/api/songs/${id}`);
  },

  async getArtists() {
    return $.getJSON('/api/artists');
  },

  async getArtistById(id) {
    return $.getJSON(`/api/artists/${id}`);
  },

  async getMyArtistProfile() {
    return $.getJSON('/api/artists/my-profile');
  },

  async getArtistSongs(artist) {
    if (typeof artist === 'number') {
      return $.getJSON(`/api/artists/${artist}/songs`);
    }
    return $.getJSON(`/api/artists/name/${encodeURIComponent(artist)}/songs`);
  },

  async followArtist(id) {
    return $.ajax({ url: `/api/artists/${id}/follow`, method: 'POST' });
  },

  async updateArtist(id, bio, imageFile, coverFile) {
    const fd = new FormData();
    if (bio != null) fd.append('bio', bio);
    if (imageFile) fd.append('imageFile', imageFile);
    if (coverFile) fd.append('coverFile', coverFile);
    return $.ajax({ url: `/api/artists/${id}`, method: 'PUT', data: fd, processData: false, contentType: false });
  },

  async reportDuration(songId, durationInSeconds) {
    return $.ajax({ url: `/api/songs/${songId}/report-duration`, method: 'POST', contentType: 'application/json', data: JSON.stringify({ durationInSeconds }) });
  },

  async logRecentlyPlayed(songId) {
    return $.ajax({ url: '/api/recently-played', method: 'POST', contentType: 'application/json', data: JSON.stringify({ songId }) });
  },

  async getRecentlyPlayed() {
    try { return await $.getJSON('/api/recently-played'); } catch { return []; }
  },

  async getPlaylists() {
    return $.getJSON('/api/playlists');
  },

  async getPlaylist(id) {
    return $.getJSON(`/api/playlists/${id}`);
  },

  async reorderPlaylistSongs(playlistId, songIds) {
    return $.ajax({ url: `/api/playlists/${playlistId}/songs/reorder`, method: 'PUT', contentType: 'application/json', data: JSON.stringify({ songIds }) });
  },

  async createPlaylist(name) {
    return $.ajax({ url: '/api/playlists', method: 'POST', contentType: 'application/json', data: JSON.stringify({ name }) });
  },

  async addSongToPlaylist(playlistId, songId) {
    return $.ajax({ url: `/api/playlists/${playlistId}/songs`, method: 'POST', contentType: 'application/json', data: JSON.stringify({ songId }) });
  },

  async removeSongFromPlaylist(playlistId, songId) {
    return $.ajax({ url: `/api/playlists/${playlistId}/songs/${songId}`, method: 'DELETE' });
  },

  async deletePlaylist(id) {
    return $.ajax({ url: `/api/playlists/${id}`, method: 'DELETE' });
  },

  async getFavorites() {
    return $.getJSON('/api/favorites');
  },

  async toggleFavorite(songId) {
    return $.ajax({ url: '/api/favorites/toggle', method: 'POST', contentType: 'application/json', data: JSON.stringify({ songId }) });
  },

  async getCurrentUser() {
    try { return await $.getJSON('/api/current-user'); } catch { return null; }
  },

  async uploadSong(title, artist, audioFile, coverFile) {
    const fd = new FormData();
    fd.append('title', title);
    fd.append('artist', artist);
    if (audioFile) fd.append('audioFile', audioFile);
    if (coverFile) fd.append('coverFile', coverFile);
    return $.ajax({ url: '/api/admin/upload', method: 'POST', data: fd, processData: false, contentType: false });
  },

  async deleteSong(id) {
    return $.ajax({ url: `/api/admin/songs/${id}`, method: 'DELETE' });
  },

  // ── Artist endpoints ──

  async applyArtist(reason) {
    return $.ajax({ url: '/api/artist/apply', method: 'POST', contentType: 'application/json', data: JSON.stringify({ reason }) });
  },

  async getArtistApplicationStatus() {
    return $.getJSON('/api/artist/application-status');
  },

  async artistUploadSong(title, artist, audioFile, coverFile) {
    const fd = new FormData();
    fd.append('title', title);
    fd.append('artist', artist);
    if (audioFile) fd.append('audioFile', audioFile);
    if (coverFile) fd.append('coverFile', coverFile);
    return $.ajax({ url: '/api/artist/upload', method: 'POST', data: fd, processData: false, contentType: false });
  },

  async getMySongs() {
    return $.getJSON('/api/artist/my-songs');
  },

  // ── Admin endpoints ──

  async getPendingArtists() {
    return $.getJSON('/api/admin/pending-artists');
  },

  async approveArtist(id) {
    return $.ajax({ url: `/api/admin/pending-artists/${id}/approve`, method: 'POST' });
  },

  async rejectArtist(id) {
    return $.ajax({ url: `/api/admin/pending-artists/${id}/reject`, method: 'POST' });
  },

  async getPendingSongs() {
    return $.getJSON('/api/admin/pending-songs');
  },

  async approveSong(id) {
    return $.ajax({ url: `/api/admin/pending-songs/${id}/approve`, method: 'POST' });
  },

  async rejectSong(id) {
    return $.ajax({ url: `/api/admin/pending-songs/${id}/reject`, method: 'POST' });
  },

  async getAllSongs() {
    return $.getJSON('/api/admin/all-songs');
  },

  async getUsers() {
    return $.getJSON('/api/admin/users');
  },

  async resetPassword(userId) {
    return $.ajax({ url: `/api/admin/users/${userId}/reset-password`, method: 'POST' });
  },

  async getTopSongs(limit = 10) {
    return $.getJSON(`/api/songs/top?limit=${limit}`);
  },

  async updatePlaylist(id, name, isPublic) {
    return $.ajax({ url: `/api/playlists/${id}`, method: 'PUT', contentType: 'application/json', data: JSON.stringify({ name, isPublic }) });
  },

  async updateSong(id, title, artist) {
    return $.ajax({ url: `/api/songs/${id}`, method: 'PUT', contentType: 'application/json', data: JSON.stringify({ title, artist }) });
  },

  // ── User profile ──

  async updateProfile(displayName) {
    return $.ajax({ url: '/api/user/profile', method: 'PUT', contentType: 'application/json', data: JSON.stringify({ displayName }) });
  },

  async changePassword(currentPassword, newPassword) {
    return $.ajax({ url: '/api/user/change-password', method: 'POST', contentType: 'application/json', data: JSON.stringify({ currentPassword, newPassword }) });
  },

  splitArtists(artist) {
    if (!artist) return [];
    const separators = /\s+(feat\.?|ft\.?|và|&)\s+/i;
    const parts = artist.split(separators).filter(p => {
      const t = p.trim().toLowerCase();
      return t && !['feat', 'ft', 'và', '&', 'feat.', 'ft.'].includes(t);
    });
    const result = [];
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const commas = trimmed.split(',').map(p => p.trim()).filter(Boolean);
      const mergedCommas = [];
      for (const cp of commas) {
        if (mergedCommas.length && cp.startsWith('The '))
          mergedCommas[mergedCommas.length - 1] += ', ' + cp;
        else
          mergedCommas.push(cp);
      }
      result.push(...mergedCommas);
    }
    return [...new Set(result)];
  }
};
