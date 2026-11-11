# Sudoku tool

Personal killer-sudoku solving tool (iPhone home-screen web app). Plain HTML/CSS/JS, no build step, data in `localStorage`.

Live: https://davidjohnharries.github.io/sudoku-app/

## Using it
- **Select:** tap a cell; drag to select several. To deselect: tap the status line above the grid, or tap the only selected cell again after a short pause (a quick double-tap selects the cage or box instead). Number highlight, if any, stays until you tap that digit again or select a different cell.
- **Modes:** Digit · Corner (small digits along the top/bottom edges: where a digit can go in a house) · Centre (candidates for the cell) · Colour.
- **Number pad** toggles that digit in the current mode on all selected cells (givens are locked). Placing a digit removes it from corner/centre notes in the same row, column, box and cage. With no cell selected, the pad selects that number instead (see below).
- **Colour:** up to 3 colours per cell, drawn as pie slices in a fixed palette order (red before orange before yellow, and so on). At most one colour may be **boosted** so it takes 2/3 of the pie; the others share the remaining 1/3 equally (two colours: 2/3 + 1/3; three: 2/3 + 1/6 + 1/6). With no boost the shares are equal. In Colour mode each colour key is split: **+** on the right adds that colour, or boosts it if it's already in the cell (moving the boost off any other colour); **−** on the left un-boosts a boosted colour, or removes an unboosted one. A 4th colour is ignored (with a message) — remove one first. **Clear colours** removes all colours from the selected cells.
- **Erase** clears digits first, then notes (then colours). **Undo/Redo** covers everything, including cage edits and ruled-out combos.
- **Conflicts:** repeated digits in a row/column/box/cage turn red; a cage whose digits go over its sum, or that's full with the wrong sum, gets a red sum label.
- **Σ Combos:** select a cage (any of its cells) → lists every set of different digits that makes the sum. Tap a row to rule it out (saved with the puzzle). Rows that don't include the digits already placed in the cage are greyed "not possible".
- **✎ Edit puzzle:** Cages tab — drag cells, type the sum, Create cage; tap a cage to change its sum or Delete it. Givens tab — set the printed digits. Warnings: cells in two cages, cages not joined up, impossible sums for the cage size, totals ≠ 405 once every cell is caged.
- **☰ Puzzles:** list (autosaved, resumes where you left off), Paste puzzle, New blank, Copy (puzzle only, or with progress), Rename, Restart, Delete. Tap the timer to pause.

## Puzzle format (v1)
Plain text, one item per line. Keyword first, then values. `#` starts a comment. Cells are `rRcC` (row, column 1–9).

```
SUDOKU v1                      # required header; version number
name Sample killer
givens 53..7.... 6..195... ... # 81 chars, 1-9 or . (0 also = empty); spaces/| ignored; may wrap over lines
cage 21 r1c1 r1c2 r2c1         # cage SUM CELL...
# --- optional solving state (Copy with progress) ---
values ..1...... ......... ... # player digits, same layout as givens
corner r1c3 125                # corner (edge) notes
centre r3c3 246                # centre notes ("center" also accepted)
colour r5c5 1 4               # colour numbers 1-9, up to 3, in palette order; 1* marks a boost
elim r3c7 12479 12389          # ruled-out combos for the cage whose top-left cell is r3c7
elim box5 1259                 # ruled-out combos for box 5's uncaged cells
groupsum box5 23               # typed sum for box 5's uncaged cells (only when it can't be worked out)
time 754                       # seconds on the clock
solved
```

Extending: new constraints get new keywords, e.g. `thermo r1c1 r1c2 r1c3` (bulb first), `arrow r2c2 > r2c3 r2c4`, `kropki white r1c1 r1c2`, `xv x r1c1 r1c2`. Unknown keywords are kept (re-exported unchanged) and reported as "not supported yet", so older versions of the app don't lose data.
Bump the header to `v2` only for a change that older parsers would misread.

Palette: 1 red · 2 orange · 3 yellow · 4 green · 5 teal · 6 blue · 7 purple · 8 pink · 9 grey.

Colour lines list the colour numbers present in the cell (spaces preferred; the older compact form `14` still means colours 1 and 4). Mark the boosted colour with `*`, e.g. `colour r1c1 1* 3` (red boosted, yellow equal-share remainder). A line with no `*` is unboosted (equal slices). Old files without `*` load as they did before.

