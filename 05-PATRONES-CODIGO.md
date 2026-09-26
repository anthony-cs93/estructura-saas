# 🧩 Patrones de código — piezas listas para copiar

Fragmentos de implementación del backend descrito en **[04-ARQUITECTURA.md](04-ARQUITECTURA.md)**.
Cada pieza incluye el código listo para copiar. El proyecto completo de referencia está en
**`boilerplate-backend/`**.

---

### 1. Entorno validado (fail-fast)

`src/config/env.ts`

```ts
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
  cookieName: 'access_token',
  // lax (default) | strict | none. `none` solo en la variante C2.
  cookieSameSite: (process.env.COOKIE_SAMESITE ?? 'lax') as 'lax' | 'strict' | 'none',
  // Profundidad de proxies: se MIDE (07-DEPLOY.md). NUNCA `true`.
  trustProxy: Number(process.env.TRUST_PROXY ?? 1),
  // Obligatoria en producción: sin ella la app arranca y falla en cada request.
  corsOrigins: requiredInProduction('CORS_ORIGIN', 'http://localhost:5173')
    .split(',').map((o) => o.trim()).filter(Boolean),
} as const;
```

---

### 2. Conexión única a la base de datos

`src/db/client.ts`

```ts
import { createClient, type Client } from '@libsql/client';
import { env } from '../config/env.js';

let client: Client | null = null;

export function getDb(): Client {
  if (!client) client = createClient({ url: env.tursoUrl, authToken: env.tursoAuthToken });
  return client;
}
```

---

### 3. Migraciones versionadas con reintentos

`src/db/migrate.ts` (extracto)

```ts
export async function runMigrations(retries = 5): Promise<void> {
  const db = getDb();
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await db.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`);
      const applied = new Set((await db.execute('SELECT id FROM schema_migrations')).rows.map((r) => String(r.id)));
      for (const m of migrations) {
        if (applied.has(m.id)) continue;
        for (const stmt of m.up) await db.execute(stmt);
        await db.execute({ sql: 'INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)', args: [m.id, new Date().toISOString()] });
      }
      return;
    } catch (err) {
      if (attempt === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
}
```

Una migración es un objeto `{ id, up: string[] }` (`src/db/migrations/0001_init.ts`).

---

### 4. Errores centralizados

`src/lib/errors.ts`

```ts
export class AppError extends Error {
  constructor(readonly status: number, message: string, readonly code?: string) {
    super(message);
    this.name = 'AppError';
  }
}
export const badRequest = (m: string) => new AppError(400, m);
export const unauthorized = (m = 'No autenticado') => new AppError(401, m);
export const forbidden = (m = 'Acceso denegado') => new AppError(403, m);
export const notFound = (m = 'Recurso no encontrado') => new AppError(404, m);
export const conflict = (m = 'Conflicto') => new AppError(409, m);
```

`src/lib/http.ts`

```ts
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
```

`src/middleware/errorHandler.ts`

```ts
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) { res.status(err.status).json({ error: err.message, code: err.code }); return; }
  console.error('[error]', err);
  res.status(500).json({ error: 'Error interno del servidor' });
};
```

---

### 5. Validación con Zod

`src/lib/validation.ts`

```ts
import { z } from 'zod';
export function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError(400, result.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; '));
  }
  return result.data;
}
```

---

### 6. Auth por cookie httpOnly + verificación de cuenta activa

`src/middleware/auth.ts` (extracto)

```ts
export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const token = getSessionToken(req);
    if (!token) throw unauthorized();
    const session = await verifySession(token);
    if (!session) throw unauthorized('Sesión inválida');

    const result = await getDb().execute({ sql: 'SELECT active FROM users WHERE id = ?', args: [session.id] });
    if (result.rows.length === 0) throw unauthorized('Sesión inválida');
    if (Number(result.rows[0].active ?? 1) === 0) throw forbidden('Cuenta desactivada');

    req.user = session;
    next();
  } catch (err) { next(err); }
};
```

La cookie se fija con `httpOnly`, `secure` en producción y `sameSite` desde
`COOKIE_SAMESITE` (default `lax`); nunca se guarda el token en `localStorage`.
`clearSessionCookie` debe usar las **mismas** opciones que `setSessionCookie` — sin un
`sameSite` idéntico, borrar una cookie `SameSite=None` no la quita y el logout "no funciona".

---

### 7. Roles

`src/middleware/requireRole.ts`

```ts
export function requireRole(...roles: Array<'user' | 'admin'>): RequestHandler {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) { next(forbidden()); return; }
    next();
  };
}
```

---

### 8. Planes, cuotas y feature gating

`src/middleware/plan.ts` (extracto)

```ts
export const PLANS: Record<PlanId, PlanDefinition> = {
  free:    { limits: { projectsPerMonth: 1 },        features: ['dashboard', 'reports', 'export'] },
  negocio: { limits: { projectsPerMonth: 5 },        features: ['dashboard', 'reports', 'export', 'csv'] },
  empresa: { limits: { projectsPerMonth: Infinity }, features: ['dashboard', 'reports', 'export', 'csv', 'priority'] },
};

