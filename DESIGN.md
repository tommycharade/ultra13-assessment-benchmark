---
name: Ultra13 Agent Benchmark
description: A scientific evidence observatory for operating and comparing a 100-agent security assessment cohort.
colors:
  archive-paper: "#f8f6ef"
  bright-paper: "#fffefa"
  outer-canvas: "#eeeae1"
  midnight-ink: "#081736"
  softened-ink: "#32405a"
  hairline: "#c8c9c8"
  structural-line: "#969ba5"
  cobalt-action: "#075ee6"
  evidence-teal: "#06aeb8"
  oxygen-cyan: "#0cb9ef"
  review-saffron: "#e5a00c"
  blocker-coral: "#df4b38"
  evidence-teal-text: "#087b83"
  oxygen-cyan-text: "#056b8c"
  review-saffron-text: "#9b6400"
  blocker-coral-text: "#a93627"
  completion-green: "#159678"
  unassigned-gray: "#9da0a5"
  focus-amber: "#f0ae18"
  hover-wash: "#eef4ff"
  static-evidence: "#99e9f0"
typography:
  display:
    fontFamily: "Saira Extra Condensed, sans-serif"
    fontSize: "clamp(44px, 6vw, 82px)"
    fontWeight: 700
    lineHeight: 0.88
    letterSpacing: "-0.01em"
  heading:
    fontFamily: "Saira Extra Condensed, sans-serif"
    fontSize: "clamp(16px, 1.3vw, 21px)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.035em"
  body:
    fontFamily: "Atkinson Hyperlegible, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Saira Extra Condensed, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.035em"
  measurement:
    fontFamily: "Azeret Mono, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.04em"
  score:
    fontFamily: "Poor Story, sans-serif"
    fontSize: "clamp(48px, 4vw, 64px)"
    fontWeight: 400
    lineHeight: 0.72
rounded:
  square: "0"
  round: "50%"
spacing:
  hairline: "1px"
  compact: "0.35rem"
  control: "0.65rem"
  panel: "1rem"
  section: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.cobalt-action}"
    textColor: "{colors.bright-paper}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0.65rem 1rem"
    height: "43px"
  button-secondary:
    backgroundColor: "{colors.bright-paper}"
    textColor: "{colors.midnight-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0.35rem 0.65rem"
    height: "34px"
  cohort-cell:
    backgroundColor: "{colors.bright-paper}"
    textColor: "{colors.midnight-ink}"
    rounded: "{rounded.square}"
  evidence-label:
    backgroundColor: "{colors.static-evidence}"
    textColor: "{colors.midnight-ink}"
    typography: "{typography.measurement}"
    rounded: "{rounded.square}"
    height: "31px"
---

# Design System: Ultra13 Agent Benchmark

## Overview

**Creative North Star: "The Evidence Observatory"**

The interface treats each assessed agent as an indexed evidence specimen, not a generic dashboard card. Its world combines a scientific plate archive with an operations control room: warm paper, midnight structural bands, registration-like hairlines, fixed comparison cells, explicit measurements, and restrained status signals. The result is dense, rigorous, and calm enough to support repeated assessment work.

The observatory is flat and evidence-led. Hierarchy comes from topology, typography, rules, and a disciplined color vocabulary rather than rounded containers or decorative effects. The dominant 100-cell cohort plate makes coverage tangible; the workflow rail, evidence inspector, score distribution, and outcome mix let the operator move from cohort state to one reproducible record without changing visual language.

Motion behaves like instrument feedback: a selected specimen registers once, and newly selected evidence settles into place. It should never loop, distract, or suggest certainty the data does not contain.

**Key Characteristics:**

- Indexed, plate-like cohort geometry with visible empty positions.
- Warm archival surfaces held together by midnight structure and fine rules.
- Condensed operational labels, highly legible body text, and monospaced evidence measurements.
- Cobalt for action, cyan/teal for assessed evidence, saffron for review, and coral for blockers.
- Flat, square, comparison-friendly components with color, shape, label, and count working together.

## Colors

The palette reads as laboratory evidence laid out on archival paper. `archive-paper` is the primary working surface; `midnight-ink` provides both text and the strongest structural planes.

