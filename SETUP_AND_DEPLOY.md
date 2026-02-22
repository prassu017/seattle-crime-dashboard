# Full Setup & Deploy Guide — Seattle Crime Dashboard

Use this guide to run the project locally in Cursor and host it on GitHub (e.g. for your portfolio).

---

## Part 1: Run locally in Cursor

### 1.1 Prerequisites

- **Node.js 18+** (includes `npm`).  
  If you see `command not found` for `node` or `npm`:
  - Install from [nodejs.org](https://nodejs.org) (LTS), or
  - Use nvm:  
    `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash`  
    then `nvm install 24` and in new terminals: `\. "$HOME/.nvm/nvm.sh"`

### 1.2 Open project in Cursor

- **File → Open Folder** → choose the project folder (e.g. `seattle-crime-dashboard`).
- Or from terminal: `cursor /path/to/seattle-crime-dashboard`

### 1.3 Install and run

In the project folder, in Cursor’s terminal (or your system terminal):

```bash
cd /path/to/seattle-crime-dashboard   # or just cd seattle-crime-dashboard if already there
npm install
npm run dev
```

- Open the URL Vite prints (e.g. **http://localhost:5173**).

---

## Part 2: Push to GitHub and host on GitHub Pages

### 2.1 Create a GitHub repo

1. On GitHub: **New repository**.
2. Name it (e.g. `seattle-crime-dashboard`).  
   Your site will be: `https://<your-username>.github.io/seattle-crime-dashboard/`
3. Do **not** add a README, .gitignore, or license (we already have them).

### 2.2 Initialize git and push (first time)

In the project folder:

```bash
git init
git add .
git commit -m "Initial commit: Seattle Crime Dashboard"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/seattle-crime-dashboard.git
git push -u origin main
```

Replace `<YOUR_USERNAME>` with your GitHub username. Use your repo URL if the name is different.

### 2.3 Set base path for GitHub Pages

The app must know it’s served from `https://username.github.io/repo-name/`.

**Option A — Use the deploy script (repo name `seattle-crime-dashboard`):**

```bash
npm run deploy:gh
```

**Option B — Different repo name:** set `BASE_PATH` to your repo name (with leading and trailing slash):

```bash
BASE_PATH=/my-repo-name/ npm run deploy
```

### 2.4 Turn on GitHub Pages

1. GitHub → your repo → **Settings** → **Pages**.
2. **Build and deployment**:
   - **Source:** Deploy from a branch
   - **Branch:** `gh-pages` → **/(root)** → Save.
3. Wait 1–2 minutes. Your site will be at:
   - `https://<YOUR_USERNAME>.github.io/seattle-crime-dashboard/`  
   (or `https://<YOUR_USERNAME>.github.io/<repo-name>/` if you used a different repo name).

### 2.5 Later updates (code changes)

```bash
git add .
git commit -m "Describe your change"
git push origin main
```

Then redeploy the site:

```bash
npm run deploy:gh
```

(or `BASE_PATH=/your-repo-name/ npm run deploy` if different).

---

## Rubric checklist (assignment)

| Requirement | How this project meets it |
|-------------|---------------------------|
| **5 pts – At least 3 chart types** | 1) Time-series line chart (Plotly), 2) Horizontal bar chart (Plotly), 3) Interactive map (Leaflet). |
| **5 pts – Interactivity between charts** | Clicking a bar in the offense-group chart filters the time series and map to that group. |
| **5 pts – At least 1 filter** | Date range, Precinct, and Crime-against category filters apply to all charts. |
| **5 pts – Clear header, lead-in, data source** | Title, subtitle/lead-in text, and data source call-out (Seattle Open Data, dataset ID, API URL) at the top. |

---

## API and data

- **Endpoint:** `https://data.seattle.gov/resource/tazs-3rd5.json`
- **Dataset:** SPD Crime Data: 2008–Present (data.seattle.gov).
- **Note:** The API returns at most 1,000 rows per request by default. The app uses `$limit` and `$offset` to page and load more; for large date ranges, loading can be slower.

---

## Troubleshooting

- **`command not found: npm`**  
  Install Node.js (see 1.1) and restart the terminal (or Cursor).

- **Blank page or wrong paths on GitHub Pages**  
  Redeploy with the correct base:  
  `BASE_PATH=/your-exact-repo-name/ npm run deploy`  
  and ensure **Pages** uses the `gh-pages` branch, root.

- **API or CORS errors**  
  The Socrata API allows browser requests. If you see errors, narrow the date range and try again.

- **Map or charts not loading**  
  Hard-refresh (Ctrl+Shift+R / Cmd+Shift+R) or clear cache.

---

## Project structure (reference)

```
seattle-crime-dashboard/
├── index.html
├── package.json
├── vite.config.js
├── README.md
├── SETUP_AND_DEPLOY.md   ← this file
├── .gitignore
└── src/
    ├── main.jsx
    ├── App.jsx
    └── styles.css
```

You now have a single folder you can run in Cursor and deploy to GitHub for your portfolio.
