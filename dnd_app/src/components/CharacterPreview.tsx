import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const BUCKET = 'characters-images'

const classIcons: Record<string, string> = {
  Barbarian: '🪓', Bard: '🎵', Cleric: '✝️', Druid: '🌿',
  Fighter: '⚔️', Monk: '👊', Paladin: '🛡️', Ranger: '🏹',
  Rogue: '🗡️', Sorcerer: '✨', Warlock: '👁️', Wizard: '📚'
}

interface Character {
  id: string
  name: string
  race: string
  character_class: string
  level: number
  hp_current: number
  hp_max: number
  stats: Record<string, number>
  image_path?: string
}

export default function CharacterPreview({
  characterId,
  onClose
}: {
  characterId: string
  onClose: () => void
}) {
  const [character, setCharacter] = useState<Character | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFullImage, setShowFullImage] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .single()
      if (data) {
        setCharacter(data)
        if (data.image_path) {
          const url = supabase.storage
            .from(BUCKET)
            .getPublicUrl(data.image_path).data.publicUrl
          setImageUrl(url + '?t=' + Date.now())
        }
      }
      setLoading(false)
    }
    load()
  }, [characterId])

  function mod(val: number) {
    const m = Math.floor((val - 10) / 2)
    return (m >= 0 ? '+' : '') + m
  }

  if (loading) return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.9)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <p style={{ color: '#c9a84c' }}>Caricamento...</p>
    </div>
  )

  if (!character) return null

  const hpPercent = Math.round((character.hp_current / character.hp_max) * 100)
  const hpColor = hpPercent > 60 ? '#4caf82' : hpPercent > 30 ? '#c9a84c' : '#e05555'

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.9)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: '#16161f', borderRadius: '20px 20px 0 0',
            width: '100%', maxWidth: 480,
            maxHeight: '90vh', overflowY: 'auto',
            border: '1px solid #2a2a3a', borderBottom: 'none'
          }}
        >
          {/* Handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: '#3a3a4a' }} />
          </div>

          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 20px 0'
          }}>
            <h2 style={{ color: '#c9a84c', margin: 0, fontSize: 18 }}>
              👤 Scheda Personaggio
            </h2>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', color: '#666', fontSize: 22, cursor: 'pointer'
            }}>×</button>
          </div>

          <div style={{ padding: 20 }}>

            {/* Immagine + info */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'flex-start' }}>
              <div
                onClick={() => imageUrl && setShowFullImage(true)}
                style={{
                  width: 90, height: 110, borderRadius: 12, flexShrink: 0,
                  background: '#1e1e2a', border: '2px solid #2a2a3a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', cursor: imageUrl ? 'zoom-in' : 'default'
                }}
              >
                {imageUrl ? (
                  <img src={imageUrl} alt={character.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 40 }}>{classIcons[character.character_class] ?? '🧙'}</span>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <h3 style={{ color: '#e8e0d0', margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>
                  {character.name}
                </h3>
                <p style={{ color: '#888', fontSize: 13, margin: '0 0 12px' }}>
                  {character.race} · {character.character_class} · Livello {character.level}
                </p>

                {/* Barra PF */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: '#888' }}>Punti Ferita</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: hpColor }}>
                      {character.hp_current} / {character.hp_max}
                    </span>
                  </div>
                  <div style={{ height: 6, background: '#2a2a3a', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${hpPercent}%`,
                      background: hpColor, borderRadius: 3
                    }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Statistiche */}
            <div style={{
              fontSize: 11, color: '#888', letterSpacing: 1,
              textTransform: 'uppercase', marginBottom: 10, fontWeight: 600
            }}>
              Caratteristiche
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
              {Object.entries(character.stats).map(([key, val]) => (
                <div key={key} style={{
                  background: '#1e1e2a', border: '1px solid #2a2a3a',
                  borderRadius: 10, padding: '10px 8px', textAlign: 'center'
                }}>
                  <div style={{ fontSize: 10, color: '#666', letterSpacing: 1, textTransform: 'uppercase' }}>
                    {key}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#e8e0d0', lineHeight: 1.2, marginTop: 4 }}>
                    {val}
                  </div>
                  <div style={{ fontSize: 12, color: '#c9a84c', fontWeight: 600, marginTop: 2 }}>
                    {mod(val)}
                  </div>
                </div>
              ))}
            </div>

            {/* Stats combattimento */}
            <div style={{
              fontSize: 11, color: '#888', letterSpacing: 1,
              textTransform: 'uppercase', marginBottom: 10, fontWeight: 600
            }}>
              Combattimento
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {[
                { label: 'Classe Armatura', value: 10 + Math.floor((character.stats.DES - 10) / 2), icon: '🛡️' },
                { label: 'Iniziativa', value: mod(character.stats.DES), icon: '⚡' },
                { label: 'Velocità', value: '9 m', icon: '💨' },
                { label: 'Bonus Competenza', value: '+' + (character.level < 5 ? 2 : character.level < 9 ? 3 : 4), icon: '🎯' },
              ].map(item => (
                <div key={item.label} style={{
                  background: '#1e1e2a', border: '1px solid #2a2a3a',
                  borderRadius: 10, padding: 12, textAlign: 'center'
                }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{item.icon}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#c9a84c' }}>{item.value}</div>
                  <div style={{ fontSize: 10, color: '#666', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* Fullscreen immagine */}
      {showFullImage && imageUrl && (
        <div onClick={() => setShowFullImage(false)} style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'rgba(0,0,0,0.98)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'zoom-out'
        }}>
          <img src={imageUrl} alt={character.name}
            style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: 12 }}
            onClick={e => e.stopPropagation()} />
          <button onClick={() => setShowFullImage(false)} style={{
            position: 'absolute', top: 20, right: 20,
            background: 'rgba(255,255,255,0.1)', border: 'none',
            color: '#fff', fontSize: 24, width: 40, height: 40,
            borderRadius: '50%', cursor: 'pointer'
          }}>×</button>
        </div>
      )}
    </>
  )
}