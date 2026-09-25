# Guía: BaaS — Supabase (Sin Backend)

Guía paso a paso para montar una app SaaS **principalmente CRUD** sin escribir backend:
Supabase gestiona base de datos, autenticación, archivos y tiempo real.

**Para**:
- ✅ Catálogos de productos
- ✅ Gestión de inventario
- ✅ Dashboards de lectura
- ✅ Formularios simples

**No es para**: apps con lógica compleja o cálculos que deban protegerse (como Modulax).

---

## 🎯 Ventajas

| Aspecto | Ventaja |
|---|---|
| **Velocidad** | MVP en 3-5 días. No escribes backend. |
| **Mantenimiento** | Supabase maneja servers, backups, scaling. |
| **Costo** | Free tier generoso (2 DBs, 8GB, usuarios ilimitados). |
| **Auth incluida** | OAuth, email, SMS, 2FA. Gratis. |
| **Realtime** | WebSockets automáticos. Perfecto para dashboards. |

---

## 📁 Estructura recomendada

```
src/
├─ components/
│  ├─ QuoteForm.tsx       (crear registros)
│  └─ QuoteList.tsx       (listar registros)
├─ pages/
│  ├─ index.tsx           (home)
│  └─ api/
│     └─ auth.ts          (callbacks de auth)
├─ lib/
│  └─ supabase.ts         (cliente + helpers)
└─ styles/
```

---

## ⚡ Pasos de montaje

1. **Crea el proyecto Supabase** en [supabase.com](https://supabase.com): New project → copia
   la **URL** y la **anon key**.
2. **Crea las tablas** en el SQL Editor del dashboard. Habilita **RLS (Row Level Security)**
   para que cada usuario vea solo sus datos (políticas `auth.uid() = user_id`).
3. **Configura el cliente**: crea `lib/supabase.ts` con el cliente de Supabase usando las
   variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. **Crea helpers** de acceso a datos (listar, crear, actualizar, borrar) en `lib/supabase.ts`.
5. **Construye la UI**: componentes que consumen esos helpers (formularios, listas).
6. **Auth (opcional)**: usa la autenticación integrada (signup, login, logout, usuario actual)
   y los componentes de UI de Supabase si quieres un login listo.

---

## 🔐 RLS (Row Level Security)

Para que cada usuario vea solo sus registros:

1. Habilita RLS en cada tabla (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).
2. Crea políticas `FOR SELECT` / `FOR INSERT` / `FOR UPDATE` / `FOR DELETE` usando
   `auth.uid() = user_id`.
3. `supabase/schema.sql` es la fuente única del esquema + políticas.

> La seguridad vive en **RLS de Postgres**, no en el código del navegador. La anon key es
> pública: todo secreto (pagos, cálculos propietarios, admin cross-tenant) exige un backend
> propio (ver `../../02-backend-separado/`).

---

## 🚀 Deploy

1. Sube el repo a GitHub.
2. Conecta el repo en Vercel (deploy automático en cada push).
3. Configura las variables de entorno en Vercel (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

---

## 💡 Limitaciones

❌ **No puedes**:
- Esconder cálculos (todo es frontend)
- Procesar archivos grandes
- Webhooks complejos
- Integraciones backend complejas

✅ **Si necesitas eso**: migra a **Backend Separado** (ver `../../02-backend-separado/`).
Tus tablas Supabase se quedan igual.

---

## ✅ Checklist

- [ ] Proyecto Supabase creado
- [ ] URL y anon key en `.env.local`
- [ ] Tablas creadas con RLS habilitado
- [ ] Cliente y helpers en `lib/supabase.ts`
- [ ] Flujo de crear y listar probado
- [ ] Deploy a Vercel con variables de entorno

---

## 🔗 Referencias

- Frontend de referencia: [`../../boilerplate-frontend/`](../../boilerplate-frontend/)
- Guía del frontend: [`../../08-FRONTEND.md`](../../08-FRONTEND.md)
- Patrón A (BaaS) en detalle: [`../../07-DEPLOY.md`](../../07-DEPLOY.md)
- Comparativa de arquitecturas: [`../../02-COMPARATIVA-OPCIONES.md`](../../02-COMPARATIVA-OPCIONES.md)
- [Supabase Docs](https://supabase.com/docs)
- [RLS en Supabase](https://supabase.com/docs/guides/auth/row-level-security)