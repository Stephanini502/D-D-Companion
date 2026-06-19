import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import CampaignPage from './CampaignPage'
import { UI_ICONS } from '../data/icons'

interface Campaign {
  id: string
  name: string
  description: string
  master_id: string
  invite_code: string
  created_at: string
}

interface Character {
  id: string
  name: string
  race: string
  character_class: string
  level: number
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Campaign | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [myCharacters, setMyCharacters] = useState<Character[]>([])

  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [username, setUsername] = useState('')
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('')
  const [error, setError] = useState('')
  const [loadingAction, setLoadingAction] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null)
    })
    loadCampaigns()
    loadMyCharacters()
  }, [])

  async function loadMyCharacters() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('characters')
      .select('id, name, race, character_class, level')
      .eq('user_id', user.id)
      .order('name')
    if (data) setMyCharacters(data)
  }

  async function loadCampaigns() {
    const { data, error } = await supabase.rpc('get_user_campaigns')
    if (error) console.error('Errore caricamento campagne:', error)
    if (data) setCampaigns(data)
    setLoading(false)
  }

  async function handleCreate() {
    if (!newName) { setError('Inserisci un nome'); return }
    setLoadingAction(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('campaigns').insert({
      name: newName, description: newDesc, master_id: user?.id
    })
    if (error) setError(error.message)
    else {
      setShowCreate(false)
      setNewName('')
      setNewDesc('')
      loadCampaigns()
    }
    setLoadingAction(false)
  }

  async function handleJoin() {
    if (!inviteCode || !username) { setError('Compila tutti i campi'); return }
    setLoadingAction(true)
    setError('')

    const { data: campaigns } = await supabase
      .rpc('get_campaign_by_invite', { code: inviteCode.toUpperCase() })
    const campaign = campaigns?.[0]
    if (!campaign) { setError('Codice invito non valido'); setLoadingAction(false); return }

    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('campaign_members').insert({
      campaign_id: campaign.id,
      user_id: user?.id,
      role: 'player',
      username,
      character_id: selectedCharacterId || null
    })

    if (error) {
      if (error.code === '23505') setError('Sei già membro di questa campagna')
      else setError(error.message)
    } else {
      setShowJoin(false)
      setInviteCode('')
      setUsername('')
      setSelectedCharacterId('')
      loadCampaigns()
    }
    setLoadingAction(false)
  }

  if (selected) return (
    <CampaignPage
      campaign={selected}
      userId={userId ?? ''}
      onBack={() => { setSelected(null); loadCampaigns() }}
    />
  )

  const modalStyle = {
    position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.8)',
    zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center'
  }

  const cardStyle = {
    background: '#16161f', border: '1px solid #2a2a3a',
    borderRadius: 16, padding: 24, width: '90%', maxWidth: 400
  }

  const labelStyle = {
    display: 'block' as const, fontSize: 11, color: '#888',
    letterSpacing: 1, textTransform: 'uppercase' as const,
    marginBottom: 6, fontWeight: 600
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ color: '#c9a84c', margin: 0, fontSize: 18 }}>
            {UI_ICONS.campaign} Campagne
          </h2>
          <p style={{ color: '#555', fontSize: 12, marginTop: 2 }}>Gestisci le tue avventure</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button onClick={() => { setShowCreate(true); setError('') }} style={{
          flex: 1, padding: '12px 0',
          background: 'linear-gradient(135deg, #c9a84c, #a07830)',
          color: '#0f0f13', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14
        }}>{UI_ICONS.add} Crea Campagna</button>
        <button onClick={() => { setShowJoin(true); setError('') }} style={{
          flex: 1, padding: '12px 0',
          background: '#1e1e2a', border: '1px solid #c9a84c',
          color: '#c9a84c', borderRadius: 8, fontWeight: 700, fontSize: 14
        }}>{UI_ICONS.invite} Entra</button>
      </div>

      {loading && <p style={{ color: '#555', textAlign: 'center' }}>Caricamento...</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {campaigns.map(c => (
          <div key={c.id} onClick={() => setSelected(c)} style={{
            background: '#16161f', border: '1px solid #2a2a3a',
            borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'border-color 0.2s'
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#c9a84c')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2a3a')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#e8e0d0' }}>{c.name}</div>
                {c.description && (
                  <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>{c.description}</div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                {c.master_id === userId && (
                  <span style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 4,
                    background: '#c9a84c22', color: '#c9a84c', border: '1px solid #c9a84c44'
                  }}>{UI_ICONS.master} Master</span>
                )}
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 4,
                  background: '#2a2a3a', color: '#555', fontFamily: 'monospace', letterSpacing: 1
                }}>{c.invite_code}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!loading && campaigns.length === 0 && (
        <div style={{ textAlign: 'center', color: '#444', marginTop: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{UI_ICONS.campaign}</div>
          <p>Nessuna campagna ancora.</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Crea una campagna o entra con un codice invito!</p>
        </div>
      )}

      {/* Modal Crea */}
      {showCreate && (
        <div style={modalStyle} onClick={() => setShowCreate(false)}>
          <div style={cardStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#c9a84c', margin: '0 0 20px' }}>
              {UI_ICONS.add} Crea Campagna
            </h3>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Nome *</label>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="Nome della campagna" style={{ width: '100%' }} autoFocus />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Descrizione</label>
              <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)}
                placeholder="Breve descrizione..." rows={3}
                style={{ width: '100%', resize: 'vertical' }} />
            </div>
            {error && <p style={{ color: '#e05555', fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleCreate} disabled={loadingAction} style={{
                flex: 1, padding: '10px 0',
                background: 'linear-gradient(135deg, #c9a84c, #a07830)',
                color: '#0f0f13', border: 'none', borderRadius: 8, fontWeight: 700
              }}>{loadingAction ? '...' : 'Crea'}</button>
              <button onClick={() => setShowCreate(false)} style={{
                padding: '10px 16px', background: 'none',
                border: '1px solid #2a2a3a', color: '#888', borderRadius: 8
              }}>Annulla</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Entra */}
      {showJoin && (
        <div style={modalStyle} onClick={() => setShowJoin(false)}>
          <div style={cardStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#c9a84c', margin: '0 0 20px' }}>
              {UI_ICONS.invite} Entra in Campagna
            </h3>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Codice Invito *</label>
              <input value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Es. AB12CD"
                style={{ width: '100%', fontFamily: 'monospace', letterSpacing: 2 }}
                autoFocus maxLength={6} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Il tuo nome *</label>
              <input value={username} onChange={e => setUsername(e.target.value)}
                placeholder="Come vuoi essere chiamato?" style={{ width: '100%' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Il tuo personaggio</label>
              {myCharacters.length === 0 ? (
                <p style={{ color: '#555', fontSize: 12, margin: 0 }}>
                  Nessun personaggio disponibile — creane uno prima!
                </p>
              ) : (
                <select
                  value={selectedCharacterId}
                  onChange={e => setSelectedCharacterId(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value=''>Scegli un personaggio...</option>
                  {myCharacters.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.race} {c.character_class} Liv.{c.level}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {error && <p style={{ color: '#e05555', fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleJoin} disabled={loadingAction} style={{
                flex: 1, padding: '10px 0',
                background: 'linear-gradient(135deg, #c9a84c, #a07830)',
                color: '#0f0f13', border: 'none', borderRadius: 8, fontWeight: 700
              }}>{loadingAction ? '...' : 'Entra'}</button>
              <button onClick={() => setShowJoin(false)} style={{
                padding: '10px 16px', background: 'none',
                border: '1px solid #2a2a3a', color: '#888', borderRadius: 8
              }}>Annulla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}