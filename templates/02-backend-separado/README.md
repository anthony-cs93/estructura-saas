# Backend Separado: Frontend (Vercel) + Backend (Render)

Este boilerplate es para apps SaaS que necesitan:
- ✅ Lógica compleja en backend (como Modulax)
- ✅ >10 endpoints
- ✅ Proteger cálculos y secretos
- ✅ Escalabilidad sin re-arquitecturizar

---

## 🎯 Estructura

```
.
├─ frontend/           (React/Next.js → Vercel)
│  ├─ pages/
│  ├─ components/
│  ├─ lib/
│  │  ├─ api.ts        (Cliente HTTP)
│  │  └─ hooks/        (Custom hooks)
│  └─ .env.example
│
└─ backend/            (Express → Render) — starter mínimo
   ├─ src/
   │  ├─ index.ts      (Servidor)
   │  ├─ routes/       (Endpoints)
   │  ├─ lib/          (Lógica compartida)
   │  └─ middleware/   (Validación, errores)
   └─ .env.example
```

---

## ⭐ Backend canónico (recomendado para producción)

El `backend/` de esta carpeta es un **starter mínimo** (rutas que acceden directo a la BD).
Para una app SaaS real, usa el backend de referencia
**[`../../boilerplate-backend/`](../../boilerplate-backend/)** — mismo Express + Turso, pero con la
arquitectura en capas:

```
backend/
├─ src/
│  ├─ config/env.ts              # entorno validado (fail-fast)
│  ├─ db/
│  │  ├─ client.ts              # conexión única
│  │  ├─ migrate.ts             # migraciones versionadas con reintentos
│  │  └─ migrations/            # una migración por archivo
│  ├─ lib/                       # errors, http, validation, audit
│  ├─ middleware/                # auth, requireRole, plan, rateLimit, errorHandler
│  ├─ modules/<dominio>/         # <dominio>.repository / .service / .schemas / .routes
│  ├─ routes.ts                  # composición de routers
│  └─ index.ts                   # app factory (createApp sin listen)
```

Aporta, además: auth por cookie `httpOnly` + cuenta activa, planes y feature gating,
rate limiting, auditoría, gestión de cuenta y migraciones versionadas.

- Diseño y decisiones: **[../../04-ARQUITECTURA.md](../../04-ARQUITECTURA.md)**
- Código copiable: **[../../05-PATRONES-CODIGO.md](../../05-PATRONES-CODIGO.md)**
- Agregar módulos: **[../../06-CHECKLIST-MODULO.md](../../06-CHECKLIST-MODULO.md)**
- Despliegue (patrón C, Vercel + Render): **[../../07-DEPLOY.md](../../07-DEPLOY.md)**

**Regla**: las rutas no acceden a la BD; solo el `repository`. La lógica vive en el `service`.
El backend de esta carpeta sirve para prototipar rápido; migra a las capas antes de producción.

---

## ⚡ Quick Start (5 minutos)

### 1. Setup Backend

```bash
cd backend
cp .env.example .env.local

# Edita .env.local con tus credenciales de Turso
# TURSO_URL=libsql://...
# TURSO_TOKEN=...

npm install
npm run dev
# Backend corre en http://localhost:3001
```

### 2. Setup Frontend

```bash
cd frontend
cp .env.example .env.local

# Edita .env.local
# NEXT_PUBLIC_API_URL=http://localhost:3001

npm install
npm run dev
# Frontend corre en http://localhost:3000
```

### 3. Test

Abre http://localhost:3000 en el navegador. Debería funcionar.

---

## 📦 Crear la BD en Turso

```bash
# Instala CLI de Turso (si no tienes)
npm install -D @libsql/cli

# Crear DB
turso db create mi-app-db

# Ver URL y token
turso db show mi-app-db --http

# Copia estos valores a backend/.env.local
```

---

## 🚀 Deployment

### Frontend → Vercel

```bash
cd frontend

# Opción 1: GitHub + Vercel (automático)
# 1. Push a GitHub
# 2. Vercel conecta automáticamente
# 3. Cada push a main = deploy automático

# Opción 2: Deploy manual
npm install -g vercel
vercel
# Sigue las instrucciones
```

**Variables en Vercel**:
- Settings → Environment Variables
- `NEXT_PUBLIC_API_URL` = `https://api.tudominio.com`

### Backend → Render

```bash
# 1. Push backend a GitHub
# 2. Ve a render.com → New → Web Service
# 3. Conecta GitHub repo
# 4. Build: npm install
# 5. Start: npm run start
# 6. Agrega env variables

# Variables en Render:
# - TURSO_URL
# - TURSO_TOKEN
# - FRONTEND_URL = https://tudominio.com
```

---

## 📋 File Structure Detallado

### Frontend - `lib/api.ts`

Cliente HTTP que maneja todas las requests al backend:

```typescript
import { api } from '@/lib/api'

// GET
const { data, error } = await api.get<Quote[]>('/quotes')

// POST
const { data } = await api.post('/quotes', { clientName, total })

// PUT
await api.put(`/quotes/${id}`, { status: 'sent' })

// DELETE
await api.delete(`/quotes/${id}`)
```

### Frontend - `lib/hooks/useQuotes.ts`

Hook React que maneja estado de quotes:

