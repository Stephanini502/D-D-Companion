import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Character } from '../models/character'
import CreateCharacterPage from './CreateCharacterPage'
import CharacterPage from './CharacterPage'
import CampaignsPage from './CampaignsPage'

type Section = 'characters' | 'campaigns'

export default function HomePage() {
  const [section, setSection] = useState<Section>('characters')
  const [characters, setCharacters] = useState<Character[]>([])
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<Character | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadCharacters() {
    const { data } = await supabase
      .from('characters')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setCharacters(data)
    setLoading(false)
  }

  useEffect(() => { loadCharacters() }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Eliminare questo personaggio?')) return
    await supabase.from('spells').delete().eq('character_id', id)
    await supabase.from('inventory_items').delete().eq('character_id', id)
    await supabase.from('characters').delete().eq('id', id)
    loadCharacters()
  }

  if (creating) return (
    <CreateCharacterPage onCreated={() => { setCreating(false); loadCharacters() }} />
  )

  if (selected) return (
    <CharacterPage character={selected} onBack={() => { setSelected(null); loadCharacters() }} />
  )

  const classIcons: Record<string, string> = {
    Barbarian: '🪓', Bard: '🎵', Cleric: '✝️', Druid: '🌿',
    Fighter: '⚔️', Monk: '👊', Paladin: '🛡️', Ranger: '🏹',
    Rogue: '🗡️', Sorcerer: '✨', Warlock: '👁️', Wizard: '📚'
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 24px', borderBottom: '1px solid #2a2a3a'
      }}>
        <h1 style={{ color: '#c9a84c', fontSize: 20, fontWeight: 700, margin: 0 }}>⚔️ D&D Companion</h1>
        <button
          onClick={handleLogout}
          style={{
            background: 'none', border: '1px solid #2a2a3a',
            color: '#888', borderRadius: 8, padding: '6px 12px', fontSize: 13
          }}
        >Esci</button>
      </div>

      {/* Nav bar */}
      <div style={{
        display: 'flex', borderBottom: '1px solid #2a2a3a',
        padding: '0 24px'
      }}>
        {([
          { key: 'characters', label: '👤 Personaggi' },
          { key: 'campaigns', label: '🗺️ Campagne' },
        ] as { key: Section, label: string }[]).map(s => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            style={{
              padding: '12px 16px', background: 'none', border: 'none',
              borderBottom: section === s.key ? '2px solid #c9a84c' : '2px solid transparent',
              color: section === s.key ? '#c9a84c' : '#555',
              fontWeight: section === s.key ? 700 : 400,
              cursor: 'pointer', fontSize: 14, transition: 'color 0.2s'
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 24 }}>

        {/* Sezione Personaggi */}
        {section === 'characters' && (
          <>
            <button
              onClick={() => setCreating(true)}
              style={{
                width: '100%', padding: '14px 0', marginBottom: 24,
                background: 'linear-gradient(135deg, #c9a84c, #a07830)',
                color: '#0f0f13', border: 'none', borderRadius: 10,
                fontWeight: 700, fontSize: 15, letterSpacing: 0.5
              }}
            >
              + Nuovo Personaggioooooo
            </button>

            {loading && <p style={{ color: '#555', textAlign: 'center' }}>Caricamento...</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {characters.map(c => (
                <div
                  key={c.id}
                  onClick={() => setSelected(c)}
                  style={{
                    background: '#16161f', border: '1px solid #2a2a3a',
                    borderRadius: 12, padding: 16, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 16,
                    position: 'relative', transition: 'border-color 0.2s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#c9a84c')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2a3a')}
                >
                  <div style={{
                    width: 52, height: 52, borderRadius: 10,
                    background: '#1e1e2a', border: '1px solid #3a3a4a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 26, flexShrink: 0
                  }}>
                    {classIcons[c.character_class] ?? '🧙'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#e8e0d0' }}>{c.name}</div>
                    <div style={{ color: '#888', fontSize: 13, marginTop: 2 }}>
                      {c.race} · {c.character_class}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <span style={{
                        background: '#1e1e2a', border: '1px solid #3a3a4a',
                        borderRadius: 4, padding: '2px 8px', fontSize: 11, color: '#c9a84c'
                      }}>Liv. {c.level}</span>
                      <span style={{
                        background: '#1e1e2a', border: '1px solid #3a3a4a',
                        borderRadius: 4, padding: '2px 8px', fontSize: 11, color: '#e05555'
                      }}>❤️ {c.hp_current}/{c.hp_max}</span>
                    </div>
                  </div>
                  <button
                    onClick={e => handleDelete(c.id, e)}
                    style={{
                      background: 'none', border: 'none',
                      color: '#3a3a4a', fontSize: 20, padding: 4, transition: 'color 0.2s'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#e05555')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#3a3a4a')}
                  >×</button>
                </div>
              ))}
            </div>

            {!loading && characters.length === 0 && (
              <div style={{ textAlign: 'center', color: '#444', marginTop: 60 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
                <p>Nessun personaggio ancora.</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>Crea il tuo primo avventuriero!</p>
              </div>
            )}
          </>
        )}

        {/* Sezione Campagne */}
        {section === 'campaigns' && <CampaignsPage />}

      </div>
    </div>
  )
}