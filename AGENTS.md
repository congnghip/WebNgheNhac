# AGENTS.md

## Project

ASP.NET Core MVC (.NET 10) — "nghe nhạc cùng nghiệp" (listen to music with colleagues).

- **Solution**: `nghenhaccungnghiep.slnx` at root
- **Project**: `nghenhaccungnghiep/nghenhaccungnghiep.csproj` — `net10.0`, nullable enabled, implicit usings
- **Brand**: Record — Monochrome Geometric design system (Swiss/Modernist)

## Database

- **PostgreSQL** via Npgsql + EF Core
- Update connection string in `appsettings.json` / `appsettings.Development.json` (placeholder password `your_password_here`)
- **Auto-migration on dev startup**: `dbContext.Database.Migrate()` runs in `Program.cs` when `ASPNETCORE_ENVIRONMENT=Development`

## Key commands

```powershell
# Run locally (dev)
dotnet run --project nghenhaccungnghiep/nghenhaccungnghiep.csproj

# Dev URLs: http://localhost:5170 | https://localhost:7130

# EF Core (local tool via .config/dotnet-tools.json)
dotnet ef migrations add <Name>
dotnet ef database update
```

## Architecture

### Backend
- `Models/Song.cs` — entity (Id, Title, Artist, AudioUrl?, FilePath?, CreatedAt)
- `Data/ApplicationDbContext.cs` — inherits `IdentityDbContext<IdentityUser>`, has `DbSet<Song>`
- `Controllers/ApiController.cs` — 15 REST API endpoints (songs, playlists, favorites, admin, current-user)
- `Controllers/AccountController.cs` — login/register/logout (MVC form-based)
- `Controllers/HomeController.cs` — Index, Privacy, Error
- `Migrations/` — `InitialCreate`, `AddIdentityAndFilePath`

### Frontend (SPA Hybrid)
- **Layout**: `Views/Shared/_Layout.cshtml` — topnav + sidebar + main + player bar + mobile nav
- **Theme**: Monochrome Geometric — light background (#fbf9f9), black primary, Hanken Grotesk font, Material Symbols icons, no shadows/gradients, pill-shaped UI
- **Auth pages**: `Views/Account/{Login,Register}.cshtml` — layout null, standalone minimalist design
- **JS (SPA)**: `wwwroot/js/` — `app.js` (navigation, admin, search), `player.js` (Audio API), `home.js`, `playlist.js`, `library.js`, `api.js`, `ui-effects.js`
- **CSS**: `wwwroot/css/site.css` — full design system (~1000 lines)
- **Audio files**: `wwwroot/audio/`, served as static assets

### Key Design Tokens
- Font: Hanken Grotesk (400/500/600/700/800)
- Icons: Material Symbols Outlined
- Colors: Surface #fbf9f9, Primary #000000, Secondary #5d5f5f, Outline #7e7576
- Radii: sm 0.5rem / md 1rem / lg 1.5rem / xl 2rem / full 9999px
- Spacing: unit 8px, gutter 24px, margin-desktop 64px, container-max 1280px

## Routes (SPA pages)
| Page | Section ID | JS Handler |
|------|-----------|------------|
| Home | `#page-home` | `renderHomePage()` in `home.js` |
| Search | `#page-search` | `_initSearch()` in `app.js` |
| Playlist | `#page-playlist` | `renderPlaylistPage()` in `playlist.js` |
| Library | `#page-library` | `renderLibraryPage()` in `library.js` |
| Admin | `#page-admin` | `renderAdminPage()` in `app.js` |

## Auth

- ASP.NET Core Identity (`AddDefaultIdentity<IdentityUser>`)
- Login/Register via `AccountController` (custom views, not Identity UI)
- Admin API endpoints use `[Authorize]` — returns 401 if not logged in
- User avatar shows initial of email in topnav

## Notes

- No test project, no CI, no lint/format config
- No `.gitignore` — consider adding one for `bin/`, `obj/`, `.vs/`, `appsettings.*.local.*`, `wwwroot/audio/*.mp3`
- Connection strings checked in — consider user secrets for dev
- Run with `dotnet run` in project dir; auto-migration on dev startup creates/migrates both DBs
- Design references in `design/` folder: `DESIGN.md` (token spec), `code.html` (hero page), `code1.html` (playlist detail page)

## Agent Automation Rules (Crucial)
- When restarting or testing the app, **DO NOT** use `Get-Content` paired with `Select-String` on active log files, as it causes terminal deadlocks.
- After running `Start-Process` with `dotnet run`, simply verify the process is running using `Get-Process -Name dotnet` instead of scanning the log content.
- If you need to stop the app, use: `Stop-Process -Name dotnet -Force -ErrorAction SilentlyContinue`