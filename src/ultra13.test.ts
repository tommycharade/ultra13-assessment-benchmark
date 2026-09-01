import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseCohortManifest, parseUltra13Bundle } from './ultra13';

const fixture = async (name: string): Promise<string> => readFile(resolve('public/sample-data', name), 'utf8');

describe('Ultra13 evidence importer', () => {
  it.each([
    ['openai__openai-agents-python.json', 'openai/openai-agents-python', 'openai-agents', '0.19.4', 'supported', 20, 'd0cfdea3885e10ae9d67d13ed73b9435cfebbcc2ef18d884a3179128bc032f6e'],
    ['google__adk-python.json', 'google/adk-python', 'google-adk', '2.6.3', 'supported', 25, '404aebd3652f72d1301185f0f6f1809f5a6ac5f5a48bd7660786e98c2463a765'],
    ['crewAIInc__crewAI-examples.json', 'crewaiinc/crewai-examples', 'crewai', '1.6.1', 'unsupported', 14, '2a7437315202eaf70849469fb01908d02aa18398e31fed25e80686ad4b38dd11'],
  ])('parses and scores %s reproducibly', async (file, repository, framework, version, compatibility, total, digest) => {
    const result = await parseUltra13Bundle(await fixture(file), file, 1, '2026-09-01T00:00:00.000Z');
    expect(result.agent).toMatchObject({ repository, framework, version, compatibility, stage: 'qa' });
    expect(result.agent.score?.total).toBe(total);
    expect(result.agent.evidence?.sha256).toBe(digest);
    expect(result.agent.evidence?.maestro.total).toBe(70);
    expect(result.agent.evidence?.asi.total).toBe(30);
  });

  it('rejects valid JSON that is not an Ultra13 evidence bundle', async () => {
    await expect(parseUltra13Bundle('{"name":"not ultra13"}', 'other.json', 1)).rejects.toThrow('not a recognizable Ultra13');
  });
});

describe('100-agent cohort intake', () => {
  it('accepts and indexes 100 unique agents', () => {
    const manifest = JSON.stringify(
      Array.from({ length: 100 }, (_, index) => ({ repository: `owner/agent-${index + 1}`, framework: 'unknown' })),
    );
    const agents = parseCohortManifest(manifest, '2026-09-01T00:00:00.000Z');
    expect(agents).toHaveLength(100);
    expect(agents[99]).toMatchObject({ index: 100, repository: 'owner/agent-100', stage: 'queued' });
  });

  it('rejects cohorts larger than the assessment limit', () => {
    const manifest = JSON.stringify(Array.from({ length: 101 }, (_, index) => ({ repository: `owner/agent-${index}` })));
    expect(() => parseCohortManifest(manifest)).toThrow('exceeds the 100-agent assessment limit');
  });
});
