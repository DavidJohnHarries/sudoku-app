# Sudoku tool

Personal killer-sudoku solving tool (iPhone home-screen web app). Plain HTML/CSS/JS, no build step, data in `localStorage`.

Live: https://davidjohnharries.github.io/sudoku-app/

## Using it
- **Select:** tap a cell; drag to select several. Placing a digit in a selected cell leaves the cell selected but does not turn on number highlight (the grey/amber study overlay). Tap that cell again to turn highlight on for its digit (it stays selected); tap it once more to deselect and clear the highlight. Tapping a cell that already has a given or placed digit turns highlight on immediately. A second tap within the double-tap window still selects the cage or box. You can also tap the status line above the grid to deselect (that leaves a number highlight in place, if any).
- **Modes:** Digit · Corner (small digits along the top/bottom edges: where a digit can go in a house) · Centre (candidates for the cell) · Colour.
- **Number pad** toggles that digit in the current mode on all selected cells (givens are locked). Placing a digit removes it from corner/centre notes in the same row, column, box and cage. Placing a digit does not start number highlight — including when several cells are selected. With no cell selected, the keys switch to an outlined **Highlight** style and tap a number to study it rather than enter it (see below).
- **Colour:** up to 3 colours per cell, drawn as pie slices in a fixed palette order (red before orange before yellow, and so on). At most one colour may be **boosted** so it takes 2/3 of the pie; the others share the remaining 1/3 equally (two colours: 2/3 + 1/3; three: 2/3 + 1/6 + 1/6). With no boost the shares are equal. In Colour mode each colour key is split: **+** on the right adds that colour, or boosts it if it's already in the cell (moving the boost off any other colour); **−** on the left un-boosts a boosted colour, or removes an unboosted one. A 4th colour is ignored (with a message) — remove one first. **Clear colours** removes all colours from the selected cells.
- **Erase** clears digits first, then notes (then colours). **Undo/Redo** covers everything, including cage edits and ruled-out combos.
- **Test** (toolbar): enabled when the puzzle has a `solution` line and at least one selected cell has centre pencil marks. It flashes a green tick over each of those cells whose centre marks include the solution digit, or a red ✕ if the digit is missing, and shows a short count on the status line. Cells with a placed digit, or with no centre marks, are ignored. Nothing is changed.
- **Conflicts:** repeated digits in a row/column/box/cage turn red; a cage whose digits go over its sum, or that's full with the wrong sum, gets a red sum label. If the puzzle includes a `solution` line, a digit you placed that doesn't match it is also red. Givens are never flagged this way.
- **Σ Combos:** enabled when exactly one selected cell is in a cage (opens the whole cage), or when two or more selected cells all sit in the same cage or all sit on the same row or column (opens just those cells; type a sum if it isn't already known). Selecting an exact uncaged box-group still opens that group. Lists every set of different digits that makes the sum. Tap a row to rule it out (saved with the puzzle). Rows that don't include the digits already placed, or that can't fit a parent cage, are greyed "not possible".
- **✎ Edit puzzle:** Cages tab — drag cells, type the sum, Create cage; tap a cage to change its sum or Delete it. Givens tab — set the printed digits. Warnings: cells in two cages, cages not joined up, impossible sums for the cage size, totals ≠ 405 once every cell is caged.
- **☰ menu:** Tips, Help, Main menu, Visuals. **Main menu:** Continue (current unsolved puzzle), Select puzzle (tap to open; ⋯ = Open, Edit, Copy puzzle code, Rename, Restart, Delete), Add puzzle (Paste puzzle code, New blank). Launch opens the current puzzle if unsolved, else the main menu. Tap the timer to pause.

## Puzzle format (v1)
Plain text, one item per line. Keyword first, then values. `#` starts a comment. Cells are `rRcC` (row, column 1–9).

```
SUDOKU v1                      # required header; version number
name Sample killer
givens 53..7.... 6..195... ... # 81 chars, 1-9 or . (0 also = empty); spaces/| ignored; may wrap over lines
solution 534678912 6..        # optional published solution, same layout as givens; mismatching user digits draw red
cage 21 r1c1 r1c2 r2c1         # cage SUM CELL...
thermo r1c1 r1c2 r2c3          # thermometer, bulb first; each step to a neighbour (diagonals ok); digits strictly increase
arrow r1c1 r1c2 r1c3           # arrow: circle first, then the shaft in order to the arrowhead; shaft digits sum to the circle
arrow r1c1 r1c2 > r2c3 r3c3    # 2-3 cell circle (read as a number) before ">", then the shaft
whisper r1c1 r1c2 r2c3         # German whisper: cells in order along the line; neighbours differ by 5+
rsl r1c1 r1c2 r2c3              # region-sum line: box borders split the line into equal-sum segments (aliases: regionsum, region-sum, region_sum)
kropki w r1c1 r1c2             # white Kropki dot: consecutive digits (cells must share an edge)
kropki b r3c4 r4c4             # black Kropki dot: one digit is double the other
kropki-negative                # optional: all dots are given (no dot = neither consecutive nor double)
# --- optional solving state (Copy with progress) ---
values ..1...... ......... ... # player digits, same layout as givens
corner r1c3 125                # corner (edge) notes
centre r3c3 246                # centre notes ("center" also accepted)
colour r5c5 1 4               # colour numbers 1-9, up to 3, in palette order; 1* marks a boost
elim r3c7 12479 12389          # ruled-out combos for the cage whose top-left cell is r3c7
elim box5 1259                 # ruled-out combos for box 5's uncaged cells
groupsum box5 23               # typed sum for box 5's uncaged cells (only when it can't be worked out)
linesum 16 r1c1 r1c3 r1c5      # typed sum for an exact cell set — a line, or a 2+ cell subset of a cage (Copy with progress)
elim line r1c1 r1c3 r1c5 259   # ruled-out combos for that same cell set
time 754                       # seconds on the clock
solved
```

Extending: new constraints get new keywords, e.g. `arrow r2c2 > r2c3 r2c4`, `kropki white r1c1 r1c2`, `xv x r1c1 r1c2`. Unknown keywords are kept (re-exported unchanged) and reported as "not supported yet", so older versions of the app don't lose data.
Bump the header to `v2` only for a change that older parsers would misread.

Palette: 1 red · 2 orange · 3 yellow · 4 green · 5 teal · 6 blue · 7 purple · 8 pink · 9 grey.

Colour lines list the colour numbers present in the cell (spaces preferred; the older compact form `14` still means colours 1 and 4). Mark the boosted colour with `*`, e.g. `colour r1c1 1* 3` (red boosted, yellow equal-share remainder). A line with no `*` is unboosted (equal slices). Old files without `*` load as they did before.

`tools/gen_killer.py` generated the sample puzzle (random cages, checked for a unique solution).

## Selecting (v2)
- Double-tap a cell: selects its cage; on a cell with no cage, selects all uncaged cells in its 3x3 box (the whole box if it has no cages). Triple-tap: its 3x3 box. A short message names what was selected.
- **☐ Multi** (toolbar): when on (blue), taps add/remove single cells, drag adds, and double/triple taps add the cage/box to the selection.
- **Select by colour** (Colour mode): tap **◎ Select colour**, then a colour; or long-press a colour key. Selects every cell containing that colour (cells with that colour among others are included). In Multi mode it adds to the selection. Double-tapping a cell that is fully shaded one colour (no other slices) selects every cell that is also fully that colour; a cell with two or three colours still selects its cage or uncaged group, as in other modes.
- Zoom is blocked everywhere (pinch and double-tap).

## Uncaged groups (v3)
Double-tap a cell with no cage → selects the uncaged cells of its 3x3 box; **Σ Combos** works on that group.
- Sum = 45 − the box's cage sums when every cage touching the box lies entirely inside it.
- If a cage crosses the box edge, the sum can't be worked out: type it in the calculator header (remembered).
- Ruled-out combos and typed sums are saved per box (`box1`–`box9`) and reset automatically if cage edits change that group's cells (or its worked-out sum).
- The combos list uses 1–3 columns so the worst case (12 combos: 4 cells/20 or 5 cells/25) fits on an iPhone SE screen; it still scrolls if ever needed.

## Number selection (v4)
Selecting a single cell that already has a digit (a given or one you placed) highlights that number:
- Every cell that already contains it gets a strong amber whole-cell wash.
- Any cell with a corner or centre pencil mark of that digit gets a slightly lighter amber wash on the whole cell, and the mark itself is still drawn bold and blue (including marks that sit in a greyed cell, so you can spot ones to clean up).
- Its row, column, 3×3 box, and the rest of its cage are greyed — places the digit cannot legally go. If several of that digit are placed, all of their houses are greyed.
- The matching key on the number pad lights up.

With no cell selected, tapping a number key does the same highlight; tapping that key again clears it. (If a cell *is* selected, the pad still enters values or notes as before.) Number selection updates live as you place, erase, or note digits, and clears if you select an empty cell or more than one cell (multi-select, a cage, or a box). It is not used in Colour mode, where the keys are colours. On a keyboard, Esc clears the cell selection and the number highlight.

Number highlight turns on when you tap a cell that already has a digit, when you tap the still-selected cell after placing a digit, or when you tap a pad key with no cell selected (the keys are outlined and labelled **Highlight**). It does not turn on merely from placing a digit. If highlight is already on, tapping the selected cell deselects and clears it. Tapping the status line deselects but leaves a highlight in place, if any. A second tap on the same cell within 250ms of the previous tap is still a double-tap and selects the cage or the uncaged cells of the box.

## Selection totals and multi double-tap (v5)
- **Status line:** for any selection, **Total** adds every *fully* selected cage's sum, plus the known sum of every fully selected uncaged group (the worked-out 45 − cage-sums value, or a sum you typed in the calculator), plus the placed digit (given or yours) of any other selected cell. The cell count is how many cells are selected. If any selected cell can't be accounted for (an empty cell in a cage that's only partly selected, or an empty uncaged cell whose group has no known sum), the total is hidden and you just see e.g. `12 cells`. Combos still opens from any cell of a single cage — double-tap to select the whole cage if you want its printed sum in the total.
- Distances to the nearest multiples of 45 sit on the same line: `Total 65 (12 cells)  45+20 · 90−25`. Below 45, only the distance up: `Total 30 (5 cells)  45−15`. An exact multiple is `= 45` or `= 2×45`. The line shrinks slightly if it would otherwise overflow an iPhone-width screen.
- **Multi mode, double-tap:** still adds the cage (or the uncaged cells of the box). If the double-tapped cell was already selected *before* the first tap of the double-tap, the whole cage or uncaged group is removed instead. (The first tap would have toggled that one cell, so the decision uses the earlier state.) Triple-tap still adds the 3×3 box.

## Colour boost and pad (v6)
- Colours always draw in palette order, no matter which you added first. The pie starts 30° clockwise from 12 o'clock, so a two-colour equal split has its dividing line 30° off vertical; every other split uses the same start angle.
- **+** / **−** on a colour key apply to every selected cell independently (useful in Multi mode). Long-press a key, or ◎ Select colour, still selects every cell that contains that colour.
- Keyboard 1–9 in Colour mode acts as **+**. There is no keyboard **−**; use the left half of the key, or Clear colours.

## Deselect, number highlight, solution (v7)
- Tapping the already-selected cell deselects it immediately, including when it holds a given or a digit you placed, and clears the number highlight so the grid is back to normal. A second tap within the double-tap window still selects the cage (or the uncaged cells of the box).
- To highlight a number with no cell selected, tap it on the pad (the keys show **Highlight**). Tapping the status line deselects cells but leaves a highlight in place, if any.
- Number-highlight greys are a little darker than before. Every cell that contains the number, or a pencil mark of it, has a whole-cell amber tint (stronger when the number is placed).
- Optional `solution` line (81 digits, same layout as `givens`). It is part of the puzzle and is included in both Copy puzzle and Copy with progress. A user-placed digit that doesn't match is red; givens are not checked this way.

## Deselect clears highlight (v8)
Tapping the already-selected cell now also clears the number highlight (the v7 behaviour of leaving it on made the grid still look selected). Pad highlight — no cell selected, then tap a digit — is unchanged.

## Place digit without highlight (v9)
Selecting a cell and placing a digit leaves the cell selected, but does not turn on number highlight (grey houses and amber cells). Tap that same cell again to turn highlight on for the digit; tap it again to deselect and clear highlight, as in v8. Highlight still turns on when you tap a cell that already has a given or placed digit, or when you tap a pad key with no cell selected. Placing a digit on several cells at once also stays out of highlight mode.

## Solved celebration and a harder puzzle (v10)
Finishing a puzzle no longer shows a brief toast. A gold ripple spreads across the grid from the last digit you placed, the digits glow, and a short burst of confetti falls; then a card names the puzzle, shows your time, and offers a short "Nice."-style line, with **Close** and **Main menu**. The animation is skipped when the device asks for reduced motion (the card still appears). Opening an already-solved puzzle does not replay it.

A published hard killer is in `puzzles/escape-room-sujoyku.txt` — *Escape Room* by sujoyku (Logic Masters Deutschland, 8 Aug 2024). Plain killer rules, no givens, only 15 cages. Paste it in from the puzzle list.

## Line sums and a tighter double-tap (v11)
- **Line sums:** if you select two or more cells that all lie in the same row or the same column — even if they sit in different boxes, skip cells, or some of them belong to cages — **Σ Combos** lets you type a sum for that exact set. The sum is remembered and shown in **Total** only when you select those same cells again (a larger or smaller selection does not use it, so it is never mixed with cage or group totals). Double-tap is unchanged: it still selects a cage or the uncaged cells of a box, not a row or column. A full row or column is 45 automatically. Existing typed sums for uncaged box groups still work, and old saved puzzles load as before.
- **Double-tap window:** shortened from 350ms to 250ms, measured as the gap between consecutive taps on the same cell (from lifting the finger to putting it down again). A slightly slower second tap now deselects instead of selecting the cage.

## Cage subsets, set sums, longer celebration (v12)
- **Σ rules:** one selected cell inside a cage opens the calculator for the *entire* cage. Two or more selected cells that all belong to the same cage, or all lie on the same row or the same column, open the calculator for *just those cells*. Selecting a cage exactly still uses the printed cage sum (not a typed set-sum). Double-tap is unchanged: an exact uncaged box-group still has its own sum and combos. Anything else leaves Σ disabled.
- **Cage-subset sums** are typed and remembered like line sums (same `linesum` / `elim line` lines, keyed by the exact cells), including L-shaped subsets that are not on a line. The combo list is for the subset's size and sum; combinations that cannot appear inside a remaining combo of the parent cage are greyed.
- **Total** follows the Σ target when there is one: a single caged cell shows the cage sum and the cage's cell count (the cell's own digit is not also added). An exact typed set-sum is used alone, never added on top of cage or group totals. Mixed selections (two cages, a cage plus leftover digits, and so on) still add up as before when they are not a single Σ target.
- **Celebration** lasts longer: a slower gold ripple, digits that glow with a second pulse, and three bursts of confetti (an opening fountain from the last-placed cell, then two firework bursts), with the solved card arriving while the last burst is still falling. Reduced-motion devices still skip the animation and show the card at once. Opening an already-solved puzzle still does not replay it.

## Test centre marks and colour double-tap (v13)
- **Test** sits at the right of the bottom toolbar (Undo, Redo, Multi, Erase, Test). It is enabled only when the imported puzzle includes a `solution` line and at least one selected cell is empty and has centre pencil marks. Pressing it checks just those cells: a green tick if the solution digit is among the centre marks, a red ✕ if it is missing. The marks fade after about 1.5 seconds. The status line shows a count such as `Test: 5 ok, 1 missing`. Corner marks, placed digits, and unselected cells are not checked, and the puzzle state is not changed.
- **Colour mode, double-tap:** if the cell is fully shaded a single colour, the double-tap (same 250ms window) selects every cell that is also fully that colour. Mixed or empty cells still select the cage or the uncaged cells of the box, as before. In Multi mode the same-colour cells are added, or removed if the double-tapped cell was already selected before the first tap. Triple-tap still selects the 3×3 box. **◎ Select colour** / long-press is unchanged: it still includes cells that only have that colour as one slice of several.

## Thermometers and Help (v14)
- **Format:** `thermo BULB CELL...` — 2–9 cells in order from the bulb, each a king-move neighbour of the previous one. Problems (gaps, repeats) import with a warning and show in the editor.
- **Drawing:** grey bulb + rounded line in its own SVG layer (`#thermo`, `mix-blend-mode:multiply`) above the cells and below the cage outlines, so digits, notes, colours and highlights show through. A thermo whose placed digits break the order turns light red; offending digits turn red like other conflicts (and block the solved check).
- **Rule:** digits strictly increase from the bulb. Thermo cells count as peers: placing a digit removes it from notes on the same thermo, and the number highlight greys them.
- **Repeated taps** walk a list: cage → thermo(s) → (uncaged cells only) box's uncaged group → box. So a plain cage cell is unchanged (double = cage, triple = box); a caged thermo cell is double = cage, triple = thermo, 4 taps = box; an uncaged thermo cell is double = thermo, triple = uncaged group, 4 taps = box.
- **Σ on a thermo** (exact thermo selection, or a single uncaged thermo cell) opens a range sheet: position k of n allows k..9−(n−1−k), narrowed by placed digits along the thermo. Exact cage/group selections still win; a thermo beats a line/cage-subset set with the same cells.
- **Editor:** new Thermos tab. Drag (or tap cells) from bulb to tip; a drag only picks up a cell near its centre so diagonals don't clip corners. Tap the last cell again to drop it. With nothing selected, tap a thermo to edit (extend/update) or delete it.
- **Help:** Help (☰ menu, or the main menu) opens collapsible sections. Add a new element by appending to `HELP_ELEMENTS` in app.js (controls are in `HELP_CONTROLS`).
- `tools/solve_cp.py` handles `thermo` lines and checks the `solution` line.

## Kropki dots, mode bar (v15)
- **Format:** `kropki w|b CELL CELL` (orthogonal neighbours, one dot per edge; a later line on the same edge replaces the colour) and an optional `kropki-negative` line meaning all dots are given. Both round-trip through Copy.
- **Rule:** white = differ by 1; black = 1:2 ratio (1–2 fits either). Placed digits that break a dot turn red and the dot turns red. With `kropki-negative`, neighbours without a dot that are consecutive or 1:2 turn red and get a dashed red ring on that edge. Dots are not peers (no note clearing / no highlight greying).
- **Drawing:** `#dots` SVG above the cage lines; r=10 of a 100-unit cell on the shared edge.
- **Editor:** Dots tab. Tap near an interior edge to cycle none → white → black → none (blue ring marks the last edge touched). “All dots given” toggles `kropki-negative`. Undo/redo cover both.
- **Mode bar:** Digit/Corner/Centre/Colour are now a short grey segmented control (small icon beside a label, active segment raised in white) and **Multi** moved out of the bottom toolbar onto the same row as a pill toggle (amber with a tick when on). Bottom toolbar: Undo, Redo, Erase, Test.
- `tools/solve_cp.py` handles `kropki` and `kropki-negative`.

## 3×3 pad, highlight lock, arrows (v16)
- **Pad:** digits 1–9 are a 3×3 keypad (1 2 3 / 4 5 6 / 7 8 9) on the left; Undo / Redo / Test / Erase sit in a grey column on the right (swapped in v17 at David's request). The old 10th key (⌫ / Clear colours) duplicated Erase and is gone; Erase reads "⌫ Colours" in Colour mode. Mode bar unchanged. Keys are 54px tall (50px on short screens).
- **Highlight lock:** while Multi is on, selecting cells (tap, drag, double-tap groups, select-by-colour) never changes the number highlight, and placing a digit keeps it. With no cells selected the pad sets the highlight (same key again clears it). Multi off = old behaviour.
- **Arrows:** `arrow CIRCLE SHAFT…` (or `arrow C1 C2 > SHAFT…` for a 2–3 cell pill read as a number). Drawn SudokuPad-style (grey ring/pill + line + open arrowhead) in `#arrows` (multiply, under cage lines). Red when the shaft can't match the circle (full and wrong, or already too big/small). Tap cycle: cage → thermo → arrow → uncaged group → box. Σ on an exact arrow or shaft (or one uncaged, non-thermo arrow cell) opens the ARROW sheet: each possible circle value with the shaft digit sets that make it, using placed digits and sudoku/cage visibility (repeats allowed where cells don't see each other). Tap a value on the sheet to cross out the whole row (stored as `9`), or one set to cross out just that set (stored as `9:1+2+6`); tap again to restore. If a whole value is crossed and you tap one set, the value is restored and every other set stays crossed. Manual only; saved per arrow (`elim arrow r4c6 9 8:1+2+5` in Copy with progress), cleared by Restart or by editing the arrow (v18). Editor tab "Arrows": tap circle then shaft; "Circle: N" sets pill size. `tools/solve_cp.py` supports `arrow`.

## Σ for box sets (v19)
- 2+ selected cells all in one 3×3 box (caged or not) enable Σ for exactly those cells, like a row/column set: type a sum, rule out combos, stored per exact cell set (`linesum` / `elim line` now accept box sets). A whole box (e.g. triple-tap) is a derived 45. Exact cages, uncaged box groups, thermos and arrows still take priority.

## German whispers (v20)
- **Format:** `whisper CELL CELL…` in order along the line (diagonal steps OK; `whispers`/`gw` also accepted). Neighbours on the line differ by ≥5; 5 never fits; digits may repeat.
- **Drawing:** thick translucent green line (`#whispers`, multiply, under arrows and cage lines). Turns red when placed neighbours are <5 apart or a 5 is on it; those digits go red and block the solved check.
- **Taps:** whispers join the repeated-tap list after arrows (cage → thermo → arrow → whisper → uncaged group → box).
- **Σ:** exact whisper selection (or one uncaged, non-thermo, non-arrow whisper cell) opens a read-only WHISPER sheet with each cell's possible digits from the line alone, narrowed by placed digits along it. Nothing is auto-removed from pencil marks.
- **Editor:** Whispers tab (tabs are now two rows of three). `tools/solve_cp.py` supports `whisper`.

## Colour-mode selection (v21)
- In Colour mode with cells selected, selected cells keep their colours at full brightness with a navy outline, and all other cells are dimmed (digits/marks still readable). No selection = no dimming. Other modes keep the blue selection wash.

## Highlight style (v22)
- ☰ → Highlight style: **Classic** (default, unchanged) or **Spotlight** (stored in localStorage `sdk_hlstyle`). Spotlight, outside Colour mode, keeps selected cells (navy outline) and cells with the highlighted number (amber outline: thick = placed, thin = pencilled) at full brightness and dims the rest; blocked cells dim further. Highlighted pencil digits become white-on-amber chips. Colour mode keeps the v21 look in both styles.


## Selection & highlight, main menu (v23)
- The v22 Highlight style toggle is gone (`sdk_hlstyle` is removed on load). One system: **selected** = thin navy border + slightly brighter; **highlighted** (number highlight, or Colour-mode colour) = no border, every other cell darkens; "can't go here" cells darken a little more. Selected + highlighted = border, not darkened.
- If **no** cell in the grid is coloured, selection is also tinted blue and highlighted cells amber (placed) / yellow (pencilled). If any cell is coloured, no tints anywhere. Matching pencil digits are white-on-amber chips.
- Colour mode: ◎ Select colour / long-press / double-tap a solid cell selects cells **fully** that colour and highlights cells with **any part** of it.
- ☰ → **Visuals** (last button, same style as the others) opens a scrollable bottom sheet (capped so the grid stays visible) of sliders for corner/centre mark darkness and outlines, a shared outline opacity (0–100%, default 60) for marks, placed digits and givens, cage darkness, constraint-line strength (arrows, thermos, whispers, renbans, dots), placed-digit outlines, and UI contrast. At 100, widths and colours match v40; mark outline at 200 is 5× and placed-digit outline is 4×. Lines above 100: coloured strokes (renbans, whispers) saturate and go opaque; near-grey strokes (arrows, thermos, kropki) darken toward black with no hue shift. All digit outlines (marks, placed digits, givens, highlighted and error digits) are always white. Stored in localStorage `sdk_visuals` and `sdk_contrast`.
- Screens: game, home, list, add, with history entries (browser/Android back works). Puzzle data format and `sdk_puzzles`/`sdk_cur` are unchanged.

## v24: selection outline on the grid lines; selection darkening on coloured grids
- The selection outline is an SVG path (`#selsvg`, above cage/box lines, below kropki dots) drawn centred on the grid lines, only around the outer perimeter of each connected selected region (edges shared by two selected cells stay normal grid lines). Edges on the outer frame are centred on the frame line. Width scales with UI contrast (`--selsw`, 7 grid units at 100%, never thinner than the box lines).
- If any cell is coloured (no tints), a selection also darkens every unselected cell (`#grid.sdim`, `--sdim`); this stacks with the highlight darkening, so a cell that is neither selected nor highlighted gets both. Uncoloured grids keep the v23 tints and no selection darkening.

## v25: one look for every grid; contrast rescaled
- The no-colour tint mode is gone: every grid uses the v24 coloured-grid look (selection darkens all unselected cells + perimeter outline; highlight darkens the rest; pencil chips).
- UI contrast: slider S% now gives the strength the v24 slider gave at 0.7·S% (`K_SCALE` in app.js). Stored `sdk_contrast` values are not migrated.
- New puzzles: `puzzles/grass-is-greener-sujoyku.txt` (killer + German whispers, LMD 000V1O, 2★) and `puzzles/octo-phoenixaki.txt` (killer + whispers + kropki, LMD 000USO, 1★). Both decoded from the setters' SudokuPad links; unique, solution matches.

## v26: Renban lines
- Format: `renban r1c1 r1c2 r2c3 ...` (2–9 cells in path order, king-adjacent steps). Cross-outs: `elim renban <first cell> 345 456`.
- Drawn as a thick translucent pink-violet line (`#renbans` layer, multiplied). Renban cells count as peers (placing a digit clears it from the line's other cells; Σ/arrow candidates and "can't go here" use it). Conflicts: a repeat on the line, or placed digits spanning more than n−1 → line and digits turn red.
- Repeated taps: cage → thermo → arrow → whisper → renban → uncaged group → box. Σ on a renban opens the RENBAN sheet: every run of n consecutive digits; grey = can't fit the placed digits / cell candidates (bipartite match); tap to cross out (undoable, saved, exported); "Always on the line" shows digits common to all live runs.
- Editor: new Renban tab (tabs now 4 + 3). Help: new "Renban lines" section.
- Puzzle: `puzzles/tumble-dumediat.txt` — Tumble by dumediat (LMD 000G13, 2★, renban + kropki), unique, matches the setter's solution.

## v45: A Square Arrow Ring
- New puzzle: `puzzles/a-square-arrow-ring-meggen033.txt` — *A Square Arrow Ring* by meggen033 (LMD 000MHI, 2★, arrows + renban + German whispers + white kropki), unique per `solve_cp`, matches the setter's solution. Visuals are unchanged from v44 (white digit outlines, shared Outline opacity).

## v46: Region-sum lines; Bent out of Shape
- Format: `rsl r1c1 r1c2 r2c3 ...` (2+ cells in path order, king-adjacent steps; aliases `regionsum` / `region-sum` / `region_sum`). Box borders split a line into segments; the digits on each segment of a line have the same sum. Different lines may have different sums. If a line re-enters a box, that visit is a new segment. Digits may repeat if sudoku rules allow.
- Drawn as a thick translucent cyan line (`#2ecbff`, `#rsl` layer at z-index 1 with renbans and arrows, multiplied) so white digit halos cut the stroke. The Lines slider saturates it above 100 like other coloured lines. Turns red when segment sum ranges cannot meet.
- Repeated taps: cage → thermo → arrow → whisper → renban → region-sum line → uncaged group → box. Σ on a region-sum line opens a read-only REGION SUM sheet of each segment's possible sum range. Editor: new RSL tab (tabs now 4 + 4). Help: new "Region-sum lines" section. Visuals note lists region-sum lines with the other constraint lines.
- Puzzle: `puzzles/bent-out-of-shape-msdos.txt` — *Bent out of Shape* by MSDOS (LMD 000P97, 2★, region-sum lines + renban + black kropki; not all dots given), unique per `solve_cp`, matches the setter's solution. Existing default visuals are unchanged.

## v47: Region-sum Σ pane, thermo/whisper halos, fixed corner slots, Centre merge; Middling
- **Region-sum Σ:** with a region-sum line selected, Σ opens the same pane as a cell-selection Σ, with a total box at the top. Type the common sum to list each segment's combinations; a total a segment's cell count cannot make is flagged. Tap a set to cross it out (remembered per line per total, and saved with the puzzle as `rslsum` / `elim rsl`). Combinations that clash with digits already placed on that segment go grey (placed digits only, not pencil marks). Ordinary cell-selection Σ is unchanged.
- **White outlines on thermos and whispers:** `#thermo` and `#whispers` share z-index 1 with arrows, renbans and region-sum lines, so `#ink` (z-index 2) paints the white halo over them as well. Thermo bulbs still sit on top of a region-sum line they overlap (later in the DOM, same z-index). The Lines slider is unchanged.
- **Fixed corner-mark slots:** each digit always takes the same slot — 1–5 along the top, 6–9 along the bottom. Empty slots stay empty. Cage-total cells still indent the top row.
- **Double-tap Centre** (only when Centre mode is already on) moves every corner mark into the centre marks (union) for all selected cells, skips cells with a placed digit, and is one undo step. A tap when Centre is not already selected just switches mode, with no delay.
- Puzzle: `puzzles/middling-fulldeck-missing.txt` — *Middling* by FullDeck and Missing a Few Cards (LMD 000NFZ, 2★, region-sum lines + cages), unique per `solve_cp`, matches the setter's solution.

## v48: Odd/even and XV; A Square Odd & Even Ring
- **Odd/even cells:** `odd r1c1 r2c3 ...` and `even r1c2 ...`. A grey circle is odd (1, 3, 5, 7, 9); a grey square is even (2, 4, 6, 8) — the usual SudokuPad shapes. Drawn in a `#parity` layer at z-index 1 (with the other constraint lines, under `#ink`), so a placed digit's white halo cuts the grey shape. A digit that breaks the mark turns red. Editor: new Odd/Even tab (tabs are now 5 + 4); tap a cell to cycle none → odd → even → none.
- **X and V pairs:** `xv x r1c1 r1c2` (sum 10) or `xv v r1c1 r1c2` (sum 5), on a shared edge. Letters sit on the edge in the dots layer, with a white backing so they stay readable. The letter turns red when the digits break the rule. Editor: the Dots tab cycle is now none → white dot → black dot → X → V → none.
- **Negative XV:** only if the rules say so. `xv-negative` means all X and V are given; `xv-negative x` or `xv-negative v` applies to just that letter. Neighbours with no letter then can't make the forbidden sum. The editor's “All X/V given” toggle sets both; the Σ pane mentions the flag when it is on. This puzzle does not use a negative constraint.
- **Cages without a total:** `cage r1c1 r1c2 ...` (no number) means the digits don't repeat, and no sum is shown. Used in this puzzle for two cages.
- **Σ:** every mechanic pane now starts with a short description of the rule. An odd or even cell enables Σ and shows a one-line reminder (no combination buttons). Selecting both cells of an X or V lists the pair options, like a two-cell cage of 10 or 5; pairs that clash with placed digits go grey, and you can tap to cross one out (saved as `elim xv`). Ordinary cell-selection Σ is unchanged.
- **Region-sum ranges** in the Σ header now use the tight unique-digit range (an empty 3-cell segment is 6–24, not 3–27).
- Puzzle: `puzzles/a-square-odd-even-ring-meggen033.txt` — *A Square Odd & Even Ring* by meggen033 (LMD 000N4O, 2★, odd/even + XV + cages + kropki), unique per `solve_cp`, matches the setter's solution.

## v49: Forked arrows, letters, 4 colours; Walk around the cages
- **Forked arrows:** `arrow r1c6 r1c5 r1c4 | r2c6 r3c6` is one circle with two shafts. Each shaft sums to the circle on its own (not a combined total of every shaft cell). The editor's Arrows tab has an **Add shaft** button once an arrow is selected. Σ lists circle values with a set of digits per shaft, separated by `|`.
- **Σ exact-match:** in non-multi, if the selection is exactly one mechanic (one odd/even cell, both cells of an X/V, a whole cage or line), that mechanic's pane opens, even if the cell also sits in a larger cage. If two mechanics both match exactly, the usual priority among them is used (cage before xv, and so on). Otherwise the previous fallback still applies (a single cell in a larger cage still opens that cage).
- **Double-tap cycle:** a single tap still selects just that cell, instantly. A double-tap selects the top-priority mechanic covering it; each further double-tap cycles to the next, then back to the first. Multi mode is unchanged. Colour-mode double-tap of a solid colour, and double-tap Centre to merge corner marks, are unchanged.
- **Status line:** when there is no known total, the line uses the same label as the Σ button (Σ Odd, Σ Pairs, and so on) instead of always saying “Σ to enter a sum”.
- **Letters:** tap Colour while Colour is already selected to switch to Letter mode (tap again to go back). The keys are a b c d e f g ★ ◆. Letters are drawn on small deep-magenta tiles, in a row just below the top corner marks (so they don't cover corner slot 1), in alphabetical order then the star and diamond. They toggle on the selected cells, have undo and save/load (`letter r1c1 a c ★`, stored as `lt`), and are cleared when you clear the cell. ◎ Select letter and a long-press select every cell that has that letter.
- **Four colours per cell:** the cap is now 4 (was 3), still drawn as pie wedges with the existing 30° conic start. Old saves with 1–3 colours still load.
- Puzzle: `puzzles/walk-around-the-cages-sujoyku.txt` — *Walk around the cages* by sujoyku (LMD 000BLC, 2★, four 9-cell sumless cages, five arrows including two forks, XV and kropki, not all given). Unique per `solve_cp` under independent-shaft forks (combined-sum is impossible); matches the encoded solution.

## v50: Letter tiles in the four diagonal gaps
- Letters are capped at **4 per cell** (same as colours). Adding a fifth is ignored, with a brief “Max 4 letters per cell” toast. Old saves (and `letter` lines) with more than 4 load the first 4 in palette order (a–g, then ★, ◆).
- Tiles sit in the four diagonal gaps between the centre marks and the corners: 1st top-left, 2nd top-right, 3rd bottom-left, 4th bottom-right. A strict 30%-in diagonal would land on a 4- or 5-digit centre string, so the 11cqh tiles sit closer to the corners (centres at 13% / 32.5% and the three mirrors) to clear corner slots 1–5 / 6–9 and those centre strings. On a placed digit the tiles stay visible behind the digit and its white halo, peeking out in the corners.
