import { config as loadDotenv } from 'dotenv';

import { parseEnv, type Env } from './env-core.js';

loadDotenv();

export type { Env };
export { parseEnv };

export const env: Env = parseEnv(process.env);
