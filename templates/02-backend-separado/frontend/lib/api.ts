/**
 * API Client
 * Maneja todas las llamadas HTTP al backend
 * 
 * Uso:
 * const { data } = await api.get('/quotes')
 * const { data } = await api.post('/quotes', { clientName: 'Acme' })
 */

const API_URL =
  process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_API_URL_PROD
    : process.env.NEXT_PUBLIC_API_URL

interface ApiResponse<T> {
  data?: T
  error?: string
  status: number
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_URL}${endpoint}`

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      return {
        error: `Error ${response.status}: ${response.statusText}`,
        status: response.status,
      }
    }

    const data = await response.json()
    return { data, status: response.status }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 500,
    }
  }
}

export const api = {
  get: <T,>(endpoint: string) =>
    request<T>(endpoint, { method: 'GET' }),

  post: <T,>(endpoint: string, body: any) =>
    request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: <T,>(endpoint: string, body: any) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: <T,>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
}
