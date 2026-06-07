# EnviroConsult Pro (EHS Toolkit) - Deployment & Run Guide

This guide provides the deployment instructions required to start both the Python Backend API (V2) and the React/Vite Frontend Interface locally.

## Features Included in V2
*   **Multi-Matrix Support:** Seamless unit-parsing and limit extraction for Air (Emissions), Water Quality (MCL), Soil (RSL), and Asbestos/Lead.
*   **Jurisdiction Routing Engine:** Dynamic mapping of regional authorities (e.g., USA, UK, EU, Canada) and state-level agencies (e.g., California Waterboards, Texas TCEQ).
*   **Local DKB (Domain Knowledge Base):** Deterministic, cache-driven regulatory lookups that bypass search engine limits for instant results.

---

## 1. Starting the Backend API

The backend holds the Mathematical Core and Web Scraper engines. It is built using Python FastAPI.

1. **Open a Terminal/Command Prompt** and navigate to the backend directory:
   ```cmd
   cd "C:\EHS Toolkit\envirohubpro-backend-main"
   ```
2. **Install Dependencies**:
   ```cmd
   pip install -r requirements.txt
   ```
3. **Run the Backend Server**:
   You can either run the provided batch file or start it directly using uvicorn:
   ```cmd
   start.bat
   ```
   *OR manually:*
   ```cmd
   fastapi dev app/main.py
   ```
4. The API will start running at `http://localhost:8000`. You can view the automated API documentation at `http://localhost:8000/docs`.

---

## 2. Starting the Frontend UI

The frontend is a modern web application built using React, Vite, and TailwindCSS.

1. **Open a new Terminal/Command Prompt** window and navigate to the frontend directory:
   ```cmd
   cd "C:\EHS Toolkit\crain-compliance-companion-main"
   ```
2. **Install Dependencies**:
   ```cmd
   npm install
   ```
3. **Run the Developer Server**:
   ```cmd
   npm run dev
   ```
4. The UI will start locally. Look at the terminal for the exact URL. Open that URL in your Chrome or Edge browser.

## General Operations
- Keep both terminals running simultaneously. The frontend requires the backend API for mathematical processing and scraping.
- The Python backend uses hot-reloading; any modifications to the core logic will automatically restart the server.
- The frontend uses Hot Module Replacement (HMR). Saving changes to `.tsx` files instantly updates the browser UI.
