# EnviroHub Pro Backend

AI-powered FastAPI backend for environmental regulation guidance and funding/grant discovery using Google Gemini.

## What This Project Does

This API accepts natural-language environmental questions and returns:

- A clear answer
- Source citations (URLs)
- Model tag (`gemini`)

It provides three AI tools:

1. Regulatory Lookup
2. Funding Lookup
3. General Environmental Assistant (combined)

## Tech Stack

- Python 3.11+
- FastAPI
- Pydantic + pydantic-settings
- Google Gemini Python SDK (`google-genai`)
- Uvicorn

## Project Structure

```text
app/
  main.py
  config.py
  ai/
     regulatory.py
     funding.py
     general.py
  models/
     request_models.py
     response_models.py
  services/
     gemini_client.py
requirements.txt
.env
```

## Configuration

Environment variables are loaded from `.env` in the project root via `app/config.py`.

### Required

- `GEMINI_API_KEY`: Your Google Gemini API key

### Optional

- `GEMINI_MODEL` (default: `gemini-3.1-flash-lite-preview`)
- `APP_NAME` (default: `EnviroHub Pro AI API`)
- `APP_ENV` (default: `development`)
- `LOG_LEVEL` (default: `INFO`)

## How To Run

### 1) Create and activate a virtual environment (recommended)

Windows (PowerShell):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Windows (cmd):

```bat
python -m venv .venv
.venv\Scripts\activate.bat
```

Linux/macOS:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 2) Install dependencies

```bash
pip install -r requirements.txt
```

### 3) Set environment variables

Edit `.env` and set at least:

```env
GEMINI_API_KEY=your_real_key_here
```

### 4) Start the API

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### 5) Open API docs

- Swagger UI: `http://localhost:8001/docs`
- ReDoc: `http://localhost:8001/redoc`

## Request/Response Format

All AI endpoints accept:

```json
{
  "prompt": "your natural language question"
}
```

All AI endpoints return:

```json
{
  "answer": "...",
  "sources": ["https://...", "https://..."],
  "model": "gemini"
}
```

## Endpoints Explained

### GET /health

Liveness check endpoint.

Example response:

```json
{
  "status": "ok",
  "service": "EnviroHub Pro AI API"
}
```

### POST /ai/regulations

Purpose:

- Analyzes environmental compliance/regulatory questions
- Summarizes likely rules
- Provides best practices
- Returns citations from regulatory source set

Primary source set includes:

- `https://calepa.ca.gov`
- `https://arb.ca.gov`
- `https://dtsc.ca.gov`
- `https://waterboards.ca.gov`
- `https://calrecycle.ca.gov`
- `https://oehha.ca.gov`
- `https://oal.ca.gov/publications/ccr/`
- `https://arb.ca.gov/air-districts`
- `https://ecfr.gov`
- `https://www.epa.gov`
- `https://www.osha.gov`
- `https://federalregister.gov`

Example request:

```bash
curl -X POST "http://localhost:8001/ai/regulations" \
  -H "Content-Type: application/json" \
  -d "{\"prompt\":\"Do I need a permit for a backup generator in California?\"}"
```

### POST /ai/funding

Purpose:

- Searches environmental grants/funding opportunities
- Returns likely programs, eligibility, potential funding amounts, and application links

Primary source set includes:

- `https://www.grants.ca.gov`
- `https://fundingwizard.arb.ca.gov`
- `https://resilientca.org`
- `https://waterboards.ca.gov`
- `https://resources.ca.gov/grants`
- `https://calrecycle.ca.gov/grants`
- `https://www.grants.gov`
- `https://www.epa.gov/grants`
- `https://sam.gov`
- `https://faast.waterboards.ca.gov`
- `https://water.ca.gov/grants`
- `https://www.fire.ca.gov/grants`
- `https://www.energy.ca.gov/solicitations`
- `https://www.caclimateinvestments.ca.gov`

Example request:

