using System.ComponentModel.DataAnnotations;

namespace nghenhaccungnghiep.Models;

public class ArtistApplication
{
    public int Id { get; set; }

    [Required]
    public string UserId { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Reason { get; set; }

    [Required]
    [StringLength(20)]
    public string Status { get; set; } = "Pending";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ReviewedAt { get; set; }

    public string? ReviewedById { get; set; }
}
