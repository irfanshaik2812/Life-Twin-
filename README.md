# LifeTwin AI

A personal health intelligence platform that brings together wearable data, IoT telemetry, lifestyle tracking, interactive digital-twin visualizations, and AI-assisted insights.

## Features

- Personal dashboard and health overview
- Lifestyle and activity tracking
- Interactive 3D digital-twin experience
- Health data and measurement visualizations
- AI-assisted explanations and reports
- Integration-ready wearable and ESP32/MAX30102 data workflows
- Account, profile, and privacy settings

## Tech stack

- React, TypeScript, and Vite
- Express and Node.js
- Three.js
- Supabase client integration
- Google Gemini API integration
- SQLite for local application data

## Requirements

- Node.js (LTS recommended)
- npm
- A Gemini API key for AI-powered features

## Getting started

1. Clone this repository.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a local environment file:

   ```bash
   cp .env.example .env
   ```

4. Add your configuration values to `.env`. At minimum, set `GEMINI_API_KEY` to enable Gemini-powered features.
5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open the local URL printed by the development server.

## Environment variables

See [`.env.example`](.env.example) for the supported configuration keys.

Never commit `.env`, `.env.local`, API keys, OAuth client secrets, production credentials, or personal database files. Configure secrets through your hosting provider's environment-variable settings.

## Build

```bash
npm run build
npm run preview
```

## Notes

- Wearable integrations require the relevant provider credentials and OAuth configuration.
- Supabase settings are optional and should be configured only when using the Supabase integration.
- Health measurements and AI-generated explanations are informational and are not a substitute for professional medical advice.
