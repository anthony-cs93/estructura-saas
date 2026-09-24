# Patrones de despliegue para nuevas apps

Guía para elegir cómo desplegar una app nueva. Extraído de `C:\Users\User\Documents\3. Negocios\5. Vibe-coding\docs-arquitectura-saas.md` Parte 3.

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

## Patrón B — Monorepo + catch-all serverless (Vercel)

**Cuándo**: hay lógica sensible (planes, cálculos, roles, admin) pero quieres 1 despliegue y 1 proveedor. Es el estado final propuesto para `gestion_financiera_negocio_saas` (ver `gestion_financiera.../docs/migracion-vercel-patron-b.md`).

```
proyecto/
├── api/server.ts          # 1 función: monta server/app
├── server/                # esta plantilla (docs/blueprint.md)
│   ├── app.cjs            # createApp() sin listen
│   ├── config/env.ts     # fail-fast
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

Reglas: boot idempotente cacheado por instancia; sin estado en memoria por usuario; cookie `SameSite=Lax` (same-origin); rate limiting con store persistente (Turso/Upstash); región fija cerca de Turso.

## Patrón C — Monorepo + Express long-running (Render)

**Cuándo**: websockets/SSE, jobs >300s, binarios nativos o control fino de logs/observabilidad. Estado actual de `cotizador-pro-backend` y `gestion_financiera` antes de la migración.

- `src/index.ts` con `app.listen`, `render.yaml`, `CORS_ORIGIN` + cookie `SameSite=None`.
- Mantener la app como **factory** (`createApp()` sin listen) para poder alternar B↔C sin reescritura.

## Árbol de decisión

```
¿Tiene reglas que no pueden vivir en el navegador/RLS?
├─ NO  → Patrón A (BaaS)
└─ SÍ
   ├─ ¿Procesos largos, websockets, binarios nativos?
   │  ├─ SÍ → Patrón C (Render)
   │  └─ NO → Patrón B (Vercel catch-all) — recomendado si quieres free tier + 1 despliegue
```

## Cómo hereda la plantilla

`docs/blueprint.md` es el núcleo (capas, migraciones, errores, planes). El patrón solo cambia el "envoltorio":

- A: usa `supabase/schema.sql`, no esta plantilla de backend.
- B: `api/server.ts` + `vercel.json` + `SameSite=Lax`.
- C: `index.ts` + `render.yaml` + `CORS_ORIGIN` + `SameSite=None`.

Pendientes comunes (pago real, `PLANS` en DB, `admin`, tests, observabilidad, `organizations`) aplican a los tres.

## Referencias

- Comparativo completo y límites Hobby 2026: `docs-arquitectura-saas.md`
- Plan ejecutable de migración B (ejemplo real): `gestion_financiera.../docs/migracion-vercel-patron-b.md`
