# Jataka Index

Build a complete, production-ready web application called Jataka Management System (JMS).

Purpose

This application is for an astrologer's office.

We create handwritten physical Jataka (horoscope) books for clients. Each client receives one unique physical Jataka, and every physical Jataka has one manually assigned Jataka Number written with a pen on the cover.

The web application is NOT for generating horoscopes.

It is only a digital index and management system that helps us quickly find the correct physical Jataka whenever a client returns.

The application should look modern, professional, clean, responsive, and work perfectly on both desktop and mobile.

Users

Admin

The admin enters new clients, edits records, changes statuses, and manages the database.

Astrologer

The astrologer only searches and views records from a mobile phone.

The astrologer must NOT be able to edit or delete data.

Authentication

Create a login page.

Support two user roles:

Admin

Astrologer

Dashboard

Display:

Total Jatakas

Preparing Count

Ready Count

Collected Count

Recent Entries

Add New Jataka

Fields:

Jataka Number (Required, entered manually)

Client Name (Optional)

Date of Birth (Required)

Time of Birth (Required)

Father's Name (Optional)

Mother's Name (Optional)

Phone Number (Optional)

Place (Optional)

Status

Status options:

Preparing

Ready

Collected

Default status:

Preparing

Automatically save Created Date and Time when the record is created.

Created Date should be viewable later but does not need to be entered manually.

Jataka Number

Jataka Number is entered manually.

Do NOT auto-generate it.

Before saving:

Check if that Jataka Number already exists.

If it exists:

Show:

"This Jataka Number already exists."

Do not allow duplicates.

Editing

Admin can edit ANY field at ANY time.

Editable fields:

Jataka Number

Client Name

DOB

TOB

Father's Name

Mother's Name

Phone

Place

Status

Duplicate Detection

Before saving a new record:

If another record has the same combination of:

Name

DOB

TOB

OR

Phone Number

Show a warning:

"Possible duplicate found."

Show the matching record(s).

Allow the admin to either:

Open Existing Record

Save Anyway

This is only a warning.

Do NOT block saving.

Search

The search system is the most important feature.

Create ONE smart search box.

As the user types, show live matching suggestions instantly without pressing Search.

Search across all fields:

Jataka Number

Client Name

DOB

TOB

Father's Name

Mother's Name

Phone Number

Place

Example:

Typing:

Ravi

should immediately show all Ravi records.

Typing:

9845

should immediately show matching phone numbers.

Typing:

12/12/1997

should show DOB matches.

Typing:

731

should show Jataka Number 731.

Typing:

Narayana

should show Father's Name matches.

Search should be fast even with over 100,000 records.

Advanced Search

Also provide an Advanced Search page.

Fields:

Jataka Number

Client Name

DOB

TOB

Father's Name

Mother's Name

Phone

Place

Status

Every field is optional.

The search should filter using only the fields entered.

Example:

DOB only

returns everyone with that DOB.

DOB + Phone

returns only matching records.

DOB + Father Name

returns only those matching both.

The more information entered, the fewer results.

Search Results

Each result should display:

Status icon

Jataka Number

Client Name

DOB

TOB

Father's Name

Mother's Name

Phone

Place

Status colours:

🟡 Preparing

🟢 Ready

⚫ Collected

Sort results in this order:

Ready

Preparing

Collected

Collected records should appear slightly faded but remain fully readable.

Do NOT hide collected records.

Live Suggestions

While typing in the search bar:

Show a dropdown of matching records.

Each suggestion should include:

Status icon

Jataka Number

Client Name

DOB

Phone Number

Selecting a suggestion opens the full client record.

Client Details Page

Display:

Jataka Number

Name

DOB

TOB

Father's Name

Mother's Name

Phone

Place

Status

Created Date

Admin should see:

Edit button.

Astrologer should NOT.

Recent Entries

Dashboard should show recently added Jatakas.

Display:

Status

Jataka Number

Name

Mobile Design

The application must work beautifully on mobile phones.

The astrologer mainly uses a mobile phone to search.

Searching must be extremely fast and simple.

Desktop Design

The admin mainly uses a laptop.

Design should be optimized for keyboard data entry.

Database

Use PostgreSQL (or another production-grade relational database).

Design proper indexes for fast searching.

Searching should remain fast even with more than 100,000 records.

API

Create a complete REST API (or modern equivalent).

Security

Password hashing

Secure authentication

Role-based permissions

HTTPS ready

UI Style

Modern.

Professional.

Minimal.

Fast.

Use a clean layout similar to modern business software.

No unnecessary animations.

No clutter.

Technology Stack

Frontend:

React

TypeScript

Tailwind CSS

Backend:

Node.js

Express

Database:

PostgreSQL

ORM:

Prisma

Authentication:

JWT

Additional Requirements

Responsive design.

Clean code.

Production-ready folder structure.

Error handling.

Loading indicators.

Form validation.

Fast search.

No dummy pages.

Build the complete working application.

The application should feel like professional business software, not a student project.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://jataka-book-finder.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2bd644f0-3b59-4f71-ae4b-62cc55f4d4dd).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

### Create your first user

There is no public sign-up. Create the first user from the command line (works for local and for Turso):

```sh
npm run create-user -- admin "YourPassword" "Your Name"
```

After that, you can add/reset/delete users from **Settings** in the app. Everyone who can sign in has full access.

### Database

- **Local**: with no env vars set, a SQLite file is created at `data/jataka.db` (git-ignored).
- **Production (Netlify)**: uses [Turso](https://turso.tech) (hosted SQLite). Netlify functions have no persistent disk, so a local file can't be used there.

### Deploy to Netlify

1. Create a Turso database and token: `turso db create jataka` then `turso db show jataka --url` and `turso db tokens create jataka`.
2. In Netlify → Site configuration → Environment variables, add `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` (see `.env.example`).
3. Deploy (build settings come from `netlify.toml`).
4. Create the first user against Turso from your machine:
   `TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npm run create-user -- admin "YourPassword"`
   (PowerShell: set `$env:TURSO_DATABASE_URL` / `$env:TURSO_AUTH_TOKEN` first.)

## Android app (no web hosting needed)

The Android app is the same UI bundled inside the APK (Capacitor). It talks directly to the Turso cloud database, so every phone that installs it sees the same records. Records you have opened are cached on the phone and stay readable offline; adding/editing needs internet.

Roles: **admin** can add/edit/delete and manage users; **astrologer** can only search and view. Create users with a role in **Settings** (admin only).

1. Create a Turso database and token (see above), then copy your local data once:
   `$env:TURSO_DATABASE_URL="libsql://..."; $env:TURSO_AUTH_TOKEN="..."; npm run migrate-to-turso`
2. Put `VITE_TURSO_DATABASE_URL` and `VITE_TURSO_AUTH_TOKEN` in `.env.local` (git-ignored; see `.env.example`). They are baked into the APK, so use a dedicated token.
3. Build: `npm run android:sync`, then either
   - `npm run android:open` and use Android Studio → Build → Build APK(s), or
   - push to GitHub and run the **Build Android APK** workflow (add the two `VITE_TURSO_*` values as repository secrets); download `app-debug.apk` from the run artifacts.
4. Send the APK to any phone and install it (allow "install unknown apps").
