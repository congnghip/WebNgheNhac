namespace nghenhaccungnghiep.Models;

public class SongArtist
{
    public int SongId { get; set; }
    public Song Song { get; set; } = null!;

    public int ArtistId { get; set; }
    public Artist Artist { get; set; } = null!;

    public bool IsFeatured { get; set; }

    public int OrderIndex { get; set; }
}
