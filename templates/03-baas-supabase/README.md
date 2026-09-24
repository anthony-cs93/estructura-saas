# BaaS: Supabase (Sin Backend)

Este boilerplate es para apps SaaS que son **principalmente CRUD**:
- ✅ Catálogos de productos
- ✅ Gestión de inventario
- ✅ Dashboards de lectura
- ✅ Formularios simples

**No es para**: Apps con lógica compleja (como Modulax)

---

## 🎯 Ventajas BaaS

| Aspecto | Ventaja |
|---|---|
| **Velocidad** | MVP en 3-5 días. No escribes backend. |
| **Mantenimiento** | Supabase maneja servers, backups, scaling. |
| **Costo** | Free tier: 2 DBs, 8GB, unlimited users. |
| **Auth incluida** | OAuth, email, SMS, 2FA. Gratis. |
| **Realtime** | WebSockets automáticos. Perfecto para dashboards. |

---

## ⚡ Quick Start

### 1. Crear proyecto Supabase

Ve a [supabase.com](https://supabase.com):
- Sign up
- New project
- Copia **URL** y **anon key**
- Copia a `.env.local`

### 2. Crear tabla

En Supabase dashboard → SQL Editor:

```sql
CREATE TABLE quotes (
  id BIGSERIAL PRIMARY KEY,
  client_name TEXT NOT NULL,
  total DECIMAL NOT NULL,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Instalar y correr

```bash
npm install
npm run dev
# Abre http://localhost:3000
```

---

## 📁 Estructura

```
src/
├─ components/
│  ├─ QuoteForm.tsx       (crear quotes)
│  └─ QuoteList.tsx       (listar quotes)
├─ pages/
│  ├─ index.tsx           (home)
│  └─ api/
│     └─ auth.ts          (callbacks de auth)
├─ lib/
│  └─ supabase.ts         (cliente + helpers)
└─ styles/
```

---

## 💻 Ejemplo: Crear y listar quotes

### lib/supabase.ts

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(url, key)

// Crear
export async function createQuote(clientName: string, total: number) {
  const { data } = await supabase
    .from('quotes')
    .insert([{ client_name: clientName, total }])
    .select()
    .single()
  
  return data
}

// Listar
export async function getQuotes() {
  const { data } = await supabase
    .from('quotes')
    .select('*')
    .order('created_at', { ascending: false })
  
  return data
}
```

### components/QuoteForm.tsx

```typescript
import { useState } from 'react'
import { createQuote } from '@/lib/supabase'

export function QuoteForm() {
  const [clientName, setClientName] = useState('')
  const [total, setTotal] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await createQuote(clientName, parseFloat(total))
      setClientName('')
      setTotal('')
      // Opcional: refetch lista
    } catch (error) {
      alert('Error creating quote')
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={clientName}
        onChange={(e) => setClientName(e.target.value)}
        placeholder="Client name"
        required
      />
      <input
        type="number"
        value={total}
        onChange={(e) => setTotal(e.target.value)}
        placeholder="Total"
        required
      />
      <button disabled={loading}>
        {loading ? 'Creating...' : 'Create'}
      </button>
    </form>
  )
}
```

### components/QuoteList.tsx

```typescript
import { useEffect, useState } from 'react'
import { getQuotes } from '@/lib/supabase'

export function QuoteList() {
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadQuotes()
  }, [])

  const loadQuotes = async () => {
    setLoading(true)
    const data = await getQuotes()
    setQuotes(data || [])
    setLoading(false)
  }

  if (loading) return <p>Loading...</p>

  return (
    <ul>
      {quotes.map((quote) => (
        <li key={quote.id}>
          <strong>{quote.client_name}</strong> - ${quote.total}
          <span>{quote.status}</span>
        </li>
      ))}
    </ul>
  )
}
```

---

## 🔐 Autenticación (Opcional)

Supabase trae auth lista para usar:

```typescript
// Signup
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password'
})

// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

// Obtener usuario actual
const { data: { user } } = await supabase.auth.getUser()

// Logout
await supabase.auth.signOut()
```

Supabase UI components hacen esto más fácil:

```typescript
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'

<Auth
  supabaseClient={supabase}
  appearance={{ theme: ThemeSupa }}
/>
```

---

## 🚀 Deploy

### A Vercel

```bash
# 1. Push a GitHub
git push origin main

# 2. Vercel conecta automáticamente
# (settings → connect GitHub)

# 3. Agrega env variables en Vercel:
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# 4. Cada push = deploy automático
```

---

## 📋 RLS (Row Level Security)

Para que cada usuario vea solo sus quotes:

```sql
-- Crear tabla de usuarios
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Policy: usuarios ven solo sus quotes
CREATE POLICY "Users can view own quotes" ON quotes
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: usuarios crean solo sus quotes
CREATE POLICY "Users can insert own quotes" ON quotes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## ✅ Checklist

- [ ] Proyecto Supabase creado
- [ ] URL y anon key en `.env.local`
- [ ] Tabla `quotes` creada
- [ ] `npm install && npm run dev`
- [ ] Test de crear y listar quotes
- [ ] Deploy a Vercel
- [ ] Variables de env en Vercel

---

## 💡 Limitaciones BaaS

❌ **No puedes**:
- Esconder cálculos (todo es frontend)
- Procesar archivos grandes
- Webhooks complejos
- Integraciones backend complejas

✅ **Si necesitas eso**: Migra a Backend Separado. Tus tablas Supabase se quedan igual.

---

## 🔗 Recursos

- [Supabase Docs](https://supabase.com/docs)
- [Next.js + Supabase](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [RLS en Supabase](https://supabase.com/docs/guides/auth/row-level-security)

¡Listo! 🚀
