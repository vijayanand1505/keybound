# Interface, typography and copy — v0.13

DM Sans is the interface font. IBM Plex Mono is used for typing passages, code and physical key labels, where consistent character spacing matters. The KEYBOUND wordmark retains Barlow Condensed. All three fonts are licensed and hosted locally; no external font requests were added.

| Element                        | Font          | Default size                |
| ------------------------------ | ------------- | --------------------------- |
| Page headings                  | DM Sans, 600  | Responsive 28–40px          |
| Section headings               | DM Sans, 600  | 20–24px                     |
| Body copy                      | DM Sans, 400  | 16px with 1.65 line height  |
| Controls and card descriptions | DM Sans       | 14px                        |
| Header and footer              | DM Sans       | 14px, regular sentence case |
| Supporting labels              | DM Sans       | 12px                        |
| Typing passages                | IBM Plex Mono | 22px desktop, 20px mobile   |
| Signal Siege enemy words       | IBM Plex Mono | 16px desktop, 14px mobile   |

Compact battlefield layouts use smaller headings and 13px instructions to keep the launch and tutorial controls visible. Larger-text settings increase passages to 28px and arcade words to 20px. Space-themed illustrations retain their own palette and decorative labels.

`app/typography.css` holds the shared reading scale. `app/interface.css` supplies the quieter shell, generous spacing and responsive card layouts. Expedition cards use three columns on desktop and a single column with compact artwork on mobile; setup controls, metadata and result actions wrap instead of shrinking their text.

The header identifies the current page without a version badge or a repeated save message. Decorative coordinates, promotional footer claims, sidebar descriptions and duplicate heading labels are removed. The footer contains the wordmark and “Developed and maintained by Vijay Anand”; only the name links to GitHub. Home shows the three playable games, with future stories under an accessible Upcoming chapters disclosure. Signal Siege has one description and a How to play disclosure; its live status remains available to screen readers, and combat HUD feedback stays visible.

The copy uses direct descriptions of the activity: choose a game, practice your own text, review results, or adjust settings. Mission passages remain story content. Navigation and core control names remain familiar; existing saves and game rules are unchanged.

The v0.13 game-library presentation adds neutral ink and warm cream surfaces in `app/gallery.css`, original cinematic cover art, and a featured Signal Siege entry point. The header includes a direct 60-second test. Game names stay in real HTML rather than being baked into images, preserving readable type, responsive wrapping and accessibility. Cover art has responsive sizes and blur placeholders through `components/GameCover.tsx`. Cover/card hover movement respects both reduced-motion preferences. The [art-direction notes](ART-DIRECTION.md) contain the local asset paths, generation mode and complete prompts.
