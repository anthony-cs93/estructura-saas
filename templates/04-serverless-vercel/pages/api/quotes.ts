/**
 * API Route: /api/quotes
 * GET  → listar quotes
 * POST → crear quote
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@libsql/client'

// Instancia de BD (reutilizable)
const db = createClient({
  url: process.env.TURSO_URL!,
  authToken: process.env.TURSO_TOKEN!,
})

type ResponseData = {
  message?: string
  data?: any
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  // CORS (si necesitas frontend desde otro dominio)
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,OPTIONS,PATCH,DELETE,POST,PUT'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  try {
    if (req.method === 'GET') {
      // Listar
      const result = await db.execute('SELECT * FROM quotes')
      const quotes = result.rows.map((row: any) => ({
        id: row[0],
        clientName: row[1],
        total: row[2],
        status: row[3],
      }))
      return res.status(200).json({ data: quotes })
    }

    if (req.method === 'POST') {
      // Crear
      const { clientName, total } = req.body

      if (!clientName || !total) {
        return res.status(400).json({ error: 'Missing fields' })
      }

      const id = crypto.randomUUID()
      await db.execute(
        'INSERT INTO quotes (id, client_name, total) VALUES (?, ?, ?)',
        [id, clientName, total]
      )

      return res.status(201).json({
        data: { id, clientName, total, status: 'draft' },
      })
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
