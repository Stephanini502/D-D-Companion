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

const CONDITIONS = [
  'Avvelenato', 'Stordito', 'Paralizzato', 'Prono',
  'Invisibile', 'Spaventato', 'Affascinato', 'Accecato',
  'Assordato', 'Esausto', 'Trattenuto', 'Incapacitato'
]

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
  const [currentTurn, setCurrentTurn] = useState(0)
  const [round, setRound] = useState(1)
  const [name, setName] = useState('')
  const [initiative, setInitiative] = useState('')
  const [hpMax, setHpMax] = useState('')
  const [isPlayer, setIsPlayer] = useState(false)
  const [showConditions, setShowConditions] = useState<string | null>(null)
  const { confirm, DialogComponent } = useDialog()

  async function loadCombatants() {
    const { data } = await supabase
      .from('initiative_tracker')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('initiative', { ascending: false })
    if (data) setCombatants(data)
    setLoading(false)
  }

  useEffect(() => { loadCombatants() }, [campaignId])

  async function handleAdd() {
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
      message: 'Sei sicuro di voler resettare il tracker iniziativa? Tutti i combattenti verranno rimossi.',
      confirmLabel: '🗑️ Reset',
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

  if (loading) return <p style={{ color: '#555', textAlign: 'center', padding: 20 }}>Caricamento...</p>

  return (
    <div>
      <DialogComponent />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          flex: 1, padding: '10px 0',
          background: 'linear-gradient(135deg, #c9a84c, #a07830)',
          color: '#0f0f13', border: 'none', borderRadius: 8,
          fontWeight: 700, fontSize: 14
        }}>+ Aggiungi</button>
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
              }}>🗑️</button>
            )}
          </>
        )}
      </div>

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

      {showAdd && (
        <div style={{
          background: '#16161f', border: '1px solid #2a2a3a',
          borderRadius: 12, padding: 16, marginBottom: 16
        }}>
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
            <button onClick={handleAdd} style={{
              flex: 1, padding: '8px 0',
              background: 'linear-gradient(135deg, #c9a84c, #a07830)',
              color: '#0f0f13', border: 'none', borderRadius: 8, fontWeight: 700
            }}>Aggiungi</button>
            <button onClick={() => setShowAdd(false)} style={{
              padding: '8px 16px', background: 'none',
              border: '1px solid #2a2a3a', color: '#888', borderRadius: 8
            }}>Annulla</button>
          </div>
        </div>
      )}

      {combatants.length === 0 && !showAdd && (
        <div style={{ textAlign: 'center', color: '#444', padding: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚡</div>
          <p>Nessun combattente.</p>
          <p style={{ fontSize: 13, color: '#555', marginTop: 4 }}>Aggiungi giocatori e nemici per iniziare!</p>
        </div>
      )}

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
                      <span style={{ fontSize: 10 }}>{c.is_player ? '👤' : '👹'}</span>
                      {isActive && (
                        <span style={{
                          fontSize: 9, padding: '1px 5px', borderRadius: 3,
                          background: '#c9a84c22', color: '#c9a84c', border: '1px solid #c9a84c44'
                        }}>TURNO</span>
                      )}
                    </div>

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

                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={() => setShowConditions(showConditions === c.id ? null : c.id)}
                      style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', padding: 4 }}
                    >{UI_ICONS.initiative_extras}</button>
                    <button
                      onClick={() => handleRemove(c.id)}
                      style={{ background: 'none', border: 'none', color: '#3a3a4a', fontSize: 18, cursor: 'pointer', padding: 4 }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#e05555')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#3a3a4a')}
                    >×</button>
                  </div>
                </div>
              </div>

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