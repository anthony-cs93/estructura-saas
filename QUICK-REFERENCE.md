# 🚀 Quick Reference: Cheat Sheet de Arquitecturas

Imprime esto o guárdalo en un bookmark.

---

## 🎯 Elegir arquitectura en 1 minuto

**Responde estas 3 preguntas:**

1. **¿Cuántos endpoints necesitas?**
   - <6: BaaS o Serverless
   - 6-15: Backend Separado o Full-Stack
   - \>15: Backend Separado

2. **¿Lógica compleja que proteger?**
   - No: BaaS o Serverless
   - Sí: Backend Separado

3. **¿Cuánto tiempo tienes?**
   - <1 semana: BaaS
   - 1-2 semanas: Serverless o Full-Stack
   - 2+ semanas: Backend Separado

---

## 📊 Comparativa rápida

| | BaaS | Serverless | Full-Stack | Backend Sep. |
|---|---|---|---|---|
| **MVP speed** | ⚡⚡⚡⚡⚡ | ⚡⚡⚡⚡ | ⚡⚡⚡⚡⚡ | ⚡⚡⚡ |
| **Max endpoints** | N/A | 12 | 12 | ∞ |
| **Proteger lógica** | ❌ | ❌ | ⚠️ | ✅ |
| **Cost (free)** | ✅ | ✅ | ✅ | ⚠️ |
| **Escalabilidad** | ✅✅✅✅ | ⚠️ | ⚠️ | ✅✅✅✅✅ |
| **Mantener** | ✅ | ✅✅ | ✅ | ⚠️ |

---

## 🎯 Tu decisión rápida

### Material Catalog (simple, catálogo)
→ **BaaS** (Supabase)

### App Contable (CRUD, crecerá)
→ **Serverless** ahora, **Backend Separado** después

### Modulax (complejos cálculos, que escale)
→ **Backend Separado**

### Próximo proyecto desconocido
→ Usa matriz en `01-MATRIZ-DECISION.md`

---

## ⚡ Comandos más usados

### BaaS (Supabase)
```bash
npm install
npm run dev
# Eso es. No hay más. Supabase maneja todo.
```

### Serverless (Next.js API routes)
```bash
npm install
npm run dev
# Frontend + Backend en localhost:3000
```

### Full-Stack (Monorepo)
```bash
npm install           # Instala ambas apps
npm run dev          # Frontend + Backend
# Frontend: localhost:3000
# Backend: localhost:3001
```

### Backend Separado
```bash
# Terminal 1: Frontend
cd frontend && npm install && npm run dev
# localhost:3000

# Terminal 2: Backend
cd backend && npm install && npm run dev
# localhost:3001
```

---

## 📁 Carpetas del boilerplate

```
guia-arquitectura-saas/
├─ 00-INICIO.md                      ← Empieza aquí
├─ 01-MATRIZ-DECISION.md             ← Elige arquitectura
├─ 02-COMPARATIVA-OPCIONES.md        ← Entiende pros/contras
├─ 03-FASES-DESARROLLO.md            ← Roadmap de 4 fases
├─ 04-ARQUITECTURA.md                ← Blueprint del backend
├─ 05-PATRONES-CODIGO.md             ← Código copiable
├─ 06-CHECKLIST-MODULO.md            ← Agregar un módulo
├─ 07-DEPLOY.md                      ← Patrones de deploy
├─ 08-FRONTEND.md                    ← Guía del frontend
├─ INDEX.md                          ← Este índice
├─ QUICK-REFERENCE.md                ← ESTE ARCHIVO
│
├─ templates/
│  ├─ 01-full-stack-monorepo/       ✅ Guía
│  │  └─ README.md                   (Paso a paso)
│  ├─ 02-backend-separado/          ✅ Guía
│  │  └─ README.md                   (Paso a paso)
│  ├─ 03-baas-supabase/             ✅ Guía
│  │  └─ README.md                   (Paso a paso)
│  └─ 04-serverless-vercel/         ✅ Guía
│     └─ README.md                   (Paso a paso)
│
└─ 🧱 CÓDIGO DE REFERENCIA
   ├─ boilerplate-backend/          ✅ Backend Express + TS + Turso
   └─ boilerplate-frontend/         ✅ Frontend Next.js + TS
```

