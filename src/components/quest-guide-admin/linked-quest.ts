'use client'

import { useConfig, useFormFields } from '@payloadcms/ui'
import { useEffect, useState } from 'react'

import { firstQuestId } from '@/lib/guides/autofill'
import type { LinkedQuest, LinkedQuestState } from '@/lib/guides/summary'

// El panel lee la misión por la API REST: aquí corre en el navegador, no en el servidor.
// Una petición por misión mientras la página siga abierta; si falla, se reintenta.
const requests = new Map<string, Promise<LinkedQuest | null>>()

export function fetchLinkedQuest(apiUrl: string, id: number): Promise<LinkedQuest | null> {
  // depth 1 trae los nombres de objetos, monstruos y prerrequisitos.
  const url = `${apiUrl}/quests/${id}?depth=1`
  const cached = requests.get(url)
  if (cached) return cached
  const request = fetch(url, { credentials: 'include' })
    .then((response) => (response.ok ? (response.json() as Promise<LinkedQuest>) : null))
    .catch(() => null)
    .then((quest) => {
      if (!quest) requests.delete(url)
      return quest
    })
  requests.set(url, request)
  return request
}

/** Si otra guía ya usa el slug. Ante un error responde que no: el servidor lo rechazará. */
export async function slugTaken(apiUrl: string, slug: string, ownId: unknown): Promise<boolean> {
  const query = new URLSearchParams({ 'where[slug][equals]': slug, depth: '0', limit: '2' })
  try {
    const response = await fetch(`${apiUrl}/quest-guides?${query}`, { credentials: 'include' })
    if (!response.ok) return false
    const { docs } = (await response.json()) as { docs: { id: unknown }[] }
    return docs.some((doc) => doc.id !== ownId)
  } catch {
    return false
  }
}

export function useApiUrl(): string {
  const { config } = useConfig()
  return `${config.serverURL}${config.routes.api}`
}

/** El ID de la primera misión elegida en el formulario, en vivo. */
export function useSelectedQuestId(): number | null {
  return useFormFields(([fields]) => firstQuestId(fields.quests?.value))
}

/** La primera misión elegida en el formulario, cargada de la API. */
export function useLinkedQuest(): LinkedQuestState {
  const id = useSelectedQuestId()
  const apiUrl = useApiUrl()
  const [loaded, setLoaded] = useState<{ id: number; quest: LinkedQuest | null } | null>(null)

  useEffect(() => {
    if (id === null) return
    let active = true
    void fetchLinkedQuest(apiUrl, id).then((quest) => {
      if (active) setLoaded({ id, quest })
    })
    return () => {
      active = false
    }
  }, [apiUrl, id])

  if (id === null) return { status: 'none' }
  if (loaded?.id !== id) return { status: 'loading' }
  return loaded.quest ? { status: 'ready', quest: loaded.quest } : { status: 'error' }
}
