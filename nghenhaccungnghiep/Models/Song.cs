using System.ComponentModel.DataAnnotations;

namespace nghenhaccungnghiep.Models
{
    public class Song
    {
        public int Id { get; set; }

        [Required]
        [StringLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [StringLength(200)]
        public string Artist { get; set; } = string.Empty;

        [StringLength(500)]
        public string? AudioUrl { get; set; }

        [StringLength(500)]
        public string? FilePath { get; set; }

        [StringLength(500)]
        public string? CoverUrl { get; set; }

        public int? DurationInSeconds { get; set; }

        public int PlayCount { get; set; } = 0;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public bool IsApproved { get; set; } = false;

        [StringLength(450)]
        public string? UploadedById { get; set; }

        public ICollection<PlaylistSong> PlaylistSongs { get; set; } = new List<PlaylistSong>();
        public ICollection<Favorite> Favorites { get; set; } = new List<Favorite>();
        public ICollection<SongArtist> SongArtists { get; set; } = new List<SongArtist>();
    }
}
