# Change requests (batch into next release)

(none open)

## Done
- Pencil-mark halo (Nov 20) — done in v30 (option B from cr4-mockup): corner and centre marks get a thinner hard cut (~1/3 of the v29 note width) in arrow and renban lines. Placed digits keep the approved v28 halo thickness, now also applied on renbans. Thermos and whispers stay whole.
- Highlight bug (Nov 20) — done in v29: a centre mark of the highlighted digit always gets the amber chip. v28's `.map(noteMark)` passed the digit's index as the “weak” flag, so a 3 that was not first in the centre marks (e.g. 1234) was only bold/grey. A corner mark still gets the amber chip unless the same cell also has that digit as a centre mark, in which case the corner twin stays grey bold.
- Pencil-mark halo (Nov 20) — done in v29: the CR2 digit-shaped gap in arrow lines (option B, subtle) now also cuts around corner and centre pencil marks, not only placed digits.
- CR1 (Nov 20) — done in v28: when the highlighted digit is both a centre and a corner mark in a cell, only the centre mark gets the amber chip; the corner twin stays grey (bolder, darker).
- CR2 (Nov 20) — done in v28 (option B, subtle halo): arrow lines and heads are cut away in a thin digit-shaped gap round every placed digit, so the real cell background (white, colours, split colours, dimming) shows round the digit. Thermos, whispers and renbans are left whole.
- CR3 (Nov 20) — done in v28: `tip <text>` lines (in order) round-trip through Copy/Edit/Rename/export; ☰ > Tips shows tip N of M with Prev/Next only when there is one; greyed out when the puzzle has none. (No tips added to Thermo Arrow, per David.)