export function assertFeature(req: Request, feature: string): void {
  const plan = req.plan?.id ?? 'free';
  if (!planFeatures(plan).includes(feature)) throw forbidden(`Tu plan "${plan}" no incluye "${feature}"`);
}

export function assertWithinLimit(req: Request, key: string, current: number): void {
  const plan = req.plan?.id ?? 'free';
  if (current >= planLimit(plan, key)) throw forbidden(`Alcanzaste el límite de "${key}"`);
}
```

`attachPlan` resuelve la suscripción, crea el plan `free` si no existe y expira planes vencidos.

---

### 9. Rate limiting

`src/middleware/rateLimit.ts` — `express-rate-limit` v8. **Sin `keyGenerator` en los
limitadores simples**, a propósito: el default usa `req.ip` + `ipKeyGenerator` (agrupa IPv6
por subred) **y ejecuta las validaciones de `trust proxy`**.

```ts
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

// La IP la resuelve Express vía `trust proxy`. NO leer `x-forwarded-for` a mano.
function safeIpKey(req: Request): string {
  const ip = req.ip;
  if (!ip) return 'unknown';
  try {
    return ipKeyGenerator(ip);
  } catch {
    return 'unknown';
  }
}

export const globalLimiter = rateLimit({
  windowMs: 60_000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

// Solo cuando la clave necesita algo más (login: IP + email).
export const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = String((req.body as { email?: unknown })?.email ?? '').trim().toLowerCase();
    return `${safeIpKey(req)}:${email}`;
  },
});
```

> 🔴 **No copies la versión que lee el header a mano.** `xff.split(',')[0]` toma el valor que
> **el cliente controla**: cambiar el header da un cubo de rate limit nuevo y el límite se
> evade por completo con un `curl`. Pasó en producción y dejó exposed el registro de cuentas
> (3/hora → ilimitado). Ver el caso real en [07-DEPLOY.md](07-DEPLOY.md).
>
> Además, al pasar un `keyGenerator` propio **desactivás las validaciones internas de
> `trust proxy`**: una profundidad mal puesta falla en silencio, sin warning. Ese es el
> precio de la "flexibilidad" y no vale la pena en los limitadores simples.

> El `MemoryStore` por defecto es por instancia. En serverless o múltiples instancias,
> pasar un `store` persistente (Turso/Redis/Upstash).


---

### 10. Auditoría

`src/lib/audit.ts` — escribe en `audit_logs` (actor, acción, objetivo, IP, detalle).
Se usa en acciones sensibles (p. ej. borrado de cuenta).

---

### 11. Módulo de ejemplo

`modules/projects/` implementa el patrón completo:

- `project.repository.ts` — SQL y mapeo de filas.
- `project.service.ts` — reglas de negocio; aplica `assertWithinLimit(req, 'projects', count)`.
- `project.schemas.ts` — Zod (`createProjectSchema`, `updateProjectSchema`).
- `project.routes.ts` — HTTP con `requireAuth` + `attachPlan` y `asyncHandler`.

`project.routes.ts` (extracto)

```ts
const router = Router();
router.use(requireAuth, attachPlan);

