# Progress — a personal coding & progress dashboard

## 🚀 Progress Dashboard

<a href="https://everlasting12.github.io/progress-dashboard/" target="_blank">
  <img src="https://img.shields.io/badge/🚀%20Open%20Progress%20Dashboard-2ea44f?style=for-the-badge&logo=github&logoColor=white" alt="Open Progress Dashboard" />
</a>

A single-user dashboard for tracking daily progress in anything: DSA, LeetCode, Java, fitness, reading, side projects. Each tracker gets its own metrics, GitHub-style contribution heatmap, streaks and analytics.

There is no backend. The app is a static React site hosted free on **GitHub Pages**, and your data lives as **JSON files in a GitHub repository**, read and written through the GitHub REST API with a personal access token that never leaves your browser.

> **This is designed for one person.** The token is stored in your browser's `localStorage` and every edit is a commit made as you. Don't deploy it for other people to log into.

---

## 1. Project overview

| Piece   | Choice                                                                              |
| ------- | ----------------------------------------------------------------------------------- |
| UI      | React 19, TypeScript (strict), Tailwind CSS 4                                       |
| Build   | Vite                                                                                |
| Charts  | Recharts                                                                            |
| Routing | `HashRouter` (`/#/analytics`) so GitHub Pages needs no 404 redirect trick           |
| Storage | `data/dashboards.json`, `data/activity.json`, `data/settings.json` in a GitHub repo |
| Sync    | GitHub REST "contents" API, with an offline queue in `localStorage`                 |
| Hosting | GitHub Pages via GitHub Actions                                                     |

```
src/
├── types/            Data model (Dashboard, Metric, ActivityEntry, PendingOp …)
├── lib/
│   ├── date.ts       Timezone-safe calendar math on YYYY-MM-DD keys
│   ├── streaks.ts    Streak calculation (current / longest / shortest)
│   ├── analytics.ts  Ranges, bucketing, summaries, distributions
│   ├── activity.ts   Totals and the "is this day active?" rule
│   ├── ops.ts        Replays pending edits on top of remote files (conflict-safe merge)
│   ├── validate.ts   Defensive parsing of JSON from GitHub / backups
│   └── defaults.ts   Default DSA dashboard, templates, default settings
├── services/
│   ├── github.ts     GitHub API client (read/write JSON, test connection)
│   ├── sync.ts       Pull all files; push one file with sha + retry on conflict
│   └── storage.ts    localStorage: token config, cached data, pending queue
├── store/AppStore.tsx  App state, mutations, background sync, online/offline handling
├── hooks/            useDashboardStats, useOverallStats, useCountUp, …
├── components/       Heatmap, StreakCards, EntrySheet, DashboardEditor, charts, UI kit
└── pages/            Home, Dashboards, DashboardView, Analytics, History, Settings
```

The engine is generic: nothing outside `lib/defaults.ts` knows what "DSA" is.

## 2. Features

- **Multiple dashboards**, created and configured in the UI: name, description, emoji icon, colour, metrics, active-day rule. Duplicate, rename, delete, set a default. Starter templates for LeetCode, learning, fitness, reading and projects.
- **Configurable metrics** of four types: whole number, decimal, hours, yes/no. Each has a unit, a stepper increment, and an "in total" flag.
- **Fast daily entry**: one "Add today's progress" button (floating button on mobile), +/- steppers, date navigation, edit or delete any past day. Clicking a heatmap cell opens that day.
- **Contribution calendar** per dashboard plus a combined one on the home page, in the style of LeetCode / takeUforward consistency calendars: contribution count, a picker for "Last year" or any calendar year you have data for, five intensity levels, hover tooltips, and an "Activity on <date>" timeline under the grid for whichever day you click.
- **Streaks**: current, longest, shortest (completed), with an optional grace period.
- **Stats**: total active days, total activity, this week / month / year, all-time totals per metric.
- **Analytics**: 7 days, 30 days, 90 days, 6 months, 1 year, all time. Per-metric or total. Trend chart with 7-day average, weekly/monthly summaries, day-of-week distribution, metric breakdown, average per day and per active day, active and inactive days, best day.
- **History**: every entry grouped by month, filterable by dashboard, editable.
- **GitHub sync** with sha-based conflict handling, an offline queue, automatic retry, and a visible status ("Synced with GitHub", "Pending sync", "Offline", "Sync failed").
- **Multi-device**: configure the same repo and token on any device.
- **Light and dark mode**, date format, first day of week, timezone (default `Asia/Kolkata`).
- **Backup**: export everything to one JSON file and import it again.