```typescript
import { useQuotes } from '@/lib/hooks/useQuotes'

export function MyComponent() {
  const { quotes, loading, error, createQuote } = useQuotes()
  
  const handleCreate = async () => {
    await createQuote('Acme Corp', 5000)
  }
  
  return (
    <div>
      {loading && <p>Loading...</p>}
      {quotes.map(q => <div key={q.id}>{q.clientName}</div>)}
    </div>
  )
}
```

### Backend - `src/index.ts`

Servidor Express. Configura CORS, rutas, error handling:

```typescript
app.use(cors({
  origin: 'https://tudominio.com',
  credentials: true
}))

app.use('/quotes', quotesRouter)
```

### Backend - `src/lib/db.ts`

Conexión a Turso. Helpers para queries comunes:

```typescript
// Crear una quote
await queries.createQuote(id, clientName, total)

// Obtener todas
const result = await queries.getQuotes()
```

### Backend - `src/routes/quotes.ts`

Endpoints CRUD de quotes. **AQUÍ es donde va la lógica de negocio**:

```typescript
router.post('/', validateQuoteInput, async (req, res) => {
  const { clientName, total } = req.body
  
  // LÓGICA PROTEGIDA: Validar, calcular, etc
  if (total < 0) return res.status(400).json({ error: 'Invalid' })
  
  // Guardar en BD
  await queries.createQuote(id, clientName, total)
  
  res.status(201).json({ id, clientName, total })
})
```

---

## 🔐 Proteger Lógica (Cálculos como en Modulax)

**El patrón**:

1. **Frontend**: Muestra cálculo "optimista" para UX rápida
2. **Backend**: Valida y recalcula TODO

```typescript
// Frontend: mostrar precio provisional
function QuoteForm() {
  const [items, setItems] = useState([])
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  
  return (
    <div>
      <p>Subtotal: {subtotal}</p>
      <button onClick={() => submit({ items })}>
        Enviar a servidor para validar
      </button>
    </div>
  )
}

// Backend: RECALCULAR desde cero
router.post('/quotes', async (req, res) => {
  const { items } = req.body
  
  // Obtener PRECIOS REALES de BD (nadie puede falsificar)
  const realItems = await db.execute(
    'SELECT id, price FROM items WHERE id IN (...)',
    items.map(i => i.id)
  )
  
  // Recalcular desde cero
  let total = 0
  for (const item of realItems) {
    const requestItem = items.find(i => i.id === item.id)
    total += item.price * requestItem.qty  // ← Precio verdadero
  }
  
  // Guardar
  await db.execute('INSERT INTO quotes (...)', [total])
  
  res.json({ total })  // ← Frontend NO puede modificar
})
```

---

## ✅ Checklist antes de ir a producción

- [ ] Backend `.env` tiene TURSO_URL y TURSO_TOKEN reales
- [ ] Frontend `.env` tiene NEXT_PUBLIC_API_URL correcta
- [ ] CORS configurado para tu dominio (no localhost)
- [ ] BD Turso en producción (no dev database)
- [ ] Ambos repos en GitHub
- [ ] Frontend desplegado a Vercel
- [ ] Backend desplegado a Render
- [ ] Variables de ambiente en Vercel y Render
- [ ] Test de un flow completo (crear → listar → editar → borrar)
- [ ] Console sin errores
- [ ] Network requests con status 200

---

## 🐛 Debugging

### Backend no responde

```bash
# Verifica que esté corriendo
curl http://localhost:3001/health

# Checa logs en terminal

# Si está en Render en producción:
# Render dashboard → Logs → mira los errores
```

### Frontend no conecta al backend

```bash
# Abre DevTools (F12) → Network tab
# Haz clic en un botón que debería hacer request
# Mira la request: ¿status 200? ¿CORS error?

# Si ves CORS error:
# Backend: agrega tu dominio a cors()
app.use(cors({
  origin: 'https://tudominio.com'  // ← Agregar aquí
}))
```

### BD vacía

```bash
# Verifica que la tabla existe
turso db shell mi-app-db
> SELECT * FROM quotes;

# Si no existe, inserta desde backend:
POST http://localhost:3001/quotes
{ "clientName": "Test", "total": 100 }
```

---

## 📚 Referencia Rápida

| Tarea | Comando |
|---|---|
| Backend local | `cd backend && npm run dev` |
| Frontend local | `cd frontend && npm run dev` |
| Build para producción | `cd [folder] && npm run build` |
| Ver logs Render | Render dashboard → Logs |
| Ver logs Vercel | Vercel dashboard → Deployments |
| Resetear BD | `turso db destroy mi-app-db` |

---

## 🎓 Próximas mejoras

Ya incluidas en `../../boilerplate-backend/` (úsalo como base):

- [x] Autenticación (cookie `httpOnly` + `jose`)
- [x] Rate limiting por endpoint
- [x] Planes, cuotas y feature gating
- [x] Auditoría y gestión de cuenta
- [x] Migraciones versionadas

Después de MVP:

- [ ] Error tracking (Sentry)
- [ ] Analytics
- [ ] Caché en frontend (SWR, React Query)
- [ ] Tests (Jest, Vitest)
- [ ] Webhooks a terceros

---

## 💬 Contacto

Preguntas? Consulta `../../04-ARQUITECTURA.md` y `../../05-PATRONES-CODIGO.md` para más detalles.

¡Buena suerte! 🚀
