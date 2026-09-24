/**
 * Validation Middleware
 * Valida los inputs antes de llegar a las rutas
 */

import { Request, Response, NextFunction } from 'express'

export function validateQuoteInput(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { clientName, total } = req.body

  // Validaciones
  if (!clientName || typeof clientName !== 'string' || clientName.trim() === '') {
    return res.status(400).json({
      error: 'Invalid input',
      details: 'clientName is required and must be a non-empty string',
    })
  }

  if (total === undefined || typeof total !== 'number' || total < 0) {
    return res.status(400).json({
      error: 'Invalid input',
      details: 'total is required and must be a positive number',
    })
  }

  // Si pasa todas las validaciones, continúa
  next()
}

export function validateId(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { id } = req.params

  // UUIDs son 36 caracteres con guiones
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return res.status(400).json({
      error: 'Invalid input',
      details: 'id must be a valid UUID',
    })
  }

  next()
}
