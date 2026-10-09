# Injury Reports

A phone-friendly web app (installable PWA) for live NFL, MLB, NBA and college football (FBS) injury reports.

**Live:** https://jmedley18.github.io/injury-reports/

- Pick a league, search or tap any team, see who is Out / Questionable / on the IL / Day-to-Day, with injury, comment and update time.
- Star teams to keep them at the top.
- Pull down or tap ↻ to refresh. Data is fetched live from ESPN's public injury feed every time (the service worker never caches it).
- College football: most schools don't publish injury reports, so ESPN's college feed is usually empty.

`tools/build_teams.py` regenerates `teams.json` (team lists, logos, colors, FBS conferences).
