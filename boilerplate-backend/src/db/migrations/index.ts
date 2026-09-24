import type { Migration } from './0001_init.js';
import { migration0001 } from './0001_init.js';

export const migrations: Migration[] = [migration0001];
