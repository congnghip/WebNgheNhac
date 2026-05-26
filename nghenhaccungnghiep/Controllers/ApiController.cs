using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using nghenhaccungnghiep.Data;
using nghenhaccungnghiep.Models;
using nghenhaccungnghiep.Services;

namespace nghenhaccungnghiep.Controllers;

[Route("api")]
[ApiController]
[IgnoreAntiforgeryToken]
public class ApiController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IWebHostEnvironment _env;

    public ApiController(ApplicationDbContext context, UserManager<ApplicationUser> userManager, IWebHostEnvironment env)
    {
        _context = context;
        _userManager = userManager;
        _env = env;
    }

    // ── Shared song projection ──

    private static System.Linq.Expressions.Expression<Func<Song, object>> SongDto() => s => new
    {
        s.Id,
        s.Title,
        s.Artist,
        artists = s.SongArtists.OrderBy(sa => sa.OrderIndex)
            .Select(sa => new { sa.Artist.Id, sa.Artist.Name, sa.Artist.ImageUrl, sa.IsFeatured }),
        s.FilePath,
        s.AudioUrl,
        s.CoverUrl,
        s.DurationInSeconds,
        s.CreatedAt,
        s.UploadedById,
        s.PlayCount
    };

    [HttpGet("songs")]
    public async Task<IActionResult> GetSongs([FromQuery] string? search, [FromQuery] int offset = 0, [FromQuery] int limit = 24)
    {
        limit = Math.Clamp(limit, 1, 100);
        offset = Math.Max(offset, 0);

        var query = _context.Songs.Where(s => s.IsApproved);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToLower();
            query = query.Where(s => s.Title.ToLower().Contains(term) || s.Artist.ToLower().Contains(term));
        }

        var total = await query.CountAsync();
        var songs = await query.OrderByDescending(s => s.CreatedAt)
            .Skip(offset)
            .Take(limit)
            .Select(s => new { s.Id, s.Title, s.Artist, artists = s.SongArtists.OrderBy(sa => sa.OrderIndex).Select(sa => new { sa.Artist.Id, sa.Artist.Name, sa.Artist.ImageUrl, sa.IsFeatured }), s.FilePath, s.AudioUrl, s.CoverUrl, s.DurationInSeconds, s.CreatedAt, s.UploadedById, s.PlayCount })
            .ToListAsync();

        return Ok(new { songs, hasMore = offset + limit < total, total });
    }

    [HttpGet("artists")]
    public async Task<IActionResult> GetArtists()
    {
        var artists = await _context.Artists
            .OrderBy(a => a.Name)
            .Select(a => new { a.Id, a.Name, a.ImageUrl, songCount = a.SongArtists.Count, followerCount = a.Followers.Count })
            .ToListAsync();
        return Ok(artists);
    }

    [Authorize]
    [HttpGet("artists/my-profile")]
    public async Task<IActionResult> GetMyArtistProfile()
    {
        var userId = _userManager.GetUserId(User);
        var artist = await _context.Artists
            .Where(a => a.UserId == userId)
            .Select(a => new { a.Id, a.Name, a.Bio, a.ImageUrl, a.CoverUrl, a.CreatedAt, songCount = a.SongArtists.Count, followerCount = a.Followers.Count })
            .FirstOrDefaultAsync();
        if (artist != null) return Ok(artist);

        // Fallback: try matching by username/email
        var userName = User.Identity?.Name;
        if (!string.IsNullOrEmpty(userName))
        {
            // Try exact match on artist name (case-insensitive)
            var matchedArtist = await _context.Artists
                .Where(a => a.Name.ToLower() == userName.ToLower() && a.UserId == null)
                .FirstOrDefaultAsync();
            if (matchedArtist != null)
            {
                matchedArtist.UserId = userId;
                matchedArtist.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return Ok(new { matchedArtist.Id, matchedArtist.Name, matchedArtist.Bio, matchedArtist.ImageUrl, matchedArtist.CoverUrl, matchedArtist.CreatedAt, songCount = matchedArtist.SongArtists.Count, followerCount = matchedArtist.Followers.Count });
            }
        }

        return NotFound(new { error = "No artist profile linked to your account." });
    }

    [HttpGet("artists/{id:int}")]
    public async Task<IActionResult> GetArtist(int id)
    {
        var artist = await _context.Artists
            .Where(a => a.Id == id)
            .Select(a => new { a.Id, a.Name, a.Bio, a.ImageUrl, a.CoverUrl, a.CreatedAt, songCount = a.SongArtists.Count, followerCount = a.Followers.Count })
            .FirstOrDefaultAsync();
        if (artist == null) return NotFound();
        return Ok(artist);
    }

    [HttpGet("artists/name/{name}/songs")]
    public async Task<IActionResult> GetArtistSongsByName(string name)
    {
        var term = name.ToLower();
        var songs = await _context.Songs
            .Where(s => s.IsApproved && s.SongArtists.Any(sa => sa.Artist.Name.ToLower() == term))
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new { s.Id, s.Title, s.Artist, artists = s.SongArtists.OrderBy(sa => sa.OrderIndex).Select(sa => new { sa.Artist.Id, sa.Artist.Name, sa.Artist.ImageUrl, sa.IsFeatured }), s.FilePath, s.AudioUrl, s.CoverUrl, s.DurationInSeconds, s.CreatedAt, s.UploadedById, s.PlayCount })
            .ToListAsync();
        return Ok(songs);
    }

    [HttpGet("artists/{id:int}/songs")]
    public async Task<IActionResult> GetArtistSongs(int id)
    {
        var songs = await _context.Songs
            .Where(s => s.IsApproved && s.SongArtists.Any(sa => sa.ArtistId == id))
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new { s.Id, s.Title, s.Artist, artists = s.SongArtists.OrderBy(sa => sa.OrderIndex).Select(sa => new { sa.Artist.Id, sa.Artist.Name, sa.Artist.ImageUrl, sa.IsFeatured }), s.FilePath, s.AudioUrl, s.CoverUrl, s.DurationInSeconds, s.CreatedAt, s.UploadedById, s.PlayCount })
            .ToListAsync();
        return Ok(songs);
    }

    [Authorize]
    [HttpPut("artists/{id:int}")]
    public async Task<IActionResult> UpdateArtist(int id, [FromForm] string? bio, [FromForm] IFormFile? imageFile, [FromForm] IFormFile? coverFile)
    {
        var userId = _userManager.GetUserId(User);
        var artist = await _context.Artists.FindAsync(id);
        if (artist == null) return NotFound();

        var isAdmin = User.IsInRole("Admin");
        if (!isAdmin && artist.UserId != userId)
            return Forbid();

        if (bio != null)
            artist.Bio = bio.Trim();

        if (imageFile is { Length: > 0 })
        {
            var ext = Path.GetExtension(imageFile.FileName);
            if (string.IsNullOrEmpty(ext)) ext = ".jpg";
            var fileName = $"artist_{id}_avatar{ext}";
            var fullPath = Path.Combine(_env.WebRootPath, "uploads", fileName);
            Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
            await using var stream = new FileStream(fullPath, FileMode.Create);
            await imageFile.CopyToAsync(stream);
            artist.ImageUrl = $"/uploads/{fileName}";
        }

        if (coverFile is { Length: > 0 })
        {
            var ext = Path.GetExtension(coverFile.FileName);
            if (string.IsNullOrEmpty(ext)) ext = ".jpg";
            var fileName = $"artist_{id}_cover{ext}";
            var fullPath = Path.Combine(_env.WebRootPath, "uploads", fileName);
            Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
            await using var stream = new FileStream(fullPath, FileMode.Create);
            await coverFile.CopyToAsync(stream);
            artist.CoverUrl = $"/uploads/{fileName}";
        }

        artist.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { artist.Id, artist.Name, artist.Bio, artist.ImageUrl, artist.CoverUrl });
    }

    [Authorize]
    [HttpPost("artists/{id:int}/follow")]
    public async Task<IActionResult> ToggleFollowArtist(int id)
    {
        var userId = _userManager.GetUserId(User);
        if (userId == null) return Unauthorized();

        var artist = await _context.Artists.FindAsync(id);
        if (artist == null) return NotFound();

        var existing = await _context.ArtistFollows
            .FirstOrDefaultAsync(af => af.UserId == userId && af.ArtistId == id);

        bool isFollowing;
        if (existing != null)
        {
            _context.ArtistFollows.Remove(existing);
            isFollowing = false;
        }
        else
        {
            _context.ArtistFollows.Add(new ArtistFollow
            {
                UserId = userId,
                ArtistId = id,
                CreatedAt = DateTime.UtcNow
            });
            isFollowing = true;
        }

        await _context.SaveChangesAsync();
        return Ok(new { isFollowing, followerCount = await _context.ArtistFollows.CountAsync(af => af.ArtistId == id) });
    }

    [HttpGet("songs/top")]
    public async Task<IActionResult> GetTopSongs([FromQuery] int limit = 10)
    {
        limit = Math.Clamp(limit, 1, 50);
        var songs = await _context.Songs
            .Where(s => s.IsApproved)
            .OrderByDescending(s => s.PlayCount)
            .ThenByDescending(s => s.CreatedAt)
            .Take(limit)
            .Select(s => new { s.Id, s.Title, s.Artist, artists = s.SongArtists.OrderBy(sa => sa.OrderIndex).Select(sa => new { sa.Artist.Id, sa.Artist.Name, sa.Artist.ImageUrl, sa.IsFeatured }), s.FilePath, s.AudioUrl, s.CoverUrl, s.DurationInSeconds, s.CreatedAt, s.UploadedById, s.PlayCount })
            .ToListAsync();
        return Ok(songs);
    }

    [HttpGet("songs/{id}")]
    public async Task<IActionResult> GetSong(int id)
    {
        var song = await _context.Songs.FirstOrDefaultAsync(s => s.Id == id && s.IsApproved);
        if (song == null) return NotFound();
        return Ok(new { song.Id, song.Title, song.Artist, song.FilePath, song.AudioUrl, song.CoverUrl, song.DurationInSeconds, song.CreatedAt, song.UploadedById, song.PlayCount });
    }

    [Authorize]
    [HttpPut("songs/{id}")]
    public async Task<IActionResult> UpdateSong(int id, [FromBody] UpdateSongRequest request)
    {
        var song = await _context.Songs.FindAsync(id);
        if (song == null) return NotFound();
        var userId = _userManager.GetUserId(User);
        var isAdmin = User.IsInRole("Admin");
        if (song.UploadedById != userId && !isAdmin)
            return Forbid();
        if (!string.IsNullOrWhiteSpace(request.Title))
            song.Title = request.Title.Trim();
        if (!string.IsNullOrWhiteSpace(request.Artist))
            song.Artist = request.Artist.Trim();
        await _context.SaveChangesAsync();
        await SyncSongArtistsAsync(song, userId);
        return Ok(new { song.Id, song.Title, song.Artist, song.FilePath, song.AudioUrl, song.CoverUrl, song.DurationInSeconds, song.CreatedAt });
    }

    [Authorize]
    [HttpPost("songs/{id}/report-duration")]
    public async Task<IActionResult> ReportDuration(int id, [FromBody] ReportDurationRequest request)
    {
        var song = await _context.Songs.FindAsync(id);
        if (song == null) return NotFound();
        if (song.DurationInSeconds == null || song.DurationInSeconds != request.DurationInSeconds)
        {
            song.DurationInSeconds = request.DurationInSeconds;
            await _context.SaveChangesAsync();
        }
        return Ok();
    }

    [HttpPost("songs/{id}/play")]
    public async Task<IActionResult> IncrementPlayCount(int id)
    {
        var song = await _context.Songs.FindAsync(id);
        if (song == null) return NotFound();
        song.PlayCount++;
        await _context.SaveChangesAsync();
        return Ok(new { song.PlayCount });
    }

    [Authorize]
    [HttpPost("recently-played")]
    public async Task<IActionResult> LogRecentlyPlayed([FromBody] RecentlyPlayedRequest request)
    {
        var userId = _userManager.GetUserId(User);
        if (userId == null) return Unauthorized();

        _context.RecentlyPlayed.Add(new RecentlyPlayed
        {
            UserId = userId,
            SongId = request.SongId,
            PlayedAt = DateTime.UtcNow
        });

        var cutoff = DateTime.UtcNow.AddDays(-30);
        var old = await _context.RecentlyPlayed
            .Where(r => r.UserId == userId && r.PlayedAt < cutoff)
            .ToListAsync();
        if (old.Count > 0)
            _context.RecentlyPlayed.RemoveRange(old);

        await _context.SaveChangesAsync();
        return Ok();
    }

    [Authorize]
    [HttpGet("recently-played")]
    public async Task<IActionResult> GetRecentlyPlayed()
    {
        var userId = _userManager.GetUserId(User);
        if (userId == null) return Unauthorized();

        var songs = await _context.RecentlyPlayed
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.PlayedAt)
            .Take(20)
            .Select(r => new {
                r.Song.Id, r.Song.Title, r.Song.Artist,
                artists = r.Song.SongArtists.OrderBy(sa => sa.OrderIndex).Select(sa => new { sa.Artist.Id, sa.Artist.Name, sa.Artist.ImageUrl, sa.IsFeatured }),
                r.Song.FilePath, r.Song.AudioUrl,
                r.Song.CoverUrl, r.Song.DurationInSeconds,
                r.PlayedAt
            })
            .ToListAsync();
        return Ok(songs);
    }

    [Authorize]
    [HttpGet("playlists")]
    public async Task<IActionResult> GetPlaylists()
    {
        var userId = _userManager.GetUserId(User);
        var playlists = await _context.Playlists
            .Where(p => p.UserId == userId)
            .Select(p => new { p.Id, p.Name, p.IsPublic, p.CreatedAt, SongCount = p.PlaylistSongs.Count })
            .ToListAsync();
        return Ok(playlists);
    }

    [Authorize]
    [HttpGet("playlists/{id}")]
    public async Task<IActionResult> GetPlaylist(int id)
    {
        var playlist = await _context.Playlists
            .Include(p => p.PlaylistSongs).ThenInclude(ps => ps.Song)
            .FirstOrDefaultAsync(p => p.Id == id);
        if (playlist == null) return NotFound();
        var userId = _userManager.GetUserId(User);
        if (playlist.UserId != userId && !playlist.IsPublic && !User.IsInRole("Admin"))
            return NotFound();
        return Ok(new
        {
            playlist.Id,
            playlist.Name,
            playlist.IsPublic,
            playlist.CreatedAt,
            ownPlaylist = playlist.UserId == userId,
            Songs = playlist.PlaylistSongs.OrderBy(ps => ps.AddedAt)
                .Select(ps => new { ps.Song.Id, ps.Song.Title, ps.Song.Artist, artists = ps.Song.SongArtists.OrderBy(sa => sa.OrderIndex).Select(sa => new { sa.Artist.Id, sa.Artist.Name, sa.Artist.ImageUrl, sa.IsFeatured }), ps.Song.FilePath, ps.Song.AudioUrl, ps.Song.CoverUrl, ps.Song.DurationInSeconds })
        });
    }

    [Authorize]
    [HttpPut("playlists/{id}")]
    public async Task<IActionResult> UpdatePlaylist(int id, [FromBody] UpdatePlaylistRequest request)
    {
        var userId = _userManager.GetUserId(User);
        var playlist = await _context.Playlists.FindAsync(id);
        if (playlist == null || playlist.UserId != userId) return NotFound();
        if (!string.IsNullOrWhiteSpace(request.Name))
            playlist.Name = request.Name.Trim();
        if (request.IsPublic.HasValue)
            playlist.IsPublic = request.IsPublic.Value;
        await _context.SaveChangesAsync();
        return Ok(new { playlist.Id, playlist.Name, playlist.IsPublic });
    }

    [Authorize]
    [HttpPost("playlists")]
    public async Task<IActionResult> CreatePlaylist([FromBody] CreatePlaylistRequest request)
    {
        var userId = _userManager.GetUserId(User);
        var playlist = new Playlist { Name = request.Name, UserId = userId, CreatedAt = DateTime.UtcNow };
        _context.Playlists.Add(playlist);
        await _context.SaveChangesAsync();
        return Ok(new { playlist.Id, playlist.Name });
    }

    [Authorize]
    [HttpPost("playlists/{playlistId}/songs")]
    public async Task<IActionResult> AddSongToPlaylist(int playlistId, [FromBody] AddSongRequest request)
    {
        var userId = _userManager.GetUserId(User);
        var playlist = await _context.Playlists.FindAsync(playlistId);
        if (playlist == null || playlist.UserId != userId) return NotFound();
        var exists = await _context.PlaylistSongs.AnyAsync(ps => ps.PlaylistId == playlistId && ps.SongId == request.SongId);
        if (!exists)
        {
            _context.PlaylistSongs.Add(new PlaylistSong { PlaylistId = playlistId, SongId = request.SongId, AddedAt = DateTime.UtcNow });
            await _context.SaveChangesAsync();
        }
        return Ok();
    }

    [Authorize]
    [HttpDelete("playlists/{playlistId}/songs/{songId}")]
    public async Task<IActionResult> RemoveSongFromPlaylist(int playlistId, int songId)
    {
        var userId = _userManager.GetUserId(User);
        var playlist = await _context.Playlists.FindAsync(playlistId);
        if (playlist == null || playlist.UserId != userId) return NotFound();
        var ps = await _context.PlaylistSongs.FindAsync(playlistId, songId);
        if (ps != null) { _context.PlaylistSongs.Remove(ps); await _context.SaveChangesAsync(); }
        return Ok();
    }

    [Authorize]
    [HttpPut("playlists/{playlistId}/songs/reorder")]
    public async Task<IActionResult> ReorderPlaylistSongs(int playlistId, [FromBody] ReorderSongsRequest request)
    {
        var userId = _userManager.GetUserId(User);
        var playlist = await _context.Playlists.FindAsync(playlistId);
        if (playlist == null || playlist.UserId != userId) return NotFound();

        if (request.SongIds == null || request.SongIds.Count == 0)
            return BadRequest(new { error = "SongIds required." });

        var now = DateTime.UtcNow;
        for (int i = 0; i < request.SongIds.Count; i++)
        {
            var ps = await _context.PlaylistSongs.FindAsync(playlistId, request.SongIds[i]);
            if (ps != null)
                ps.AddedAt = now.AddTicks(i);
        }
        await _context.SaveChangesAsync();
        return Ok();
    }

    [Authorize]
    [HttpDelete("playlists/{id}")]
    public async Task<IActionResult> DeletePlaylist(int id)
    {
        var userId = _userManager.GetUserId(User);
        var playlist = await _context.Playlists.FindAsync(id);
        if (playlist == null || playlist.UserId != userId) return NotFound();
        _context.Playlists.Remove(playlist);
        await _context.SaveChangesAsync();
        return Ok();
    }

    [Authorize]
    [HttpGet("favorites")]
    public async Task<IActionResult> GetFavorites()
    {
        var userId = _userManager.GetUserId(User);
        var songs = await _context.Favorites
            .Where(f => f.UserId == userId).OrderByDescending(f => f.CreatedAt)
            .Include(f => f.Song).Select(f => f.Song)
            .Where(s => s.IsApproved)
            .Select(s => new { s.Id, s.Title, s.Artist, artists = s.SongArtists.OrderBy(sa => sa.OrderIndex).Select(sa => new { sa.Artist.Id, sa.Artist.Name, sa.Artist.ImageUrl, sa.IsFeatured }), s.FilePath, s.AudioUrl, s.CoverUrl, s.DurationInSeconds, s.CreatedAt })
            .ToListAsync();
        return Ok(songs);
    }

    [Authorize]
    [HttpPost("favorites/toggle")]
    public async Task<IActionResult> ToggleFavorite([FromBody] ToggleFavoriteRequest request)
    {
        var userId = _userManager.GetUserId(User);
        var existing = await _context.Favorites.FirstOrDefaultAsync(f => f.UserId == userId && f.SongId == request.SongId);
        bool isLiked;
        if (existing != null) { _context.Favorites.Remove(existing); isLiked = false; }
        else { _context.Favorites.Add(new Favorite { UserId = userId, SongId = request.SongId, CreatedAt = DateTime.UtcNow }); isLiked = true; }
        await _context.SaveChangesAsync();
        return Ok(new { isLiked });
    }

    [Authorize]
    [HttpGet("current-user")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null) return Unauthorized();
        var roles = await _userManager.GetRolesAsync(user);
        var claims = User.Claims.Select(c => new { c.Type, c.Value }).ToList();
        var appUser = user as ApplicationUser;
        return Ok(new { user.Id, user.UserName, user.Email, displayName = appUser?.DisplayName, avatarUrl = appUser?.AvatarUrl, roles, claims });
    }

    // ── User profile ──

    [Authorize]
    [HttpPut("user/profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var user = await _userManager.GetUserAsync(User) as ApplicationUser;
        if (user == null) return Unauthorized();
        if (!string.IsNullOrWhiteSpace(request.DisplayName))
            user.DisplayName = request.DisplayName.Trim();
        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
            return BadRequest(new { error = string.Join(", ", result.Errors.Select(e => e.Description)) });
        return Ok(new { user.Id, user.DisplayName, user.AvatarUrl, user.UserName, user.Email });
    }

    [Authorize]
    [HttpPost("user/change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null) return Unauthorized();
        var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
            return BadRequest(new { error = string.Join(", ", result.Errors.Select(e => e.Description)) });
        return Ok();
    }

    // ── Artist application ──

    [Authorize]
    [HttpPost("artist/apply")]
    public async Task<IActionResult> ApplyArtist([FromBody] ArtistApplyRequest request)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null) return Unauthorized();

        var existing = await _context.ArtistApplications.AnyAsync(a => a.UserId == user.Id && a.Status == "Pending");
        if (existing) return BadRequest(new { error = "You already have a pending application." });

        _context.ArtistApplications.Add(new ArtistApplication
        {
            UserId = user.Id,
            Reason = request.Reason,
            Status = "Pending",
            CreatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();
        return Ok(new { message = "Application submitted." });
    }

    [Authorize]
    [HttpGet("artist/application-status")]
    public async Task<IActionResult> GetArtistApplicationStatus()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null) return Unauthorized();

        var isArtist = await _userManager.IsInRoleAsync(user, "Artist");
        if (isArtist) return Ok(new { status = "Approved", role = "Artist" });

        var app = await _context.ArtistApplications
            .Where(a => a.UserId == user.Id)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new { status = a.Status, createdAt = (DateTime?)a.CreatedAt, reason = a.Reason })
            .FirstOrDefaultAsync();

        if (app == null) return Ok(new { status = "None", createdAt = (DateTime?)null, reason = (string?)null });
        return Ok(app);
    }

    // ── Artist upload ──

    [Authorize(Roles = "Admin,Artist")]
    [HttpPost("artist/upload")]
    [RequestSizeLimit(104_857_600)]
    public async Task<IActionResult> ArtistUploadSong([FromForm] string title, [FromForm] string artist, [FromForm] IFormFile? audioFile, [FromForm] IFormFile? coverFile)
    {
        if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(artist))
            return BadRequest(new { error = "Title and Artist are required." });

        var user = await _userManager.GetUserAsync(User);
        if (user == null) return Unauthorized();

        string? filePath = null;
        if (audioFile is { Length: > 0 })
        {
            var uploadsDir = Path.Combine(_env.WebRootPath, "audio");
            Directory.CreateDirectory(uploadsDir);
            var ext = Path.GetExtension(audioFile.FileName);
            var fileName = $"{Guid.NewGuid()}{ext}";
            var fullPath = Path.Combine(uploadsDir, fileName);
            await using var stream = new FileStream(fullPath, FileMode.Create);
            await audioFile.CopyToAsync(stream);
            filePath = $"/audio/{fileName}";
        }

        string? coverUrl = await SaveCoverFile(coverFile);

        var roles = await _userManager.GetRolesAsync(user);
        bool autoApprove = roles.Contains("Admin");
        var song = new Song
        {
            Title = title,
            Artist = artist,
            FilePath = filePath,
            CoverUrl = coverUrl,
            CreatedAt = DateTime.UtcNow,
            IsApproved = autoApprove,
            UploadedById = user.Id
        };
        _context.Songs.Add(song);
        await _context.SaveChangesAsync();
        await SyncSongArtistsAsync(song, user.Id);
        return Ok(new { song.Id, song.Title, song.Artist, song.FilePath, song.CoverUrl, song.IsApproved });
    }

    [Authorize(Roles = "Admin,Artist")]
    [HttpGet("artist/my-songs")]
    public async Task<IActionResult> GetMySongs()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null) return Unauthorized();

        var songs = await _context.Songs
            .Where(s => s.UploadedById == user.Id)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new { s.Id, s.Title, s.Artist, artists = s.SongArtists.OrderBy(sa => sa.OrderIndex).Select(sa => new { sa.Artist.Id, sa.Artist.Name, sa.Artist.ImageUrl, sa.IsFeatured }), s.FilePath, s.AudioUrl, s.CoverUrl, s.DurationInSeconds, s.CreatedAt, s.IsApproved })
            .ToListAsync();
        return Ok(songs);
    }

    // ── Admin endpoints ──

    [Authorize(Roles = "Admin")]
    [HttpGet("admin/pending-artists")]
    public async Task<IActionResult> GetPendingArtists()
    {
        var apps = await _context.ArtistApplications
            .Where(a => a.Status == "Pending")
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new { a.Id, a.UserId, a.Reason, a.CreatedAt })
            .ToListAsync();

        var result = new List<object>();
        foreach (var app in apps)
        {
            var u = await _userManager.FindByIdAsync(app.UserId);
            result.Add(new { app.Id, app.UserId, Email = u?.Email ?? "unknown", app.Reason, app.CreatedAt });
        }
        return Ok(result);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("admin/pending-artists/{id}/approve")]
    public async Task<IActionResult> ApproveArtist(int id)
    {
        var app = await _context.ArtistApplications.FindAsync(id);
        if (app == null || app.Status != "Pending") return NotFound();

        var user = await _userManager.FindByIdAsync(app.UserId);
        if (user == null) return NotFound();

        await _userManager.AddToRoleAsync(user, "Artist");
        app.Status = "Approved";
        app.ReviewedAt = DateTime.UtcNow;
        app.ReviewedById = _userManager.GetUserId(User);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Artist approved." });
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("admin/pending-artists/{id}/reject")]
    public async Task<IActionResult> RejectArtist(int id)
    {
        var app = await _context.ArtistApplications.FindAsync(id);
        if (app == null || app.Status != "Pending") return NotFound();

        app.Status = "Rejected";
        app.ReviewedAt = DateTime.UtcNow;
        app.ReviewedById = _userManager.GetUserId(User);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Artist rejected." });
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("admin/pending-songs")]
    public async Task<IActionResult> GetPendingSongs()
    {
        var songs = await _context.Songs
            .Where(s => !s.IsApproved)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new { s.Id, s.Title, s.Artist, artists = s.SongArtists.OrderBy(sa => sa.OrderIndex).Select(sa => new { sa.Artist.Id, sa.Artist.Name, sa.Artist.ImageUrl, sa.IsFeatured }), s.FilePath, s.CoverUrl, s.CreatedAt, s.UploadedById })
            .ToListAsync();

        var result = new List<object>();
        foreach (var song in songs)
        {
            var u = song.UploadedById != null ? await _userManager.FindByIdAsync(song.UploadedById) : null;
            result.Add(new { song.Id, song.Title, song.Artist, song.FilePath, song.CoverUrl, song.CreatedAt, UploadedBy = u?.Email ?? "unknown" });
        }
        return Ok(result);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("admin/pending-songs/{id}/approve")]
    public async Task<IActionResult> ApproveSong(int id)
    {
        var song = await _context.Songs.FindAsync(id);
        if (song == null) return NotFound();

        song.IsApproved = true;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Song approved." });
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("admin/pending-songs/{id}/reject")]
    public async Task<IActionResult> RejectSong(int id)
    {
        var song = await _context.Songs.FindAsync(id);
        if (song == null) return NotFound();

        if (!string.IsNullOrEmpty(song.FilePath))
        {
            var fullPath = Path.Combine(_env.WebRootPath, song.FilePath.TrimStart('/'));
            if (System.IO.File.Exists(fullPath)) System.IO.File.Delete(fullPath);
        }
        _context.Songs.Remove(song);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Song rejected and deleted." });
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("admin/upload")]
    [RequestSizeLimit(104_857_600)]
    public async Task<IActionResult> UploadSong([FromForm] string title, [FromForm] string artist, [FromForm] IFormFile? audioFile, [FromForm] IFormFile? coverFile)
    {
        if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(artist))
            return BadRequest(new { error = "Title and Artist are required." });
        string? filePath = null;
        if (audioFile is { Length: > 0 })
        {
            var uploadsDir = Path.Combine(_env.WebRootPath, "audio");
            Directory.CreateDirectory(uploadsDir);
            var ext = Path.GetExtension(audioFile.FileName);
            var fileName = $"{Guid.NewGuid()}{ext}";
            var fullPath = Path.Combine(uploadsDir, fileName);
            await using var stream = new FileStream(fullPath, FileMode.Create);
            await audioFile.CopyToAsync(stream);
            filePath = $"/audio/{fileName}";
        }

        string? coverUrl = await SaveCoverFile(coverFile);

        var userId = _userManager.GetUserId(User);
        var song = new Song { Title = title, Artist = artist, FilePath = filePath, CoverUrl = coverUrl, CreatedAt = DateTime.UtcNow, IsApproved = true };
        _context.Songs.Add(song);
        await _context.SaveChangesAsync();
        await SyncSongArtistsAsync(song, userId);
        return Ok(new { song.Id, song.Title, song.Artist, song.FilePath, song.CoverUrl });
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("admin/songs/{id}")]
    public async Task<IActionResult> DeleteSong(int id)
    {
        var song = await _context.Songs.FindAsync(id);
        if (song == null) return NotFound();
        if (!string.IsNullOrEmpty(song.FilePath))
        {
            var fullPath = Path.Combine(_env.WebRootPath, song.FilePath.TrimStart('/'));
            if (System.IO.File.Exists(fullPath)) System.IO.File.Delete(fullPath);
        }
        if (!string.IsNullOrEmpty(song.CoverUrl))
        {
            var fullPath = Path.Combine(_env.WebRootPath, song.CoverUrl.TrimStart('/'));
            if (System.IO.File.Exists(fullPath)) System.IO.File.Delete(fullPath);
        }
        _context.Songs.Remove(song);
        await _context.SaveChangesAsync();
        return Ok();
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("admin/fix-accounts")]
    public async Task<IActionResult> FixAccounts()
    {
        var songs = await _context.Songs.ToListAsync();
        var allUsers = await _userManager.Users.ToListAsync();
        int created = 0, fixedSongs = 0, deleted = 0;

        // Normalize to FormC so NFC/NFD forms match
        string N(string s) => s.Normalize(System.Text.NormalizationForm.FormC);

        string ToEmail(string name)
        {
            var slug = N(name).ToLowerInvariant().Trim();
            slug = slug.Normalize(System.Text.NormalizationForm.FormKD);
            slug = System.Text.RegularExpressions.Regex.Replace(slug, @"\p{M}", ""); // remove diacritics
            slug = System.Text.RegularExpressions.Regex.Replace(slug, @"[^a-z0-9]+", ""); // keep only ascii alnum
            return $"{slug}@record.com";
        }

        // Step 1: extract individual artists from every song
        var individualSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var songArtists = new Dictionary<int, string[]>();

        foreach (var s in songs)
        {
            var names = ArtistParser.SplitArtists(s.Artist);
            songArtists[s.Id] = names;
            foreach (var n in names) individualSet.Add(n);
        }

        // Step 2: ensure every individual artist has an account
        var emailToUser = new Dictionary<string, ApplicationUser>(StringComparer.OrdinalIgnoreCase);

        // Build a lookup of existing users by email (normalized)
        var emailToExisting = new Dictionary<string, ApplicationUser>(StringComparer.OrdinalIgnoreCase);
        foreach (var u in allUsers)
            if (u.Email != null)
                emailToExisting[u.Email] = u;

        foreach (var name in individualSet)
        {
            var email = ToEmail(name);
            var user = emailToExisting.TryGetValue(email, out var found) ? found : null;

            if (user == null)
            {
                user = new ApplicationUser { UserName = email, Email = email, EmailConfirmed = true, DisplayName = name };
                var r = await _userManager.CreateAsync(user, "Artist@123");
                if (!r.Succeeded) { Console.WriteLine($"FIX: failed to create {email}: {string.Join(", ", r.Errors.Select(e => e.Description))}"); continue; }
                await _userManager.AddToRoleAsync(user, "Artist");
                allUsers.Add(user);
                emailToExisting[email] = user;
                created++;
                Console.WriteLine($"FIX: created account {email} for '{name}'");
            }
            else
            {
                if (string.IsNullOrEmpty(user.DisplayName))
                {
                    user.DisplayName = name;
                    await _userManager.UpdateAsync(user);
                }
                Console.WriteLine($"FIX: found existing account {email} for '{name}' (id={user.Id})");
            }
            emailToUser[email] = user;
        }

        // Step 3: reassign each song to its first artist
        foreach (var s in songs)
        {
            if (!songArtists.TryGetValue(s.Id, out var names) || names.Length == 0) continue;
            var firstEmail = ToEmail(names[0]);
            if (emailToUser.TryGetValue(firstEmail, out var user) && s.UploadedById != user.Id)
            {
                var oldUploader = allUsers.FirstOrDefault(u => u.Id == s.UploadedById)?.Email ?? "null";
                Console.WriteLine($"FIX: song #{s.Id} '{s.Title}': reassigning from {oldUploader} to {user.Email}");
                s.UploadedById = user.Id;
                fixedSongs++;
            }
        }

        await _context.SaveChangesAsync();

        // Step 4: delete composite accounts (not individually named, not seeded)
        var validEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "admin@record.com",
            "user@record.com"
        };
        foreach (var name in individualSet)
            validEmails.Add(ToEmail(name));

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var toDelete = new List<ApplicationUser>();
        foreach (var u in allUsers)
        {
            if (u.Email == null || seen.Contains(u.Email)) continue;
            seen.Add(u.Email);
            if (!validEmails.Contains(u.Email))
            {
                bool stillUsed = songs.Any(s => s.UploadedById == u.Id);
                if (!stillUsed)
                {
                    Console.WriteLine($"FIX: deleting composite account {u.Email}");
                    toDelete.Add(u);
                }
                else
                {
                    Console.WriteLine($"FIX: SKIPPING composite account {u.Email} (still has {songs.Count(s => s.UploadedById == u.Id)} songs)");
                }
            }
        }

        foreach (var u in toDelete)
        {
            await _userManager.DeleteAsync(u);
            deleted++;
        }

        return Ok(new { created, fixedSongs, deleted, message = "Done. Reload to see fixed accounts." });
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("admin/users")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _userManager.Users
            .OrderBy(u => u.Email)
            .ToListAsync();

        var result = new List<object>();
        foreach (var u in users)
        {
            var roles = await _userManager.GetRolesAsync(u);
            result.Add(new { u.Id, u.Email, u.UserName, roles, u.DisplayName });
        }
        return Ok(result);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("admin/users/{id}/reset-password")]
    public async Task<IActionResult> ResetUserPassword(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var result = await _userManager.ResetPasswordAsync(user, token, "123456");
        if (!result.Succeeded)
            return BadRequest(new { error = string.Join(", ", result.Errors.Select(e => e.Description)) });

        return Ok(new { message = "Password reset to 123456" });
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("admin/all-songs")]
    public async Task<IActionResult> GetAllSongs()
    {
        var songs = await _context.Songs
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new { s.Id, s.Title, s.Artist, s.FilePath, s.AudioUrl, s.CoverUrl, s.DurationInSeconds, s.CreatedAt, s.IsApproved, s.UploadedById })
            .ToListAsync();
        return Ok(songs);
    }

    private async Task<string?> SaveCoverFile(IFormFile? coverFile)
    {
        if (coverFile is not { Length: > 0 }) return null;
        var coversDir = Path.Combine(_env.WebRootPath, "covers");
        Directory.CreateDirectory(coversDir);
        var ext = Path.GetExtension(coverFile.FileName);
        if (string.IsNullOrEmpty(ext)) ext = ".jpg";
        var fileName = $"{Guid.NewGuid()}{ext}";
        var fullPath = Path.Combine(coversDir, fileName);
        await using var stream = new FileStream(fullPath, FileMode.Create);
        await coverFile.CopyToAsync(stream);
        return $"/covers/{fileName}";
    }

    private async Task SyncSongArtistsAsync(Song song, string? userId = null)
    {
        var names = ArtistParser.SplitArtists(song.Artist);
        if (names.Length == 0) return;

        // Remove existing links
        var existing = await _context.SongArtists.Where(sa => sa.SongId == song.Id).ToListAsync();
        _context.SongArtists.RemoveRange(existing);

        // Ensure all artists exist
        foreach (var name in names)
        {
            var artist = await _context.Artists.FirstOrDefaultAsync(a => a.Name == name);
            if (artist == null)
            {
                artist = new Artist { Name = name, UserId = userId, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
                _context.Artists.Add(artist);
                await _context.SaveChangesAsync();
            }
            else if (userId != null && artist.UserId == null)
            {
                artist.UserId = userId;
                artist.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }

        // Create links
        for (int i = 0; i < names.Length; i++)
        {
            var artist = await _context.Artists.FirstAsync(a => a.Name == names[i]);
            _context.SongArtists.Add(new SongArtist
            {
                SongId = song.Id,
                ArtistId = artist.Id,
                IsFeatured = i > 0,
                OrderIndex = i
            });
        }
    }
}

public record CreatePlaylistRequest(string Name);
public record UpdatePlaylistRequest(string? Name, bool? IsPublic);
public record AddSongRequest(int SongId);
public record ToggleFavoriteRequest(int SongId);
public record ArtistApplyRequest(string? Reason);
public record ReportDurationRequest(int DurationInSeconds);
public record RecentlyPlayedRequest(int SongId);
public record ReorderSongsRequest(List<int> SongIds);
public record UpdateProfileRequest(string? DisplayName);
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
public record UpdateSongRequest(string? Title, string? Artist);
