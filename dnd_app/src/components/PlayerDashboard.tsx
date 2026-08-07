import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { UI_ICONS, getClassIcon, getRelationshipColor, QUEST_STATUS } from '../icons'
import { Quest } from '../models/Quest'
import { Environment } from '../models/Environment'
import { Handout } from '../models/Handout'
import { DiaryEntry } from '../models/DiaryEntry'
import { Goal } from '../models/Goal'
import { Character } from '../models/character'

const BUCKET = 'campaign-images'

export default function PlayerDashboard({
  campaignId,
  userId,
}: {
  campaignId: string
  userId: string
}) {
  const [quests, setQuests] = useState<Quest[]>([])
  const [environment, setEnvironment] = useState<Environment | null>(null)
  const [handouts, setHandouts] = useState<Handout[]>([])
  const [diary, setDiary] = useState<DiaryEntry | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [character, setCharacter] = useState<Character | null>(null)
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState<'overview' | 'diary' | 'goals'>('overview')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // Diario
  const [diaryContent, setDiaryContent] = useState('')
  const [savingDiary, setSavingDiary] = useState(false)
  const [diaryChanged, setDiaryChanged] = useState(false)

  // Obiettivi
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [goalTitle, setGoalTitle] = useState('')
  const [goalDesc, setGoalDesc] = useState('')

  // Handout espanso
  const [expandedHandout, setExpandedHandout] = useState<string | null>(null)
  const [expandedQuest, setExpandedQuest] = useState<string | null>(null)

  // NPCs
  const [npcs, setNpcs] = useState<{id: string, name: string, role: string, description: string, relationship: string, image_path?: string | null}[]>([])
  const [expandedNpc, setExpandedNpc] = useState<string | null>(null)

  useEffect(() => {
    loadAll()

    // Realtime — aggiorna ambientazione e handout in tempo reale
    const channel = supabase
      .channel(`player_dashboard:${campaignId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public',
        table: 'campaign_environment',
        filter: `campaign_id=eq.${campaignId}`
      }, () => loadEnvironment())
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'campaign_handouts',
        filter: `campaign_id=eq.${campaignId}`
      }, () => loadHandouts())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [campaignId, userId])

  async function loadNpcs() {
  const { data } = await supabase
    .from('campaign_npcs')
    .select('id, name, role, description, relationship, image_path')
    .eq('campaign_id', campaignId)
    .order('name')
  if (data) setNpcs(data)
}

  async function loadAll() {
    setLoading(true)
    await Promise.all([
      loadCharacter(),
      loadQuests(),
      loadNpcs(),
      loadEnvironment(),
      loadHandouts(),
      loadDiary(),
      loadGoals(),
    ])
    setLoading(false)
  }

  async function loadCharacter() {
    const { data: member } = await supabase
      .from('campaign_members')
      .select('character_id')
      .eq('campaign_id', campaignId)
      .eq('user_id', userId)
      .single()
    if (!member?.character_id) return
    const { data: char } = await supabase
      .from('characters')
      .select('*')
      .eq('id', member.character_id)
      .single()
    if (char) setCharacter(char)
  }

  async function loadQuests() {
    const { data } = await supabase
      .from('campaign_quests')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
    if (data) setQuests(data)
  }

  async function loadEnvironment() {
    const { data } = await supabase
      .from('campaign_environment')
      .select('*')
      .eq('campaign_id', campaignId)
      .single()
    if (data) setEnvironment(data)
  }

  async function loadHandouts() {
    const { data } = await supabase
      .from('campaign_handouts')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('sent_at', { ascending: false })
    if (data) setHandouts(data)
  }

  async function loadDiary() {
    const { data } = await supabase
      .from('player_diary')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('user_id', userId)
      .single()
    if (data) {
      setDiary(data)
      setDiaryContent(data.content ?? '')
    }
  }

  async function loadGoals() {
    const { data } = await supabase
      .from('player_goals')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    if (data) setGoals(data)
  }

  async function saveDiary() {
    setSavingDiary(true)
    if (diary) {
      await supabase.from('player_diary')
        .update({ content: diaryContent, updated_at: new Date().toISOString() })
        .eq('id', diary.id)
    } else {
      await supabase.from('player_diary').insert({
        campaign_id: campaignId,
        user_id: userId,
        content: diaryContent
      })
    }
    setSavingDiary(false)
    setDiaryChanged(false)
    loadDiary()
  }

  async function addGoal() {
    if (!goalTitle) return
    await supabase.from('player_goals').insert({
      campaign_id: campaignId,
      user_id: userId,
      title: goalTitle,
      description: goalDesc,
      completed: false
    })
    setGoalTitle(''); setGoalDesc('')
    setShowGoalForm(false)
    loadGoals()
  }

  async function toggleGoal(goal: Goal) {
    await supabase.from('player_goals')
      .update({ completed: !goal.completed })
      .eq('id', goal.id)
    setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, completed: !g.completed } : g))
  }

  async function deleteGoal(id: string) {
    await supabase.from('player_goals').delete().eq('id', id)
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  function getHandoutImageUrl(path: string) {
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  }

  if (loading) return <p style={{ color: '#555', textAlign: 'center', padding: 20 }}>Caricamento...</p>

  const activeQuests = quests.filter(q => q.status === 'active')
  const completedQuests = quests.filter(q => q.status === 'completed')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Personaggio */}
      {character && (
        <div style={{
          background: '#16161f', border: '1px solid #2a2a3a',
          borderRadius: 12, padding: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 10,
              background: '#1e1e2a', border: '2px solid #2a2a3a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, flexShrink: 0
            }}>
              {getClassIcon(character.character_class)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#e8e0d0' }}>{character.name}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                {character.race} · {character.character_class} · Liv. {character.level}
              </div>
              <div style={{
                marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#1e1e2a', border: '1px solid #2a2a3a',
                borderRadius: 8, padding: '4px 10px'
              }}>
                <span style={{ fontSize: 11, color: '#888' }}>{UI_ICONS.hp} PF Massimi</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#e05555' }}>{character.hp_max}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ambientazione attiva dal master */}
      {environment && (environment.location || environment.weather || environment.time_of_day) && (
        <div style={{
          background: '#1a1a2e', border: '1px solid #5b8dd944',
          borderRadius: 12, padding: 16
        }}>
          <div style={{
            fontSize: 11, color: '#5b8dd9', letterSpacing: 1,
            textTransform: 'uppercase', fontWeight: 700, marginBottom: 10
          }}>
            {UI_ICONS.environment} Ambientazione Attuale
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {environment.location && (
              <span style={{
                fontSize: 13, padding: '4px 12px', borderRadius: 20,
                background: '#5b8dd922', color: '#5b8dd9', border: '1px solid #5b8dd944'
              }}>{UI_ICONS.location} {environment.location}</span>
            )}
            {environment.weather && (
              <span style={{
                fontSize: 13, padding: '4px 12px', borderRadius: 20,
                background: '#4caf8222', color: '#4caf82', border: '1px solid #4caf8244'
              }}>{UI_ICONS.weather} {environment.weather}</span>
            )}
            {environment.time_of_day && (
              <span style={{
                fontSize: 13, padding: '4px 12px', borderRadius: 20,
                background: '#c9a84c22', color: '#c9a84c', border: '1px solid #c9a84c44'
              }}>{UI_ICONS.time} {environment.time_of_day}</span>
            )}
            {environment.atmosphere && (
              <span style={{
                fontSize: 13, padding: '4px 12px', borderRadius: 20,
                background: '#7c4daa22', color: '#7c4daa', border: '1px solid #7c4daa44'
              }}>{UI_ICONS.atmosphere} {environment.atmosphere}</span>
            )}
          </div>
        </div>
      )}

      {/* Switcher sezioni */}
      <div style={{ display: 'flex', gap: 6 }}>
        {([
          { key: 'overview', label: `${UI_ICONS.overview} Panoramica` },
          { key: 'diary', label: `${UI_ICONS.diary} Diario` },
          { key: 'goals', label: `${UI_ICONS.goals} Obiettivi` },
        ] as const).map(s => (
          <button key={s.key} onClick={() => setSection(s.key)} style={{
            flex: 1, padding: '8px 4px', fontSize: 11,
            background: section === s.key ? '#c9a84c22' : '#1e1e2a',
            border: `1px solid ${section === s.key ? '#c9a84c' : '#2a2a3a'}`,
            color: section === s.key ? '#c9a84c' : '#555',
            borderRadius: 8, fontWeight: section === s.key ? 700 : 400,
            cursor: 'pointer'
          }}>{s.label}</button>
        ))}
      </div>

      {/* PANORAMICA */}
      {section === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Quest */}
          <div style={{ background: '#16161f', border: '1px solid #2a2a3a', borderRadius: 12, padding: 16 }}>
            <div style={{ fontWeight: 700, color: '#e8e0d0', fontSize: 14, marginBottom: 12 }}>
              {UI_ICONS.quest} Quest ({activeQuests.length} attive)
            </div>
            {quests.length === 0 && (
              <p style={{ color: '#444', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
                Nessuna quest ancora.
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {quests.map(quest => (
                <div key={quest.id} style={{
                  background: '#1e1e2a', borderRadius: 8, overflow: 'hidden',
                  border: `1px solid ${QUEST_STATUS[quest.status].color}33`
                }}>
                  <div
                    onClick={() => setExpandedQuest(expandedQuest === quest.id ? null : quest.id)}
                    style={{ padding: '10px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#e8e0d0' }}>{quest.title}</span>
                      <span style={{
                        marginLeft: 8, fontSize: 10, padding: '1px 6px', borderRadius: 3,
                        background: QUEST_STATUS[quest.status].color + '22',
                        color: QUEST_STATUS[quest.status].color,
                        border: `1px solid ${QUEST_STATUS[quest.status].color}44`
                      }}>{QUEST_STATUS[quest.status].label}</span>
                    </div>
                    <span style={{ color: '#555', fontSize: 11 }}>
                      {expandedQuest === quest.id ? '▲' : '▼'}
                    </span>
                  </div>
                  {expandedQuest === quest.id && quest.description && (
                    <div style={{
                      padding: '8px 12px 12px', fontSize: 12, color: '#888',
                      lineHeight: 1.7, borderTop: '1px solid #2a2a3a', whiteSpace: 'pre-wrap'
                    }}>
                      {quest.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* PNG*/}
          {npcs.length > 0 && (
            <div style={{ background: '#16161f', border: '1px solid #2a2a3a', borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 700, color: '#e8e0d0', fontSize: 14, marginBottom: 12 }}>
                {UI_ICONS.npc} Personaggi Importanti
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {npcs.map(npc => {
                  const relColor = getRelationshipColor(npc.relationship)
                  return (
                    <div key={npc.id} style={{
                      background: '#1e1e2a', borderRadius: 8, overflow: 'hidden',
                      borderLeft: `3px solid ${relColor}`
                    }}>
                      <div
                        onClick={() => setExpandedNpc(expandedNpc === npc.id ? null : npc.id)}
                        style={{
                          padding: '10px 12px', cursor: 'pointer',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          {npc.image_path && (
                            <img src={getHandoutImageUrl(npc.image_path)} alt={npc.name}
                              style={{ width: 34, height: 34, borderRadius: 6, objectFit: 'cover', flexShrink: 0, border: '1px solid #3a3a4a' }} />
                          )}
                          <div style={{ minWidth: 0 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#e8e0d0' }}>
                              {npc.name}
                            </span>
                            {npc.role && (
                              <span style={{ fontSize: 11, color: '#555', marginLeft: 8 }}>
                                {npc.role}
                              </span>
                            )}
                            <span style={{
                              marginLeft: 8, fontSize: 10, padding: '1px 6px', borderRadius: 3,
                              background: relColor + '22', color: relColor,
                            }}>{npc.relationship}</span>
                          </div>
                        </div>
                        <span style={{ color: '#555', fontSize: 11, flexShrink: 0, marginLeft: 8 }}>
                          {expandedNpc === npc.id ? '▲' : '▼'}
                        </span>
                      </div>
                      {expandedNpc === npc.id && (npc.image_path || npc.description) && (
                        <div style={{ padding: '8px 12px 12px', borderTop: '1px solid #2a2a3a' }}>
                          {npc.image_path && (
                            <img src={getHandoutImageUrl(npc.image_path)} alt={npc.name}
                              onClick={() => setLightboxUrl(getHandoutImageUrl(npc.image_path!))}
                              style={{
                                width: '100%', borderRadius: 8, marginBottom: npc.description ? 8 : 0,
                                cursor: 'zoom-in', border: '1px solid #2a2a3a'
                              }} />
                          )}
                          {npc.description && (
                            <div style={{ fontSize: 12, color: '#888', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                              {npc.description}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Handout ricevuti */}
          {handouts.length > 0 && (
            <div style={{ background: '#16161f', border: '1px solid #2a2a3a', borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 700, color: '#e8e0d0', fontSize: 14, marginBottom: 12 }}>
                {UI_ICONS.handout} Messaggi dal Master
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {handouts.map(h => (
                  <div key={h.id} style={{
                    background: '#1e1e2a', borderRadius: 8, overflow: 'hidden'
                  }}>
                    <div
                      onClick={() => setExpandedHandout(expandedHandout === h.id ? null : h.id)}
                      style={{
                        padding: '10px 12px', cursor: 'pointer',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#c9a84c' }}>{h.title}</div>
                        <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>
                          {new Date(h.sent_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <span style={{ color: '#555', fontSize: 11 }}>
                        {expandedHandout === h.id ? '▲' : '▼'}
                      </span>
                    </div>
                    {expandedHandout === h.id && (
                      <div style={{ padding: '0 12px 12px', borderTop: '1px solid #2a2a3a' }}>
                        {h.content && (
                          <p style={{ fontSize: 13, color: '#888', lineHeight: 1.7, marginTop: 10, whiteSpace: 'pre-wrap' }}>
                            {h.content}
                          </p>
                        )}
                        {h.image_path && (
                          <img
                            src={getHandoutImageUrl(h.image_path)}
                            onClick={() => setLightboxUrl(getHandoutImageUrl(h.image_path!))}
                            style={{
                              width: '100%', borderRadius: 8, marginTop: 8,
                              cursor: 'zoom-in', border: '1px solid #2a2a3a'
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Statistiche rapide */}
          {character && (
            <div style={{ background: '#16161f', border: '1px solid #2a2a3a', borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 700, color: '#e8e0d0', fontSize: 14, marginBottom: 12 }}>
                {UI_ICONS.stats} Statistiche
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {Object.entries(character.stats).map(([key, val]) => {
                  const mod = Math.floor((val - 10) / 2)
                  return (
                    <div key={key} style={{
                      background: '#1e1e2a', borderRadius: 8, padding: '10px 8px', textAlign: 'center'
                    }}>
                      <div style={{ fontSize: 10, color: '#555', letterSpacing: 1, textTransform: 'uppercase' }}>{key}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#e8e0d0', marginTop: 4 }}>{val}</div>
                      <div style={{ fontSize: 12, color: '#c9a84c', fontWeight: 600, marginTop: 2 }}>
                        {mod >= 0 ? '+' : ''}{mod}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* DIARIO */}
      {section === 'diary' && (
        <div style={{ background: '#16161f', border: '1px solid #2a2a3a', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: '#e8e0d0', fontSize: 14 }}>{UI_ICONS.diary} Diario Personale</div>
            <div style={{ fontSize: 11, color: '#444' }}>Visibile solo a te</div>
          </div>
          <textarea
            value={diaryContent}
            onChange={e => { setDiaryContent(e.target.value); setDiaryChanged(true) }}
            placeholder="Scrivi i tuoi appunti privati, pensieri del personaggio, note sulla storia..."
            rows={12}
            style={{ width: '100%', resize: 'vertical', marginBottom: 12, lineHeight: 1.7 }}
          />
          <button
            onClick={saveDiary}
            disabled={savingDiary || !diaryChanged}
            style={{
              width: '100%', padding: '10px 0',
              background: diaryChanged
                ? 'linear-gradient(135deg, #c9a84c, #a07830)'
                : '#2a2a3a',
              color: diaryChanged ? '#0f0f13' : '#555',
              border: 'none', borderRadius: 8, fontWeight: 700, cursor: diaryChanged ? 'pointer' : 'default',
              transition: 'all 0.2s'
            }}
          >
            {savingDiary ? 'Salvataggio...' : diaryChanged ? `${UI_ICONS.save} Salva Diario` : `${UI_ICONS.check} Salvato`}
          </button>
          {diary && (
            <p style={{ fontSize: 11, color: '#444', textAlign: 'center', marginTop: 8 }}>
              Ultimo salvataggio: {new Date(diary.updated_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      )}

      {/* OBIETTIVI */}
      {section === 'goals' && (
        <div style={{ background: '#16161f', border: '1px solid #2a2a3a', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: '#e8e0d0', fontSize: 14 }}>{UI_ICONS.goals} Obiettivi del Personaggio</div>
            <button onClick={() => setShowGoalForm(true)} style={{
              background: 'linear-gradient(135deg, #c9a84c, #a07830)',
              border: 'none', color: '#0f0f13', borderRadius: 6,
              padding: '4px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer'
            }}>{UI_ICONS.add} Nuovo</button>
          </div>

          {showGoalForm && (
            <div style={{ background: '#1e1e2a', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <input placeholder="Obiettivo *" value={goalTitle}
                onChange={e => setGoalTitle(e.target.value)}
                style={{ width: '100%', marginBottom: 8 }} autoFocus />
              <textarea placeholder="Descrizione..." value={goalDesc}
                onChange={e => setGoalDesc(e.target.value)}
                rows={3} style={{ width: '100%', resize: 'vertical', marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={addGoal} style={{
                  flex: 1, padding: '6px 0',
                  background: 'linear-gradient(135deg, #c9a84c, #a07830)',
                  border: 'none', color: '#0f0f13', borderRadius: 6, fontWeight: 700, cursor: 'pointer'
                }}>Salva</button>
                <button onClick={() => { setShowGoalForm(false); setGoalTitle(''); setGoalDesc('') }} style={{
                  padding: '6px 12px', background: 'none',
                  border: '1px solid #2a2a3a', color: '#888', borderRadius: 6, cursor: 'pointer'
                }}>Annulla</button>
              </div>
            </div>
          )}

          {goals.length === 0 && !showGoalForm && (
            <p style={{ color: '#444', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
              Nessun obiettivo ancora. Cosa vuole raggiungere il tuo personaggio?
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {goals.map(goal => (
              <div key={goal.id} style={{
                background: '#1e1e2a', borderRadius: 8, padding: '10px 12px',
                display: 'flex', alignItems: 'flex-start', gap: 10,
                opacity: goal.completed ? 0.6 : 1
              }}>
                <div
                  onClick={() => toggleGoal(goal)}
                  style={{
                    width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 2,
                    background: goal.completed ? '#c9a84c' : 'transparent',
                    border: `2px solid ${goal.completed ? '#c9a84c' : '#3a3a4a'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontSize: 12, color: '#0f0f13', fontWeight: 700
                  }}
                >
                  {goal.completed ? UI_ICONS.check : ''}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: '#e8e0d0',
                    textDecoration: goal.completed ? 'line-through' : 'none'
                  }}>
                    {goal.title}
                  </div>
                  {goal.description && (
                    <div style={{ fontSize: 12, color: '#666', marginTop: 4, whiteSpace: 'pre-wrap' }}>
                      {goal.description}
                    </div>
                  )}
                </div>
                <button onClick={() => deleteGoal(goal.id)} style={{
                  background: 'none', border: 'none', color: '#3a3a4a',
                  fontSize: 16, cursor: 'pointer', flexShrink: 0
                }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#e05555')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#3a3a4a')}
                >{UI_ICONS.close}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox handout */}
      {lightboxUrl && (
        <div onClick={() => setLightboxUrl(null)} style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'rgba(0,0,0,0.95)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'zoom-out'
        }}>
          <img src={lightboxUrl}
            style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: 12 }}
            onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightboxUrl(null)} style={{
            position: 'absolute', top: 20, right: 20,
            background: 'rgba(255,255,255,0.1)', border: 'none',
            color: '#fff', fontSize: 24, width: 40, height: 40,
            borderRadius: '50%', cursor: 'pointer'
          }}>{UI_ICONS.close}</button>
        </div>
      )}
    </div>
  )
}