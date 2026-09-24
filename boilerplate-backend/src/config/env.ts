import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno requerida: ${name}`);
  return value;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';

export const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: Number(process.env.PORT ?? 3001),
  tursoUrl: required('TURSO_DATABASE_URL'),
  tursoAuthToken: process.env.TURSO_AUTH_TOKEN,
  jwtSecret: required('JWT_SECRET'),
  sessionDays: Number(process.env.SESSION_DAYS ?? 7),
  cookieName: process.env.COOKIE_NAME ?? 'access_token',
  // Permite deshabilitar el registro público temporalmente (p. ej. durante un lanzamiento).
  allowRegistration: process.env.ALLOW_REGISTRATION !== 'false',
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
} as const;
