# 🚀 Fases de Desarrollo: Idea → Producción

Una roadmap de 4 fases. Cada fase tiene tasks, checklists, y duración estimada.

---

## Fase 1: PRE-DESARROLLO (Días -2 a 0)

**Objetivo**: Decidir arquitectura y estar listo para codinear.
**Duración**: 1-2 días
**Entregable**: Architecture decision document + estructura base montada

### 1.1 Define el scope

- [ ] **Tipo de app**: ¿Qué hace? (ej: cotizador, gestor de inventario, etc)
- [ ] **Usuarios iniciales**: ¿Cuántos usuarios esperas? (100, 500, 1K?)
- [ ] **Funcionalidades MVP**: Ej: Auth + crear quotes + listar quotes
- [ ] **Integraciones necesarias**: ¿APIs externas? ¿Webhooks?

**Preguntas claves**:
```
- ¿Cuántos endpoints necesito? (cuenta)
- ¿Hay cálculos complejos que proteger?
- ¿Está OK procesar en frontend o DEBE ser backend?
- ¿Tiempo límite para MVP? (semanas)
```

### 1.2 Responde la matriz de decisión

Ve a `01-MATRIZ-DECISION.md` y responde las 3 preguntas.

**Output**: Arquitectura elegida (BaaS / Serverless / Full-Stack / Backend Sep.)

### 1.3 Valida la decisión

Lee la comparativa de tu arquitectura en `02-COMPARATIVA-OPCIONES.md`.

- [ ] Entendí los pros y contras
- [ ] Confirmé que es la correcta
- [ ] Estoy listo para empezar

### 1.4 Prepara ambiente

```bash
# Node.js 18+
node --version   # v18.13.0 o mayor

# Git
git --version

# Editor
# VSCode con Prettier + ESLint

# Cuentas necesarias
# - Vercel (para deploy frontend)
# - GitHub (para repos)
# - Turso o Supabase (para BD)
# - Render o Railway (si usas backend separado)
```

### 1.5 Monta la estructura base

Sigue la guía de tu arquitectura en `templates/[tu-arquitectura]/` y usa
`boilerplate-backend/` como esqueleto del backend y `boilerplate-frontend/` como
esqueleto del frontend:

```bash
cd ~/projects
mkdir mi-app && cd mi-app
# 1. Sigue los pasos de la guía de tu arquitectura
# 2. Copia boilerplate-backend/ como base del backend
# 3. Copia boilerplate-frontend/ como base del frontend
# 4. npm install
```

Cada arquitectura tiene su guía en `templates/`.

### 📋 Checklist Fase 1

- [ ] Scope definido (tipo de app, usuarios, funcionalidades)
- [ ] Matriz de decisión respondida
- [ ] Arquitectura validada
- [ ] Ambiente preparado (Node.js, Git, editor)
- [ ] Estructura base montada y dependencies instaladas
- [ ] Cuentas creadas (Vercel, Turso/Supabase, etc)
- [ ] `.env.example` → `.env.local` con credentials reales

---

## Fase 2: SETUP INICIAL (Días 1-2)

**Objetivo**: Estructura base funcionando localmente.
**Duración**: 1-2 días
**Entregable**: App corriendo en `localhost`, git repo limpio, BD conectada

### 2.1 Setup de la BD

#### Si usas Turso:
```bash
# Instalar CLI
npm install -D @libsql/cli

# Crear DB
turso db create mi-app-db

# Obtener URL y token
turso db show mi-app-db --http

# Guardar en .env.local
TURSO_URL=libsql://...
TURSO_TOKEN=...
```

#### Si usas Supabase:
```bash
# Ir a supabase.com
# Crear nuevo proyecto
# Obtener URL y anon key
# Guardar en .env.local
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 2.2 Setup de Auth (si necesitas)

#### Supabase auth:
```typescript
// lib/auth.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(url, anonKey)

