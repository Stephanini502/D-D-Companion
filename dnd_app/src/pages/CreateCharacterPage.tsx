import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface CatalogClass {
  id: string
  name: string
  hit_die: number
}

interface CatalogRace {
  id: string
  name: string
}

export default function CreateCharacterPage({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('')
  const [selectedClass, setSelectedClass] = useState<CatalogClass | null>(null)
  const [selectedRace, setSelectedRace] = useState<CatalogRace | null>(null)
  const [classes, setClasses] = useState<CatalogClass[]>([])
  const [races, setRaces] = useState<CatalogRace[]>([])
  const [level, setLevel] = useState(1)
  const [hpMax, setHpMax] = useState(10)
  const [stats, setStats] = useState({
    FOR: 10, DES: 10, COS: 10, INT: 10, SAG: 10, CAR: 10
  })
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadCatalog() {
      const [{ data: classData }, { data: raceData }] = await Promise.all([
        supabase.from('catalog_classes').select('id, name, hit_die').order('name'),
        supabase.from('catalog_races').select('id, name').order('name')
      ])
      if (classData) setClasses(classData)
      if (raceData) setRaces(raceData)
      setLoadingData(false)
    }
    loadCatalog()
  }, [])

  useEffect(() => {
    if (selectedClass) {
      const conMod = Math.floor((stats.COS - 10) / 2)
      const hp = selectedClass.hit_die + (conMod * level) + (Math.floor(selectedClass.hit_die / 2) + 1) * (level - 1)
      setHpMax(Math.max(1, hp))
    }
  }, [selectedClass, level, stats.COS])

  function updateStat(key: string, value: number) {
    setStats(prev => ({ ...prev, [key]: Math.min(20, Math.max(1, value)) }))
  }

  async function handleCreate() {
    if (!name || !selectedClass || !selectedRace) {
      setError('Compila tutti i campi obbligatori')
      return
    }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('characters').insert({
      user_id: user?.id,
      name,
      race: selectedRace.name,
      character_class: selectedClass.name,
      level,
      hp_current: hpMax,
      hp_max: hpMax,
      stats
    })
    if (error) setError(error.message)
    else onCreated()
    setLoading(false)
  }

  if (loadingData) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: '#555'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚔️</div>
        <p>Caricamento catalogo...</p>
      </div>
    </div>
  )

  const labelStyle = {
    display: 'block' as const,
    fontSize: 11, color: '#888',
    letterSpacing: 1, textTransform: 'uppercase' as const,
    marginBottom: 6, fontWeight: 600
  }

  const sectionStyle = {
    background: '#16161f',
    border: '1px solid #2a2a3a',
    borderRadius: 12, padding: 16, marginBottom: 16
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 24px', borderBottom: '1px solid #2a2a3a', marginBottom: 24
      }}>
        <button
          onClick={() => onCreated()}
          style={{
            background: 'none', border: '1px solid #2a2a3a',
            color: '#888', borderRadius: 8, padding: '6px 12px', fontSize: 13
          }}
        >
          ← Annulla
        </button>
        <h2 style={{ color: '#c9a84c', fontSize: 18, margin: 0 }}>
          ⚔️ Nuovo Personaggio
        </h2>
        <div style={{ width: 80 }} />
      </div>

      <div style={{ padding: '0 24px 40px' }}>

        {/* Nome */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Nome *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nome del personaggio"
            style={{ width: '100%' }}
          />
        </div>

        {/* Razza e Classe */}
        <div style={sectionStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Razza *</label>
              <select
                value={selectedRace?.id ?? ''}
                onChange={e => setSelectedRace(races.find(r => r.id === e.target.value) ?? null)}
                style={{ width: '100%' }}
              >
                <option value=''>Scegli...</option>
                {races.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Classe *</label>
              <select
                value={selectedClass?.id ?? ''}
                onChange={e => setSelectedClass(classes.find(c => c.id === e.target.value) ?? null)}
                style={{ width: '100%' }}
              >
                <option value=''>Scegli...</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          {selectedClass && (
            <p style={{ fontSize: 12, color: '#555', marginTop: 8 }}>
              Dado vita: d{selectedClass.hit_die}
            </p>
          )}
        </div>

        {/* Livello e PF */}
        <div style={sectionStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Livello</label>
              <input
                type="number"
                value={level}
                min={1}
                max={20}
                onChange={e => setLevel(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={labelStyle}>
                PF Massimi
                {selectedClass && (
                  <span style={{ color: '#555', fontWeight: 400, marginLeft: 4, textTransform: 'none' }}>
                    (auto)
                  </span>
                )}
              </label>
              <input
                type="number"
                value={hpMax}
                onChange={e => setHpMax(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* Caratteristiche */}
        <div style={sectionStyle}>
          <label style={{ ...labelStyle, marginBottom: 12 }}>Caratteristiche</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {Object.entries(stats).map(([key, val]) => (
              <div key={key} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#666', letterSpacing: 1, marginBottom: 6 }}>
                  {key}
                </div>
                <input
                  type="number"
                  value={val}
                  min={1}
                  max={20}
                  onChange={e => updateStat(key, Number(e.target.value))}
                  style={{ width: '100%', textAlign: 'center', fontSize: 18, fontWeight: 700 }}
                />
                <div style={{
                  fontSize: 12, color: '#c9a84c', fontWeight: 600, marginTop: 4
                }}>
                  {Math.floor((val - 10) / 2) >= 0 ? '+' : ''}{Math.floor((val - 10) / 2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <p style={{ color: '#e05555', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
            {error}
          </p>
        )}

        <button
          onClick={handleCreate}
          disabled={loading}
          style={{
            width: '100%', padding: '14px 0',
            background: loading ? '#3a3a4a' : 'linear-gradient(135deg, #c9a84c, #a07830)',
            color: loading ? '#888' : '#0f0f13',
            border: 'none', borderRadius: 10,
            fontWeight: 700, fontSize: 15, letterSpacing: 0.5
          }}
        >
          {loading ? 'Creazione...' : '⚔️ Crea Personaggio'}
        </button>

      </div>
    </div>
  )
}