# Appearance and viewport layout — v0.6

Open **Settings → Appearance** to choose **Light**, **Dark**, or **System**. System follows device color-scheme changes while the page remains open. Dark preserves the original night palette; Light uses warm paper surfaces and forest-colored text. Illustrated worlds retain their cinematic palette, with a light typing terminal when Light is selected.

Choose **Amber**, **Sage**, or **Ocean** as the accent for controls, focus rings and selected items. High contrast, reduced motion and larger typing text remain available under Comfort & accessibility. Appearance choices are stored in the existing local journal with no sign-in; older saves default to Dark and Amber and retain progress, sound choices and custom drafts. Unknown theme/accent values fall back safely.

The fixed sidebar uses the dynamic viewport height and reserves space for Settings and the guest profile. Its upper navigation/story area scrolls when the window is short. At narrow widths the sidebar keeps its compact avatar, while the header shows **Unknown courier**, Guest status and XP. Safe-area padding keeps the footer above supported mobile browser insets.

Implementation:

- `game/appearance.ts`: typed preference values and normalization.
- `game/storage.ts`: migration-compatible defaults and persistence.
- `components/AppearanceSettings.tsx`: labeled native radio controls.
- `components/Keybound.tsx`: device-theme listener, appearance state and sidebar structure.
- `app/appearance.css`: themes, accent palettes, light reading surfaces and viewport layout. Shared styles use semantic light-theme tokens with their original dark values as fallbacks.

Verification covers old saves, restored preferences, seven viewport sizes (including short and landscape windows), dynamic System theme changes, explicit theme overrides, mobile layout, light-theme typing and the existing sound toggle behavior.