---

## 🚀 Deploy cheat sheet

### Frontend → Vercel
```bash
# Opción 1: Automático
git push origin main
# Vercel hace deploy automáticamente

# Opción 2: Manual
npm install -g vercel && vercel
```

### Backend → Render
```bash
# 1. Push a GitHub
git push

# 2. Ve a render.com
# New → Web Service → conecta GitHub
# Build: npm install
# Start: npm start

# 3. Copiá .env.example al dashboard de Render y completá TODO.
#    Las obligatorias (TURSO_*, JWT_SECRET, CORS_ORIGIN) fallan al arrancar si faltan.

# 4. Verificá (el backend primero):
curl -i https://backend-xxx.onrender.com/api/health   # {"status":"ok","mode":"turso"}
curl -i https://backend-xxx.onrender.com/api/ready    # 200 = la BD también responde
```

> ⚠️ **Si usás la variante C1 (proxy same-origin), el smoke test va contra el frontend**
> (`https://tuapp.vercel.app/api/health`), no contra el backend. Ver la "regla de oro" en
> [07-DEPLOY.md](07-DEPLOY.md).

### BD → Turso
```bash
turso db create mi-app-db
turso db show mi-app-db --http
# Copiar URL y token a .env
```

### BD → Supabase
```bash
# Ve a supabase.com
# New project → copia URL y key
# Copia a .env
```

---

## ⚙️ Variables de ambiente

### BaaS
```env
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Serverless
```env
TURSO_URL=libsql://...
TURSO_TOKEN=...
```

### Full-Stack
```env
# Backend
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
JWT_SECRET=...
CORS_ORIGIN=http://localhost:5173

# Frontend (vacío = mismo origen)
NEXT_PUBLIC_API_URL=
```

### Backend Separado

Usá los nombres de `boilerplate-backend/.env.example` — son los que la plantilla exige.

```env
# Frontend
# vacío en Patrón B y C1 (proxy same-origin)
# URL absoluta solo en C2 / C3
NEXT_PUBLIC_API_URL=

# Backend
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
JWT_SECRET=...
CORS_ORIGIN=https://app.vercel.app,https://tudominio.com
COOKIE_SAMESITE=lax     # none solo si cruzás de origen (C2), y solo con HTTPS
TRUST_PROXY=1           # se MIDE, no se supone (ver 07-DEPLOY.md)
```

> ⚠️ `NEXT_PUBLIC_*` **no puede ser Secret**: se hornea en el bundle y viaja al navegador.
> Va como variable normal del proyecto. Y cambiar la URL de la API es un **redeploy
> completo**, porque se hornea en build time.

### Frontend (Next.js) — `boilerplate-frontend/`
```env
# '' = mismo origen (Patrón B y C1) o URL del backend (C2/C3)
NEXT_PUBLIC_API_URL=
```

---

## 🐛 Debugging rápido

| Problema | Solución |
|---|---|
| API no responde | `curl http://localhost:3001/api/health` |
| Sesión se pierde al recargar | Cookie sin `Secure` en producción, o `COOKIE_SAMESITE` mal |
| Login funciona en Chrome y no en Safari | Cruzás de origen con `SameSite=None`: usá **C1** (proxy same-origin) |
| CORS error | Agregá el origen a `CORS_ORIGIN` (CSV). En **C1 no hay CORS**: el problema es otro |
| Rate limit no frena nada | ¿Leés `x-forwarded-for` a mano? Medí `TRUST_PROXY` y usá `req.ip` |
| Un usuario real bloquea a otros | `TRUST_PROXY` muy alto: `req.ip` es falsificable |
| 429 se cachea | El `no-store` va montado **antes** del rate limiter |
| BD vacía | `npm run migrate` (no a mano: el esquema vive en `src/db/migrations/`) |
| Env var no funciona | Reiniciá el servidor: `npm run dev` |
| Build falla por tipos | `npm run typecheck`. `tsc` corre en el build: un error de tipos bloquea el deploy |
| Build lento | ¿>10 rutas? → evaluá mover a Backend Separado |