// pages/login.tsx
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})
```

#### Auth0 o NextAuth.js (si necesitas):
```bash
npm install next-auth
```

### 2.3 Estructura base

Según tu arquitectura:

**BaaS**: Solo frontend
```
src/
├─ components/    (UI reutilizable)
├─ pages/         (rutas)
├─ lib/           (utilitarios, supabase client)
└─ styles/
```

**Serverless**: Frontend + /api
```
pages/
├─ index.tsx
├─ api/
│  ├─ quotes.ts      (GET, POST)
│  └─ health.ts      (health check)
└─ lib/
   └─ db.ts
```

**Full-Stack**: Monorepo
```
apps/
├─ web/           (Next.js frontend)
└─ api/           (Express backend)
packages/
└─ shared/        (tipos TS compartidos)
```

**Backend Separado**: Dos repos
```
# Repo 1: frontend
pages/, components/, lib/, ...

# Repo 2: backend
src/routes/, src/controllers/, src/middleware/, ...
```

> 💡 Para el frontend, copia las piezas clave de `boilerplate-frontend/`
> (cliente HTTP, sesión, hooks) y sigue la guía de [08-FRONTEND.md](08-FRONTEND.md).

### 2.4 Primeros commits

```bash
# Limpia archivos innecesarios
rm -rf .git/
git init
git add .
git commit -m "Initial commit: [arquitectura] setup"

# Conecta a GitHub
git remote add origin [URL]
git push -u origin main
```

### 2.5 Crea archivo .env.local

```bash
# Copiar desde .env.example
cp .env.example .env.local

# Completar con tus valores reales
# - BD URL/token
# - API key si usas servicios
# - URLs de terceros
```

**IMPORTANTE**: `.env.local` no va a git. (Ya está en .gitignore)

### 📋 Checklist Fase 2

- [ ] BD creada y conectada
- [ ] Auth setup (si necesitas)
- [ ] Estructura de carpetas creada
- [ ] `.env.local` configurado
- [ ] App corre localmente: `npm run dev`
- [ ] Repos creados en GitHub
- [ ] Primer commit pusheado
- [ ] Deploy automático configurado (Vercel, Render, etc)

---

## Fase 3: DESARROLLO (Días 3-10)

**Objetivo**: Funcionalidades MVP implementadas.
**Duración**: 1 semana típico
**Entregable**: Todas las features MVP funcionando

### 3.1 Estructura de trabajo

```
Día 1: Feature A (Auth + profile)
Día 2: Feature B (Crear resources)
Día 3: Feature C (Listar + filtros)
Día 4: Feature D (Editar)
Día 5: Feature E (Borrar + confirmación)
Día 6: Testing + bugs
Día 7: Pulir UX + performance
```

### 3.2 Convenciones de código

**Carpetas**:
- `components/` → React components, nombrados con PascalCase (Card.tsx)
- `pages/` → Next.js routes
- `lib/` → funciones utilitarias, DB clients
- `types/` → interfaces TypeScript (si no tienes `packages/shared`)
- `styles/` → CSS modules o Tailwind

**Commits**:
```
git commit -m "feat: add quote creation"
git commit -m "fix: handle empty list edge case"
git commit -m "refactor: extract QuoteForm component"
```

**Ramas** (si trabajas en equipo):
```bash
git checkout -b feat/quote-creation
# ...desarrolla...
git push origin feat/quote-creation
# Abre pull request en GitHub
```

### 3.3 Bases de datos: Crear tablas

#### Turso (SQL):
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quotes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  total DECIMAL NOT NULL,
  status TEXT DEFAULT 'draft',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### Supabase (UI visual o SQL):
- Ir a Supabase dashboard
- Crear tablas via UI o SQL editor
- Supabase genera tipos TypeScript automáticamente

### 3.4 Desarrollo iterativo

**Patrón para cada feature**:

1. **Crea la ruta backend** (si separado/fullstack/serverless):
```typescript
// src/routes/quotes.ts o pages/api/quotes.ts
export async function POST(req) {
  const { clientName, amount } = req.body
  
  const quote = await db.quotes.create({
    clientName,
    amount,
    status: 'draft'
  })
  
  return { id: quote.id, ...quote }
}
```

2. **Crea el hook React**:
```typescript
// lib/hooks/useQuotes.ts
export function useQuotes() {
  const [quotes, setQuotes] = useState([])
  
  const create = async (data) => {
    const res = await fetch('/api/quotes', {
      method: 'POST',
      body: JSON.stringify(data)
    })
    const newQuote = await res.json()
    setQuotes([...quotes, newQuote])
    return newQuote
  }
  
  return { quotes, create }
}
```

> 💡 Patrón canónico: no llames a `fetch` directamente. Usa el cliente centralizado
> `lib/api.ts` de `boilerplate-frontend/` y los hooks `useData`/`useAuth`
> (ver [08-FRONTEND.md](08-FRONTEND.md)).

3. **Crea el componente UI**:
```typescript
// components/QuoteForm.tsx
import { useQuotes } from '@/lib/hooks/useQuotes'

