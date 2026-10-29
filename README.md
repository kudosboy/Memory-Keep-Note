# Memory Keep Note

A private, account-based note-taking app with a responsive glass-style interface. Notes are stored in the user's account and also cached locally for a responsive editing experience.

## Features

- Create, edit, search, download, and recover deleted notes
- Organize notes with folders, tags, pinning, archive, and recently edited views
- Sort notes by edit date, creation date, or title
- Add pictures to notes (PNG, JPEG, WebP, or GIF; up to 5 MB each) and customize each note's board color
- Attach up to 20 private PDF, TXT, and CSV documents per note (up to 20 MB each), with authenticated preview, download, and removal
- Share a note using an explicitly created, read-only link that the owner can revoke
- Rich text controls for emphasis, titles and headings, quotes, code blocks, bulleted and numbered lists, interactive checklists, editable tables, indentation, links, undo/redo, and clear formatting
- Storage usage meter; new accounts start with 1 GB, and an administrator can set account limits from 0.1 GB to 100,000 GB
- Optional Stripe Plus subscriptions: $20/month or $240/year USD by default, with a 20 GB default quota and admin-managed entitlements
- Secure account registration and sign-in, with dedicated sign-in and sign-up pages
- Admin-managed website wording and a site-wide announcement across the landing, authentication, notes, shared-note, and admin pages
- Automatic account-backed saving to MongoDB, with a local editing cache
- One-time import of notes already stored in the browser
- Keyboard shortcuts: `Ctrl/Cmd + N` for a new note and `Ctrl/Cmd + S` to save
- Responsive sidebar for phones and desktop
- Admin Website Content editor for visible text across public pages and app screens, with live preview and publishing
- Site-wide announcement banner that administrators can enable, style, and update

## Run locally

Install dependencies, configure MongoDB, then start the app:

```bash
npm install
npm start
```

First copy `.env.example` to `.env` and fill in its values. `.env` is ignored by Git so credentials are not pushed to GitHub.

Open `http://localhost:3000` in a modern browser.

## Install as a PWA

The public site can be installed from a supported mobile browser. Its service worker caches only the public landing-page shell and static install assets for offline loading. Sign-in, account pages, admin pages, API responses, and private note data remain network-only.

On Android, open the deployed HTTPS site in Chrome and choose **Install app** or **Add to Home screen**. On iPhone, open it in Safari, tap **Share**, then **Add to Home Screen**. PWA support does not publish the site to an app store.

## Browser and server code

Database connections, session/authentication secrets, password hashing, admin authorization, and privileged actions run in `server.js` and use server environment variables. `.env` is ignored by Git and is not included in the public build. The production build copies only an explicit allowlist of browser pages and assets into `dist/`; it minifies inline and external browser JavaScript with Terser. Render runs this build before starting the server.

Minification makes browser code less readable and smaller, but does not make it secret or prevent copying. Browser-delivered HTML, CSS, and JavaScript can always be inspected. Do not put credentials, private keys, or privileged business logic in client code; code encryption or obfuscation cannot safely hide information the browser needs to execute.

## Deploy with Render

This repository includes `render.yaml`, which creates a Node web service. MongoDB is hosted in your MongoDB Atlas account.

1. Go to [Render](https://dashboard.render.com/) and sign in with GitHub.
2. Select **New** then **Blueprint**.
3. Connect the `kudosboy/Memory-Keep-Note` repository and choose `main`.
4. Paste your MongoDB Atlas connection string when Render asks for `MONGODB_URI`.
5. Paste an SMTP connection URL when asked for `SMTP_URL` so password-reset emails can be delivered. Set `MAIL_FROM` in Render after deployment if you want a branded sender.

Render generates the session secret automatically. It redeploys whenever new commits are pushed to `main`.

### MongoDB Atlas on Render

Set `MONGODB_URI` in Render's Environment settings using the Atlas **Connect → Drivers → Node.js** connection string. Do not add quotes around it. If the database password contains characters such as `@`, `:`, `/`, `?`, `#`, `[`, or `]`, percent-encode the password before placing it in the URI.

In Atlas, confirm the cluster is **Active** and allow Render to reach it in **Network Access**. For a service without fixed outbound IPs, this commonly requires an access-list rule of `0.0.0.0/0`; database credentials and TLS still protect the connection. Do not add insecure TLS options or disable certificate verification.

The application pins Node.js 22.22.0 for Render and prints redacted startup diagnostics: Node/OpenSSL version, URI scheme, host, database name, credential presence, SRV DNS result, and retry outcome. It never logs the URI password.

## Administrator access

Set `ADMIN_EMAIL` in your private `.env` file and configure a strong `ADMIN_ACCESS_PASSWORD`. The configured admin can sign in with that email and admin access password; if no account exists yet, the app creates the admin account on the first successful login and opens the panel directly. An existing admin can also use its account password to sign in, then enter the admin access password at `/admin.html`. The dashboard shows account totals and note counts, and allows accounts to be suspended or permanently removed with their notes. The **Website content** section previews each page and lets the admin edit visible text and publish a dismissible site-wide announcement. User note text, account data, form values, and transient status messages are excluded from content editing. Published copy is stored separately from account notes. The admin panel never exposes passwords, credentials, source files, or note contents.

## Optional Stripe subscriptions

The app starts with a Free plan (1 GB) and a disabled Plus plan ($20 USD monthly or $240 USD yearly, 20 GB by default). Administrators can adjust the Plus price, storage allowance, and enabled features in Admin → Billing; grant or revoke manual Plus access per account in Admin → Accounts. Plus feature checks run on the server for uploads, custom note colors, and note sharing. Existing attachments remain readable after a downgrade; new uploads are blocked. Existing share links stop working when the owner no longer has sharing entitlement.

To accept payments, configure private `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` environment variables in `.env` and the deployment environment. Use Stripe test-mode credentials first. In Stripe, register `https://YOUR_DOMAIN/api/billing/webhook` and subscribe to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`. The admin cannot enable checkout until both secrets are configured; Stripe webhook signatures are verified before paid access is applied. Customers can manage or cancel their subscriptions through Stripe's customer portal (enable it in Stripe Dashboard → Billing → Customer portal). Do not expose either secret in browser code or commit real values. Live charges require your own Stripe account and merchant setup; no payment was made during local validation.

## Privacy note

Clearing browser data removes only the local cache. Notes saved while signed in remain in the account and return after signing in again. This is a personal notes app; do not use it for passwords, recovery codes, or other highly sensitive secrets.

Shared notes are private until the owner creates a link. Anyone with an active link can read that note and its attached pictures; the owner can turn sharing off at any time. Share tokens are encrypted in MongoDB using the session secret and indexed by a one-way hash. Rotating `SESSION_SECRET` requires owners to revoke and recreate their links. Picture data is stored in MongoDB GridFS, not embedded in note documents.

Each regular account receives 1 GiB of storage by default. Administrators can adjust another account's quota in the Admin → Accounts table; the administrator account itself has unlimited storage. Quotas are enforced by the server for note saves, image uploads, and document attachments. Pictures and document attachments are stored in MongoDB GridFS, not embedded in note documents.
