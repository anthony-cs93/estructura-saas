import { createClient, type Client } from '@libsql/client';
import { env } from '../config/env.js';

let client: Client | null = null;

export function getDb(): Client {
  if (!client) {
    client = createClient({ url: env.tursoUrl, authToken: env.tursoAuthToken });
  }
  return client;
}
