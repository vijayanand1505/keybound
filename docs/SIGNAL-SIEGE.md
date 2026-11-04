# Low Orbit / Signal Siege — v0.15

**Choose Play now on the featured home panel, open Signal Siege in the sidebar, choose Low Orbit on the expedition map, or use Play Signal Siege in Practice.** Launch defense to start. This is a separate real-time survival game: enemies move toward your ship and carry independently targeted words. There is no fixed paragraph to transcribe.

## Difficulty and flight school

Choose a difficulty above the battlefield before launching. It stays fixed during a run, is remembered on this device, and has a separate best score/wave. Existing pre-v0.8 personal bests migrate to Standard; other progress and settings are preserved.

| Setting                             | Training                      | Standard                        | Expert                                      |
| ----------------------------------- | ----------------------------- | ------------------------------- | ------------------------------------------- |
| Enemy speed relative to Standard    | 55%                           | 100% (unchanged)                | 140%                                        |
| Words                               | Short, including boss shields | Original wave-based progression | Longer from the first wave; long boss words |
| Hull shields                        | 5                             | 3                               | 3                                           |
| Starting pulses                     | 2                             | 1                               | 1                                           |
| Typed kills to recharge a pulse     | 3                             | 5                               | 5                                           |
| Maximum active enemies              | 4                             | 7 desktop / 5 narrow            | 7 desktop / 5 narrow                        |
| Spawn interval relative to Standard | 150%                          | 100%                            | 80%                                         |

Training starts with one drone and offers longer breaks and smaller swarms. All difficulties retain shielded enemies, fifth-wave bosses, real-time movement, accuracy and the existing scoring rules. Reports identify the difficulty.

**Learn to play** opens an optional, replayable four-step flight school. Targets stay still while the player types O to acquire ORBIT, presses Backspace (or taps Release target) to reset it, types the full word, and uses Space or the Pulse button to clear two drones. Instructions advance only after the corresponding action. Escape pauses; Skip tutorial returns to setup. Completion launches the player's selected difficulty on request. Tutorials never save reports, bests or XP, including when navigating away.

## Play

- Type the first letter of an enemy word to lock on. Correct letters fire bolts; finishing the word destroys the drone or breaks one of its shields.
- Wrong letters leave progress intact, count against accuracy and break the clean-word streak. Hold-to-repeat does not fire extra shots.
- Backspace releases your target and restarts its current word. Points from its canceled partial word are removed, so releasing/retyping cannot farm points. Input statistics keep those keystrokes.
- Space, or the on-screen Pulse button, spends an emergency pulse. It clears regular enemies and removes one shield from a protected dreadnought. Typed eliminations recharge one pulse every five kills (three in Training), up to three charges. Pulse kills do not earn recharge credit or fabricate typed letters.
- Three hull shields protect the relay (five in Training). A drone crossing the defense perimeter costs one; losing the last shield ends the run.
- Escape or Pause opens a modal and freezes enemies, the wave clock and score. Returning with Escape or Resume restores typing focus. Switching tabs/windows pauses automatically.
- End run & save report ends voluntarily. Fly again creates a fresh field. Opening another page pauses the run and stops its audio. Return using the banner or sidebar and choose Resume defense. This keeps the same enemies, score, phase timers and pulse progress while the page remains open. Runs finish and save once when you choose End run, lose your last hull shield, or reach the timed-mode limit. Reloading/closing the browser discards an unfinished run; completed reports remain saved.

## 60-second arcade (v0.16)

Choose **Endless** or **60-second arcade** above the difficulty controls. Existing players default to Endless. Timed arcade uses the same enemies, scoring, hull limits, pulses and difficulty profiles. Its timer starts only after the launch countdown, shows remaining time in the HUD, and highlights the last ten seconds. A run ends at exactly 60 seconds of active simulation time, or earlier through hull loss or End run. Input cannot change a completed result. Timed play has no sector-clear countdown: the next wave starts immediately, and an empty field receives another target without waiting for the normal spawn interval. The report identifies whether time expired, hull was lost or the player ended the run.

