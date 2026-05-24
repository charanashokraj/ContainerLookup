# Container Tracking System

A free, open-source web application that automates the weekly container tracking process described in the SOP. Hosted on **GitHub Pages** with CI/CD via **GitHub Actions**.

## Features

- **Upload SAP Reports** — drag-and-drop Excel (`.xlsx`) or CSV files exported from SAP
- **Automatic decision engine** — compares SAP status vs carrier tracking data and suggests the correct action (no update / update ETA / add discharged / add released / add empty returned / pending review)
- **Priority sorting** — high-risk containers (overdue, stuck at port) appear at the top automatically
- **Dashboard** — summary cards showing counts by status and priority
- **Carrier tracking links** — one-click "Open Carrier Tracking" button for CMA CGM, ANL, MSC, ONE, Maersk, Hapag-Lloyd, Evergreen, Yang Ming
- **Manual tracking entry** — enter carrier dates (discharge, release, empty return) to trigger re-evaluation
- **Approval workflow** — approve suggested updates with a single click
- **Check history** — per-container history of who checked what and when
- **Export** — generate SAP update report (Excel) or full weekly report
- **Persistent state** — data is saved to browser `localStorage`, survives page refreshes

## Hosted URL

```
https://<your-github-username>.github.io/ContainerLookup/
```

## Setup — Hosting on GitHub Pages

### 1. Create the GitHub repository

1. Go to [github.com](https://github.com) and create a new **public** repository named `ContainerLookup`
2. Do **not** initialise with a README (you already have one)

### 2. Push this code

```bash
git init
git add .
git commit -m "Initial commit — Container Tracking System"
git branch -M main
git remote add origin https://github.com/<your-username>/ContainerLookup.git
git push -u origin main
```

### 3. Enable GitHub Pages

1. Go to your repository → **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. The workflow at `.github/workflows/deploy.yml` will automatically build and deploy on every push to `main`

### 4. Access the app

After the first workflow run completes (~2 minutes), your app will be live at:

```
https://<your-username>.github.io/ContainerLookup/
```

## SAP Report Format

Upload any Excel or CSV file with these column headers (names are flexible — the system matches common aliases):

| Required | Column Name |
|----------|-------------|
| ✅ | Booking Number |
| ✅ | Container Number |
| ✅ | Shipping Line / Carrier |
| ✅ | SAP ETA |
| ✅ | Current SAP Status |
| ✅ | Last Event Date |
| ✔ Recommended | Destination Port |
| ✔ Recommended | Customer / Importer |
| ✔ Recommended | Contract / Reference |
| ✔ Recommended | Vessel / Voyage |
| ✔ Recommended | POD |

## SAP Status Values

The system recognises these SAP status values (case-insensitive):

| SAP Status | Maps To |
|---|---|
| In Transit, Shipped, On Board, Loaded | `IN_TRANSIT` |
| Discharged, Arrived, Port Arrival | `DISCHARGED` |
| Released, Picked Up, Gate Out, Delivered | `RELEASED` |
| Empty Returned, Gate In Empty | `EMPTY_RETURNED` |

## Technology Stack

All open-source, all free:

| Tool | Purpose |
|---|---|
| [React 18](https://react.dev) | UI framework |
| [Vite](https://vitejs.dev) | Build tool |
| [TypeScript](https://typescriptlang.org) | Type safety |
| [Tailwind CSS v4](https://tailwindcss.com) | Styling |
| [Zustand](https://zustand-demo.pmnd.rs) | State management |
| [PapaParse](https://papaparse.com) | CSV parsing |
| [SheetJS (xlsx)](https://sheetjs.com) | Excel parsing & export |
| [Lucide React](https://lucide.dev) | Icons |
| [date-fns](https://date-fns.org) | Date utilities |
| [GitHub Pages](https://pages.github.com) | Hosting |
| [GitHub Actions](https://github.com/features/actions) | CI/CD |

## Local Development

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173/ContainerLookup/`

## Future Enhancements

- [ ] Carrier API integration (CMA CGM, Maersk APIs — both have free tiers)
- [ ] SAP direct integration (RFC/BAPI calls)
- [ ] Multi-user support via Supabase (free tier)
- [ ] Email/Teams alerts for high-priority containers
- [ ] Demurrage / detention free time calculation
- [ ] Scheduled auto-tracking via GitHub Actions cron jobs
