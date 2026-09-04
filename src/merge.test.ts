import { describe, expect, it } from 'vitest';

import { mergeAgentRecord } from './merge';
import type { AgentRecord, AssessmentState, EvidenceSummary } from './types';

const counts = { controlled: 0, suspected: 0, triggered: 0, unknown: 0, notApplicable: 0, total: 0 };

const evidence = (sha256: string, commit: string): EvidenceSummary => ({
  sourceFile: `${sha256}.json`,
  sha256,
  schemaVersion: 'ultra13/v1alpha1',
  capturedAt: '2026-09-01T00:00:00.000Z',
  product: 'Ultra13',
  buildIdentity: '',
  configurationDigest: 'sha256:configuration',
  commit,
  maestroRulePack: '2026.09.1',
  asiRulePack: '2026.08.1',
  maestro: counts,
  asi: counts,
  findingCount: null,
  openFindingCount: null,
});

describe('assessment result history', () => {
  it('moves a completed result to history when a same-revision rerun is blocked', () => {
    const previousEvidence = evidence('previous', 'abc123');
    const previous: AgentRecord = {
      id: 'owner-agent',
      index: 1,
      name: 'agent',
      repository: 'owner/agent',
      repositoryUrl: 'https://github.com/owner/agent',
      framework: 'example-framework',
      version: '1.2.3',
      stage: 'qa',
      compatibility: 'supported',
      score: {
        version: 'ultra13-benchmark-score/v1',
        total: 42,
        preciseTotal: 42,
        components: [],
        unknownCount: 0,
        evaluatedAt: '2026-09-01T00:00:00.000Z',
        method: 'static-evidence-only',
      },
      evidence: previousEvidence,
      blocker: '',
      notes: '',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    };
    const incoming: AgentRecord = {
      ...previous,
      framework: 'unknown',
      version: 'unknown',
      compatibility: 'unknown',
      stage: 'blocked',
      score: null,
      evidence: { ...evidence('failed', 'abc123'), assessmentStatus: 'failed' },
      blocker: 'Ultra13 scan failed.',
      updatedAt: '2026-09-04T00:00:00.000Z',
    };
    const state: AssessmentState = {
      schemaVersion: 'ultra13-assessment-state/v1',
      cohortName: 'Test',
      maximumAgents: 100,
      generatedAt: previous.updatedAt,
      selectedAgentId: previous.id,
      agents: [previous],
      activity: [],
    };

    mergeAgentRecord(state, incoming);

    expect(state.agents[0]).toMatchObject({
      stage: 'blocked',
      score: null,
      framework: 'example-framework',
      version: '1.2.3',
      compatibility: 'supported',
      previousResult: { label: 'Previous completed baseline', score: { total: 42 } },
    });
  });

  it('recovers version metadata when a corrected rerun returns to the previous immutable commit', () => {
    const baselineEvidence = evidence('baseline', 'baseline-commit');
    const currentEvidence = { ...evidence('head-failure', 'newer-head'), assessmentStatus: 'failed' as const };
    const baselineScore = {
      version: 'ultra13-benchmark-score/v1' as const,
      total: 25,
      preciseTotal: 24.6,
      components: [],
      unknownCount: 0,
      evaluatedAt: '2026-09-01T00:00:00.000Z',
      method: 'static-evidence-only' as const,
    };
    const current: AgentRecord = {
      id: 'owner-agent',
      index: 1,
      name: 'agent',
      repository: 'owner/agent',
      repositoryUrl: 'https://github.com/owner/agent',
      framework: 'unknown',
      version: 'unknown',
      stage: 'blocked',
      compatibility: 'unknown',
      score: null,
      evidence: currentEvidence,
      previousResult: {
        label: 'Previous completed baseline',
        score: baselineScore,
        evidence: baselineEvidence,
        compatibility: 'supported',
        framework: 'google-adk',
        version: '2.6.3',
      },
      blocker: 'Head scan failed.',
      notes: '',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-04T00:00:00.000Z',
    };
    const corrected: AgentRecord = {
      ...current,
      framework: 'unknown',
      version: 'unknown',
      compatibility: 'unknown',
      evidence: { ...evidence('corrected-failure', 'baseline-commit'), assessmentStatus: 'not-produced' },
      previousResult: undefined,
    };
    const state: AssessmentState = {
      schemaVersion: 'ultra13-assessment-state/v1',
      cohortName: 'Test',
      maximumAgents: 100,
      generatedAt: current.updatedAt,
      selectedAgentId: current.id,
      agents: [current],
      activity: [],
    };

    mergeAgentRecord(state, corrected);

    expect(state.agents[0]).toMatchObject({
      framework: 'google-adk',
      version: '2.6.3',
      compatibility: 'supported',
      previousResult: { score: { total: 25 } },
    });
  });
});
