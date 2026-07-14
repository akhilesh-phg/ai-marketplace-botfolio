import { env } from '@t/config';
import { Inngest } from 'inngest';

export const inngest = new Inngest({ id: 'trillion', eventKey: env.INNGEST_EVENT_KEY });
