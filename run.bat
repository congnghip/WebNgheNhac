@echo off
setlocal enabledelayedexpansion

set PROJECT=nghenhaccungnghiep\nghenhaccungnghiep.csproj

if "%1"=="" (
    echo Usage: run ^<command^>
    echo.
    echo Commands:
    echo   run          Chay project
    echo   build        Build project
    echo   restore      Khoi phuc packages
    echo   migrate name Khoi tao EF migration
    echo   update       Cap nhat database
    echo   clean        Don dep
    exit /b
)

if "%1"=="run" (
    dotnet run --project %PROJECT%
) else if "%1"=="build" (
    dotnet build %PROJECT%
) else if "%1"=="restore" (
    dotnet restore %PROJECT%
) else if "%1"=="migrate" (
    if "%2"=="" (
        echo Thieu tham so name. VD: run migrate TenMigration
        exit /b
    )
    dotnet ef migrations add %2 --project %PROJECT%
) else if "%1"=="update" (
    dotnet ef database update --project %PROJECT%
) else if "%1"=="clean" (
    dotnet clean %PROJECT%
) else (
    echo Lenh khong hop le: %1
    exit /b
)
