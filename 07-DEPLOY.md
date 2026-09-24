# 🚀 Despliegue — patrones y detalle técnico

Guía para elegir **cómo** desplegar y luego ejecutar cada patrón. El núcleo (capas, migraciones,
errores, planes) es el mismo en todos: el patrón solo cambia el "envoltorio".

Ver también **[04-ARQUITECTURA.md](04-ARQUITECTURA.md)** y **[05-PATRONES-CODIGO.md](05-PATRONES-CODIGO.md)**.

---

## Árbol de decisión

```
¿Tiene reglas que no pueden vivir en el navegador/RLS?
├─ NO  → Patrón A (BaaS)
└─ SÍ
   ├─ ¿Procesos largos, websockets, binarios nativos?
   │  ├─ SÍ → Patrón C (Render)
   │  └─ NO → Patrón B (Vercel catch-all) — recomendado si quieres free tier + 1 despliegue
```

---

## Patrón A — BaaS (Supabase + RLS) — "solo Vercel sin backend"

**Cuándo**: CRUD por usuario, sin secretos ni reglas sensibles en servidor, necesitas auth y archivos ya.

- Stack: SPA + `@supabase/supabase-js`.
- Seguridad en **RLS de Postgres**, no en código:

  ```sql
  alter table <tabla> enable row level security;
  create policy "<tabla>_select_own" on <tabla>
    for select using (auth.uid() = user_id);
  -- insert/update/delete con using/check
  ```

  `supabase/schema.sql` es la fuente única del esquema + políticas.
- Auth/storage gestionados (`signInWithPassword`, `storage.from('bucket')`).
- Límite: la anon key es pública; todo secreto (pagos, cálculos propietarios, admin cross-tenant) exige B o C.

Boilerplate: `templates/03-baas-supabase/`.

---

## Patrón B — Monorepo + catch-all serverless (Vercel) — recomendado

**Cuándo**: hay lógica sensible (planes, cálculos, roles, admin) pero quieres 1 despliegue y 1 proveedor.
Es el estado final propuesto para `gestion_financiera_negocio_saas`.

Frontend y backend en el **mismo proyecto de Vercel**. El navegador nunca sale del origen del
frontend, así que no hay CORS ni cookies de terceros.

| Componente | Dónde | Qué |
|---|---|---|
| Frontend SPA | Vercel (estático, `dist/`) | `https://app.vercel.app` |
| Backend API | Vercel (1 función `api/server.ts`, catch-all) | `https://app.vercel.app/api/*` |

```
Navegador → https://app.vercel.app/api/auth/login  (same-origin)
              │  rewrites: /api/(.*) → /api/server  (vercel.json)
              ▼  api/server.ts  →  server/app (Express)  →  Turso
```

```
proyecto/
├── api/server.ts          # 1 función: monta server/app
├── server/                # esta plantilla (04-ARQUITECTURA.md)
│   ├── app.cjs            # createApp() sin listen
│   ├── config/env.ts      # fail-fast
│   ├── db/ (client, migrate, migrations/)
│   ├── middleware/ (auth, plan, rateLimit)
│   └── modules/<dominio>/{repository,service,schemas,routes}
├── src/                   # frontend Vite; client con BASE_URL = '' (relativo)
└── vercel.json            # rewrites: /api/(.*) → /api/server, luego SPA
```

`api/server.ts` (concepto):

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../server/app';
export default (req: VercelRequest, res: VercelResponse) => app(req, res);
```

**`vercel.json`**

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/server" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Variables en Vercel** (Settings → Environment Variables, **sin** prefijo `VITE_` — nunca llegan al navegador):

- `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET` (Production)
- **No existe** `VITE_API_URL`; el frontend usa rutas relativas (`VITE_API_URL || ''` → `/api`).
- `NODE_ENV=production` lo fija Vercel.

**Cookie**: `SameSite=Lax; Secure; HttpOnly`. Al ser same-origin, no hay bloqueo de terceros ni sonda necesaria.
Región de la función cerca de Turso y de usuarios (Settings → Functions → Region, default `iad1`).

**Reglas**: boot idempotente cacheado por instancia; sin estado en memoria por usuario;
rate limiting con store persistente (Turso/Upstash).

**Comprobación**: `GET /api/health` → `{ "status": "ok", "mode": "turso" }`; login → `Set-Cookie: ...; SameSite=Lax; Secure`; `GET /api/auth/me` con cookie → 200.

---

## Patrón C — Vercel (frontend) + Render (backend) — legacy / long-running

**Cuándo**: necesitas websockets/SSE, jobs >300s, binarios nativos o logs >1h. Es el estado previo a la migración.

| Componente | Plataforma | Ejemplo |
|---|---|---|
| Frontend | Vercel | `https://app.vercel.app` |
| Backend | Render | `https://api.onrender.com` |

