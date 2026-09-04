import '@fontsource/saira-extra-condensed/latin-700.css';
import '@fontsource/poor-story/latin-400.css';
import '@fontsource/atkinson-hyperlegible/latin-400.css';
import '@fontsource/atkinson-hyperlegible/latin-700.css';
import '@fontsource/azeret-mono/latin-400.css';
import '@fontsource/azeret-mono/latin-600.css';
import './styles.css';

import { fallbackState } from './demo';
import { mergeAgentRecord } from './merge';
import { downloadCsv, downloadJson, getRawEvidence, loadLocalState, saveLocalState, saveRawEvidence } from './storage';
import type { ActivityItem, AgentRecord, AssessmentState, JsonObject, OutcomeCounts, Stage } from './types';
import { parseCohortManifest, parseUltra13Bundle } from './ultra13';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Application root not found.');

const stageOrder: Stage[] = ['queued', 'onboarding', 'discovery', 'scope', 'assessment', 'evidence', 'qa', 'complete'];
const stageLabels: Record<Stage, { label: string; description: string; icon: string }> = {
  queued: { label: 'Queue', description: 'Awaiting intake', icon: 'queue' },
  onboarding: { label: 'Onboard', description: 'Identity & metadata', icon: 'agent' },
  discovery: { label: 'Discover', description: 'Surface & inventory', icon: 'search' },
  scope: { label: 'Scope', description: 'Deployment unit', icon: 'scope' },
  assessment: { label: 'Assess', description: 'Security evaluation', icon: 'shield' },
  evidence: { label: 'Evidence', description: 'Ingest Ultra13 JSON', icon: 'database' },
  qa: { label: 'QA', description: 'Analyst review', icon: 'clipboard' },
  complete: { label: 'Complete', description: 'Benchmark finalized', icon: 'check' },
  blocked: { label: 'Blocked', description: 'Needs attention', icon: 'warning' },
};

const loadPublishedState = async (): Promise<AssessmentState | null> => {
  try {
    const response = await fetch('./data/assessment-state.json', { cache: 'no-store' });
    if (!response.ok) return null;
    const value = (await response.json()) as Partial<AssessmentState>;
    return value.schemaVersion === 'ultra13-assessment-state/v1' && Array.isArray(value.agents)
      ? (value as AssessmentState)
      : null;
  } catch {
    return null;
  }
};

const localState = loadLocalState();
const publishedState = await loadPublishedState();
const newestState = [localState, publishedState]
  .filter((candidate): candidate is AssessmentState => candidate !== null)
  .sort((left, right) => Date.parse(right.generatedAt) - Date.parse(left.generatedAt))[0];
let state: AssessmentState = structuredClone(newestState ?? fallbackState);
let activeStageFilter: Stage | 'all' = 'all';
let activeView: 'observatory' | 'ledger' | 'method' = 'observatory';
let toastTimer = 0;

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const safeHref = (value: string): string => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? escapeHtml(url.href) : '#';
  } catch {
    return '#';
  }
};

const icon = (name: string, size = 20): string => {
  const paths: Record<string, string> = {
    upload: '<path d="M12 16V4m0 0L7 9m5-5 5 5"/><path d="M5 15v4h14v-4"/>',
    download: '<path d="M12 4v12m0 0 5-5m-5 5-5-5"/><path d="M5 20h14"/>',
    refresh: '<path d="M20 6v5h-5"/><path d="M19 11a7 7 0 10.2 4"/>',
    queue: '<path d="M5 7h14l2 6v6H3v-6z"/><path d="M3 13h5l1.5 2h5L16 13h5"/>',
    agent: '<circle cx="12" cy="7" r="4"/><path d="M4 21a8 8 0 0116 0"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>',
    scope: '<path d="M4 6h16v12H4z"/><path d="M8 3v6m8-6v6M8 15h8"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.2 8-8 10-4.8-2-8-5-8-10V6z"/><path d="M8 12l3 3 5-6"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7"/>',
    clipboard: '<path d="M8 4h8l1 3h3v14H4V7h3z"/><path d="M9 12h6m-6 4h4"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 6-7"/>',
    warning: '<path d="M12 3L2.5 20h19z"/><path d="M12 9v5m0 3h.01"/>',
    grid: '<path d="M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z"/>',
    table: '<path d="M3 5h18v14H3zM3 10h18M8 5v14"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    block: '<circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
  };
  return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" stroke-linejoin="miter">${paths[name] ?? paths.info}</svg>`;
};

