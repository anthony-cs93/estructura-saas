# AGENTS.md — Plantilla SaaS frontend

Convenciones obligatorias para agentes que trabajen sobre esta plantilla.

## Arquitectura

- Flujo: `componente → hook → lib/api.ts → backend`.
- **Nunca** llames a `fetch` fuera de `lib/api.ts`.
- La sesión vive en cookie `httpOnly`; **nunca** guardes el token en `localStorage`.

## Datos

- Usa `useData`/`useAuth` para estado de datos; evita `useEffect` + `fetch` dispersos.
- Respuestas del backend en camelCase; tipa con `types/`.

## Errores

- El backend responde `{ error, code? }`; `lib/api.ts` lanza `ApiError` (con `status` y `retryAfter`).
- Muestra `error.message` en la UI; no mensajes genéricos.
- Si `ApiError.retryAfter` está definido (429), muestra "intenta de nuevo en Xs".

## Auth y sesión

- `credentials: 'include'` en toda petición (lo hace `lib/api.ts`).
- `useAuth` carga el usuario con `GET /api/auth/me` al montar.
- `login`/`register` devuelven `string | null` (mensaje de error o `null`); la UI muestra el string tal cual.
- Maneja 401 de forma centralizada: `lib/api.ts` dispara `onUnauthorized` (registrado por `useAuth` → `setUser(null)`).

## Planes y gating

- Usa `usePlan` para decidir la UI (`checkFeature`, `checkLimit`, `PRECIOS_PLANES`).
- El gating del frontend es **solo UX**: el backend valida con `assertFeature`/`assertWithinLimit` y responde 403.
- No inventes features ni límites que no existan en `types/plan.ts`; alinealos con `../boilerplate-backend/src/middleware/plan.ts`.

## Auto-guardado y auto-cálculo

- Usa `useAutoSave` para estado editable con cálculo server-side (auto-save 5 min + debounce 200ms→1s).
- El backend decide la versión ganadora en conflictos; no sobreescribas datos más nuevos.

## Cookies cross-origin

- Frontend y backend en orígenes distintos → cookie de terceros (puede bloquearse).
- Usa `checkCookieProbe()` para detectar el bloqueo y avisar al usuario.
- Solución definitiva: cookie first-party (ver `../07-DEPLOY.md`).

## Seguridad

- `NEXT_PUBLIC_*` es público: no pongas secretos.
- **Nunca** confíes en el frontend para operaciones críticas; el backend valida y recalcula.

## Configuración

- `NEXT_PUBLIC_API_URL=''` (mismo origen) o la URL del backend (cross-origin).
- No commitees `.env.local`.