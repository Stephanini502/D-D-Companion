export interface Skill {
  name: string
  stat: 'FOR' | 'DES' | 'COS' | 'INT' | 'SAG' | 'CAR'
}

export const SKILLS: Skill[] = [
  { name: 'Acrobazia',          stat: 'DES' },
  { name: 'Addestrare Animali', stat: 'SAG' },
  { name: 'Arcano',             stat: 'INT' },
  { name: 'Atletica',           stat: 'FOR' },
  { name: 'Furtività',          stat: 'DES' },
  { name: 'Inganno',            stat: 'CAR' },
  { name: 'Intimidazione',      stat: 'CAR' },
  { name: 'Intrattenere',       stat: 'CAR' },
  { name: 'Intuizione',         stat: 'SAG' },
  { name: 'Investigazione',     stat: 'INT' },
  { name: 'Medicina',           stat: 'SAG' },
  { name: 'Natura',             stat: 'INT' },
  { name: 'Percezione',         stat: 'SAG' },
  { name: 'Persuasione',        stat: 'CAR' },
  { name: 'Prestidigitazione',  stat: 'DES' },
  { name: 'Religione',          stat: 'INT' },
  { name: 'Storia',             stat: 'INT' },
  { name: 'Sopravvivenza',      stat: 'SAG' },
]

// Funzione per calcolare il bonus di un'abilità
export function getSkillBonus(
  skillName: string,
  stats: Record<string, number>,
  proficiencyBonus: number,
  skillProficiencies: Record<string, boolean>
): number {
  const skill = SKILLS.find(s => s.name === skillName)
  if (!skill) return 0
  const statVal = stats[skill.stat] ?? 10
  const mod = Math.floor((statVal - 10) / 2)
  const isProficient = skillProficiencies[skillName] ?? false
  return mod + (isProficient ? proficiencyBonus : 0)
}

// Formatta il bonus con segno
export function formatBonus(value: number): string {
  return (value >= 0 ? '+' : '') + value
}