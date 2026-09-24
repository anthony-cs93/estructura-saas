# Serverless: Next.js API Routes Puro

Este boilerplate es para apps **simples con <10 endpoints**:
- ✅ Consultas directas a BD
- ✅ CRUD básico
- ✅ MVP rápido sin backend separado
- ✅ 1 deploy a Vercel

**No es para**: Apps con >10 endpoints (límite Vercel free)

---

## 🎯 Ventajas Serverless

| Aspecto | Ventaja |
|---|---|
| **Velocidad** | 1 repo, 1 deploy. Cambios → git push → live. |
| **Simplicidad** | Frontend + Backend en mismo código. |
| **Gratuito** | Vercel free: 12 API routes, unlimited executions. |
| **Escalado automático** | Vercel maneja todo. |
| **Mismo lenguaje** | JavaScript/TypeScript en todo. |

---

## ⚡ Quick Start

### 1. Crear BD

```bash
# Turso
npm install -D @libsql/cli
turso db create mi-app-db
turso db show mi-app-db --http

# Copiar URL y token a .env.local
```

### 2. Instalar y correr

```bash
npm install
npm run dev
# http://localhost:3000
```

### 3. Crear tabla

En Turso CLI:
```sql
turso db shell mi-app-db
> CREATE TABLE quotes (
    id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    total REAL NOT NULL,
    status TEXT DEFAULT 'draft'
  );
```

---

## 📁 Estructura

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

## 💻 Ejemplo: API route

### pages/api/quotes.ts

```typescript
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Listar
    const result = await db.execute('SELECT * FROM quotes')
    return res.json({ data: result.rows })
  }

  if (req.method === 'POST') {
    // Crear
    const { clientName, total } = req.body
    
    const id = crypto.randomUUID()
    await db.execute(
      'INSERT INTO quotes (id, client_name, total) VALUES (?, ?, ?)',
      [id, clientName, total]
    )
    
    return res.status(201).json({ data: { id, clientName, total } })
  }

  res.status(405).json({ error: 'Not allowed' })
}
```

### pages/index.tsx (Frontend)

```typescript
import { useState, useEffect } from 'react'

export default function Home() {
  const [quotes, setQuotes] = useState([])
  const [clientName, setClientName] = useState('')
  const [total, setTotal] = useState('')

  useEffect(() => {
    fetchQuotes()
  }, [])

  const fetchQuotes = async () => {
    const res = await fetch('/api/quotes')
    const { data } = await res.json()
    setQuotes(data)
  }

  const handleCreate = async () => {
    const res = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientName, total: parseFloat(total) })
    })
    
    const { data } = await res.json()
    setQuotes([...quotes, data])
    setClientName('')
    setTotal('')
  }

  return (
    <div>
      <input
        placeholder="Client name"
        value={clientName}
        onChange={(e) => setClientName(e.target.value)}
      />
      <input
        type="number"
        placeholder="Total"
        value={total}
        onChange={(e) => setTotal(e.target.value)}
      />
      <button onClick={handleCreate}>Create</button>

      <ul>
        {quotes.map((q) => (
          <li key={q[0]}>
            {q[1]} - ${q[2]}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

---

## 🚀 Deploy

```bash
# 1. Push a GitHub
git push origin main

# 2. Vercel conecta automáticamente
# (settings → GitHub → connect repo)

# 3. Env variables en Vercel dashboard:
# TURSO_URL=...
# TURSO_TOKEN=...

# 4. Cada push = deploy automático
```

---

## ⚠️ Límites (Por qué NO elegir si tienes muchos endpoints)

| Límite | Free | Pro |
|---|---|---|
| **API Routes** | 12 | Unlimited |
| **Timeout** | 10 sec | 60 sec |
| **Memoria** | 512 MB | Más |
| **Concurrent** | Limitado | Más |

**Si tienes >10 endpoints**: Migra a Backend Separado.

---

## ✅ Checklist

- [ ] DB Turso creada
- [ ] TURSO_URL y TURSO_TOKEN en `.env.local`
- [ ] Tabla `quotes` creada
- [ ] `npm run dev` funciona
- [ ] API route `/api/quotes` responde
- [ ] Frontend conecta a API
- [ ] Deploy a Vercel
- [ ] Env vars en Vercel

---

## 🔗 Próximo: si creces

Si necesitas >10 endpoints:

1. Copia tu BD (Turso se queda igual)
2. Crea carpeta `backend/` con Express
3. Mueve lógica de `/api` a Express
4. Deploy backend a Render
5. Frontend consume backend (no API routes)

→ Ahora tienes Backend Separado (ver `../../02-backend-separado/`)

¡Listo! 🚀
