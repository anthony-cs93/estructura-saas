/**
 * Hook: useQuotes
 * Maneja la lógica de estado para quotes
 * 
 * Uso:
 * const { quotes, loading, error, createQuote, deleteQuote } = useQuotes()
 */

import { useState, useEffect } from 'react'
import { api } from '../api'

interface Quote {
  id: string
  clientName: string
  total: number
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  createdAt: string
}

export function useQuotes() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch initial quotes
  useEffect(() => {
    fetchQuotes()
  }, [])

  const fetchQuotes = async () => {
    setLoading(true)
    setError(null)

    const { data, error: apiError } = await api.get<Quote[]>('/quotes')

    if (apiError) {
      setError(apiError)
    } else {
      setQuotes(data || [])
    }

    setLoading(false)
  }

  const createQuote = async (clientName: string, total: number) => {
    const { data, error: apiError } = await api.post<Quote>('/quotes', {
      clientName,
      total,
    })

    if (apiError) {
      setError(apiError)
      return null
    }

    if (data) {
      setQuotes([...quotes, data])
      return data
    }

    return null
  }

  const updateQuote = async (id: string, updates: Partial<Quote>) => {
    const { data, error: apiError } = await api.put<Quote>(
      `/quotes/${id}`,
      updates
    )

    if (apiError) {
      setError(apiError)
      return null
    }

    if (data) {
      setQuotes(quotes.map((q) => (q.id === id ? data : q)))
      return data
    }

    return null
  }

  const deleteQuote = async (id: string) => {
    const { error: apiError } = await api.delete(`/quotes/${id}`)

    if (apiError) {
      setError(apiError)
      return false
    }

    setQuotes(quotes.filter((q) => q.id !== id))
    return true
  }

  return {
    quotes,
    loading,
    error,
    fetchQuotes,
    createQuote,
    updateQuote,
    deleteQuote,
  }
}