export function QuoteForm() {
  const { create } = useQuotes()
  const [name, setName] = useState('')
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    await create({ clientName: name, amount: 0 })
    setName('')
  }
  
  return <form onSubmit={handleSubmit}>...</form>
}
```

4. **Prueba localmente**:
```bash
npm run dev
# Abre localhost:3000
# Test feature
```

5. **Commit**:
```bash
git add .
git commit -m "feat: add quote creation"
git push
```

### 3.5 Testing básico

No necesitas test suite completo, pero valida:

```typescript
// Prueba manual en la página
// - ¿Se crea el quote?
// - ¿Aparece en la lista?
// - ¿Guardó en BD?

// O test unitario simple:
test('create quote', async () => {
  const { data } = await api.post('/quotes', {
    clientName: 'Acme',
    amount: 5000
  })
  expect(data.id).toBeDefined()
})
```

### 3.6 Performance temprano

```typescript
// Lazy load components pesados
const HeavyComponent = dynamic(() => import('./Heavy'), {
  loading: () => <p>Loading...</p>
})

// Cache queries
const { data } = useSWR('/api/quotes', fetcher, {
  revalidateOnFocus: false,
  dedupingInterval: 60000
})

// Compress imágenes
// Usa next/image
import Image from 'next/image'
<Image src={...} width={800} height={600} />
```

### 📋 Checklist Fase 3

- [ ] Todas las funcionalidades MVP implementadas
- [ ] BD con datos de prueba
- [ ] Componentes reutilizables extraídos
- [ ] Validación de inputs en frontend + backend
- [ ] Manejo de errores (try/catch, error messages)
- [ ] Performance aceptable (cargas <3 seg)
- [ ] Commits limpios cada día
- [ ] Code en GitHub main branch

---

## Fase 4: DEPLOYMENT (Día 11-14)

**Objetivo**: App en producción, accesible públicamente.
**Duración**: 1-3 días
**Entregable**: URL pública, BD en producción, monitoreo activo

### 4.1 Prepara producción

#### Variables de ambiente

```bash
# .env.example (versionado en git)
DATABASE_URL=libsql://...
API_URL=https://api.example.com

# .env.production (NUNCA versionado)
DATABASE_URL=libsql://prod-token-aqui
NEXT_PUBLIC_API_URL=https://api.example.com
```

En Vercel/Render, agrega variables en dashboard:
- Settings → Environment Variables
- Pega cada variable

#### CORS si necesita (Backend Separado)

```typescript
// backend/src/index.ts
import cors from 'cors'

app.use(cors({
  origin: 'https://tudominio.com', // URL de producción
  credentials: true
}))
```

### 4.2 Deploy Frontend

#### A Vercel:

```bash
# Opción 1: Conectar GitHub (más fácil)
# Ir a vercel.com → Import Project → Conectar GitHub repo
# Vercel despliega automáticamente cada push a main

# Opción 2: Deploy manual
npm install -g vercel
vercel
# Sigue prompts
```

**First deploy**: Vercel te da URL tipo `mi-app-xyz.vercel.app`

#### Dominio personalizado:

```
vercel.json:
{
  "name": "mi-app",
  "env": {
    "DATABASE_URL": "@database-url"
  }
}
```

Luego en Vercel settings:
- Domains → Add domain → apunta tu DNS a Vercel nameservers

### 4.3 Deploy Backend (si lo tienes)

#### A Render:

```bash
# 1. Crea repo en GitHub (backend)
# 2. Ve a render.com → New → Web Service
# 3. Conecta tu repo GitHub
# 4. Elige Node.js runtime
# 5. Build command: npm install
# 6. Start command: npm run start
# 7. Agrega env variables en Render dashboard
# 8. Deploy

