# Global Postal Codes — Bangladesh Database Update

This update keeps the same blue homepage search layout and adds a data-backed Bangladesh postal-code search.

## Requirements
- Node.js 18 or newer (Node.js 22/24 is fine)
- Internet connection for the one-time dataset download

## Install / update on Windows
1. Extract this ZIP into a new folder.
2. Open the extracted folder.
3. In the folder address bar type `cmd` and press Enter.
4. Run:

```bash
npm install
node scripts/download-data.js
npm start
```

5. Open http://localhost:3000

If you already have the previous project, copy the `server.js`, `data` folder, `scripts` folder and `public` folder from this ZIP into your existing project (replace files when asked). Keep your existing `package.json` because Express is already installed. Then run:

```bash
node scripts/download-data.js
npm start
```

If the server is already running, press Ctrl+C first, then run the commands again.

## What is included
- Cascading dropdowns: Country → Division → District → Upazila/Thana → Post Office
- Search results with postal code and bilingual data fields
- Search API endpoints:
  - `GET /api/bd/summary`
  - `GET /api/bd/locations`
  - `GET /api/bd/search?division=Dhaka&district=Gazipur`
- Download script for the Bangladesh dataset

## Dataset source and accuracy
The downloader fetches `postcodes-pretty.json` from:
https://github.com/TanjidulIslamToha/bangladesh-postal-codes-database

The repository describes 1,347 records, 8 divisions and 64 districts, and is MIT-licensed. The dataset README says Bengali names were aligned with a Wikipedia listing and English district mapping used postal-code ranges; it is not an official Bangladesh Post data export. Therefore this project deliberately marks every record **Not independently verified**. Do not label it “official” or “verified” until each record has been checked against Bangladesh Post sources.

Official Bangladesh Post reference pages include:
- https://bdpost.gov.bd/pages/static-pages/6922dc7d933eb65569e10a5f
- https://bdpost.gov.bd/pages/static-pages/6922df1f933eb65569e1fffe

Some official pages may contain blank-code rows or spelling variations. Check the official postal authority before using a code for delivery-critical purposes.

## Next development
- Add admin authentication and CRUD
- Add CSV import/export with duplicate checking
- Verify the imported records against official postal publications
- Add the remaining countries and territories

## Version 3.0 — Protected Admin Dashboard

### Important: keep your downloaded database
Your existing `data/bangladesh-postcodes.json` contains the 1,347 records you downloaded. **Do not delete or replace that file** when updating this project. This ZIP intentionally does not include an empty database file.

### Update the existing project
1. Stop the running server with `Ctrl+C`.
2. Extract this ZIP to a temporary folder.
3. Copy `server.js`, `package.json`, `.env.example`, `.gitignore`, and the `public` and `scripts` folders into your existing project, replacing files when prompted.
4. Keep your existing `data/bangladesh-postcodes.json` file.
5. Open CMD in the project folder and run:

```bash
npm install
node scripts/create-admin-hash.js
```

The setup script asks for a username and a password (the password is hidden while typing). Use a password with at least 12 characters. Copy the three generated lines into a new file named `.env` in the project root. Never share or upload `.env`.

Then start the website:

```bash
npm start
```

Open the public website at `http://localhost:3000` and the admin panel at `http://localhost:3000/admin`.

### Admin features
- Password-protected login, signed HTTP-only session cookie, 8-hour session expiry, and login attempt throttling.
- Add, edit and delete Bangladesh postal records.
- Search/filter existing records.
- CSV import with duplicate checks and CSV export.
- Optional Bangla names and an explicit independently-verified checkbox.

### Security / deployment notes
- Use a unique strong admin password and keep `.env` private.
- On Render or another HTTPS host, set `NODE_ENV=production` and configure `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, and `SESSION_SECRET` as private environment variables in the hosting dashboard. Do not commit `.env`.
- The current data store is a JSON file on disk. On hosts with ephemeral filesystems, configure a persistent disk or migrate to a database before relying on admin edits in production.
- This is a starter admin console. Add HTTPS, backups, audit logs, CSRF protections and a persistent database before using it for a public production service.
