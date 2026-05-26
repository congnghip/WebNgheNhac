using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using nghenhaccungnghiep.Data;
using nghenhaccungnghiep.Models;

namespace nghenhaccungnghiep.Controllers
{
    [Authorize]
    public class PlaylistController : Controller
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public PlaylistController(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        public async Task<IActionResult> Index()
        {
            var userId = _userManager.GetUserId(User);
            var playlists = await _context.Playlists
                .Where(p => p.UserId == userId)
                .OrderByDescending(p => p.CreatedAt)
                .Include(p => p.PlaylistSongs)
                .ToListAsync();

            return View(playlists);
        }

        public IActionResult Create()
        {
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                ModelState.AddModelError("", "Playlist name is required.");
                return View();
            }

            var userId = _userManager.GetUserId(User) ?? string.Empty;
            _context.Playlists.Add(new Playlist
            {
                Name = name,
                UserId = userId,
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            return RedirectToAction(nameof(Index));
        }

        public async Task<IActionResult> Details(int id)
        {
            var userId = _userManager.GetUserId(User);
            var playlist = await _context.Playlists
                .Where(p => p.Id == id && p.UserId == userId)
                .Include(p => p.PlaylistSongs)
                    .ThenInclude(ps => ps.Song)
                .FirstOrDefaultAsync();

            if (playlist == null) return NotFound();

            var favoriteSongIds = await _context.Favorites
                .Where(f => f.UserId == userId)
                .Select(f => f.SongId)
                .ToListAsync();

            ViewBag.FavoriteSongIds = favoriteSongIds;
            ViewBag.UserPlaylists = await _context.Playlists
                .Where(p => p.UserId == userId && p.Id != id)
                .ToListAsync();

            return View(playlist);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> RemoveSong(int playlistId, int songId)
        {
            var userId = _userManager.GetUserId(User);
            var playlist = await _context.Playlists
                .FirstOrDefaultAsync(p => p.Id == playlistId && p.UserId == userId);

            if (playlist == null) return NotFound();

            var ps = await _context.PlaylistSongs
                .FirstOrDefaultAsync(p => p.PlaylistId == playlistId && p.SongId == songId);

            if (ps != null)
            {
                _context.PlaylistSongs.Remove(ps);
                await _context.SaveChangesAsync();
            }

            return RedirectToAction(nameof(Details), new { id = playlistId });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int id)
        {
            var userId = _userManager.GetUserId(User);
            var playlist = await _context.Playlists
                .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);

            if (playlist == null) return NotFound();

            _context.Playlists.Remove(playlist);
            await _context.SaveChangesAsync();

            return RedirectToAction(nameof(Index));
        }
    }
}
