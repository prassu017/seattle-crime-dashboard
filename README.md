# Seattle Crime Dashboard (SPD Crime Data 2008-Present)

Interactive web dashboard built from Seattle Open Data (data.seattle.gov) using the Socrata API.

Dataset/API:
- Dataset: **SPD Crime Data: 2008-Present** (dataset id: `tazs-3rd5`)
- API endpoint (SODA2): https://data.seattle.gov/resource/tazs-3rd5.json

## Rubric (assignment requirements)

| Points | Requirement | How this dashboard meets it |
|--------|-------------|-----------------------------|
| 5 | At least 3 different chart types | **Line chart** (Plotly – incidents over time), **bar chart** (Plotly – top offense groups), **map** (Leaflet – incident locations) |
| 5 | Interactivity (filter or highlight) between charts | Click a bar in the offense-group chart to **cross-filter** the time series and map to that group |
| 5 | At least 1 filter applying to one or more charts | **Date range**, **Precinct**, and **Crime-against category** filters apply to all three charts |
| 5 | Clear header / title, lead-in text, and data source call-out | Title, subtitle/lead-in, and **Data source: City of Seattle Open Data – SPD Crime Data (tazs-3rd5)** at the top |

## Local setup (run in Cursor / terminal)

Prereqs:
- Node.js 18+ recommended

**If you see "command not found" for `npm` or `node`:** Node isn’t installed. Install it from [nodejs.org](https://nodejs.org) (download the LTS macOS installer), then **quit and reopen Terminal** (or restart Cursor) before running the steps below.

Steps:
```bash
npm install
npm run dev
```

Open the printed localhost URL.

## Build for production
```bash
npm run build
npm run preview
```

## Deploy to GitHub Pages (portfolio hosting)

**Full step-by-step guide:** see **[SETUP_AND_DEPLOY.md](./SETUP_AND_DEPLOY.md)** for creating the repo, pushing code, and enabling Pages.

Quick deploy (after repo exists and you’ve pushed at least once):

```bash
npm run deploy:gh
```

Then in GitHub: **Settings → Pages** → Source: **Deploy from a branch** → Branch: **gh-pages** / **(root)**.

Site URL: `https://<your-username>.github.io/seattle-crime-dashboard/`  
(Use a different repo name? Run: `BASE_PATH=/your-repo-name/ npm run deploy`.)

## Notes
- The full dataset is very large, so the dashboard loads a bounded date window by default (last 365 days).
- If you pick a very large date range, loading may slow down (the app paginates requests).
- If you want faster loads, keep the date range narrower.
