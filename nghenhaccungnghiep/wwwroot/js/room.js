const Room = (function () {
  let connection = null;
  let currentRoomId = null;
  let isConnected = false;

  function init() {
    connection = new signalR.HubConnectionBuilder()
      .withUrl('/hub/room')
      .withAutomaticReconnect()
      .build();

    connection.on('PlaybackSync', (action, data) => {
      if (action === 'play') Player.play();
      else if (action === 'pause') Player.pause();
      else if (action === 'seek' && data != null) Player.seek(data);
      else if (action === 'load' && data != null) {
        if (data.song) Player.setQueue(data.queue || [data.song], 0);
        Player.load(data.song);
      }
    });

    connection.on('QueueSync', (queueData) => {
      if (queueData && queueData.songs) Player.setQueue(queueData.songs, queueData.index || 0);
    });

    connection.onreconnected(() => {
      isConnected = true;
      if (currentRoomId) joinRoom(currentRoomId);
    });

    connection.onclose(() => {
      isConnected = false;
    });

    connection.start().then(() => {
      isConnected = true;
    }).catch(() => {});
  }

  async function joinRoom(roomId) {
    if (currentRoomId && currentRoomId !== roomId) await leaveRoom();
    currentRoomId = roomId;
    if (isConnected) {
      try { await connection.invoke('JoinRoom', roomId); } catch { /* ignore */ }
    }
  }

  async function leaveRoom() {
    if (currentRoomId && isConnected) {
      try { await connection.invoke('LeaveRoom', currentRoomId); } catch { /* ignore */ }
    }
    currentRoomId = null;
  }

  async function syncPlayback(action, data) {
    if (currentRoomId && isConnected) {
      try { await connection.invoke('SyncPlayback', currentRoomId, action, data); } catch { /* ignore */ }
    }
  }

  async function syncQueue(songs, index) {
    if (currentRoomId && isConnected) {
      try { await connection.invoke('SyncQueue', currentRoomId, { songs, index }); } catch { /* ignore */ }
    }
  }

  function _updateUI() {
    const $status = $('#room-status');
    if (currentRoomId) {
      $status.html(`<span style="color:var(--primary);">In room: <strong>${currentRoomId}</strong></span>`);
      $('#btn-room-leave').show();
    } else {
      $status.html('<span style="color:var(--secondary);">Not in a room.</span>');
      $('#btn-room-leave').hide();
    }
  }

  function _bindUI() {
    $(document).on('click', '#btn-room', function () {
      $('#room-panel').toggle();
      _updateUI();
    });
    $(document).on('click', '#room-close', function () { $('#room-panel').hide(); });
    $(document).on('click', '#btn-room-create', async function () {
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      $('#room-id-input').val(roomId);
      await joinRoom(roomId);
      _updateUI();
      showToast(`Room created: ${roomId}`);
    });
    $(document).on('click', '#btn-room-join', async function () {
      const roomId = $('#room-id-input').val().trim();
      if (!roomId) { showToast('Enter a room code.'); return; }
      await joinRoom(roomId);
      _updateUI();
      showToast(`Joined room: ${roomId}`);
    });
    $(document).on('click', '#btn-room-leave', async function () {
      await leaveRoom();
      _updateUI();
      showToast('Left room.');
    });
  }

  function initUI() {
    _bindUI();
    _updateUI();
  }

  function isInRoom() { return currentRoomId != null; }
  function getRoomId() { return currentRoomId; }

  return { init, initUI, joinRoom, leaveRoom, syncPlayback, syncQueue, isInRoom, getRoomId };
})();
