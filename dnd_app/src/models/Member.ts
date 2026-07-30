export interface Member {
  id: string
  username: string
  character_id: string | null
  character?: {
    id: string
    name: string
    race: string
    character_class: string
    level: number
    hp_current: number
    hp_max: number
  }
}