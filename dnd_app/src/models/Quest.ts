export interface Quest {
  id: string
  title: string
  description: string
  status: 'active' | 'completed' | 'failed'
}