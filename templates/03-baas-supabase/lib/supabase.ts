/**
 * Supabase Client
 * Conecta a Supabase: auth, BD, storage, functions
 */

import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined')
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined')
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Helpers comunes

export async function getQuotes() {
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createQuote(clientName: string, total: number) {
  const { data, error } = await supabase
    .from('quotes')
    .insert([{ client_name: clientName, total }])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateQuote(
  id: string,
  updates: Record<string, any>
) {
  const { data, error } = await supabase
    .from('quotes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteQuote(id: string) {
  const { error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}