router.post('/', asyncHandler(async (req, res) => {
  const input = parse(createProjectSchema, req.body);
  res.status(201).json(await projectService.create(req, req.user!.id, input));
}));
```

---

### 12. Composición de routers

`src/routes.ts`

```ts
export function buildRouter(): Router {
  const router = Router();
  router.get('/health', (_req, res) => res.json({ status: 'ok' }));
  router.use('/auth', authRouter);
  router.use('/plan', planRouter);
  router.use('/projects', projectRouter);
  router.use('/account', accountRouter);
  return router;
}
```

---

### 13. App factory y arranque

`src/index.ts`

```ts
export function createApp() {
  const app = express();
  // Profundidad de proxies: SE MIDE, no se supone (procedimiento en 07-DEPLOY.md).
  //   1 = Vercel serverless o Render sin CDN · 2 = Vercel -> Render · 3 = + Cloudflare
  // NUNCA `true`: devuelve el valor más a la izquierda, que es el que falsifica el cliente.
  app.set('trust proxy', env.trustProxy);

  app.use(cors({ origin: env.isProduction ? env.corsOrigins : true, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));

  // Antes de globalLimiter a propósito: si no, los 429 salen sin `no-store`
  // y un CDN puede cachear un rechazo.
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.use(globalLimiter);
  app.use('/api', buildRouter());
  app.use(errorHandler);
  return app;
}

async function start(): Promise<void> {
  await runMigrations();
  createApp().listen(env.port, () => console.log(`API en http://localhost:${env.port}`));
}
start().catch((err) => { console.error(err); process.exit(1); });
```

> Mantén la app como **factory** (`createApp()` sin `listen`) para poder alternar entre
> los patrones de despliegue B y C sin reescribir código (ver [07-DEPLOY.md](07-DEPLOY.md)).

---

### 14. Cookies de sesión y sonda de detección

La cookie es **host-only**: `httpOnly`, `secure` en producción, `path: '/'`, y **sin atributo
`Domain`**. `sameSite` sale de `COOKIE_SAMESITE` (default `lax`).

```ts
function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction,
    // `none` solo si el frontend está en otro origen (variante C2), y solo con HTTPS.
    sameSite: env.cookieSameSite,
    path: '/',
  };
}
```

> 🔴 **No definas `COOKIE_DOMAIN`.** Con `.tudominio.com` la cookie se comparte con **todos**
> los subdominios, incluidos los previews de Vercel y el staging: un XSS en cualquiera de
> ellos obtiene la sesión de producción. Host-only es lo correcto para una SPA y su API.

**Sonda de cookies** — solo para la variante **C2** (frontend llamando directo a otro origen):

```ts
// Sonda: 1ª llamada setea `gf_probe`; la 2ª revela si el navegador la devolvió.
router.get('/cookie-probe', (req, res) => {
  const match = (req.headers.cookie ?? '').match(/(?:^|;\s*)gf_probe=([^;]+)/);
  res.cookie('gf_probe', match ? match[1] : String(Date.now()), {
    httpOnly: false,
    secure: env.isProduction,
    sameSite: env.cookieSameSite,
    path: '/',
    maxAge: 120 * 1000,
  });
  res.json({ cookieReceived: Boolean(match) });
});
```

`src/index.ts` — sin cache para datos autenticados:

```ts
app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
app.use('/api', buildRouter());
```

La solución definitiva (cookie first-party: mismo origen, proxy o dominio propio) se
detalla en **[07-DEPLOY.md](07-DEPLOY.md)**.

---

### 15. Registro deshabilitable

`env.allowRegistration` (`ALLOW_REGISTRATION=false`) cierra el registro público sin tocar
código:

```ts
router.post('/register', registerLimiter, asyncHandler(async (req, res) => {
  if (!env.allowRegistration) throw forbidden('El registro está deshabilitado temporalmente');
  // ...
}));
```

---

## Cómo arrancar un proyecto nuevo

1. Reconstruye la estructura de carpetas de [04-ARQUITECTURA.md](04-ARQUITECTURA.md) con los fragmentos de esta guía.
2. `cp .env.example .env` y completa `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET`, `CORS_ORIGIN`.
3. `npm install`
4. `npm run migrate`
5. `npm run dev`
6. Renombra/elimina el módulo `projects` y crea los módulos de tu dominio ([06-CHECKLIST-MODULO.md](06-CHECKLIST-MODULO.md)).
