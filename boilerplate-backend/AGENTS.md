# AGENTS.md — Plantilla SaaS backend

Convenciones obligatorias para agentes que trabajen sobre esta plantilla.

## Arquitectura

- Flujo: `routes → validation → service → repository → db`.
- **Nunca** accedas a la base de datos desde `routes/` o `middleware/`; solo desde
  `*.repository.ts`.
- Las reglas de negocio viven en `*.service.ts`, no en las rutas ni en el frontend.
- Un módulo por dominio en `src/modules/<dominio>/`.

## Datos

- Conexión única en `src/db/client.ts` (`getDb()`).
- El esquema **solo** se define en `src/db/migrations/*`. No dupliques DDL.
- Cada cambio de esquema = nueva migración (`0002_...`), nunca editar una aplicada.
- Toda tabla multi-tenant debe filtrar por `user_id` (o `organization_id` si se
  evoluciona a equipos).

## Validación

- Valida `body`/`query`/`params` con Zod usando `parse(schema, data)`.
- No confíes en validaciones del cliente.

## Errores

- Lanza `AppError` (helpers en `src/lib/errors.ts`); el `errorHandler` central responde.
- No escribas `try/catch` de respuesta en las rutas; usa `asyncHandler`.

## Auth y permisos

- Sesión JWT en cookie `httpOnly` (`requireAuth`).
- `requireAuth` verifica que la cuenta esté `active`; un usuario desactivado no opera.
- Roles con `requireRole('admin')`.

## Planes

- `attachPlan` resuelve el plan y lo deja en `req.plan`.
- Planes: `free`, `negocio`, `empresa` (`PLANS` en `src/middleware/plan.ts`).
- Limita features con `assertFeature(req, 'x')` y cuotas con `assertWithinLimit(req, 'projectsPerMonth', actual)`.
- Para producirlo en serio, mueve `PLANS` a la base de datos.

## Registro

- `env.allowRegistration` (`ALLOW_REGISTRATION=false`) deshabilita temporalmente
  `POST /api/auth/register` (responde 403).

## Despliegue y cookies

- Guía completa en `../07-DEPLOY.md`.
- Frontend y backend suelen ser orígenes distintos: cookie `SameSite=None; Secure` en
  producción + `CORS_ORIGIN` como allowlist. `clearSessionCookie` debe usar las **mismas**
  opciones que `setSessionCookie` para poder borrarla.
- `GET /api/cookie-probe` (público) detecta si el navegador bloquea cookies de terceros.
- Las respuestas `/api` llevan `Cache-Control: no-store` (datos autenticados / proxy).
- Solución definitiva: cookie first-party (mismo origen, proxy o dominio propio).

## Seguridad

- No commitees secretos. `.env` está ignorado; `.env.example` solo lleva placeholders.
- En producción `CORS_ORIGIN` es obligatorio y `JWT_SECRET` también (fail-fast).
- El rate limiting en memoria es por instancia; para serverless/multi-instancia usa un
  `store` persistente.

## Respuestas

- JSON en camelCase.
- Errores: `{ error: string, code?: string }`.
