import type { BenchmarkScore, JsonObject, OutcomeCounts, ScoreComponent } from './types';

type Assessment = JsonObject & {
  state?: unknown;
  outcome?: unknown;
  status?: unknown;
  assurance?: unknown;
  risk?: { severity?: unknown };
  evidence?: unknown;
  provenance?: unknown;
  applicability?: { applicable?: unknown };
};

const SCORE_VERSION = 'ultra13-benchmark-score/v1' as const;

const asObject = (value: unknown): JsonObject | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as JsonObject) : null;

const asArray = <T = unknown>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

const round1 = (value: number): number => Math.round((value + Number.EPSILON) * 10) / 10;

const normalizeState = (assessment: Assessment): string =>
  asString(assessment.state ?? assessment.outcome ?? assessment.status ?? assessment.assurance).toUpperCase();

const isNotApplicable = (assessment: Assessment): boolean =>
  assessment.applicability?.applicable === false || normalizeState(assessment) === 'NOT_APPLICABLE';

const severityWeight = (assessment: Assessment): number => {
  const severity = asString(assessment.risk?.severity).toLowerCase();
  return severity === 'critical' ? 4 : severity === 'high' ? 3 : severity === 'medium' ? 2 : severity === 'low' ? 1 : 2;
};

const stateCredit = (state: string): number => {
  if (['CONTROLLED', 'MITIGATED', 'NOT_TRIGGERED', 'PASS', 'PASSED'].includes(state)) return 1;
  if (['SUSPECTED', 'PARTIAL', 'PARTIAL_PASS'].includes(state)) return 0.15;
  return 0;
};

const digestAt = (root: JsonObject, path: string[]): string => {
  let current: unknown = root;
  for (const segment of path) {
    const object = asObject(current);
    if (!object) return '';
    current = object[segment];
  }
  return asString(current);
};

const compatibilityEntries = (root: JsonObject): JsonObject[] => {
  const threat = asObject(root.threatModel);
  const graph = asObject(root.canonicalAgentGraph ?? root.graph);
  const manifest = asObject(root.agentSecurityManifest ?? root.manifest);
  const sources = [threat?.compatibility, graph?.compatibility, manifest?.compatibility];
  return sources.flatMap((source) => asArray(source).map(asObject).filter((entry): entry is JsonObject => entry !== null));
};

export const countOutcomes = (assessments: Assessment[]): OutcomeCounts => {
  const counts: OutcomeCounts = {
    controlled: 0,
    suspected: 0,
    triggered: 0,
    unknown: 0,
    notApplicable: 0,
    total: assessments.length,
  };

  for (const assessment of assessments) {
    const state = normalizeState(assessment);
    if (isNotApplicable(assessment)) counts.notApplicable += 1;
    else if (['CONTROLLED', 'MITIGATED', 'NOT_TRIGGERED', 'PASS', 'PASSED'].includes(state)) counts.controlled += 1;
    else if (['SUSPECTED', 'PARTIAL', 'PARTIAL_PASS'].includes(state)) counts.suspected += 1;
    else if (['TRIGGERED', 'CONFIRMED', 'FAIL', 'FAILED'].includes(state)) counts.triggered += 1;
    else counts.unknown += 1;
  }

  return counts;
};

const scoreAssurance = (root: JsonObject, maestro: Assessment[], asi: Assessment[]): ScoreComponent => {
  const threat = asObject(root.threatModel) ?? {};
  const graph = asObject(root.canonicalAgentGraph ?? root.graph) ?? {};
  const manifest = asObject(root.agentSecurityManifest ?? root.manifest) ?? {};
  const selectedUnit = asObject(root.selectedDeploymentUnit ?? root.activeDeploymentUnit) ?? {};

  const digests = [
    asString(selectedUnit.configurationDigest),
    digestAt(graph, ['deploymentUnit', 'configurationDigest']),
    digestAt(manifest, ['deploymentUnit', 'configurationDigest']),
    digestAt(threat, ['deploymentUnit', 'configurationDigest']),
  ].filter(Boolean);
  const uniqueDigests = new Set(digests);
  const scopePoints = digests.length >= 3 && uniqueDigests.size === 1 ? 5 : digests.length >= 2 && uniqueDigests.size === 1 ? 3 : 0;

  const compatibility = compatibilityEntries(root);
  const hasSupportedExact = compatibility.some(
    (entry) => asString(entry.status).toLowerCase() === 'supported' && Boolean(asString(entry.version)),
  );
  const hasCandidate = compatibility.some((entry) => asString(entry.status).toLowerCase() === 'candidate');
  const compatibilityPoints = hasSupportedExact ? 5 : hasCandidate ? 2 : 0;

  const assessments = [...maestro, ...asi];
  const traceable = assessments.filter((assessment) => {
    const evidence = asArray(assessment.evidence);
    const provenance = asObject(assessment.provenance);
    return evidence.length > 0 && Boolean(provenance && (asString(provenance.configurationDigest) || asString(provenance.commit)));
  }).length;
  const traceabilityPoints = assessments.length > 0 ? 5 * (traceable / assessments.length) : 0;

  const maestroCompleteness = maestro.length > 0 ? maestro.filter((item) => normalizeState(item)).length / maestro.length : 0;
  const asiCompleteness = asi.length > 0 ? asi.filter((item) => normalizeState(item)).length / asi.length : 0;
  const completenessPoints = 2.5 * maestroCompleteness + 2.5 * asiCompleteness;

  const points = round1(scopePoints + compatibilityPoints + traceabilityPoints + completenessPoints);
  const unknownCount = [scopePoints, compatibilityPoints, traceabilityPoints, completenessPoints].filter((value) => value === 0).length;

  return {
    id: 'assurance',
    label: 'Evidence assurance',
    points,
    maximum: 20,
    unknownCount,
    detail: `Scope ${scopePoints}/5 · compatibility ${compatibilityPoints}/5 · traceability ${round1(traceabilityPoints)}/5 · completeness ${round1(completenessPoints)}/5`,
    sourcePaths: [
      '$.selectedDeploymentUnit|activeDeploymentUnit.configurationDigest',
      '$.threatModel|graph|manifest.compatibility',
      '$.threatModel.maestroAssessments[*].evidence',
      '$.threatModel.asiAssessments[*].evidence',
    ],
  };
};

