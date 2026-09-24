/**
 * Backend Express
 * - Maneja todas las rutas de API
 * - Valida y protege la lógica de negocio
 * - Conecta a BD (Turso)
 */

import express, { Request, Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { db } from './lib/db.js'
import { quotesRouter } from './routes/quotes.js'
import { errorHandler } from './middleware/errorHandler.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    process.env.FRONTEND_URL || 'https://tudominio.com'
  ],
  credentials: true
}))
app.use(express.json())

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date() })
})

// Routes
app.use('/quotes', quotesRouter)

// Error handling
app.use(errorHandler)

// 404
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`)
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`)
})
