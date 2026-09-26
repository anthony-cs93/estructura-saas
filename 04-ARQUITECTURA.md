# 🏗️ Arquitectura del backend SaaS

Blueprint canónico para el backend de una app SaaS con **Express 5 + TypeScript + Turso**.
Aplica a las arquitecturas **Full-Stack Monorepo**, **Backend Separado** y **Serverless**
(la única diferencia entre ellas es el "envoltorio" de despliegue — ver [07-DEPLOY.md](07-DEPLOY.md)).

Combina las mejores prácticas de dos proyectos reales:

- `gestion_financiera_negocio_saas` — capas service/repository, esquema centralizado, paridad local/serverless.
- `cotizador-pro-backend` — planes/cuotas, feature gating, auditoría, rate limiting, gestión de cuenta, migraciones con reintentos.

El código copiable de cada pieza vive en **[05-PATRONES-CODIGO.md](05-PATRONES-CODIGO.md)**.
El backend de referencia completo está en **`boilerplate-backend/`**.

---

## Flujo de una petición

```
Cliente
  │
  ▼
routes.ts  →  middleware (rateLimit → requireAuth → attachPlan)
  │
  ▼
<dominio>.routes.ts   (HTTP: parse, status, response)
  │
  ▼
<dominio>.schemas.ts  (Zod)
  │
  ▼
<dominio>.service.ts  (reglas de negocio, permisos de plan)
  │
  ▼
<dominio>.repository.ts  (SQL / acceso a datos)
  │
  ▼
db/client.ts  →  Turso (libSQL)
```

---

## Stack

- Node + TypeScript (`strict`)
- Express 5
- Turso (libSQL) vía `@libsql/client`
- Zod (validación)
- `jose` (JWT en cookie `httpOnly`)
- `express-rate-limit`

---

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

---

## Convenciones

- Las rutas **no** acceden a la base de datos; solo el `repository`.
- La lógica de negocio vive en el `service`, nunca en las rutas ni en el frontend.
- Toda entrada se valida con Zod en el borde.
- Los errores se lanzan como `AppError`; un `errorHandler` central responde.
- El esquema se define **solo** en migraciones versionadas.
- Toda tabla de dominio filtra por `user_id` (o `organization_id` si evoluciona a equipos).
- Respuestas JSON en camelCase; errores `{ error, code? }`.

---

## Decisiones de diseño

### 1. Capas service/repository

Tomado de `gestion_financiera_negocio_saas`. Evita el problema de `cotizador-pro-backend`
(rutas que acceden directo a la base de datos). Beneficios: testeable, reutilizable y
con reglas de negocio aisladas.

### 2. Migraciones versionadas y una sola fuente

`src/db/migrations/` + tabla `schema_migrations`. Corrige el drift de esquema que tenía
`cotizador-pro-backend` (`schema.sql` + `db.ts` + `setup-db.js`). El runner reintenta si
la base de datos no está disponible al arrancar.

### 3. Auth por cookie httpOnly

JWT firmado con `jose`, guardado en cookie `httpOnly` (`secure` + `sameSite` según
entorno). Sin token en `localStorage`. `requireAuth` valida además que la cuenta esté
`active` (hueco detectado en `cotizador-pro-backend`).

### 4. Planes y feature gating

`middleware/plan.ts` define `PLANS` (`free`, `negocio`, `empresa` con límites + features),
resuelve la suscripción y expira planes vencidos. Los módulos aplican `assertFeature` /
`assertWithinLimit` (p. ej. `projectsPerMonth`).
`POST /api/plan/mock-subscribe` permite probar el flujo sin pasarela de pago.

### 5. Validación con Zod en el borde

`parse(schema, data)` convierte errores de validación en `AppError(400)`.

### 6. Errores centralizados

`AppError` + `errorHandler`. Las rutas usan `asyncHandler` y no manejan respuestas de
error manualmente.

### 7. Rate limiting con abstracción de store

`express-rate-limit` con `MemoryStore` por defecto. Nota importante: en serverless o
múltiples instancias el store en memoria no es fiable; pasar un `store` persistente.

### 8. Auditoría

`lib/audit.ts` escribe en `audit_logs` acciones sensibles (por ejemplo, borrado de
cuenta). Extensible a cambios de plan/rol en un panel admin.

### 9. Cookies de sesión y sonda de detección

La cookie de sesión es **host-only** y first-party. La plantilla:

- La emite con `httpOnly`, `secure` en producción, `sameSite` desde `COOKIE_SAMESITE`
  (default `lax`) y **sin atributo `Domain`**; **borra con las mismas opciones**
  (`clearSessionCookie`).
- Expone `GET /api/cookie-probe` (público) para detectar bloqueo de cookies de terceros.
  **Solo hace falta en la variante C2**; con proxy same-origin (C1) o dominio compartido
  (C3) nunca hay bloqueo y la sonda siempre da `true`.
- Añade `Cache-Control: no-store` a las respuestas `/api`, montado antes del rate limiter.

El diseño correcto no es "cookie de terceros + sonda que avise", sino **proxy same-origin**
(C1): la cookie es first-party, la sonda sobra y no hace falta pagar un dominio. Ver
[07-DEPLOY.md](07-DEPLOY.md).

### 9.bis IP real y `trust proxy`

`app.set('trust proxy', env.trustProxy)` con `TRUST_PROXY` en el entorno. El rate limiting y
los logs de auditoría dependen de que `req.ip` sea la IP real del cliente: **nunca leer
`x-forwarded-for` a mano** (el cliente puede prefijar la cadena y evadir el límite por
completo; pasó en producción). La profundidad **se mide**, no se supone, y nunca debe ser
`true`. Procedimiento y caso real en [07-DEPLOY.md](07-DEPLOY.md).

### 10. Registro deshabilitable

`env.allowRegistration` (`ALLOW_REGISTRATION`) permite cerrar temporalmente el registro
público sin tocar código (útil en lanzamientos).

---

## Origen de cada patrón

| Patrón | Origen |
|---|---|
| Capas service/repository | `gestion_financiera_negocio_saas` |
| `ensureSchema` centralizado | `gestion_financiera_negocio_saas` |
| Paridad local/serverless | `gestion_financiera_negocio_saas` |
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

---

## Módulo de ejemplo

`modules/projects/` implementa el patrón completo:

- `project.repository.ts` — SQL y mapeo de filas.
- `project.service.ts` — reglas de negocio; aplica `assertWithinLimit(req, 'projects', count)`.
- `project.schemas.ts` — Zod (`createProjectSchema`, `updateProjectSchema`).
- `project.routes.ts` — HTTP con `requireAuth` + `attachPlan` y `asyncHandler`.

Para crear tus propios módulos sigue **[06-CHECKLIST-MODULO.md](06-CHECKLIST-MODULO.md)**.

---

## Pendientes / evolución

- Mover `PLANS` a la base de datos (`plans`, `plan_features`).
- Integrar pasarela de pago real con webhooks idempotentes.
- Módulo `admin` (stats, gestión de usuarios, logs) con capas service/repository.
- Tests (unit de servicios + integración de rutas) y CI.
- Observabilidad (logger estructurado, request-id, métricas).
- Equipos: `organizations` + `organization_members` y `organization_id` en las tablas de dominio.
