using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace nghenhaccungnghiep.Migrations
{
    /// <inheritdoc />
    public partial class AddArtistFeatures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsApproved",
                table: "Songs",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "UploadedById",
                table: "Songs",
                type: "character varying(450)",
                maxLength: 450,
                nullable: true);

            migrationBuilder.Sql("UPDATE \"Songs\" SET \"IsApproved\" = true");

            migrationBuilder.CreateTable(
                name: "ArtistApplications",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    Reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ReviewedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReviewedById = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ArtistApplications", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Songs_IsApproved",
                table: "Songs",
                column: "IsApproved");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ArtistApplications");

            migrationBuilder.DropIndex(
                name: "IX_Songs_IsApproved",
                table: "Songs");

            migrationBuilder.DropColumn(
                name: "IsApproved",
                table: "Songs");

            migrationBuilder.DropColumn(
                name: "UploadedById",
                table: "Songs");
        }
    }
}
