# Guía: Backend Separado — Frontend (Vercel) + Backend (Render)

Guía paso a paso para montar una app SaaS con **frontend y backend en repos distintos**,
cada uno con su propio despliegue.

**Para**: apps SaaS que necesitan:
- ✅ Lógica compleja en backend (como Modulax)
- ✅ >10 endpoints
- ✅ Proteger cálculos y secretos
- ✅ Escalabilidad sin re-arquitecturizar

---

## 🎯 Estructura

```
proyecto/
├─ frontend/           (Next.js → Vercel)
│  ├─ pages/
│  ├─ components/
│  ├─ lib/
│  │  ├─ api.ts        (cliente HTTP)
│  │  └─ hooks/        (custom hooks)
│  └─ .env.local
│
└─ backend/            (Express → Render)
   ├─ src/
   │  ├─ index.ts      (servidor)
   │  ├─ routes/       (endpoints)
   │  ├─ lib/          (lógica compartida)
   │  └─ middleware/   (validación, errores)
   └─ .env.local
```

> **Backend canónico**: para producción usa el backend de referencia
> **[`../../boilerplate-backend/`](../../boilerplate-backend/)** — mismo Express + Turso, pero
> con arquitectura en capas (service/repository), auth por cookie, planes, rate limiting,
> auditoría y migraciones versionadas.

---

## ⚡ Pasos de montaje

### 1. Backend

1. Copia el esqueleto de `boilerplate-backend/` en `backend/` (o reconstruye con
   `../../05-PATRONES-CODIGO.md`).
2. Crea `.env.local` con las credenciales de Turso (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`),
   `JWT_SECRET` y `CORS_ORIGIN`.
3. Instala dependencias y arranca el servidor en `http://localhost:3001`.

### 2. Frontend

1. Crea la app Next.js en `frontend/`.
2. Configura el cliente HTTP en `lib/api.ts` apuntando al backend local
   (`NEXT_PUBLIC_API_URL=http://localhost:3001`).
3. Crea los hooks de datos en `lib/hooks/` (estado, carga, errores).
4. Arranca en `http://localhost:3000`.

### 3. Test

Abre `http://localhost:3000` y prueba un flujo completo (crear → listar → editar → borrar).

---

## 🔐 Proteger lógica (cálculos como en Modulax)

El patrón:

1. **Frontend**: muestra un cálculo "optimista" para UX rápida.
2. **Backend**: valida y **recalcula todo** desde la base de datos (nadie puede falsificar precios).

Regla de oro: nunca confíes en el frontend para operaciones críticas; valida siempre en el
servidor. Las reglas de negocio viven en el `service`, no en las rutas ni en el navegador
(ver `../../04-ARQUITECTURA.md`).

---

## 🚀 Deploy

### Frontend → Vercel

1. Sube `frontend/` a GitHub.
2. Conecta el repo en Vercel (deploy automático en cada push).
3. Configura `NEXT_PUBLIC_API_URL` = URL del backend en producción.

### Backend → Render

1. Sube `backend/` a GitHub.
2. En Render: New → Web Service → conecta el repo.
3. Build: `npm install` · Start: `npm run start`.
4. Agrega las variables de entorno (`TURSO_*`, `JWT_SECRET`, `CORS_ORIGIN`, `FRONTEND_URL`).

> ⚠️ Frontend y backend en dominios distintos → la cookie de sesión es de terceros y el
> navegador puede bloquearla. Lee la sección de cookies en `../../07-DEPLOY.md` antes de
> desplegar.

---

## ✅ Checklist antes de producción

- [ ] Backend con `.env` real (Turso, JWT, CORS)
- [ ] Frontend con `NEXT_PUBLIC_API_URL` correcta
- [ ] CORS configurado para tu dominio (no localhost)
- [ ] BD Turso de producción (no dev)
- [ ] Frontend desplegado a Vercel
- [ ] Backend desplegado a Render
- [ ] Variables de entorno en Vercel y Render
- [ ] Flujo completo probado en producción
- [ ] Cookie de sesión funcionando (ver `07-DEPLOY.md`)

---

## 🐛 Debugging rápido

| Problema | Qué revisar |
|---|---|
| Backend no responde | `curl http://localhost:3001/health` · logs de Render |
| Frontend no conecta | DevTools → Network: ¿status 200? ¿CORS error? |
| CORS error | Agrega tu dominio a `CORS_ORIGIN` en el backend |
| BD vacía | Verifica la tabla con el CLI de Turso |

---

## 🔗 Referencias

- Backend de referencia: [`../../boilerplate-backend/`](../../boilerplate-backend/)
- Arquitectura y decisiones: [`../../04-ARQUITECTURA.md`](../../04-ARQUITECTURA.md)
- Piezas de código copiables: [`../../05-PATRONES-CODIGO.md`](../../05-PATRONES-CODIGO.md)
- Agregar módulos: [`../../06-CHECKLIST-MODULO.md`](../../06-CHECKLIST-MODULO.md)
- Despliegue (patrón C, Vercel + Render): [`../../07-DEPLOY.md`](../../07-DEPLOY.md)