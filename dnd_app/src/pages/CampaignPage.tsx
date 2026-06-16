import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import InitiativeTracker from '../components/InitiativeTracker'
import CampaignNotes from '../components/CampaignNotes'
import SessionsList from '../components/SessionsList'

interface Campaign {
  id: string
  name: string
  description: string
  master_id: string
  invite_code: string
}

interface Member {
  id: string
  user_id: string
  role: string
  username: string
}

type Tab = 'sessions' | 'notes' | 'initiative' | 'members'

export default function CampaignPage({
  campaign,
  userId,
  onBack
}: {
  campaign: Campaign
  userId: string
  onBack: () => void
}) {
  const [tab, setTab] = useState<Tab>('sessions')
  const [members, setMembers] = useState<Member[]>([])
  const isMaster = campaign.master_id === userId

  useEffect(() => {
    loadMembers()
  }, [])

  async function loadMembers() {
    const { data } = await supabase
      .from('campaign_members')
      .select('*')
      .eq('campaign_id', campaign.id)
    if (data) setMembers(data)
  }

  async function handleLeave() {
    if (!confirm('Vuoi abbandonare questa campagna?')) return
    await supabase.from('campaign_members')
      .delete()
      .eq('campaign_id', campaign.id)
      .eq('user_id', userId)
    onBack()
  }

  async function handleDelete() {
    if (!confirm(`Eliminare la campagna "${campaign.name}"? Questa azione è irreversibile.`)) return
    await supabase.from('campaigns').delete().eq('id', campaign.id)
    onBack()
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 24px', borderBottom: '1px solid #2a2a3a'
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: '1px solid #2a2a3a',
          color: '#888', borderRadius: 8, padding: '6px 12px', fontSize: 13
        }}>← Indietro</button>
        {isMaster ? (
          <button onClick={handleDelete} style={{
            background: 'none', border: '1px solid #e05555',
            color: '#e05555', borderRadius: 8, padding: '6px 12px', fontSize: 13
          }}>🗑️ Elimina</button>
        ) : (
          <button onClick={handleLeave} style={{
            background: 'none', border: '1px solid #e05555',
            color: '#e05555', borderRadius: 8, padding: '6px 12px', fontSize: 13
          }}>🚪 Abbandona</button>
        )}
      </div>

      <div style={{ padding: '20px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e8e0d0', margin: 0 }}>
              {campaign.name}
            </h1>
            {campaign.description && (
              <p style={{ color: '#666', fontSize: 13, margin: '4px 0 0' }}>{campaign.description}</p>
            )}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
            {isMaster && <div style={{ fontSize: 10, color: '#c9a84c', marginBottom: 2 }}>👑 Sei il Master</div>}
            <div style={{
              fontSize: 13, fontFamily: 'monospace', letterSpacing: 2,
              color: '#888', background: '#1e1e2a', padding: '4px 8px',
              borderRadius: 6, border: '1px solid #2a2a3a'
            }}>
              {campaign.invite_code}
            </div>
            <div style={{ fontSize: 10, color: '#444', marginTop: 2 }}>codice invito</div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid #2a2a3a', marginBottom: 20 }}>
          {([
            { key: 'sessions', label: '📅 Sessioni' },
            { key: 'notes', label: '📖 Appunti' },
            { key: 'initiative', label: '⚡ Iniziativa' },
            { key: 'members', label: '👥 Gruppo' },
          ] as { key: Tab, label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, padding: '10px 2px',
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

      <div style={{ padding: '0 24px 24px' }}>
        {tab === 'sessions' && (
          <SessionsList campaignId={campaign.id} isMaster={isMaster} />
        )}
        {tab === 'notes' && (
          <CampaignNotes campaignId={campaign.id} userId={userId} isMaster={isMaster} />
        )}
        {tab === 'initiative' && (
          <InitiativeTracker campaignId={campaign.id} isMaster={isMaster} />
        )}
        {tab === 'members' && (
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
            {members.map(m => (
              <div key={m.id} style={{
                background: '#16161f', border: '1px solid #2a2a3a',
                borderRadius: 10, padding: '12px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#e8e0d0' }}>
                    {m.username || 'Giocatore'}
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>Giocatore</div>
                </div>
                {isMaster && (
                  <button
                    onClick={async () => {
                      if (!confirm(`Rimuovere ${m.username} dalla campagna?`)) return
                      await supabase.from('campaign_members').delete().eq('id', m.id)
                      loadMembers()
                    }}
                    style={{
                      background: 'none', border: 'none',
                      color: '#3a3a4a', fontSize: 18, cursor: 'pointer'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#e05555')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#3a3a4a')}
                  >×</button>
                )}
              </div>
            ))}

            {members.length === 0 && (
              <div style={{ textAlign: 'center', color: '#444', padding: 40 }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
                <p>Nessun giocatore ancora.</p>
                <p style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
                  Condividi il codice <strong style={{ color: '#c9a84c' }}>{campaign.invite_code}</strong>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}