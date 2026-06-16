export type ArmorCategory = 'light' | 'medium' | 'heavy' | 'shield' | 'none'

export interface ArmorType {
  name: string
  nameIt: string
  category: ArmorCategory
  baseAC: number
  keywords: string[] // parole chiave per riconoscerla dall'inventario
}

export const ARMOR_TYPES: ArmorType[] = [
  // ARMATURE LEGGERE — CA base + DES (nessun limite)
  { name: 'Padded', nameIt: 'Armatura Imbottita', category: 'light', baseAC: 11, keywords: ['padded', 'imbottita'] },
  { name: 'Leather', nameIt: 'Armatura di Cuoio', category: 'light', baseAC: 11, keywords: ['leather', 'cuoio'] },
  { name: 'Studded Leather', nameIt: 'Cuoio Borchiato', category: 'light', baseAC: 12, keywords: ['studded', 'borchiato'] },

  // ARMATURE MEDIE — CA base + DES (max +2)
  { name: 'Hide', nameIt: 'Armatura di Pelle', category: 'medium', baseAC: 12, keywords: ['hide', 'pelle grezza'] },
  { name: 'Chain Shirt', nameIt: 'Cotta di Maglia', category: 'medium', baseAC: 13, keywords: ['chain shirt', 'cotta'] },
  { name: 'Scale Mail', nameIt: 'Armatura a Scaglie', category: 'medium', baseAC: 14, keywords: ['scale mail', 'scaglie'] },
  { name: 'Breastplate', nameIt: 'Corazza', category: 'medium', baseAC: 14, keywords: ['breastplate', 'corazza'] },
  { name: 'Half Plate', nameIt: 'Mezza Armatura a Piastre', category: 'medium', baseAC: 15, keywords: ['half plate', 'mezza piastra'] },

  // ARMATURE PESANTI — CA fissa, nessun bonus DES
  { name: 'Ring Mail', nameIt: 'Armatura ad Anelli', category: 'heavy', baseAC: 14, keywords: ['ring mail', 'anelli'] },
  { name: 'Chain Mail', nameIt: 'Cotta di Maglia Pesante', category: 'heavy', baseAC: 16, keywords: ['chain mail', 'maglia pesante'] },
  { name: 'Splint', nameIt: 'Armatura a Stecche', category: 'heavy', baseAC: 17, keywords: ['splint', 'stecche'] },
  { name: 'Plate', nameIt: 'Armatura a Piastre', category: 'heavy', baseAC: 18, keywords: ['plate', 'piastre'] },

  // SCUDI — +2 CA
  { name: 'Shield', nameIt: 'Scudo', category: 'shield', baseAC: 2, keywords: ['shield', 'scudo'] },
]

// Funzione per trovare il tipo di armatura da un nome
export function detectArmorType(itemName: string, itemNotes: string): ArmorType | null {
  const name = itemName.toLowerCase()
  const notes = itemNotes?.toLowerCase() ?? ''

  for (const armor of ARMOR_TYPES) {
    if (armor.keywords.some(k => name.includes(k) || notes.includes(k))) {
      return armor
    }
  }

  // Fallback: cerca CA nelle note
  const caMatch = notes.match(/ca:\s*(\d+)/i)
  if (caMatch) {
    const baseAC = parseInt(caMatch[1])
    if (baseAC >= 16) return { name: itemName, nameIt: itemName, category: 'heavy', baseAC, keywords: [] }
    if (baseAC >= 12) return { name: itemName, nameIt: itemName, category: 'medium', baseAC, keywords: [] }
    return { name: itemName, nameIt: itemName, category: 'light', baseAC, keywords: [] }
  }

  return null
}

// Funzione principale per calcolare la CA
export function calculateAC(
  armor: { name: string, notes: string } | null,
  shield: { name: string, notes: string } | null,
  desMod: number
): number {
  let ac = 10

  if (!armor) {
    // Senza armatura
    ac = 10 + desMod
  } else {
    const armorType = detectArmorType(armor.name, armor.notes)
    if (!armorType) {
      ac = 10 + desMod
    } else if (armorType.category === 'light') {
      ac = armorType.baseAC + desMod
    } else if (armorType.category === 'medium') {
      ac = armorType.baseAC + Math.min(2, desMod)
    } else if (armorType.category === 'heavy') {
      ac = armorType.baseAC
    }
  }

  if (shield) ac += 2

  return ac
}

// Funzione per ottenere la label del tipo
export function getArmorCategoryLabel(category: ArmorCategory): string {
  switch (category) {
    case 'light': return 'Leggera'
    case 'medium': return 'Media'
    case 'heavy': return 'Pesante'
    case 'shield': return 'Scudo'
    case 'none': return 'Nessuna'
  }
}