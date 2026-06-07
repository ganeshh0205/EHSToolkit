# Monorepo Deployment Guide for EnviroConsult V2

You absolutely can upload both the frontend and backend as a single GitHub repository (known as a "Monorepo"). In fact, this is often easier to manage!

Here is how to set up `C:\EHS Toolkit` as your master repository and deploy it to live servers.

---

## Phase 1: Uploading the Monorepo to GitHub

Because we are creating one master repository, we need to make sure we initialize Git at the root folder (`C:\EHS Toolkit`) and push everything at once.

### Step 1: Create the Repository on GitHub
1. Go to [GitHub.com](https://github.com) and log in.
2. Click the **+** icon in the top right and select **New repository**.
3. Name it: `enviroconsult-platform` (Set it to Private or Public).
4. Click **Create repository**.

### Step 2: Push the Code
Open a new Terminal or Command Prompt window and execute these commands exactly as written:

```bash
# 1. Navigate to the ROOT folder
cd "C:\EHS Toolkit"

# 2. Initialize Git
git init

# 3. Add all frontend and backend code at once
git add .

# 4. Commit the code
git commit -m "Initial commit: EnviroConsult V2 Monorepo"

# 5. Link to your new GitHub repository (Replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/enviroconsult-platform.git

# 6. Push the code to the cloud
git branch -M main
git push -u origin main
```

---

## Phase 2: Publishing / Hosting a Monorepo

When you use a monorepo, both hosting providers (Render and Vercel) need to know exactly which sub-folder to look inside to find the application they are trying to run. You do this by setting a **Root Directory**.

### 1. Host the Backend (Render.com)
**Render** is the easiest free/cheap host for the Python API.

1. Go to [Render.com](https://render.com) and sign up with GitHub.
2. Click **New +** -> **Web Service**.
3. Select your `enviroconsult-platform` GitHub repository.
4. **CRITICAL STEP - Root Directory:** In the settings, find the "Root Directory" field and type: 
   `envirohubpro-backend-main`
5. Render will automatically detect it's a Python app.
6. Set the **Start Command** to: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
7. Click **Create Web Service**. 
8. *Note: Once deployed, copy your Render URL (e.g., `https://enviro-backend.onrender.com`). You will need this for the frontend!*

### 2. Host the Frontend (Vercel.com)
**Vercel** is the absolute best platform for hosting React frontends.

1. Go to [Vercel.com](https://vercel.com) and sign up with GitHub.
2. Click **Add New Project**.
3. Select your `enviroconsult-platform` GitHub repository.
4. **CRITICAL STEP - Root Directory:** Before clicking deploy, find the **Root Directory** setting and click Edit. Select `crain-compliance-companion-main`.
5. **CRITICAL STEP - Environment Variables:** Open the "Environment Variables" section.
   * Add a new variable named `VITE_API_BASE_URL`.
   * Paste the live Render backend URL you got from the previous step.
6. Click **Deploy**.

Within 2 minutes, Vercel will give you a live, public URL for your platform!
