# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This is an ASP.NET Core MVC music streaming web app named `nghenhaccungnghiep`. It targets .NET `net10.0`, uses Razor views plus static JavaScript/CSS, ASP.NET Core Identity for users/roles, Entity Framework Core with PostgreSQL, and SignalR for synchronized listening rooms.

The solution file is `nghenhaccungnghiep.slnx`; the single web project is `nghenhaccungnghiep/nghenhaccungnghiep.csproj`.

## Common commands

Run commands from the repository root unless noted.

```bash
# Restore dependencies
dotnet restore nghenhaccungnghiep.slnx

# Build
dotnet build nghenhaccungnghiep.slnx

# Run the web app
dotnet run --project nghenhaccungnghiep/nghenhaccungnghiep.csproj

# Run with Development environment so migrations/seeding run at startup
ASPNETCORE_ENVIRONMENT=Development dotnet run --project nghenhaccungnghiep/nghenhaccungnghiep.csproj

# Apply EF Core migrations manually
dotnet ef database update --project nghenhaccungnghiep/nghenhaccungnghiep.csproj

# Add a new EF Core migration
dotnet ef migrations add <MigrationName> --project nghenhaccungnghiep/nghenhaccungnghiep.csproj
```

There is no test project currently present in the repository, so `dotnet test` has no project to run unless tests are added later.

## Runtime configuration

- Database connection strings live in `nghenhaccungnghiep/appsettings.json` and `nghenhaccungnghiep/appsettings.Development.json`.
- Development uses PostgreSQL database `nghenhaccungnghiep_dev`; default config uses `nghenhaccungnghiep`.
- In Development, `Program.cs` automatically runs `dbContext.Database.Migrate()` and seeds roles `Admin`, `User`, `Artist` plus users `admin@record.com` / `user@record.com` with password `123456`.
- File upload limits are set to 100 MB in Kestrel and form options.
- Uploaded audio and cover/profile assets are stored under `wwwroot/audio`, `wwwroot/covers`, and `wwwroot/uploads`.

## Architecture

### Server-side app

- `Program.cs` wires MVC controllers, Razor Pages, SignalR, EF Core Npgsql, Identity roles, auth cookie paths, development migrations, and seed data.
- `Data/ApplicationDbContext.cs` inherits `IdentityDbContext<ApplicationUser>` and defines the music domain sets and relationships.
- `Models/` contains Identity user extension plus music domain entities: songs, artists, song-artist joins, playlists, favorites, recently played entries, artist follows, and artist applications.
- `Migrations/` contains EF Core migrations for the current PostgreSQL schema.

### Controllers and APIs

- `Controllers/HomeController.cs` serves the original MVC home/favorites flows and form posts for likes and playlist additions.
- `Controllers/PlaylistController.cs` serves authenticated Razor playlist pages and playlist mutations.
- `Controllers/AccountController.cs` handles custom login/register/logout against ASP.NET Core Identity; artist registration creates a pending `ArtistApplication`.
- `Controllers/AdminController.cs` contains older MVC admin upload/delete pages.
- `Controllers/ApiController.cs` is the main JSON API used by the JavaScript app. It includes song browsing/search, artist profiles/follows, playlists, favorites, recently played, profile/password updates, artist applications/uploads, and admin moderation/user/song endpoints.

When changing song upload or editing behavior, keep `ApiController.SyncSongArtistsAsync` and `Services/ArtistParser.cs` in sync with the client-side `API.splitArtists` behavior in `wwwroot/js/api.js`; both parse artist strings into normalized artist records and song-artist join rows.

### Client-side app

The frontend is server-rendered Razor with a JavaScript-driven single-page experience inside `Views/Shared/_Layout.cshtml`.

- `_Layout.cshtml` defines the navigation shell, page sections, player bar, queue/room panels, modals, and script load order.
- `wwwroot/js/api.js` wraps all `/api` calls and contains a client copy of artist-splitting logic.
- `wwwroot/js/app.js` owns page navigation, rendering for search/library/admin/studio/settings/artist pages, sidebar playlist refresh, context menus, and app initialization.
- `wwwroot/js/player.js` owns the HTML5 audio player, queue state, play counts, recently played logging, duration reporting, likes, and player UI.
- `wwwroot/js/room.js` connects to SignalR `/hub/room` and syncs playback/queue events between listeners.
- `wwwroot/js/home.js`, `playlist.js`, `library.js`, and `ui-effects.js` render or enhance specific pages/visual behavior.

The app uses jQuery and the SignalR browser client loaded from CDN in `_Layout.cshtml`; there is no npm/package.json build step.

### SignalR

`Hubs/RoomHub.cs` manages in-memory room membership and broadcasts playback/queue sync events to other clients in the same room. Room state is process-local and not persisted.

### Authorization model

- Identity roles used by the app are `Admin`, `User`, and `Artist`.
- Admin-only API endpoints are under `/api/admin/...` with `[Authorize(Roles = "Admin")]`.
- Artist upload endpoints allow `Admin,Artist`; non-admin artist uploads start as unapproved songs and require admin approval.
- Many JSON endpoints require `[Authorize]`; anonymous access is mainly for browsing approved songs/artists.

## Development notes

- If modifying database entities or relationships, add an EF Core migration and keep `ApplicationDbContext.OnModelCreating` consistent with model navigation properties.
- If modifying upload paths or static asset handling, check both admin and artist upload flows in `ApiController`, plus the older MVC upload flow in `AdminController` if still relevant.
- If modifying frontend API shapes, update both `ApiController` projections and the consumers in `wwwroot/js/*.js`; many renderers expect camel-cased JSON property names from ASP.NET Core's default JSON serialization.
- For UI changes, run the app and verify the relevant page in a browser; the app has no automated frontend test suite.
