# Full-Stack Monorepo: Frontend + Backend en 1 Repo

Este boilerplate es para **prototipado rápido**:
- ✅ MVP en 2 semanas
- ✅ <10 endpoints
- ✅ Equipo pequeño (1-2 devs)
- ✅ 1 repo, 1 deploy a Vercel

**No es para**: Apps complejas con >10 endpoints

---

## 🎯 Ventajas Monorepo

| Aspecto | Ventaja |
|---|---|
| **Velocidad** | Frontend + backend juntos. Cambio → git push → live. |
| **Sincronización** | Mismo repo = código actualizado siempre. |
| **Tipos TypeScript** | Compartir tipos entre frontend y backend. |
| **1 deploy** | Vercel maneja ambas apps automáticamente. |
| **Desarrollo local** | `npm run dev` → todo funciona en localhost. |

---

## ⚡ Quick Start

### 1. Instalar

```bash
npm install
```

### 2. Crear .env

```bash
cp apps/api/.env.example apps/api/.env.local
# Edita con TURSO_URL y TURSO_TOKEN
```

### 3. Correr ambas apps

```bash
npm run dev
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

---

## 📁 Estructura

```
.
├─ apps/
│  ├─ web/              (Next.js frontend)
│  │  ├─ pages/
│  │  ├─ components/
│  │  ├─ lib/
│  │  └─ package.json
│  │
│  └─ api/              (Express backend)
│     ├─ src/
│     │  ├─ routes/
│     │  ├─ index.ts
│     │  └─ lib/
│     └─ package.json
│
├─ packages/            (código compartido)
│  └─ shared/
│     ├─ types.ts       (interfaces TypeScript)
│     └─ package.json
│
└─ package.json         (monorepo config)
```

---

## 💻 Ejemplo

### apps/api/src/index.ts (Backend Express)

```typescript
import express from 'express'
import cors from 'cors'
import { db } from './lib/db.js'

const app = express()

app.use(cors({ origin: 'http://localhost:3000' }))
app.use(express.json())

// GET /quotes
app.get('/quotes', async (req, res) => {
  const result = await db.execute('SELECT * FROM quotes')
  res.json({ data: result.rows })
})

// POST /quotes
app.post('/quotes', async (req, res) => {
  const { clientName, total } = req.body
  const id = crypto.randomUUID()
  
  await db.execute(
    'INSERT INTO quotes (id, client_name, total) VALUES (?, ?, ?)',
    [id, clientName, total]
  )
  
  res.status(201).json({ data: { id, clientName, total } })
})

app.listen(3001, () => console.log('Backend on :3001'))
```

### apps/web/pages/index.tsx (Frontend React)

```typescript
import { useState, useEffect } from 'react'

const API_URL = 'http://localhost:3001'

export default function Home() {
  const [quotes, setQuotes] = useState([])

  useEffect(() => {
    fetch(`${API_URL}/quotes`)
      .then(r => r.json())
      .then(({ data }) => setQuotes(data))
  }, [])

  const handleCreate = async () => {
    const res = await fetch(`${API_URL}/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientName: 'Acme', total: 5000 })
    })
    const { data } = await res.json()
    setQuotes([...quotes, data])
  }

  return (
    <div>
      <button onClick={handleCreate}>Create Quote</button>
      <ul>
        {quotes.map(q => (
          <li key={q[0]}>{q[1]} - ${q[2]}</li>
        ))}
      </ul>
    </div>
  )
}
```

---

## 🚀 Deploy a Vercel

### 1. Conectar GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin [URL]
git push -u origin main
```

### 2. Vercel

- Ve a [vercel.com](https://vercel.com)
- Import → GitHub → selecciona tu repo
- Vercel detecta monorepo automáticamente
- Env variables: TURSO_URL, TURSO_TOKEN
- Deploy automático en cada push

**Vercel configura**:
- Frontend en `https://tudominio.vercel.app`
- Backend en `https://api-tudominio.vercel.app`

---

## ⚠️ Limit: Si creces

**Si necesitas >10 endpoints:**

```
❌ PROBLEMA: Vercel free = máx 12 API routes
❌ PROBLEMA: Build lento si ambas apps son grandes
❌ PROBLEMA: No puedes escalar backend sin frontend

✅ SOLUCIÓN: Migra a Backend Separado
```

Proceso de migración:

1. **Copia** `apps/api/` a repo nuevo (`backend/`)
2. **Push** backend a Render (en lugar de Vercel)
3. **Configura** `apps/web/` para consumir backend remoto
4. **Deploy** frontend a Vercel, backend a Render

→ Ahora eres Backend Separado (ver `../../02-backend-separado/`)

---

## 📚 Casos de uso

### ✅ USA Monorepo si:
- MVP rápido (<2 semanas)
- Equipo pequeño (<3 devs)
- <10 endpoints
- Lógica simple

### ❌ NO USES Monorepo si:
- Esperas muchos endpoints
- Lógica de negocio compleja
- Equipos grandes
- Necesitas independencia de deploy

---

## ✅ Checklist

- [ ] `npm install` sin errores
- [ ] `.env.local` configurado en `apps/api/`
- [ ] BD Turso creada
- [ ] `npm run dev` → ambas apps corro
- [ ] Frontend: http://localhost:3000
- [ ] Backend: http://localhost:3001
- [ ] API responses en DevTools
- [ ] Ambos repos en GitHub
- [ ] Deploy a Vercel

---

## 📋 Estructura de carpetas recomendada

```
apps/web/
├─ pages/
│  ├─ index.tsx
│  ├─ quotes.tsx
│  └─ api/               (si necesitas API routes adicionales)
├─ components/
│  ├─ QuoteForm.tsx
│  └─ QuoteList.tsx
├─ lib/
│  ├─ api.ts            (cliente HTTP)
│  └─ hooks.ts          (custom hooks)
└─ styles/

apps/api/src/
├─ index.ts             (servidor)
├─ routes/
│  ├─ quotes.ts
│  └─ health.ts
├─ middleware/
│  ├─ auth.ts
│  └─ errorHandler.ts
└─ lib/
   └─ db.ts             (conexión Turso)
```

---

## 🔗 Recursos

- [Turborepo (monorepo tool)](https://turbo.build/repo)
- [Vercel + Monorepo](https://vercel.com/docs/concepts/monorepos)
- [Next.js Backend](https://nextjs.org/docs/api-routes/introduction)

¡Listo! 🚀
