# Arquitectura de la plantilla

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

### 9. Cookies cross-origin y sonda de detección

Cuando frontend y backend viven en orígenes distintos (Vercel + Render), la cookie de
sesión es de terceros y los navegadores la bloquean. La plantilla:

- Emite la cookie con `secure`/`sameSite` según entorno (`SameSite=None; Secure` en
  producción) y **borra con las mismas opciones** (`clearSessionCookie`).
- Expone `GET /api/cookie-probe` (público) para que el frontend detecte el bloqueo y
  avise al usuario.
- Añade `Cache-Control: no-store` a las respuestas `/api`.

La solución definitiva (cookie first-party) se documenta en `docs/deploy.md`.

### 10. Registro deshabilitable

`env.allowRegistration` (`ALLOW_REGISTRATION`) permite cerrar temporalmente el registro
público sin tocar código (útil en lanzamientos).

## Qué se tomó de cada repo

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

## Pendiente / siguientes pasos

- Mover `PLANS` a la base de datos (`plans`, `plan_features`).
- Integrar pasarela de pago real con webhooks idempotentes.
- Módulo `admin` (stats, gestión de usuarios, logs) siguiendo el ejemplo de
  `cotizador-pro-backend`, pero con capas service/repository.
- Tests (unit de servicios + integración de rutas) y CI.
- Observabilidad (logger estructurado, request-id, métricas).
- Evolución a equipos: `organizations` + `organization_members` y `organization_id` en
  las tablas de dominio.