## 3. Local development

Requires Node.js 20 or newer (22 recommended).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-checks, then builds to dist/
npm run preview    # serves dist/ locally
```

The app works immediately in "Local only" mode, saving to your browser. Connect GitHub in **Settings** whenever you're ready; everything you logged locally is uploaded on the first sync.

## 4. GitHub repository setup

1. Create a repository on GitHub, for example `progress-dashboard`.
2. Push this project to it:

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/progress-dashboard.git
   git push -u origin main
   ```

The `data/` folder ships with a default `DSA` dashboard and empty activity, so the app has something to read on first run. If the files are missing, the app creates them.

### Keeping your data private (recommended)

Free GitHub Pages requires a **public** repository, which means `data/activity.json` would be public too. If you'd rather keep your progress private:

1. Keep this app in a public repo (for Pages).
2. Create a second, **private** repository, e.g. `progress-data`.
3. In the app's Settings, point **Repository name** at `progress-data`.
4. Give your token access to `progress-data` only.

The app doesn't care which repo holds the data. GitHub Pro users can host Pages from a private repo and use one repo for everything.

## 5. GitHub Pages setup

1. Open the repository on GitHub → **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push to `main` (or run the workflow manually from the **Actions** tab).
4. When the "Deploy to GitHub Pages" workflow finishes, the site is live at
   `https://<your-username>.github.io/<repository-name>/`.

The workflow in `.github/workflows/deploy.yml` runs `npm ci` and `npm run build`, then publishes `dist/`. Vite's `base` is `./` (relative asset paths), so the same build works under any repository name, including a `<username>.github.io` repo, without editing config.

**Saving progress never triggers a redeploy.** The workflow ignores changes under `data/**`, and every data commit also carries `[skip ci]`.

Pipeline:

```
push to main → GitHub Actions → npm ci && npm run build → upload dist/ → deploy to GitHub Pages
```

## 6. Creating a fine-grained personal access token

1. GitHub → your avatar → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. **Token name**: `progress-dashboard`.
3. **Expiration**: your choice. 90 days or a year is reasonable; you'll paste a new one when it expires.
4. **Resource owner**: your account.
5. **Repository access**: **Only select repositories** → pick the repo that holds your data (and nothing else).
6. **Permissions → Repository permissions → Contents: Read and write**. "Metadata: Read-only" is added automatically. Leave everything else at "No access".
7. Generate, copy the token (`github_pat_…`) and paste it into the app's **Settings → GitHub connection**.
8. Click **Test GitHub connection**, then **Save and sync**.

## 7. Required repository permissions

| Permission | Level                 | Why                                  |
| ---------- | --------------------- | ------------------------------------ |
| Contents   | Read and write        | Read and commit the three JSON files |
| Metadata   | Read-only (automatic) | Look up the repository and branch    |

Nothing else is needed. The token cannot touch other repositories, Actions, settings or your account.

## 8. How data storage works

Three files live in the data folder (default `data/`, configurable):

**`dashboards.json`** — dashboard definitions

```json
{
  "version": 1,
  "dashboards": [
    {
      "id": "dsa",
      "name": "DSA",
      "description": "Daily data structures and algorithms practice",
      "icon": "🧠",
      "color": "#2f9e76",
      "metrics": [
        {
          "id": "problemsSolved",
          "name": "Problems solved",
          "type": "count",
          "unit": "problems",
          "step": 1,
          "includeInTotal": true
        },
        {
          "id": "studyHours",
          "name": "Study hours",
          "type": "duration",
          "unit": "h",
          "step": 0.5,
          "includeInTotal": true
        }
      ],
      "threshold": { "metricId": "problemsSolved", "min": 1 },
      "createdAt": "…",
      "updatedAt": "…"
    }
  ]
}
```

