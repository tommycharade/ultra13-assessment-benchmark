# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Inferred from the explicit brief: a static TypeScript single-page application deployed through GitHub Pages. The repository carries the public assessment snapshot; uploaded Ultra13 JSON is processed entirely in the browser. No application server or third-party analytics service is required.

## Users

- Primary operator: Codex, working through the interface to register agents, record assessment progress, upload Ultra13 evidence, verify scoring, and publish a current cohort snapshot.
- Primary viewer: the research sponsor, monitoring progress and using the resulting evidence and trend data to write an independent report.

## Product Purpose

Provide one visual control room for a 100-agent Ultra13 assessment. It must show where every agent is in the process, turn uploaded Ultra13 JSON into a transparent score out of 100, expose the evidence behind that score, and reveal cohort-level patterns without introducing non-Ultra13 security data.

Success means the sponsor can immediately see progress, blockers, score distribution, framework patterns, MAESTRO and OWASP ASI outcomes, and the evidence boundary for every agent.

## Positioning

The product is an evidence ledger rather than a generic project tracker: workflow state, benchmark score, component breakdown, provenance, and trends all resolve back to uploaded Ultra13 fields. Unknown evidence remains visible and score-affecting.

## Operating Context

- The sponsor supplies a cohort of 100 open-source agents.
- Codex onboards and assesses them through the Ultra13 UI.
- Ultra13's native evidence export is uploaded to this product.
- The product validates, normalizes, scores, and visualizes those exports.
- A versioned public snapshot in the separate GitHub repository lets the sponsor see current progress.
- The sponsor writes the report; this product supplies evidence and trends, not editorial conclusions.

## Capabilities and Constraints

- Register or import up to 100 agent records before evidence exists.
- Track lifecycle stages: queued, onboarding, discovery, scope selection, assessment, evidence exported, quality checked, complete, or blocked.
- Upload one or many Ultra13 JSON evidence bundles through the UI.
- Reject malformed or non-Ultra13 evidence with actionable errors.
- Derive `Ultra13 Benchmark Score v1` on a 0–100 scale using only uploaded Ultra13 fields.
- Show the score formula, components, deductions, unknowns, and evidence provenance for each agent.
- Show cohort progress, score distribution, MAESTRO/ASI outcome mixes, and evidence uncertainty; expose framework, compatibility, findings, and provenance fields in the ledger and exports.
- Preserve the raw uploaded bundle locally and include its SHA-256 digest in normalized state.
- Support local autosave plus project snapshot import/export.
- Load a repository-hosted public snapshot for shared read-only progress.
- Do not claim the score is a native Ultra13 score.
- Do not use external popularity, maintenance, vulnerability, performance, or model-quality data.
- Do not treat `UNKNOWN`, `UNSUPPORTED`, or missing runtime telemetry as compliant.
- Main benchmark score is static and comparable; runtime telemetry is excluded from v1 and the interface makes no runtime claim.
- Inferred deployment choice: GitHub Pages. A multi-user write backend remains an open future decision.

## Evidence on Hand

- The existing Ultra13 repository contains public-agent assessment evidence and native UI export schema examples, including canonical graphs, threat models, manifests, findings, compatibility, MAESTRO and OWASP ASI assessments.
- Three existing agents will be used as the initial end-to-end fixture set.
- No sponsor-provided 100-agent cohort exists yet.
- No external claims, testimonials, report copy, or benchmark results may be fabricated.

## Product Principles

1. Evidence before score: every point must be traceable to an Ultra13 field.
2. Unknown is visible: uncertainty is a first-class outcome, never a quiet pass.
3. Cohort and case together: aggregate patterns must always link back to individual agents.
4. Progress is operational: blockers, next action, recency, and ownership must be obvious.
5. Reproducibility over theatre: scoring version, source digest, commit, and calculation details travel with every result.

## Accessibility & Inclusion

The interface should meet WCAG 2.2 AA expectations, work by keyboard, avoid colour-only status communication, respect reduced motion, and remain usable at desktop and mobile widths.
