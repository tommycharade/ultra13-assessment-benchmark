import { describe, expect, it } from 'vitest';
import { calculateBenchmarkScore, countOutcomes } from './scoring';
import type { JsonObject } from './types';

describe('Benchmark Score v1', () => {
  it('never treats a missing findings collection as clear', () => {
    const root: JsonObject = {
      threatModel: {
        maestroAssessments: [{ state: 'NOT_TRIGGERED', risk: { severity: 'high' } }],
        asiAssessments: [{ state: 'NOT_TRIGGERED' }],
      },
    };
    const result = calculateBenchmarkScore(root, '2026-09-01T00:00:00.000Z');
    const findings = result.components.find((component) => component.id === 'findings');
    expect(findings?.points).toBe(0);
    expect(findings?.unknownCount).toBe(1);
  });

  it('awards full findings points only for an explicit empty collection', () => {
    const result = calculateBenchmarkScore(
      { threatModel: { maestroAssessments: [], asiAssessments: [] }, findings: [] },
      '2026-09-01T00:00:00.000Z',
    );
    expect(result.components.find((component) => component.id === 'findings')?.points).toBe(15);
  });

  it('does not treat a malformed findings value as an empty collection', () => {
    const result = calculateBenchmarkScore(
      { threatModel: { maestroAssessments: [], asiAssessments: [] }, findings: { status: 'unknown' } },
      '2026-09-01T00:00:00.000Z',
    );
    const findings = result.components.find((component) => component.id === 'findings');
    expect(findings?.points).toBe(0);
    expect(findings?.unknownCount).toBe(1);
  });

  it('gives no outcome credit to unknown or triggered states', () => {
    const counts = countOutcomes([
      { state: 'UNKNOWN' },
      { state: 'TRIGGERED' },
      { state: 'NOT_TRIGGERED' },
      { state: 'SUSPECTED' },
      { state: 'NOT_APPLICABLE' },
    ]);
    expect(counts).toEqual({ controlled: 1, suspected: 1, triggered: 1, unknown: 1, notApplicable: 1, total: 5 });
  });

  it('applies severity-weighted open-finding penalties', () => {
    const result = calculateBenchmarkScore(
      {
        threatModel: { maestroAssessments: [], asiAssessments: [] },
        findings: [
          { status: 'open', severity: 'critical' },
          { status: 'open', severity: 'high' },
          { status: 'resolved', severity: 'critical' },
        ],
      },
      '2026-09-01T00:00:00.000Z',
    );
    expect(result.components.find((component) => component.id === 'findings')?.points).toBe(5);
  });
});