**`activity.json`** — one entry per dashboard per day

```json
{
  "version": 1,
  "entries": {
    "dsa": {
      "2026-09-19": {
        "values": {
          "problemsSolved": 3,
          "easy": 1,
          "medium": 2,
          "hard": 0,
          "studyHours": 2
        },
        "note": "Two-pointer day",
        "updatedAt": "2026-09-19T14:03:11.201Z"
      }
    }
  }
}
```

Compared to the simpler `{ dsa: { date: values } }` shape, values sit under `values` so each day can also carry a note and an `updatedAt` timestamp, which is what makes cross-device conflict resolution possible. The importer still accepts the simpler shape.

**`settings.json`** — theme, date format, week start, timezone, default dashboard, streak grace period. Synced so they follow you across devices.

**Never stored in the repo:** the token and repository connection settings. Those stay in `localStorage` under `pd:github`.

In the browser, `localStorage` also holds `pd:cache` (last known copy of the three files) and `pd:pending` (edits not yet committed).

## 9. How synchronization works

Every edit (save entry, delete entry, change a dashboard, change a setting) is recorded as an **operation** and appended to the pending queue in `localStorage` _before_ anything is sent to GitHub. The UI shows your data as "cached files + pending operations", so edits appear instantly and survive reloads, crashes and lost connections.

Syncing one file:

1. **GET** the latest file from GitHub, including its blob `sha`.
2. **Replay** this device's pending operations on top of that fresh copy.
3. **PUT** the result with that `sha`.
4. If GitHub answers **409/422** (the file changed since step 1 — e.g. your phone saved a moment ago), go back to step 1. Up to four attempts.
5. Only after a successful PUT are those operations removed from the queue.

Because edits are replayed rather than uploaded as a whole file, saving on your laptop never wipes out an entry you added on your phone. When two devices edit the **same** day, the edit with the newer `updatedAt` wins.

When sync fails:

- **Offline**: status shows "Offline · N pending". Sync resumes automatically on the browser's `online` event.
- **GitHub error**: a banner explains what went wrong (bad token, missing permission, wrong repo/branch, rate limit) with a **Retry** button. Retries also happen every 30 seconds.
- Nothing is dropped: pending operations stay in `localStorage` until GitHub confirms them.

On load and whenever the tab regains focus (at most once a minute), the app pulls the latest files so a second device stays current.

## 10. How streaks are calculated

Implemented in `src/lib/streaks.ts`.

**Active day.** A day is active for a dashboard when its threshold is met, e.g. `Problems solved ≥ 1`. The threshold can use any metric or the day's total activity.

**Run.** A maximal sequence of consecutive calendar days that are all active. Any inactive day ends the run. Future dates are ignored. Dates are calendar days in your configured timezone.

**Current streak.** Length of the run that ends today. If today is inactive, the current streak is 0.

**Grace period** (Settings → Dashboards and streaks, default 0). With a grace of _G_ days, a run that ended up to _G_ days ago still counts as current. With `G = 1` you can open the app in the morning and still see yesterday's streak, and it stays alive until the end of today. Grace days don't add to the length and never join two separate runs.

**Longest streak.** The longest run in the full history, including the current one.

**Shortest streak.** The shortest _completed_ run. The ongoing current run is excluded because it can still grow. Shown as "–" until at least one streak has ended.

Examples:

| History (oldest → newest)                    | Current | Longest | Shortest |
| -------------------------------------------- | ------- | ------- | -------- |
| Sep 15–19 active, today = Sep 19             | 5       | 5       | –        |
| Same, but today = Sep 20 and nothing logged  | 0       | 5       | 5        |
| 10 active, 2 off, 25 active up to today      | 25      | 25      | 10       |
| 3 active, off, 10 active, off, 5 active, off | 0       | 10      | 3        |

The home page's **overall streak** treats a day as active if _any_ dashboard was active that day.

