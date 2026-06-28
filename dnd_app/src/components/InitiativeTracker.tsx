import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useDialog } from './Dialog'
import { UI_ICONS } from '../data/icons'

interface Combatant {
  id: string
  name: string
  initiative: number
  hp_current: number | null
  hp_max: number | null
  is_player: boolean
  conditions: string[]
  order_index: number
}

interface CampaignMember {
  id: string
  username: string
  character_id: string | null
  character?: {
    id: string
    name: string
    hp_current: number
    hp_max: number
    stats: Record<string, number>
  }
}

interface Monster {
  id: string
  name: string
  hp: number | null
  ac: number | null
  challenge_rating: string
  type: string | null
}

const CONDITIONS = [
  'Avvelenato', 'Stordito', 'Paralizzato', 'Prono',
  'Invisibile', 'Spaventato', 'Affascinato', 'Accecato',
  'Assordato', 'Esausto', 'Trattenuto', 'Incapacitato'
]

const CR_COLORS: Record<string, string> = {
  '0': '#555', '1/8': '#4caf82', '1/4': '#4caf82', '1/2': '#4caf82',
  '1': '#5b8dd9', '2': '#5b8dd9', '3': '#5b8dd9', '4': '#5b8dd9',
  '5': '#c9a84c', '6': '#c9a84c', '7': '#c9a84c', '8': '#c9a84c',
  '9': '#e05555', '10': '#e05555', '11': '#e05555', '12': '#e05555',
  '13': '#7c4daa', '14': '#7c4daa', '15': '#7c4daa', '16': '#7c4daa',
  '17': '#7c4daa', '18': '#7c4daa', '19': '#7c4daa', '20': '#7c4daa',
}

type AddMode = 'custom' | 'monster' | 'player'

