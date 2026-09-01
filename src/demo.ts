import type { AssessmentState } from './types';

const now = new Date().toISOString();

// Deliberately empty: if the published Ultra13 snapshot cannot be loaded, the
// application must not fall back to invented scores or evidence.
export const fallbackState: AssessmentState = {
  schemaVersion: 'ultra13-assessment-state/v1',
  cohortName: 'Open-source agent security benchmark',
  maximumAgents: 100,
  generatedAt: now,
  selectedAgentId: null,
  agents: [],
  activity: [],
};
