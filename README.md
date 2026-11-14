# Ranger Knight

A small 2D medieval battler built on rock-paper-scissors. You are the knight. Read each foe's pose, pick the counter before the 5-second countdown ends, and defeat all 11 encounters.

It is plain HTML, CSS and JavaScript, with no build step, no dependencies and no asset files. All art and audio are generated in code as placeholders.

## How to run

**Quickest:** open `index.html` in Chrome, Edge, Firefox or Safari (double-click it). Everything loads as classic scripts, so it also works from `file://`.

**In Visual Studio Code:**

1. Choose **File → Open Folder…** and select the `ranger-knight` folder.
2. Press **F5**, or open **Run and Debug** and choose **Play Ranger Knight (Chrome)** or **(Edge)**. This uses VS Code's built-in JavaScript debugger with `.vscode/launch.json`, so breakpoints work.
3. Optional: install the recommended **Live Server** extension, right-click `index.html`, and choose **Open with Live Server** to auto-reload on save.

To run the logic tests, use **Terminal → Run Task… → Run logic tests**, or run:

```bash
node tests/run-tests.js
```

Sound starts only after your first click or key press, which is how browsers allow audio.

## Controls

| Action | Mouse / touch | Keyboard |
| --- | --- | --- |
| Shield (green, rock) | tap the green button | `1` |
| Sword (red, scissors) | tap the red button | `2` |
| Battlecry (yellow, paper) | tap the yellow button | `3` |
| Pause / resume | Pause button | `Esc` or `P` |
| Confirm panels | buttons | `Enter` / `Space` on the focused button |

Green beats Red, Red beats Yellow, Yellow beats Green, and matching colours draw. You can change your choice until the countdown hits zero. Shield is selected by default each round.

Mute, volume and reduced motion are on the title screen and in the pause menu. They are saved in the browser.

## Main files

| File | Responsibility |
| --- | --- |
| `index.html` | Page structure: screens, HUD, battlefield overlays, ability buttons and panels. Loads the scripts in order. |
| `css/style.css` | All styling, the responsive layout and reduced-motion rules. |
| `js/config.js` | Tunables: player hearts, countdown length, Medium reveal time and animation timings. |
| `js/data/enemies.js` | The enemy roster as **data**: names, difficulty, hearts, patterns, phases, ability names, pose text, art parameters and scene. |
| `js/core/rules.js` | Matchup rules, result explanations and hint rules. No DOM. |
| `js/core/encounter.js` | One encounter: health, committed enemy move, pattern index, phases, history and retry. No DOM. |
| `js/core/game.js` | Explicit state machine (menu → intro → countdown → resolving → …). Input, the game clock and damage live here. It uses no timers and no DOM. |
| `js/view/art.js` | Placeholder artwork: the knight, humanoid enemies, dragons and backgrounds, drawn with canvas shapes. |
| `js/view/renderer.js` | Draws the battlefield each frame from game state (poses, lunges, hit flash, effects). |
| `js/view/ui.js` | Shows screens, HUD, hearts, hint bubble, result text, banners, history and panels. |
| `js/view/icons.js` | Pixel SVG icons. Each colour has its own shape: shield, blade or horn. |
| `js/audio/audio.js` | Web Audio synth: two original chiptune loops (`main`, `boss`) and the sound effects. |
| `js/main.js` | Wiring: settings, mouse, touch and keyboard input, the main loop, sound cues, and pausing when the tab is hidden. |
| `tests/run-tests.js` | Node tests for rules, data, encounters, phases, hints, the state machine and the audio data. |

## Where to change things

- **Enemies, patterns, enemy health:** `js/data/enemies.js`. `pattern: ['G','R','Y']` repeats forever. For tactic changes, use `phases: [{ maxHearts, pattern, title, announce }, …]`, listed from high to low. A phase applies while the enemy's hearts are `<= maxHearts`. Phase changes are checked between rounds and reset the sequence. On a Hard or boss enemy, add `glint: false` to a phase to hide the coloured glint so only the poses show. The Ancient Dragon's last phase does this.
- **Player health:** `playerHearts` in `js/config.js`.
- **Countdown duration:** `countdownSeconds` in `js/config.js`. It applies to every enemy, the boss included.
- **Medium reveal window:** `mediumRevealSeconds` in `js/config.js`.
- **Animation and result timing:** `timings` in `js/config.js`.
- **Difficulty hint behaviour:** `hintFor()` in `js/core/rules.js`.
- **Adding an enemy:** add an object to `RK.ENEMIES`. The progress meter and "Encounter X / N" text follow the list length. The last entry plays the boss music.

## Replacing placeholder art and audio

**Characters.** Every character is drawn through one function, `RK.Art.drawCharacter(ctx, spec, rig, x, groundY, facing, zoom)` in `js/view/art.js`. The `rig` says what to show:

- `stance` is one of `idle`, `G`, `R`, `Y`, `hit`, `victory` or `phase`.
- `act` runs from `0` (preparation pose) to `1` (full action).
- `flash`, `lying`, `alpha`, `dx`, `dy` and `accent` (the Hard-mode glint colour) handle effects and movement.

To use sprites, load an image per character, for example `spec.sprite = 'img/orc.png'`. Inside `drawCharacter`, `drawImage` the frame that matches `rig.stance`, picking a different frame when `act > 0.5`. Keep the flip for `facing < 0`. Nothing else needs to change.

**Backgrounds.** `drawScene()` in `art.js` paints a scene by name into a cached canvas. Replace its body with `drawImage(yourBackground, 0, 0, W, H)`. The battlefield's logical size is 384×216 pixels.

**Icons.** `js/view/icons.js` returns inline SVG strings. Swap them for `<img>` tags or your own SVGs.

**Music.** Tracks are note lists in `TRACKS` in `js/audio/audio.js`. Edit them, or replace `playMusic(name)` with code that loops an `<audio>` element or an `AudioBuffer`. Keep the rule that asking for the track already playing does nothing.

**Sound effects.** Effects are functions in `SFX` in `audio.js`, called by name from `js/main.js`: `select`, `tick`, `swing`, `cry`, `guard`, `block`, `hit`, `hurt`, `clash`, `victory`, `defeat`, `phase`, `fanfare`. Replace a function body with buffer playback.

## Testing aids

- `index.html?encounter=11` makes **Start Game** begin at that encounter (1–11).
- `RK.game` is available in the browser console. For example, `RK.game.round.enemyMove` shows the committed move.