Pauses, tab changes and loss of window/input focus stop the timer with the existing simulation; resume retains the remaining time. A long frame advances at most one simulation second, preserving the existing throttling protection. This is active play time rather than an absolute wall-clock deadline. Replays start a fresh minute after a fresh launch countdown. Tutorials remain untimed. Fullscreen stays open at the deadline with the final result and replay controls.

Timed and Endless records and comparisons are separate for each difficulty. Optional version-one save fields `siegeMode` and `timedArcadeBests` store the preference and timed records. Existing `arcadeBests` / legacy `arcadeBest` belong only to Endless. Each new arcade run stores optional `mode` and `endReason` fields; old runs without a mode are treated as Endless. Bests survive the 100-run history cap. Progress, copyable results and PNG cards name the mode. Both modes count toward the existing free cosmetic milestones. Export and deletion include the new fields. The header's **60-second test** remains paragraph typing practice.

## Waves and scoring

Waves spawn progressively larger swarms with shorter spawn intervals and faster movement. Interceptors appear from wave three; sentinels can carry two word shields from wave four. Every fifth wave includes a dreadnought with three successive word shields and distinct phases. In Endless, the field clears briefly between waves before advancing automatically. Timed arcade advances immediately.

A correct letter earns 10 points. A completed word earns 80 plus 10 per clean-streak level, capped at 20 levels. A typed dreadnought elimination adds 400. Pulse eliminations earn 25 per target. Endless mode continues until hull loss or a voluntary end; the report shows score, wave, kills, useful WPM and typing accuracy. These are local, unverified scores, with no global leaderboard or server anti-cheat.

Reports appear in the Progress and award bounded local XP. Personal best score and wave for each difficulty persist separately from the most recent 100 runs. Existing journals, sound selections, themes and custom drafts keep the version-one save format.

## Boss phases and feedback

The dreadnought starts with **Moving shields**: slow descent and a lateral patrol. Breaking its first shield changes it to **Escort carrier**: its descent slows to 40%, with an explicit 2.5-second launch warning before one escort in Training or two in Standard/Expert. Escort launches respect the field's enemy cap and pause clock. Destroying the next shield cancels pending launches and exposes the core: **Overdrive** approaches at 180% speed with a wider lateral patrol. A persistent boss panel identifies the phase and remaining word shields; boss geometry and colors change as well. A pulse also advances the phase when it breaks a shield.

Labels avoid one another and stay inside the battlefield, with leader lines connecting shifted labels to their ships. Narrow fields limit the active swarm to five enemies (four in Training). The locked word underlines its next required letter, and the control deck names the next key. A wrong key displays the received and expected letters without resetting word progress. Near-perimeter enemies and the last hull shield trigger a static warning. The recharge bar shows real typed-kill credit toward a pulse; wave breaks show a countdown and warn before a boss wave. Essential feedback stays visible with reduced motion enabled.

## Results and review

Below the compact end overlay, the defense report shows best combo, kills, play time and wave. It compares score, WPM and accuracy with the previous run in the same mode and difficulty, using a baseline captured before launch so the current run cannot compare against itself. A new-best badge compares against the pre-run best.

Missed words are counted only when a key was entered against a locked target. Unmatched initials count as mistakes but are not assigned to invented words. **Practice missed words** opens an untimed typing session using the missed-word list, without replacing the player's saved custom draft. **Copy arcade result** and **Download arcade card** create a local text summary and PNG score card. Reports store the optional missed-word list and best combo alongside existing arcade metrics.

## Audio and interruptions

Enable Terminal sound for the master audio switch. Keyboard volume controls the selected keyboard pack; **Combat sound effects** has its own toggle and **Combat volume**. Combat audio includes distinct synthesized laser, explosion, shield-break, pulse, hull-hit, wave, boss-phase and mistake cues. Its separate bus has a compressor and 24-voice limit. The headphone mute stops both channels, including ongoing effects. No audio assets or external services are needed for combat sounds.

Leaving the typing field pauses the simulation. Pulse and other game controls retain their intended behavior; the player explicitly resumes after visiting another page. Escape and window/tab hiding also pause. Fullscreen expands the battlefield and provides an on-screen exit button. Losing or voluntarily ending a run leaves fullscreen open with the result; Fly again retains fullscreen too. Only the player's exit action leaves this view, and exiting during an active run pauses it. Availability follows browser fullscreen support. Deleting local progress also clears any retained unfinished run.

