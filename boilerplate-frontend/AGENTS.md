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
- **Nunca** muestres HTML crudo ni el mensaje crudo de un error de red: un 502 de un proxy
  llega como HTML y se renderiza como texto en la UI.

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

- La sesión vive en cookie `httpOnly` host-only. **Nunca** definas `COOKIE_DOMAIN`: la
  cookie se comparte con todos los subdominios (incluidos previews y staging) y un XSS ahí
  robe la sesión de producción.
- `checkCookieProbe()` detecta el bloqueo de cookies de terceros. **Solo es necesario en la
  variante C2** (frontend llamando directo a otro origen). En la variante **C1** (proxy
  same-origin) y en C3 (dominio compartido) la cookie nunca es de terceros: la sonda siempre
  da `true` y no aporta nada. Preferí C1 y no la uses.
- Si el login funciona en Chrome y falla en Safari o Firefox, casi siempre es que cruzás de
  origen con `SameSite=None`. La solución no es un mensaje de error: es un proxy (C1).
- Si igual mostrás un mensaje de bloqueo, que no diga "cookies de terceros" si la app ya es
  first-party: contradice la política de privacidad del producto y es información falsa en
  pantalla.

## Cliente HTTP

- `lib/api.ts` pone un timeout (`NEXT_PUBLIC_API_TIMEOUT_MS`, 15 s por default). Sin él, una
  request colgada deja la UI esperando indefinidamente: el spinner no termina nunca.
- Los errores de red se traducen a un mensaje útil. `fetch failed`, un 502 con HTML de un
  proxy o un cold start que no responde no le sirven a nadie: mostrálos como "No se pudo
  conectar con el servidor", no crudo.

## Configuración

- `NEXT_PUBLIC_API_URL=''` (mismo origen — Patrón B y C1) o la URL del backend (C2/C3).
- `NEXT_PUBLIC_*` es público: no pongas secretos. Y no puede ser Secret en Vercel.
- Cambiar la URL de la API es un **redeploy completo**: se hornea en el bundle en build time.
- No commitees `.env.local`.
- Node pineado en `.nvmrc` y `engines`: la versión implícita de la plataforma puede cambiar
  sin aviso.