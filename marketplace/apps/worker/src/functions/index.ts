import type { InngestFunction } from 'inngest';

import { hello } from './hello.js';

export const functions: InngestFunction.Like[] = [hello];