const scoreAssessmentFamily = (
  id: 'maestro' | 'asi',
  label: string,
  maximum: number,
  assessments: Assessment[],
  sourcePath: string,
): ScoreComponent => {
  const applicable = assessments.filter((assessment) => !isNotApplicable(assessment));
  const weightedMaximum = applicable.reduce((sum, assessment) => sum + (id === 'maestro' ? severityWeight(assessment) : 1), 0);
  const weightedEarned = applicable.reduce((sum, assessment) => {
    const weight = id === 'maestro' ? severityWeight(assessment) : 1;
    return sum + weight * stateCredit(normalizeState(assessment));
  }, 0);
  const points = weightedMaximum > 0 ? round1(maximum * (weightedEarned / weightedMaximum)) : 0;
  const counts = countOutcomes(assessments);

  return {
    id,
    label,
    points,
    maximum,
    unknownCount: counts.unknown,
    detail: `${counts.controlled} controlled/not triggered · ${counts.suspected} suspected · ${counts.triggered} triggered · ${counts.unknown} unknown · ${counts.notApplicable} not applicable`,
    sourcePaths: [sourcePath],
  };
};

const findingSeverity = (finding: JsonObject): string => {
  const severity = asString(finding.severity);
  if (severity) return severity.toLowerCase();
  const risk = asObject(finding.risk);
  return asString(risk?.severity).toLowerCase();
};

const isOpenFinding = (finding: JsonObject): boolean => {
  const status = asString(finding.status ?? finding.state).toLowerCase();
  return !['closed', 'resolved', 'accepted', 'dismissed', 'fixed'].includes(status);
};

const scoreFindings = (root: JsonObject): ScoreComponent => {
  const hasFindings = Array.isArray(root.findings);
  const findings = asArray(root.findings).map(asObject).filter((finding): finding is JsonObject => finding !== null);
  if (!hasFindings) {
    return {
      id: 'findings',
      label: 'Open findings',
      points: 0,
      maximum: 15,
      unknownCount: 1,
      detail: 'No valid findings array is present in the bundle; zero points are awarded rather than assuming a clear result.',
      sourcePaths: ['$.findings'],
    };
  }

  const open = findings.filter(isOpenFinding);
  const penalty = open.reduce((sum, finding) => {
    const severity = findingSeverity(finding);
    return sum + (severity === 'critical' ? 6 : severity === 'high' ? 4 : severity === 'medium' ? 2 : 1);
  }, 0);

  return {
    id: 'findings',
    label: 'Open findings',
    points: round1(Math.max(0, 15 - penalty)),
    maximum: 15,
    unknownCount: 0,
    detail: `${open.length} open of ${findings.length} findings · ${round1(Math.min(15, penalty))} point penalty`,
    sourcePaths: ['$.findings[*].severity', '$.findings[*].status'],
  };
};

export const calculateBenchmarkScore = (root: JsonObject, evaluatedAt = new Date().toISOString()): BenchmarkScore => {
  const threatModel = asObject(root.threatModel) ?? {};
  const maestro = asArray<Assessment>(threatModel.maestroAssessments);
  const asi = asArray<Assessment>(threatModel.asiAssessments);

  const components: ScoreComponent[] = [
    scoreAssurance(root, maestro, asi),
    scoreAssessmentFamily('maestro', 'MAESTRO outcomes', 40, maestro, '$.threatModel.maestroAssessments'),
    scoreAssessmentFamily('asi', 'OWASP ASI outcomes', 25, asi, '$.threatModel.asiAssessments'),
    scoreFindings(root),
  ];

  const preciseTotal = round1(components.reduce((sum, component) => sum + component.points, 0));
  return {
    version: SCORE_VERSION,
    total: Math.round(preciseTotal),
    preciseTotal,
    components,
    unknownCount: components.reduce((sum, component) => sum + component.unknownCount, 0),
    evaluatedAt,
    method: 'static-evidence-only',
  };
};

export const getThreatAssessments = (root: JsonObject): { maestro: Assessment[]; asi: Assessment[] } => {
  const threatModel = asObject(root.threatModel) ?? {};
  return {
    maestro: asArray<Assessment>(threatModel.maestroAssessments),
    asi: asArray<Assessment>(threatModel.asiAssessments),
  };
};
