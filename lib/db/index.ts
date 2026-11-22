import { drizzle } from 'drizzle-orm/node-postgres';
import { authPool } from '../auth.js';
import * as schema from './schema.js';

export const db = drizzle(authPool, { schema });
