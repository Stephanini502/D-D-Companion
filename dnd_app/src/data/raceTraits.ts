export type DarkvisionRange = 0 | 18 | 36

export const RACE_DARKVISION: Record<string, DarkvisionRange> = {
  'Elf': 18, 'High Elf': 18, 'Wood Elf': 18,
  'Dwarf': 18, 'Hill Dwarf': 18, 'Mountain Dwarf': 18,
  'Gnome': 18, 'Forest Gnome': 18, 'Rock Gnome': 18,
  'Half-Elf': 18,
  'Half-Orc': 18,
  'Tiefling': 18,
  'Dragonborn': 18,
  'Orc': 18,
  'Goliath': 18,
  'Dark Elf': 36, 'Drow': 36,
  'Aasimar': 36,
  'Human': 0,
  'Halfling': 0,
}

export function getDarkvision(race: string): DarkvisionRange {
  for (const [key, value] of Object.entries(RACE_DARKVISION)) {
    if (race.toLowerCase().includes(key.toLowerCase())) return value
  }
  return 0
}

export function getPassivePerception(sagMod: number, profBonus: number, hasProficiency: boolean): number {
  return 10 + sagMod + (hasProficiency ? profBonus : 0)
}

export function getProficiencyBonus(level: number): number {
  if (level < 5) return 2
  if (level < 9) return 3
  if (level < 13) return 4
  if (level < 17) return 5
  return 6
}