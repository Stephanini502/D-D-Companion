import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useDialog } from './Dialog'
import CharacterPreview from './CharacterPreview'

interface Member {
  id: string
  user_id: string
  role: string
  username: string
  character_id: string | null
}

interface CharacterInfo {
  id: string
  name: string
  race: string
  character_class: string
  level: number
  hp_current: number
  hp_max: number
  image_path: string | null
}

const BUCKET = 'characters-images'

const classIcons: Record<string, string> = {
  Barbarian: '🪓', Bard: '🎵', Cleric: '✝️', Druid: '🌿',
  Fighter: '⚔️', Monk: '👊', Paladin: '🛡️', Ranger: '🏹',
  Rogue: '🗡️', Sorcerer: '✨', Warlock: '👁️', Wizard: '📚'
}

export default function MembersTab({
  campaignId,
  userId,
  isMaster,
  inviteCode
}: {
  campaignId: string
  userId: string
  isMaster: boolean
  inviteCode: string
}) {
  const [members, setMembers] = useState<Member[]>([])
  const [characters, setCharacters] = useState<Record<string, CharacterInfo>>({})
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [myCharacters, setMyCharacters] = useState<CharacterInfo[]>([])
  const [showChangeCharacter, setShowChangeCharacter] = useState(false)
  const [newCharacterId, setNewCharacterId] = useState('')
  const [saving, setSaving] = useState(false)
  const { confirm, DialogComponent } = useDialog()

  useEffect(() => {
    loadMembers()
    loadMyCharacters()
  }, [campaignId])

  async function loadMyCharacters() {
    const { data } = await supabase
      .from('characters')
      .select('id, name, race, character_class, level, hp_current, hp_max, image_path')
      .eq('user_id', userId)
      .order('name')
    if (data) setMyCharacters(data)
  }

async function loadMembers() {
  const { data } = await supabase
    .rpc('get_campaign_members', { cid: campaignId })
  if (data) {
    setMembers(data)
    const charIds = data.map((m: Member) => m.character_id).filter(Boolean)
    if (charIds.length > 0) {
      const { data: chars } = await supabase
        .from('characters')
        .select('id, name, race, character_class, level, hp_current, hp_max, image_path')
        .in('id', charIds)
      if (chars) {
        const charMap: Record<string, CharacterInfo> = {}
        const urlMap: Record<string, string> = {}
        chars.forEach(c => {
          charMap[c.id] = c
          if (c.image_path) {
            urlMap[c.id] = supabase.storage
              .from(BUCKET)
              .getPublicUrl(c.image_path).data.publicUrl
          }
        })
        setCharacters(charMap)
        setImageUrls(urlMap)
      }
    }
  }
  setLoading(false)
}

  async function handleChangeCharacter() {
    setSaving(true)
    const myMember = members.find(m => m.user_id === userId)
    if (!myMember) { setSaving(false); return }

    await supabase
      .from('campaign_members')
      .update({ character_id: newCharacterId || null })
      .eq('id', myMember.id)

    setShowChangeCharacter(false)
    setNewCharacterId('')
    loadMembers()
    setSaving(false)
  }

  async function handleRemoveMember(member: Member) {
    const ok = await confirm({
      title: 'Rimuovi Membro',
      message: `Rimuovere ${member.username} dalla campagna?`,
      confirmLabel: 'Rimuovi',
      cancelLabel: 'Annulla',
      danger: true
    })
    if (!ok) return
    await supabase.from('campaign_members').delete().eq('id', member.id)
    loadMembers()
  }

  const myMember = members.find(m => m.user_id === userId)

  if (loading) return <p style={{ color: '#555', textAlign: 'center', padding: 20 }}>Caricamento...</p>

  return (
    <div>
      <DialogComponent />

      {selectedCharacterId && (
        <CharacterPreview
          characterId={selectedCharacterId}
          onClose={() => setSelectedCharacterId(null)}
        />
      )}

      {/* Pulsante cambia personaggio per il giocatore corrente */}
      {!isMaster && myMember && (
        <button
          onClick={() => {
            setNewCharacterId(myMember.character_id ?? '')
            setShowChangeCharacter(true)
          }}
          style={{
            width: '100%', padding: '12px 0', marginBottom: 20,
            background: '#1e1e2a', border: '1px solid #c9a84c',
            color: '#c9a84c', borderRadius: 8, fontWeight: 700, fontSize: 14
          }}
        >
          🔄 Cambia il tuo personaggio
        </button>
      )}

      {/* Modal cambia personaggio */}
      {showChangeCharacter && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setShowChangeCharacter(false)}>
          <div style={{
            background: '#16161f', border: '1px solid #2a2a3a',
            borderRadius: 16, padding: 24, width: '90%', maxWidth: 400
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#c9a84c', margin: '0 0 16px' }}>🔄 Cambia Personaggio</h3>

            {myCharacters.length === 0 ? (
              <p style={{ color: '#555', fontSize: 13 }}>
                Nessun personaggio disponibile — creane uno prima!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {/* Opzione nessun personaggio */}
                <div
                  onClick={() => setNewCharacterId('')}
                  style={{
                    padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                    background: !newCharacterId ? '#c9a84c22' : '#1e1e2a',
                    border: `1px solid ${!newCharacterId ? '#c9a84c' : '#3a3a4a'}`
                  }}
                >
                  <span style={{ fontSize: 13, color: !newCharacterId ? '#c9a84c' : '#888' }}>
                    Nessun personaggio
                  </span>
                </div>

                {myCharacters.map(c => (
                  <div
                    key={c.id}
                    onClick={() => setNewCharacterId(c.id)}
                    style={{
                      padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                      background: newCharacterId === c.id ? '#c9a84c22' : '#1e1e2a',
                      border: `1px solid ${newCharacterId === c.id ? '#c9a84c' : '#3a3a4a'}`,
                      display: 'flex', alignItems: 'center', gap: 10
                    }}
                  >
                    <span style={{ fontSize: 24 }}>{classIcons[c.character_class] ?? '🧙'}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: newCharacterId === c.id ? '#c9a84c' : '#e8e0d0' }}>
                        {c.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#555' }}>
                        {c.race} · {c.character_class} · Liv. {c.level}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleChangeCharacter} disabled={saving} style={{
                flex: 1, padding: '10px 0',
                background: 'linear-gradient(135deg, #c9a84c, #a07830)',
                color: '#0f0f13', border: 'none', borderRadius: 8, fontWeight: 700
              }}>
                {saving ? '...' : 'Salva'}
              </button>
              <button onClick={() => setShowChangeCharacter(false)} style={{
                padding: '10px 16px', background: 'none',
                border: '1px solid #2a2a3a', color: '#888', borderRadius: 8
              }}>Annulla</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Master */}
        <div style={{
          background: '#16161f', border: '1px solid #c9a84c44',
          borderRadius: 10, padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontWeight: 600, color: '#e8e0d0' }}>Master</div>
            <div style={{ fontSize: 12, color: '#666' }}>Creatore della campagna</div>
          </div>
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 4,
            background: '#c9a84c22', color: '#c9a84c', border: '1px solid #c9a84c44'
          }}>👑 Master</span>
        </div>

        {/* Giocatori */}
        {members.map(m => {
          const char = m.character_id ? characters[m.character_id] : null
          const imgUrl = m.character_id ? imageUrls[m.character_id] : null
          const hpPercent = char ? Math.round((char.hp_current / char.hp_max) * 100) : null
          const hpColor = hpPercent !== null
            ? hpPercent > 60 ? '#4caf82' : hpPercent > 30 ? '#c9a84c' : '#e05555'
            : '#555'

          return (
            <div
              key={m.id}
              onClick={() => char && setSelectedCharacterId(char.id)}
              style={{
                background: '#16161f', border: '1px solid #2a2a3a',
                borderRadius: 10, padding: '12px 16px',
                cursor: char ? 'pointer' : 'default',
                transition: 'border-color 0.2s'
              }}
              onMouseEnter={e => char && (e.currentTarget.style.borderColor = '#c9a84c')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2a3a')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

                {/* Avatar */}
                <div style={{
                  width: 52, height: 52, borderRadius: 10, flexShrink: 0,
                  background: '#1e1e2a', border: '1px solid #3a3a4a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  {imgUrl ? (
                    <img src={imgUrl} alt={char?.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 24 }}>
                      {char ? (classIcons[char.character_class] ?? '🧙') : '👤'}
                    </span>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: '#e8e0d0', fontSize: 14 }}>
                    {m.username || 'Giocatore'}
                  </div>

                  {char ? (
                    <>
                      <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                        {char.name} · {char.race} · {char.character_class} Liv.{char.level}
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontSize: 10, color: '#555' }}>PF</span>
                          <span style={{ fontSize: 10, color: hpColor, fontWeight: 600 }}>
                            {char.hp_current}/{char.hp_max}
                          </span>
                        </div>
                        <div style={{ height: 4, background: '#2a2a3a', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', width: `${hpPercent}%`,
                            background: hpColor, borderRadius: 2
                          }} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: '#444', marginTop: 2 }}>
                      Nessun personaggio collegato
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {char && <span style={{ fontSize: 11, color: '#555' }}>👁️</span>}
                  {isMaster && (
                    <button
                      onClick={e => { e.stopPropagation(); handleRemoveMember(m) }}
                      style={{
                        background: 'none', border: 'none',
                        color: '#3a3a4a', fontSize: 18, cursor: 'pointer'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#e05555')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#3a3a4a')}
                    >×</button>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {members.length === 0 && (
          <div style={{ textAlign: 'center', color: '#444', padding: 40 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
            <p>Nessun giocatore ancora.</p>
            <p style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
              Condividi il codice <strong style={{ color: '#c9a84c' }}>{inviteCode}</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}