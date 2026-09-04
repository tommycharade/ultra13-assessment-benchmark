import type { AgentRecord, AssessmentState } from './types';

export const mergeAgentRecord = (state: AssessmentState, incoming: AgentRecord): void => {
  const existing = state.agents.find((agent) => agent.id === incoming.id);
  if (existing) {
    const sameCommit = Boolean(existing.evidence?.commit && incoming.evidence?.commit === existing.evidence.commit);
    const matchesPreviousCommit = Boolean(
      existing.previousResult?.evidence.commit && incoming.evidence?.commit === existing.previousResult.evidence.commit,
    );
    if (!incoming.score && existing.score && existing.evidence) {
      incoming.previousResult = existing.previousResult ?? {
        label: 'Previous completed baseline',
        score: existing.score,
        evidence: existing.evidence,
        compatibility: existing.compatibility,
        framework: existing.framework,
        version: existing.version,
      };
    } else if (!incoming.score && !incoming.previousResult && existing.previousResult) {
      incoming.previousResult = existing.previousResult;
    } else if (incoming.score && existing.score && existing.evidence && incoming.evidence?.sha256 !== existing.evidence.sha256) {
      incoming.previousResult = {
        label: 'Previous completed assessment',
        score: existing.score,
        evidence: existing.evidence,
        compatibility: existing.compatibility,
        framework: existing.framework,
        version: existing.version,
      };
    }
    const metadataSource = sameCommit
      ? existing
      : matchesPreviousCommit
        ? existing.previousResult
        : null;
    if (metadataSource) {
      if (incoming.framework === 'unknown') incoming.framework = metadataSource.framework;
      if (incoming.version === 'unknown') incoming.version = metadataSource.version;
      if (incoming.compatibility === 'unknown') incoming.compatibility = metadataSource.compatibility;
    }
    Object.assign(existing, incoming, { index: existing.index, createdAt: existing.createdAt });
  } else {
    const used = new Set(state.agents.map((agent) => agent.index));
    const nextIndex = Array.from({ length: state.maximumAgents }, (_, position) => position + 1).find((index) => !used.has(index));
    if (!nextIndex) throw new Error('All 100 cohort slots are already assigned.');
    incoming.index = nextIndex;
    state.agents.push(incoming);
  }
  state.selectedAgentId = incoming.id;
};
