# ðŸš€ Despliegue â€” patrones y detalle tÃ©cnico

GuÃ­a para elegir **cÃ³mo** desplegar y luego ejecutar cada patrÃ³n. El nÃºcleo (capas, migraciones,
errores, planes) es el mismo en todos: el patrÃ³n solo cambia el "envoltorio".

Ver tambiÃ©n **[04-ARQUITECTURA.md](04-ARQUITECTURA.md)** y **[05-PATRONES-CODIGO.md](05-PATRONES-CODIGO.md)**.

---

## Ãrbol de decisiÃ³n

```
Â¿Tiene reglas que no pueden vivir en el navegador/RLS?
â”œâ”€ NO  â†’ PatrÃ³n A (BaaS)
â””â”€ SÃ
   â”œâ”€ Â¿Procesos largos, websockets, binarios nativos?
   â”‚  â”œâ”€ SÃ â†’ PatrÃ³n C. Antes de elegir variante, leÃ© las tres:
   â”‚  â”‚        C1 (proxy same-origin) âœ… Â· C2 (directo cross-site, legacy) Â· C3 (dominio propio)
   â”‚  â””â”€ NO â†’ PatrÃ³n B (Vercel catch-all) â€” 1 despliegue, 1 proveedor
```

> **ElegÃ­ C1 siempre que puedas.** Durante mucho tiempo se creyÃ³ que separar los hosts
> obligaba a `SameSite=None` y a bloquearse cookies en Safari. No es asÃ­: C1 mantiene todo
> same-origin, la cookie es first-party y **no necesitÃ¡s pagar un dominio**.


---

## PatrÃ³n A â€” BaaS (Supabase + RLS) â€” "solo Vercel sin backend"

**CuÃ¡ndo**: CRUD por usuario, sin secretos ni reglas sensibles en servidor, necesitas auth y archivos ya.

- Stack: SPA + `@supabase/supabase-js`.
- Seguridad en **RLS de Postgres**, no en cÃ³digo:

  ```sql
  alter table <tabla> enable row level security;
  create policy "<tabla>_select_own" on <tabla>
    for select using (auth.uid() = user_id);
  -- insert/update/delete con using/check
  ```

  `supabase/schema.sql` es la fuente Ãºnica del esquema + polÃ­ticas.
- Auth/storage gestionados (`signInWithPassword`, `storage.from('bucket')`).
- LÃ­mite: la anon key es pÃºblica; todo secreto (pagos, cÃ¡lculos propietarios, admin cross-tenant) exige B o C.

GuÃ­a: `templates/03-baas-supabase/`.

---

## PatrÃ³n B â€” Monorepo + catch-all serverless (Vercel) â€” recomendado

**CuÃ¡ndo**: hay lÃ³gica sensible (planes, cÃ¡lculos, roles, admin) pero quieres 1 despliegue y 1 proveedor.
Es el estado final propuesto para `gestion_financiera_negocio_saas`.

Frontend y backend en el **mismo proyecto de Vercel**. El navegador nunca sale del origen del
frontend, asÃ­ que no hay CORS ni cookies de terceros.

| Componente | DÃ³nde | QuÃ© |
|---|---|---|
| Frontend SPA | Vercel (estÃ¡tico, `dist/`) | `https://app.vercel.app` |
| Backend API | Vercel (1 funciÃ³n `api/server.ts`, catch-all) | `https://app.vercel.app/api/*` |

```
Navegador â†’ https://app.vercel.app/api/auth/login  (same-origin)
              â”‚  rewrites: /api/(.*) â†’ /api/server  (vercel.json)
              â–¼  api/server.ts  â†’  server/app (Express)  â†’  Turso
```

