# Despliegue — detalle técnico de `patrones-deploy.md`

Complemento de `patrones-deploy.md` (árbol de decisión). Si aún no elegiste patrón, empieza allí. Este doc detalla **cómo** desplegar cada patrón.

## Patrón B — Todo en Vercel (recomendado, same-origin)

Frontend y backend en el **mismo proyecto de Vercel**. El navegador nunca sale del origen del frontend, así que no hay CORS ni cookies de terceros.

| Componente | Dónde | Qué |
|---|---|---|
| Frontend SPA | Vercel (estático, `dist/`) | `https://app.vercel.app` |
| Backend API | Vercel (1 función `api/server.ts`, catch-all) | `https://app.vercel.app/api/*` |

```
Navegador → https://app.vercel.app/api/auth/login  (same-origin)
              │  rewrites: /api/(.*) → /api/server  (vercel.json)
              ▼  api/server.ts  →  server/app (Express)  →  Turso
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

`api/server.ts` monta `server/app` (factory sin `listen`) — ver `gestion_financiera.../docs/migracion-vercel-patron-b.md` Fase 2.

**Variables en Vercel** (Settings → Environment Variables, **sin** prefijo `VITE_` — nunca llegan al navegador):

- `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET` (Production)
- **No existe** `VITE_API_URL`; el frontend usa rutas relativas (`src/services/api.ts` → `VITE_API_URL || ''` → `/api`).
- `NODE_ENV=production` lo fija Vercel.

**Cookie**: `SameSite=Lax; Secure; HttpOnly` (`server/lib/auth.ts`). Al ser same-origin, no hay bloqueo de terceros ni sonda necesaria. Región de la función cerca de Turso y de usuarios (Settings → Functions → Region, default `iad1`).

**Comprobación**: `GET /api/health` → `{ "status": "ok", "mode": "turso" }`; login → `Set-Cookie: ...; SameSite=Lax; Secure`; `GET /api/auth/me` con cookie → 200.

## Patrón C — Vercel (frontend) + Render (backend) — legacy / long-running

Usar solo si necesitas websockets/SSE, jobs >300s, binarios nativos o logs >1h. Es el estado previo a la migración.

| Componente | Plataforma | Ejemplo |
|---|---|---|
| Frontend | Vercel | `https://app.vercel.app` |
| Backend | Render | `https://api.onrender.com` |

Dominios distintos → cookie de terceros (`SameSite=None; Secure`) + CORS allowlist. El navegador puede bloquearla (Safari/Firefox por defecto).

**Backend (Render)**:

- `process.env.PORT`, `NODE_ENV=production`, `TURSO_*`, `JWT_SECRET`
- `CORS_ORIGIN=https://app.vercel.app` (allowlist, obligatoria)
- Cookie `SameSite=None; Secure` en `src/middleware/auth.ts`; `Cache-Control: no-store` en `/api`.

**Frontend (Vercel)**:

- `VITE_API_URL=https://api.onrender.com` (tipo **Config**, no Secret) — el cliente hace `fetch(${VITE_API_URL}/api/..., { credentials: 'include' })`.

**Sonda de bloqueo** (`GET /api/cookie-probe`, público): 1ª llamada setea `gf_probe`, 2ª revela si el navegador la devolvió. Si `false`, hay bloqueo → avisar al usuario. No sirve `document.cookie` (httpOnly + dominio distinto).

**Soluciones first-party** (si debes mantener Render pero evitar bloqueo):

- **C1** mismo servicio; **C2** proxy `/api` del frontend; **C3** dominio compartido `app.tudominio.com` + `api.tudominio.com` con `COOKIE_DOMAIN=.tudominio.com`. Detalle previo en `git log` de este doc.

> El banner de consentimiento **no** desbloquea cookies de terceros — es requisito legal, no técnico.

## Patrón A — BaaS (Supabase)

Sin backend propio. No aplica este doc; ver `patrones-deploy.md` Patrón A y `supabase/schema.sql` (RLS).

## Health y cold start

- `GET /api/health` → `{ "status": "ok" }`. En Render, `healthCheckPath: /api/health`.
- Render Free se suspende (~50s cold start); Vercel fluid (~1s tras 2 semanas sin tráfico).

## Checklist

- [ ] Patrón elegido con `patrones-deploy.md`
- [ ] B: `vercel.json` con rewrite `/api` antes del SPA; **sin** `VITE_API_URL`; `TURSO_*`/`JWT_SECRET` en Vercel (server-side)
- [ ] C: `CORS_ORIGIN` + `SameSite=None` + `VITE_API_URL` (Config) + sonda probada en Safari/Firefox
- [ ] `GET /api/health` y login → `GET /api/auth/me` funcionan
- [ ] `ALLOW_REGISTRATION` según lanzamiento
