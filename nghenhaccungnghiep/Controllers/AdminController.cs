using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using nghenhaccungnghiep.Data;
using nghenhaccungnghiep.Models;

namespace nghenhaccungnghiep.Controllers
{
    [Authorize]
    public class AdminController : Controller
    {
        private readonly ApplicationDbContext _context;
        private readonly IWebHostEnvironment _env;

        public AdminController(ApplicationDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        public async Task<IActionResult> Index()
        {
            var songs = await _context.Songs.OrderByDescending(s => s.CreatedAt).ToListAsync();
            return View(songs);
        }

        public IActionResult Upload()
        {
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Upload(Song song, IFormFile? audioFile)
        {
            if (string.IsNullOrWhiteSpace(song.Title) || string.IsNullOrWhiteSpace(song.Artist))
            {
                ModelState.AddModelError("", "Title and Artist are required.");
                return View(song);
            }

            if (audioFile != null && audioFile.Length > 0)
            {
                var uploadsDir = Path.Combine(_env.WebRootPath, "audio");
                Directory.CreateDirectory(uploadsDir);

                var ext = Path.GetExtension(audioFile.FileName);
                var fileName = $"{Guid.NewGuid()}{ext}";
                var filePath = Path.Combine(uploadsDir, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await audioFile.CopyToAsync(stream);
                }

                song.FilePath = $"/audio/{fileName}";
            }

            song.CreatedAt = DateTime.UtcNow;
            _context.Songs.Add(song);
            await _context.SaveChangesAsync();

            return RedirectToAction(nameof(Index));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int id)
        {
            var song = await _context.Songs.FindAsync(id);
            if (song == null) return NotFound();

            if (!string.IsNullOrEmpty(song.FilePath))
            {
                var fullPath = Path.Combine(_env.WebRootPath, song.FilePath.TrimStart('/'));
                if (System.IO.File.Exists(fullPath))
                    System.IO.File.Delete(fullPath);
            }

            _context.Songs.Remove(song);
            await _context.SaveChangesAsync();

            return RedirectToAction(nameof(Index));
        }
    }
}
