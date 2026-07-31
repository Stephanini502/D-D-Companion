export interface NPC {
  id: string
  name: string
  role: string
  description: string
  relationship: 'alleato' | 'neutrale' | 'nemico'
  notes: string
  image_path?: string | null
}