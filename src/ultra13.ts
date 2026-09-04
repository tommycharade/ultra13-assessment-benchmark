import { calculateBenchmarkScore, countOutcomes, getThreatAssessments } from './scoring.ts';
import type {
  AgentRecord,
  CompatibilityStatus,
  EvidenceSummary,
  ImportResult,
  JsonObject,
} from './types';

const asObject = (value: unknown): JsonObject | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as JsonObject) : null;

const asArray = <T = unknown>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

const nested = (root: JsonObject, path: string[]): unknown => {
  let current: unknown = root;
  for (const segment of path) {
    const object = asObject(current);
    if (!object) return undefined;
    current = object[segment];
  }
  return current;
};

const firstString = (...values: unknown[]): string => {
  for (const value of values) {
    const text = asString(value);
    if (text) return text;
  }
  return '';
};

const idFromRepository = (repository: string): string =>
  repository
    .toLowerCase()
    .replace(/^https?:\/\/github\.com\//, '')
    .replace(/\.git$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || `agent-${crypto.randomUUID()}`;

const shortName = (repository: string, fallback: string): string =>
  repository.split('/').filter(Boolean).at(-1) || fallback || 'Unnamed agent';

const compactIdentity = (value: unknown): string => {
  if (typeof value === 'string') return value;
  const object = asObject(value);
  if (!object) return '';
  return [asString(object.version), asString(object.commit), asString(object.build), asString(object.id)]
    .filter(Boolean)
    .join(' · ');
};

const compatibilityFrom = (root: JsonObject): JsonObject | null => {
  const candidates = [
    nested(root, ['threatModel', 'compatibility']),
    nested(root, ['canonicalAgentGraph', 'compatibility']),
    nested(root, ['graph', 'compatibility']),
    nested(root, ['agentSecurityManifest', 'compatibility']),
    nested(root, ['manifest', 'compatibility']),
  ];
  for (const candidate of candidates) {
    const entry = asArray(candidate).map(asObject).find((item): item is JsonObject => item !== null);
    if (entry) return entry;
  }
  return null;
};

const normalizeCompatibility = (value: string): CompatibilityStatus => {
  const status = value.toLowerCase();
  if (status === 'supported') return 'supported';
  if (status === 'candidate') return 'candidate';
  if (['unsupported', 'incompatible'].includes(status)) return 'unsupported';
  return 'unknown';
};

export const sha256 = async (text: string): Promise<string> => {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const isUltra13Bundle = (root: JsonObject): boolean => {
  const threat = asObject(root.threatModel);
  const hasAssessmentArrays = Boolean(
    threat && (Array.isArray(threat.maestroAssessments) || Array.isArray(threat.asiAssessments)),
  );
  const product = asString(root.product).toLowerCase();
  const hasKnownEnvelope = Boolean(root.application && (root.graph || root.canonicalAgentGraph) && root.manifest);
  const hasDecisionEnvelope = Boolean(root.application && (root.latestScanJob || root.activeDeploymentUnit));
  return hasAssessmentArrays || product.includes('ultra13') || hasKnownEnvelope || hasDecisionEnvelope;
};

export const parseUltra13Bundle = async (
  text: string,
  sourceFile: string,
  index: number,
  now = new Date().toISOString(),
): Promise<ImportResult> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${sourceFile}: invalid JSON`);
  }
  const root = asObject(parsed);
  if (!root || !isUltra13Bundle(root)) {
    throw new Error(`${sourceFile}: not a recognizable Ultra13 evidence bundle`);
  }

  const application = asObject(root.application) ?? {};
  const selectedUnit = asObject(root.selectedDeploymentUnit ?? root.activeDeploymentUnit) ?? {};
  const latestScanJob = asObject(root.latestScanJob) ?? {};
  const threat = asObject(root.threatModel);
  const hasAssessmentArrays = Boolean(
    threat && (Array.isArray(threat.maestroAssessments) || Array.isArray(threat.asiAssessments)),
  );
  const compatibility = compatibilityFrom(root);
  const repository = firstString(
    application.repository,
    selectedUnit.repository,
    nested(root, ['threatModel', 'metadata', 'repository']),
    application.name,
  );
  if (!repository) throw new Error(`${sourceFile}: no application or repository identity was found`);

  const repositoryUrl = firstString(application.repositoryUrl, `https://github.com/${repository}`);
  const framework = firstString(application.framework, compatibility?.framework, compatibility?.package, 'unknown');
  const version = firstString(compatibility?.version, compatibility?.constraint, 'unknown');
  const status = normalizeCompatibility(firstString(compatibility?.status, root.expectedCompatibility, 'unknown'));
  const score = hasAssessmentArrays ? calculateBenchmarkScore(root, now) : null;
  const { maestro, asi } = getThreatAssessments(root);
  const threatModel = asObject(root.threatModel) ?? {};
  const findingsPresent = Array.isArray(root.findings);
  const findings = asArray(root.findings).map(asObject).filter((item): item is JsonObject => item !== null);
  const openFindings = findings.filter((finding) => {
    const findingStatus = firstString(finding.status, finding.state).toLowerCase();
    return !['closed', 'resolved', 'accepted', 'dismissed', 'fixed'].includes(findingStatus);
  });

  const configurationDigest = firstString(
    selectedUnit.configurationDigest,
    nested(root, ['threatModel', 'deploymentUnit', 'configurationDigest']),
    nested(root, ['graph', 'deploymentUnit', 'configurationDigest']),
  );
  const commit = firstString(
    selectedUnit.commit,
    nested(root, ['latestScan', 'gitCommit']),
    nested(root, ['threatModel', 'metadata', 'commit']),
  );
  const capturedAt = firstString(
    root.exportedAt,
    latestScanJob.completedAt,
    latestScanJob.updatedAt,
    nested(root, ['latestScan', 'scannedAt']),
    nested(root, ['threatModel', 'metadata', 'generatedAt']),
    application.createdAt,
    now,
  );

  const evidence: EvidenceSummary = {
    sourceFile,
    sha256: await sha256(text),
    schemaVersion: firstString(
      root.schemaVersion,
      root.product,
      threatModel.apiVersion,
      nested(root, ['graph', 'schemaVersion']),
      'Ultra13 assessment artifact',
    ),
    capturedAt,
    product: firstString(root.product, 'Ultra13'),
    buildIdentity: compactIdentity(root.buildIdentity),
    configurationDigest,
    commit,
    maestroRulePack: firstString(threatModel.maestroRulePackVersion, 'unknown'),
    asiRulePack: firstString(threatModel.asiRulePackVersion, 'unknown'),
    maestro: countOutcomes(maestro),
    asi: countOutcomes(asi),
    findingCount: findingsPresent ? findings.length : null,
    openFindingCount: findingsPresent ? openFindings.length : null,
    assessmentStatus: hasAssessmentArrays
      ? 'complete'
      : asString(latestScanJob.status).toLowerCase() === 'failed'
        ? 'failed'
        : selectedUnit.configurationDigest
          ? 'not-produced'
          : 'unknown',
    scanMode: asString(latestScanJob.mode),
    scanStatus: asString(latestScanJob.status),
    candidateTotal:
      typeof root.deploymentCandidateTotal === 'number' ? root.deploymentCandidateTotal : null,
  };

  const warnings: string[] = [];
  if (!hasAssessmentArrays) {
    warnings.push('Ultra13 did not produce scorable assessment evidence; this import remains unscored.');
    if (evidence.assessmentStatus === 'failed') warnings.push('The latest exported scan job has failed status.');
    else if (evidence.assessmentStatus === 'not-produced') {
      warnings.push(`The latest exported job is ${evidence.scanMode || 'unknown'}:${evidence.scanStatus || 'unknown'}; no assessment job is present.`);
    }
  } else {
    if (!findingsPresent) warnings.push('The bundle has no valid findings array; the findings component receives 0/15.');
    if (maestro.length === 0) warnings.push('No MAESTRO assessments were found.');
    if (asi.length === 0) warnings.push('No OWASP ASI assessments were found.');
  }
  if (!configurationDigest) warnings.push('No deployment configuration digest was found.');
  if (status !== 'supported') warnings.push(`Compatibility is ${status}; no supported pairing is assumed.`);

  const repositoryId = idFromRepository(repository);
  const agent: AgentRecord = {
    id: repositoryId,
    index,
    name: shortName(repository, firstString(application.name)),
    repository,
    repositoryUrl,
    framework,
    version,
    stage: score ? 'qa' : 'blocked',
    compatibility: status,
    score,
    evidence,
    blocker: score
      ? ''
      : evidence.assessmentStatus === 'failed'
        ? `Ultra13 ${evidence.scanMode || 'assessment'} job failed for ${commit.slice(0, 12) || 'the selected revision'}.`
        : `Ultra13 exported the selected scope, but no assessment result was produced; latest job ${evidence.scanMode || 'unknown'}:${evidence.scanStatus || 'unknown'}.`,
    notes: warnings.join(' '),
    createdAt: firstString(application.createdAt, capturedAt, now),
    updatedAt: now,
  };

  return { agent, rawEvidence: root, warnings };
};

const queuedRecord = (entry: JsonObject, index: number, now: string): AgentRecord => {
  const repository = firstString(entry.repository, entry.repo, entry.repositoryUrl, entry.url, entry.name);
  if (!repository) throw new Error(`Agent row ${index} has no repository or name.`);
  const normalizedRepository = repository.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
  return {
    id: idFromRepository(normalizedRepository),
    index,
    name: firstString(entry.name, shortName(normalizedRepository, '')),
    repository: normalizedRepository,
    repositoryUrl: firstString(entry.repositoryUrl, entry.url, `https://github.com/${normalizedRepository}`),
    framework: firstString(entry.framework, 'unknown'),
    version: firstString(entry.version, 'unknown'),
    stage: 'queued',
    compatibility: 'unknown',
    score: null,
    evidence: null,
    blocker: firstString(entry.blocker),
    notes: firstString(entry.notes),
    createdAt: now,
    updatedAt: now,
  };
};

const parseCsv = (text: string): JsonObject[] => {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const split = (line: string): string[] => {
    const cells: string[] = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i] ?? '';
      if (char === '"' && line[i + 1] === '"' && quoted) {
        cell += '"';
        i += 1;
      } else if (char === '"') quoted = !quoted;
      else if (char === ',' && !quoted) {
        cells.push(cell.trim());
        cell = '';
      } else cell += char;
    }
    cells.push(cell.trim());
    return cells;
  };
  const headers = split(lines[0] ?? '').map((header) => header.toLowerCase().replace(/[^a-z0-9]+(.)/g, (_, char: string) => char.toUpperCase()));
  return lines.slice(1).map((line) => {
    const values = split(line);
    return Object.fromEntries(headers.map((header, position) => [header, values[position] ?? '']));
  });
};

export const parseCohortManifest = (text: string, now = new Date().toISOString()): AgentRecord[] => {
  let entries: unknown[];
  try {
    const parsed = JSON.parse(text) as unknown;
    const object = asObject(parsed);
    entries = Array.isArray(parsed) ? parsed : asArray(object?.agents);
  } catch {
    entries = parseCsv(text);
  }
  if (entries.length === 0) throw new Error('The cohort file contains no agent rows.');
  if (entries.length > 100) throw new Error('The cohort file exceeds the 100-agent assessment limit.');

  const seen = new Set<string>();
  return entries.map((entry, position) => {
    const record = queuedRecord(asObject(entry) ?? { name: String(entry) }, position + 1, now);
    if (seen.has(record.id)) throw new Error(`Duplicate agent identity: ${record.repository}`);
    seen.add(record.id);
    return record;
  });
};