### Primary

- **Midnight Structure** (`midnight-ink`): anchors the identity band, navigation, table headings, dialog headers, and primary copy.
- **Cobalt Action** (`cobalt-action`): reserved for interactive emphasis, progress meters, links, selected navigation, and histogram bars.

### Secondary

- **Evidence Teal** (`evidence-teal`): identifies assessed or controlled evidence in fills; `evidence-teal-text` is its WCAG AA paper-surface foreground.
- **Oxygen Cyan** (`oxygen-cyan`): the brighter evidence signal on midnight surfaces; `oxygen-cyan-text` is its accessible paper-surface score and heading variant.
- **Static-Evidence Aqua** (`static-evidence`): a compact field label, never a broad decorative fill.

### Tertiary

- **Review Saffron** (`review-saffron`): marks QA, suspected/partial outcomes, and cautionary method notes; `review-saffron-text` is used on paper.
- **Blocker Coral** (`blocker-coral`): marks blocked agents, triggered findings, and destructive actions only; `blocker-coral-text` is used for paper-surface foregrounds.
- **Completion Green** (`completion-green`): confirms a finalized lifecycle state.

### Neutral

- **Archive Paper** (`archive-paper`): the default panel and application surface.
- **Bright Paper** (`bright-paper`): table bodies, score readouts, and controls that need a small lift from the archive ground.
- **Outer Canvas** (`outer-canvas`): the quiet margin beyond the fixed desktop composition.
- **Softened Ink** (`softened-ink`): descriptions, metadata, and secondary explanatory text.
- **Hairline** (`hairline`) and **Structural Line** (`structural-line`): ordinary cell rules and stronger panel boundaries respectively.
- **Unassigned Gray** (`unassigned-gray`): genuinely unassigned or unknown cohort state, not disabled copy.
- **Hover Wash** (`hover-wash`): the common interactive hover surface.
- **Focus Amber** (`focus-amber`): keyboard focus, chosen for visibility across both paper and midnight surfaces.

**The Evidence Color Rule.** Cyan and teal communicate evidence state; they are not ambient brand decoration.

**The Consequence Color Rule.** Saffron, coral, and green appear only when the underlying state has review, blocker, or completion meaning.

**The No-Gradient Rule.** Every surface is a flat field or transparent wash. Do not add gradients or glass effects.

**The Ink-First Contrast Rule.** On paper surfaces, semantic text uses midnight ink, cobalt, or the explicit darker `*-text` semantic variants. Brighter cyan, teal, saffron, and coral remain fills or dark-surface accents.

## Typography

- **Display and heading font:** Saira Extra Condensed, with `sans-serif` fallback.
- **Body font:** Atkinson Hyperlegible, with `sans-serif` fallback.
- **Measurement font:** Azeret Mono, with `monospace` fallback.
- **Score font:** Poor Story, with `sans-serif` fallback.

**Character:** Saira Extra Condensed makes the dense hierarchy feel operational and gives long headings authority without consuming horizontal space. Atkinson Hyperlegible keeps explanatory text readable, Azeret Mono makes provenance and identifiers inspectable, and Poor Story gives the derived score a conspicuous hand-marked character that separates it from native Ultra13 data.

### Hierarchy

- **Display** (`typography.display`): ledger and methodology titles; uppercase and used sparingly.
- **Heading** (`typography.heading`): panel names, workflow stages, table headings, and inspector sections; predominantly uppercase.
- **Body** (`typography.body`): explanations, method copy, notes, and descriptions; prose blocks generally stay within 48–65 characters per line.
- **Label** (`typography.label`): action text, stage pills, compact navigation, and control labels; uppercase with firm tracking.
- **Measurement** (`typography.measurement`): repository versions, indices, digests, counters, chart labels, score components, and timestamps. Do not use it for paragraph prose.
- **Score** (`typography.score`): the large selected-agent score only. Supporting denominator and score-component values remain monospaced.

**The Measurement Integrity Rule.** Identifiers and quantities use the measurement face; narrative and interpretation never do.

