# boilerplate-backend — Backend SaaS de referencia

Backend **Express 5 + TypeScript + Turso** con arquitectura en capas, listo para copiar y adaptar.
Es la base canónica de las arquitecturas **Full-Stack Monorepo**, **Backend Separado** y **Serverless**
de esta guía.

Orígenes de los patrones:

- `gestion_financiera_negocio_saas` — capas `service/repository`, esquema centralizado, paridad local/serverless.
- `cotizador-pro-backend` — planes/cuotas, feature gating, auditoría, rate limiting, gestión de cuenta, migraciones con reintentos.

> Documentación unificada de la guía: [`../README.md`](../README.md), [`../04-ARQUITECTURA.md`](../04-ARQUITECTURA.md),
> [`../05-PATRONES-CODIGO.md`](../05-PATRONES-CODIGO.md), [`../06-CHECKLIST-MODULO.md`](../06-CHECKLIST-MODULO.md),
> [`../07-DEPLOY.md`](../07-DEPLOY.md).

## Qué incluye

- Capas `service` / `repository` por módulo (`src/modules/<dominio>/`).
- Migraciones versionadas con reintentos (`src/db/migrations/`).
- Auth por cookie `httpOnly` (`jose`) + verificación de cuenta activa.
- Planes, cuotas y feature gating (`free` / `negocio` / `empresa`).
- Rate limiting, auditoría y gestión de cuenta (export/borrado).
- `AGENTS.md` con convenciones obligatorias para agentes/IA.

```
boilerplate-backend/
├── AGENTS.md              # convenciones obligatorias para agentes/IA
├── README.md              # este archivo
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── config/env.ts
│   ├── db/ (client, migrate, migrations/)
│   ├── lib/ (errors, http, validation, audit)
│   ├── middleware/ (auth, requireRole, plan, rateLimit, errorHandler)
│   ├── modules/<dominio>/{repository,service,schemas,routes}
│   ├── routes.ts
│   └── index.ts
└── docs/                  # docs originales del backend
    ├── blueprint.md
    ├── architecture.md
    ├── deploy.md
    ├── patrones-deploy.md
    └── checklist-modulo.md
```

## Cómo arrancar una app nueva

1. Elige el patrón de despliegue en [`../07-DEPLOY.md`](../07-DEPLOY.md).
2. Si es **BaaS** (Supabase + RLS): no uses este backend.
3. Si es **Vercel catch-all** o **Render**: copia `src/` como esqueleto (o reconstruye con [`../05-PATRONES-CODIGO.md`](../05-PATRONES-CODIGO.md)).
4. `cp .env.example .env` y completa `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET`, `CORS_ORIGIN`.
5. `npm install` → `npm run migrate` → `npm run dev`.
6. Renombra/elimina el módulo `projects` y crea los módulos de tu dominio con [`../06-CHECKLIST-MODULO.md`](../06-CHECKLIST-MODULO.md).

## Árbol de decisión (resumen)

```
¿Tiene reglas que no pueden vivir en el navegador/RLS?
├─ NO  → Patrón A (BaaS): Supabase Auth + Postgres RLS + Storage. Solo Vercel.
└─ SÍ
   ├─ ¿WebSockets/jobs >300s/binarios nativos?
   │  ├─ SÍ → Patrón C (Render long-running)
   │  └─ NO → Patrón B (Vercel catch-all, 1 función) — recomendado
```

## Stack de referencia

Node + TypeScript (`strict`) · Express 5 · Turso (`@libsql/client`) · Zod · `jose` (JWT cookie `httpOnly`) · `express-rate-limit`

## Docs relacionados

- Arquitectura y decisiones de diseño: [`../04-ARQUITECTURA.md`](../04-ARQUITECTURA.md)
- Fragmentos de código copiables: [`../05-PATRONES-CODIGO.md`](../05-PATRONES-CODIGO.md)
- Patrones de despliegue: [`../07-DEPLOY.md`](../07-DEPLOY.md)
