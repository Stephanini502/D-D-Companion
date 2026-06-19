import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import ws from 'ws'

config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    realtime: {
      transport: ws as any
    }
  }
)

const BASE_URL_2014 = 'https://raw.githubusercontent.com/5e-bits/5e-database/refs/heads/main/src/2014/en'
const BASE_URL_2024 = 'https://raw.githubusercontent.com/5e-bits/5e-database/refs/heads/main/src/2024/en'

async function fetchJSON(file: string, base = BASE_URL_2014) {
  const url = `${base}/${file}`
  console.log('Fetching:', url)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status}: ${res.statusText} — ${url}`)
  return res.json()
}

async function importSpells() {
  console.log('Importando incantesimi...')
  const spells = await fetchJSON('5e-SRD-Spells.json')

  const rows = spells.map((s: any) => ({
    id: s.index,
    name: s.name,
    level: s.level,
    school: s.school?.name ?? '',
    cast_time: s.casting_time ?? '',
    range: s.range ?? '',
    duration: s.duration ?? '',
    description: s.desc?.join('\n') ?? '',
    classes: s.classes?.map((c: any) => c.name) ?? [],
    components: s.components ?? [],
    data: s
  }))

  const { error } = await supabase.from('catalog_spells').upsert(rows)
  if (error) console.error('Errore spells:', error)
  else console.log(`✓ ${rows.length} incantesimi importati`)
}

async function importClassTraits() {
  console.log('Importando tratti di classe...')
  const classes = await fetchJSON('5e-SRD-Classes.json', BASE_URL_2024)

  const rows: any[] = []

  for (const cls of classes) {
    const classLevels = await fetchJSON(`5e-SRD-Classes/${cls.index}/levels.json`, BASE_URL_2024).catch(() => null)

    if (!classLevels) continue

    const featuresMap = new Map<string, any>()

    for (const levelData of classLevels) {
      const levelNum = levelData.level
      const features = levelData.features ?? []

      for (const feature of features) {
        if (featuresMap.has(feature.index)) continue

        const detail = await fetchJSON(`5e-SRD-Features/${feature.index}.json`, BASE_URL_2024).catch(() => null)
        if (!detail) continue

        featuresMap.set(feature.index, {
          id: `class-${feature.index}`,
          name: detail.name ?? feature.name,
          description: detail.desc?.join('\n') ?? '',
          races: [],
          classes: [cls.name],
          level_required: levelNum,
          data: detail
        })
      }
    }

    rows.push(...featuresMap.values())
  }

  // Upsert a blocchi di 50
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50)
    const { error } = await supabase.from('catalog_traits').upsert(chunk)
    if (error) console.error(`Errore tratti classe chunk ${i}:`, error)
  }

  console.log(`✓ ${rows.length} tratti di classe importati`)
}

async function importClasses() {
  console.log('Importando classi...')
  const classes = await fetchJSON('5e-SRD-Classes.json', BASE_URL_2024)

  const rows = classes.map((c: any) => ({
    id: c.index,
    name: c.name,
    hit_die: c.hit_die,
    proficiencies: c.proficiencies?.map((p: any) => p.name) ?? [],
    saving_throws: c.saving_throws?.map((s: any) => s.name) ?? [],
    spellcasting_ability: c.spellcasting?.spellcasting_ability?.name ?? null,
    data: c
  }))

  const { error } = await supabase.from('catalog_classes').upsert(rows)
  if (error) console.error('Errore classi:', error)
  else console.log(`✓ ${rows.length} classi importate`)
}

async function importRaces() {
  console.log('Importando razze...')
  const races = await fetchJSON('5e-SRD-Species.json', BASE_URL_2024)

  const rows = races.map((r: any) => ({
    id: r.index,
    name: r.name,
    speed: r.speed,
    size: r.size,
    traits: r.traits?.map((t: any) => t.name) ?? [],
    languages: r.languages?.map((l: any) => l.name) ?? [],
    ability_bonuses: r.ability_bonuses ?? [],
    data: r
  }))

  const { error } = await supabase.from('catalog_races').upsert(rows)
  if (error) console.error('Errore razze:', error)
  else console.log(`✓ ${rows.length} razze importate`)
}

async function importItems() {
  console.log('Importando oggetti...')
  const items = await fetchJSON('5e-SRD-Equipment.json', BASE_URL_2024)

  const rows = items.map((i: any) => ({
    id: i.index,
    name: i.name,
    category: i.equipment_category?.name ?? '',
    cost: i.cost ? `${i.cost.quantity} ${i.cost.unit}` : '',
    weight: i.weight ?? 0,
    description: i.desc?.join('\n') ?? '',
    damage: i.damage?.damage_dice ?? '',
    armor_class: i.armor_class?.base?.toString() ?? '',
    data: i
  }))

  const { error } = await supabase.from('catalog_items').upsert(rows)
  if (error) console.error('Errore oggetti:', error)
  else console.log(`✓ ${rows.length} oggetti importati`)
}

async function main() {
  await importSpells()
  await importClasses()
  await importRaces()
  await importItems()
  await importClassTraits()
  console.log('Importazione completata!')
}

main()