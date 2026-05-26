using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using nghenhaccungnghiep.Models;

namespace nghenhaccungnghiep.Data
{
    public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : IdentityDbContext<ApplicationUser>(options)
    {
        public DbSet<Song> Songs => Set<Song>();
        public DbSet<Playlist> Playlists => Set<Playlist>();
        public DbSet<PlaylistSong> PlaylistSongs => Set<PlaylistSong>();
        public DbSet<Favorite> Favorites => Set<Favorite>();
        public DbSet<ArtistApplication> ArtistApplications => Set<ArtistApplication>();
        public DbSet<RecentlyPlayed> RecentlyPlayed => Set<RecentlyPlayed>();
        public DbSet<Artist> Artists => Set<Artist>();
        public DbSet<SongArtist> SongArtists => Set<SongArtist>();
        public DbSet<ArtistFollow> ArtistFollows => Set<ArtistFollow>();

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<PlaylistSong>()
                .HasKey(ps => new { ps.PlaylistId, ps.SongId });

            builder.Entity<PlaylistSong>()
                .HasOne(ps => ps.Playlist)
                .WithMany(p => p.PlaylistSongs)
                .HasForeignKey(ps => ps.PlaylistId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<PlaylistSong>()
                .HasOne(ps => ps.Song)
                .WithMany(s => s.PlaylistSongs)
                .HasForeignKey(ps => ps.SongId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<Favorite>()
                .HasOne(f => f.Song)
                .WithMany(s => s.Favorites)
                .HasForeignKey(f => f.SongId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<Favorite>()
                .HasIndex(f => new { f.UserId, f.SongId })
                .IsUnique();

            builder.Entity<RecentlyPlayed>()
                .HasOne(r => r.Song)
                .WithMany()
                .HasForeignKey(r => r.SongId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<RecentlyPlayed>()
                .HasIndex(r => new { r.UserId, r.PlayedAt });

            builder.Entity<Song>()
                .HasIndex(s => s.IsApproved);

            builder.Entity<SongArtist>()
                .HasKey(sa => new { sa.SongId, sa.ArtistId });

            builder.Entity<SongArtist>()
                .HasOne(sa => sa.Song)
                .WithMany(s => s.SongArtists)
                .HasForeignKey(sa => sa.SongId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<SongArtist>()
                .HasOne(sa => sa.Artist)
                .WithMany(a => a.SongArtists)
                .HasForeignKey(sa => sa.ArtistId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<Artist>()
                .HasIndex(a => a.Name)
                .IsUnique();

            builder.Entity<ArtistFollow>()
                .HasIndex(af => new { af.UserId, af.ArtistId })
                .IsUnique();

            builder.Entity<ArtistFollow>()
                .HasOne(af => af.Artist)
                .WithMany(a => a.Followers)
                .HasForeignKey(af => af.ArtistId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<Artist>()
                .HasOne(a => a.User)
                .WithMany(u => u.Artists)
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}
