import { readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

import { mergeAgentRecord } from '../src/merge.ts';
import { parseUltra13Bundle } from '../src/ultra13.ts';

const [statePathInput, ...bundlePathsInput] = process.argv.slice(2);
if (!statePathInput || bundlePathsInput.length === 0) {
  throw new Error('Usage: publish-rerun-state.mjs <state.json> <bundle.json> [...]');
}

const statePath = resolve(statePathInput);
const state = JSON.parse(await readFile(statePath, 'utf8'));
const importedAt = new Date().toISOString();

for (const bundlePathInput of bundlePathsInput) {
  const bundlePath = resolve(bundlePathInput);
  const sourceFile = basename(bundlePath);
  const result = await parseUltra13Bundle(
    await readFile(bundlePath, 'utf8'),
    sourceFile,
    state.agents.length + 1,
    importedAt,
  );
  mergeAgentRecord(state, result.agent);
  state.activity.unshift({
    id: crypto.randomUUID(),
    at: importedAt,
    action: result.agent.score ? 'evidence_ingested' : 'assessment_blocked',
    detail: result.agent.score
      ? `${result.agent.repository}: ${result.agent.score.total}/100`
      : `${result.agent.repository}: unscored · ${result.agent.evidence?.assessmentStatus ?? 'unknown'}`,
    agentId: result.agent.id,
  });
}

state.generatedAt = importedAt;
state.activity = state.activity.slice(0, 200);
await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
