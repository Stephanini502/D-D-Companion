export interface Stats {
  FOR: number
  DES: number
  COS: number
  INT: number
  SAG: number
  CAR: number
}

export interface Character {
  id: string
  user_id?: string
  name: string
  race: string
  character_class: string
  level: number
  hp_current: number
  hp_max: number
  stats: Stats
}