```bash
curl -X POST "http://localhost:8001/ai/funding" \
  -H "Content-Type: application/json" \
  -d "{\"prompt\":\"What grants are available for EV charging infrastructure for small businesses in California?\"}"
```

### POST /ai/general

Purpose:

- Combined assistant that analyzes both compliance and funding strategy
- Useful for questions requiring operational and financing recommendations together

Example requests:

- "How can a small garage reduce emissions and get funding for EV charging?"
- "What grants exist for brownfield cleanup?"

Example request:

```bash
curl -X POST "http://localhost:8001/ai/general" \
  -H "Content-Type: application/json" \
  -d "{\"prompt\":\"How can a small garage reduce emissions and get funding for EV charging?\"}"
```

## How The Code Is Organized

### app/main.py

- Creates FastAPI application (`create_app`)
- Configures logging
- Adds CORS middleware
- Adds in-memory rate limiting placeholder middleware
- Defines API routes:
  - `GET /health`
  - `POST /ai/regulations`
  - `POST /ai/funding`
  - `POST /ai/general`
- Handles endpoint-level errors:
  - Gemini provider issues -> HTTP 502
  - Unexpected server issues -> HTTP 500

### app/config.py

- Defines `Settings` via `BaseSettings`
- Loads values from `.env`
- Provides cached config through `get_settings()`

### app/services/gemini_client.py

- Wraps Google Gemini SDK in `GeminiClient`
- Uses async via `asyncio.to_thread` for model generation calls
- Builds structured system prompts with strict JSON response requirement
- Attempts URL context and search tools when available in SDK
- Parses JSON responses and normalizes source URLs
- Provides fallback URL extraction if model output is not strict JSON

### app/ai/regulatory.py

- Regulatory tool source list
- `run_regulatory_lookup(...)` with compliance-specific prompt instructions

### app/ai/funding.py

- Funding tool source list
- `run_funding_lookup(...)` with grant/funding-specific prompt instructions

### app/ai/general.py

- Merges regulatory + funding source lists
- `run_general_assistant(...)` for combined strategy responses

### app/models/request_models.py

- `PromptRequest` with one field: `prompt`

### app/models/response_models.py

- `AIResponse` with fields:
  - `answer`
  - `sources`
  - `model`

## Error Handling

- `429`: Rate limit exceeded (in-memory placeholder)
- `502`: Gemini provider request failure
- `500`: Unexpected internal error

## Production Notes

- Replace in-memory rate limiter with Redis or API gateway throttling for multi-instance deployments.
- Restrict CORS origins in production.
- Add auth (API keys/OAuth/JWT) before exposing publicly.
- Add tests for endpoint behavior and response schema validation.
- Add observability (structured logs, tracing, and metrics).

## Deploy On Render

This repository includes a Render Blueprint file at `render.yaml`.

### Option A: Blueprint Deploy (recommended)

1. Push this repo to GitHub.
2. In Render, click New + > Blueprint.
3. Select your repository.
4. Render will read `render.yaml` and create the web service.
5. Set the secret value for `GEMINI_API_KEY` in Render Dashboard.

### Option B: Manual Web Service

If you prefer manual setup in Render:

- Runtime: Python
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check path: `/health`

Set these environment variables in Render:

- `GEMINI_API_KEY` (required)
- `GEMINI_MODEL=gemini-3.1-flash-lite-preview`
- `APP_NAME=EnviroHub Pro AI API`
- `APP_ENV=production`
- `LOG_LEVEL=INFO`

### Test After Deploy

Once deployed, use your Render URL:

- `https://<your-service>.onrender.com/health`
- `https://<your-service>.onrender.com/docs`

For frontend integration, use this Render URL as your API base URL.

## Quick Smoke Test

After server starts, run:

```bash
curl -X GET "http://localhost:8001/health"
```

Then test one AI endpoint:

```bash
curl -X POST "http://localhost:8001/ai/regulations" \
  -H "Content-Type: application/json" \
  -d "{\"prompt\":\"Do I need a permit for a backup generator in California?\"}"
```
