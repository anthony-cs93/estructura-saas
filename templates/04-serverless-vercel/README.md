# Guía: Serverless — Next.js API Routes Puro

Guía paso a paso para montar una app **simple** donde el backend son las API routes de
Next.js, todo en un solo despliegue a Vercel.

**Para**:
- ✅ Consultas directas a BD
- ✅ CRUD básico
- ✅ MVP rápido sin backend separado
- ✅ 1 deploy a Vercel

**No es para**: apps con muchos endpoints o lógica de negocio compleja.

---

## 🎯 Ventajas

| Aspecto | Ventaja |
|---|---|
| **Velocidad** | 1 repo, 1 deploy. Cambios → git push → live. |
| **Simplicidad** | Frontend + backend en el mismo código. |
| **Escalado automático** | Vercel maneja todo. |
| **Mismo lenguaje** | JavaScript/TypeScript en todo. |

---

## 📁 Estructura recomendada

```
pages/
├─ index.tsx           (home)
├─ api/
│  ├─ quotes.ts       (GET, POST /quotes)
│  └─ health.ts       (status check)
├─ lib/
│  └─ db.ts          (conexión BD)
└─ components/
   └─ QuoteList.tsx
```

---

## ⚡ Pasos de montaje

1. **Crea la BD Turso**: crea la base, obtén la URL y el token, y crea las tablas con el CLI.
2. **Configura la conexión**: crea `lib/db.ts` con el cliente de Turso usando las variables de
   entorno (`TURSO_URL`, `TURSO_TOKEN`).
3. **Crea las API routes** en `pages/api/`: una por recurso, manejando los métodos HTTP
   (GET para listar, POST para crear, etc.).
4. **Construye la UI**: páginas y componentes que consumen las API routes con `fetch` relativo
   (mismo origen, sin CORS).
5. **Levanta local**: `npm run dev` → `http://localhost:3000`.

> Para lógica más compleja (auth, planes, capas service/repository), usa el backend de
> referencia **[`../../boilerplate-backend/`](../../boilerplate-backend/)** en lugar de
> escribir todo en las API routes.

---

## 🚀 Deploy

1. Sube el repo a GitHub.
2. Conecta el repo en Vercel (deploy automático en cada push).
3. Configura las variables de entorno en Vercel (`TURSO_URL`, `TURSO_TOKEN`).

---

## ⚠️ Límite: si creces

Si la app crece en endpoints o lógica:

- ❌ El backend queda acoplado al frontend y limitado a funciones serverless.
- ✅ **Solución**: migra a **Backend Separado** (ver `../../02-backend-separado/`).

Proceso de migración:

1. Copia tu BD (Turso se queda igual).
2. Crea una carpeta `backend/` con Express (usa `boilerplate-backend/` como base).
3. Mueve la lógica de `pages/api` a Express.
4. Despliega el backend a Render.
5. El frontend consume el backend remoto (ya no las API routes).

---

## ✅ Checklist

- [ ] BD Turso creada con tablas
- [ ] `TURSO_URL` y `TURSO_TOKEN` en `.env.local`
- [ ] API routes respondiendo
- [ ] Frontend conecta a la API
- [ ] Deploy a Vercel con variables de entorno

---

## 🔗 Referencias

- Backend de referencia: [`../../boilerplate-backend/`](../../boilerplate-backend/)
- Frontend de referencia: [`../../boilerplate-frontend/`](../../boilerplate-frontend/)
- Guía del frontend: [`../../08-FRONTEND.md`](../../08-FRONTEND.md)
- Arquitectura y decisiones: [`../../04-ARQUITECTURA.md`](../../04-ARQUITECTURA.md)
- Despliegue (patrón B, Vercel catch-all): [`../../07-DEPLOY.md`](../../07-DEPLOY.md)