# Prototype verification — 28 October 2026

## v0.7 Low Orbit / Signal Siege

- 56 Vitest checks pass. New simulation coverage includes deterministic spawns, distinct initial letters, target locking, wrong-key handling, target release, pause, pulse economy, recharge, wave-five shield phases, hull breaches, game-over input rejection and bounded snapshots/results. Local-save coverage preserves arcade bests.
- All 21 Chrome journeys pass against the optimized production build with one worker (`KEYBOUND_E2E_PRODUCTION=1 npm run test:e2e`). The five new journeys cover the Low Orbit map entry, real typed combat, held-key suppression, pause/focus restoration, pulse, report/best persistence, reaching wave five and defeating its three-stage boss, trusted virtual text input, light/reduced-motion mobile layouts, navigation cleanup, MechKeys press/release, mute and replay.
- TypeScript and production builds pass. Desktop and 320-pixel mobile intro/combat screenshots were inspected, including compact-height launch controls and a readable pulse charge display.
- The initial parallel development-server suite hit timeouts while a separate local project was building. The full optimized-build run passed. Preview-only sound cancellation uses a controlled browser clock so an elapsed wall-clock preview cannot race the Stop action.
- No external game assets or dependencies were added. See [the arcade guide](SIGNAL-SIEGE.md) and [asset inventory](../ASSETS_LICENSES.md).

## v0.6 appearance and guest profile layout

- 46 Vitest checks pass, including legacy journal compatibility, saved appearance/comfort preferences and invalid appearance fallback.
- All 16 Chrome journeys pass. New coverage checks full guest-profile/Settings visibility at seven desktop/mobile/landscape sizes, Light/Dark/System behavior, live device-theme changes, explicit overrides, accent persistence, high contrast, light-theme typing and the existing sound-toggle visibility.
- TypeScript and the production build pass. Desktop/mobile appearance, light hub, custom editor and light typing terminal were captured and visually inspected.
- Reproduced the original issue at 1366×768: the profile extended to y=830 outside a 768-pixel viewport. The corrected footer ends at y=768, with its full content visible; upper navigation scrolls independently when necessary.
- See [appearance and layout details](APPEARANCE.md).

## v0.5 MechKeys audio

- 43 Vitest checks pass. New checks cover all 31 bundled recording hashes, profile settings, silence trimming/normalization, stereo positions, no-repeat selection, dedicated Enter/Backspace recordings, Classic release fade, loading cancellation, the Enter bell and voice cleanup.
- All 13 Chrome journeys pass. New browser checks confirm recorded-file decoding and playback, one sound per physical press/release, held-key suppression, all five profile previews, cancellation during downloads, preference persistence and mute. Existing gameplay, custom text and mobile journeys still pass.
- TypeScript and the Next.js production build pass.
- Desktop and 390-pixel mobile sound settings were captured and inspected: 11 choices, no browser runtime errors, no horizontal overflow.
- Tactile/Classic files are byte-identical to the MechKeys 2.0.2 package. Clicky/Linear/Typewriter reproduce its synthesis settings; random variation prevents bit-identical generated waveforms. Listening comparisons on physical speakers have not been performed.
- See [sound pack details](SOUND-PACKS.md) and [recording provenance](../ASSETS_LICENSES.md).

## v0.4 custom paragraphs and sentences

- 33 Vitest checks pass, including draft/text validation, paragraph counts, accented and emoji typing units, whitespace-safe combos and long-text cursor windows.
- All 10 Chrome journeys pass. New coverage authors and restores a draft, finishes a multi-paragraph passage with accents/emoji, verifies the journal entry, selects a timer and checks mobile discovery/layout.
- TypeScript and production build pass. Desktop/mobile previews had no browser runtime errors or horizontal overflow.
- See [the custom practice guide](CUSTOM-PRACTICE.md).

## v0.3 keyboard sound packs

- 26 Vitest checks passed, including finite/bounded non-silent PCM, distinct pack signals, thock/click spectral differences, deterministic variants, typewriter carriage duration, and save-default validation.
- All 8 Chrome journeys passed. New coverage verifies actual AudioBuffer source starts, preview cancellation, saved sound pack and volume, mission keystrokes, mute, and mobile sound selection.
- TypeScript and production build passed.
- Desktop and mobile sound settings screenshots inspected; no runtime errors or horizontal overflow captured.
- See [sound pack details](SOUND-PACKS.md).

## v0.2 motion update

- 19 Vitest checks passed, including distinct mode selection and contextual progress/error messages.
- All 6 Chrome journeys passed, including the original guest/progress/share flows and new moving-world, pause-frame, system/in-game reduced-motion, and code-input coverage.
- TypeScript and production build passed.
- Desktop and 390-pixel mobile previews inspected; no runtime errors or horizontal overflow were captured.
- See [the motion release notes](ANIMATION-UPDATE.md) for presentation changes and comfort behavior.

## Original v0.1 verification

Production: https://keybound-expeditions.vercel.app

Vercel deployment reported `READY` for production. An unauthenticated HTTP request returned `200`. A fresh Chrome session loaded the production page, entered The Lighthouse, typed the opening transmission, and reached 13% progress. No browser runtime errors were captured.

## Automated checks

- `npm test`: 16 passing Vitest checks (session timing, error/accuracy accounting, useful/raw WPM, pause exclusion, completion, combos, backspace history, Flow rhythm, coach scoring, deterministic daily seeds, UTC boundary, target-key exposure, content ids/sequence/fields, real home-row calibration).
- `npm run typecheck`: passed.
- `npm run build`: passed; Next.js prerendered the entry page and icon.
- `npm run test:e2e`: 4 passing Chrome journeys:
  1. First mission with a corrected mistake → debrief → PNG download → reload → persisted mission/journal.
  2. Escape pause → resume → focus restored → typing progress continues.
  3. Calm and reduced motion settings → mobile training navigation with no horizontal overflow → JavaScript newlines and Tab indentation.
  4. Unavailable chapter presentation → repeated daily route retains identical text.
- Additional final desktop/mobile browser capture: no page errors; document width fits a 390-pixel viewport.

Initial verification found and fixed an out-of-curriculum letter in the home-row drill, an expensive procedural grain layer, mobile icon names/overflow, and test selectors. Native modal pause now traps focus and supports Escape. All above checks refer to the corrected build.

## What this does not establish

No external human playtest, measured typing improvement, formal WCAG compliance, complete IME/physical-layout coverage, low-end-device frame-rate certification, load test, or external WPM benchmark calibration has been performed. Scores are local and unverified. Server anti-cheat, global rankings, cloud sync, multi-phase encounters, and branching mission controllers remain part of the roadmap.

The local source repository has been initialized without a remote or commits. Vercel is linked in ignored checkout-local `.vercel/` state. No paid plan, database, purchased domain, analytics service, or GitHub repository was provisioned. The owned local preview server was stopped after verification; `npm run dev` starts it again.
