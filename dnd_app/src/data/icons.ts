export const CLASS_ICONS: Record<string, string> = {
  Barbarian: '🪓', Bard: '🎵', Cleric: '✝️', Druid: '🌿',
  Fighter: '⚔️', Monk: '👊', Paladin: '🛡️', Ranger: '🏹',
  Rogue: '🗡️', Sorcerer: '✨', Warlock: '👁️', Wizard: '📚',
  default: '🧙'
}

export const SCHOOL_COLORS: Record<string, string> = {
  Evocation: '#e05555',
  Necromancy: '#7c4daa',
  Illusion: '#4d7caa',
  Transmutation: '#4caf82',
  Conjuration: '#c9a84c',
  Divination: '#5b8dd9',
  Enchantment: '#d95b8d',
  Abjuration: '#5bd9c9',
  default: '#555'
}

export const CATEGORY_ICONS: Record<string, string> = {
  'Weapon': '⚔️',
  'Armor': '🛡️',
  'Adventuring Gear': '🎒',
  'Tools': '🔧',
  'Mounts and Vehicles': '🐴',
  'Trade Goods': '💰',
  'Treasure': '💎',
  'Potion': '🧪',
  'Ring': '💍',
  'Rod': '🪄',
  'Scroll': '📜',
  'Staff': '🪄',
  'Wand': '🪄',
  'Wondrous Items': '✨',
  'Equipment Pack': '🎒',
  'Magic Armor': '🛡️',
  'Magic Weapon': '⚔️',
  default: '📦'
}

export const CONDITION_ICONS: Record<string, string> = {
  'Avvelenato': '🤢',
  'Stordito': '💫',
  'Paralizzato': '🧊',
  'Prono': '⬇️',
  'Invisibile': '👻',
  'Spaventato': '😱',
  'Affascinato': '💜',
  'Accecato': '🚫',
  'Assordato': '🔇',
  'Esausto': '😴',
  'Trattenuto': '🕸️',
  'Incapacitato': '❌',
}

export const UI_ICONS = {
  // Navigazione
  back: '←',
  close: '×',
  edit: '✏️',
  delete: '🗑️',
  add: '+',
  search: '🔍',

  // Personaggio
  character: '👤',
  master: '👑',
  player: '👤',
  enemy: '👹',
  noImage: '🧙',

  // Stats
  stats: '📊',
  spells: '✨',
  inventory: '🎒',
  combat: '⚔️',
  hp: '❤️',
  damage: '−',
  heal: '+',

  // Campagna
  campaign: '🗺️',
  session: '📅',
  notes: '📖',
  initiative: '⚡',
  group: '👥',
  invite: '🔑',

  // Combattimento
  armorClass: '🛡️',
  initiative_icon: '⚡',
  initiative_extras: '🔴',
  speed: '💨',
  proficiency: '🎯',
  dice: '🎲',

  // Scurovisione e percezione
  perception: '👁️',
  darkvision: '🌑',

  // Peso
  weight: '⚖️',

  // Upload
  photo: '📷',
  loading: '⏳',

  // Feedback
  warning: '⚠️',
  question: '❓',
  success: '✓',

  // Sezioni
  characters: '👤',
  campaigns: '🗺️',
  logout: '🚪',

  // Custom
  custom: '✏️',
}

export const TAB_LABELS = {
  stats: `${UI_ICONS.stats} Stats`,
  spells: `${UI_ICONS.spells} Magie`,
  inventory: `${UI_ICONS.inventory} Inventario`,
  combat: `${UI_ICONS.combat} Lotta`,
}

export const SECTION_LABELS = {
  characters: `${UI_ICONS.characters} Personaggi`,
  campaigns: `${UI_ICONS.campaigns} Campagne`,
}

// Funzioni helper per accedere alle icone in modo sicuro
export function getClassIcon(characterClass: string): string {
  return CLASS_ICONS[characterClass] ?? CLASS_ICONS.default
}

export function getSchoolColor(school: string): string {
  return SCHOOL_COLORS[school] ?? SCHOOL_COLORS.default
}

export function getCategoryIcon(category: string): string {
  return CATEGORY_ICONS[category] ?? CATEGORY_ICONS.default
}