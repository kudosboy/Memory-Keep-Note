# Memory Keep Note

A private, browser-based note-taking app with a responsive glass-style interface. Notes are stored only in the browser's `localStorage`; nothing is sent to a server.

## Features

- Create, edit, search, delete, and download notes
- Automatic saving to local browser storage
- Keyboard shortcuts: `Ctrl/Cmd + N` for a new note and `Ctrl/Cmd + S` to save
- Responsive sidebar for phones and desktop

## Run locally

Open `memorykeepnote.html` in a modern browser.

## Deploy with Render

This repository includes `render.yaml`, so Render can configure the static site automatically.

1. Go to [Render](https://dashboard.render.com/) and sign in with GitHub.
2. Select **New** then **Blueprint**.
3. Connect the `kudosboy/Memory-Keep-Note` repository.
4. Select the `main` branch and deploy.

Render publishes the app from the repository root and redeploys it automatically whenever new commits are pushed to `main`.

## Privacy note

Because notes live in `localStorage`, they remain on the browser and device where they were written. Clearing browser site data removes them.