const selectedAgent = (): AgentRecord | null =>
  state.agents.find((agent) => agent.id === state.selectedAgentId) ?? state.agents[0] ?? null;

const addActivity = (action: string, detail: string, agentId?: string): void => {
  const item: ActivityItem = { id: crypto.randomUUID(), at: new Date().toISOString(), action, detail, ...(agentId ? { agentId } : {}) };
  state.activity = [item, ...state.activity].slice(0, 200);
};

const persist = (): void => {
  state.generatedAt = new Date().toISOString();
  saveLocalState(state);
};

const showToast = (message: string, tone: 'ok' | 'warn' = 'ok'): void => {
  const toast = document.querySelector<HTMLElement>('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.dataset.tone = tone;
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 5000);
};

const stageCount = (stage: Stage): number => state.agents.filter((agent) => agent.stage === stage).length;
const scoredAgents = (): AgentRecord[] => state.agents.filter((agent) => agent.score !== null);

const scoreHistogram = (): number[] => {
  const bins = Array.from({ length: 10 }, () => 0);
  for (const agent of scoredAgents()) {
    const score = agent.score?.total ?? 0;
    const index = Math.min(9, Math.max(0, Math.floor(score / 10)));
    bins[index] = (bins[index] ?? 0) + 1;
  }
  return bins;
};

const histogramSvg = (): string => {
  const bins = scoreHistogram();
  const maximum = Math.max(1, ...bins);
  const width = 560;
  const height = 142;
  const left = 40;
  const baseline = 105;
  const plotHeight = 72;
  const barWidth = 32;
  const gap = 15;
  const bars = bins
    .map((count, index) => {
      const h = (count / maximum) * plotHeight;
      const x = left + index * (barWidth + gap);
      const y = baseline - h;
      const label = index === 9 ? '90–100' : `${index * 10}–${index * 10 + 9}`;
      return `<g><title>${label}: ${count} agent${count === 1 ? '' : 's'}</title><rect x="${x}" y="${y}" width="${barWidth}" height="${h}" class="hist-bar"/><text x="${x + barWidth / 2}" y="${Math.max(14, y - 7)}" text-anchor="middle" class="chart-value">${count}</text><text x="${x + barWidth / 2}" y="123" text-anchor="middle" class="chart-label">${label}</text></g>`;
    })
    .join('');
  return `<svg class="histogram" role="img" aria-label="Score distribution by ten-point range" viewBox="0 0 ${width} ${height}"><path d="M${left - 8} 10V${baseline}H${width - 15}" class="axis"/><text x="8" y="60" transform="rotate(-90 8 60)" class="axis-title">AGENTS</text>${bars}<text x="275" y="140" text-anchor="middle" class="axis-title">SCORE RANGE (POINTS)</text></svg>`;
};

const combineOutcomes = (field: 'maestro' | 'asi'): OutcomeCounts =>
  scoredAgents().reduce<OutcomeCounts>(
    (total, agent) => {
      const counts = agent.evidence?.[field];
      if (!counts) return total;
      total.controlled += counts.controlled;
      total.suspected += counts.suspected;
      total.triggered += counts.triggered;
      total.unknown += counts.unknown;
      total.notApplicable += counts.notApplicable;
      total.total += counts.total;
      return total;
    },
    { controlled: 0, suspected: 0, triggered: 0, unknown: 0, notApplicable: 0, total: 0 },
  );

const outcomeRows = (counts: OutcomeCounts): string => {
  const rows: Array<[string, number, string]> = [
    ['Controlled / not triggered', counts.controlled, 'controlled'],
    ['Suspected / partial', counts.suspected, 'suspected'],
    ['Triggered / confirmed', counts.triggered, 'triggered'],
    ['Unknown', counts.unknown, 'unknown'],
    ['Not applicable', counts.notApplicable, 'na'],
  ];
  return rows
    .map(([label, count, className]) => {
      const percent = counts.total ? Math.round((count / counts.total) * 100) : 0;
      return `<div class="outcome-row"><span class="outcome-key ${className}"></span><span>${escapeHtml(label)}</span><span class="outcome-bar"><span class="${className}" style="width:${percent}%"></span></span><strong>${count}</strong><small>${percent}%</small></div>`;
    })
    .join('');
};

