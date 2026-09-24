/**
 * Database Connection
 * Conecta a Turso (SQLite en la nube)
 */

import { createClient } from '@libsql/client'

if (!process.env.TURSO_URL || !process.env.TURSO_TOKEN) {
  throw new Error('TURSO_URL and TURSO_TOKEN are required')
}

export const db = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN,
})

/**
 * Initialize database schema
 * Corre esto una sola vez
 */
export async function initializeDatabase() {
  try {
    // Crear tabla de quotes si no existe
    await db.execute(`
      CREATE TABLE IF NOT EXISTS quotes (
        id TEXT PRIMARY KEY,
        client_name TEXT NOT NULL,
        total REAL NOT NULL,
        status TEXT DEFAULT 'draft',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    console.log('✅ Database initialized')
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    throw error
  }
}

// Helpers para queries comunes
export const queries = {
  // Quotes
  getQuotes: () =>
    db.execute('SELECT * FROM quotes ORDER BY created_at DESC'),

  getQuoteById: (id: string) =>
    db.execute('SELECT * FROM quotes WHERE id = ?', [id]),

  createQuote: (id: string, clientName: string, total: number) =>
    db.execute(
      'INSERT INTO quotes (id, client_name, total) VALUES (?, ?, ?)',
      [id, clientName, total]
    ),

  updateQuote: (id: string, updates: Record<string, any>) => {
    const setClause = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(', ')
    const values = [...Object.values(updates), id]
    return db.execute(
      `UPDATE quotes SET ${setClause} WHERE id = ?`,
      values
    )
  },

  deleteQuote: (id: string) =>
    db.execute('DELETE FROM quotes WHERE id = ?', [id]),
}
