# 🎨 Frontend del SaaS — guía canónica

Guía para el frontend de una app SaaS que consume el backend de referencia
([`boilerplate-backend/`](boilerplate-backend/)). Stack: **Next.js (Pages Router) + TypeScript**.

El código de referencia vive en **`boilerplate-frontend/`** (piezas clave: cliente HTTP,
sesión, hooks de datos). Esta guía explica el diseño y las buenas prácticas.

---

## Flujo de una petición (lado frontend)

```
Componente / Página
  ▼
hook de datos (useData / useAuth)   (estado: loading / error / data)
  ▼
lib/api.ts                          (fetch con credentials: 'include')
  ▼
Backend (Express) → service → repository → Turso
```

---

## Estructura de carpetas recomendada

```
src/ (o raíz del proyecto Next.js)
├─ pages/                  # rutas (login, dashboard, ...)
│  ├─ login.tsx
│  ├─ dashboard.tsx
│  └─ _app.tsx             # provee el estado de sesión global
├─ components/             # UI reutilizable
├─ lib/
│  ├─ api.ts               # cliente HTTP (único lugar con fetch)
│  ├─ auth.ts              # login, register, logout, getMe, cookie-probe
│  └─ hooks/
│     ├─ useAuth.ts        # estado de sesión
│     ├─ useData.ts        # hook genérico de datos
│     ├─ usePlan.ts        # feature gating por plan
│     └─ useAutoSave.ts    # auto-guardado + auto-cálculo con debounce
├─ types/                  # tipos de dominio (User, Plan, ApiError, ...)
└─ config/env.ts           # entorno validado (fail-fast)
```

### Jerarquía de providers (patrón de app real)

```
<AuthProvider>              // useAuth: sesión, onUnauthorized
  <ThemeProvider>           // dark/light (opcional)
    <PlanProvider>          // usePlan: plan, límites, upgrade modal
      <App>                 // estado global de la app
```

`AuthProvider` envuelve todo: al montar valida la sesión con `GET /api/auth/me` y registra
`setOnUnauthorized` para auto-logout ante 401. `PlanProvider` carga el plan al montar y
expone `checkFeature`/`checkLimit` para el gating de UI.

---

## Convenciones

- **Nunca** guardes el token en `localStorage` ni en estado de JS: la sesión vive en una
  cookie `httpOnly` que el backend fija y borra. El frontend solo la envía con
  `credentials: 'include'`.
- **Un solo lugar** hace `fetch`: `lib/api.ts`. Los componentes y hooks nunca llaman a
  `fetch` directamente.
- **Errores**: el backend responde `{ error: string, code?: string }`. El cliente los
  convierte en `ApiError` y los hooks los exponen como `error`.
- **Respuestas** en camelCase (el backend ya las entrega así).
- **Validación**: el frontend valida para UX, pero **nunca** confíes en él para operaciones
  críticas; el backend valida y recalcula todo.
- **Datos autenticados**: el backend envía `Cache-Control: no-store`; no cachees en el
  cliente datos sensibles.

---

## Decisiones de diseño

### 1. Sesión por cookie `httpOnly` (sin token en el navegador)

El backend fija la cookie de sesión **host-only** (`httpOnly`, `secure` en producción,
`sameSite` desde `COOKIE_SAMESITE`, **sin `Domain`**). El frontend:

- Envía `credentials: 'include'` en cada `fetch`.
- Lee el usuario con `GET /api/auth/me` al cargar la app (`useAuth`).
- Si `me` responde 401 → sesión inválida → redirige a `/login`.

### 2. Cookies de terceros: solo en C2

Solo hay bloqueo cuando el frontend llama **directo** a otro origen (variante **C2**). Ahí la
sonda `GET /api/cookie-probe` (pública) lo detecta:

- 1ª llamada: el backend setea `gf_probe`.
- 2ª llamada: si el navegador la devolvió → `cookieReceived: true`; si no, hay bloqueo.

Con **C1** (proxy same-origin) o **C3** (dominio compartido) la cookie es first-party: no hay
bloqueo posible, la sonda siempre da `true` y sobra. Si el login funciona en Chrome y falla
en Safari o Firefox, no es un problema de sonda ni de mensaje de aviso: estás cruzando de
origen. La solución es un proxy, no un `alert` — ver [07-DEPLOY.md](07-DEPLOY.md).

> Un mensaje de "cookies de terceros bloqueadas" en una app que ya es first-party es
> información falsa en pantalla y contradice la política de privacidad del producto.

### 3. Cliente HTTP centralizado

