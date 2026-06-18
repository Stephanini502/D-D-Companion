import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useDialog } from './Dialog'

interface Note {
  id: string
  title: string
  content: string
  author_id: string
  updated_at: string
}

export default function CampaignNotes({
  campaignId,
  userId,
  isMaster
}: {
  campaignId: string
  userId: string
  isMaster: boolean
}) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Note | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const { confirm, DialogComponent } = useDialog()

  async function loadNotes() {
    const { data } = await supabase
      .from('campaign_notes')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('updated_at', { ascending: false })
    if (data) setNotes(data)
    setLoading(false)
  }

  useEffect(() => { loadNotes() }, [campaignId])

  async function handleSave() {
    if (!title) return
    setSaving(true)
    if (editing) {
      await supabase.from('campaign_notes')
        .update({ title, content, updated_at: new Date().toISOString() })
        .eq('id', editing.id)
    } else {
      await supabase.from('campaign_notes').insert({
        campaign_id: campaignId, author_id: userId, title, content
      })
    }
    setShowForm(false)
    setEditing(null)
    setTitle('')
    setContent('')
    loadNotes()
    setSaving(false)
  }

  async function handleDelete(n: Note) {
    const ok = await confirm({
      title: 'Elimina Nota',
      message: `Sei sicuro di voler eliminare "${n.title}"?`,
      confirmLabel: '🗑️ Elimina',
      cancelLabel: 'Annulla',
      danger: true
    })
    if (!ok) return
    await supabase.from('campaign_notes').delete().eq('id', n.id)
    loadNotes()
  }

  function startEdit(n: Note) {
    setEditing(n)
    setTitle(n.title)
    setContent(n.content ?? '')
    setShowForm(true)
  }

  if (loading) return <p style={{ color: '#555', textAlign: 'center', padding: 20 }}>Caricamento...</p>

  return (
    <div>
      <DialogComponent />

      <button
        onClick={() => { setShowForm(true); setEditing(null); setTitle(''); setContent('') }}
        style={{
          width: '100%', padding: '12px 0', marginBottom: 20,
          background: 'linear-gradient(135deg, #c9a84c, #a07830)',
          color: '#0f0f13', border: 'none', borderRadius: 8,
          fontWeight: 700, fontSize: 14
        }}
      >+ Nuova Nota</button>

      {showForm && (
        <div style={{
          background: '#16161f', border: '1px solid #2a2a3a',
          borderRadius: 12, padding: 16, marginBottom: 16
        }}>
          <h4 style={{ color: '#c9a84c', margin: '0 0 12px' }}>
            {editing ? 'Modifica Nota' : 'Nuova Nota'}
          </h4>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Titolo *" style={{ width: '100%', marginBottom: 8 }} autoFocus />
          <textarea value={content} onChange={e => setContent(e.target.value)}
            placeholder="Contenuto della nota..." rows={8}
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

      {notes.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', color: '#444', padding: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📖</div>
          <p>Nessuna nota ancora.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {notes.map(n => (
          <div key={n.id} style={{
            background: '#16161f', border: '1px solid #2a2a3a',
            borderRadius: 10, overflow: 'hidden'
          }}>
            <div
              onClick={() => setExpanded(expanded === n.id ? null : n.id)}
              style={{
                padding: '12px 16px', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: '#e8e0d0' }}>{n.title}</div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                  Aggiornato: {new Date(n.updated_at).toLocaleDateString('it-IT')}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={e => { e.stopPropagation(); startEdit(n) }}
                  style={{ background: 'none', border: 'none', color: '#555', fontSize: 14, cursor: 'pointer' }}>✏️</button>
                {(isMaster || n.author_id === userId) && (
                  <button onClick={e => { e.stopPropagation(); handleDelete(n) }}
                    style={{ background: 'none', border: 'none', color: '#555', fontSize: 16, cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#e05555')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#555')}>×</button>
                )}
                <span style={{ color: '#555', fontSize: 12 }}>{expanded === n.id ? '▲' : '▼'}</span>
              </div>
            </div>
            {expanded === n.id && n.content && (
              <div style={{
                padding: '12px 16px 14px', fontSize: 13, color: '#888',
                lineHeight: 1.8, borderTop: '1px solid #2a2a3a', whiteSpace: 'pre-wrap'
              }}>
                {n.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}