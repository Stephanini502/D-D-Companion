// Esporta il contenuto attuale (inglese) dei cataloghi oggetti e incantesimi
// in scripts/_catalog_en.json, così da poterlo tradurre e rigenerare gli UPDATE.
//
//   npx tsx scripts/export-catalog.ts
//
// Richiede VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nel .env (già presenti).

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { writeFileSync } from 'fs'
import ws from 'ws'

config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { realtime: { transport: ws as any } }
)

async function fetchAll(table: string, columns: string) {
  const rows: any[] = []
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) { console.error(`Errore su ${table}:`, error.message); break }
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < pageSize) break
  }
  return rows
}

async function main() {
  console.log('Esporto oggetti...')
  const items = await fetchAll('catalog_items', 'id, name, category, description')
  console.log(`  ${items.length} oggetti`)

  console.log('Esporto incantesimi...')
  const spells = await fetchAll('catalog_spells', 'id, name, description')
  console.log(`  ${spells.length} incantesimi`)

  const out = { items, spells }
  writeFileSync('scripts/_catalog_en.json', JSON.stringify(out, null, 2), 'utf-8')
  console.log('✓ Scritto scripts/_catalog_en.json')
}

main()