**Total activity** for a day is the sum of the metrics marked "in total". It drives heatmap intensity and the charts. For DSA, _Problems solved_ and _Study hours_ count toward the total, while _Easy / Medium / Hard_ are breakdowns and are left out so nothing is counted twice.

**Heatmap intensity.** Like GitHub, the four non-empty colour levels are quartiles of the non-zero days currently shown, so the scale adapts to your own numbers.

## 11. Creating dashboards

**Dashboards → New dashboard**:

1. Optionally start from a template (LeetCode, Learning, Fitness, Reading, Projects).
2. Set name, description, icon and colour.
3. Add, rename, reorder or remove metrics.
4. Choose the active-day rule: a metric (or Total activity) and a minimum.
5. **Create dashboard**.

Every dashboard gets its own heatmap, streaks, stats, analytics and history automatically. No code changes needed.

Other actions on the Dashboards page: **Edit**, **Duplicate** (copies the configuration, not the entries), **Make default**, **Delete** (asks you to type the name; removes its entries too).

## 12. Adding new metrics

Open a dashboard's **Edit** dialog → **Add metric**.

| Field    | Meaning                                          |
| -------- | ------------------------------------------------ |
| Name     | Shown in the entry form, tooltips and charts     |
| Type     | Whole number, Decimal number, Hours, or Yes / no |
| Unit     | Optional label such as `problems`, `km`, `pages` |
| Step     | How much +/- changes the value                   |
| In total | Whether it adds to the day's total activity      |

A metric's internal id is created from its name once and never changes, so renaming a metric keeps its history. Removing a metric hides it, but old values stay in `activity.json`; add a metric with the same name back and they reappear.

For developers, the model lives in `src/types/index.ts`. To add a new metric **type**, extend `MetricType`, handle it in `components/MetricInput.tsx` and `lib/activity.ts → cleanValues`, and add a label in `DashboardEditor.tsx`.

## 13. Security considerations

- **Personal use only.** The token sits in `localStorage` in plain text. Any JavaScript running on the same origin could read it. This app loads no third-party scripts (only Google Fonts CSS), but treat any browser you configure as trusted.
- **Scope the token tightly**: one repository, Contents read/write only, with an expiry date.
- **The token is never committed.** It's entered at runtime and sent only in the `Authorization` header to `api.github.com`. Settings shows just the last four characters. `.env` and `.env.*` are git-ignored.
- **Public repo = public data.** Use a separate private data repo if that matters to you (see section 4).
- **Shared or public computers**: use Settings → **Disconnect** when you're done, which removes the token from that browser.
- **Leaked token?** Revoke it at GitHub → Settings → Developer settings → Fine-grained tokens, then create a new one.

## 14. Troubleshooting

| Symptom                               | Fix                                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **"GitHub rejected the token"** (401) | Token is expired, revoked or mistyped. Create a new one and paste it via Settings → Replace.      |
| **"The token can't write…"** (403)    | Give the token **Contents: Read and write** on this exact repository.                             |
| **"Couldn't find owner/repo"** (404)  | Check owner, repo and branch spelling, and that the token's repository access includes that repo. |
| **"Rate limit reached"**              | Authenticated calls allow 5,000 per hour. Wait a few minutes, then Retry.                         |
| **"…is not valid JSON"**              | A data file was edited by hand and broken. Fix it on GitHub or restore it from git history.       |
| Status stuck on **Pending sync**      | Open Settings → Sync now. The error, if any, is shown there.                                      |
| Site shows a blank page after deploy  | Confirm Pages **Source** is "GitHub Actions" and the workflow succeeded. Hard-refresh.            |
| Every save triggers a deploy          | Make sure the `paths-ignore: data/**` block is in `deploy.yml`.                                   |
| Data differs between devices          | Both devices must point at the same owner/repo/branch/data folder. Tap Sync now on each.          |
| Days are off by one                   | Check Settings → Timezone. It defaults to `Asia/Kolkata`.                                         |
| Need to start over on one device      | Settings → Backup → Clear data on this device. Anything already on GitHub is kept.                |
