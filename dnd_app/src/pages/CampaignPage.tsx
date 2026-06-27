import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import InitiativeTracker from '../components/InitiativeTracker'
import CampaignNotes from '../components/CampaignNotes'
import SessionsList from '../components/SessionsList'
import MembersTab from '../components/MembersTab'
import { useDialog } from '../components/Dialog'
import { UI_ICONS } from '../data/icons'

interface Campaign {
  id: string
  name: string
  description: string
  master_id: string
  invite_code: string
}

type Tab = 'sessions' | 'notes' | 'initiative' | 'members' | 'dice'

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
  const isMaster = campaign.master_id === userId
  const { confirm, DialogComponent } = useDialog()

  // Nome modificabile
  const [editingName, setEditingName] = useState(false)
  const [currentName, setCurrentName] = useState(campaign.name)
  const [newName, setNewName] = useState(campaign.name)
  const [savingName, setSavingName] = useState(false)

  // Username per il dice roller
  const [username, setUsername] = useState('')

  useEffect(() => {
    async function loadUsername() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      if (isMaster) {
        setUsername('Master')
      } else {
        const { data } = await supabase
          .from('campaign_members')
          .select('username')
          .eq('campaign_id', campaign.id)
          .eq('user_id', user.id)
          .single()
        if (data) setUsername(data.username)
      }
    }
    loadUsername()
  }, [campaign.id, isMaster])

  async function handleSaveName() {
    if (!newName.trim() || newName.trim() === currentName) {
      setEditingName(false)
      setNewName(currentName)
      return
    }
    setSavingName(true)
    const { error } = await supabase
      .from('campaigns')
      .update({ name: newName.trim() })
      .eq('id', campaign.id)
    if (!error) setCurrentName(newName.trim())
    else setNewName(currentName)
    setSavingName(false)
    setEditingName(false)
  }

  async function handleLeave() {
    const ok = await confirm({
      title: 'Abbandona Campagna',
      message: 'Sei sicuro di voler abbandonare questa campagna?',
      confirmLabel: `${UI_ICONS.logout} Abbandona`,
      cancelLabel: 'Annulla',
      danger: true
    })
    if (!ok) return
    await supabase.from('campaign_members')
      .delete()
      .eq('campaign_id', campaign.id)
      .eq('user_id', userId)
    onBack()
  }

  async function handleDelete() {
    const ok = await confirm({
      title: 'Elimina Campagna',
      message: `Sei sicuro di voler eliminare "${currentName}"? Questa azione è irreversibile.`,
      confirmLabel: `${UI_ICONS.delete} Elimina`,
      cancelLabel: 'Annulla',
      danger: true
    })
    if (!ok) return
    await supabase.from('campaigns').delete().eq('id', campaign.id)
    onBack()
  }

  const tabs = [
    { key: 'sessions',    label: `${UI_ICONS.session}    Sessioni`   },
    { key: 'notes',       label: `${UI_ICONS.notes}      Appunti`    },
    { key: 'initiative',  label: `${UI_ICONS.initiative} Iniziativa` },
    { key: 'members',     label: `${UI_ICONS.group}      Gruppo`     },
    { key: 'dice',        label: `${UI_ICONS.dice}       Dadi`       },
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
        {isMaster ? (
          <button onClick={handleDelete} style={{
            background: 'none', border: '1px solid #e05555',
            color: '#e05555', borderRadius: 8, padding: '6px 12px', fontSize: 13
          }}>{UI_ICONS.delete} Elimina</button>
        ) : (
          <button onClick={handleLeave} style={{
            background: 'none', border: '1px solid #e05555',
            color: '#e05555', borderRadius: 8, padding: '6px 12px', fontSize: 13
          }}>{UI_ICONS.logout} Abbandona</button>
        )}
      </div>

      <div style={{ padding: '20px 24px 0' }}>

        {/* Info campagna */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>

            {/* Nome modificabile */}
            {editingName ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveName()
                    if (e.key === 'Escape') { setEditingName(false); setNewName(currentName) }
                  }}
                  style={{
                    fontSize: 18, fontWeight: 700, color: '#e8e0d0',
                    background: '#1e1e2a', border: '1px solid #c9a84c',
                    borderRadius: 8, padding: '4px 10px', flex: 1, minWidth: 0
                  }}
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName}
                  style={{
                    background: '#4caf8222', border: '1px solid #4caf82',
                    color: '#4caf82', borderRadius: 8, padding: '4px 10px',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0
                  }}
                >
                  {savingName ? '...' : UI_ICONS.success}
                </button>
                <button
                  onClick={() => { setEditingName(false); setNewName(currentName) }}
                  style={{
                    background: 'none', border: '1px solid #2a2a3a',
                    color: '#888', borderRadius: 8, padding: '4px 10px',
                    fontSize: 13, cursor: 'pointer', flexShrink: 0
                  }}
                >
                  {UI_ICONS.close}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e8e0d0', margin: 0 }}>
                  {currentName}
                </h1>
                {isMaster && (
                  <button
                    onClick={() => { setEditingName(true); setNewName(currentName) }}
                    style={{
                      background: 'none', border: 'none',
                      color: '#444', fontSize: 16, cursor: 'pointer',
                      padding: 4, transition: 'color 0.2s', flexShrink: 0
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#c9a84c')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#444')}
                  >
                    {UI_ICONS.edit}
                  </button>
                )}
              </div>
            )}

            {campaign.description && (
              <p style={{ color: '#666', fontSize: 13, margin: 0 }}>
                {campaign.description}
              </p>
            )}
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            {isMaster && (
              <div style={{ fontSize: 10, color: '#c9a84c', marginBottom: 2 }}>
                {UI_ICONS.master} Sei il Master
              </div>
            )}
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

        {/* Tab bar — scrollabile orizzontalmente per 5 tab */}
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
          <MembersTab
            campaignId={campaign.id}
            userId={userId}
            isMaster={isMaster}
            inviteCode={campaign.invite_code}
          />
        )}
      </div>
    </div>
  )
}