`lib/api.ts` envuelve `fetch` con:

- `credentials: 'include'` siempre.
- `Content-Type: application/json`.
- Manejo de errores: respuestas no-OK → `ApiError` con el mensaje del backend.
- **401 centralizado**: si una petición responde 401 (excepto login/register), dispara el
  callback global `onUnauthorized` (registrado por `useAuth` → auto-logout).
- **Rate limiting**: `ApiError` lleva `retryAfter` (del body `{ retryAfter }` o del header
  `Retry-After`); la UI puede mostrar "intenta de nuevo en Xs".
- **Timeout**: `AbortController` con `NEXT_PUBLIC_API_TIMEOUT_MS` (15 s por default). Sin él
  una request colgada deja el spinner girando indefinidamente — el peor síntoma posible,
  porque parece que la app está viva.
- **Errores de red saneados**: `fetch failed`, un 502 que devuelve HTML de un proxy, o un
  cold start de Render sin respuesta se traducen a un mensaje útil ("No se pudo conectar
  con el servidor"). Nunca renderices HTML crudo ni el mensaje crudo del error de red.
- Métodos tipados: `get`, `post`, `put`, `patch`, `delete`.

### 4. Hooks de datos (patrón loading / error / data)

Cada recurso expone un hook que encapsula estado, carga y refetch:

- `useData<T>(fetcher, deps)` → `{ data, loading, error, refetch }`.
- `useAuth()` → `{ user, loading, login, register, logout, refresh }`.
  - `login`/`register` devuelven `string | null`: `null` = éxito, `string` = mensaje de
    error (incluido el de cookies bloqueadas). La UI muestra el string tal cual.
  - Tras login/register se llama a `getMe()` de nuevo: si falla, la cookie no se guardó
    (bloqueo de cookies) y se devuelve un mensaje claro.
- `usePlan()` → `{ planInfo, checkFeature, checkLimit, subscribe, refreshPlan, ... }`.
- `useAutoSave()` → `{ isSaving, isCalculating, lastSavedAt, saveNow }`.

### 5. Feature gating por plan (usePlan)

El backend de referencia define planes `free / negocio / empresa` con features y límites
(`src/middleware/plan.ts`). El frontend los replica en `types/plan.ts` para decidir la UI:

- `checkFeature('csv')` → ¿el plan incluye la feature?
- `checkLimit('projectsPerMonth', actual)` → ¿puede crear otro?
- `PRECIOS_PLANES` → tabla de precios para la página de planes.
- `showUpgradeModal` / `upgradeReason` → modal de upgrade cuando se bloquea una acción.

> ⚠️ El gating del frontend es **solo UX**: el backend valida con `assertFeature` /
> `assertWithinLimit` y responde 403 si el plan no lo permite. Nunca confíes en el gating
> del cliente para proteger lógica.

### 6. Auto-guardado + auto-cálculo (useAutoSave)

Patrón de apps con estado editable y cálculo server-side (verificado en producción):

- **Auto-guardado**: cada 5 min (`setInterval`) llama a `save`; el feedback visual dura
  mínimo 1s para no parpadear. Botón manual `saveNow()`.
- **Auto-cálculo**: ante cualquier cambio en los datos, debounce de 200ms + espera de 1s
  antes de llamar al endpoint de cálculo (evita spam al backend mientras el usuario teclea).

### 7. UI optimista + recálculo en servidor

Para cálculos protegidos (precios, totales):

1. El frontend muestra un resultado "optimista" para UX rápida.
2. El backend **recalcula desde la base de datos** y devuelve el valor real.
3. El frontend reemplaza el valor optimista con el del servidor.

---

## Integración con el backend de referencia

### Configuración

| Variable | Valor | Cuándo |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `''` (rutas relativas `/api`) | Patrón B, y **C1** (proxy same-origin vía Vercel → Render) |
| `NEXT_PUBLIC_API_URL` | `https://TU-BACKEND.onrender.com` | **C2** y **C3** (llamada directa cross-origin) |

> Es pública y se hornea en el bundle: **no puede ser Secret** en Vercel, y cambiarla exige
> un **redeploy completo**. No la definas a mano si usás C1; lo normal es dejarla vacía.

### Endpoints que consume el frontend

**Del backend de referencia** (`boilerplate-backend/`):

| Endpoint | Método | Uso |
|---|---|---|
| `/api/auth/register` | POST | Crear cuenta (devuelve usuario + fija cookie) |
| `/api/auth/login` | POST | Iniciar sesión (fija cookie) |
| `/api/auth/me` | GET | Obtener usuario actual (requiere sesión) |
| `/api/auth/logout` | POST | Cerrar sesión (borra cookie) |
| `/api/plan` | GET | Plan actual del usuario |
| `/api/plan/features` | GET | Features habilitadas del plan |
| `/api/plan/mock-subscribe` | POST | Probar suscripción sin pasarela de pago |
| `/api/projects` | GET/POST | Listar / guardar proyectos |
| `/api/projects/:id` | GET/PUT/DELETE | Obtener / actualizar / eliminar proyecto |
| `/api/account/data` | GET | Exportar datos del usuario |
| `/api/account` | DELETE | Borrar cuenta (requiere contraseña) |
| `/api/cookie-probe` | GET | Detectar bloqueo de cookies de terceros |

**Extensiones típicas de una app real** (patrón de `cotizador-pro-frontend`):

| Endpoint | Método | Uso |
|---|---|---|
| `/api/profile` | GET/PUT | Perfil (empresa, precios, atajos) |
| `/api/calculate` | POST | Cálculo server-side (precios, totales) |
| `/api/plan/pdf-increment` | POST | Contador server-side con límite por plan |
| `/api/admin/users` | GET/POST | Gestión de usuarios (admin) |
| `/api/notifications` | GET | Notificaciones del usuario |

### Errores

Todos los errores llegan como `{ error: string, code?: string }`. El cliente los expone
como `ApiError` (con `status` y `retryAfter` opcional); los hooks los dejan en `error`
para mostrarlos en la UI.

---

## Almacenamiento local (convenciones)

| Dato | Dónde | Por qué |
|---|---|---|
| Sesión (`access_token`) | Cookie `httpOnly` | No accesible desde JS (anti-XSS) |
| Preferencia de tema | `localStorage` | Persistente, no sensible |
| Cache de listas | `sessionStorage` | Volátil, por pestaña |
| Token / datos sensibles | **Nunca** en `localStorage` | XSS lo leería |

## Archivos clave por prioridad

1. `lib/api.ts` — cliente HTTP (único lugar con `fetch`, 401, retryAfter)
2. `lib/auth.ts` + `hooks/useAuth.ts` — sesión y cookies
3. `hooks/usePlan.ts` + `types/plan.ts` — feature gating
4. `hooks/useData.ts` — datos de recursos
5. `hooks/useAutoSave.ts` — auto-guardado y auto-cálculo
6. `types/` — modelos de dominio
7. `config/env.ts` — entorno validado

## Seguridad (lecciones de una auditoría real)

- **Roles en el backend**: el frontend oculta el panel admin por `role`, pero el backend
  debe validar con `requireRole('admin')`. Nunca confíes en el `role` del cliente.
- **No token en `localStorage`**: la sesión vive en cookie `httpOnly`. Si el backend
  devuelve un token, no lo persistas en JS.
- **Rate limiting**: el backend limita login y endpoints; el frontend muestra
  `retryAfter` cuando llega 429.
- **CSP**: define una Content Security Policy (evita XSS por inyección).
- **Validación de entorno**: `config/env.ts` valida `NEXT_PUBLIC_*` al arrancar
  (fail-fast) y distingue lo público de lo privado.
- **Auto-save sin conflictos**: el backend decide la versión ganadora; el frontend no
  sobreescribe silenciosamente datos más nuevos.

## Buenas prácticas

- **Nunca** confíes en el frontend para operaciones críticas: valida siempre en el servidor.
- **No** guardes secretos en el frontend: `NEXT_PUBLIC_*` es público por definición.
- **Maneja 401** de forma centralizada (`onUnauthorized`) en el cliente HTTP.
- **Muestra errores** del backend tal cual (`error.message`), no mensajes genéricos.
- **Usa hooks** para datos: evita `useEffect` + `fetch` dispersos en cada componente.
- **Tipa todo** con los tipos compartidos de `types/`.
- **Gating de plan solo para UX**: el backend responde 403 si el plan no permite la acción.

---

## Referencias

- Código de referencia: [`boilerplate-frontend/`](boilerplate-frontend/)
- Backend de referencia: [`boilerplate-backend/`](boilerplate-backend/)
- Arquitectura del backend: [04-ARQUITECTURA.md](04-ARQUITECTURA.md)
- Piezas de código del backend: [05-PATRONES-CODIGO.md](05-PATRONES-CODIGO.md)
- Despliegue (cookies, patrones B/C): [07-DEPLOY.md](07-DEPLOY.md)