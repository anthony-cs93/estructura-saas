# Guía: Full-Stack Monorepo — Frontend + Backend en 1 Repo

Guía paso a paso para montar una app **todo-en-uno**: frontend y backend en el mismo
repositorio, con un solo despliegue.

**Para**: prototipado rápido.
- ✅ MVP en 2 semanas
- ✅ <10 endpoints
- ✅ Equipo pequeño (1-2 devs)
- ✅ 1 repo, 1 deploy a Vercel

**No es para**: apps complejas con >10 endpoints o lógica de negocio pesada.

---

## 🎯 Ventajas

| Aspecto | Ventaja |
|---|---|
| **Velocidad** | Frontend + backend juntos. Cambio → git push → live. |
| **Sincronización** | Mismo repo = código actualizado siempre. |
| **Tipos TypeScript** | Compartir tipos entre frontend y backend. |
| **1 deploy** | Vercel maneja ambas apps automáticamente. |
| **Desarrollo local** | Un solo comando levanta todo en localhost. |

---

## 📁 Estructura recomendada

```
mi-app/
├─ apps/
│  ├─ web/              (Next.js frontend)
│  │  ├─ pages/
│  │  ├─ components/
│  │  ├─ lib/           (cliente HTTP, hooks)
│  │  └─ package.json
│  │
│  └─ api/              (Express backend)
│     ├─ src/
│     │  ├─ routes/
│     │  ├─ lib/        (conexión a BD)
│     │  └─ index.ts    (servidor)
│     └─ package.json
│
├─ packages/            (código compartido)
│  └─ shared/
│     ├─ types.ts       (interfaces TypeScript)
│     └─ package.json
│
└─ package.json         (monorepo config)
```

> Para el backend, usa como base el backend de referencia
> **[`../../boilerplate-backend/`](../../boilerplate-backend/)** (Express + TypeScript + Turso
> con capas service/repository). El diseño y las piezas de código están en
> **[`../../04-ARQUITECTURA.md`](../../04-ARQUITECTURA.md)** y
> **[`../../05-PATRONES-CODIGO.md`](../../05-PATRONES-CODIGO.md)**.

---

## ⚡ Pasos de montaje

1. **Crea el monorepo**: carpeta raíz con `package.json` y workspaces para `apps/web` y `apps/api`.
2. **Frontend**: crea la app Next.js en `apps/web` (páginas, componentes, cliente HTTP en `lib/`).
3. **Backend**: copia el esqueleto de `boilerplate-backend/` en `apps/api` (o reconstruye con
   `05-PATRONES-CODIGO.md`).
4. **Comparte tipos**: define las interfaces de dominio en `packages/shared` e impórtalas desde
   ambos lados.
5. **Variables de entorno**: crea `.env.local` en `apps/api` con las credenciales de Turso
   (ver `.env.example` del boilerplate).
6. **Levanta local**: un solo comando (`npm run dev`) debe arrancar frontend y backend.
7. **Prueba el flujo**: crea → lista → edita → borra un recurso de ejemplo.

---

## 🚀 Deploy a Vercel

1. Sube el repo a GitHub.
2. En Vercel: Import → GitHub → selecciona el repo. Vercel detecta el monorepo automáticamente.
3. Configura las variables de entorno del backend (Turso, JWT, etc.) en el dashboard.
4. Cada push a `main` = deploy automático.

---

## ⚠️ Límite: si creces

Si necesitas más de ~10 endpoints o lógica compleja:

- ❌ El backend y el frontend quedan acoplados (no puedes escalar uno sin el otro).
- ✅ **Solución**: migra a **Backend Separado** (ver `../../02-backend-separado/`).

Proceso de migración:

1. Mueve `apps/api/` a un repo nuevo (`backend/`).
2. Despliega el backend en Render (en lugar de Vercel).
3. Configura `apps/web/` para consumir el backend remoto.
4. Despliega frontend a Vercel y backend a Render.

---

## ✅ Checklist

- [ ] Monorepo con workspaces funcionando
- [ ] Frontend y backend corren con un solo comando
- [ ] BD Turso creada y conectada
- [ ] Tipos compartidos en `packages/shared`
- [ ] Flujo completo probado (crear → listar → editar → borrar)
- [ ] Deploy a Vercel con variables de entorno configuradas

---

## 🔗 Referencias

- Backend de referencia: [`../../boilerplate-backend/`](../../boilerplate-backend/)
- Frontend de referencia: [`../../boilerplate-frontend/`](../../boilerplate-frontend/)
- Guía del frontend: [`../../08-FRONTEND.md`](../../08-FRONTEND.md)
- Arquitectura y decisiones: [`../../04-ARQUITECTURA.md`](../../04-ARQUITECTURA.md)
- Piezas de código copiables: [`../../05-PATRONES-CODIGO.md`](../../05-PATRONES-CODIGO.md)
- Despliegue: [`../../07-DEPLOY.md`](../../07-DEPLOY.md)