# Push to GitHub & Host on GitHub Pages (prassu017)

Your portfolio: **https://prassu017.github.io/prasanna-portfolio/**  
This project will live at: **https://prassu017.github.io/seattle-crime-dashboard/**

---

## Step 1: Create the repo on GitHub

1. Go to **https://github.com/new**
2. **Repository name:** `seattle-crime-dashboard`
3. **Visibility:** Public
4. Do **not** add a README, .gitignore, or license (this project already has them).
5. Click **Create repository**.

---

## Step 2: Push the code

In your terminal, from the project folder:

```bash
cd /Users/prasanna/Downloads/seattle-crime-dashboard

# If you haven't already, add the remote (already done if you ran the setup):
# git remote add origin https://github.com/prassu017/seattle-crime-dashboard.git

git push -u origin main
```

If GitHub asks for login, use your credentials or a Personal Access Token (Settings → Developer settings → Personal access tokens).

---

## Step 3: Deploy to GitHub Pages

Build and push the site to the `gh-pages` branch (same idea as your portfolio):

```bash
cd /Users/prasanna/Downloads/seattle-crime-dashboard
npm run deploy:gh
```

`deploy:gh` builds with `BASE_PATH=/seattle-crime-dashboard/` so the app works at `prassu017.github.io/seattle-crime-dashboard/`.

---

## Step 4: Turn on GitHub Pages

1. On GitHub, open **prassu017/seattle-crime-dashboard**
2. Go to **Settings** → **Pages**
3. Under **Build and deployment**:
   - **Source:** Deploy from a branch
   - **Branch:** `gh-pages` → **/(root)** → **Save**
4. Wait 1–2 minutes. Your site will be at:

   **https://prassu017.github.io/seattle-crime-dashboard/**

---

## Later: update the live site

After you change code:

```bash
git add .
git commit -m "Your message"
git push origin main
npm run deploy:gh
```

---

## Optional: add to your portfolio

To link from [prassu017.github.io/prasanna-portfolio](https://prassu017.github.io/prasanna-portfolio/), add a project card that points to:

**https://prassu017.github.io/seattle-crime-dashboard/**
