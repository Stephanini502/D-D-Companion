import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import ws from 'ws'

config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { realtime: { transport: ws as any } }
)

// ============================================================
// RAZZE EXTRA
// Aggiungi qui nuove razze che mancano dal dataset SRD
// ============================================================
const extraRaces = [
  {
    id: 'aasimar',
    name: 'Aasimar',
    speed: 30,
    size: 'Medium',
    traits: ['Healing Hands', 'Light Bearer', 'Celestial Resistance', 'Darkvision'],
    languages: ['Common', 'Celestial'],
    ability_bonuses: [{ ability_score: { name: 'CAR' }, bonus: 2 }],
    data: {}
  }
]

// ============================================================
// CLASSI EXTRA
// Aggiungi qui classi che mancano dal dataset
// ============================================================
const extraClasses = [
{}
]

// ============================================================
// INCANTESIMI EXTRA
// Aggiungi qui incantesimi che mancano dal dataset SRD
// ============================================================
const extraSpells = [
{}
]

// ============================================================
// OGGETTI EXTRA
// Aggiungi qui oggetti/equipaggiamento che mancano
// ============================================================
const extraItems = [
{}
]

// ============================================================
// FUNZIONI DI INSERIMENTO
// ============================================================

async function insertExtraRaces() {
  if (extraRaces.length === 0) { console.log('Nessuna razza extra da inserire.'); return }
  console.log(`Inserimento ${extraRaces.length} razze extra...`)
  const { error } = await supabase.from('catalog_races').upsert(extraRaces)
  if (error) console.error('Errore razze:', error)
  else console.log(`✓ ${extraRaces.length} razze extra inserite`)
}

async function insertExtraClasses() {
  if (extraClasses.length === 0) { console.log('Nessuna classe extra da inserire.'); return }
  console.log(`Inserimento ${extraClasses.length} classi extra...`)
  const { error } = await supabase.from('catalog_classes').upsert(extraClasses)
  if (error) console.error('Errore classi:', error)
  else console.log(`✓ ${extraClasses.length} classi extra inserite`)
}

async function insertExtraSpells() {
  if (extraSpells.length === 0) { console.log('Nessun incantesimo extra da inserire.'); return }
  console.log(`Inserimento ${extraSpells.length} incantesimi extra...`)
  const { error } = await supabase.from('catalog_spells').upsert(extraSpells)
  if (error) console.error('Errore incantesimi:', error)
  else console.log(`✓ ${extraSpells.length} incantesimi extra inseriti`)
}

async function insertExtraItems() {
  if (extraItems.length === 0) { console.log('Nessun oggetto extra da inserire.'); return }
  console.log(`Inserimento ${extraItems.length} oggetti extra...`)
  const { error } = await supabase.from('catalog_items').upsert(extraItems)
  if (error) console.error('Errore oggetti:', error)
  else console.log(`✓ ${extraItems.length} oggetti extra inseriti`)
}

async function main() {
  console.log('Inserimento dati extra...')
  await insertExtraRaces()
  await insertExtraClasses()
  await insertExtraSpells()
  await insertExtraItems()
  console.log('Completato!')
}

main()