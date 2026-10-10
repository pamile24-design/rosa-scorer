# ROSA Scorer (individual entries)

A static website that scores a single Rapid Office Strain Assessment (ROSA) workstation. It has no build step and no server code, and it works offline after the first visit.

The scoring charts in `engine.js` were checked cell by cell against the ROSA worksheet (Sonne, Villalta & Andrews, 2012).

## Files

| File | What it does |
|---|---|
| `index.html` | The page |
| `styles.css` | Layout and colours (light and dark mode) |
| `engine.js` | ROSA scoring charts and calculation |
| `app.js` | Form, saved entries, CSV export |
| `sw.js`, `manifest.webmanifest`, `icon.svg` | Offline use and "Add to Home screen" |
| `render.yaml` | Optional settings for Render |

## Put it online with Vercel

1. Go to github.com, sign in, and click **New repository**. Name it `rosa-scorer`, keep it Public or Private, and click **Create repository**.
2. On the new repository page, click **uploading an existing file**. Drag in all the files from this folder (not the folder itself) and click **Commit changes**.
3. Go to vercel.com and sign in with GitHub.
4. Click **Add New → Project**, then **Import** next to `rosa-scorer`.
5. Leave Framework Preset as **Other**, with no build command and no output directory. Click **Deploy**.
6. After about a minute you get a link like `rosa-scorer.vercel.app`.

## Or put it online with Render

1. Do steps 1–2 above to put the files on GitHub.
2. Go to render.com, click **New → Static Site**, and connect the `rosa-scorer` repository.
3. Leave **Build Command** empty and set **Publish Directory** to `.` (a single dot). Click **Create Static Site**.

## Using it on your phone

Open the link in Chrome, tap **⋮ → Add to Home screen**, and open it from the new icon. Once it has loaded one time, it also works without data or Wi-Fi.

## Your data

Saved entries stay in the browser on that device. Nothing is sent anywhere. Tap **Download CSV** after each data-collection session to keep a copy. The CSV opens in Excel or SPSS and can be imported into the batch ROSA Scorer.

## Updating

Edit a file on GitHub and commit. Vercel or Render redeploys it automatically.