const cohortPlate = (): string => {
  const byIndex = new Map(state.agents.map((agent) => [agent.index, agent]));
  const cells = Array.from({ length: state.maximumAgents }, (_, position) => {
    const index = position + 1;
    const agent = byIndex.get(index);
    const selected = agent?.id === state.selectedAgentId;
    const stateClass = !agent ? 'unassigned' : agent.stage === 'blocked' ? 'blocked' : agent.score ? (agent.stage === 'qa' ? 'review' : 'assessed') : agent.stage;
    const title = agent ? `${agent.repository} · ${stageLabels[agent.stage].label}${agent.score ? ` · ${agent.score.total}/100` : ''}` : `Slot ${index}: unassigned`;
    return `<button class="plate-cell ${stateClass}${selected ? ' selected' : ''}" data-agent-id="${escapeHtml(agent?.id ?? '')}" ${agent ? '' : 'disabled'} aria-label="${escapeHtml(title)}" title="${escapeHtml(title)}"><span class="cell-index">${String(index).padStart(2, '0')}</span><span class="cell-marker" aria-hidden="true"></span>${agent?.score ? `<span class="cell-score">${agent.score.total}</span>` : ''}</button>`;
  }).join('');
  return `<div class="plate-grid">${cells}</div>`;
};

const workflowRail = (): string => {
  const stages = [...stageOrder.filter((stage) => stage !== 'scope'), 'blocked'] as Stage[];
  return stages
    .map((stage) => {
      const count = stageCount(stage);
      const meta = stageLabels[stage];
      return `<button class="workflow-stage${activeStageFilter === stage ? ' active' : ''}" data-stage-filter="${stage}" aria-label="Filter to ${meta.label}"><span class="stage-node">${icon(meta.icon, 22)}</span><span class="stage-copy"><strong>${meta.label}</strong><small>${meta.description}</small></span><span class="stage-count">${count}</span></button>`;
    })
    .join('');
};

const componentRows = (agent: AgentRecord): string => {
  if (!agent.score) {
    const previous = agent.previousResult;
    return `<div class="empty-evidence blocked-evidence"><strong>Current assessment unscored.</strong><p>${escapeHtml(agent.blocker || 'Ultra13 did not produce a scorable assessment bundle.')}</p>${previous ? `<p>Previous completed baseline: <b>${previous.score.total}/100</b> (${escapeHtml(previous.evidence.capturedAt.slice(0, 10))}). It is retained for comparison, not counted as the current result.</p>` : ''}</div>`;
  }
  return agent.score.components
    .map((component) => {
      const percent = Math.round((component.points / component.maximum) * 100);
      return `<button class="score-component" data-component="${component.id}" title="${escapeHtml(component.detail)}"><span class="component-glyph ${component.id}">${component.id === 'assurance' ? icon('shield', 19) : component.id === 'maestro' ? 'M' : component.id === 'asi' ? 'A' : 'F'}</span><span class="component-copy"><strong>${escapeHtml(component.label)}</strong><small>${escapeHtml(component.detail)}</small></span><span class="component-weight">${component.maximum}%</span><span class="component-meter"><span style="width:${percent}%"></span></span><span class="component-points">${component.points.toFixed(1)} <small>/ ${component.maximum}</small></span></button>`;
    })
    .join('');
};

