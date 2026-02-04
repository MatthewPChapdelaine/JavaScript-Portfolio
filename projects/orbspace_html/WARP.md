# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Overview

This repository contains a small single-page browser game called **Orbspace**, implemented with static HTML, vanilla JavaScript, and CSS. There is no build system, bundler, or test framework configured; everything runs directly in the browser from the source files in the repo root.

Key files:
- `index.html` – HTML shell and DOM structure for the game UI.
- `script.js` – All game data, logic, and DOM interaction code.
- `styles.css` – Visual styling for the game.
- `Logo.png` – Image asset referenced by the project (currently not wired into `index.html`).

## Commands and development workflow

There are no project-specific scripts or tooling configured (no `package.json`, Makefile, etc.). Development is done by directly loading the static assets in a browser.

### Run the game locally

From the repo root (`orbspace_html`):

- Serve files via a simple HTTP server (recommended so relative paths behave like a real site):
  - Using Python (available on most systems):
    - Python 3:
      ```bash
      python -m http.server 8000
      ```
  - Then open `http://localhost:8000/index.html` in a browser.

- Alternatively, open `index.html` directly in a browser from the filesystem, though some browsers may restrict certain features when not served over HTTP.

### Linting and tests

There is no JavaScript linting or automated test setup in this repository:
- No ESLint/Prettier or similar configuration files.
- No test runner (e.g., Jest, Vitest, Mocha) or test files.

If you add tooling, also update this `WARP.md` with the relevant commands (e.g., `npm test`, `npm run lint`).

## High-level architecture

The codebase is intentionally minimal and is structured as a classic DOM-driven browser game:

### 1. DOM structure (`index.html`)

`index.html` defines all visible UI and the hook points that `script.js` attaches to:

- **Root container**: `#game-container` wraps all UI elements.
- **Status bars** (`#status-bars`):
  - `#funds-bar` – visual bar representing current funds vs `MAX_FUNDS`.
  - `#weeks-bar` – visual bar representing current week vs `MAX_WEEKS`.
  - `#state-indicator` – small colored bar indicating current state (`InSpace`, `Grounded`, or `Traveling`).
- **Status panel** (`#status`): Text summary of game state, including:
  - `#week`, `#rank`, `#allegiance`, `#opponent`, `#state`, `#location`, `#funds`.
- **Message log** (`#messages`): Scrollable log where the game writes narrative text and events.
- **Actions area** (`#actions`): Contains dynamic sub-sections that `script.js` populates:
  - `#travel-section` – travel and movement controls.
  - `#activity-section` – local activities that generate income.
  - `#mission-section` – missions and higher-stakes actions.
  - `#renew-section` – license renewal options when grounded.
  - `#next-week` button – advances the game by one week.
  - `#replay` button – appears on game over / victory to restart.

The HTML is mostly static; all interactivity and dynamic content comes from `script.js`.

### 2. Game data and state (`script.js`)

All JavaScript is in a single file and uses module-global variables and functions (no modules or classes):

- **Core constants** (top of file):
  - Economy and pacing: `INITIAL_GRANT`, `SPACE_COST`, `GROUNDED_COST`, `LICENSE_RENEWAL_COST`, `MAX_FUNDS`, `MAX_WEEKS`.
  - Progression thresholds: `PROMOTION_THRESHOLD`, `VICTORY_THRESHOLD`.

- **World definition**:
  - `empires` – list of empire names.
  - `starSystems` – mapping from empire name to an array of planet names.
  - `planets` – derived object built from `starSystems`. For each planet:
    - `activities`: array of simple actions with a fixed credit `income` (e.g., Trading, Exploring).
    - `missions`: array of mission objects `{ description, reward, difficulty }`. Rewards are scaled per-planet using the index while building this structure.

  To add new locations or change activity/mission balance, you typically modify `empires`, `starSystems`, and the `planets` construction loop near the top of `script.js`.

- **Mutable game state**:
  - `week`, `rank`, `allegiance`, `opponent` – progression and narrative state.
  - `state` – high-level state machine with values like `"InSpace"`, `"Grounded"`, `"Traveling"`.
  - `currentStarSystem`, `currentPlanet` – player position.
  - `funds` – current credits.
  - `travelWeeksLeft` – countdown for multi-week travel between star systems.

This global state is read and mutated by most of the functions in `script.js`.

### 3. DOM bindings and helpers

Immediately after the state definitions, the script grabs the key DOM nodes by ID (e.g., `weekEl`, `rankEl`, `travelSection`, `missionSection`, `nextWeekBtn`, etc.).

Core utility functions:

- `addMessage(message)` – appends a `<p>` with `message` into `#messages` and scrolls to the bottom. This is the main narrative/log output API used throughout the game.
- `updateStatus()` – writes the current values of `week`, `rank`, `allegiance`, `opponent`, `state`, `location`, and `funds` into their corresponding DOM elements, then calls `updateBars()`.
- `updateBars()` – updates the widths of `#funds-bar` and `#weeks-bar` based on `funds/MAX_FUNDS` and `week/MAX_WEEKS`, and sets `#state-indicator` color according to `state`.