---

## 📈 Cuándo migrar

| De | A | Cuándo |
|---|---|---|
| BaaS | Backend Separado | Necesitas lógica compleja |
| Serverless | Backend Separado | Tienes >10 endpoints |
| Full-Stack | Backend Separado | Tienes >10 endpoints o equipos separados |

**La migración es fácil**: tu BD se queda igual. Solo separas frontend y backend en repos diferentes.

---

## 💡 Pro Tips

✅ **Usa TypeScript**: Encontrarás errores antes de producción
✅ **Valida en backend**: Nunca confíes en frontend
✅ **Env variables**: Nunca commitees secretos a GitHub
✅ **Test local primero**: Luego deploy
✅ **Monitorea producción**: Sentry, Uptime Robot
✅ **Documenta APIs**: Genera con OpenAPI o Swagger
✅ **Cachea queries**: Usa SWR o React Query en frontend

---

## 🔗 Links útiles

- **Matriz de decisión**: `01-MATRIZ-DECISION.md`
- **Comparativa**: `02-COMPARATIVA-OPCIONES.md`
- **Fases**: `03-FASES-DESARROLLO.md`
- **Index**: `INDEX.md`

---

## 🎯 Flujo recomendado

```
1. Lee QUICK-REFERENCE (este archivo)     5 min
   ↓
2. Responde matriz                        10 min
   ↓
3. Lee comparativa de tu arquitectura     10 min
   ↓
4. Usa boilerplate-backend/ + frontend/   5 min
   ↓
5. npm install && npm run dev             10 min
   ↓
6. Build MVP                              1-2 weeks
   ↓
7. Deploy                                 1 day
   ↓
8. ¡Produccción! 🎉                       ✅
```

---

## 📋 Antes de cada deploy

- [ ] `.env.local` tiene todas las variables
- [ ] No hay secretos en GitHub
- [ ] `npm run typecheck` y tests pasan
- [ ] Node pineado (`.nvmrc` + `engines`) en el repo, no implícito en la plataforma
- [ ] Env variables en Vercel/Render dashboard, **ninguna vacía**
- [ ] `CORS_ORIGIN` configurado **solo si** el backend está en otro origen
- [ ] `COOKIE_SAMESITE` acorde a la variante (`lax` en B/C1/C3, `none` solo en C2)
- [ ] La cookie **no** lleva atributo `Domain` (host-only)
- [ ] `TRUST_PROXY` medido (procedimiento en [07-DEPLOY.md](07-DEPLOY.md))
- [ ] Test de spoofing de `X-Forwarded-For` pasa
- [ ] `Cache-Control: no-store` en las rutas `/api` autenticadas
- [ ] Migraciones aplicadas (`npm run migrate`) — el esquema solo se cambia por migración
- [ ] Smoke test **contra el host que ve el navegador**, no solo contra el backend
- [ ] Probado en Chrome, Firefox y Safari (normal + incógnito)
- [ ] Console sin errores y Network en 200
- [ ] Monitor de uptime + alertas de quota activas
- [ ] Sabés cómo hacer rollback (Vercel: *Promote to Production*; Render: redeploy)

---

## 🆘 Ayuda rápida

**¿Qué archivos leer primero?**
1. `00-INICIO.md` (contexto)
2. `01-MATRIZ-DECISION.md` (decisión)
3. `templates/[tu-arquitectura]/README.md` (empezar)

**¿Estoy en la arquitectura correcta?**
→ Lee `02-COMPARATIVA-OPCIONES.md`

**¿Cómo progreso?**
→ Lee `03-FASES-DESARROLLO.md`

**¿Código de ejemplo?**
→ Lee `05-PATRONES-CODIGO.md` o usa `boilerplate-backend/` + `boilerplate-frontend/`

**¿Frontend?**
→ Lee `08-FRONTEND.md` y copia piezas de `boilerplate-frontend/`

---

**Última actualización**: 2026-09-23
**Status**: ✅ Completo y listo para usar

¡Buena suerte! 🚀
