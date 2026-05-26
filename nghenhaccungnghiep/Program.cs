using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using nghenhaccungnghiep.Data;
using nghenhaccungnghiep.Hubs;
using nghenhaccungnghiep.Models;
using nghenhaccungnghiep.Services;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 104_857_600; // 100 MB
});
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' was not found.");

builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 104_857_600; // 100 MB
});

builder.Services.AddControllersWithViews();
builder.Services.AddRazorPages();
builder.Services.AddSignalR();

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddDefaultIdentity<ApplicationUser>(options =>
{
    options.SignIn.RequireConfirmedAccount = false;
})
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<ApplicationDbContext>();

builder.Services.ConfigureApplicationCookie(options =>
{
    options.LoginPath = "/Account/Login";
    options.LogoutPath = "/Account/Logout";
    options.AccessDeniedPath = "/Account/Login";
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var sp = scope.ServiceProvider;
    var dbContext = sp.GetRequiredService<ApplicationDbContext>();
    dbContext.Database.Migrate();

    var roleManager = sp.GetRequiredService<RoleManager<IdentityRole>>();
    var userManager = sp.GetRequiredService<UserManager<ApplicationUser>>();

    if (!await roleManager.RoleExistsAsync("Admin"))
        await roleManager.CreateAsync(new IdentityRole("Admin"));

    if (!await roleManager.RoleExistsAsync("User"))
        await roleManager.CreateAsync(new IdentityRole("User"));

    if (!await roleManager.RoleExistsAsync("Artist"))
        await roleManager.CreateAsync(new IdentityRole("Artist"));

    async Task SeedUser(string email, string password, string role)
    {
        var user = await userManager.FindByEmailAsync(email);
        if (user == null)
        {
            user = new ApplicationUser { UserName = email, Email = email, EmailConfirmed = true };
            var result = await userManager.CreateAsync(user, password);
            if (!result.Succeeded) { Console.WriteLine($"SEED: Failed to create {email}: {string.Join(", ", result.Errors.Select(e => e.Description))}"); return; }
        }
        var userRoles = await userManager.GetRolesAsync(user);
        Console.WriteLine($"SEED: {email} has roles: [{string.Join(", ", userRoles)}]");
        if (!userRoles.Contains(role))
        {
            await userManager.AddToRoleAsync(user, role);
            Console.WriteLine($"SEED: Added role '{role}' to {email}");
        }
    }

    await SeedUser("admin@record.com", "123456", "Admin");
    await SeedUser("user@record.com", "123456", "User");

    // Seed artists from existing Song.Artist strings
    var anyArtists = await dbContext.Artists.AnyAsync();
    if (!anyArtists)
    {
        var songs = await dbContext.Songs.ToListAsync();
        var artistNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var songArtistMap = new Dictionary<int, string[]>();

        foreach (var s in songs)
        {
            var names = ArtistParser.SplitArtists(s.Artist);
            songArtistMap[s.Id] = names;
            foreach (var n in names) artistNames.Add(n);
        }

        var existingArtists = await dbContext.Artists.ToListAsync();
        var nameToArtist = new Dictionary<string, Artist>(StringComparer.OrdinalIgnoreCase);
        foreach (var a in existingArtists) nameToArtist[a.Name] = a;

        foreach (var name in artistNames.OrderBy(n => n))
        {
            if (!nameToArtist.ContainsKey(name))
            {
                var artist = new Artist { Name = name, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
                dbContext.Artists.Add(artist);
                nameToArtist[name] = artist;
            }
        }

        await dbContext.SaveChangesAsync();

        // Reload nameToArtist with IDs
        nameToArtist.Clear();
        foreach (var a in await dbContext.Artists.ToListAsync()) nameToArtist[a.Name] = a;

        foreach (var s in songs)
        {
            if (!songArtistMap.TryGetValue(s.Id, out var names) || names.Length == 0) continue;
            for (int i = 0; i < names.Length; i++)
            {
                if (!nameToArtist.TryGetValue(names[i], out var artist)) continue;
                var exists = await dbContext.SongArtists.AnyAsync(sa => sa.SongId == s.Id && sa.ArtistId == artist.Id);
                if (!exists)
                {
                    dbContext.SongArtists.Add(new SongArtist
                    {
                        SongId = s.Id,
                        ArtistId = artist.Id,
                        IsFeatured = i > 0,
                        OrderIndex = i
                    });
                }
            }
        }

        await dbContext.SaveChangesAsync();
        Console.WriteLine($"SEED: Created {nameToArtist.Count} artists, linked to {songs.Count} songs.");
    }
}

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseStaticFiles();
app.UseHttpsRedirection();
app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.MapRazorPages();
app.MapHub<RoomHub>("/hub/room");

app.Run();
