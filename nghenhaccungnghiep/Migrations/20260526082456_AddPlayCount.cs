using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace nghenhaccungnghiep.Migrations
{
    /// <inheritdoc />
    public partial class AddPlayCount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "PlayCount",
                table: "Songs",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PlayCount",
                table: "Songs");
        }
    }
}
