import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { SKILLS, getSkillBonus, formatBonus } from '../data/skills'
import { getProficiencyBonus } from '../data/raceTraits'
import { UI_ICONS } from '../data/icons'

interface Talent {
  id: string
  name: string
  description: string
}

interface Trait {
  id: string
  name: string
  description: string
  level_required?: number
}

export default function AbilitiesTab({
  characterId,
  characterRace,
  characterClass,
  characterLevel,
  stats,
}: {
  characterId: string
  characterRace: string
  characterClass: string
  characterLevel: number
  stats: Record<string, number>
}) {
  const [skillProficiencies, setSkillProficiencies] = useState<Record<string, boolean>>({})
  const [talents, setTalents] = useState<Talent[]>([])
  const [traits, setTraits] = useState<Trait[]>([])
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState<'skills' | 'traits' | 'talents'>('skills')
  const [expandedTrait, setExpandedTrait] = useState<string | null>(null)

  // Form talento
  const [showTalentForm, setShowTalentForm] = useState(false)
  const [talentName, setTalentName] = useState('')
  const [talentDesc, setTalentDesc] = useState('')
  const [saving, setSaving] = useState(false)

  const profBonus = getProficiencyBonus(characterLevel)

  useEffect(() => {
    async function load() {
      // Carica competenze abilità
      const { data: charData } = await supabase
        .from('characters')
        .select('skill_proficiencies')
        .eq('id', characterId)
        .single()
      if (charData?.skill_proficiencies) {
        setSkillProficiencies(charData.skill_proficiencies)
      }

      // Carica talenti
      const { data: talentData } = await supabase
        .from('character_talents')
        .select('*')
        .eq('character_id', characterId)
        .order('created_at', { ascending: true })
      if (talentData) setTalents(talentData)

      // Carica tratti razziali
      const { data: raceTraitData } = await supabase
        .from('catalog_traits')
        .select('id, name, description, level_required')
        .filter('races', 'cs', `["${characterRace}"]`)

      // Carica tratti di classe filtrati per livello
      const { data: classTraitData } = await supabase
        .from('catalog_traits')
        .select('id, name, description, level_required')
        .filter('classes', 'cs', `["${characterClass}"]`)
        .lte('level_required', characterLevel)
        .order('level_required', { ascending: true })

      const allTraits = [
        ...(raceTraitData ?? []),
        ...(classTraitData ?? [])
      ]
      setTraits(allTraits)

      setLoading(false)
    }
    load()
  }, [characterId, characterRace, characterClass, characterLevel])

  async function toggleProficiency(skillName: string) {
    const updated = {
      ...skillProficiencies,
      [skillName]: !skillProficiencies[skillName]
    }
    setSkillProficiencies(updated)
    await supabase
      .from('characters')
      .update({ skill_proficiencies: updated })
      .eq('id', characterId)
  }

  async function handleAddTalent() {
    if (!talentName) return
    setSaving(true)
    await supabase.from('character_talents').insert({
      character_id: characterId,
      name: talentName,
      description: talentDesc
    })
    setTalentName('')
    setTalentDesc('')
    setShowTalentForm(false)

    const { data } = await supabase
      .from('character_talents')
      .select('*')
      .eq('character_id', characterId)
      .order('created_at', { ascending: true })
    if (data) setTalents(data)
    setSaving(false)
  }

  async function handleDeleteTalent(id: string) {
    await supabase.from('character_talents').delete().eq('id', id)
    setTalents(prev => prev.filter(t => t.id !== id))
  }

  // Separa tratti razziali da tratti di classe per visualizzarli divisi
  const raceTraits = traits.filter(t => !t.level_required || t.level_required === 0
    ? true
    : false
  )
  const classTraits = traits.filter(t => t.level_required && t.level_required > 0)

  if (loading) return <p style={{ color: '#555', textAlign: 'center', padding: 20 }}>Caricamento...</p>

  return (
    <div>

      {/* Sezione switcher */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {([
          { key: 'skills', label: '🎯 Abilità' },
          { key: 'traits', label: '⭐ Tratti' },
          { key: 'talents', label: '✨ Talenti' },
        ] as const).map(s => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            style={{
              flex: 1, padding: '8px 4px',
              background: section === s.key ? '#c9a84c22' : '#1e1e2a',
              border: `1px solid ${section === s.key ? '#c9a84c' : '#2a2a3a'}`,
              color: section === s.key ? '#c9a84c' : '#555',
              borderRadius: 8, fontWeight: section === s.key ? 700 : 400,
              cursor: 'pointer', fontSize: 12
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Tab Abilità */}
      {section === 'skills' && (
        <div>
          <div style={{ fontSize: 11, color: '#555', marginBottom: 12 }}>
            Tocca un'abilità per segnare la competenza · Bonus competenza:{' '}
            <strong style={{ color: '#c9a84c' }}>+{profBonus}</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {SKILLS.map(skill => {
              const isProficient = skillProficiencies[skill.name] ?? false
              const bonus = getSkillBonus(skill.name, stats, profBonus, skillProficiencies)
              return (
                <div
                  key={skill.name}
                  onClick={() => toggleProficiency(skill.name)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                    background: isProficient ? '#c9a84c11' : '#16161f',
                    border: `1px solid ${isProficient ? '#c9a84c44' : '#2a2a3a'}`,
                    transition: 'all 0.15s'
                  }}
                >
                  {/* Pallino competenza */}
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                    background: isProficient ? '#c9a84c' : 'transparent',
                    border: `2px solid ${isProficient ? '#c9a84c' : '#3a3a4a'}`,
                    transition: 'all 0.15s'
                  }} />

                  {/* Nome abilità */}
                  <span style={{
                    flex: 1, fontSize: 14,
                    color: isProficient ? '#e8e0d0' : '#888',
                    fontWeight: isProficient ? 600 : 400
                  }}>
                    {skill.name}
                  </span>

                  {/* Stat di riferimento */}
                  <span style={{
                    fontSize: 10, color: '#444',
                    letterSpacing: 1, textTransform: 'uppercase'
                  }}>
                    {skill.stat}
                  </span>

                  {/* Bonus */}
                  <span style={{
                    fontSize: 15, fontWeight: 700, minWidth: 32, textAlign: 'right',
                    color: isProficient ? '#c9a84c' : '#666'
                  }}>
                    {formatBonus(bonus)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tab Tratti */}
      {section === 'traits' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {traits.length === 0 && (
            <div style={{ textAlign: 'center', color: '#444', padding: 40 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⭐</div>
              <p>Nessun tratto disponibile.</p>
              <p style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
                I tratti vengono caricati automaticamente dal catalogo.
              </p>
            </div>
          )}

          {/* Tratti razziali */}
          {raceTraits.length > 0 && (
            <>
              <div style={{
                fontSize: 11, color: '#c9a84c', letterSpacing: 1,
                textTransform: 'uppercase', fontWeight: 700, marginBottom: 4
              }}>
                ⭐ Tratti Razziali — {characterRace}
              </div>
              {raceTraits.map(trait => (
                <div
                  key={trait.id}
                  style={{
                    background: '#16161f', border: '1px solid #2a2a3a',
                    borderRadius: 10, overflow: 'hidden'
                  }}
                >
                  <div
                    onClick={() => setExpandedTrait(expandedTrait === trait.id ? null : trait.id)}
                    style={{
                      padding: '12px 16px', cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 14, color: '#c9a84c' }}>
                      {trait.name}
                    </span>
                    <span style={{ color: '#555', fontSize: 12 }}>
                      {expandedTrait === trait.id ? '▲' : '▼'}
                    </span>
                  </div>
                  {expandedTrait === trait.id && trait.description && (
                    <div style={{
                      padding: '0 16px 14px', fontSize: 13, color: '#888',
                      lineHeight: 1.7, whiteSpace: 'pre-wrap',
                      borderTop: '1px solid #2a2a3a', paddingTop: 12
                    }}>
                      {trait.description}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {/* Tratti di classe */}
          {classTraits.length > 0 && (
            <>
              <div style={{
                fontSize: 11, color: '#c9a84c', letterSpacing: 1,
                textTransform: 'uppercase', fontWeight: 700,
                marginTop: raceTraits.length > 0 ? 8 : 0, marginBottom: 4
              }}>
                ⚔️ Tratti di Classe — {characterClass}
              </div>
              {classTraits.map(trait => (
                <div
                  key={trait.id}
                  style={{
                    background: '#16161f', border: '1px solid #2a2a3a',
                    borderRadius: 10, overflow: 'hidden'
                  }}
                >
                  <div
                    onClick={() => setExpandedTrait(expandedTrait === trait.id ? null : trait.id)}
                    style={{
                      padding: '12px 16px', cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 14, color: '#e8e0d0' }}>
                        {trait.name}
                      </span>
                      {trait.level_required && (
                        <span style={{
                          marginLeft: 8, fontSize: 10, padding: '1px 6px', borderRadius: 4,
                          background: '#c9a84c22', color: '#c9a84c', border: '1px solid #c9a84c44'
                        }}>
                          Liv. {trait.level_required}
                        </span>
                      )}
                    </div>
                    <span style={{ color: '#555', fontSize: 12 }}>
                      {expandedTrait === trait.id ? '▲' : '▼'}
                    </span>
                  </div>
                  {expandedTrait === trait.id && trait.description && (
                    <div style={{
                      padding: '12px 16px 14px', fontSize: 13, color: '#888',
                      lineHeight: 1.7, whiteSpace: 'pre-wrap',
                      borderTop: '1px solid #2a2a3a'
                    }}>
                      {trait.description}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Tab Talenti */}
      {section === 'talents' && (
        <div>
          <button
            onClick={() => setShowTalentForm(true)}
            style={{
              width: '100%', padding: '12px 0', marginBottom: 16,
              background: 'linear-gradient(135deg, #c9a84c, #a07830)',
              color: '#0f0f13', border: 'none', borderRadius: 8,
              fontWeight: 700, fontSize: 14
            }}
          >
            {UI_ICONS.add} Nuovo Talento
          </button>

          {showTalentForm && (
            <div style={{
              background: '#16161f', border: '1px solid #2a2a3a',
              borderRadius: 12, padding: 16, marginBottom: 16
            }}>
              <h4 style={{ color: '#c9a84c', margin: '0 0 12px' }}>
                {UI_ICONS.spells} Nuovo Talento
              </h4>
              <input
                placeholder="Nome talento *"
                value={talentName}
                onChange={e => setTalentName(e.target.value)}
                style={{ width: '100%', marginBottom: 8 }}
                autoFocus
              />
              <textarea
                placeholder="Descrizione del talento..."
                value={talentDesc}
                onChange={e => setTalentDesc(e.target.value)}
                rows={4}
                style={{ width: '100%', resize: 'vertical', marginBottom: 12 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleAddTalent} disabled={saving} style={{
                  flex: 1, padding: '8px 0',
                  background: 'linear-gradient(135deg, #c9a84c, #a07830)',
                  color: '#0f0f13', border: 'none', borderRadius: 8, fontWeight: 700
                }}>
                  {saving ? '...' : 'Salva'}
                </button>
                <button
                  onClick={() => { setShowTalentForm(false); setTalentName(''); setTalentDesc('') }}
                  style={{
                    padding: '8px 16px', background: 'none',
                    border: '1px solid #2a2a3a', color: '#888', borderRadius: 8
                  }}
                >Annulla</button>
              </div>
            </div>
          )}

          {talents.length === 0 && !showTalentForm && (
            <div style={{ textAlign: 'center', color: '#444', padding: 40 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>{UI_ICONS.spells}</div>
              <p>Nessun talento ancora.</p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {talents.map(talent => (
              <div key={talent.id} style={{
                background: '#16161f', border: '1px solid #2a2a3a',
                borderRadius: 10, padding: '12px 16px'
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'flex-start', marginBottom: talent.description ? 6 : 0
                }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: '#e8e0d0' }}>
                    {talent.name}
                  </span>
                  <button
                    onClick={() => handleDeleteTalent(talent.id)}
                    style={{
                      background: 'none', border: 'none',
                      color: '#3a3a4a', fontSize: 18, cursor: 'pointer', flexShrink: 0
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#e05555')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#3a3a4a')}
                  >{UI_ICONS.close}</button>
                </div>
                {talent.description && (
                  <div style={{
                    fontSize: 13, color: '#888',
                    lineHeight: 1.7, whiteSpace: 'pre-wrap'
                  }}>
                    {talent.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}