## Presentation and controls

Original Canvas 2D art renders the orbital horizon, stars, relay fighter, enemy ships, bolts, shield breaks, debris and expanding pulse. Word labels and statistics use HTML for legibility and input accessibility. The field scales for narrow screens and reacts to visual viewport changes. Touch keyboards can enter letters through the focused typing field; paste/drop and synthetic inputs do not play the game. The word bank uses English A–Z words and accepts either case.

The relay fighter eases toward a shot over 75ms, fires from its nose, then settles back to its resting direction over 120ms as the bolt departs. Aim follows individual shots, independently of the locked word or its burst. Rapid keystrokes queue these short visual turns so firing stays aligned across different targets; input, progress and scoring remain immediate. Each bolt travels for 160ms before its impact cue. Hits push both the enemy artwork and HTML word label away from the fighter, reach a 12px push in 45ms and settle over 300ms; overlapping hits are capped at 18px. This recoil is visual and does not change enemy speed, targeting, scoring or the defense perimeter. Completed enemies and their word boxes remain visible until the final shot arrives, then burst into hull fragments, a shock ring and scattered letters. Word-box position and font size are captured before completion, so letters burst from the displayed word rather than the ship center. Shield completions use a violet burst and scatter the completed word from its original position while retaining the enemy and its next word. Explosion and shield-break audio play on contact. Aiming, in-flight shots, recoil and bursts freeze while paused, and reset when a new run starts. Reduced motion uses immediate aiming and compact impact cues without animated turning, recoil or flying debris.

The selected keyboard sound and global mute apply to combat input; the independent combat channel supplies event sounds. MechKeys profiles retain physical keydown/keyup without duplicate character sounds. Light/Dark/System appearance affects the surrounding interface; the battlefield retains its space palette. System/in-game reduced motion suppresses decorative drift, twinkling and traveling particles while essential enemy movement continues. High contrast strengthens word labels. This has not been certified as fully screen-reader playable or tested on every physical mobile keyboard.

## Free cosmetics and launch countdown

New arcade runs and Fly again show **3, 2, 1** before enemies appear. Input during the countdown does not score or deploy pulses. Escape and Cancel launch return to setup. Losing focus, hiding the window or navigating away cancels the countdown, and another launch starts from 3. Tutorials open their existing stationary exercises directly; Resume defense continues the retained run.

Open **Customize ship** above the battlefield to see the real ship renderer preview, select available styles, and review milestone progress. Styles are locked during a running or paused run and while counting down. Unlocked styles are announced in the completed-run overlay.

| Category      | Style      | Unlock                       |
| ------------- | ---------- | ---------------------------- |
| Ship frame    | Vector     | Available immediately        |
| Ship frame    | Dart       | Available immediately        |
| Ship frame    | Twinfin    | Destroy 10 enemies           |
| Laser style   | Pulse beam | Available immediately        |
| Laser style   | Tracer     | Available immediately        |
| Laser style   | Prism      | Reach a 5-word clean streak  |
| Engine trail  | Stardust   | Destroy 75 enemies           |
| Ship color    | Relay      | Available immediately        |
| Ship color    | Aurora     | Finish 1 recorded run        |
| Ship color    | Ember      | Reach wave 5                 |
| Engine trail  | Ion        | Available immediately        |
| Engine trail  | Comet      | Destroy 25 enemies           |
| Engine trail  | Solar      | Reach a 10-word clean streak |
| Target marker | Brackets   | Available immediately        |
| Target marker | Diamond    | Finish 3 recorded runs       |
| Target marker | Orbit      | Destroy 50 enemies           |

All styles are free and affect only rendering. Training, Standard and Expert contribute to the same milestone totals; tutorials do not. The optional `siegeCosmetics` field in the version-one local save holds the five selections and durable run/kill/wave/combo progress. Existing arcade runs and saved best waves backfill unlocks. Milestone totals persist beyond the 100-run history limit. Export includes them, and Delete local progress resets them with other saved data.

The v0.17 customization panel offers **16 choices**, with seven available immediately. Frames change the hull outline while retaining the same nose position and firing geometry. Laser styles reuse the same shot queue, travel timing and impact logic; they never add shots, damage or scoring bonuses. Stardust uses at most six small engine glints, frozen on pause, with three static glints under reduced motion.

