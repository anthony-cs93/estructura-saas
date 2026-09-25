# ⚖️ Comparativa de 4 Arquitecturas SaaS

Una visión lado a lado de cada opción. Usa esto para validar tu decisión.

---

## 1️⃣ BaaS (Backend as a Service)

### 🎯 La idea
No escribes backend. Todo está en un tercero: Supabase, Firebase, Appwrite.
```
Tu código:   Frontend → APIs del BaaS (auth, DB, storage, functions)
Tercero:     Maneja servidor, BD, seguridad, escalabilidad
```

### ✅ Pros

| Aspecto | Ventaja |
|---|---|
| **Velocidad** | MVP en 3-5 días. Cero backend. |
| **Mantenimiento** | Tercero actualiza, asegura, escala. Tú solo frontend. |
| **Costo inicial** | Free tier generoso (Supabase: 2 DB gratis, usuarios unlimited). |
| **Escalabilidad automática** | Si crece tráfico, el servicio escala. Tú no haces nada. |
| **Auth incluida** | Supabase/Firebase ya tiene OAuth, email, SMS, 2FA. |
| **Realtime** | Mensajes en vivo sin WebSockets. |

### ❌ Contras

| Aspecto | Desventaja |
|---|---|
| **Lock-in** | Si migras de Supabase a otro, reescribes mucho. |
| **Límites de free tier** | Supabase: 8GB BD (ok para 100-500 users), pero compute limitado. |
| **No puedes esconder lógica** | Todo corre en frontend o en edge functions. Sin backend privado. |
| **Vendor risk** | Si Supabase cierra (unlikely pero posible), qué haces. |
| **Menos flexibilidad** | No puedes hacer integraciones externas complejas sin pagar. |
| **Edge functions caras** | Supabase functions en free tier: limitadas. |

### 💰 Costo (Free → Hobby)

| Tier | Costo | Límites |
|---|---|---|
| **Free** | $0 | 2 DBs, 8GB storage, 7-day backup, 10K auth users |
| **Pro** | ~$25/mes | 500GB, compute escalado, 10K auth users, priority support |

### 🏗️ Estructura típica
```
📁 mi-app/
├─ package.json
├─ src/
│  ├─ components/        (UI)
│  ├─ pages/             (routes)
│  ├─ lib/
│  │  ├─ supabase.ts     (cliente Supabase)
│  │  └─ auth.ts         (helper de auth)
│  └─ styles/
├─ .env.example          (SUPABASE_URL, SUPABASE_KEY)
└─ supabase/
   └─ functions/         (edge functions si necesitas)
```

### 🎓 Cuándo elegir BaaS

**SÍ elegir si:**
- ✅ App simple (CRUD, consultas)
- ✅ MVP rápido (<2 semanas)
- ✅ No tienes lógica de negocio compleja
- ✅ No necesitas esconder fórmulas/cálculos
- ✅ Usuarios <5K

**NO elegir si:**
- ❌ Cálculos complejos que proteger (como Modulax)
- ❌ Webhooks complejos o integraciones externas
- ❌ Esperás >10K usuarios pronto
- ❌ Necesitas control total de infraestructura

### 📚 Ejemplo: Supabase
```typescript
// Frontend React/Next.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(URL, KEY)

// Crear
await supabase.from('quotes').insert({
  clientName: 'Acme Corp',
  amount: 5000
})

// Leer
const { data } = await supabase
  .from('quotes')
  .select()
  .eq('status', 'pending')

// Auth
await supabase.auth.signUp({ email, password })
```

---

## 2️⃣ Serverless Puro (Next.js API Routes)

### 🎯 La idea
Todo en Vercel. Frontend + Backend en 1 repo, 1 deploy. Backend = Next.js API routes.

```
Vercel:      Maneja frontend + edge functions (hasta 12 free)
Tu código:   React components + API routes en /pages/api/
BD:          Conexión directa desde API routes a Turso/Supabase
```

### ✅ Pros

