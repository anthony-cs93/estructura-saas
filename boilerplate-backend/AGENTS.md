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

- Guía completa y variantes (C1/C2/C3) en `../07-DEPLOY.md`.
- La cookie es **host-only**: `httpOnly`, `secure` en producción, `path: '/'`, **sin
  atributo `Domain`**. No expongas `COOKIE_DOMAIN`: compartiría la cookie con todos los
  subdominios, incluidos previews y staging, y un XSS ahí robea la sesión de producción.
- `COOKIE_SAMESITE` sale del entorno (`lax` por default). Ponelo en `none` **solo** si el
  frontend llama al backend en otro origen, y solo con HTTPS. La variante C1 (proxy
  same-origin) no lo necesita: nunca hay cruce de origen.
- `clearSessionCookie` debe usar las **mismas** opciones que `setSessionCookie` para poder
  borrarla.
- `GET /api/cookie-probe` (público) detecta el bloqueo de cookies de terceros. **Solo
  corresponde a la variante C2**; en C1 y C3 la sonda es innecesaria.
- Las respuestas `/api` llevan `Cache-Control: no-store` (datos autenticados / proxy). Va
  montado **antes** del rate limiter, para que los 429 también lleven `no-store`.

## IP real y rate limiting

- `app.set('trust proxy', env.trustProxy)` con `TRUST_PROXY` en el entorno. **La profundidad
  se mide, no se supone**; el procedimiento está en `../07-DEPLOY.md`.
- **Nunca leas `x-forwarded-for` a mano.** El cliente puede prefijar la cadena, y tomar
  `[0]` es tomar el valor que eligió el atacante: cambiar el header evade el límite por
  completo. Usá `req.ip`, que Express resuelve desde la derecha.
- **Nunca** `trust proxy: true`: devuelve el valor más a la izquierda, o sea el falsificable.
- No pases `keyGenerator` propio a los limitadores simples: el default de
  `express-rate-limit` usa `req.ip` + `ipKeyGenerator` (agrupa IPv6 por subred) **y ejecuta
  las validaciones de `trust proxy`**. Con un `keyGenerator` propio esas validaciones no
  corren y una config mala falla en silencio. Si necesitás una clave compuesta (login:
  IP + email), sí usá `keyGenerator` — pero derivando la IP de `req.ip`.
- El rate limiting en memoria es por instancia; para serverless/multi-instancia usá un
  `store` persistente.
- Los logs de auditoría y de login fallido usan `req.ip`: con `trust proxy` mal puesto
  guardan la IP del proxy y quedan inservibles para investigar.

## Seguridad

- No commitees secretos. `.env` está ignorado; `.env.example` solo lleva placeholders.
- En producción `CORS_ORIGIN` y `JWT_SECRET` son **obligatorios y fallan al arrancar**
  (fail-fast). Cumplir la promesa es mejor que un despliegue que arranca roto.
- Un `GET` no debe escribir en la base. Si un middleware de solo-lectura necesita crear o
  actualizar filas (materializar un plan, por ejemplo), que lo haga un `POST` explícito o un
  job: un GET con efectos laterales se puede disparar con un enlace.


## Respuestas

- JSON en camelCase.
- Errores: `{ error: string, code?: string }`.
