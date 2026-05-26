namespace nghenhaccungnghiep.Models;

public class ArtistFollow
{
    public int Id { get; set; }

    public string UserId { get; set; } = string.Empty;

    public int ArtistId { get; set; }
    public Artist Artist { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