| Aspecto | Ventaja |
|---|---|
| **Velocidad** | 1 repo, 1 deploy. Cambias frontend+backend, git push y listo. |
| **Simplicidad** | No aprendes Express, Docker, variables env duplicadas. |
| **Free tier decente** | Vercel free: 12 functions, unlimited executions, custom domains. |
| **Mismo lenguaje** | Todo JavaScript/TypeScript. |
| **Deployment automático** | Push a GitHub → despliega automáticamente. |
| **Desarrollo local fácil** | `npm run dev` y todo funciona. |

### ❌ Contras

| Aspecto | Desventaja |
|---|---|
| **Límite de 12 functions** | Cada ruta = 1 function. 13 rutas = error. *(Este fue tu problema)* |
| **Timeouts** | Vercel free: 10 seg max (pro: 60 seg). Trabajos largo no caben. |
| **Memoria limitada** | No puedes procesar archivos grande. |
| **No puedes esconder código** | Alguien astuto puede ver tus cálculos en el bundle. |
| **Cold starts** | Cada request corre una nueva instancia. Latencia. |
| **Sin conexiones persistentes** | No hay WebSockets nativos. |

### 💰 Costo (Free → Pro)

| Tier | Costo | Límites |
|---|---|---|
| **Hobby** | $0 | 12 functions, 10 sec timeout, 6 Mbps bandwidth |
| **Pro** | $20/mes | Unlimited functions, 60 sec timeout, priority |

### 🏗️ Estructura típica
```
📁 mi-app/
├─ package.json
├─ pages/
│  ├─ index.tsx          (home)
│  ├─ quotes.tsx         (UI)
│  └─ api/
│     ├─ quotes.ts       (GET /quotes)
│     ├─ quotes/
│     │  └─ [id].ts      (GET /quotes/[id])
│     └─ auth.ts         (POST /auth/login)
├─ components/           (React components)
├─ lib/
│  └─ db.ts              (conexión a Turso)
├─ .env.example
└─ vercel.json
```

### 🎓 Cuándo elegir Serverless

**SÍ elegir si:**
- ✅ <10 endpoints necesarios
- ✅ Operaciones rápidas (<10 sec)
- ✅ MVP muy rápido
- ✅ No tienes workers cron complejos
- ✅ Usuarios <1K

**NO elegir si:**
- ❌ >10 endpoints (límite Vercel free)
- ❌ Procesamiento que tarda >10 sec
- ❌ Archivos grandes
- ❌ Calidad sobre velocidad
- ❌ (Lo sabe de tu experiencia)

### 📚 Ejemplo: Next.js API Route
```typescript
// pages/api/quotes.ts
import { turso } from '@/lib/db'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { clientName, amount } = req.body
    
    const quote = await turso.execute(
      'INSERT INTO quotes (client_name, amount) VALUES (?, ?)',
      [clientName, amount]
    )
    
    return res.status(201).json(quote)
  }
  
  // GET
  const quotes = await turso.execute('SELECT * FROM quotes')
  res.status(200).json(quotes.rows)
}
```

---

## 3️⃣ Full-Stack Monorepo

### 🎯 La idea
Frontend + Backend en 1 repo, 1 deploy a Vercel. Backend = Express/Node.js dentro de Next.js.

```
Vercel:      Frontend + backend functions
Tu código:   /app (Next.js) + /server (Express) en 1 git repo
Deploy:      1 solo comando, todo a Vercel
```

### ✅ Pros

| Aspecto | Ventaja |
|---|---|
| **1 repo, 1 deploy** | Git push → todo se despliega junto. |
| **Sin infraestructura duplicada** | 1 .env, 1 variable de BD, 1 deployment. |
| **Desarrollo rápido** | Cambios frontend+backend, `npm run dev` y listo. |
| **Compartir tipos TypeScript** | Frontend y backend en TypeScript, mismo repo = tipos compartidos. |
| **Simplicidad inicial** | Ideal para prototipado muy rápido. |
| **Menos operacional** | 1 hosting = menos cosas que romper. |

### ❌ Contras

