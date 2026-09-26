import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno requerida: ${name}`);
  return value;
}

function requiredInProduction(name: string, fallback: string): string {
  const value = process.env[name];
  if (value) return value;
  // En producción, caer al default de desarrollo deja la app sirviendo tráfico
  // que falla en cada request (o, peor, sin proteger). Es un despliegue roto
  // que no se manifiesta hasta que un usuario lo reporta.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Falta la variable de entorno requerida en producción: ${name}`);
  }
  return fallback;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';

export const env = {
  nodeEnv,
  isProduction,
  port: Number(process.env.PORT ?? 3001),
  tursoUrl: required('TURSO_DATABASE_URL'),
  tursoAuthToken: process.env.TURSO_AUTH_TOKEN,
  jwtSecret: required('JWT_SECRET'),
  sessionDays: Number(process.env.SESSION_DAYS ?? 7),
  cookieName: process.env.COOKIE_NAME ?? 'access_token',

  /**
   * Política de SameSite de la cookie de sesión. El default es `lax` porque
   * `none` obliga a `Secure` y cruza de origen: Safari/Firefox/Chrome lo están
   * retirando y los bloqueadores lo bloquean igual. Sólo usar `none` si el
   * frontend llama al backend en otro origen (variante C2 de `07-DEPLOY.md`).
   *
   * No existe `COOKIE_DOMAIN` a propósito: la cookie debe ser host-only. Si se
   * comparte con `.tudominio.com`, un XSS en cualquier preview o staging obtiene
   * la sesión de producción.
   */
  cookieSameSite: (process.env.COOKIE_SAMESITE ?? 'lax') as 'lax' | 'strict' | 'none',

  // Permite deshabilitar el registro público temporalmente (p. ej. durante un lanzamiento).
  allowRegistration: process.env.ALLOW_REGISTRATION !== 'false',

  /**
   * Profundidad de proxies delante de la app: cuántos saltos hay entre el socket
   * y el cliente. NO se adivina, se mide (ver `07-DEPLOY.md`).
   *   1 = Vercel serverless, o Render sin CDN delante
   *   2 = Vercel → Render (variante C1 con proxy same-origin)
   *   3 = Render detrás de Cloudflare
   * Un valor mayor hace que `req.ip` sea falsificable; uno menor devuelve la IP
   * del proxy y hace inútil el rate limiting y los logs de auditoría.
   */
  trustProxy: Number(process.env.TRUST_PROXY ?? 1),

  corsOrigins: requiredInProduction('CORS_ORIGIN', 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
} as const;
