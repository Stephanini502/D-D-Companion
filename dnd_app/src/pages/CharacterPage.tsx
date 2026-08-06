import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Character } from '../models/character'
import SpellsTab from '../components/SpellsTab'
import InventoryTab from '../components/InventoryTab'
import CombatTab from '../components/CombatTab'
import AbilitiesTab from '../components/AbilitiesTab'
import { useDialog } from '../components/Dialog'
import NumberStepper from '../components/NumberStepper'
import { getDarkvision, getPassivePerception, getProficiencyBonus } from '../data/raceTraits'
import { getClassIcon, UI_ICONS } from '../icons'

type Tab = 'stats' | 'spells' | 'inventory' | 'combat' | 'abilities'

const BUCKET = 'characters-images'

const STAT_ORDER = ['FOR', 'DES', 'COS', 'INT', 'SAG', 'CAR']
const STAT_LABELS: Record<string, string> = {
  FOR: 'Forza', DES: 'Destrezza', COS: 'Costituzione',
  INT: 'Intelligenza', SAG: 'Saggezza', CAR: 'Carisma',
}

export default function CharacterPage({
  character,
  onBack
}: {
  character: Character
  onBack: () => void
}) {
  const [tab, setTab] = useState<Tab>('stats')
  const [char, setChar] = useState<Character>(character)
  const [deleting, setDeleting] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editLevel, setEditLevel] = useState(character.level)
  const [editHpMax, setEditHpMax] = useState(character.hp_max)
  const [editStats, setEditStats] = useState<Record<string, number>>({ ...character.stats })
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showFullImage, setShowFullImage] = useState(false)
  const [perceptionProficiency, setPerceptionProficiency] = useState(false)
  const { confirm, DialogComponent } = useDialog()

  useEffect(() => {
    async function loadData() {
      const { data } = await supabase
        .from('characters')
        .select('image_path, perception_proficiency, hp_current')
        .eq('id', character.id)
        .single()
      if (data?.image_path) {
        const url = supabase.storage
          .from(BUCKET)
          .getPublicUrl(data.image_path).data.publicUrl
        setImageUrl(url + '?t=' + Date.now())
      }
      if (data?.perception_proficiency !== undefined) {
        setPerceptionProficiency(data.perception_proficiency)
      }
      if (typeof data?.hp_current === 'number') {
        setChar(c => ({ ...c, hp_current: data.hp_current }))
      }
    }
    loadData()
  }, [character.id])

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${character.id}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true })
    if (uploadError) {
      setUploadingImage(false)
      return
    }
    await supabase.from('characters').update({ image_path: path }).eq('id', character.id)
    const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
    setImageUrl(url + '?t=' + Date.now())
    setUploadingImage(false)
  }

  async function togglePerceptionProficiency() {
    const newVal = !perceptionProficiency
    setPerceptionProficiency(newVal)
    await supabase
      .from('characters')
      .update({ perception_proficiency: newVal })
      .eq('id', character.id)
  }

  function mod(val: number) {
    const m = Math.floor((val - 10) / 2)
    return (m >= 0 ? '+' : '') + m
  }

  function openEdit() {
    setEditLevel(char.level)
    setEditHpMax(char.hp_max)
    setEditStats({ ...char.stats })
    setShowEdit(true)
  }

  async function saveEdit() {
    setSavingEdit(true)
    const newStats = { ...char.stats, ...editStats }
    const newHpCurrent = Math.min(char.hp_current, editHpMax)
    const { error } = await supabase
      .from('characters')
      .update({
        level: editLevel,
        hp_max: editHpMax,
        hp_current: newHpCurrent,
        stats: newStats,
      })
      .eq('id', char.id)
    setSavingEdit(false)
    if (error) return
    setChar({ ...char, level: editLevel, hp_max: editHpMax, hp_current: newHpCurrent, stats: newStats as Character['stats'] })
    setShowEdit(false)
  }

  async function handleDelete() {
    const ok = await confirm({
      title: 'Elimina Personaggio',
      message: `Sei sicuro di voler eliminare ${character.name}? Questa azione è irreversibile.`,
      confirmLabel: `${UI_ICONS.delete} Elimina`,
      cancelLabel: 'Annulla',
      danger: true
    })
    if (!ok) return
    setDeleting(true)
    await supabase.from('spells').delete().eq('character_id', character.id)
    await supabase.from('inventory_items').delete().eq('character_id', character.id)
    await supabase.from('characters').delete().eq('id', character.id)
    onBack()
  }

  const sagMod = Math.floor(((char.stats.SAG as number) - 10) / 2)
  const profBonus = getProficiencyBonus(char.level)
  const passivePerception = getPassivePerception(sagMod, profBonus, perceptionProficiency)
  const darkvision = getDarkvision(char.race)

  const tabs = [
    { key: 'stats', label: `${UI_ICONS.stats} Stats` },
    { key: 'abilities', label: `${UI_ICONS.skills} Abilità` },
    { key: 'spells', label: `${UI_ICONS.spells} Magie` },
    { key: 'inventory', label: `${UI_ICONS.inventory} Zaino` },
    { key: 'combat', label: `${UI_ICONS.combat} Lotta` },
  ] as { key: Tab, label: string }[]

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh' }}>
      <DialogComponent />

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 24px', borderBottom: '1px solid #2a2a3a'
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: '1px solid #2a2a3a',
          color: '#888', borderRadius: 8, padding: '6px 12px', fontSize: 13
        }}>{UI_ICONS.back} Indietro</button>
        <button onClick={handleDelete} disabled={deleting} style={{
          background: 'none', border: '1px solid #e05555',
          color: '#e05555', borderRadius: 8, padding: '6px 12px', fontSize: 13
        }}>
          {deleting ? 'Eliminazione...' : `${UI_ICONS.delete} Elimina`}
        </button>
      </div>

      <div style={{ padding: '24px 24px 0' }}>

        {/* Info personaggio */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'flex-start' }}>
          <div style={{ flexShrink: 0 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 12,
              background: '#1e1e2a', border: '2px solid #3a3a4a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden'
            }}>
              {imageUrl ? (
                <img src={imageUrl} alt={character.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 34 }}>{getClassIcon(character.character_class)}</span>
              )}
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e8e0d0', margin: 0 }}>
              {character.name}
            </h1>
            <p style={{ color: '#888', fontSize: 13, margin: '4px 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{char.race} · {char.character_class} · Livello {char.level}</span>
              <button onClick={openEdit} title="Modifica livello e caratteristiche" style={{
                background: 'none', border: '1px solid #2a2a3a', color: '#c9a84c',
                borderRadius: 6, padding: '2px 8px', fontSize: 11, cursor: 'pointer'
              }}>{UI_ICONS.edit} Modifica</button>
            </p>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#16161f', border: '1px solid #2a2a3a',
              borderRadius: 8, padding: '6px 12px'
            }}>
              <span style={{ fontSize: 11, color: '#888' }}>{UI_ICONS.hp} PF Massimi</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#e05555' }}>{char.hp_max}</span>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', borderBottom: '1px solid #2a2a3a',
          marginBottom: 20, overflowX: 'auto'
        }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flexShrink: 0, padding: '10px 10px',
              background: 'none', border: 'none',
              borderBottom: tab === t.key ? '2px solid #c9a84c' : '2px solid transparent',
              color: tab === t.key ? '#c9a84c' : '#555',
              fontWeight: tab === t.key ? 700 : 400,
              cursor: 'pointer', fontSize: 11, transition: 'color 0.2s'
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenuto tab */}
      <div style={{ padding: '0 24px 24px' }}>

        {tab === 'stats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Immagine grande */}
            <div style={{ position: 'relative' }}>
              <div
                onClick={() => imageUrl && setShowFullImage(true)}
                style={{
                  width: '100%', height: 260, borderRadius: 16,
                  background: '#1e1e2a', border: '2px solid #2a2a3a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', cursor: imageUrl ? 'zoom-in' : 'default'
                }}
              >
                {imageUrl ? (
                  <img src={imageUrl} alt={character.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={() => setImageUrl(null)} />
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 72 }}>{getClassIcon(character.character_class)}</div>
                    <div style={{ fontSize: 12, color: '#444', marginTop: 8 }}>Nessuna immagine</div>
                  </div>
                )}
              </div>
              <label style={{
                position: 'absolute', bottom: 10, right: 10,
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 12, color: '#e8e0d0', cursor: 'pointer',
                padding: '6px 12px', background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)', border: '1px solid #3a3a4a', borderRadius: 8
              }}>
                {uploadingImage ? `${UI_ICONS.loading} Caricamento...` : `${UI_ICONS.photo} Cambia foto`}
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
              </label>
            </div>

            {/* Statistiche 3x2 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {Object.entries(char.stats).map(([key, val]) => (
                <div key={key} style={{
                  background: '#16161f', border: '1px solid #2a2a3a',
                  borderRadius: 10, padding: '10px 8px', textAlign: 'center'
                }}>
                  <div style={{ fontSize: 10, color: '#666', letterSpacing: 1, textTransform: 'uppercase' }}>{key}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#e8e0d0', lineHeight: 1.2, marginTop: 4 }}>{val as number}</div>
                  <div style={{ fontSize: 12, color: '#c9a84c', fontWeight: 600, marginTop: 2 }}>{mod(val as number)}</div>
                </div>
              ))}
            </div>

            {/* Percezione passiva */}
            <div style={{
              background: '#16161f', border: '1px solid #2a2a3a',
              borderRadius: 10, padding: '12px 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: 10, color: '#666', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
                  {UI_ICONS.perception} Percezione Passiva
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#c9a84c' }}>
                  {passivePerception}
                </div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                  10 {sagMod >= 0 ? '+' : ''}{sagMod} SAG
                  {perceptionProficiency ? ` + ${profBonus} comp.` : ''}
                </div>
              </div>
              <div onClick={togglePerceptionProficiency} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, color: perceptionProficiency ? '#c9a84c' : '#555' }}>
                  Competenza
                </span>
                <div style={{
                  width: 44, height: 24, borderRadius: 12,
                  background: perceptionProficiency ? '#c9a84c' : '#2a2a3a',
                  border: `1px solid ${perceptionProficiency ? '#c9a84c' : '#3a3a4a'}`,
                  position: 'relative', transition: 'background 0.2s'
                }}>
                  <div style={{
                    position: 'absolute', top: 3,
                    left: perceptionProficiency ? 22 : 3,
                    width: 16, height: 16, borderRadius: '50%',
                    background: perceptionProficiency ? '#0f0f13' : '#555',
                    transition: 'left 0.2s'
                  }} />
                </div>
              </div>
            </div>

            {/* Scurovisione */}
            <div style={{
              background: '#16161f', border: '1px solid #2a2a3a',
              borderRadius: 10, padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 14
            }}>
              <div style={{ fontSize: 32 }}>{UI_ICONS.darkvision}</div>
              <div>
                <div style={{ fontSize: 10, color: '#666', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
                  Scurovisione
                </div>
                {darkvision > 0 ? (
                  <>
                    <div style={{ fontSize: 28, fontWeight: 700, color: darkvision === 36 ? '#7c4daa' : '#c9a84c' }}>
                      {darkvision} m
                    </div>
                    <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                      {darkvision === 36 ? 'Scurovisione superiore' : 'Scurovisione standard'}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#3a3a4a' }}>Nessuna</div>
                    <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{char.race} non ha scurovisione</div>
                  </>
                )}
              </div>
            </div>

          </div>
        )}

        {tab === 'abilities' && (
          <AbilitiesTab
            characterId={char.id}
            characterRace={char.race}
            characterClass={char.character_class}
            characterLevel={char.level}
            stats={char.stats as Record<string, number>}
          />
        )}

        {tab === 'spells' && (
          <SpellsTab
            characterId={char.id}
            characterName={char.name}
            characterClass={char.character_class}
          />
        )}

        {tab === 'inventory' && (
          <InventoryTab characterId={char.id} characterName={char.name} />
        )}

        {tab === 'combat' && (
          <CombatTab character={char} characterId={char.id} />
        )}

      </div>

      {/* Fullscreen immagine */}
      {showFullImage && imageUrl && (
        <div onClick={() => setShowFullImage(false)} style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.95)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'zoom-out'
        }}>
          <button onClick={() => setShowFullImage(false)} style={{
            position: 'absolute', top: 20, right: 20,
            background: 'rgba(255,255,255,0.1)', border: 'none',
            color: '#fff', fontSize: 24, width: 40, height: 40,
            borderRadius: '50%', cursor: 'pointer'
          }}>{UI_ICONS.close}</button>
          <img src={imageUrl} alt={char.name}
            style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: 12 }}
            onClick={e => e.stopPropagation()} />
          <div style={{ position: 'absolute', bottom: 20, color: '#888', fontSize: 13 }}>
            {char.name} · {char.race} · {char.character_class}
          </div>
        </div>
      )}

      {/* Modal modifica livello / stats / PF max */}
      {showEdit && (
        <div onClick={() => !savingEdit && setShowEdit(false)} style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#16161f', border: '1px solid #2a2a3a', borderRadius: 16,
            padding: 16, width: '100%', maxWidth: 400
          }}>
            <div style={{ fontWeight: 700, color: '#e8e0d0', fontSize: 15, marginBottom: 12 }}>
              {UI_ICONS.edit} Modifica Personaggio
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 3 }}>Livello</label>
                <NumberStepper value={editLevel} min={1} max={20} height={38} maxWidth={150} ariaLabel="Livello" onChange={setEditLevel} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 3 }}>PF Massimi</label>
                <NumberStepper value={editHpMax} min={1} max={999} height={38} maxWidth={150} ariaLabel="PF massimi" onChange={setEditHpMax} />
              </div>
            </div>

            <div style={{ fontSize: 11, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
              Caratteristiche
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, rowGap: 6, marginBottom: 14 }}>
              {STAT_ORDER.map(key => (
                <div key={key} style={{ textAlign: 'center' }}>
                  <label title={STAT_LABELS[key]} style={{ fontSize: 10, color: '#666', letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>{key}</label>
                  <NumberStepper value={editStats[key] ?? 10} min={1} max={30} height={38} maxWidth={118} ariaLabel={STAT_LABELS[key]}
                    onChange={n => setEditStats(s => ({ ...s, [key]: n }))} />
                  <div style={{ fontSize: 11, color: '#c9a84c', fontWeight: 600, marginTop: 1 }}>
                    {mod(editStats[key] ?? 10)}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveEdit} disabled={savingEdit} style={{
                flex: 1, padding: '9px 0',
                background: 'linear-gradient(135deg, #c9a84c, #a07830)',
                border: 'none', color: '#0f0f13', borderRadius: 8, fontWeight: 700,
                cursor: savingEdit ? 'default' : 'pointer'
              }}>{savingEdit ? 'Salvataggio...' : `${UI_ICONS.save} Salva`}</button>
              <button onClick={() => setShowEdit(false)} disabled={savingEdit} style={{
                padding: '9px 16px', background: 'none',
                border: '1px solid #2a2a3a', color: '#888', borderRadius: 8, cursor: 'pointer'
              }}>Annulla</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}