# 📑 Índice completo: Estructura SaaS

Navega la guía usando este índice.

---

## 📚 Documentación

| Archivo | Para qué sirve | Público objetivo |
|---|---|---|
| **[README.md](README.md)** | Punto de entrada y flujo completo | Todos |
| **[00-INICIO.md](00-INICIO.md)** | Introducción, cómo navegar esta guía | Todos |
| **[01-MATRIZ-DECISION.md](01-MATRIZ-DECISION.md)** | Responde 3 preguntas → elige arquitectura | Principiantes |
| **[02-COMPARATIVA-OPCIONES.md](02-COMPARATIVA-OPCIONES.md)** | Pros/contras detallados de cada opción | Quien duda |
| **[03-FASES-DESARROLLO.md](03-FASES-DESARROLLO.md)** | Roadmap de 4 fases: pre-dev → deployment | Todos |
| **[04-ARQUITECTURA.md](04-ARQUITECTURA.md)** | Blueprint del backend y decisiones de diseño | Técnicos |
| **[05-PATRONES-CODIGO.md](05-PATRONES-CODIGO.md)** | Código copiable (16 piezas) | Developers |
| **[06-CHECKLIST-MODULO.md](06-CHECKLIST-MODULO.md)** | Agregar un módulo de dominio | Developers |
| **[07-DEPLOY.md](07-DEPLOY.md)** | Patrones de despliegue y detalle técnico | Todos (al desplegar) |
| **[QUICK-REFERENCE.md](QUICK-REFERENCE.md)** | Tarjeta de referencia rápida | Todos |

---

## 🚀 Boilerplates (listos para clonar)

Cada carpeta tiene frontend + backend (si aplica) listos para `npm install && npm run dev`.

### 01-full-stack-monorepo/
**Para**: MVP muy rápido, <10 endpoints, equipo pequeño
**Qué tienes**: Next.js fullstack, 1 repo, 1 deploy a Vercel
**Status**: base disponible

### 02-backend-separado/ ⭐
**Para**: apps complejas, >10 endpoints, proteger lógica
**Qué tienes**: `frontend/` (Next.js → Vercel) + `backend/` (Express → Render)
**Status**: base disponible (enriquecible con `boilerplate-backend/`)

### 03-baas-supabase/
**Para**: CRUD simple, MVP ultra rápido, sin backend
**Qué tienes**: Next.js + Supabase (auth, DB, storage)
**Status**: base disponible

### 04-serverless-vercel/
**Para**: consultas simples, <10 endpoints, todo en Vercel
**Qué tienes**: Next.js con API routes
**Status**: base disponible

---

## 🧱 Backend de referencia

### boilerplate-backend/
Backend **Express + TypeScript + Turso** completo, con:

- Capas `service` / `repository` por módulo.
- Migraciones versionadas con reintentos.
- Auth por cookie `httpOnly` + verificación de cuenta activa.
- Planes, cuotas y feature gating.
- Rate limiting, auditoría y gestión de cuenta.
- `AGENTS.md` con convenciones obligatorias.

Es la base de las arquitecturas 1, 2 y 4. Su documentación original vive en `boilerplate-backend/docs/`.

---

## 🗺️ Flujo recomendado

### Si no sabes por dónde empezar:
1. Lee **[00-INICIO.md](00-INICIO.md)** (5 min)
2. Responde la matriz en **[01-MATRIZ-DECISION.md](01-MATRIZ-DECISION.md)** (10 min)
3. Lee pros/contras en **[02-COMPARATIVA-OPCIONES.md](02-COMPARATIVA-OPCIONES.md)** (10 min)
4. Ve a `templates/[tu-arquitectura]/README.md` (15 min)
5. Clona, instala, empieza a codificar

**Tiempo total**: ~40 minutos antes de empezar

### Si ya sabes qué arquitectura quieres:
1. Ve a `templates/[tu-arquitectura]/`
2. Lee el README
3. `npm install`
4. `npm run dev`

**Tiempo total**: ~5 minutos

### Si vas a construir un backend:
1. **[04-ARQUITECTURA.md](04-ARQUITECTURA.md)** → entiende el diseño
2. **[05-PATRONES-CODIGO.md](05-PATRONES-CODIGO.md)** → copia las piezas
3. **[06-CHECKLIST-MODULO.md](06-CHECKLIST-MODULO.md)** → agrega módulos
4. **[07-DEPLOY.md](07-DEPLOY.md)** → elige el patrón de despliegue

**Tiempo total**: 1-2 horas

---

## 💬 Navegación rápida

| Quiero... | Ve a... |
|---|---|
| Contexto general | [00-INICIO.md](00-INICIO.md) |
| Elegir arquitectura | [01-MATRIZ-DECISION.md](01-MATRIZ-DECISION.md) |
| Entender la decisión | [02-COMPARATIVA-OPCIONES.md](02-COMPARATIVA-OPCIONES.md) |
| Roadmap de fases | [03-FASES-DESARROLLO.md](03-FASES-DESARROLLO.md) |
| Diseño del backend | [04-ARQUITECTURA.md](04-ARQUITECTURA.md) |
| Código de ejemplo | [05-PATRONES-CODIGO.md](05-PATRONES-CODIGO.md) |
| Agregar un módulo | [06-CHECKLIST-MODULO.md](06-CHECKLIST-MODULO.md) |
| Desplegar | [07-DEPLOY.md](07-DEPLOY.md) |
| Referencia rápida | [QUICK-REFERENCE.md](QUICK-REFERENCE.md) |

---

**Versión**: 2.0 (unificada)
**Estado**: ✅ Completa
