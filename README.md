# Injury Reports

A phone-friendly web app (installable PWA) for live NFL, MLB and NBA injury reports, plus a personal "My Players" fantasy watch list.

**Live:** https://jmedley18.github.io/injury-reports/

- Pick a league, search or tap any team, and see who is Out, Questionable, on the IL or Day-to-Day, with the injury, a comment and when it was updated.
- Star teams to keep them at the top.
- **★ Mine:** build one or more player lists (e.g. "Main league", "Work league") by searching players, pasting a list of names, or importing a Sleeper league roster (public Sleeper API, username only).
- **Change alerts:** status changes for your players and starred teams are flagged in "What's new" with NEW / CHANGED / CLEARED tags, plus an optional phone notification while the app is open or when you reopen it. There's no server push.
- Pull down or tap ↻ to refresh. Data is fetched live from ESPN's public feed (the service worker never caches it).

`tools/build_teams.py` regenerates `teams.json` (team lists, logos, colors).
