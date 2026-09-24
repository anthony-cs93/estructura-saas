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
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
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

La cookie se fija con `secure`/`sameSite` según entorno; nunca se guarda el token en `localStorage`.
`clearSessionCookie` debe usar las **mismas** opciones que `setSessionCookie` (si no, no se
borra bien una cookie `SameSite=None`).

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

`src/middleware/rateLimit.ts` — `express-rate-limit` v8 con `ipKeyGenerator` para IPv6:

```ts
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

function clientKey(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  const ip = typeof fwd === 'string' ? fwd.split(',')[0].trim() : (req.ip ?? '');
  return ip ? ipKeyGenerator(ip) : 'unknown';
}

export const globalLimiter = rateLimit({ windowMs: 60_000, limit: 100, keyGenerator: clientKey });
```

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
  app.set('trust proxy', 1);
  app.use(cors({ origin: env.isProduction ? env.corsOrigins : true, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
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

### 14. Cookies cross-origin y sonda de detección

Con frontend y backend en orígenes distintos (Vercel + Render), la cookie de sesión es de
terceros y el navegador la bloquea. La plantilla emite `SameSite=None; Secure` en producción,
expone una sonda pública y evita el cache:

`src/routes.ts`

```ts
// Sonda: 1ª llamada setea `gf_probe`; la 2ª revela si el navegador la devolvió.
router.get('/cookie-probe', (req, res) => {
  const match = (req.headers.cookie ?? '').match(/(?:^|;\s*)gf_probe=([^;]+)/);
  res.cookie('gf_probe', match ? match[1] : String(Date.now()), {
    httpOnly: false,
    secure: env.isProduction,
    sameSite: env.isProduction ? 'none' : 'lax',
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
