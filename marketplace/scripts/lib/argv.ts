export type ParsedArgv = {
  help: boolean;
  base: string;
  positional: string[];
  flags: Record<string, string | boolean>;
};

export function parseArgv(argv: string[]): ParsedArgv {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  let base = 'origin/main';

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      flags.help = true;
      continue;
    }
    if (arg === '--base') {
      const next = argv[i + 1];
      if (next) {
        base = next;
        i += 1;
      }
      continue;
    }
    if (arg?.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
      continue;
    }
    if (arg) {
      positional.push(arg);
    }
  }

  return {
    help: flags.help === true,
    base,
    positional,
    flags,
  };
}
