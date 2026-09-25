# boilerplate-frontend — Frontend SaaS de referencia

Frontend **Next.js (Pages Router) + TypeScript** con las piezas clave para consumir el
backend de referencia [`../boilerplate-backend/`](../boilerplate-backend/).

## Qué incluye

- Cliente HTTP centralizado (`src/lib/api.ts`) con `credentials: 'include'`, `ApiError`
  con `status`/`retryAfter`, y `onUnauthorized` global (auto-logout ante 401).
- Sesión por cookie `httpOnly` (`src/lib/auth.ts`): login, register, logout, `me`, sonda
  de cookies y detección de cookies bloqueadas.
- Hooks de datos (`src/lib/hooks/`): `useAuth` (sesión), `useData` (loading/error/data/refetch),
  `usePlan` (feature gating por plan) y `useAutoSave` (auto-guardado + auto-cálculo).
- Tipos de dominio (`src/types/`) y entorno validado (`src/config/env.ts`).

```
boilerplate-frontend/
├── AGENTS.md              # convenciones obligatorias para agentes/IA
├── README.md              # este archivo
├── package.json
├── tsconfig.json
├── .env.example
└── src/
    ├── config/env.ts
    ├── lib/
    │   ├── api.ts
    │   ├── auth.ts
    │   └── hooks/
    │       ├── useAuth.ts
    │       ├── useData.ts
    │       ├── usePlan.ts
    │       └── useAutoSave.ts
    └── types/
        ├── api.ts
        ├── plan.ts
        └── user.ts
```

## Cómo usarlo

1. Copia `src/` dentro de tu frontend Next.js (o reconstruye con [`../08-FRONTEND.md`](../08-FRONTEND.md)).
2. `cp .env.example .env.local` y completa `NEXT_PUBLIC_API_URL` (`''` para mismo origen, o la URL del backend).
3. Envuelve tu app con `useAuth` (en `_app.tsx`) para tener la sesión disponible.
4. Si tu app tiene planes, usa `usePlan` para el gating de UI (el backend valida con 403).
5. Si tu app edita estado y calcula en el servidor, usa `useAutoSave` para auto-guardado y auto-cálculo.
6. Crea hooks por recurso con `useData` (ver [`../06-CHECKLIST-MODULO.md`](../06-CHECKLIST-MODULO.md) para el patrón de módulos).

## Docs relacionados

- Guía de frontend: [`../08-FRONTEND.md`](../08-FRONTEND.md)
- Backend de referencia: [`../boilerplate-backend/`](../boilerplate-backend/)
- Despliegue (cookies, patrones B/C): [`../07-DEPLOY.md`](../07-DEPLOY.md)