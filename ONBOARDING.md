# FleetPro — Setup Guide for IT Staff

This guide gets you set up to work on FleetPro with Claude Code.

## Before you start

Get these from Makinde:

1. **GitHub access**: accept the collaborator invite for `makindearibo-arch/fleetpro` (check your email).
2. **Secret keys**, sent over a secure channel such as 1Password:
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   - `VITE_TRACCAR_URL`, `VITE_TRACCAR_EMAIL`, `VITE_TRACCAR_PASSWORD`, `VITE_GOOGLE_MAPS_KEY`

> ⚠️ The service role key gives **full control of the live database**. Never share it, paste it in chat, or commit it to GitHub.

---

## One-time setup (about 20 minutes)

### Step 1: Install these tools
Accept the default options for each.

- **Git**: https://git-scm.com/download/win
- **Node.js (LTS version)**: https://nodejs.org
- **Python 3**: https://python.org (tick **"Add Python to PATH"** during install)
- **Claude desktop app**: https://claude.ai/download. Sign in with your own Claude account.

### Step 2: Download the project
Open PowerShell and run:

```bash
cd $HOME\Documents
git clone https://github.com/makindearibo-arch/fleetpro.git
```

If it asks you to sign in, use your GitHub account.

### Step 3: Add the secret keys
In the new `Documents\fleetpro` folder, create two text files:

- **`.env`**, containing:
  ```
  VITE_TRACCAR_URL=...
  VITE_TRACCAR_EMAIL=...
  VITE_TRACCAR_PASSWORD=...
  VITE_GOOGLE_MAPS_KEY=...
  ```
- **`SupabaseCreds.env`**, containing:
  ```
  SUPABASE_URL=...
  SUPABASE_SERVICE_ROLE_KEY=...
  ```

These files are excluded from GitHub (via `.gitignore`), so they stay private on your computer.

### Step 4: Install the project's dependencies

```bash
cd $HOME\Documents\fleetpro
npm install
```

### Step 5: Open the project in Claude
Open the Claude desktop app, go to the **Code** tab, and pick the `Documents\fleetpro` folder.

Claude automatically reads `CLAUDE.md`, a file in the project that explains how FleetPro works. That gives your Claude the same background on the project as Makinde's.

### Step 6: Test it
Ask Claude: *"Run the app locally so I can see it."* FleetPro should open in a browser.

---

## Daily rules (important)

### How your changes reach the live site

You **can't push directly to `main`**, because GitHub blocks it. Every change goes through Makinde for approval first:

1. **Start each task:** tell Claude *"Pull the latest changes and start a new branch for [what you're doing]."*
2. **Do the work** with Claude and test it locally.
3. **When you finish:** tell Claude *"Commit, push, and open a pull request."*
4. Vercel automatically builds a **preview website** of your changes and posts the link on the pull request. Send Makinde the pull request link.
5. Makinde checks the preview and approves it. Your change then goes live.
6. If Makinde asks for changes, tell Claude what to fix and *"push the update to the same pull request."*

### Other rules

1. **Keep each pull request to one task** (one fix or one feature). Small pull requests are quick to review.
2. **Coordinate with Makinde on `src/App.jsx`.** Most of the app lives in this one large file, so two people changing the same part at once creates conflicts.
3. **Scripts in `scripts/` change the real database immediately.** A pull request doesn't protect against this. Always run scripts first *without* `--apply` (a preview), and check with Makinde before running anything with `--apply`.

## Sharing knowledge with Makinde's Claude

Each person's Claude keeps its own private notes on their own computer. **Only `CLAUDE.md` is shared.** If you learn something important about the project (a new table, a gotcha, a finished feature), ask Claude to *"add this to CLAUDE.md"*, then commit and push. Makinde's Claude will see it on the next pull.

## Troubleshooting

- **`git` says `index.lock` exists**: run `del .git\index.lock` in the fleetpro folder, then try again.
- **Push rejected ("fetch first")**: someone pushed before you. Tell Claude: *"Pull and merge the latest changes, then push."*
- **Live Map shows nothing locally**: check that your `.env` file has the 4 `VITE_...` values, then restart `npm run dev`.