# Verifica:
curl https://backend-xxx.onrender.com/health
# Debería retornar { status: 'ok' }
```

#### A Railway (alternativa):

```bash
npm install -g railway
railway login
railway init
railway up
```

### 4.4 BD en producción

#### Turso:
- Ya está en la nube
- Solo asegúrate que `TURSO_URL` y `TURSO_TOKEN` están en env vars

#### Supabase:
- Crear nuevo proyecto para producción (separate de development)
- Copiar `SUPABASE_URL` (pública) y `SUPABASE_ANON_KEY` a env vars de Vercel/Render
- Copiar `SUPABASE_SERVICE_KEY` (privada) solo al backend

### 4.5 Migraciones de BD (opcional pero recomendado)

Si necesitas cambios en schema:

```bash
# Turso migrations
turso db shell mi-app-db-prod
# Copias tu SQL de CREATE TABLE aquí

# Supabase: usa dashboard SQL editor
```

### 4.6 Testing en producción

```bash
# Abre tu dominio en el browser
https://tuapp.vercel.app

# Prueba features:
# - Crear un quote
# - Listar quotes
# - Editar
# - Borrar

# Abre DevTools (F12)
# Mira Network tab → asegúrate que las APIs responden
# Mira Console → sin errores rojos
```

### 4.7 Monitoring básico

```typescript
// Añade error tracking (optional pero buena idea)
npm install @sentry/nextjs

// sentry.config.ts
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: "https://xxx@xxx.ingest.sentry.io/xxx",
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0
})
```

Luego en Sentry dashboard verás errores en vivo.

### 4.8 Alertas y uptime

```bash
# Uptime robot (gratis)
# Ir a uptimerobot.com
# Crear monitor: https://tuapp.vercel.app
# Te avisa si cae (por email)
```

### 📋 Checklist Fase 4

- [ ] `.env.example` completado y documentado
- [ ] Env variables en Vercel/Render dashboard
- [ ] Frontend deployed a Vercel
- [ ] Backend deployed a Render/Railway (si aplica)
- [ ] BD conectada en producción
- [ ] CORS configurado (si backend separado)
- [ ] Dominio personalizado (opcional pero profesional)
- [ ] Testing manual de todas las features
- [ ] Console sin errores
- [ ] Network requests OK (status 200)
- [ ] Monitoring/alertas configuradas
- [ ] Link compartible a amigos/clientes

---

## 🎯 Timeline total estimado

| Fase | Duración | Días acumulados |
|---|---|---|
| Pre-desarrollo | 1-2 días | 1-2 |
| Setup inicial | 1-2 días | 2-4 |
| Desarrollo | 5-7 días | 7-11 |
| Deployment | 1-3 días | 8-14 |

**Total**: 8-14 días para MVP funcional en producción.

*(Con el boilerplate pre-hecho, ahorras días 1-2)*

---

## 🚨 Errores comunes

❌ **Saltarse fase 1**: Empezar a codinear sin decidir arquitectura → reescribir todo
❌ **Esperar a "setup perfecto"**: No deployment hasta que "todo esté listo"
❌ **Env variables en el código**: Secretos committeados a GitHub = comprometido
❌ **No testear en producción**: "Funcionaba localmente" ≠ funcionaba en prod
❌ **Render free durmiéndose**: Cold starts de 10+ segundos = mala UX

---

## 📋 Próximos pasos

1. **Estoy en Fase 1**: Ve a [01-MATRIZ-DECISION.md](01-MATRIZ-DECISION.md)
2. **Estoy en Fase 2**: Ve a `templates/[tu-arquitectura]/README.md`
3. **Estoy en Fase 3**: Consulta [04-ARQUITECTURA.md](04-ARQUITECTURA.md), [05-PATRONES-CODIGO.md](05-PATRONES-CODIGO.md) y [08-FRONTEND.md](08-FRONTEND.md)
4. **Estoy en Fase 4**: Ve a [07-DEPLOY.md](07-DEPLOY.md)

¡Adelante! 🚀
