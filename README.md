# Poker Odds Helper

Free, static, no-account poker hand-equity calculator for home games and study. v1
positions itself explicitly as a home-game/casual-study companion, not a tool for use
during supervised/regulated play (see `STATUS.md` for the full reasoning).

## Files
- `index.html` — card/board input UI, opponent count, optional pot/bet inputs, results
- `poker.js` — the engine: deck, 5-card hand evaluator (verified against known poker
  hand rankings via a Python mirror, see `STATUS.md` — no JS runtime available in this
  environment for direct execution), Monte Carlo equity simulation, pot-odds calc,
  recommendation + "why" explanation logic
- `app.js` — UI wiring (card selects, board-stage-dependent inputs, calculate button,
  results rendering)
- `styles.css` — visual theme (felt green/gold, distinct from other ventures)

## v1 scope (deliberate cuts, see PORTFOLIO.md/STATUS.md)
- Equity vs N random opponent hands only — **no range modeling** (a real opponent
  doesn't play every hand, but v1 doesn't account for that yet).
- No "Duolingo for poker" learning curriculum (micro-lessons, progression, streaks) —
  that's a deliberately deferred, separate product bet.

## Local development
No build step. Serve the directory with any static server, e.g.:
```
python3 -m http.server 8000
```

## Deploy
Push to a GitHub repo with Pages enabled on the root of `main`.
