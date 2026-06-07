@echo off
echo ===================================================
echo Starting EnviroHub Pro Local AI Backend (Port 8002)
echo ===================================================
echo.
echo Make sure you leave this window open!
echo.

:: Ensure Python knows where to find the "app" folder
set PYTHONPATH=.

:: Run the local development server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload --app-dir .

:: If there's an error, keep the window open so we can see it
pause