`tools/gen_killer.py` generated the sample puzzle (random cages, checked for a unique solution).

## Selecting (v2)
- Double-tap a cell: selects its cage; on a cell with no cage, selects all uncaged cells in its 3x3 box (the whole box if it has no cages). Triple-tap: its 3x3 box. A short message names what was selected.
- **☐ Multi** (toolbar): when on (blue), taps add/remove single cells, drag adds, and double/triple taps add the cage/box to the selection.
- **Select by colour** (Colour mode): tap **◎ Select colour**, then a colour; or long-press a colour key. Selects every cell containing that colour (cells with that colour among others are included). In Multi mode it adds to the selection.
- Zoom is blocked everywhere (pinch and double-tap).

## Uncaged groups (v3)
Double-tap a cell with no cage → selects the uncaged cells of its 3x3 box; **Σ Combos** works on that group.
- Sum = 45 − the box's cage sums when every cage touching the box lies entirely inside it.
- If a cage crosses the box edge, the sum can't be worked out: type it in the calculator header (remembered).
- Ruled-out combos and typed sums are saved per box (`box1`–`box9`) and reset automatically if cage edits change that group's cells (or its worked-out sum).
- The combos list uses 1–3 columns so the worst case (12 combos: 4 cells/20 or 5 cells/25) fits on an iPhone SE screen; it still scrolls if ever needed.

## Number selection (v4)
Selecting a single cell that already has a digit (a given or one you placed) highlights that number:
- Every cell that already contains it is tinted yellow (same as before).
- Its row, column, 3×3 box, and the rest of its cage are greyed — places the digit cannot legally go. If several of that digit are placed, all of their houses are greyed.
- Any corner or centre pencil mark of that digit is drawn bold and blue, including marks that sit in a greyed cell (so you can spot ones to clean up).
- The matching key on the number pad lights up.

With no cell selected, tapping a number key does the same highlight; tapping that key again clears it. (If a cell *is* selected, the pad still enters values or notes as before.) Number selection updates live as you place, erase, or note digits, and clears if you select an empty cell or more than one cell (multi-select, a cage, or a box). It is not used in Colour mode, where the keys are colours. On a keyboard, Esc clears the cell selection and the number highlight.

To get to "no cell selected" so the pad highlights a number instead of entering it: tap the status line above the grid (the number highlight stays), or tap the selected cell again after a short pause. A quick second tap is still a double-tap and selects the cage or the uncaged cells of the box.

## Selection totals and multi double-tap (v5)
- **Status line:** for any selection, **Total** adds every *fully* selected cage's sum, plus the known sum of every fully selected uncaged group (the worked-out 45 − cage-sums value, or a sum you typed in the calculator), plus the placed digit (given or yours) of any other selected cell. The cell count is how many cells are selected. If any selected cell can't be accounted for (an empty cell in a cage that's only partly selected, or an empty uncaged cell whose group has no known sum), the total is hidden and you just see e.g. `12 cells`. Combos still opens from any cell of a single cage — double-tap to select the whole cage if you want its printed sum in the total.
- Distances to the nearest multiples of 45 sit on the same line: `Total 65 (12 cells)  45+20 · 90−25`. Below 45, only the distance up: `Total 30 (5 cells)  45−15`. An exact multiple is `= 45` or `= 2×45`. The line shrinks slightly if it would otherwise overflow an iPhone-width screen.
- **Multi mode, double-tap:** still adds the cage (or the uncaged cells of the box). If the double-tapped cell was already selected *before* the first tap of the double-tap, the whole cage or uncaged group is removed instead. (The first tap would have toggled that one cell, so the decision uses the earlier state.) Triple-tap still adds the 3×3 box.

## Colour boost and pad (v6)
- Colours always draw in palette order, no matter which you added first. The pie starts 30° clockwise from 12 o'clock, so a two-colour equal split has its dividing line 30° off vertical; every other split uses the same start angle.
- **+** / **−** on a colour key apply to every selected cell independently (useful in Multi mode). Long-press a key, or ◎ Select colour, still selects every cell that contains that colour.
- Keyboard 1–9 in Colour mode acts as **+**. There is no keyboard **−**; use the left half of the key, or Clear colours.