const inspector = (agent: AgentRecord | null): string => {
  if (!agent) {
    return `<div class="inspector-empty"><strong>Awaiting cohort</strong><p>Import the 100-agent list, then upload Ultra13 JSON as each assessment completes.</p></div>`;
  }
  const evidence = agent.evidence;
  return `
    <div class="inspector-intro">
      <div><h2>${escapeHtml(agent.name)}</h2><a href="${safeHref(agent.repositoryUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(agent.repository)}</a></div>
      <div class="score-box"><span class="score-number">${agent.score?.total ?? '—'}</span><span class="score-denominator">/ 100</span><small>${agent.score ? 'Derived benchmark score' : 'Current rerun unscored'}</small></div>
    </div>
    <div class="compat-line"><span class="status-dot ${agent.compatibility}"></span>Agent ${String(agent.index).padStart(3, '0')} · ${escapeHtml(agent.framework)} ${escapeHtml(agent.version)} · ${escapeHtml(agent.compatibility)} · ${escapeHtml(stageLabels[agent.stage].label)}</div>
    <section class="score-panel"><header><h3>SCORE BREAKDOWN (DERIVED)</h3><button class="text-action" id="method-link">View method</button></header>${componentRows(agent)}<p class="static-label">STATIC EVIDENCE</p></section>
    <section class="provenance-panel"><header><h3>ULTRA13 JSON PROVENANCE DIGEST</h3><button class="text-action" id="view-json" ${evidence ? '' : 'disabled'}>VIEW JSON</button></header>
      ${evidence ? `<dl><div><dt>file</dt><dd>${escapeHtml(evidence.sourceFile)}</dd></div><div><dt>sha256</dt><dd title="${escapeHtml(evidence.sha256)}">${escapeHtml(evidence.sha256.slice(0, 30))}…</dd></div><div><dt>status</dt><dd>${escapeHtml([evidence.assessmentStatus, evidence.scanMode, evidence.scanStatus].filter(Boolean).join(' · ') || 'complete')}</dd></div><div><dt>captured_at</dt><dd>${escapeHtml(evidence.capturedAt)}</dd></div><div><dt>configuration</dt><dd title="${escapeHtml(evidence.configurationDigest)}">${escapeHtml(evidence.configurationDigest.slice(0, 30) || 'unknown')}${evidence.configurationDigest.length > 30 ? '…' : ''}</dd></div><div><dt>commit</dt><dd>${escapeHtml(evidence.commit.slice(0, 12) || 'unknown')}</dd></div></dl>` : '<p class="empty-evidence">No Ultra13 evidence bundle ingested.</p>'}
    </section>
    <div class="inspector-actions"><button class="secondary-action" id="advance-agent">${icon('arrow', 17)} Advance stage</button><button class="secondary-action danger" id="toggle-block">${icon(agent.stage === 'blocked' ? 'check' : 'block', 17)} ${agent.stage === 'blocked' ? 'Clear blocker' : 'Mark blocked'}</button></div>`;
};

const summaryStats = (): { mean: number; median: number; min: number; max: number } => {
  const values = scoredAgents().map((agent) => agent.score?.total ?? 0).sort((a, b) => a - b);
  if (!values.length) return { mean: 0, median: 0, min: 0, max: 0 };
  const middle = Math.floor(values.length / 2);
  const median = values.length % 2 ? values[middle] ?? 0 : ((values[middle - 1] ?? 0) + (values[middle] ?? 0)) / 2;
  return {
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    median,
    min: values[0] ?? 0,
    max: values.at(-1) ?? 0,
  };
};

