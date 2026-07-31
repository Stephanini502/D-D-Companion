// =====================================================================
//  PACKAGE ICONE — fonte unica di verità per icone, colori e label.
//  Ogni icona/emoji dell'app va dichiarata QUI e richiamata da qui.
//  Non hardcodare emoji nei componenti.
// =====================================================================

// ---------------------------------------------------------------------
//  Icone di classe
// ---------------------------------------------------------------------
export const CLASS_ICONS: Record<string, string> = {
  Barbarian: '🪓', Bard: '🎵', Cleric: '✝️', Druid: '🌿',
  Fighter: '⚔️', Monk: '👊', Paladin: '🛡️', Ranger: '🏹',
  Rogue: '🗡️', Sorcerer: '✨', Warlock: '👁️', Wizard: '📚',
  default: '🧙',
}

// ---------------------------------------------------------------------
//  Colori scuole di magia
// ---------------------------------------------------------------------
export const SCHOOL_COLORS: Record<string, string> = {
  Evocation: '#e05555',
  Necromancy: '#7c4daa',
  Illusion: '#4d7caa',
  Transmutation: '#4caf82',
  Conjuration: '#c9a84c',
  Divination: '#5b8dd9',
  Enchantment: '#d95b8d',
  Abjuration: '#5bd9c9',
  default: '#555',
}

// ---------------------------------------------------------------------
//  Icone categorie oggetti (catalogo inventario)
// ---------------------------------------------------------------------
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
  default: '📦',
}

// ---------------------------------------------------------------------
//  Icone condizioni (Initiative Tracker)
// ---------------------------------------------------------------------
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

// ---------------------------------------------------------------------
//  Icone UI generiche
// ---------------------------------------------------------------------
export const UI_ICONS = {
  // Brand
  logo: '⚔️',

  // Navigazione
  back: '←',
  close: '×',
  edit: '✏️',
  delete: '🗑️',
  add: '+',
  search: '🔍',
  refresh: '🔄',

  // Personaggio
  character: '👤',
  master: '👑',
  player: '👤',
  enemy: '👹',
  monster: '👹',
  noImage: '🧙',

  // Stats / scheda
  stats: '📊',
  overview: '📊',
  spells: '✨',
  inventory: '🎒',
  combat: '⚔️',
  hp: '❤️',
  damage: '−',
  heal: '+',
  skills: '🎯',
  traits: '⭐',
  talents: '✨',

  // Campagna
  campaign: '🗺️',
  session: '📅',
  notes: '📖',
  diary: '📖',
  summary: '📖',
  initiative: '⚡',
  group: '👥',
  invite: '🔑',

  // Dashboard master/giocatore
  quest: '⚔️',
  npc: '👥',
  loot: '💎',
  xp: '⭐',
  handout: '📨',
  goals: '🎯',
  prep: '📋',
  during: '⚔️',
  post: '🏆',
  trophy: '🏆',
  save: '💾',

  // Ambientazione
  environment: '🌍',
  location: '📍',
  weather: '🌤',
  time: '🕐',
  atmosphere: '✨',

  // Combattimento
  armorClass: '🛡️',
  initiative_icon: '⚡',
  initiative_extras: '🔴',
  speed: '💨',
  proficiency: '🎯',
  dice: '🎲',
  crit: '⭐',
  fumble: '💀',

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
  check: '✓',
  cross: '✗',

  // Sezioni
  characters: '👤',
  campaigns: '🗺️',
  logout: '🚪',

  // Musica
  music: '🎵',
  musicNotes: '🎶',

  // Custom
  custom: '✏️',
}

// ---------------------------------------------------------------------
//  Controlli player musica
// ---------------------------------------------------------------------
export const MUSIC_ICONS = {
  play: '▶',
  pause: '⏸',
  prev: '⏮',
  next: '⏭',
  stop: '✕',
  youtube: '▶',
  file: '📁',
}

// ---------------------------------------------------------------------
//  Categorie musicali (Jukebox) — colore + icona
// ---------------------------------------------------------------------
export interface MusicCategory { name: string; color: string; icon: string }

export const MUSIC_CATEGORIES: MusicCategory[] = [
  { name: 'Combattimento', color: '#e05555', icon: '⚔️' },
  { name: 'Boss', color: '#7c4daa', icon: '🐉' },
  { name: 'Taverna', color: '#c9a84c', icon: '🍺' },
  { name: 'Città', color: '#5b8dd9', icon: '🏰' },
  { name: 'Esplorazione', color: '#4caf82', icon: '🗺️' },
  { name: 'Tensione', color: '#e0894c', icon: '🕯️' },
  { name: 'Riposo', color: '#6a9a8a', icon: '🌙' },
  { name: 'Altro', color: '#888', icon: '🎵' },
]

export function getMusicCategory(name: string): MusicCategory {
  return MUSIC_CATEGORIES.find(c => c.name === name) ?? { name, color: '#888', icon: '🎵' }
}

// ---------------------------------------------------------------------
//  Colori relazioni PNG (alleato / neutrale / nemico)
// ---------------------------------------------------------------------
export const RELATIONSHIP_COLORS: Record<string, string> = {
  alleato: '#4caf82',
  neutrale: '#c9a84c',
  nemico: '#e05555',
}

export function getRelationshipColor(relationship: string): string {
  return RELATIONSHIP_COLORS[relationship] ?? '#555'
}

// ---------------------------------------------------------------------
//  Stato quest — label + colore (usato da Master/Player dashboard)
// ---------------------------------------------------------------------
export type QuestStatus = 'active' | 'completed' | 'failed'

export const QUEST_STATUS: Record<QuestStatus, { label: string; color: string }> = {
  active: { label: 'Attiva', color: '#4caf82' },
  completed: { label: 'Completata', color: '#c9a84c' },
  failed: { label: 'Fallita', color: '#e05555' },
}

// ---------------------------------------------------------------------
//  Label di sezione
// ---------------------------------------------------------------------
export const SECTION_LABELS = {
  characters: `${UI_ICONS.characters} Personaggi`,
  campaigns: `${UI_ICONS.campaigns} Campagne`,
}

// ---------------------------------------------------------------------
//  Helper di accesso sicuro
// ---------------------------------------------------------------------
export function getClassIcon(characterClass: string): string {
  return CLASS_ICONS[characterClass] ?? CLASS_ICONS.default
}

export function getSchoolColor(school: string): string {
  return SCHOOL_COLORS[school] ?? SCHOOL_COLORS.default
}

export function getCategoryIcon(category: string): string {
  return CATEGORY_ICONS[category] ?? CATEGORY_ICONS.default
}

// Etichette IT per le categorie oggetti (la colonna `category` resta in
// inglese perché usata come chiave per icone/filtri; qui solo per display).
export const CATEGORY_LABELS: Record<string, string> = {
  'Weapon': 'Arma',
  'Armor': 'Armatura',
  'Adventuring Gear': 'Equipaggiamento',
  'Tools': 'Strumenti',
  'Mounts and Vehicles': 'Cavalcature e Veicoli',
  'Trade Goods': 'Merci',
  'Treasure': 'Tesori',
  'Potion': 'Pozione',
  'Ring': 'Anello',
  'Rod': 'Verga',
  'Scroll': 'Pergamena',
  'Staff': 'Bastone',
  'Wand': 'Bacchetta',
  'Wondrous Items': 'Oggetti Meravigliosi',
  'Equipment Pack': 'Kit Equipaggiamento',
  'Magic Armor': 'Armatura Magica',
  'Magic Weapon': 'Arma Magica',
}

export function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category
}
