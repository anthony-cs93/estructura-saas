export class AppError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (message: string, code?: string) => new AppError(400, message, code);
export const unauthorized = (message = 'No autenticado') => new AppError(401, message);
export const forbidden = (message = 'Acceso denegado') => new AppError(403, message);
export const notFound = (message = 'Recurso no encontrado') => new AppError(404, message);
export const conflict = (message = 'Conflicto', code?: string) => new AppError(409, message, code);
