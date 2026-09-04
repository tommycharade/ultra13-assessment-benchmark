export const STAGES = [
  'queued',
  'onboarding',
  'discovery',
  'scope',
  'assessment',
  'evidence',
  'qa',
  'complete',
  'blocked',
] as const;

export type Stage = (typeof STAGES)[number];

export type CompatibilityStatus = 'supported' | 'candidate' | 'unsupported' | 'unknown';

export interface OutcomeCounts {
  controlled: number;
  suspected: number;
  triggered: number;
  unknown: number;
  notApplicable: number;
  total: number;
}

export interface ScoreComponent {
  id: 'assurance' | 'maestro' | 'asi' | 'findings';
  label: string;
  points: number;
  maximum: number;
  unknownCount: number;
  detail: string;
  sourcePaths: string[];
}

export interface BenchmarkScore {
  version: 'ultra13-benchmark-score/v1';
  total: number;
  preciseTotal: number;
  components: ScoreComponent[];
  unknownCount: number;
  evaluatedAt: string;
  method: 'static-evidence-only';
}

export interface EvidenceSummary {
  sourceFile: string;
  sha256: string;
  schemaVersion: string;
  capturedAt: string;
  product: string;
  buildIdentity: string;
  configurationDigest: string;
  commit: string;
  maestroRulePack: string;
  asiRulePack: string;
  maestro: OutcomeCounts;
  asi: OutcomeCounts;
  findingCount: number | null;
  openFindingCount: number | null;
  assessmentStatus?: 'complete' | 'failed' | 'not-produced' | 'unknown';
  scanMode?: string;
  scanStatus?: string;
  candidateTotal?: number | null;
  rawUrl?: string;
}

export interface PreviousBenchmarkResult {
  label: string;
  score: BenchmarkScore;
  evidence: EvidenceSummary;
  compatibility: CompatibilityStatus;
  framework: string;
  version: string;
}

export interface AgentRecord {
  id: string;
  index: number;
  name: string;
  repository: string;
  repositoryUrl: string;
  framework: string;
  version: string;
  stage: Stage;
  compatibility: CompatibilityStatus;
  score: BenchmarkScore | null;
  evidence: EvidenceSummary | null;
  previousResult?: PreviousBenchmarkResult;
  blocker: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityItem {
  id: string;
  at: string;
  action: string;
  agentId?: string;
  detail: string;
}

export interface AssessmentState {
  schemaVersion: 'ultra13-assessment-state/v1';
  cohortName: string;
  maximumAgents: number;
  generatedAt: string;
  selectedAgentId: string | null;
  agents: AgentRecord[];
  activity: ActivityItem[];
}

export interface ImportResult {
  agent: AgentRecord;
  rawEvidence: Record<string, unknown>;
  warnings: string[];
}

export type JsonObject = Record<string, unknown>;
