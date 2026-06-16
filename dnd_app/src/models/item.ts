export interface Item {
  id: string
  character_id: string
  character_name: string  // ← aggiunto
  name: string
  quantity: number
  weight?: number
  notes?: string
}