```
proyecto/
â”œâ”€â”€ api/server.ts          # 1 funciÃ³n: monta server/app
â”œâ”€â”€ server/                # esta plantilla (04-ARQUITECTURA.md)
â”‚   â”œâ”€â”€ app.cjs            # createApp() sin listen
â”‚   â”œâ”€â”€ config/env.ts      # fail-fast
â”‚   â”œâ”€â”€ db/ (client, migrate, migrations/)
â”‚   â”œâ”€â”€ middleware/ (auth, plan, rateLimit)
â”‚   â””â”€â”€ modules/<dominio>/{repository,service,schemas,routes}
â”œâ”€â”€ src/                   # frontend Vite; client con BASE_URL = '' (relativo)
â””â”€â”€ vercel.json            # rewrites: /api/(.*) â†’ /api/server, luego SPA
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

**Variables en Vercel** (Settings â†’ Environment Variables, **sin** prefijo `NEXT_PUBLIC_` â€” nunca llegan al navegador):

- `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET` (Production)
- **No existe** `NEXT_PUBLIC_API_URL`; el frontend usa rutas relativas (`env.apiUrl ?? ''` â†’ `/api`).
- `NODE_ENV=production` lo fija Vercel.

**Cookie**: `SameSite=Lax; Secure; HttpOnly`, host-only. Al ser same-origin no hay bloqueo de
terceros, y tampoco hace falta sonda de cookies.
RegiÃ³n de la funciÃ³n cerca de Turso y de usuarios (Settings â†’ Functions â†’ Region, default `iad1`).

**`TRUST_PROXY=1`**: en Vercel hay un solo salto delante de la funciÃ³n. Ver "La IP real detrÃ¡s
de un proxy".

**Reglas**: boot idempotente cacheado por instancia; sin estado en memoria por usuario;
rate limiting con store persistente (Turso/Upstash). âš ï¸ El rate limiting en memoria
**no sirve en serverless**: cada instancia tiene el suyo y se pierde en cada cold start.

**ComprobaciÃ³n**: `GET /api/health` â†’ `{ "status": "ok", "mode": "turso" }`; login â†’
`Set-Cookie: ...; SameSite=Lax; Secure` (sin atributo `Domain`); `GET /api/auth/me` con cookie â†’ 200.

---

## PatrÃ³n C â€” Vercel (frontend) + Render (backend) â€” procesos largos

**CuÃ¡ndo**: necesitas websockets/SSE, jobs >300s, binarios nativos o logs >1h, y no podÃ©s
meterlo en una serverless function.

AquÃ­ hay **tres variantes**. No son equivalentes: eligen si tu cookie de sesiÃ³n es
*first-party* o *third-party*, y eso decide si la app funciona en Safari y Firefox. ElegÃ­
**C1** salvo que tengas una razÃ³n concreta para no hacerlo.

| Variante | CÃ³mo llega el navegador a la API | Cookie | CORS | Â¿Dominio propio? |
|---|---|---|---|---|
| **C1 â€” proxy same-origin** âœ… | `app.vercel.app/api/*` â†’ Vercel reescribe â†’ Render | first-party, host-only, `SameSite=Lax` | **no existe** | **no hace falta** |
| **C2 â€” directo cross-site** (legacy) | `app.vercel.app` â†’ `api.onrender.com` | third-party, `SameSite=None` | allowlist a sincronizar | no |
| **C3 â€” dominio compartido** | `www.tudominio.com` â†’ `api.tudominio.com` | first-party, host-only, `Lax` | allowlist | sÃ­ |

> **C1 es la recomendada y es lo que usa el caso real de la guÃ­a.** Antes de adoptarla se
> tenÃ­a la falsa idea de que separar los hosts obligaba a `SameSite=None`. No es asÃ­: si
> el navegador nunca habla con `onrender.com`, la cookie nunca es de terceros, y sin pagar
> un dominio. El salto Vercel â†’ Render es *servidor a servidor*, invisible para el navegador.

> âš ï¸ **C2 no la uses con login.** `SameSite=None` es un permiso explÃ­cito de cruce de
> origen y el ecosistema lo estÃ¡ retirando: Safari (ITP) y Firefox (Total Cookie
> Protection) bloquean cookies de terceros por defecto **sin excepciÃ³n para `None`**, los
> anti-tracking (uBlock, Brave, Privacy Badger) las bloquean igual, y Chrome migra a
> Privacy Sandbox. El sÃ­ntoma es un fallo intermitente que sÃ³lo ve un porcentaje de los
> usuarios, dependents del navegador y de si tienen un bloqueador. Es el peor modo de
> falla posible.

### C1 â€” proxy same-origin (recomendada)

El frontend en Vercel reescribe `/api/*` hacia Render. El navegador ve **un solo host**.

**`vercel.json`**

```jsonc
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",

  // âš ï¸ EL ORDEN IMPORTA: gana la primera rewrite que coincide.
  // `/api/(.*)` DEBE ir antes del catch-all del SPA; si no, cada llamada a la API
  // devuelve el index.html del SPA con HTTP 200 y el error es un parseo de JSON
  // crÃ­ptico, no un 404.
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://TU-BACKEND.onrender.com/api/:path" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],

  "headers": [
    {
      // Sin esto, un 404 de la API se sirve con 200 + HTML y el cliente lo
      // reporta como "JSON invÃ¡lido".
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store" },
        { "key": "CDN-Cache-Control", "value": "no-store" },
        { "key": "x-vercel-enable-rewrite-caching", "value": "0" }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    },
    {
      // Los assets de Vite llevan hash en el nombre: se cachean para siempre.
      // Sin esto, Vercel los sirve con max-age=0 y se revalidan en cada carga.
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
```

**El cachÃ© del CDN es la trampa de esta variante.** Desde el 6 de abril de 2026, Vercel
cachea por defecto las respuestas de *external rewrites*, honrando el `Cache-Control` del
origen. Si la respuesta llega cacheable, el CDN la guarda **en el edge, sin asociarla a
ninguna cookie**, y la sirve a cualquier otro usuario que pase por ese edge. Fuga de datos
entre dos personas. Es un modo de falla **silencioso**: no hay error, hay datos ajenos.

Son **dos capas y ambas hacen falta**:

```ts
// 1. En el backend (boilerplate ya lo hace en src/index.ts): cacheo explÃ­cito de "nada"
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// 2. En vercel.json, arriba: el seguro. Si el backend un dÃ­a manda un Cache-Control
// equivocado, Vercel deja de cachear. No la omitas.
```

> ðŸ’¡ **Regla general**: nunca pongas `CDN-Cache-Control: max-age=N` en un proxy de API con
> sesiÃ³n. La cachÃ© y las sesiones son incompatibles salvo que la clave de cachÃ© incluya al
> usuario, y Vercel no ofrece eso para *external rewrites*.

**Backend (Render)**: igual que C3, pero con `COOKIE_SAMESITE=lax` y `CORS_ORIGIN` puede
quedarse en localhost porque el navegador nunca hace un cruce de origen. Cada preview y cada
staging desaparecen de la allowlist.

**Frontend (Vercel)**: `NEXT_PUBLIC_API_URL=` **vacÃ­o** â†’ las rutas quedan relativas
(`/api/...`). Es lo mismo que en el PatrÃ³n B.

> ðŸ”´ **DÃ³nde va el rewrite depende del framework, y es un error fÃ¡cil de cometer.**
> El `vercel.json` de arriba es para un frontend **Vite** (`outputDirectory: "dist"`).
> Si tu frontend es **Next.js** (como `boilerplate-frontend`), Vercel ya gestiona las rutas y
> el rewrite **no va en `vercel.json`**: va en `next.config.js`, y con `beforeFiles` para que
> gane sobre las Pages API routes:
>
> ```js
> // next.config.js
> module.exports = {
>   async rewrites() {
>     return {
>       beforeFiles: [
>         { source: '/api/:path*', destination: 'https://TU-BACKEND.onrender.com/api/:path*' },
>       ],
>     };
>   },
> };
> ```
>
> Sin `beforeFiles`, Next.js resuelve primero el filesystem y tu llamada a la API recibe un
> 404 o el HTML de una pÃ¡gina, no la respuesta del backend. `boilerplate-frontend/vercel.json`
> trae solo los headers de seguridad, que sÃ­ aplican a cualquier framework.


**Costo**: un salto extra de latencia, y los cold starts de Render se notan mÃ¡s (el tier
free duerme a los 15 min y tarda ~1 min). El usuario ve la demora amplificada y puede asumir
que la app estÃ¡ caÃ­da. Ver "LÃ­mites del free tier".

### C2 â€” directo cross-site (legacy)

El frontend llama directo a `https://api.onrender.com`. Funciona, con las dos Penalidades
documentadas arriba.

- `COOKIE_SAMESITE=none` (implica `Secure`: **solo** con HTTPS, nunca en `http://localhost`).
- `CORS_ORIGIN` = allowlist, **obligatoria**, y es deuda operativa: cada dominio nuevo
  (staging, preview, el `localhost` de un compaÃ±ero) es una entrada mÃ¡s que alguien tiene
  que agregar. AcÃ¡ conviene pasarse a C1.
- El `GET /api/cookie-probe` (pÃºblico) existe **para esta variante**: la 1Âª llamada setea
  `gf_probe`, la 2Âª revela si el navegador la devolviÃ³. Si responde `{"cookieReceived":false}`,
  hay bloqueo y la sesiÃ³n no persistirÃ¡. En C1 y C3 la sonda es innecesaria: la cookie nunca
  se bloquea porque nunca es de terceros. `document.cookie` no sirve para detectarlo
  (`httpOnly` + dominio distinto).

> El banner de consentimiento **no** desbloquea cookies de terceros â€” es requisito legal,
> no tÃ©cnico.

### C3 â€” dominio compartido

Frontend y API en el **mismo dominio registrable**, en subdominios distintos. Es *same-site*,
asÃ­ que la cookie es first-party sin tocar nada mÃ¡s.

- DNS: `@` A â†’ IP de Vercel Â· `www` CNAME â†’ Vercel Â· `api` CNAME â†’ Render.
- `COOKIE_SAMESITE=lax`.
- Elegila solo si el backend necesita **nombre pÃºblico propio**: webhooks de terceros,
  callbacks OAuth que no puedas mover, integraciones directas.

**Costo**: `CORS_ORIGIN` sigue siendo una allowlist, dos plataformas con certificados TLS que
rotar, y dos superficies de ataque. El costo real es el mantenimiento del DNS: un typo en
el dominio produce `NXDOMAIN` y parece una caÃ­da. **VerificÃ¡ el spelling antes de cualquier
consulta DNS** (ya pasÃ³: una falsa alarma de "dominio caÃ­do").

> ðŸ”´ **`COOKIE_DOMAIN` no existe, y es a propÃ³sito.** La cookie debe ser **host-only**, sin
> atributo `Domain`. Si se define `COOKIE_DOMAIN=.tudominio.com`, la cookie se comparte con
> **todos** los subdominios, incluidos los previews de Vercel y el staging: un XSS en
> cualquiera de ellos obtiene la sesiÃ³n de producciÃ³n. El atributo `domain` solo estÃ¡ pensado
> para cuando varios subdominios legÃ­timos necesitan compartir sesiÃ³n, y una SPA mÃ¡s su API
> no la necesitan. Esta plantilla no expone la variable a propÃ³sito.

### Reglas comunes a las tres variantes

- **Mantener la app como factory** (`createApp()` sin `listen`) para poder alternar entre
  variantes sin reescribir nada.
- `TRUST_PROXY` correcto por variante. Ver "La IP real detrÃ¡s de un proxy".
- Los previews de Vercel viven siempre en `*.vercel.app`, nunca en tu dominio: la sesiÃ³n de
  producciÃ³n no cruza (el navegador tiene un cookie jar por host). En C1 **todos** los
  ambientes son hosts distintos, lo que vuelve el phenomenon visible. Mitigaciones: un alias
  de rama fijo para tener un host de staging estable, y Vercel Deployment Protection para que
  nadie mÃ¡s entre a los previews.

  > âš ï¸ En C1 el destino del rewrite es **fijo**: todos los previews proxean al mismo
  > backend. Si ese backend es el de producciÃ³n, quien encuentre la URL de un preview puede
  > **escribir en tu base de datos real**. PonÃ© Deployment Protection, o `VITE`/dashboard
  > apunta a un backend de staging, antes de invitar a alguien a probar un preview.


---

## Casos reales

### 1. Bypass de rate limiting por `X-Forwarded-For` (corregido)

> Detectado y corregido en producciÃ³n (Modulax, 2026-09-25). Es el error mÃ¡s caro
> documentado en esta guÃ­a, y la razÃ³n por la que `boilerplate-backend` ya no lee headers
> a mano.

**El error.** `rateLimiter.ts` derivaba la IP del cliente asÃ­:

```ts
// âŒ MAL â€” el cliente controla el valor de [0]
const ip = req.headers['x-forwarded-for'].split(',')[0].trim();
```

`X-Forwarded-For` es una cadena que **el cliente puede prefijar**, y Render *aÃ±ade* sus IPs
al final en vez de reemplazar. Tomar `[0]` es tomar exactamente lo que eligiÃ³ el atacante:
cambiar el header da un cubo de rate limit nuevo y limpio, y el lÃ­mite se evade por
completo. No hacÃ­a falta ni navegador â€” un `curl` bastaba.

**La evidencia** (leyendo el header `RateLimit` que emite el limitador contra producciÃ³n):

| Prueba | Header enviado | `remaining` |
|---|---|---|
| A | `X-Forwarded-For: 203.0.113.99` | 99 â†’ 98 â†’ 97 â†’ 96 â†’ 95 |
| B | `X-Forwarded-For: 198.51.100.7` (distinto) | **99** â†’ 98 â†’ 97 â† reiniciaba |
| C | sin header | 95 â†’ 94 |

La prueba B es la concluyente. Control adicional: al enviar `X-Forwarded-For: <mi-IP-real>`
cayÃ³ en el mismo cubo que "sin header", confirmando que Render escribe la IP real en `[0]`
**sÃ³lo cuando el cliente no manda nada**.

**El alcance.** Los cuatro limitadores con clave por IP eran evÃ¡sibles: el global (100/min),
el de registro (3/hora â†’ **creaciÃ³n de cuentas ilimitada**) y el de acciones sensibles. El de
login (10/15min) sÃ³lo se evadÃ­a *parcialmente*: su clave incluÃ­a el email, que no se puede
falsificar, asÃ­ que atacar una cuenta concreta seguÃ­a topeado (aguantaba *spraying*).

Lo mÃ¡s incÃ³modo: **no dependÃ­a de la topologÃ­a**. NaciÃ³ dos meses antes del cutover a
dominio propio y existÃ­a igual en la configuraciÃ³n vieja. El dominio y el cutover no tenÃ­an
nada que ver.

**El fix** (3 piezas, ya en el boilerplate):

1. `app.set('trust proxy', N)` con la profundidad **medida**.
2. `req.ip` en vez de leer el header â€” Express recorre la cadena desde la derecha y devuelve
   la primera direcciÃ³n no confiable.
3. `ipKeyGenerator()` de `express-rate-limit`, que agrupa IPv6 por subred: sin esto un
   usuario IPv6 evade el lÃ­mite rotando direcciones, sin falsificar nada.

Y un detalle que importa: **no pasando `keyGenerator`**, `express-rate-limit` ejecuta sus
propias validaciones de `trust proxy`, que detectan una profundidad mal puesta. Con un
`keyGenerator` propio esas validaciones no corren y **no hay red de seguridad**: una config
mala falla en silencio.

**Efecto colateral corregido.** Sin `trust proxy`, `req.ip` devuelve la direcciÃ³n interna del
proxy. El backend usaba `req.ip` en 11 sitios de auditorÃ­a y login fallido, asÃ­ que **todos
esos registros guardaban la misma IP** â€” inÃºtiles para investigar un incidente. El mismo
`trust proxy` lo arregla. Por eso `boilerplate-backend` pasa `ip: req.ip` al log de auditorÃ­a.

### 2. Cutover a cookie first-party (C3 ejecutado)

BitÃ¡cora condensada de un proyecto en producciÃ³n (Cotizador Modulax, 2026-09-24) que migrÃ³
de `app.vercel.app` + `api.onrender.com` a dominio propio (C3) para que la cookie de sesiÃ³n
fuera **first-party** y funcionara en Safari/Firefox/Chrome. La lecciÃ³n que dejÃ³: el
problema nunca fue el dominio, fue **no haber puesto un proxy** antes (hoy serÃ­a C1).

**Estado final**:

| Componente | Valor |
|---|---|
| Frontend (Vercel) | `https://cotizadormodulax.com` (apex â†’ 308 â†’ `www.`) |
| Backend (Render) | `https://api.cotizadormodulax.com` |
| DNS | `@` A â†’ IP de Vercel Â· `www` CNAME â†’ Vercel Â· `api` CNAME â†’ `*.onrender.com` |
| Cookie | `access_token=â€¦; HttpOnly; Secure; SameSite=Lax` (host-only, sin `Domain`) |
| CORS (Render) | allowlist: `https://cotizadormodulax.com`, `https://www.cotizadormodulax.com` |

**Pasos**:

1. DNS en el registrador: `@` A â†’ IP de Vercel; `www` CNAME â†’ Vercel; `api` CNAME â†’ Render.
2. Vercel: aÃ±adir dominio `cotizadormodulax.com` (el apex redirige a `www`).
3. Render: custom domain `api.cotizadormodulax.com` en el servicio.
4. Frontend: la URL de la API como **Config**, no Secret (ver gotcha abajo).
5. Backend: `COOKIE_SAMESITE=lax`, **sin** `COOKIE_DOMAIN`.
6. Verificar: bundle contiene la URL nueva; `/api/health` 200; login â†’ `Set-Cookie` con
   `SameSite=Lax`; `/api/auth/me` con cookie â†’ 200; logout limpia la cookie.

**Gotcha crÃ­tico**: la variable de la URL de la API ya existÃ­a como variable de entorno en el
dashboard de Vercel y **sobreescribÃ­a** el `.env.production` del repo (Vite no pisa
`process.env` con `.env.*`). El bundle seguÃ­a llamando al host viejo hasta corregir el
dashboard. Dos reglas: **`NEXT_PUBLIC_*` no puede ser Secret** (se expone al cliente, la CLI
lo rechaza) y **cualquier cambio de URL de API es un redeploy completo**, porque se hornea
en el bundle en build time.

**Rollback**: Vercel â†’ promote del deployment anterior; backend â†’ revertir el commit de la
cookie (el `SameSite=None` viejo sigue funcionando cross-site).

**LecciÃ³n**: verificar el spelling del dominio antes de cualquier consulta DNS (un typo da
NXDOMAIN y parece "dominio caÃ­do").

---

## La IP real detrÃ¡s de un proxy

> Aplica a **las tres variantes del PatrÃ³n C** y a la B, no sÃ³lo a un patrÃ³n. En Render y en
> Vercel siempre hay un proxy delante. Es el error mÃ¡s caro de esta Ã¡rea (ver "Casos reales").

La lecciÃ³n de la plantilla: **la IP la resuelve Express, nunca una lectura manual de headers.**

```ts
// src/index.ts â€” el nÃºmero NO es un detalle, define si req.ip es la IP real
app.set('trust proxy', env.trustProxy);
```

| Saltos delante de la app | `TRUST_PROXY` |
|---|---|
| Vercel serverless (PatrÃ³n B) | `1` |
| Render sin CDN delante | `1` |
| Vercel â†’ Render (C1, proxy same-origin) | `2` |
| Render detrÃ¡s de Cloudflare | `3` |

> âš ï¸ **Nunca `trust proxy: true`.** El modo booleano devuelve el valor *mÃ¡s a la izquierda* de
> la cadena, que es justo el que el cliente falsifica. Es una trampa documentada por Express.

> âš ï¸ **El nÃºmero es frÃ¡gil.** Si el proveedor cambia su arquitectura interna, el conteo cambia
> y `req.ip` vuelve a ser incorrecto â€” **en silencio**, porque ninguna validaciÃ³n detecta un
> desajuste de profundidad. Re-verificalo si cambiÃ¡s de proveedor o metÃ©s un CDN adelante.

### CÃ³mo medirlo (una sola vez por proveedor)

`trust proxy` no se adivina, **se mide**. Endpoint temporal:

```ts
// src/routes/health.ts â€” TEMPORAL, borrar despuÃ©s de medir
router.get('/net', (req, res) => {
  if (process.env.DEBUG_NET !== '1') return res.status(404).json({ error: 'Not found' });
  const raw = req.headers['x-forwarded-for'];
  res.json({
    xff_list: typeof raw === 'string' ? raw.split(',').map((s) => s.trim()) : [],
    socket_remote: req.socket?.remoteAddress ?? null,
    trust_proxy: req.app.get('trust proxy') ?? false,
  });
});
```

```bash
# 1) Sin header: la cadena que la infraestructura agrega por sÃ­ sola
curl -s https://TU-BACKEND/api/health/net

# 2) Con un valor inventado al frente: confirma que el cliente puede prefijar
curl -s -H "X-Forwarded-For: 203.0.113.99" https://TU-BACKEND/api/health/net
```

**CÃ³mo leerlo**: contÃ¡ cuÃ¡ntos elementos agrega la infraestructura *despuÃ©s* del valor del
cliente. RepetÃ­ 5-6 veces para confirmar que el conteo es estable, y probÃ¡ tambiÃ©n el host
`*.onrender.com` por si tuviera otra profundidad. **Cierre obligatorio**: borrar el endpoint,
quitar `DEBUG_NET` y confirmar con el test de spoofing que `req.ip` ya no es una IP de proxy.

### Verificar que el fix funciona

```bash
# Cambiar el valor del header NO debe reiniciar el contador.
curl -s -D- -o/dev/null -H 'X-Forwarded-For: 203.0.113.99' https://TU-BACKEND/api/health | grep -i ratelimit
curl -s -D- -o/dev/null -H 'X-Forwarded-For: 198.51.100.7'  https://TU-BACKEND/api/health | grep -i ratelimit
# Si `remaining` vuelve al mÃ¡ximo al cambiar el header => sigue vulnerable.
```

---

## VerificaciÃ³n y rollback

### La regla de oro

**ProbÃ¡ siempre contra el host que ve el navegador**, nunca contra el backend.

```bash
# âŒ MAL: prueba el backend, que es exactamente lo que el navegador NO toca
curl -i -X POST https://TU-BACKEND.onrender.com/api/auth/login -d '{...}'

# âœ… BIEN: prueba el camino real que sigue el usuario
curl -i -X POST https://app.vercel.app/api/auth/login -d '{...}'   # C1
curl -i -X POST https://api.tudominio.com/api/auth/login  -d '{...}'  # C3
```

Probar el backend directamente es el error de verificaciÃ³n mÃ¡s comÃºn: todo funciona, el
backend responde perfecto, y asumÃ­s que el proxy funciona sin haberlo probado nunca.

En C2 probÃ¡ contra el backend **y** contra el frontend, porque ahÃ­ sÃ­ hay dos caminos.

### Comandos de diagnÃ³stico

```bash
# Â¿El proxy estÃ¡ cacheando? Debe decir MISS/STALE, nunca HIT en respuestas con cookie
curl -s -D- -o/dev/null https://app.vercel.app/api/auth/me | grep -i 'x-vercel-cache'

# Â¿El bundle filtrÃ³ la URL del backend? (esperado: 0)
curl -s https://app.vercel.app/ | grep -c 'onrender\.com'

# Â¿El rate limiting usa la IP real? (test de spoofing, arriba)
```

Headers Ãºtiles de Vercel: `x-vercel-cache` (HIT/MISS/STALE â€” **HIT** en una respuesta
autenticada significa que el cacheo estÃ¡ mal hecho), `x-vercel-id` (reportar el fallo),
`server-timing` (desglosa CDN vs origen).

### Smoke test de una app nueva

```bash
curl -i https://TU-BACKEND/api/health     # {"status":"ok","mode":"turso"}
curl -i https://TU-BACKEND/api/ready      # 200 = la BD tambiÃ©n responde; 503 = no
```

En los **tres** navegadores, y en ventana incÃ³gnito: Chrome, Firefox y Safari (en macOS,
activar *Prevent cross-site tracking* para simular el caso difÃ­cil). Un login que funciona en
Chrome y no en Safari no estÃ¡ terminado.

### Rollback

**Vercel** â€” volver a un deployment anterior sin rebuild:

```bash
vercel list --prod
vercel rollback <url-del-deployment-anterior>
vercel logs --environment production --level error --since 5m
```

Sin CLI: Dashboard â†’ Deployments â†’ filtrar `Production` â†’ el deployment READY anterior â†’
*Promote to Production*.

**Render** â€” **no hay rollback nativo**: se revierte el commit y se redeploya. TenÃ© en cuenta
el cold start del redeploy.

**Volver de C1 a C2** si el proxy da problemas: sacÃ¡ el rewrite `/api/*` del `vercel.json`,
ponÃ© la URL absoluta de la API en el frontend, ponÃ© `COOKIE_SAMESITE=none` y restaurÃ¡ el
allowlist de `CORS_ORIGIN`. C1 â†” C2 se alterna desde la config, sin tocar cÃ³digo de la app.

---

## LÃ­mites del free tier â€” quÃ© esperar

### Render (backend, variantes C)

| LÃ­mite | Valor | Impacto |
|---|---|---|
| Spin-down por inactividad | 15 min sin trÃ¡fico | La primera request tarda **~1 min**. El usuario ve una pantalla en blanco. **Es el mayor costo percibido del free tier**, y detrÃ¡s de un proxy (C1) la demora se amplifica. |
| Instancia free por mes | 750 h por workspace | Suficiente para 1 servicio. Al agotar, se suspende hasta el mes siguiente. |
| Filesystem | EfÃ­mero | **Todo lo que no estÃ© en Turso se pierde** en cada redeploy/spin-down. No uses disco local. |
| Cron jobs | No disponibles | Un warm-up no se puede hacer con cron de Render: usÃ¡ GitHub Actions programado o cron-job.org. |
| Rollback | No nativo | SÃ³lo redeploy desde un commit anterior. |
| `PORT` | Lo inyecta Render | **No lo declares** en `render.yaml` ni en el `.env`: un valor inconsistente produce health check fallido y loop de reinicio. |

**MitigaciÃ³n del cold start** (gratis): GitHub Actions programado que hace `curl` a
`/api/health` cada 10 minutos. Costo â‰ˆ 240 h/mes, dentro de las 750.

> âš ï¸ **Sin alertas de cuota te enterÃ¡s cuando ya suspendieron.** ConfigurÃ¡ un aviso de uso en
> ambos proveedores: es la diferencia entre "se suspendiÃ³ el servicio" y "lo vi a tiempo".

### Vercel (frontend)

| LÃ­mite | Valor |
|---|---|
| Bandwidth | 100 GB/mes (Hobby) |
| Builds | Ilimitados, con minutos incluidos |
| Previews | Ilimitados, cada uno en su propio host `*.vercel.app` |
| Dominio | `*.vercel.app` incluido; dominios custom ilimitados |
| **Cacheo de external rewrites** | âš ï¸ **Activo por defecto desde 6-abr-2026** (solo en C1) |
| Functions | Las *external rewrites* no consumen minutos de funciÃ³n |

### El resumen honesto

La variante C1 es gratis y tÃ©cnicamente superior a C2, pero sus costos no son monetarios:
son **latencia extra**, **cold starts visibles** y **un modo de falla silencioso** (el cachÃ©
mal configurado no se manifiesta con un error, sino con datos de otro usuario). Si crece, el
orden de inversiÃ³n correcto es:

1. `Cache-Control: no-store` + `x-vercel-enable-rewrite-caching: 0` â€” **gratis, dÃ­a uno**.
2. `TRUST_PROXY` bien medido + rate limiting por `req.ip` â€” **gratis, dÃ­a uno**.
3. Backend en plan pago (~$7/mes) para eliminar el cold start â€” **cuando moleste**.
4. Dominio propio, sÃ³lo si hace falta un nombre para marketing o integraciones.


---

## CÃ³mo hereda la plantilla

`04-ARQUITECTURA.md` es el nÃºcleo (capas, migraciones, errores, planes). El patrÃ³n solo cambia el "envoltorio":

- A: usa `supabase/schema.sql`, no esta plantilla de backend.
- B: `api/server.ts` + `vercel.json` + `COOKIE_SAMESITE=lax` + `TRUST_PROXY=1`.
- C1: `vercel.json` con rewrite `/api` a Render + `COOKIE_SAMESITE=lax` + `TRUST_PROXY=2`.
- C2: `render.yaml` + `COOKIE_SAMESITE=none` + `NEXT_PUBLIC_API_URL` absoluta + `TRUST_PROXY=1..3`.
- C3: `render.yaml` + `COOKIE_SAMESITE=lax` + dominios + `CORS_ORIGIN`.

Pendientes comunes (pago real, `PLANS` en DB, `admin`, tests, observabilidad, `organizations`) aplican a todos.

---

## Health y cold start

- `GET /api/health` â†’ `{ "status": "ok", "mode": "turso" }`. **No toca dependencias**:
  es el `healthCheckPath` de Render. Si dependiera de la BD, una caÃ­da transitoria de Turso
  reiniciarÃ­a el servicio en loop y convertirÃ­a un problema de dependencia en una caÃ­da de
  la app.
- `GET /api/ready` â†’ sÃ­ verifica la BD (`200` = operativa, `503` = degradada). Usalo en el
  monitor de uptime: distingue "el proceso estÃ¡ vivo" de "la app puede operar".
- Render Free se suspende (~50s cold start); Vercel fluid (~1s tras 2 semanas sin trÃ¡fico).

---

## Checklist

- [ ] PatrÃ³n elegido con el Ã¡rbol de decisiÃ³n
- [ ] **A**: RLS en Postgres + `supabase/schema.sql` como fuente Ãºnica
- [ ] **B**: `vercel.json` con rewrite `/api` antes del SPA; **sin** `NEXT_PUBLIC_API_URL`; `TURSO_*`/`JWT_SECRET` en Vercel (server-side); `TRUST_PROXY=1`
- [ ] **C1**: rewrite `/api` a Render **antes** del catch-all; las 3 capas anti-cachÃ©; `NEXT_PUBLIC_API_URL` vacÃ­o; `COOKIE_SAMESITE=lax`; `TRUST_PROXY=2`
- [ ] **C2**: `COOKIE_SAMESITE=none` + `CORS_ORIGIN` allowlist + URL absoluta de la API + sonda probada en Safari/Firefox/Chrome
- [ ] **C3**: dominios + `COOKIE_SAMESITE=lax` + `CORS_ORIGIN` + **sin** `COOKIE_DOMAIN`
- [ ] **`TRUST_PROXY` medido** con el procedimiento, no supuesto (solo C)
- [ ] **Test de spoofing de `X-Forwarded-For` pasa** (o sea: cambiar el header no reinicia el contador)
- [ ] `Cache-Control: no-store` presente en toda ruta `/api` autenticada
- [ ] `/api/health` y login â†’ `/api/auth/me` funcionan **contra el host que ve el navegador**
- [ ] Probado en Chrome, Firefox y Safari; en los 3, normal y incÃ³gnito
- [ ] Monitor de uptime apuntando a `/api/ready` + alertas de cuota activas
- [ ] Previews con Deployment Protection, o apuntando a un backend de staging
- [ ] `ALLOW_REGISTRATION` segÃºn lanzamiento
- [ ] Node pineado: `.nvmrc` + `engines`

---

## Referencias

- Arquitectura y decisiones: [04-ARQUITECTURA.md](04-ARQUITECTURA.md)
- Piezas de cÃ³digo: [05-PATRONES-CODIGO.md](05-PATRONES-CODIGO.md)
- Fases de despliegue: [03-FASES-DESARROLLO.md](03-FASES-DESARROLLO.md) Â§Fase 4
- Frontend: [08-FRONTEND.md](08-FRONTEND.md)
- Backend de referencia: `boilerplate-backend/`
