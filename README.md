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
- **☰ Puzzles:** list (autosaved, resumes where you left off), Paste puzzle, New blank, Copy (puzzle only, or with progress), Rename, Restart, Delete. Tap the timer to pause.

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
Finishing a puzzle no longer shows a brief toast. A gold ripple spreads across the grid from the last digit you placed, the digits glow, and a short burst of confetti falls; then a card names the puzzle, shows your time, and offers a short "Nice."-style line, with **Close** and **Puzzle list**. The animation is skipped when the device asks for reduced motion (the card still appears). Opening an already-solved puzzle does not replay it.

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
- **Help:** a Help button in the ☰ puzzle list opens collapsible sections. Add a new element by appending to `HELP_ELEMENTS` in app.js (controls are in `HELP_CONTROLS`).
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

