using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace nghenhaccungnghiep.Hubs;

public class RoomHub : Hub
{
    private static readonly Dictionary<string, HashSet<string>> _rooms = new();

    public async Task JoinRoom(string roomId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        lock (_rooms)
        {
            if (!_rooms.ContainsKey(roomId))
                _rooms[roomId] = new HashSet<string>();
            _rooms[roomId].Add(Context.ConnectionId);
        }
        await Clients.Group(roomId).SendAsync("UserJoined", Context.ConnectionId);
    }

    public async Task LeaveRoom(string roomId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
        lock (_rooms)
        {
            if (_rooms.ContainsKey(roomId))
            {
                _rooms[roomId].Remove(Context.ConnectionId);
                if (_rooms[roomId].Count == 0)
                    _rooms.Remove(roomId);
            }
        }
        await Clients.Group(roomId).SendAsync("UserLeft", Context.ConnectionId);
    }

    public async Task SyncPlayback(string roomId, string action, object? data)
    {
        await Clients.OthersInGroup(roomId).SendAsync("PlaybackSync", action, data);
    }

    public async Task SyncQueue(string roomId, object queueData)
    {
        await Clients.OthersInGroup(roomId).SendAsync("QueueSync", queueData);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        lock (_rooms)
        {
            var toRemove = new List<string>();
            foreach (var kv in _rooms)
            {
                kv.Value.Remove(Context.ConnectionId);
                if (kv.Value.Count == 0)
                    toRemove.Add(kv.Key);
            }
            foreach (var r in toRemove) _rooms.Remove(r);
        }
        await base.OnDisconnectedAsync(exception);
    }
}
