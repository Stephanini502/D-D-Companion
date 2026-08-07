import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Character } from '../models/character'
import { useDialog } from '../components/Dialog'
import { getClassIcon, UI_ICONS } from '../icons'

export default function CharacterListPage() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const { confirm, DialogComponent } = useDialog()
  const navigate = useNavigate()

  async function loadCharacters() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('characters')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setCharacters(data)
    setLoading(false)
  }

  useEffect(() => { loadCharacters() }, [])

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    const ok = await confirm({
      title: 'Elimina Personaggio',
      message: 'Sei sicuro di voler eliminare questo personaggio? Questa azione è irreversibile.',
      confirmLabel: `${UI_ICONS.delete} Elimina`,
      cancelLabel: 'Annulla',
      danger: true
    })
    if (!ok) return
    await supabase.from('spells').delete().eq('character_id', id)
    await supabase.from('inventory_items').delete().eq('character_id', id)
    await supabase.from('characters').delete().eq('id', id)
    loadCharacters()
  }

  return (
    <>
      <DialogComponent />

      <button onClick={() => navigate('/personaggi/nuovo')} style={{
        width: '100%', padding: '14px 0', marginBottom: 24,
        background: 'linear-gradient(135deg, #c9a84c, #a07830)',
        color: '#0f0f13', border: 'none', borderRadius: 10,
        fontWeight: 700, fontSize: 15, letterSpacing: 0.5
      }}>
        {UI_ICONS.add} Nuovo Personaggio
      </button>

      {loading && <p style={{ color: '#555', textAlign: 'center' }}>Caricamento...</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {characters.map(c => (
          <div key={c.id} onClick={() => navigate(`/personaggi/${c.id}`)} style={{
            background: '#16161f', border: '1px solid #2a2a3a',
            borderRadius: 12, padding: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 16,
            transition: 'border-color 0.2s'
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
              {getClassIcon(c.character_class)}
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
                }}>{UI_ICONS.hp} PF {c.hp_max}</span>
              </div>
            </div>
            <button onClick={e => handleDelete(c.id, e)} style={{
              background: 'none', border: 'none',
              color: '#3a3a4a', fontSize: 20, padding: 4,
              transition: 'color 0.2s', cursor: 'pointer'
            }}
              onMouseEnter={e => (e.currentTarget.style.color = '#e05555')}
              onMouseLeave={e => (e.currentTarget.style.color = '#3a3a4a')}
            >{UI_ICONS.close}</button>
          </div>
        ))}
      </div>

      {!loading && characters.length === 0 && (
        <div style={{ textAlign: 'center', color: '#444', marginTop: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{UI_ICONS.campaign}</div>
          <p>Nessun personaggio ancora.</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Crea il tuo primo avventuriero!</p>
        </div>
      )}
    </>
  )
}
