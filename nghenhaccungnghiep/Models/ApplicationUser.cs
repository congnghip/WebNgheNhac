using Microsoft.AspNetCore.Identity;

namespace nghenhaccungnghiep.Models;

public class ApplicationUser : IdentityUser
{
    public string? DisplayName { get; set; }
    public string? AvatarUrl { get; set; }

    public ICollection<Artist> Artists { get; set; } = new List<Artist>();
}