const renderObservatory = (): string => {
  const assessed = scoredAgents().length;
  const inReview = stageCount('qa');
  const openSlots = Math.max(0, state.maximumAgents - state.agents.length);
  const current = selectedAgent();
  const stats = summaryStats();
  return `
    <main class="comp-frame observatory" aria-label="Ultra13 agent assessment benchmark dashboard">
      <div class="r-topbar topbar"></div>
      <header class="r-masthead masthead"><button class="brand" data-view="observatory">ULTRA13 <span>AGENT BENCHMARK</span></button></header>
      <div class="r-assessed-counter top-counter"><strong>${assessed}</strong><span>/ ${state.maximumAgents}</span><small>ASSESSED</small></div>
      <div class="r-review-counter top-counter review"><strong>${inReview}</strong><small>IN REVIEW</small></div>
      <div class="r-queued-counter top-counter queued"><strong>${openSlots}</strong><small>SLOTS OPEN</small></div>
      <nav class="r-top-actions top-actions" aria-label="Benchmark actions">
        <button class="top-text-action" id="export-state" title="Export cohort snapshot">${icon('download', 17)}<span>EXPORT</span></button>
        <button class="top-text-action" id="refresh-state" title="Refresh dashboard">${icon('refresh', 17)}<span>REFRESH</span></button>
        <button class="primary-action" id="upload-evidence-button" aria-label="Upload Ultra13 JSON">${icon('upload')}<span>UPLOAD ULTRA13 JSON</span></button>
      </nav>

      <aside class="r-workflow-rail workflow"><button class="workflow-all${activeStageFilter === 'all' ? ' active' : ''}" data-stage-filter="all"><span>WORKFLOW</span><small>ALL ${state.agents.length}</small></button><div class="workflow-line"></div>${workflowRail()}</aside>

      <section class="r-cohort-plate cohort-area" aria-labelledby="cohort-heading">
        <header class="plate-header"><h2 id="cohort-heading">COHORT PLATE</h2><div class="plate-legend"><span><i class="legend-marker assessed"></i>ASSESSED (${assessed})</span><span><i class="legend-marker review"></i>IN REVIEW (${inReview})</span><span><i class="legend-marker blocked"></i>BLOCKED (${stageCount('blocked')})</span><span><i class="legend-marker unassigned"></i>UNASSIGNED (${openSlots})</span></div></header>
        ${cohortPlate()}
      </section>

      <aside class="inspector" aria-labelledby="inspector-heading"><div class="inspector-header"><h2 id="inspector-heading">AGENT EVIDENCE INSPECTOR</h2><button class="back-action" id="clear-selection">← BACK TO COHORT</button></div>${inspector(current)}</aside>

      <section class="distribution" aria-labelledby="distribution-heading"><header><h2 id="distribution-heading">SCORE DISTRIBUTION (DERIVED)</h2><dl class="distribution-stats"><div><dt>ASSESSED</dt><dd>${assessed} / ${state.maximumAgents}</dd></div><div><dt>MEAN SCORE</dt><dd>${stats.mean.toFixed(1)}</dd></div><div><dt>MEDIAN SCORE</dt><dd>${stats.median.toFixed(1)}</dd></div><div><dt>MIN / MAX</dt><dd>${stats.min} / ${stats.max}</dd></div></dl></header>${histogramSvg()}<p>Scores are derived from benchmark components; unknown or unassessed agents are not scored.</p></section>
      <section class="outcomes" aria-labelledby="outcome-heading"><h2 id="outcome-heading">OUTCOME MIX</h2><div class="outcome-columns"><article><h3>MAESTRO OUTCOMES</h3>${outcomeRows(combineOutcomes('maestro'))}<small>Assessed: ${assessed} / ${state.maximumAgents}</small></article><article><h3>OWASP ASI OUTCOMES</h3>${outcomeRows(combineOutcomes('asi'))}<small>Assessed: ${assessed} / ${state.maximumAgents}</small></article></div></section>
    </main>`;
};

const renderLedger = (): string => {
  const agents = state.agents
    .filter((agent) => activeStageFilter === 'all' || agent.stage === activeStageFilter)
    .sort((a, b) => a.index - b.index);
  const rows = agents
    .map((agent) => `<tr data-agent-id="${escapeHtml(agent.id)}"><td>${String(agent.index).padStart(3, '0')}</td><td><strong>${escapeHtml(agent.name)}</strong><small>${escapeHtml(agent.repository)}</small></td><td>${escapeHtml(agent.framework)}</td><td class="mono">${escapeHtml(agent.version)}</td><td><span class="stage-pill ${agent.stage}">${escapeHtml(stageLabels[agent.stage].label)}</span></td><td>${agent.evidence ? `${agent.evidence.assessmentStatus === 'complete' || !agent.evidence.assessmentStatus ? 'Assessment' : 'Attempt'} JSON + digest` : 'Awaiting evidence'}</td><td class="ledger-score">${agent.score ? `${agent.score.total}<small>/100</small>` : `—${agent.previousResult ? `<small> prior ${agent.previousResult.score.total}/100</small>` : ''}`}</td><td class="mono">${escapeHtml(agent.updatedAt.slice(0, 10))}</td></tr>`)
    .join('');
  return `<main class="secondary-view"><header class="view-header"><button class="brand" data-view="observatory">ULTRA13 <span>AGENT BENCHMARK</span></button><nav>${viewNav()}</nav><button class="primary-action" id="upload-evidence-button" aria-label="Upload Ultra13 JSON">${icon('upload')} UPLOAD ULTRA13 JSON</button></header><section class="ledger-shell"><div class="section-kicker">Cohort record · ${state.agents.length}/${state.maximumAgents}</div><div class="ledger-title"><div><h1>AGENT LEDGER</h1><p>Sortable source-of-truth summary; select a row to return to its evidence inspector.</p></div><div class="ledger-actions"><button class="secondary-action" id="import-cohort-button">${icon('table', 17)} Import cohort</button><button class="secondary-action" id="export-csv">${icon('download', 17)} Export CSV</button></div></div><div class="table-scroll"><table><thead><tr><th>Index</th><th>Agent</th><th>Framework</th><th>Version</th><th>Stage</th><th>Evidence</th><th>Score</th><th>Updated</th></tr></thead><tbody>${rows || '<tr><td colspan="8">No agents match this filter.</td></tr>'}</tbody></table></div></section></main>`;
};