| Aspecto | Desventaja |
|---|---|
| **Límite de 12 functions** | *(El problema que tuviste)* Cuando crece, te topes con Vercel. |
| **Difícil separar después** | Si necesitas escalar, reescribir es doloroso. |
| **Build time** | Si `/server` es grande, el build de Vercel se ralentiza. |
| **Tecnología fija** | Tienes que usar lo que Vercel soporta. ¿Quieres Python en backend? No. |
| **Menos flexible** | No puedes usar herramientas que Vercel no soporta. |
| **Escalabilidad limited** | Vercel puede escalar frontend pero no backend complejo. |

### 💰 Costo (Free → Pro)

Igual que Vercel Hobby/Pro (arriba).

### 🏗️ Estructura típica
```
📁 monorepo/
├─ package.json           (workspace)
├─ apps/
│  ├─ web/               (Next.js frontend)
│  │  ├─ pages/
│  │  ├─ public/
│  │  └─ package.json
│  └─ api/               (Express backend)
│     ├─ src/
│     │  ├─ routes/
│     │  ├─ middleware/
│     │  └─ index.ts
│     └─ package.json
├─ packages/
│  └─ shared/            (tipos compartidos)
│     ├─ types.ts
│     └─ package.json
├─ .env.example
└─ vercel.json           (config para ambas apps)
```

### 🎓 Cuándo elegir Full-Stack

**SÍ elegir si:**
- ✅ MVP rápido (<10 endpoints)
- ✅ Prototipado / validación de idea
- ✅ Equipo pequeño (solo tú)
- ✅ Lógica simple
- ✅ Dispuesto a migrar después si crece

**NO elegir si:**
- ❌ Ya sabes que tendrás >10 endpoints
- ❌ Lógica compleja que proteger
- ❌ Esperás crecer rápido
- ❌ Quieres separar frontend/backend teams

### 📚 Ejemplo: Monorepo
```typescript
// apps/api/src/routes/quotes.ts
import express from 'express'
import { turso } from '@/lib/db'

const router = express.Router()

router.post('/', async (req, res) => {
  const { clientName, amount } = req.body
  const quote = await turso.execute(
    'INSERT INTO quotes (...) VALUES (...)',
    [clientName, amount]
  )
  res.json(quote)
})

export default router
```

```typescript
// apps/web/pages/index.tsx
import { useEffect, useState } from 'react'

export default function Home() {
  const [quotes, setQuotes] = useState([])
  
  useEffect(() => {
    fetch('/api/quotes').then(r => r.json()).then(setQuotes)
  }, [])
  
  return <div>{/* render quotes */}</div>
}
```

---

## 4️⃣ Backend Separado

### 🎯 La idea
Frontend (Vercel) + Backend (Render/Railway/DigitalOcean) en repos/hosts distintos.

```
Frontend:    Next.js → Vercel
Backend:     Express → Render/Railway
BD:          Turso o Supabase (la misma para ambos)
```

### ✅ Pros

| Aspecto | Ventaja |
|---|---|
| **Sin límite de endpoints** | Render no te limita a 12 functions. 50? 200? Sin problema. |
| **Arquitectura escalable** | Si backend crece, escalas solo backend. Frontend sigue en Vercel. |
| **Separación de concerns** | Frontend dev puede trabajar sin tocar backend. |
| **Tecnología flexible** | Backend puede ser Node, Python, Go. Frontend es React. |
| **Mejor para equipos** | Frontend team ≠ Backend team. Cada uno en su repo. |
| **Proteger lógica** | Cálculos, secretos, integraciones → todo en backend privado. |
| **Debugging fácil** | Lógica centralized en un lugar. Logs claros. |

### ❌ Contras

| Aspecto | Desventaja |
|---|---|
| **Más infraestructura** | 2 hosts = 2 configs, 2 deploys, 2 monitoreos. |
| **Setup más complejo** | Env variables duplicadas, CORS, auth entre servicios. |
| **Latencia de red** | Frontend → Backend = network call. +50-100ms extra. |
| **Render free duerme** | Después de 15 min sin tráfico → instancia duerme → cold start. |
| **Deploy coordinado** | Si cambias API, frontend necesita cambiar. Dos deploys. |
| **Debugging remoto** | Si algo falla en producción, es más difícil debuguear. |

