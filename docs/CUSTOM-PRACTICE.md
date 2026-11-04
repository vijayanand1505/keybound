# Custom sentences and paragraphs — v0.4

Choose **Custom Text** in the main navigation, or **Create your own practice** in Practice.

1. Add an optional title and write or paste your sentences or paragraphs.
2. Choose **Until I finish — no timer**, or a 30-second, 1-minute, 2-minute, or 5-minute session.
3. Press **Start typing** to enter the field terminal directly.
4. Type the passage with its case and punctuation. Press Enter for each displayed line break. Correct mistakes before continuing.
5. Review WPM, accuracy, consistency and weak keys. Retry or use **Back to my text** to edit the passage.

The editor shows a live preview plus word, character and paragraph counts. Blank text cannot start a session. The text limit is 12,000 UTF-16 code units, matching the native textarea length limit. The displayed practice character count uses grapheme clusters, so composed accented letters and joined emoji count as one typing unit.

## Local drafts and privacy

One working draft, including its title, text and selected duration, saves automatically in the existing IndexedDB progress record after an editing pause. Leaving the editor flushes pending edits; opening it again restores the draft. Exporting local data includes the draft. Deleting local progress removes it. Custom text is not uploaded to a server.

Pasting is allowed in the authoring editor. The gameplay terminal retains its paste protection. Existing sound packs, volume, animation, reduced-motion preferences, pause/resume, result sharing and Progress work with custom practice.

## Text handling

Pasted CRLF/CR line endings become newlines, tabs become two spaces, nonbreaking spaces become regular spaces, Unicode is NFC-normalized, non-typeable ASCII controls are removed, and outer whitespace is trimmed. Internal paragraphs, punctuation and capitalization are retained. Browser-native text inputs handle IME composition; full physical keyboard/IME coverage remains a separate test matrix.

The typing engine and visible cursor use the same grapheme segmentation, including multi-code-point emoji and accented characters. The visible passage follows progress through long text; blank paragraphs and consecutive spaces do not award empty clean-word combos. The active caret is scrolled within the terminal when needed.

An untimed session finishes when the entire text is typed. A timed session completes when the passage is finished or its time expires after typing has started; the field report shows how much was typed. Calm mode removes the time limit regardless of the selected duration.

## Source and checks

- `components/CustomPractice.tsx`: accessible editor, draft lifecycle, preview and launch action.
- `game/custom-practice.ts`: validation, pasted-text normalization, counts and shared typing-unit/window helpers.
- `game/typing.ts`: grapheme-aware progress and whitespace-safe word completion.
- `game/storage.ts`: optional backwards-compatible draft field in the existing version 1 save.
- `app/custom-practice.css`: responsive editor and preview layout.

Unit coverage checks text preparation, blank input, control removal, restored draft bounds/timers, counts, accent/emoji typing, clean-word accounting and long/blank-line windows. Browser coverage checks authoring, immediate navigation, draft restoration across reload, a full multi-paragraph accented/emoji run, journal history, timed selection and mobile layout. Existing campaign, mode effects and sound-pack journeys remain in the browser suite.
