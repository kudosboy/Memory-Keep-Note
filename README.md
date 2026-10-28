# Memory Keep Note

A private, account-based note-taking app with a responsive glass-style interface. Notes are stored in the user's account and also cached locally for a responsive editing experience.

## Features

- Create, edit, search, delete, and download notes
- Secure account registration and sign-in, with dedicated sign-in and sign-up pages
- Automatic server-side saving to PostgreSQL
- One-time import of notes already stored in the browser
- Keyboard shortcuts: `Ctrl/Cmd + N` for a new note and `Ctrl/Cmd + S` to save
- Responsive sidebar for phones and desktop

## Run locally

Install dependencies, configure MongoDB, then start the app:

```bash
npm install
npm start
```

First copy `.env.example` to `.env` and fill in its values. `.env` is ignored by Git so credentials are not pushed to GitHub.

Open `http://localhost:3000` in a modern browser.

## Deploy with Render

This repository includes `render.yaml`, which creates a Node web service. MongoDB is hosted in your MongoDB Atlas account.

1. Go to [Render](https://dashboard.render.com/) and sign in with GitHub.
2. Select **New** then **Blueprint**.
3. Connect the `kudosboy/Memory-Keep-Note` repository and choose `main`.
4. Paste your MongoDB Atlas connection string when Render asks for `MONGODB_URI`.
5. Paste an SMTP connection URL when asked for `SMTP_URL` so password-reset emails can be delivered. Set `MAIL_FROM` in Render after deployment if you want a branded sender.

Render generates the session secret automatically. It redeploys whenever new commits are pushed to `main`.

## Administrator access

Set `ADMIN_EMAIL` in your private `.env` file to the exact email address of your own account. After signing in with that account, open `/admin.html` to view account totals and note counts, suspend or restore accounts, or permanently remove an account and its notes. The dashboard never exposes passwords, credentials, source files, or note contents.

## Privacy note

Clearing browser data removes only the local cache. Notes saved while signed in remain in the account and return after signing in again. This is a personal notes app; do not use it for passwords, recovery codes, or other highly sensitive secrets.
