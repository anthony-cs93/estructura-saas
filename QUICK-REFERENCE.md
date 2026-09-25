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
├─ INDEX.md                          ← Este índice
├─ QUICK-REFERENCE.md                ← ESTE ARCHIVO
│
└─ templates/
   ├─ 01-full-stack-monorepo/       ✅ Guía
   │  └─ README.md                   (Paso a paso)
   │
   ├─ 02-backend-separado/          ✅ Guía
   │  └─ README.md                   (Paso a paso)
   │
   ├─ 03-baas-supabase/             ✅ Guía
   │  └─ README.md                   (Paso a paso)
   │
   └─ 04-serverless-vercel/         ✅ Guía
      └─ README.md                   (Paso a paso)
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

# 3. Env variables en dashboard de Render
```

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
TURSO_URL=libsql://...
TURSO_TOKEN=...

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Backend Separado
```env
# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_API_URL_PROD=https://api.tudominio.com

# Backend
TURSO_URL=libsql://...
TURSO_TOKEN=...
FRONTEND_URL=http://localhost:3000
FRONTEND_URL_PROD=https://tudominio.com
```

---

## 🐛 Debugging rápido

| Problema | Solución |
|---|---|
| API no responde | `curl http://localhost:3001/health` |
| CORS error | Agrega dominio a `cors({ origin: '...' })` |
| BD vacía | Crea tabla: `turso db shell mi-app` |
| Env var no funciona | Reinicia el servidor: `npm run dev` |
| Build lento | ¿Tienes >10 routes? → migra a Backend Separado |

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
4. Clone boilerplate                      5 min
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
- [ ] Tests pasan
- [ ] Console sin errores (F12)
- [ ] Network requests status 200
- [ ] Funcionalidades básicas testeadas
- [ ] Env variables en Vercel/Render dashboard
- [ ] CORS configurado correctamente

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
→ Lee `05-PATRONES-CODIGO.md` o usa `boilerplate-backend/`

---

**Última actualización**: 2026-09-23
**Status**: ✅ Completo y listo para usar

¡Buena suerte! 🚀