Dominios distintos → cookie de terceros (`SameSite=None; Secure`) + CORS allowlist. El navegador
puede bloquearla (Safari/Firefox por defecto).

**Backend (Render)**:

- `process.env.PORT`, `NODE_ENV=production`, `TURSO_*`, `JWT_SECRET`
- `CORS_ORIGIN=https://app.vercel.app` (allowlist, obligatoria)
- Cookie `SameSite=None; Secure` en `src/middleware/auth.ts`; `Cache-Control: no-store` en `/api`.
- `render.yaml`, `src/index.ts` con `app.listen`.
- Mantener la app como **factory** (`createApp()` sin `listen`) para poder alternar B↔C sin reescritura.

**Frontend (Vercel)**:

- `VITE_API_URL=https://api.onrender.com` (tipo **Config**, no Secret) — el cliente hace `fetch(${VITE_API_URL}/api/..., { credentials: 'include' })`.

**Sonda de bloqueo** (`GET /api/cookie-probe`, público): 1ª llamada setea `gf_probe`, 2ª revela si
el navegador la devolvió. Si `false`, hay bloqueo → avisar al usuario. No sirve `document.cookie`
(httpOnly + dominio distinto).

**Soluciones first-party** (si debes mantener Render pero evitar el bloqueo):

- **C1** mismo servicio; **C2** proxy `/api` del frontend; **C3** dominio compartido
  `app.tudominio.com` + `api.tudominio.com` con `COOKIE_DOMAIN=.tudominio.com`.

> El banner de consentimiento **no** desbloquea cookies de terceros — es requisito legal, no técnico.

---

## Cómo hereda la plantilla

`04-ARQUITECTURA.md` es el núcleo (capas, migraciones, errores, planes). El patrón solo cambia el "envoltorio":

- A: usa `supabase/schema.sql`, no esta plantilla de backend.
- B: `api/server.ts` + `vercel.json` + `SameSite=Lax`.
- C: `index.ts` + `render.yaml` + `CORS_ORIGIN` + `SameSite=None`.

Pendientes comunes (pago real, `PLANS` en DB, `admin`, tests, observabilidad, `organizations`) aplican a los tres.

---

## Health y cold start

- `GET /api/health` → `{ "status": "ok" }`. En Render, `healthCheckPath: /api/health`.
- Render Free se suspende (~50s cold start); Vercel fluid (~1s tras 2 semanas sin tráfico).

---

## Checklist

- [ ] Patrón elegido con el árbol de decisión
- [ ] **A**: RLS en Postgres + `supabase/schema.sql` como fuente única
- [ ] **B**: `vercel.json` con rewrite `/api` antes del SPA; **sin** `VITE_API_URL`; `TURSO_*`/`JWT_SECRET` en Vercel (server-side)
- [ ] **C**: `CORS_ORIGIN` + `SameSite=None` + `VITE_API_URL` (Config) + sonda probada en Safari/Firefox
- [ ] `GET /api/health` y login → `GET /api/auth/me` funcionan
- [ ] `ALLOW_REGISTRATION` según lanzamiento

---

## Referencias

- Arquitectura y decisiones: [04-ARQUITECTURA.md](04-ARQUITECTURA.md)
- Piezas de código: [05-PATRONES-CODIGO.md](05-PATRONES-CODIGO.md)
- Backend de referencia: `boilerplate-backend/`
