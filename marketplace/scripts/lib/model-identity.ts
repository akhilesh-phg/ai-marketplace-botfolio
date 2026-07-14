export type ResolvedModel = 'composer' | 'opus' | 'human' | 'unknown';

const MODEL_TRAILER_RE = /^Model:\s*(composer-2\.5|opus-4\.8|human)\s*$/im;

function modelFromBranch(branch: string): ResolvedModel {
  if (branch.startsWith('composer/')) {
    return 'composer';
  }
  if (branch.startsWith('opus/')) {
    return 'opus';
  }
  if (branch.startsWith('human/')) {
    return 'human';
  }
  return 'unknown';
}

function modelFromTrailer(trailer: string): ResolvedModel | null {
  const match = MODEL_TRAILER_RE.exec(trailer);
  if (!match?.[1]) {
    return null;
  }
  if (match[1] === 'composer-2.5') {
    return 'composer';
  }
  if (match[1] === 'opus-4.8') {
    return 'opus';
  }
  return 'human';
}

function modelFromEnv(value: string | undefined): ResolvedModel | null {
  if (!value) {
    return null;
  }
  const normalized = value.toLowerCase();
  if (normalized === 'composer' || normalized === 'composer-2.5') {
    return 'composer';
  }
  if (normalized === 'opus' || normalized === 'opus-4.8') {
    return 'opus';
  }
  if (normalized === 'human') {
    return 'human';
  }
  return null;
}

export function resolveModel(input: {
  modelEnv?: string | undefined;
  branch?: string | undefined;
  latestCommitBody?: string | undefined;
}): ResolvedModel {
  const sources: ResolvedModel[] = [];

  const fromEnv = modelFromEnv(input.modelEnv);
  if (fromEnv) {
    sources.push(fromEnv);
  }

  if (input.latestCommitBody) {
    const fromTrailer = modelFromTrailer(input.latestCommitBody);
    if (fromTrailer) {
      sources.push(fromTrailer);
    }
  }

  if (input.branch) {
    const fromBranch = modelFromBranch(input.branch);
    if (fromBranch !== 'unknown') {
      sources.push(fromBranch);
    }
  }

  if (sources.includes('composer')) {
    return 'composer';
  }
  if (sources.includes('opus')) {
    return 'opus';
  }
  if (sources.includes('human')) {
    return 'human';
  }
  return 'unknown';
}
