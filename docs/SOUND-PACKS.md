# Keyboard sound packs — v0.5

Open **Settings → Terminal sound** to turn gameplay audio on, then select a keyboard pack. The headphone control in the header also toggles gameplay audio. Pack selection and volume are saved locally with the existing progress record.

| Pack | Sound design |
| --- | --- |
| Soft Signal | Original-style soft notes, tuned to the current expedition. |
| Mechanical Click | Bright switch transient, spring/body resonances, and a short key-return click. |
| Deep Thock | Low-frequency body and a rounded tactile impact. Space has a lower, heavier tone. |
| Vintage Typewriter | Metallic typebar clack with a delayed return impact. Correct Enter input adds an extended carriage sound. |
| Brass Telegraph | Morse-inspired radio pulses with brass-contact transients. |
| Pocket Arcade | Retro saturated notes and rising word-completion chirps. |

Each pack has a short Preview/Stop control. The sound pack selector, preview buttons and volume slider are visible only while Terminal sound is enabled. Turning it off hides those controls and stops any preview; the selected pack and volume remain saved for the next time sound is enabled. A zero volume remains silent. Selecting another pack, toggling sound, navigating away, or starting another preview cancels the current sample. Previewing does not change the selected pack.

The volume slider changes playback live and saves its value when the control is released, changed with the keyboard, or blurred. Mute stops pending preview beats and active voices immediately. There is no autoplay on page load.

## MechKeys profiles

The five added choices match **MechKeys: Mechanical Keyboard Sounds 2.0.2**, Chrome extension `ggkamagcddlombobgpfplaigbonfnpmi` ([listing](https://chromewebstore.google.com/detail/mechkeys-mechanical-keybo/ggkamagcddlombobgpfplaigbonfnpmi)). Players do not need to install the extension.

| Pack | Implementation |
| --- | --- |
| MechKeys · Tactile | Same 12 MP3 press recordings, one release recording, and dedicated Enter/Backspace recordings. |
| MechKeys · Classic | Same 16 WAV press recordings; the extension's short, pitched-down release derived from a press sample. |
| MechKeys · Clicky | Matching Clicky/Blue noise filter, triangle body, envelopes and release. |
| MechKeys · Linear | Matching Linear/Red noise filter, sine body and envelopes; no release sound. |
| MechKeys · Typewriter | Matching hammer noise, square body, release and two-frequency Enter bell. |

The 31 recorded files are copied without re-encoding and total 497,146 bytes. `public/audio/mechkeys/manifest.json` pins their SHA-256 hashes and extension version. Included upstream credits identify every recording as CC0-1.0; see [the asset inventory](../ASSETS_LICENSES.md) and per-pack credits. These files are served from KEYBOUND's own host, loaded only when a recorded pack is selected or previewed, and decoded once per pack/context. Gameplay never contacts the Chrome Store or Freesound.

The independently written renderer preserves the extension's silence trimming, peak normalization, no consecutive repeated press sample, pitch/gain variation, stereo key positions, larger-key pitch changes and release behavior. Its master output uses the extension's direct gain path. The three synthesized profiles reproduce the settings and sound behavior; randomized noise and variations mean successive waveforms are not bit-identical, as in the extension itself. No extension JavaScript is installed or executed.

MechKeys gameplay uses trusted keydown/keyup events inside the focused typing terminal. Holding a key does not produce repeated sounds. Text input still handles scoring separately, preventing a second sound per character. Virtual keyboards/IME without physical key codes use a press/release tap. Other page fields do not produce keyboard sounds. Previews warm recordings before playback; mute, pack changes and navigation cancel pending preview beats and loaded voices, including previews canceled during download. Slow first-load key events expire instead of producing delayed bursts. Mission-completion feedback retains the game's completion tone.

## Audio implementation

The original six packs remain procedural PCM synthesis; the five MechKeys additions use recordings or Web Audio synthesis as described above. Sound and volume preferences keep the existing local save schema and defaults (Soft Signal, 45%).

- `game/sounds.ts`: all eleven choices and preference validation.
- `game/sound-synthesis.ts`: the original six deterministic PCM packs.
- `game/mechkeys-profiles.ts`: MechKeys profile settings, key positions, recording paths and sample analysis.
- `game/mechkeys-audio.ts`: original recording/synthesis renderer with at most 64 active source nodes, cached decoding and cancellation.
- `game/audio.ts`: gesture-activated context, separate output paths, volume and cancellable previews.
- `components/SoundSettings.tsx`: radio choices, preview controls, load-error message and saved volume.

## Verification

Unit coverage checks all recording hashes, profile settings, normalization, panning, no-repeat selection, dedicated keys, release envelopes, loading cancellation and voice cleanup, alongside the existing PCM checks. Chrome coverage verifies actual decoded-recording source starts, physical press/release without duplicate input sounds, repeat suppression, all five previews, download cancellation, mute, saved preferences and mobile layout. Automated checks do not replace listening comparisons across different speakers and operating systems.
