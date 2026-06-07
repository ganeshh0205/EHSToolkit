# Crain Compliance Companion

Frontend application for environmental compliance workflows, including:

- Regulatory Lookup
- Funding Finder
- AI Assistant
- Reports, Data Analysis, and Hygiene Planning tools

## Tech Stack

- Vite
- React + TypeScript
- Tailwind CSS
- shadcn/ui

## Local Development

1. Install dependencies:

```sh
npm install
```

2. Configure environment variables in `.env`:

```env
VITE_API_BASE_URL=https://envirohubpro-backend.onrender.com
```

3. Start development server:

```sh
npm run dev
```

4. Build production bundle:

```sh
npm run build
```

## Backend API

The frontend expects these POST endpoints on `VITE_API_BASE_URL`:

- `/ai/regulations`
- `/ai/funding`
- `/ai/general`

Each endpoint accepts:

```json
{
  "prompt": "your question"
}
```

Each endpoint returns:

```json
{
  "answer": "...",
  "sources": ["https://..."],
  "model": "..."
}
```
