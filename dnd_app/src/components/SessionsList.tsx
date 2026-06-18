import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useDialog } from './Dialog'

interface Session {
  id: string
  title: string
  date: string
  summary: string
  created_at: string
}

export default function SessionsList({
  campaignId,
  isMaster
}: {
  campaignId: string
  isMaster: boolean
}) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<Session | null>(null)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [summary, setSummary] = useState('')
  const [saving, setSaving] = useState(false)
  const { confirm, DialogComponent } = useDialog()

  async function loadSessions() {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('date', { ascending: false })
    if (data) setSessions(data)
    setLoading(false)
  }

  useEffect(() => { loadSessions() }, [campaignId])

  async function handleSave() {
    if (!title) return
    setSaving(true)
    if (editing) {
      await supabase.from('sessions').update({ title, date, summary }).eq('id', editing.id)
    } else {
      await supabase.from('sessions').insert({ campaign_id: campaignId, title, date, summary })
    }
    setShowForm(false)
    setEditing(null)
    setTitle('')
    setSummary('')
    setDate(new Date().toISOString().split('T')[0])
    loadSessions()
    setSaving(false)
  }

  function startEdit(s: Session) {
    setEditing(s)
    setTitle(s.title)
    setDate(s.date)
    setSummary(s.summary ?? '')
    setShowForm(true)
  }

  async function handleDelete(s: Session) {
    const ok = await confirm({
      title: 'Elimina Sessione',
      message: `Sei sicuro di voler eliminare "${s.title}"?`,
      confirmLabel: '🗑️ Elimina',
      cancelLabel: 'Annulla',
      danger: true
    })
    if (!ok) return
    await supabase.from('sessions').delete().eq('id', s.id)
    loadSessions()
  }

  if (loading) return <p style={{ color: '#555', textAlign: 'center', padding: 20 }}>Caricamento...</p>

  return (
    <div>
      <DialogComponent />

      {isMaster && (
        <button
          onClick={() => { setShowForm(true); setEditing(null); setTitle(''); setSummary('') }}
          style={{
            width: '100%', padding: '12px 0', marginBottom: 20,
            background: 'linear-gradient(135deg, #c9a84c, #a07830)',
            color: '#0f0f13', border: 'none', borderRadius: 8,
            fontWeight: 700, fontSize: 14
          }}
        >+ Nuova Sessione</button>
      )}

      {showForm && (
        <div style={{
          background: '#16161f', border: '1px solid #2a2a3a',
          borderRadius: 12, padding: 16, marginBottom: 16
        }}>
          <h4 style={{ color: '#c9a84c', margin: '0 0 12px' }}>
            {editing ? 'Modifica Sessione' : 'Nuova Sessione'}
          </h4>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Titolo sessione *" style={{ width: '100%', marginBottom: 8 }} autoFocus />
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ width: '100%', marginBottom: 8 }} />
          <textarea value={summary} onChange={e => setSummary(e.target.value)}
            placeholder="Riassunto della sessione..." rows={6}
            style={{ width: '100%', resize: 'vertical', marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSave} disabled={saving} style={{
              flex: 1, padding: '8px 0',
              background: 'linear-gradient(135deg, #c9a84c, #a07830)',
              color: '#0f0f13', border: 'none', borderRadius: 8, fontWeight: 700
            }}>{saving ? '...' : 'Salva'}</button>
            <button onClick={() => { setShowForm(false); setEditing(null) }} style={{
              padding: '8px 16px', background: 'none',
              border: '1px solid #2a2a3a', color: '#888', borderRadius: 8
            }}>Annulla</button>
          </div>
        </div>
      )}

      {sessions.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', color: '#444', padding: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
          <p>Nessuna sessione ancora.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sessions.map((s, i) => (
          <div key={s.id} style={{
            background: '#16161f', border: '1px solid #2a2a3a',
            borderRadius: 10, overflow: 'hidden'
          }}>
            <div
              onClick={() => setExpanded(expanded === s.id ? null : s.id)}
              style={{
                padding: '12px 16px', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 10, padding: '2px 6px', borderRadius: 4,
                    background: '#c9a84c22', color: '#c9a84c', border: '1px solid #c9a84c44'
                  }}>#{sessions.length - i}</span>
                  <span style={{ fontWeight: 600, color: '#e8e0d0' }}>{s.title}</span>
                </div>
                <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
                  {new Date(s.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {isMaster && (
                  <>
                    <button onClick={e => { e.stopPropagation(); startEdit(s) }}
                      style={{ background: 'none', border: 'none', color: '#555', fontSize: 14, cursor: 'pointer' }}>✏️</button>
                    <button onClick={e => { e.stopPropagation(); handleDelete(s) }}
                      style={{ background: 'none', border: 'none', color: '#555', fontSize: 16, cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#e05555')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#555')}>×</button>
                  </>
                )}
                <span style={{ color: '#555', fontSize: 12 }}>{expanded === s.id ? '▲' : '▼'}</span>
              </div>
            </div>
            {expanded === s.id && s.summary && (
              <div style={{
                padding: '12px 16px 14px', fontSize: 13, color: '#888',
                lineHeight: 1.8, borderTop: '1px solid #2a2a3a', whiteSpace: 'pre-wrap'
              }}>
                {s.summary}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}