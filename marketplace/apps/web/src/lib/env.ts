import { parseEnv, type Env } from '../../../../packages/config/src/env-core';

export const env: Env = parseEnv(process.env);
