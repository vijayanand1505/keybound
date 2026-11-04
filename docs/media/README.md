# README media

These assets show KEYBOUND **v0.17.0**, captured from the local application on **4 November 2026**. They accompany the [project README](../../README.md).

## Video walkthroughs

All videos are silent H.264 MP4 recordings, with a 1280 × 888 frame. Their source is a 1440 × 1000 Chrome viewport. Open a linked file in a video player or browser; a repository host may require **View raw** or a download before playback.

| File | Walkthrough |
| --- | --- |
| [signal-siege-demo.mp4](signal-siege-demo.mp4) | Home → 60-second arcade → Training → launch countdown → type words → pulse → pause → save report and earn styles. |
| [expeditions-demo.mp4](expeditions-demo.mp4) | Storm Coast briefing → corrected typing error → pause/resume → completed mission → PNG download → White Ascent gameplay. |
| [practice-demo.mp4](practice-demo.mp4) | Practice menu → author a custom passage → complete it → JavaScript with Enter/Tab → Weakness Hunt → daily route. |
| [personalization-demo.mp4](personalization-demo.mp4) | Progress dashboard → Light/Ocean appearance → sound settings and preview control → ship styles and test fire → JSON export. |
| [signal-siege-preview.gif](signal-siege-preview.gif) | Short, looping arcade preview for inline Markdown display. The full walkthrough is linked above. |

Audio is not captured. The personalization video demonstrates the sound preview controls; enable **Terminal sound** in the app to hear the packs. The arcade demonstration ends voluntarily after showing the controls, rather than playing the entire one-minute limit. Boss phases and later unlocks are explained in the [arcade guide](../SIGNAL-SIEGE.md).

Recordings use actual application interactions and local saves in an isolated browser profile. The story walkthrough deliberately corrects one mistake so the later Progress screen has a meaningful key sample. The displayed scores and typing speeds demonstrate the interface; automated input is not a human typing benchmark.

## Screenshot inventory

Screenshots use WebP to keep the README lightweight. Desktop captures use a 1440 × 1000 viewport; a few images crop directly to the relevant game or settings panel. The mobile capture is 390 × 844. `field-report.png` is the card downloaded by the application, rather than a screenshot.

| File | Shows |
| --- | --- |
| [home.webp](home.webp) | Featured arcade game and story entry point |
| [signal-siege-setup.webp](signal-siege-setup.webp) | Mode, difficulty, tutorial, and launch controls |
| [signal-siege.webp](signal-siege.webp) | Active enemies, word labels, hull, score, timer, and pulse meter |
| [arcade-report.webp](arcade-report.webp) | Completed run and earned styles |
| [ship-customization.webp](ship-customization.webp) | Real-renderer preview and the five cosmetic categories |
| [storm-coast.webp](storm-coast.webp) | Lighthouse scene and active mission terminal |
| [white-ascent.webp](white-ascent.webp) | Climbing scene and active mission terminal |
| [daily-challenge.webp](daily-challenge.webp) | UTC daily route, launch action, and local result area |
| [practice.webp](practice.webp) | Practice menu and exercise entry points |
| [custom-text.webp](custom-text.webp) | Passage editor, counts, live preview, and time selection |
| [code-practice.webp](code-practice.webp) | JavaScript practice and circuit-themed world |
| [weakness-hunt.webp](weakness-hunt.webp) | Focused key practice and constellation world |
| [session-report.webp](session-report.webp) | Mission statistics, key feedback, and sharing actions |
| [field-report.png](field-report.png) | The actual downloadable mission score card |
| [progress.webp](progress.webp) | Saved sessions, local XP, and keyboard mistake map |
| [settings.webp](settings.webp) | Theme, accent, gameplay, and comfort preferences |
| [light-theme.webp](light-theme.webp) | Home in Light theme with Ocean accents |
| [sound-packs.webp](sound-packs.webp) | All 11 keyboard sound packs and audio controls |
| [mobile.webp](mobile.webp) | Compact navigation and stacked home layout |

## Regenerate the assets

Prerequisites:

- Node.js 24 and the project's npm dependencies (`npm ci`).
- Google Chrome, the browser channel used by the existing Playwright configuration.
- FFmpeg with the `libx264` encoder, WebP decoding, and GIF palette filters.
- Playwright's compatible video-recording helper (`npx playwright install ffmpeg`), or an explicit `FFMPEG_PATH` as shown below.

Start the application in one terminal:

```bash
npm run dev
```

In another terminal, from the repository root:

```bash
node scripts/capture-readme-media.mjs
```

If FFmpeg is not on your PATH or the app uses a different port:

```bash
FFMPEG_PATH=/absolute/path/to/ffmpeg \
MEDIA_BASE_URL=http://localhost:3017 \
node scripts/capture-readme-media.mjs
```

The script overwrites the generated media in this directory. It creates an isolated Chrome profile, plays real sessions, carries that profile's saved results between walkthroughs, captures screenshots, downloads a result card, encodes the recordings, and creates the GIF. Temporary raw recordings are removed on completion. Your normal browser data and application source are untouched.

When `FFMPEG_PATH` is supplied, the script also uses that binary as Playwright's recording helper in a temporary directory. This supports systems where Playwright cannot download its own helper; it does not modify the normal Playwright browser cache. The full binary needs VP9 encoding for the source recording and H.264 encoding for the final MP4.

Expect differences in daily passages, enemy words, elapsed times, scores, and animation frames between captures. Refresh the date and version in this guide when updating the media. After capture, inspect the images, open each video, and check the relative links in the main README.

## Attribution

The screenshots and videos capture the project's own UI and gameplay. They include the project's generated game covers, original SVG/Canvas artwork, local fonts, and Lucide icons. See [the asset inventory](../../ASSETS_LICENSES.md) for their provenance and license details.