**The One Hand-Marked Number Rule.** Poor Story is exclusive to the selected score. Repeating it elsewhere would turn a useful distinction into decoration.

## Layout

The desktop observatory is a fixed 1586:992 composition that scales within the viewport and becomes active at widths of 1180px and above. Its first viewport is deliberately complete: a 10%-high identity band sits over a 65%-high operating field and a 25%-high trend band. Within the operating field, the workflow rail occupies 15% of the width, the cohort plate 46%, and the evidence inspector 39%. The lower band splits 52% to score distribution and 48% to the two-column outcome mix.

The 10×10 cohort plate is the visual and interaction anchor. Every slot keeps the same size so assessed, queued, blocked, and empty states remain directly comparable. Panel padding is compact and consistent; use the documented spacing scale for recurring internal rhythm, with 1px hairlines maintaining registration across adjacent surfaces.

At 1179px and below, absolute positioning becomes a single document flow: identity and actions, a four-column workflow grid, a square 10×10 cohort plate, the inspector, distribution, and outcomes. The floating view switcher is centered at the bottom. At 700px and below, the workflow becomes two columns, the plate becomes 5×20 with a 42px minimum row, inspector and outcomes stack to one column, score-component meters and weight labels yield to the value itself, formula/provenance grids become one column, and the full header navigation gives way to the persistent view switcher. The application remains usable down to 320px.

**The Cohort-First Rule.** Do not break the fixed cell comparison by replacing the plate with cards, masonry, or variable-height rows.

**The One-Pass Responsive Rule.** Preserve the same information order on smaller screens; reflow it instead of creating a reduced mobile product.

## Elevation & Depth

The system is flat by default. Depth comes from adjacent color planes, 1px rules, inset registration, and the midnight/paper contrast—not from card stacks. The only ambient shadows belong to elements that genuinely float above the evidence plane: the persistent view switcher, status toast, and modal dialog. The primary action uses an inset cobalt line as tactile reinforcement, not an external drop shadow.

**The Flat Evidence Rule.** Resting data surfaces have no shadow. If a panel can be located by its rule and plane, it does not need elevation.

**The Transient Shadow Rule.** Reserve shadows for floating navigation, transient feedback, and modal layers; never use them to turn every data group into a card.

## Shapes

Square geometry is the default. Panels, controls, tables, chart frames, score boxes, and evidence labels use hard corners and hairline boundaries. Circular geometry belongs to stage nodes and neutral/assessed state markers. Review is a saffron diamond; blocked is a coral triangle. These silhouettes preserve status meaning in monochrome and reinforce the specimen-registration metaphor.

Selected cohort cells gain a cyan inset rule plus a second inner registration box. The treatment is precise and local: selection never changes cell size or disturbs the plate grid.

**The Shape Carries State Rule.** A state color must retain its assigned silhouette—circle for assessed/unassigned, diamond for review, triangle for blocked.

**The Square Instrument Rule.** Do not introduce casual pills or rounded cards. Rounded geometry is semantic, not a universal softening treatment.

## Components

### Identity band and counters

The midnight band holds the product title, assessed/review/open-slot counters, compact export/refresh actions, and the primary upload control. Counters use monospaced values with semantic color; divisions are hairlines rather than separate cards. On responsive layouts, summary counters disappear before operational actions do.

### Buttons

- **Primary:** a square cobalt control with a pale cobalt border, inset reinforcement, uppercase condensed label, and 43px minimum height. Hover deepens the cobalt.
- **Secondary:** bright paper, structural border, uppercase condensed label, and 34px minimum height. Hover uses `hover-wash`; the destructive variant changes label and border toward blocker coral.
- **Text action:** transparent and cobalt on paper; cyan on midnight hover. Use for methods, refresh, export, or evidence inspection—not as a substitute for the primary upload action.
- **Icon action:** a 38×38 square with a structural border. Every icon-only action requires an accessible name.
- **Focus:** keyboard-focusable controls and links use a 3px `focus-amber` outline with 2px offset.

### Workflow rail

