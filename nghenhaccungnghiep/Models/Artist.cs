using System.ComponentModel.DataAnnotations;

namespace nghenhaccungnghiep.Models;

public class Artist
{
    public int Id { get; set; }

    [Required]
    [StringLength(200)]
    public string Name { get; set; } = string.Empty;

    public string? Bio { get; set; }

    [StringLength(500)]
    public string? ImageUrl { get; set; }

    [StringLength(500)]
    public string? CoverUrl { get; set; }

    public string? UserId { get; set; }

    public ApplicationUser? User { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<SongArtist> SongArtists { get; set; } = new List<SongArtist>();

    public ICollection<ArtistFollow> Followers { get; set; } = new List<ArtistFollow>();
}
