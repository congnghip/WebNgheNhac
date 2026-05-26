using System.ComponentModel.DataAnnotations;

namespace nghenhaccungnghiep.Models;

public class RecentlyPlayed
{
    public int Id { get; set; }

    [Required]
    public string UserId { get; set; } = string.Empty;

    public int SongId { get; set; }
    public Song Song { get; set; } = null!;

    public DateTime PlayedAt { get; set; } = DateTime.UtcNow;
}