### 4. Economy, state transitions, and weekly loop

- `payCosts()` – central function for per-week upkeep costs:
  - Adjusts costs upward if the player is an `Armada Admiral`.
  - Deducts either space or grounded costs depending on `state`.
  - Transitions to `Grounded` if the player cannot pay space costs, or ends the game (disables `Next Week`, shows `Replay`, and clears action sections) if unable to pay grounded costs.
  - Returns a boolean indicating whether the game can continue.

- `handleTravel()` – manages ongoing travel when `state === "Traveling"` by decrementing `travelWeeksLeft` and switching back to `InSpace` when it reaches 0.

- `checkPromotion()` – promotes the player from `"Captain"` to `"Armada Admiral"` when `funds >= PROMOTION_THRESHOLD`.
  - Randomly assigns an `allegiance` empire and a distinct `opponent` empire.
  - Notifies the player via `addMessage()` and calls `updateStatus()`.

- `checkVictory()` – checks if an `Armada Admiral` has reached `VICTORY_THRESHOLD` funds; if so, shows a victory message, disables further advancement, and reveals the `Replay` button.

- Random events in the weekly loop:
  - On each `Next Week` click, there is a 20% chance to apply one of several events (pirate attack, derelict ship, engine malfunction) that randomly adjusts `funds` and logs a message.

The main weekly progression is handled by `nextWeekBtn.onclick`, which:
1. Possibly applies a random event.
2. Increments `week`.
3. Calls `handleTravel()`.
4. Calls `payCosts()`.
5. If `payCosts()` returns `true`, calls `updateUI()` to rebuild the interactive controls.

### 5. UI builders and state-dependent layout

UI construction is centralized in a small set of "builder" functions that repopulate sections of the DOM based on the current state:

- `buildTravelButtons()`:
  - Resets `#travel-section` with a heading and a "Stay" button.
  - For every planet in every empire (except the current one), creates a button to either move instantly within the same system or initiate 1-week travel to another system (setting `state` to `"Traveling"` and `travelWeeksLeft = 1`).
  - After any travel choice, calls `updateUI()` to refresh.

- `buildActivityButtons()`:
  - For each activity in `planets[currentPlanet].activities`, creates a button that, when clicked:
    - Adds the activity income to `funds`.
    - Logs a corresponding message.
    - Disables that button so each activity can only be done once per week.
    - Calls `updateStatus()` and `checkPromotion()`.

- `buildMissionButtons()`:
  - Shows simple planet missions, optionally extended for `Armada Admiral` in their allegiance system by concatenating results from `getGranderMissions()`.
  - Each mission button evaluates success via a random roll vs `100 - difficulty * 10`, awards `reward` credits on success, and disables after being taken.
  - Also provides a "Skip Mission" button that only logs and disables itself.

- `getGranderMissions()`:
  - Returns an array of higher-reward, higher-difficulty missions that are only available to admirals in their allegiance territory.

- `buildRenewButton()`:
  - Used when the player is `Grounded`.
  - If `funds >= LICENSE_RENEWAL_COST`, shows a button to pay the renewal fee, reset `state` to `"InSpace"`, and call `updateUI()`.
  - Otherwise, shows a text message explaining the required funds.

- `updateUI()` – orchestrator that:
  - Calls `updateStatus()`.
  - Branches on `state`:
    - `"Traveling"`: shows travel progress and hides activities/missions/renew.
    - `"InSpace"`: builds travel, activity, and mission buttons; clears renew section.
    - `"Grounded"`: hides travel, but still allows activities and missions and shows the renew license controls.
  - Always calls `checkVictory()` at the end.

This `updateUI()` function is the main entry point for re-rendering the interactive portions of the page after state changes.

### 6. Initialization and replay

At the bottom of `script.js`:

- `nextWeekBtn.onclick` – defines the weekly advancement behavior described above.
- `replayBtn.onclick` – fully resets all game state back to initial values (week 1, `"Captain"`, no allegiance/opponent, starting system and planet, starting funds, etc.), re-enables `Next Week`, hides the replay button, logs a restart message, and calls `updateUI()`.
- Initial setup:
  - Writes a welcome message via `addMessage()`.
  - Calls `payCosts()` once to apply the first week of space costs.
  - Calls `updateUI()` to build the initial UI (travel/activity/mission sections and status bars).

## Guidance for future changes

- To **add or modify locations and activities**:
  - Update `empires` and `starSystems`, then adjust how `planets` is built if you need more complex per-planet configuration.
- To **tune difficulty and pacing**:
  - Adjust cost and threshold constants at the top of `script.js` (`SPACE_COST`, `GROUNDED_COST`, `PROMOTION_THRESHOLD`, `VICTORY_THRESHOLD`, etc.).
- To **change the look and feel**:
  - Edit `styles.css`, which controls layout, fonts, neon-green palette, and the flexbox layouts for the various sections.

When making significant refactors (e.g., introducing modules or a build system), document any new commands and entry points here so Warp can use the correct workflows.