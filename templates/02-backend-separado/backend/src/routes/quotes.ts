/**
 * Routes: /quotes
 * Maneja CRUD de cotizaciones
 * 
 * GET    /quotes          - Listar todas
 * GET    /quotes/:id      - Obtener una
 * POST   /quotes          - Crear nueva
 * PUT    /quotes/:id      - Actualizar
 * DELETE /quotes/:id      - Borrar
 */

import { Router, Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { db, queries } from '../lib/db.js'
import { validateQuoteInput } from '../middleware/validation.js'

export const quotesRouter = Router()

// GET /quotes - Listar todas
quotesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const result = await queries.getQuotes()
    
    // Convertir ResultSet a array de objetos
    const quotes = result.rows.map((row) => ({
      id: row[0],
      clientName: row[1],
      total: row[2],
      status: row[3],
      createdAt: row[4],
    }))
    
    res.json(quotes)
  } catch (error) {
    console.error('Error fetching quotes:', error)
    res.status(500).json({ error: 'Failed to fetch quotes' })
  }
})

// GET /quotes/:id - Obtener una
quotesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const result = await queries.getQuoteById(id)

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Quote not found' })
    }

    const row = result.rows[0]
    const quote = {
      id: row[0],
      clientName: row[1],
      total: row[2],
      status: row[3],
      createdAt: row[4],
    }

    res.json(quote)
  } catch (error) {
    console.error('Error fetching quote:', error)
    res.status(500).json({ error: 'Failed to fetch quote' })
  }
})

// POST /quotes - Crear nueva
quotesRouter.post(
  '/',
  validateQuoteInput,
  async (req: Request, res: Response) => {
    try {
      const { clientName, total } = req.body
      const id = randomUUID()

      // LÓGICA PROTEGIDA: Validar datos
      if (!clientName || typeof clientName !== 'string') {
        return res.status(400).json({ error: 'Invalid clientName' })
      }

      if (!total || typeof total !== 'number' || total < 0) {
        return res.status(400).json({ error: 'Invalid total' })
      }

      // Guardar en BD
      await queries.createQuote(id, clientName, total)

      res.status(201).json({
        id,
        clientName,
        total,
        status: 'draft',
        createdAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Error creating quote:', error)
      res.status(500).json({ error: 'Failed to create quote' })
    }
  }
)

// PUT /quotes/:id - Actualizar
quotesRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { clientName, total, status } = req.body

    // Verificar que existe
    const result = await queries.getQuoteById(id)
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Quote not found' })
    }

    // Validar inputs
    const updates: Record<string, any> = {}

    if (clientName !== undefined) {
      if (typeof clientName !== 'string') {
        return res.status(400).json({ error: 'Invalid clientName' })
      }
      updates.client_name = clientName
    }

    if (total !== undefined) {
      if (typeof total !== 'number' || total < 0) {
        return res.status(400).json({ error: 'Invalid total' })
      }
      updates.total = total
    }

    if (status !== undefined) {
      const validStatuses = ['draft', 'sent', 'accepted', 'rejected']
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' })
      }
      updates.status = status
    }

    updates.updated_at = new Date().toISOString()

    // Guardar
    await queries.updateQuote(id, updates)

    res.json({
      id,
      clientName: updates.client_name || result.rows[0][1],
      total: updates.total || result.rows[0][2],
      status: updates.status || result.rows[0][3],
      updatedAt: updates.updated_at,
    })
  } catch (error) {
    console.error('Error updating quote:', error)
    res.status(500).json({ error: 'Failed to update quote' })
  }
})

// DELETE /quotes/:id - Borrar
quotesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // Verificar que existe
    const result = await queries.getQuoteById(id)
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Quote not found' })
    }

    // Borrar
    await queries.deleteQuote(id)

    res.json({ message: 'Quote deleted', id })
  } catch (error) {
    console.error('Error deleting quote:', error)
    res.status(500).json({ error: 'Failed to delete quote' })
  }
})
