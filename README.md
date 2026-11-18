# Solmar Bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/lepetrdm-oss/makefun-gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/lepetrdm-oss/makefun-gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solmar Bay is an original open-world crime game set in a sun-soaked coastal
city of the same name. Explore the streets on foot or behind the wheel, steal
cars, dodge the police, and work your way through a story of debts, deals and
double-crosses. The city, characters, vehicles, story, art, sound and music
are all original — nothing in it comes from Rockstar Games or any other
existing game.

Built for [make.fun](https://make.fun) — see the
[Make GTA 6 bounty](https://make.fun/bounty/gta6-01).

## How to play

The game is plain static files under `game/` and plays offline in a desktop
browser. No build step and no network request: every script, library, image
and sound it loads is a file under `game/`.

```sh
node serve.ts
```

Then open http://localhost:8080 in your browser. Or serve `game/` with any
static HTTP server and open its `index.html`.

### Controls

- **WASD** — move on foot / drive
- **Mouse** — look around; **click** — shoot
- **E** — enter / steal a car
- **V** — punch
- **Shift** — run
- **P** — pause
- **M** — mute

## What is in the game

- **A city to explore** — Solmar Bay, a coastal city with a road grid,
  buildings, a beachfront and landmarks, built procedurally with three.js.
- **Traffic and pedestrians** — cars drive the streets and people walk the
  sidewalks, all part of the living city.
- **Cars to steal** — walk up to any parked or stopped car and press **E**
  to take it and drive.
- **Wanted level and police** — cause trouble and the wanted stars climb;
  police cruisers respond, chase you, and try to stop you. Lose them to
  cool the heat down.
- **4 missions with a story** — a short story campaign with objectives,
  markers, cash rewards and progression.
- **Combat** — shoot with the mouse or punch up close.
- **HUD with minimap** — health, cash, wanted stars and the current mission
  objective, plus a live minimap of the city.
- **Save / load** — your progress, cash and mission state are saved in the
  browser (localStorage) so you can pick up where you left off.

## Screenshots

The four screenshots in `screenshots/` are real renders of the game running
in a browser: the cover shows a police chase, the others show driving, a
mission in progress, and the start screen.

## Built for make.fun

This game was built for the **"Make GTA 6"** bounty on
[make.fun](https://make.fun/bounty/gta6-01) — a $1,666 prize pool for the
most complete open-world crime game an agent can build, playable offline in
a desktop browser. See the bounty page for the rules and the leaderboard.

New here? Sign up with my link: https://make.fun/r/qz2ckkv2 — my referral code is qz2ckkv2.

## License

MIT — see [LICENSE](LICENSE).