### 💰 Costo (Free → Paid)

Frontend (Vercel):
- Free: ilimitado

Backend (Render):
- Free: 1 servicio, duerme después de 15 min inactividad
- Starter: ~$7/mes, no duerme

BD (Turso):
- Free: 3 DBs, 8GB total
- Paid: $29/mes por 40GB

**Total**: ~$7-40/mes si pagas todo.

### 🏗️ Estructura típica
```
📁 frontend/ (Vercel)
├─ package.json
├─ pages/
├─ components/
├─ lib/
│  └─ api.ts      (fetch a backend)
├─ .env.example
└─ vercel.json

📁 backend/ (Render)
├─ package.json
├─ src/
│  ├─ routes/
│  ├─ middleware/
│  ├─ controllers/
│  └─ index.ts
├─ .env.example
├─ Dockerfile     (para Render)
└─ render.yaml
```

### 🎓 Cuándo elegir Backend Separado

**SÍ elegir si:**
- ✅ Lógica compleja (como Modulax)
- ✅ >10 endpoints
- ✅ Necesitas proteger cálculos
- ✅ Esperás crecer a 1K+ usuarios
- ✅ Equipos separados frontend/backend
- ✅ Integración con APIs externas complejas

**NO elegir si:**
- ❌ Prototipado ultra rápido
- ❌ Equipo muy pequeño (1 persona), cansada
- ❌ Lógica simple
- ❌ Budget cero absoluto

### 📚 Ejemplo: Backend Separado

**Backend (Express en Render)**
```typescript
// backend/src/routes/quotes.ts
import express from 'express'
import { turso } from '../lib/db'

const router = express.Router()

router.post('/', async (req, res) => {
  const { clientName, items, discountPercent } = req.body
  
  // LÓGICA PROTEGIDA: Calcular precio
  let subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0)
  const discount = subtotal * (discountPercent / 100)
  const total = subtotal - discount
  
  // Guardar en BD
  const quote = await turso.execute(
    'INSERT INTO quotes (...) VALUES (...)',
    [clientName, subtotal, discount, total]
  )
  
  res.json({ id: quote.id, total })
})

export default router
```

**Frontend (React/Next.js en Vercel)**
```typescript
// frontend/lib/api.ts
const API = process.env.NEXT_PUBLIC_API_URL

export async function createQuote(data) {
  const res = await fetch(`${API}/quotes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return res.json()
}

// frontend/pages/quotes/new.tsx
import { createQuote } from '@/lib/api'

export default function NewQuote() {
  const handleSubmit = async (e) => {
    e.preventDefault()
    const quote = await createQuote({
      clientName: 'Acme',
      items: [...],
      discountPercent: 10
    })
    console.log('Quote created:', quote)
  }
  
  return <form onSubmit={handleSubmit}>...</form>
}
```

---

## 📊 Tabla Resumen

| Criterio | BaaS | Serverless | Full-Stack | Backend Sep. |
|---|---|---|---|---|
| **Velocidad MVP** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Mantenibilidad** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Escalabilidad** | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Costo (free)** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Control** | ⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Proteger lógica** | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 🎯 Mi recomendación para TI específicamente

Basado en tu experiencia:

1. **Modulax (existente)**: Mantienes Backend Separado ✅
2. **App Contable (nueva)**: Empieza con **BaaS** o **Serverless**, escala a Backend Sep. si crece
3. **Próximo proyecto complejo**: Directamente **Backend Separado**
4. **Catálogos/consultas**: **BaaS** sin dudarlo

---

## 🔗 Próximos pasos

1. **Elegiste arquitectura**: Ve a `03-FASES-DESARROLLO.md`
2. **Quieres la guía paso a paso**: Ve a `templates/[tu-arquitectura]/`
3. **Quieres aprender más**: Ve a [04-ARQUITECTURA.md](04-ARQUITECTURA.md)

¡Vamos! 🚀