export default function InitiativeTracker({
  campaignId,
  isMaster
}: {
  campaignId: string
  isMaster: boolean
}) {
  const [combatants, setCombatants] = useState<Combatant[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addMode, setAddMode] = useState<AddMode>('custom')
  const [currentTurn, setCurrentTurn] = useState(0)
  const [round, setRound] = useState(1)
  const [showConditions, setShowConditions] = useState<string | null>(null)
  const { confirm, DialogComponent } = useDialog()

  // Form custom
  const [name, setName] = useState('')
  const [initiative, setInitiative] = useState('')
  const [hpMax, setHpMax] = useState('')
  const [isPlayer, setIsPlayer] = useState(false)

  // Mostri
  const [monsters, setMonsters] = useState<Monster[]>([])
  const [monstersLoading, setMonstersLoading] = useState(false)
  const [monsterSearch, setMonsterSearch] = useState('')
  const [monsterInitiative, setMonsterInitiative] = useState('')
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null)

  // Giocatori campagna
  const [members, setMembers] = useState<CampaignMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [playerInitiatives, setPlayerInitiatives] = useState<Record<string, string>>({})

  async function loadCombatants() {
    const { data } = await supabase
      .from('initiative_tracker')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('initiative', { ascending: false })
    if (data) setCombatants(data)
    setLoading(false)
  }

  async function loadMonsters() {
    setMonstersLoading(true)
    const { data } = await supabase
      .from('catalog_monsters')
      .select('id, name, hp, ac, challenge_rating, type')
      .order('name')
    if (data) setMonsters(data)
    setMonstersLoading(false)
  }

  async function loadMembers() {
    setMembersLoading(true)
    const { data } = await supabase
      .rpc('get_campaign_members', { cid: campaignId })
    if (data) {
      // Carica i personaggi collegati
      const membersWithChars = await Promise.all(data.map(async (m: any) => {
        if (!m.character_id) return { ...m, character: null }
        const { data: charData } = await supabase
          .from('characters')
          .select('id, name, hp_current, hp_max, stats')
          .eq('id', m.character_id)
          .single()
        return { ...m, character: charData }
      }))
      setMembers(membersWithChars)
    }
    setMembersLoading(false)
  }

  useEffect(() => { loadCombatants() }, [campaignId])

  useEffect(() => {
    if (showAdd && addMode === 'monster' && monsters.length === 0) loadMonsters()
    if (showAdd && addMode === 'player' && members.length === 0) loadMembers()
  }, [showAdd, addMode])

  async function handleAddCustom() {
    if (!name || !initiative) return
    const hp = hpMax ? Number(hpMax) : null
    await supabase.from('initiative_tracker').insert({
      campaign_id: campaignId,
      name, initiative: Number(initiative),
      hp_current: hp, hp_max: hp,
      is_player: isPlayer, conditions: []
    })
    setName(''); setInitiative(''); setHpMax(''); setIsPlayer(false)
    setShowAdd(false)
    loadCombatants()
  }

  async function handleAddMonster() {
    if (!selectedMonster || !monsterInitiative) return
    await supabase.from('initiative_tracker').insert({
      campaign_id: campaignId,
      name: selectedMonster.name,
      initiative: Number(monsterInitiative),
      hp_current: selectedMonster.hp,
      hp_max: selectedMonster.hp,
      is_player: false,
      conditions: []
    })
    setSelectedMonster(null)
    setMonsterInitiative('')
    setMonsterSearch('')
    setShowAdd(false)
    loadCombatants()
  }

  async function handleAddPlayers() {
    const toAdd = members.filter(m => {
      const init = playerInitiatives[m.id]
      return init && init !== ''
    })
    if (toAdd.length === 0) return

    await Promise.all(toAdd.map(m => {
      const char = m.character
      return supabase.from('initiative_tracker').insert({
        campaign_id: campaignId,
        name: char ? char.name : m.username,
        initiative: Number(playerInitiatives[m.id]),
        hp_current: char ? char.hp_current : null,
        hp_max: char ? char.hp_max : null,
        is_player: true,
        conditions: []
      })
    }))

    setPlayerInitiatives({})
    setShowAdd(false)
    loadCombatants()
  }

  async function updateHp(id: string, delta: number) {
    const c = combatants.find(x => x.id === id)
    if (!c || c.hp_current === null) return
    const newHp = Math.max(0, c.hp_current + delta)
    await supabase.from('initiative_tracker').update({ hp_current: newHp }).eq('id', id)
    loadCombatants()
  }

  async function toggleCondition(id: string, condition: string) {
    const c = combatants.find(x => x.id === id)
    if (!c) return
    const current = c.conditions ?? []
    const updated = current.includes(condition)
      ? current.filter(x => x !== condition)
      : [...current, condition]
    await supabase.from('initiative_tracker').update({ conditions: updated }).eq('id', id)
    loadCombatants()
  }

  async function handleRemove(id: string) {
    await supabase.from('initiative_tracker').delete().eq('id', id)
    loadCombatants()
  }

  async function handleClearAll() {
    const ok = await confirm({
      title: 'Reset Iniziativa',
      message: 'Sei sicuro di voler resettare il tracker? Tutti i combattenti verranno rimossi.',
      confirmLabel: `${UI_ICONS.delete} Reset`,
      cancelLabel: 'Annulla',
      danger: true
    })
    if (!ok) return
    await supabase.from('initiative_tracker').delete().eq('campaign_id', campaignId)
    setCurrentTurn(0)
    setRound(1)
    loadCombatants()
  }

  function nextTurn() {
    if (combatants.length === 0) return
    const next = (currentTurn + 1) % combatants.length
    if (next === 0) setRound(r => r + 1)
    setCurrentTurn(next)
  }

  const filteredMonsters = monsters.filter(m =>
    m.name.toLowerCase().includes(monsterSearch.toLowerCase())
  )

  if (loading) return <p style={{ color: '#555', textAlign: 'center', padding: 20 }}>Caricamento...</p>

  return (
    <div>
      <DialogComponent />

      {/* Bottoni azione */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          flex: 1, padding: '10px 0',
          background: 'linear-gradient(135deg, #c9a84c, #a07830)',
          color: '#0f0f13', border: 'none', borderRadius: 8,
          fontWeight: 700, fontSize: 14
        }}>{showAdd ? UI_ICONS.close : `${UI_ICONS.add} Aggiungi`}</button>
        {combatants.length > 0 && (
          <>
            <button onClick={nextTurn} style={{
              flex: 1, padding: '10px 0',
              background: '#1e1e2a', border: '1px solid #4caf82',
              color: '#4caf82', borderRadius: 8, fontWeight: 700, fontSize: 14
            }}>▶ Avanti</button>
            {isMaster && (
              <button onClick={handleClearAll} style={{
                padding: '10px 12px',
                background: '#1e1e2a', border: '1px solid #e05555',
                color: '#e05555', borderRadius: 8, fontSize: 14
              }}>{UI_ICONS.delete}</button>
            )}
          </>
        )}
      </div>

      {/* Turno attivo */}
      {combatants.length > 0 && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#1e1e2a', border: '1px solid #2a2a3a',
          borderRadius: 8, padding: '8px 16px', marginBottom: 16
        }}>
          <span style={{ fontSize: 13, color: '#888' }}>
            Turno di: <strong style={{ color: '#c9a84c' }}>{combatants[currentTurn]?.name}</strong>
          </span>
          <span style={{ fontSize: 12, color: '#555' }}>Round {round}</span>
        </div>
      )}

      {/* Form aggiunta */}
      {showAdd && (
        <div style={{
          background: '#16161f', border: '1px solid #2a2a3a',
          borderRadius: 12, padding: 16, marginBottom: 16
        }}>
          {/* Switcher modalità */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {([
              { key: 'custom', label: `${UI_ICONS.custom} Custom` },
              { key: 'monster', label: `👹 Mostro` },
              { key: 'player', label: `${UI_ICONS.player} Giocatori` },
            ] as { key: AddMode, label: string }[]).map(m => (
              <button key={m.key} onClick={() => setAddMode(m.key)} style={{
                flex: 1, padding: '8px 4px',
                background: addMode === m.key ? '#c9a84c22' : '#1e1e2a',
                border: `1px solid ${addMode === m.key ? '#c9a84c' : '#2a2a3a'}`,
                color: addMode === m.key ? '#c9a84c' : '#555',
                borderRadius: 8, fontWeight: addMode === m.key ? 700 : 400,
                cursor: 'pointer', fontSize: 12
              }}>{m.label}</button>
            ))}
          </div>

          {/* FORM CUSTOM */}
          {addMode === 'custom' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 8, marginBottom: 8 }}>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="Nome *" style={{ width: '100%' }} autoFocus />
                <input type="number" value={initiative} onChange={e => setInitiative(e.target.value)}
                  placeholder="Init." style={{ width: '100%', textAlign: 'center' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <input type="number" value={hpMax} onChange={e => setHpMax(e.target.value)}
                  placeholder="PF Max (opz.)" style={{ width: '100%' }} />
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: '#1e1e2a', border: '1px solid #3a3a4a',
                  borderRadius: 6, padding: '0 12px', cursor: 'pointer'
                }}>
                  <input type="checkbox" checked={isPlayer} onChange={e => setIsPlayer(e.target.checked)} />
                  <span style={{ fontSize: 13, color: '#888' }}>Giocatore</span>
                </label>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleAddCustom} style={{
                  flex: 1, padding: '8px 0',
                  background: 'linear-gradient(135deg, #c9a84c, #a07830)',
                  color: '#0f0f13', border: 'none', borderRadius: 8, fontWeight: 700
                }}>{UI_ICONS.add} Aggiungi</button>
                <button onClick={() => setShowAdd(false)} style={{
                  padding: '8px 16px', background: 'none',
                  border: '1px solid #2a2a3a', color: '#888', borderRadius: 8
                }}>Annulla</button>
              </div>
            </>
          )}

          {/* FORM MOSTRO */}
          {addMode === 'monster' && (
            <>
              <input
                placeholder="Cerca mostro..."
                value={monsterSearch}
                onChange={e => { setMonsterSearch(e.target.value); setSelectedMonster(null) }}
                style={{ width: '100%', marginBottom: 8 }}
                autoFocus
              />

              {/* Mostro selezionato */}
              {selectedMonster && (
                <div style={{
                  background: '#1e1e2a', border: '1px solid #c9a84c',
                  borderRadius: 8, padding: '10px 14px', marginBottom: 8
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#c9a84c', fontSize: 14 }}>
                        {selectedMonster.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                        {selectedMonster.type}
                        {selectedMonster.hp ? ` · PF ${selectedMonster.hp}` : ''}
                        {selectedMonster.ac ? ` · CA ${selectedMonster.ac}` : ''}
                        {` · CR ${selectedMonster.challenge_rating}`}
                      </div>
                    </div>
                    <button onClick={() => setSelectedMonster(null)} style={{
                      background: 'none', border: 'none', color: '#555', fontSize: 18, cursor: 'pointer'
                    }}>{UI_ICONS.close}</button>
                  </div>
                  <input
                    type="number"
                    placeholder="Iniziativa *"
                    value={monsterInitiative}
                    onChange={e => setMonsterInitiative(e.target.value)}
                    style={{ width: '100%', marginTop: 8, textAlign: 'center' }}
                    autoFocus
                  />
                </div>
              )}

              {/* Lista mostri */}
              {!selectedMonster && (
                <div style={{
                  maxHeight: 220, overflowY: 'auto',
                  border: '1px solid #2a2a3a', borderRadius: 8, marginBottom: 8
                }}>
                  {monstersLoading && (
                    <p style={{ color: '#555', textAlign: 'center', padding: 16, fontSize: 13 }}>
                      {UI_ICONS.loading} Caricamento bestario...
                    </p>
                  )}
                  {!monstersLoading && filteredMonsters.length === 0 && (
                    <p style={{ color: '#444', textAlign: 'center', padding: 16, fontSize: 13 }}>
                      Nessun mostro trovato.
                    </p>
                  )}
                  {!monstersLoading && filteredMonsters.map(m => (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMonster(m)}
                      style={{
                        padding: '8px 14px', borderBottom: '1px solid #1e1e2a',
                        cursor: 'pointer', transition: 'background 0.1s'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#1e1e2a')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 14, color: '#e8e0d0', fontWeight: 500 }}>
                          {m.name}
                        </span>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {m.hp && (
                            <span style={{ fontSize: 11, color: '#e05555' }}>
                              {UI_ICONS.hp} {m.hp}
                            </span>
                          )}
                          <span style={{
                            fontSize: 10, padding: '1px 5px', borderRadius: 3,
                            background: (CR_COLORS[m.challenge_rating] ?? '#555') + '22',
                            color: CR_COLORS[m.challenge_rating] ?? '#555',
                            border: `1px solid ${CR_COLORS[m.challenge_rating] ?? '#555'}44`
                          }}>
                            CR {m.challenge_rating}
                          </span>
                        </div>
                      </div>
                      {m.type && (
                        <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{m.type}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleAddMonster}
                  disabled={!selectedMonster || !monsterInitiative}
                  style={{
                    flex: 1, padding: '8px 0',
                    background: selectedMonster && monsterInitiative
                      ? 'linear-gradient(135deg, #c9a84c, #a07830)'
                      : '#2a2a3a',
                    color: selectedMonster && monsterInitiative ? '#0f0f13' : '#555',
                    border: 'none', borderRadius: 8, fontWeight: 700,
                    cursor: selectedMonster && monsterInitiative ? 'pointer' : 'default'
                  }}
                >
                  {UI_ICONS.add} Aggiungi Mostro
                </button>
                <button onClick={() => setShowAdd(false)} style={{
                  padding: '8px 16px', background: 'none',
                  border: '1px solid #2a2a3a', color: '#888', borderRadius: 8
                }}>Annulla</button>
              </div>
            </>
          )}

          {/* FORM GIOCATORI */}
          {addMode === 'player' && (
            <>
              {membersLoading && (
                <p style={{ color: '#555', textAlign: 'center', padding: 16, fontSize: 13 }}>
                  Caricamento giocatori...
                </p>
              )}
              {!membersLoading && members.length === 0 && (
                <p style={{ color: '#444', textAlign: 'center', padding: 16, fontSize: 13 }}>
                  Nessun giocatore nella campagna.
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {members.map(m => {
                  const char = m.character
                  return (
                    <div key={m.id} style={{
                      background: '#1e1e2a', border: '1px solid #2a2a3a',
                      borderRadius: 8, padding: '10px 14px',
                      display: 'flex', alignItems: 'center', gap: 10
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#e8e0d0' }}>
                          {char ? char.name : m.username}
                        </div>
                        {char && (
                          <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                            {m.username} · {UI_ICONS.hp} {char.hp_current}/{char.hp_max}
                          </div>
                        )}
                        {!char && (
                          <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>
                            Nessun personaggio collegato
                          </div>
                        )}
                      </div>
                      <input
                        type="number"
                        placeholder="Init."
                        value={playerInitiatives[m.id] ?? ''}
                        onChange={e => setPlayerInitiatives(prev => ({ ...prev, [m.id]: e.target.value }))}
                        style={{ width: 60, textAlign: 'center', fontSize: 14, fontWeight: 700 }}
                      />
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleAddPlayers} style={{
                  flex: 1, padding: '8px 0',
                  background: 'linear-gradient(135deg, #c9a84c, #a07830)',
                  color: '#0f0f13', border: 'none', borderRadius: 8, fontWeight: 700
                }}>{UI_ICONS.add} Aggiungi Selezionati</button>
                <button onClick={() => setShowAdd(false)} style={{
                  padding: '8px 16px', background: 'none',
                  border: '1px solid #2a2a3a', color: '#888', borderRadius: 8
                }}>Annulla</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Empty state */}
      {combatants.length === 0 && !showAdd && (
        <div style={{ textAlign: 'center', color: '#444', padding: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>{UI_ICONS.initiative}</div>
          <p>Nessun combattente.</p>
          <p style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
            Aggiungi giocatori e nemici per iniziare!
          </p>
        </div>
      )}

      {/* Lista combattenti */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {combatants.map((c, i) => {
          const isActive = i === currentTurn
          const hpPercent = c.hp_max ? Math.round((c.hp_current ?? 0) / c.hp_max * 100) : null
          const hpColor = hpPercent !== null
            ? hpPercent > 60 ? '#4caf82' : hpPercent > 30 ? '#c9a84c' : '#e05555'
            : '#555'

          return (
            <div key={c.id} style={{
              background: '#16161f',
              border: `1px solid ${isActive ? '#c9a84c' : '#2a2a3a'}`,
              borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.2s'
            }}>
              <div style={{ padding: '10px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

                  {/* Badge iniziativa */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                    background: isActive ? '#c9a84c' : '#1e1e2a',
                    border: `1px solid ${isActive ? '#c9a84c' : '#3a3a4a'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 16,
                    color: isActive ? '#0f0f13' : '#c9a84c'
                  }}>{c.initiative}</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 600, color: isActive ? '#c9a84c' : '#e8e0d0', fontSize: 14 }}>
                        {c.name}
                      </span>
                      <span style={{ fontSize: 10 }}>{c.is_player ? UI_ICONS.player : UI_ICONS.enemy}</span>
                      {isActive && (
                        <span style={{
                          fontSize: 9, padding: '1px 5px', borderRadius: 3,
                          background: '#c9a84c22', color: '#c9a84c', border: '1px solid #c9a84c44'
                        }}>TURNO</span>
                      )}
                    </div>

                    {/* Barra HP */}
                    {c.hp_max !== null && (
                      <div style={{ marginTop: 4 }}>
                        <div style={{ height: 4, background: '#2a2a3a', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                          <div style={{
                            height: '100%', width: `${hpPercent}%`,
                            background: hpColor, borderRadius: 2, transition: 'width 0.3s'
                          }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button onClick={() => updateHp(c.id, -1)} style={{
                            width: 20, height: 20, borderRadius: 4, border: '1px solid #e05555',
                            background: 'none', color: '#e05555', fontSize: 14,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                          }}>−</button>
                          <span style={{ fontSize: 12, color: hpColor, fontWeight: 600 }}>
                            {c.hp_current}/{c.hp_max}
                          </span>
                          <button onClick={() => updateHp(c.id, 1)} style={{
                            width: 20, height: 20, borderRadius: 4, border: '1px solid #4caf82',
                            background: 'none', color: '#4caf82', fontSize: 14,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                          }}>+</button>
                        </div>
                      </div>
                    )}

                    {/* Condizioni attive */}
                    {c.conditions && c.conditions.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {c.conditions.map(cond => (
                          <span key={cond} style={{
                            fontSize: 9, padding: '1px 5px', borderRadius: 3,
                            background: '#e0555522', color: '#e05555', border: '1px solid #e0555544'
                          }}>{cond}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Azioni */}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={() => setShowConditions(showConditions === c.id ? null : c.id)}
                      style={{
                        background: 'none', border: 'none',
                        fontSize: 16, cursor: 'pointer', padding: 4,
                        color: c.conditions?.length > 0 ? '#e05555' : '#444'
                      }}
                      title="Condizioni"
                    >⚡</button>
                    <button
                      onClick={() => handleRemove(c.id)}
                      style={{
                        background: 'none', border: 'none',
                        color: '#3a3a4a', fontSize: 18, cursor: 'pointer', padding: 4
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#e05555')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#3a3a4a')}
                    >{UI_ICONS.close}</button>
                  </div>
                </div>
              </div>

              {/* Pannello condizioni */}
              {showConditions === c.id && (
                <div style={{
                  padding: '8px 14px 12px', borderTop: '1px solid #2a2a3a',
                  display: 'flex', flexWrap: 'wrap', gap: 6
                }}>
                  {CONDITIONS.map(cond => {
                    const active = c.conditions?.includes(cond)
                    return (
                      <button key={cond} onClick={() => toggleCondition(c.id, cond)} style={{
                        fontSize: 11, padding: '3px 8px', borderRadius: 4,
                        background: active ? '#e0555533' : '#1e1e2a',
                        color: active ? '#e05555' : '#666',
                        border: `1px solid ${active ? '#e05555' : '#3a3a4a'}`,
                        cursor: 'pointer'
                      }}>{cond}</button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}