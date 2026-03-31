@echo off
echo ============================================
echo    FleetPro Deployment Script
echo ============================================
echo.

:: Check if git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git is not installed.
    echo Download from: https://git-scm.com/download/win
    echo Install it, then run this script again.
    pause
    exit /b 1
)

:: Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js/npm is not installed.
    echo Download from: https://nodejs.org
    echo Install the LTS version, then run this script again.
    pause
    exit /b 1
)

echo [1/5] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed.
    pause
    exit /b 1
)
echo       Done.
echo.

echo [2/5] Building for production...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed. Check for errors above.
    pause
    exit /b 1
)
echo       Done.
echo.

echo [3/5] Setting up Git...
if not exist ".git" (
    git init
    git branch -M main
    echo       Initialized new git repo.
) else (
    echo       Git repo already exists.
)
echo.

echo [4/5] Committing files...
git add .
git commit -m "FleetPro deployment - %date% %time%"
echo       Done.
echo.

echo [5/5] Deploying...
echo.
echo ============================================
echo   Choose your deployment method:
echo ============================================
echo.
echo   A) Deploy to Vercel directly (easiest)
echo   B) Push to GitHub (then Vercel auto-deploys)
echo.
set /p choice="Enter A or B: "

if /i "%choice%"=="A" (
    echo.
    echo Checking for Vercel CLI...
    npx vercel --version >nul 2>&1
    if errorlevel 1 (
        echo Installing Vercel CLI...
        call npm install -g vercel
    )
    echo.
    echo Deploying to Vercel...
    echo When prompted:
    echo   - Log in with your account
    echo   - Set up and deploy? Y
    echo   - Which scope? Select your account
    echo   - Link to existing project? N (first time) or Y
    echo   - Project name? fleetpro
    echo   - Directory? ./
    echo   - Override settings? N
    echo.
    npx vercel --prod
    echo.
    echo ============================================
    echo   Deployment complete!
    echo   Your URL will be shown above.
    echo ============================================
) else if /i "%choice%"=="B" (
    echo.
    set /p repo="Enter your GitHub repo URL (e.g. https://github.com/USERNAME/fleetpro.git): "
    git remote remove origin >nul 2>&1
    git remote add origin %repo%
    git push -u origin main
    echo.
    echo ============================================
    echo   Pushed to GitHub!
    echo   Now go to vercel.com:
    echo     1. Click "Add New" then "Project"
    echo     2. Import your fleetpro repo
    echo     3. Click Deploy
    echo   Auto-deploys on every future "git push"
    echo ============================================
) else (
    echo Invalid choice. Run the script again.
)

echo.
pause
