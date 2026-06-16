import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { config } from 'dotenv'
import ws from 'ws'

config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { realtime: { transport: ws as any } }
)

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

async function translate(text: string): Promise<string> {
  if (!text) return ''
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Traduci in italiano questo testo di D&D 5e. Rispondi solo con la traduzione, senza spiegazioni né virgolette.\n\n${text}`
    }]
  })
  return (message.content[0] as any).text
}

async function translateSpells() {
  console.log('Recupero incantesimi...')
  const { data: spells, error } = await supabase
    .from('catalog_spells')
    .select('id, name, description, school, cast_time, range, duration')

  if (error || !spells) { console.error(error); return }

  console.log(`Traduco ${spells.length} incantesimi...`)

  for (let i = 0; i < spells.length; i++) {
    const spell = spells[i]
    console.log(`[${i + 1}/${spells.length}] ${spell.name}`)

    try {
      const [name, description] = await Promise.all([
        translate(spell.name),
        translate(spell.description)
      ])

      await supabase
        .from('catalog_spells')
        .update({ name, description })
        .eq('id', spell.id)

      // Pausa per non superare i rate limit
      await new Promise(r => setTimeout(r, 300))
    } catch (err) {
      console.error(`Errore su ${spell.name}:`, err)
    }
  }

  console.log('✓ Incantesimi tradotti!')
}

async function translateItems() {
  console.log('Recupero oggetti...')
  const { data: items, error } = await supabase
    .from('catalog_items')
    .select('id, name, description, category')

  if (error || !items) { console.error(error); return }

  console.log(`Traduco ${items.length} oggetti...`)

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    console.log(`[${i + 1}/${items.length}] ${item.name}`)

    try {
      const [name, description, category] = await Promise.all([
        translate(item.name),
        translate(item.description),
        translate(item.category)
      ])

      await supabase
        .from('catalog_items')
        .update({ name, description, category })
        .eq('id', item.id)

      await new Promise(r => setTimeout(r, 300))
    } catch (err) {
      console.error(`Errore su ${item.name}:`, err)
    }
  }

  console.log('✓ Oggetti tradotti!')
}

async function translateClasses() {
  console.log('Recupero classi...')
  const { data: classes, error } = await supabase
    .from('catalog_classes')
    .select('id, name')

  if (error || !classes) { console.error(error); return }

  for (let i = 0; i < classes.length; i++) {
    const cls = classes[i]
    console.log(`[${i + 1}/${classes.length}] ${cls.name}`)

    try {
      const name = await translate(cls.name)
      await supabase
        .from('catalog_classes')
        .update({ name })
        .eq('id', cls.id)

      await new Promise(r => setTimeout(r, 300))
    } catch (err) {
      console.error(`Errore su ${cls.name}:`, err)
    }
  }

  console.log('✓ Classi tradotte!')
}

async function translateRaces() {
  console.log('Recupero razze...')
  const { data: races, error } = await supabase
    .from('catalog_races')
    .select('id, name')

  if (error || !races) { console.error(error); return }

  for (let i = 0; i < races.length; i++) {
    const race = races[i]
    console.log(`[${i + 1}/${races.length}] ${race.name}`)

    try {
      const name = await translate(race.name)
      await supabase
        .from('catalog_races')
        .update({ name })
        .eq('id', race.id)

      await new Promise(r => setTimeout(r, 300))
    } catch (err) {
      console.error(`Errore su ${race.name}:`, err)
    }
  }

  console.log('✓ Razze tradotte!')
}

async function main() {
  await translateSpells()
  await translateItems()
  await translateClasses()
  await translateRaces()
  console.log('Traduzione completata!')
}

main()