const renderMethod = (): string => `
  <main class="secondary-view method-view"><header class="view-header"><button class="brand" data-view="observatory">ULTRA13 <span>AGENT BENCHMARK</span></button><nav>${viewNav()}</nav><button class="primary-action" id="upload-evidence-button" aria-label="Upload Ultra13 JSON">${icon('upload')} UPLOAD ULTRA13 JSON</button></header>
  <article class="method-sheet"><div class="section-kicker">Benchmark score v1 · static evidence only</div><h1>A score that shows its workings.</h1><p class="method-lede">The 0–100 result is a reproducible transformation of fields already present in an uploaded Ultra13 JSON bundle. It is not a native Ultra13 score, it makes no runtime claim, and it never converts missing evidence into a pass.</p>
  <div class="formula-grid"><section><span>20 points</span><h2>Evidence assurance</h2><p>Configuration-digest alignment, exact supported compatibility, rule-level traceability, and assessment completeness.</p><code>scope 5 + compatibility 5 + traceability 5 + completeness 5</code></section><section><span>40 points</span><h2>MAESTRO outcomes</h2><p>Severity-weighted states. Controlled or not-triggered earns full credit; suspected earns 15%; unknown, triggered, or confirmed earns zero.</p><code>40 × earned severity weight / applicable severity weight</code></section><section><span>25 points</span><h2>OWASP ASI outcomes</h2><p>Equal-weighted ASI rules. Not-triggered earns full credit; suspected/partial earns 15%; unknown or triggered earns zero.</p><code>25 × earned rule weight / applicable rule weight</code></section><section><span>15 points</span><h2>Open findings</h2><p>Starts at 15 only when a findings collection is explicitly present. Open critical/high/medium/low findings deduct 6/4/2/1 points.</p><code>max(0, 15 − open finding penalty)</code></section></div>
  <aside class="method-warning"><strong>Unknown stays unknown.</strong><p>If the bundle omits findings, that component is 0/15. If a rule is unknown or unsupported, it earns no outcome credit. Not-applicable rules are excluded from the denominator.</p></aside>
  <section class="provenance-rules"><h2>Report-ready data produced</h2><ul><li>Per-agent score, precise component points, unknown counts, and every source path used.</li><li>Repository, framework, exact version, compatibility status, configuration digest, commit, scan time, and rule-pack versions.</li><li>MAESTRO and OWASP ASI outcome counts, open-finding counts, score distribution, min/median/mean/max, and lifecycle throughput.</li><li>SHA-256 digest of each uploaded Ultra13 JSON plus an exportable cohort snapshot and CSV.</li></ul></section></article></main>`;

const viewNav = (): string => `<button data-view="observatory" class="${activeView === 'observatory' ? 'active' : ''}">${icon('grid', 17)} Observatory</button><button data-view="ledger" class="${activeView === 'ledger' ? 'active' : ''}">${icon('table', 17)} Ledger</button><button data-view="method" class="${activeView === 'method' ? 'active' : ''}">${icon('info', 17)} Method</button>`;