**Test fire** runs a 1.3-second preview of three cosmetic shots and a target burst. It uses the real ship, bolt and destruction drawing code without instantiating a scoring session. It does not award XP, kills, runs or unlocks, and plays no audio. Idle previews do not run an animation loop. Collapsing customization, changing a selection, navigating away, hiding the tab or launching cancels the preview. Reduced motion renders a steady shot and impact mark. Existing saves default the new optional `hull` and `beam` selections to Vector and Pulse beam while preserving earned progress and the original three choices.

## Combat animation update (v0.14)

- **Pulse contact:** a circular energy front travels from the fighter across the field in 700ms, with a narrow glow and a deeper synthesized bass cue. Cleared ships remain as brief visual snapshots and burst as the front reaches them; shielded bosses receive a shield burst. Collision protection, points, kills and pulse costs remain immediate. Arrival uses actual pixel distance on wide, tall and fullscreen fields and recalculates on resize.
- **Boss transitions:** segmented violet shielding and fracture marks identify the shielded hull. Carrier bays unfold over 650ms, with launch lights tied to the existing escort countdown. Overdrive exposes an amber core, opens vents and deploys wing blades. The existing phase panel, warning timer and boss movement rules remain intact.
- **Distinct destruction:** scouts scatter compact sparks; interceptors throw longer, fast sparks; armored sentinels break into heavier hull pieces. Dreadnoughts have three staggered local detonations and a longer aftermath. Broken shields scatter curved shield segments. Effects stay on Canvas behind HTML words.
- **Combo engines:** each clean word builds engine heat, reaching its strongest glow and longest exhaust at a ten-word combo. Heat eases toward the current combo rather than jumping; mistakes, damage and pulses let it fade smoothly. It never changes speed, scoring or firing direction.
- **Depth:** three independently moving, restrained star layers and a distant relay station replace the flat star/grid background. Scene movement follows the game clock and freezes during pause.
- **Target feedback:** corner brackets settle around an acquired target without moving its word. Correct hits retain the compact cyan impact ring. Mistakes tint the bracket and add a small cross, distinguishing them by shape as well as color.

All decorative animation freezes on pause and resets on replay. System or in-game reduced motion uses static scenery, settled brackets, immediate compact pulse/impact cues and no flying fragments, shield rotation or animated unfolding. Essential enemy movement and phase information remain available. Narrow fields limit each burst to eight fragments with a shared 48-fragment frame budget; wider fields share 96, with crowded effects using the smaller per-burst limit. The effects queue remains capped at 70; audio retains its 24-voice cap. These are bounded presentation costs, not a frame-rate guarantee on every device.

## Implementation and inspiration

- `game/siege-mode.ts`: mode names, one-minute limit and legacy mode normalization.
- `game/siege-difficulty.ts`: shared difficulty profiles, saved preference validation and legacy best migration.
- `game/combat-audio.ts`: original Web Audio effects, independent volume, cancellation and bounded voices.
- `game/siege-report.ts` and `components/SiegeReport.tsx`: pre-run comparisons, missed-word review and local sharing.
- `game/siege.ts`: deterministic seeded simulation, targeting, damage, waves, shields, pulse economy and result metrics.
- `game/siege-renderer.ts`: independently created, bounded Canvas effects and scene drawing.
- `game/siege-effects.ts`: firing geometry, circular pulse contact, destruction profiles, combo heat and recoil.
- `game/siege-visuals.ts`: procedural scenery, pulse front, boss details, bounded debris and targeting brackets.
- `components/SignalSiege.tsx`: frame lifecycle, trusted physical/virtual input, pause dialog, sound and responsive HUD.
- `app/siege.css`: arcade layout, mobile controls, compact-height presentation and original interface art.

The user supplied [ZType](https://zty.pe/) as a gameplay reference. Signal Siege uses the type-to-attack genre with KEYBOUND's own implementation, artwork, words and progression. No ZType code, images, music, logos or sound assets are included. The three other unbuilt story chapters remain clearly marked In Development; Low Orbit is now playable as this arcade mode.
