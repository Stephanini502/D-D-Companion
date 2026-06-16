import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Spell } from '../models/spell'

interface CatalogSpell {
  id: string
  name: string
  level: number
  school: string
  cast_time: string
  range: string
  duration: string
  description: string
  classes: string[]
}

const schoolColors: Record<string, string> = {
  Evocation: '#e05555',
  Necromancy: '#7c4daa',
  Illusion: '#4d7caa',
  Transmutation: '#4caf82',
  Conjuration: '#c9a84c',
  Divination: '#5b8dd9',
  Enchantment: '#d95b8d',
  Abjuration: '#5bd9c9',
}

export default function SpellsTab({
  characterId,
  characterName,
  characterClass
}: {
  characterId: string
  characterName: string
  characterClass: string
}) {
  const [spells, setSpells] = useState<Spell[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [catalog, setCatalog] = useState<CatalogSpell[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterLevel, setFilterLevel] = useState<number | 'all'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  async function loadSpells() {
    const { data } = await supabase
      .from('spells')
      .select('*')
      .eq('character_id', characterId)
      .order('level', { ascending: true })
    if (data) setSpells(data)
    setLoading(false)
  }

  async function loadCatalog() {
    setCatalogLoading(true)
    let query = supabase
      .from('catalog_spells')
      .select('id, name, level, school, cast_time, range, duration, description, classes')
      .order('level', { ascending: true })
      .order('name', { ascending: true })

    if (characterClass) {
      query = query.filter('classes', 'cs', `["${characterClass}"]`)
    }

    const { data } = await query
    if (data) setCatalog(data)
    setCatalogLoading(false)
  }

  useEffect(() => { loadSpells() }, [characterId])
  useEffect(() => { if (showModal) loadCatalog() }, [showModal])

  async function handleAdd(spell: CatalogSpell) {
    const alreadyAdded = spells.some(s => s.name === spell.name)
    if (alreadyAdded) return
    const { error } = await supabase.from('spells').insert({
      character_id: characterId,
      character_name: characterName,
      name: spell.name,
      level: spell.level,
      school: spell.school,
      cast_time: spell.cast_time,
      range: spell.range,
      description: spell.description
    })
    if (!error) loadSpells()
  }

  async function handleDelete(id: string) {
    await supabase.from('spells').delete().eq('id', id)
    loadSpells()
  }

  const filteredCatalog = catalog.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase())
    const matchLevel = filterLevel === 'all' || s.level === filterLevel
    return matchSearch && matchLevel
  })

  const groupedSpells = spells.reduce((acc, spell) => {
    const key = spell.level === 0 ? 'Trucchetti' : `Livello ${spell.level}`
    if (!acc[key]) acc[key] = []
    acc[key].push(spell)
    return acc
  }, {} as Record<string, Spell[]>)

  if (loading) return <p style={{ color: '#555', textAlign: 'center', padding: 20 }}>Caricamento...</p>

  return (
    <div>
      <button
        onClick={() => setShowModal(true)}
        style={{
          width: '100%', padding: '12px 0', marginBottom: 20,
          background: 'linear-gradient(135deg, #c9a84c, #a07830)',
          color: '#0f0f13', border: 'none', borderRadius: 8,
          fontWeight: 700, fontSize: 14
        }}
      >
        + Aggiungi Incantesimo
      </button>

      {spells.length === 0 && (
        <div style={{ textAlign: 'center', color: '#444', padding: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✨</div>
          <p>Nessun incantesimo ancora.</p>
        </div>
      )}

      {Object.entries(groupedSpells).map(([group, groupSpells]) => (
        <div key={group} style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11, color: '#c9a84c', letterSpacing: 1,
            textTransform: 'uppercase', fontWeight: 700, marginBottom: 8
          }}>
            {group}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {groupSpells.map(spell => (
              <div key={spell.id} style={{
                background: '#16161f', border: '1px solid #2a2a3a',
                borderRadius: 10, overflow: 'hidden'
              }}>
                <div
                  onClick={() => setExpanded(expanded === spell.id ? null : spell.id)}
                  style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', padding: '10px 14px', cursor: 'pointer'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: '#e8e0d0' }}>
                        {spell.name}
                      </span>
                      {spell.school && (
                        <span style={{
                          fontSize: 10, padding: '2px 6px', borderRadius: 4,
                          background: (schoolColors[spell.school] ?? '#555') + '33',
                          color: schoolColors[spell.school] ?? '#888',
                          border: `1px solid ${(schoolColors[spell.school] ?? '#555')}55`
                        }}>
                          {spell.school}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                      {spell.cast_time} · {spell.range}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12 }}>{expanded === spell.id ? '▲' : '▼'}</span>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(spell.id) }}
                      style={{
                        background: 'none', border: 'none',
                        color: '#3a3a4a', fontSize: 18, padding: '0 4px',
                        transition: 'color 0.2s'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#e05555')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#3a3a4a')}
                    >×</button>
                  </div>
                </div>
                {expanded === spell.id && spell.description && (
                  <div style={{
                    padding: '0 14px 12px', fontSize: 13, color: '#888',
                    lineHeight: 1.6, borderTop: '1px solid #2a2a3a'
                  }}>
                    <p style={{ paddingTop: 10 }}>{spell.description}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Modale */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          zIndex: 100, display: 'flex', alignItems: 'flex-end',
          justifyContent: 'center'
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: '#16161f', borderRadius: '16px 16px 0 0',
            padding: 20, width: '100%', maxWidth: 480,
            maxHeight: '85vh', display: 'flex', flexDirection: 'column',
            border: '1px solid #2a2a3a', borderBottom: 'none'
          }} onClick={e => e.stopPropagation()}>

            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 16
            }}>
              <h3 style={{ color: '#c9a84c', margin: 0 }}>✨ Scegli Incantesimo</h3>
              <button onClick={() => setShowModal(false)} style={{
                background: 'none', border: 'none', color: '#666', fontSize: 22
              }}>×</button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                placeholder="Cerca..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex: 1 }}
                autoFocus
              />
              <select
                value={filterLevel}
                onChange={e => setFilterLevel(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                style={{ width: 110 }}
              >
                <option value="all">Tutti</option>
                <option value={0}>Trucchetti</option>
                {[1,2,3,4,5,6,7,8,9].map(l => (
                  <option key={l} value={l}>Liv. {l}</option>
                ))}
              </select>
            </div>

            <p style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>
              {catalogLoading ? 'Caricamento...' : `${filteredCatalog.length} incantesimi per ${characterClass}`}
            </p>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {catalogLoading && (
                <p style={{ color: '#555', textAlign: 'center', padding: 20 }}>Caricamento catalogo...</p>
              )}
              {!catalogLoading && filteredCatalog.map(spell => {
                const alreadyAdded = spells.some(s => s.name === spell.name)
                return (
                  <div key={spell.id} style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', padding: '10px 0',
                    borderBottom: '1px solid #1e1e2a'
                  }}>
                    <div style={{ flex: 1, marginRight: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 500, fontSize: 14, color: '#e8e0d0' }}>
                          {spell.name}
                        </span>
                        {spell.school && (
                          <span style={{
                            fontSize: 10, padding: '1px 5px', borderRadius: 3,
                            background: (schoolColors[spell.school] ?? '#555') + '22',
                            color: schoolColors[spell.school] ?? '#888',
                          }}>
                            {spell.school}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
                        {spell.level === 0 ? 'Trucchetto' : `Liv. ${spell.level}`}
                        {` · ${spell.cast_time}`}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAdd(spell)}
                      disabled={alreadyAdded}
                      style={{
                        padding: '5px 14px', borderRadius: 6, border: 'none',
                        background: alreadyAdded ? '#2a2a3a' : 'linear-gradient(135deg, #c9a84c, #a07830)',
                        color: alreadyAdded ? '#555' : '#0f0f13',
                        cursor: alreadyAdded ? 'default' : 'pointer',
                        fontSize: 13, fontWeight: 600, flexShrink: 0
                      }}
                    >
                      {alreadyAdded ? '✓' : '+ Aggiungi'}
                    </button>
                  </div>
                )
              })}
              {!catalogLoading && filteredCatalog.length === 0 && (
                <p style={{ color: '#555', textAlign: 'center', marginTop: 30 }}>
                  Nessun incantesimo trovato.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}