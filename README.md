# Sudoku tool

Personal killer-sudoku solving tool (iPhone home-screen web app). Plain HTML/CSS/JS, no build step, data in `localStorage`.

Live: https://davidjohnharries.github.io/sudoku-app/

## Using it
- **Select:** tap a cell; drag to select several; tap the only selected cell again to deselect.
- **Modes:** Digit · Corner (small digits along the top/bottom edges: where a digit can go in a house) · Centre (candidates for the cell) · Colour.
- **Number pad** toggles that digit in the current mode on all selected cells (givens are locked). Placing a digit removes it from corner/centre notes in the same row, column, box and cage.
- **Colour:** up to 3 colours per cell, drawn as pie slices. A 4th colour is ignored (with a message) — remove one first. **Clear colours** (in the pad in Colour mode) removes all colours from the selected cells.
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
colour r5c5 14                 # colour numbers 1-9, up to 3, in order (pie slices)
elim r3c7 12479 12389          # ruled-out combos for the cage whose top-left cell is r3c7
time 754                       # seconds on the clock
solved
```

Extending: new constraints get new keywords, e.g. `thermo r1c1 r1c2 r1c3` (bulb first), `arrow r2c2 > r2c3 r2c4`, `kropki white r1c1 r1c2`, `xv x r1c1 r1c2`. Unknown keywords are kept (re-exported unchanged) and reported as "not supported yet", so older versions of the app don't lose data.
Bump the header to `v2` only for a change that older parsers would misread.

Palette: 1 red · 2 orange · 3 yellow · 4 green · 5 teal · 6 blue · 7 purple · 8 pink · 9 grey.

`tools/gen_killer.py` generated the sample puzzle (random cages, checked for a unique solution).

## Selecting (v2)
- Double-tap a cell: selects its cage (or its 3x3 box if it has no cage). Triple-tap: its 3x3 box. A short message names what was selected.
- **☐ Multi** (toolbar): when on (blue), taps add/remove single cells, drag adds, and double/triple taps add the cage/box to the selection.
- **Select by colour** (Colour mode): tap **◎ Select colour**, then a colour; or long-press a colour key. Selects every cell containing that colour (cells with that colour among others are included). In Multi mode it adds to the selection.
- Zoom is blocked everywhere (pinch and double-tap).