Each lifecycle row combines a 28px semantic glyph, condensed uppercase stage name, plain-language description, and monospaced count. A fine vertical timeline and row rules make it one continuous instrument. Hover and active states share the same pale wash; QA, completion, and blocker glyphs take their semantic colors.

### Cohort plate

The signature component is a numbered 100-slot matrix. Index sits top-left, state marker stays centered, and any score sits bottom-right. Empty slots remain visible and disabled so coverage is legible. Interaction states use a 140ms ease transition for background, inset rule, and registration feedback; selection adds a single 360ms ease-out register animation from 78% scale and zero opacity.

### Evidence inspector

The selected record combines agent identity, compatibility line, large derived score, weighted component rows, static-evidence label, provenance digest, raw JSON access, and stage actions. Evidence subsections settle upward by 7px over 260–320ms with a short 35–70ms stagger. Missing evidence is written explicitly rather than represented by an empty chart or an optimistic default.

### Charts and outcome rows

Charts use labeled axes, visible numeric values, and the measurement face. Outcome rows pair a shape/color key with a text label, proportional bar, raw count, and percentage. Histogram bars use cobalt; outcome bars use the same semantic state colors as the cohort plate. Never remove labels to save space.

### Ledger and methodology surfaces

The ledger is a ruled, high-density table with a midnight heading row, rectangular stage pills, and monospaced scores/versions. The methodology surface uses an editorial two-column formula grid, a saffron warning rule, and generous reading width. Both retain the observatory palette and typography rather than becoming visually separate microsites.

### Feedback and modal evidence

Toasts are compact, high-contrast transient messages with success or warning semantics and a subtle floating shadow. Raw JSON opens in a modal with a midnight header and dark code plane; provenance remains monospaced. The backdrop is strong enough to make modality unambiguous.

### Motion and reduced motion

Motion is short, one-shot, and tied to selection or changed evidence. There are no looping or scroll-triggered effects. Under `prefers-reduced-motion: reduce`, disable smooth scrolling, transitions, and both `specimen-register` and `evidence-settle` animations; all state changes must remain fully understandable in their final static frame.

## Do's and Don'ts

### Do

- **Do** keep the 100 cohort positions visible, indexed, and directly comparable.
- **Do** pair every status color with shape, label, count, or explanatory text; color is reinforcement, never the sole carrier.
- **Do** preserve visible keyboard focus and native button, link, table, dialog, and heading semantics.
- **Do** keep chart axes, legends, counts, percentages, and accessible names intact across breakpoints.
- **Do** state unknown, unsupported, missing, and unassessed evidence explicitly.
- **Do** use generated comp files in `.impeccable/mocks/` only as design references. Their adjacent `.png.json` files preserve prompt and approval provenance.
- **Do** give any future shipping raster asset its own source, rights/license, generation prompt or transformation history, and intended use before it enters the public bundle.

### Don't

- **Don't** use the generated comps as runtime imagery. The shipping interface currently has no raster assets; its visuals are CSS, text, data, and inline SVG.
- **Don't** use gradients, glassmorphism, perspective device frames, decorative illustration, or excessive rounded containers.
- **Don't** turn cyan, saffron, coral, or green into atmospheric decoration; each has a data-state job.
- **Don't** set paper-surface semantic text directly in oxygen cyan, evidence teal, review saffron, or blocker coral. Use their darker `*-text` variants, which are the implemented accessible foreground tokens.
- **Don't** replace labeled charts with unlabeled decorative bars or hide unknowns to simplify the composition.
- **Don't** imply that the derived benchmark score is native Ultra13 data, or that static evidence makes a runtime claim.
- **Don't** remove information from mobile merely to shorten the page; preserve the evidence order and reflow it.
- **Don't** animate continuously, and don't leave keyframe animations active when reduced motion is requested.

**Accessibility audit test.** A keyboard-only operator must be able to change views, select an agent, inspect provenance, advance or block a stage, and open/close raw JSON while always seeing focus; status must remain interpretable if all semantic colors are rendered as gray.

**Raster provenance status.** The project has no shipping raster assets. The generated PNGs under `.impeccable/mocks/` are non-shipping design studies with adjacent provenance sidecars; the production UI does not load them.
