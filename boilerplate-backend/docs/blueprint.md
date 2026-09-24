# Plantilla SaaS canónica — Blueprint

Guía reutilizable (blueprint autónomo) para arrancar el backend de nuevas aplicaciones
SaaS con Express 5 + TypeScript + Turso. Combina las mejores prácticas de dos proyectos
reales:

- `gestion_financiera_negocio_saas` — capas service/repository, esquema centralizado, paridad local/serverless.
- `cotizador-pro-backend` — planes/cuotas, feature gating, auditoría, rate limiting, gestión de cuenta, migraciones con reintentos.

> Cada pieza incluye el fragmento de código listo para copiar. El análisis detallado de
> `cotizador-pro-backend` (hallazgos y mejoras) vive en `docs/cotizador-pro-backend-review.md`
> de ese proyecto.
>
> Para elegir el modelo de despliegue de una app nueva (BaaS/Supabase vs
> serverless catch-all en Vercel vs Express en Render), ver
> `C:\Users\User\Documents\3. Negocios\5. Vibe-coding\docs-arquitectura-saas.md`
> (Parte 3: patrones y árbol de decisión) y `docs/patrones-deploy.md` de esta plantilla.

## Stack

- Node + TypeScript (`strict`)
- Express 5
- Turso (libSQL) vía `@libsql/client`
- Zod (validación)
- `jose` (JWT en cookie `httpOnly`)
- `express-rate-limit`

## Estructura de carpetas

```
src/
├── config/env.ts              # entorno validado (fail-fast)
├── db/
│   ├── client.ts              # conexión única
│   ├── migrate.ts             # runner de migraciones versionadas
│   └── migrations/            # una migración por archivo
├── lib/                       # errors, http, validation, audit
├── middleware/                # auth, requireRole, plan, rateLimit, errorHandler
├── modules/<dominio>/         # <dominio>.repository / .service / .schemas / .routes
├── scripts/migrate.ts
├── routes.ts                  # composición de routers
├── index.ts                   # app factory + arranque
└── types/express.d.ts         # augmentation de Request
```

## Flujo de una petición

```
Cliente
  ▼
routes.ts  →  middleware (rateLimit → requireAuth → attachPlan)
  ▼
<dominio>.routes.ts   (HTTP: parse, status, response)
  ▼
<dominio>.schemas.ts  (Zod)
  ▼
<dominio>.service.ts  (reglas de negocio, límites de plan)
  ▼
<dominio>.repository.ts  (SQL)
  ▼
db/client.ts  →  Turso
```

## Convenciones

- Las rutas **no** acceden a la base de datos; solo el `repository`.
- La lógica de negocio vive en el `service`, nunca en las rutas ni en el frontend.
- Toda entrada se valida con Zod en el borde.
- Los errores se lanzan como `AppError`; un `errorHandler` central responde.
- El esquema se define **solo** en migraciones versionadas.
- Toda tabla de dominio filtra por `user_id` (o `organization_id` si evoluciona a equipos).
- Respuestas JSON en camelCase; errores `{ error, code? }`.

## Piezas clave

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

### 10. Auditoría

`src/lib/audit.ts` — escribe en `audit_logs` (actor, acción, objetivo, IP, detalle).
Se usa en acciones sensibles (p. ej. borrado de cuenta).

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
detalla en la sección **16. Despliegue**.

### 15. Registro deshabilitable

`env.allowRegistration` (`ALLOW_REGISTRATION=false`) cierra el registro público sin tocar
código:

```ts
router.post('/register', registerLimiter, asyncHandler(async (req, res) => {
  if (!env.allowRegistration) throw forbidden('El registro está deshabilitado temporalmente');
  // ...
}));
```

### 16. Despliegue (Vercel frontend + Render backend)

- Backend: `process.env.PORT`, `NODE_ENV=production`, `CORS_ORIGIN` (allowlist),
  `TURSO_*`, `JWT_SECRET`. Health en `/api/health`.
- Frontend: `VITE_API_URL` (build-time, tipo **Config**) apuntando al backend.
- El banner de consentimiento de cookies **no** soluciona el bloqueo de cookies de
  terceros; sólo la cookie first-party lo hace.

## Cómo arrancar un proyecto nuevo

1. Reconstruye la estructura de carpetas de la sección *Estructura de carpetas* con los fragmentos de esta guía.
2. `cp .env.example .env` y completa `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET`, `CORS_ORIGIN`.
3. `npm install`
4. `npm run migrate`
5. `npm run dev`
6. Renombra/elimina el módulo `projects` y crea los módulos de tu dominio.

## Checklist para agregar un módulo

- [ ] `repository` con las consultas SQL (filtradas por `user_id`).
- [ ] `service` con las reglas de negocio y límites de plan.
- [ ] `schemas` con Zod.
- [ ] `routes` con `requireAuth` (+ `attachPlan` si aplica).
- [ ] Montarlo en `routes.ts`.
- [ ] Migración nueva si agrega tablas/columnas.

## Origen de cada patrón

| Patrón | Origen |
|---|---|
| Capas service/repository | `gestion_financiera_negocio_saas` |
| Esquema centralizado / paridad local-serverless | `gestion_financiera_negocio_saas` |
| Planes `free`/`negocio`/`empresa` y cuota mensual | `gestion_financiera_negocio_saas` |
| Cookies cross-origin + sonda `/api/cookie-probe` | `gestion_financiera_negocio_saas` |
| `Cache-Control: no-store` en la API | `gestion_financiera_negocio_saas` |
| Registro deshabilitable (`ALLOW_REGISTRATION`) | `gestion_financiera_negocio_saas` |
| Planes, cuotas y features | `cotizador-pro-backend` |
| Auditoría | `cotizador-pro-backend` |
| Rate limiting por endpoint | `cotizador-pro-backend` |
| Gestión de cuenta (export/borrado) | `cotizador-pro-backend` |
| Migraciones con reintentos | `cotizador-pro-backend` |
| Fail-fast de entorno + CORS allowlist | `cotizador-pro-backend` |

## Pendientes / evolución

- Mover `PLANS` a la base de datos (`plans`, `plan_features`).
- Integrar pasarela de pago real con webhooks idempotentes.
- Módulo `admin` (stats, gestión de usuarios, logs) con capas service/repository.
- Tests (unit de servicios + integración de rutas) y CI.
- Observabilidad (logger estructurado, request-id, métricas).
- Equipos: `organizations` + `organization_members` y `organization_id` en las tablas.
