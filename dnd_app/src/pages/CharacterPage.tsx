import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Character } from '../models/character'
import SpellsTab from '../components/SpellsTab'
import InventoryTab from '../components/InventoryTab'
import CombatTab from '../components/CombatTab'
import AbilitiesTab from '../components/AbilitiesTab'
import { useDialog } from '../components/Dialog'
import { getDarkvision, getPassivePerception, getProficiencyBonus } from '../data/raceTraits'
import { getClassIcon, UI_ICONS } from '../data/icons'

type Tab = 'stats' | 'spells' | 'inventory' | 'combat' | 'abilities'

const BUCKET = 'characters-images'

export default function CharacterPage({
  character,
  onBack
}: {
  character: Character
  onBack: () => void
}) {
  const [tab, setTab] = useState<Tab>('stats')
  const [hp, setHp] = useState(character.hp_current)
  const [deleting, setDeleting] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showFullImage, setShowFullImage] = useState(false)
  const [perceptionProficiency, setPerceptionProficiency] = useState(false)
  const { confirm, DialogComponent } = useDialog()

  useEffect(() => {
    async function loadData() {
      const { data } = await supabase
        .from('characters')
        .select('image_path, perception_proficiency')
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

  const hpPercent = Math.round((hp / character.hp_max) * 100)
  const hpColor = hpPercent > 60 ? '#4caf82' : hpPercent > 30 ? '#c9a84c' : '#e05555'
  const sagMod = Math.floor(((character.stats.SAG as number) - 10) / 2)
  const profBonus = getProficiencyBonus(character.level)
  const passivePerception = getPassivePerception(sagMod, profBonus, perceptionProficiency)
  const darkvision = getDarkvision(character.race)

  const tabs = [
    { key: 'stats', label: `📊 Stats` },
    { key: 'abilities', label: `🎯 Abilità` },
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
            <p style={{ color: '#888', fontSize: 13, margin: '4px 0 8px' }}>
              {character.race} · {character.character_class} · Livello {character.level}
            </p>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: '#888' }}>Punti Ferita</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: hpColor }}>
                  {hp} / {character.hp_max}
                </span>
              </div>
              <div style={{ height: 6, background: '#2a2a3a', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${hpPercent}%`,
                  background: hpColor, borderRadius: 3,
                  transition: 'width 0.3s, background 0.3s'
                }} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => setHp(h => Math.max(0, h - 1))}
                  style={{
                    flex: 1, padding: '6px 0',
                    background: '#1e1e2a', border: '1px solid #e05555',
                    color: '#e05555', borderRadius: 6, fontSize: 13, fontWeight: 600
                  }}
                >{UI_ICONS.damage} Danno</button>
                <button
                  onClick={() => setHp(h => Math.min(character.hp_max, h + 1))}
                  style={{
                    flex: 1, padding: '6px 0',
                    background: '#1e1e2a', border: '1px solid #4caf82',
                    color: '#4caf82', borderRadius: 6, fontSize: 13, fontWeight: 600
                  }}
                >{UI_ICONS.heal} Cura</button>
              </div>
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
              {Object.entries(character.stats).map(([key, val]) => (
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
                    <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{character.race} non ha scurovisione</div>
                  </>
                )}
              </div>
            </div>

          </div>
        )}

        {tab === 'abilities' && (
          <AbilitiesTab
            characterId={character.id}
            characterRace={character.race}
            characterClass={character.character_class}
            characterLevel={character.level}
            stats={character.stats as Record<string, number>}
          />
        )}

        {tab === 'spells' && (
          <SpellsTab
            characterId={character.id}
            characterName={character.name}
            characterClass={character.character_class}
          />
        )}

        {tab === 'inventory' && (
          <InventoryTab characterId={character.id} characterName={character.name} />
        )}

        {tab === 'combat' && (
          <CombatTab character={character} characterId={character.id} />
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
          <img src={imageUrl} alt={character.name}
            style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: 12 }}
            onClick={e => e.stopPropagation()} />
          <div style={{ position: 'absolute', bottom: 20, color: '#888', fontSize: 13 }}>
            {character.name} · {character.race} · {character.character_class}
          </div>
        </div>
      )}

    </div>
  )
}