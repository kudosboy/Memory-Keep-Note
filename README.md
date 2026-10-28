# Memory Keep Note

A private, account-based note-taking app with a responsive glass-style interface. Notes are stored in the user's account and also cached locally for a responsive editing experience.

## Features

- Create, edit, search, delete, and download notes
- Secure account registration and sign-in
- Automatic server-side saving to PostgreSQL
- One-time import of notes already stored in the browser
- Keyboard shortcuts: `Ctrl/Cmd + N` for a new note and `Ctrl/Cmd + S` to save
- Responsive sidebar for phones and desktop

## Run locally

Install dependencies, configure a PostgreSQL connection, then start the app:

```bash
npm install
set DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
set SESSION_SECRET=replace-with-a-long-random-value
npm start
```

Open `http://localhost:3000` in a modern browser.

## Deploy with Render

This repository includes `render.yaml`, which creates a Node web service and a connected Render PostgreSQL database.

1. Go to [Render](https://dashboard.render.com/) and sign in with GitHub.
2. Select **New** then **Blueprint**.
3. Connect the `kudosboy/Memory-Keep-Note` repository and choose `main`.
4. Review the web-service and PostgreSQL resources, then deploy the Blueprint.

Render generates the session secret and connects the database automatically. It redeploys whenever new commits are pushed to `main`.

## Privacy note

Clearing browser data removes only the local cache. Notes saved while signed in remain in the account and return after signing in again. This is a personal notes app; do not use it for passwords, recovery codes, or other highly sensitive secrets.
