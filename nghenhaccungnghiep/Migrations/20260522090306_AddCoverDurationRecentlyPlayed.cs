using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace nghenhaccungnghiep.Migrations
{
    /// <inheritdoc />
    public partial class AddCoverDurationRecentlyPlayed : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CoverUrl",
                table: "Songs",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DurationInSeconds",
                table: "Songs",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "RecentlyPlayed",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    SongId = table.Column<int>(type: "integer", nullable: false),
                    PlayedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecentlyPlayed", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RecentlyPlayed_Songs_SongId",
                        column: x => x.SongId,
                        principalTable: "Songs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RecentlyPlayed_SongId",
                table: "RecentlyPlayed",
                column: "SongId");

            migrationBuilder.CreateIndex(
                name: "IX_RecentlyPlayed_UserId_PlayedAt",
                table: "RecentlyPlayed",
                columns: new[] { "UserId", "PlayedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RecentlyPlayed");

            migrationBuilder.DropColumn(
                name: "CoverUrl",
                table: "Songs");

            migrationBuilder.DropColumn(
                name: "DurationInSeconds",
                table: "Songs");
        }
    }
}