const render = (): void => {
  app.innerHTML = `${activeView === 'observatory' ? renderObservatory() : activeView === 'ledger' ? renderLedger() : renderMethod()}
    <div class="view-switcher" aria-label="Views">${viewNav()}</div>
    <input type="file" id="evidence-input" accept="application/json,.json" multiple hidden />
    <input type="file" id="cohort-input" accept="application/json,text/csv,.json,.csv" hidden />
    <div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
    <dialog id="json-dialog"><header><div><p class="eyebrow">Local evidence store</p><h2>Ultra13 JSON</h2></div><button id="close-dialog" class="icon-action" aria-label="Close JSON viewer">${icon('close')}</button></header><pre id="json-output"></pre></dialog>`;
  bindEvents();
};

const handleEvidenceFiles = async (files: FileList): Promise<void> => {
  let imported = 0;
  const warnings: string[] = [];
  for (const file of [...files]) {
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error(`${file.name}: exceeds the 25 MB per-bundle safety limit`);
      const result = await parseUltra13Bundle(await file.text(), file.name, state.agents.length + 1);
      mergeAgentRecord(state, result.agent);
      await saveRawEvidence(result.agent.evidence?.sha256 ?? '', result.rawEvidence);
      addActivity(
        result.agent.score ? 'evidence_ingested' : 'assessment_blocked',
        result.agent.score
          ? `${result.agent.repository}: ${result.agent.score.total}/100`
          : `${result.agent.repository}: unscored · ${result.agent.evidence?.assessmentStatus ?? 'unknown'}`,
        result.agent.id,
      );
      warnings.push(...result.warnings.map((warning) => `${result.agent.name}: ${warning}`));
      imported += 1;
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : String(error));
    }
  }
  persist();
  render();
  showToast(`${imported} Ultra13 bundle${imported === 1 ? '' : 's'} ingested.${warnings.length ? ` ${warnings.length} warning${warnings.length === 1 ? '' : 's'} recorded.` : ''}`, warnings.length ? 'warn' : 'ok');
};

const handleCohortFile = async (file: File): Promise<void> => {
  const incoming = parseCohortManifest(await file.text());
  const previous = new Map(state.agents.map((agent) => [agent.id, agent]));
  state.agents = incoming.map((record) => {
    const existing = previous.get(record.id);
    return existing ? { ...record, evidence: existing.evidence, score: existing.score, previousResult: existing.previousResult, stage: existing.stage, compatibility: existing.compatibility, notes: existing.notes, createdAt: existing.createdAt, updatedAt: existing.updatedAt } : record;
  });
  state.selectedAgentId = state.agents[0]?.id ?? null;
  addActivity('cohort_imported', `Imported ${state.agents.length} agent identities from ${file.name}.`);
  persist();
  render();
  showToast(`${state.agents.length} agents ready for assessment.`);
};

const advanceAgent = (agent: AgentRecord): void => {
  const current = stageOrder.indexOf(agent.stage);
  const next = stageOrder[Math.min(stageOrder.length - 1, Math.max(0, current + 1))] ?? 'queued';
  agent.stage = next;
  agent.updatedAt = new Date().toISOString();
  addActivity('stage_changed', `${agent.repository} moved to ${stageLabels[next].label}.`, agent.id);
  persist();
  render();
  showToast(`${agent.name} → ${stageLabels[next].label}`);
};

const toggleBlocked = (agent: AgentRecord): void => {
  if (agent.stage === 'blocked') {
    agent.stage = agent.evidence ? 'qa' : 'queued';
    agent.blocker = '';
    addActivity('blocker_cleared', `${agent.repository} blocker cleared.`, agent.id);
  } else {
    agent.stage = 'blocked';
    agent.blocker = agent.blocker || 'Needs operator attention.';
    addActivity('agent_blocked', `${agent.repository} marked blocked.`, agent.id);
  }
  agent.updatedAt = new Date().toISOString();
  persist();
  render();
};

const showJson = async (agent: AgentRecord): Promise<void> => {
  const dialog = document.querySelector<HTMLDialogElement>('#json-dialog');
  const output = document.querySelector<HTMLElement>('#json-output');
  if (!dialog || !output || !agent.evidence) return;
  output.textContent = 'Loading evidence…';
  dialog.showModal();
  let raw: JsonObject | null = await getRawEvidence(agent.evidence.sha256);
  if (!raw && agent.evidence.rawUrl) {
    try {
      const response = await fetch(agent.evidence.rawUrl);
      raw = response.ok ? ((await response.json()) as JsonObject) : null;
    } catch {
      raw = null;
    }
  }
  output.textContent = raw ? JSON.stringify(raw, null, 2) : 'Raw evidence is not available in this browser. Re-upload the source bundle; the persisted digest and score remain valid.';
};

