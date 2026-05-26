using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using nghenhaccungnghiep.Data;
using nghenhaccungnghiep.Models;
using System.Diagnostics;

namespace nghenhaccungnghiep.Controllers
{
    public class HomeController : Controller
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public HomeController(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        public async Task<IActionResult> Index(string? search)
        {
            var query = _context.Songs.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.ToLower();
                query = query.Where(s => s.Title.ToLower().Contains(term)
                    || s.Artist.ToLower().Contains(term));
            }

            var songs = await query.OrderByDescending(s => s.CreatedAt).ToListAsync();

            var userId = _userManager.GetUserId(User);
            var favoriteSongIds = userId != null
                ? await _context.Favorites.Where(f => f.UserId == userId).Select(f => f.SongId).ToListAsync()
                : new List<int>();

            var userPlaylists = userId != null
                ? await _context.Playlists.Where(p => p.UserId == userId).ToListAsync()
                : new List<Playlist>();

            ViewBag.FavoriteSongIds = favoriteSongIds;
            ViewBag.UserPlaylists = userPlaylists;
            ViewBag.SearchTerm = search;

            return View(songs);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ToggleLike(int songId)
        {
            var userId = _userManager.GetUserId(User);
            if (userId == null) return Unauthorized();

            var existing = await _context.Favorites
                .FirstOrDefaultAsync(f => f.UserId == userId && f.SongId == songId);

            if (existing != null)
            {
                _context.Favorites.Remove(existing);
            }
            else
            {
                _context.Favorites.Add(new Favorite
                {
                    UserId = userId,
                    SongId = songId,
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index), new { search = Request.Query["search"] });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> AddToPlaylist(int songId, int playlistId)
        {
            var userId = _userManager.GetUserId(User);
            if (userId == null) return Unauthorized();

            var playlist = await _context.Playlists.FindAsync(playlistId);
            if (playlist == null || playlist.UserId != userId) return NotFound();

            var exists = await _context.PlaylistSongs
                .AnyAsync(ps => ps.PlaylistId == playlistId && ps.SongId == songId);

            if (!exists)
            {
                _context.PlaylistSongs.Add(new PlaylistSong
                {
                    PlaylistId = playlistId,
                    SongId = songId,
                    AddedAt = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();
            }

            return RedirectToAction(nameof(Index), new { search = Request.Query["search"] });
        }

        public async Task<IActionResult> Favorites()
        {
            var userId = _userManager.GetUserId(User);
            if (userId == null) return Challenge();

            var songs = await _context.Favorites
                .Where(f => f.UserId == userId)
                .OrderByDescending(f => f.CreatedAt)
                .Include(f => f.Song)
                .Select(f => f.Song)
                .ToListAsync();

            var favoriteSongIds = songs.Select(s => s.Id).ToList();
            var userPlaylists = await _context.Playlists.Where(p => p.UserId == userId).ToListAsync();

            ViewBag.FavoriteSongIds = favoriteSongIds;
            ViewBag.UserPlaylists = userPlaylists;

            return View(songs);
        }

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
