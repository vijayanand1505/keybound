# Motion update — v0.2

The existing expedition hub and campaign remain the foundation. Each playable side mode now has an original animated environment instead of borrowing the coast scene.

| Mode | Environment and feedback |
| --- | --- |
| Storm Coast | Original lighthouse and ship, now with a separate layer of moving sea spray, word particles, interrupted-signal feedback, and Flow glow. |
| White Ascent | Multi-depth snowfall, drifting wind trails, traced climbing rope, eased climber movement, handhold markers, live altitude, grip-loss feedback and ice particles. |
| Daily Signal | Contour-map terrain, sweeping radar, seven relay nodes, animated packets between connected nodes and a signal spectrum. Each seventh of the transmission restores a node. |
| Weakness Hunt | A slowly moving constellation built around the player's three target keys. Clean words produce target-lock callouts and spark particles. |
| Signal Room | Moving perspective grid, descending code glyphs, server racks and routed circuits. Subsystems restore at thirds of the passage; input triggers compiled-packet feedback. |
| Field Notes | Layered landscape, drifting light motes and an open field journal whose lines fill as the passage progresses. |
| Recruitment Trial | Field-journal scene with calibration rings and acquisition feedback. |

All modes have contextual status messages, themed terminal colors, clean-word/combo callouts and an ambient Flow aura. Keystroke/word tones use mode-specific pitches when sound is enabled. Debrief statistics and the completion seal have staggered entrances; training cards have a subtle scan on hover/focus.

## Comfort and lifecycle

- System `prefers-reduced-motion` and the in-game Reduce motion switch stop canvas animation. Progress still redraws immediately when the player types.
- Pausing cancels the animation frame loop and pauses CSS weather. Resuming keeps accumulated scene time rather than restarting the world.
- Feedback is text as well as color, and dismisses after a short hold even with animations disabled.
- Errors cause small, brief decorative displacement; the terminal and input stay fixed. No full-screen flashing effects were added.
- High contrast dims the environment behind the readable terminal.
- A ResizeObserver resizes the drawing buffer; side-mode artwork keeps its aspect ratio on narrow screens.
- Particle counts are bounded at 100 and rendering pixel ratio is capped at 1.5. Animation runs outside React's render cycle, through `requestAnimationFrame` and live refs; resize observers and frame callbacks are disposed on unmount.
- Synthesized audio nodes disconnect after playback.

## Source

- `components/ModeWorld.tsx`: original Canvas 2D worlds and bounded particle rendering.
- `components/ModeFeedback.tsx`: instruments, word/combo feedback and Flow indicator.
- `game/presentation.ts`: typed world selection and contextual copy.
- `app/worlds.css`: mode-specific color, motion and responsive treatments.

No rendering library, remote imagery, sound recording, account integration, or backend service was added. The previous source was saved to `../.keybound-tools/keybound-v0.1-before-motion.tar.gz` before implementation. Existing IndexedDB saves continue to use the same schema.

## Verification

Vitest covers distinct world selection and relevant progress/error messages alongside the existing session/content tests. Playwright exercises every original journey, the new mode environments, moving canvas output, word feedback, frozen pause frames, system reduced motion, the in-game motion switch, and usable code input with motion disabled. Desktop and 390-pixel mobile screenshots were inspected; radar aspect ratio and feedback placement were corrected after that review.

This update improves presentation and feedback. The larger campaign backlog—branching encounters, multi-phase bosses, verified competition and cloud sync—still applies.