const bindEvents = (): void => {
  document.querySelectorAll<HTMLElement>('[data-view]').forEach((button) =>
    button.addEventListener('click', () => {
      activeView = (button.dataset.view as typeof activeView) ?? 'observatory';
      render();
    }),
  );
  document.querySelectorAll<HTMLElement>('[data-agent-id]').forEach((element) =>
    element.addEventListener('click', () => {
      const id = element.dataset.agentId;
      if (!id) return;
      state.selectedAgentId = id;
      activeView = 'observatory';
      persist();
      render();
    }),
  );
  document.querySelectorAll<HTMLElement>('[data-stage-filter]').forEach((button) =>
    button.addEventListener('click', () => {
      activeStageFilter = (button.dataset.stageFilter as Stage | 'all') ?? 'all';
      render();
    }),
  );

  const evidenceInput = document.querySelector<HTMLInputElement>('#evidence-input');
  document.querySelectorAll<HTMLElement>('#upload-evidence-button').forEach((button) => button.addEventListener('click', () => evidenceInput?.click()));
  evidenceInput?.addEventListener('change', () => {
    if (evidenceInput.files?.length) void handleEvidenceFiles(evidenceInput.files);
  });

  const cohortInput = document.querySelector<HTMLInputElement>('#cohort-input');
  document.querySelector('#import-cohort-button')?.addEventListener('click', () => cohortInput?.click());
  cohortInput?.addEventListener('change', () => {
    const file = cohortInput.files?.[0];
    if (!file) return;
    void handleCohortFile(file).catch((error) => showToast(error instanceof Error ? error.message : String(error), 'warn'));
  });

  document.querySelector('#export-state')?.addEventListener('click', () => downloadJson('ultra13-assessment-state.json', state));
  document.querySelector('#refresh-state')?.addEventListener('click', () => {
    state = structuredClone(loadLocalState() ?? state);
    render();
    showToast('Dashboard refreshed from the local assessment snapshot.');
  });
  document.querySelector('#export-csv')?.addEventListener('click', () =>
    downloadCsv(
      'ultra13-agent-scores.csv',
      state.agents.map((agent) => ({
        index: agent.index,
        repository: agent.repository,
        framework: agent.framework,
        version: agent.version,
        stage: agent.stage,
        compatibility: agent.compatibility,
        score: agent.score?.total ?? '',
        assurance: agent.score?.components.find((component) => component.id === 'assurance')?.points ?? '',
        maestro: agent.score?.components.find((component) => component.id === 'maestro')?.points ?? '',
        asi: agent.score?.components.find((component) => component.id === 'asi')?.points ?? '',
        findings: agent.score?.components.find((component) => component.id === 'findings')?.points ?? '',
        unknowns: agent.score?.unknownCount ?? '',
        previous_score: agent.previousResult?.score.total ?? '',
        assessment_status: agent.evidence?.assessmentStatus ?? '',
        scan_mode: agent.evidence?.scanMode ?? '',
        scan_status: agent.evidence?.scanStatus ?? '',
        blocker: agent.blocker,
        evidence_sha256: agent.evidence?.sha256 ?? '',
      })),
    ),
  );
  document.querySelector('#clear-selection')?.addEventListener('click', () => {
    state.selectedAgentId = null;
    persist();
    render();
  });
  const current = selectedAgent();
  document.querySelector('#advance-agent')?.addEventListener('click', () => current && advanceAgent(current));
  document.querySelector('#toggle-block')?.addEventListener('click', () => current && toggleBlocked(current));
  document.querySelector('#method-link')?.addEventListener('click', () => {
    activeView = 'method';
    render();
  });
  document.querySelector('#view-json')?.addEventListener('click', () => current && void showJson(current));
  document.querySelector('#close-dialog')?.addEventListener('click', () => document.querySelector<HTMLDialogElement>('#json-dialog')?.close());
};

render();
