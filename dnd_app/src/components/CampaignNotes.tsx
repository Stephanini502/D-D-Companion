import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useDialog } from './Dialog'
import { UI_ICONS } from '../data/icons'

const BUCKET = 'campaign-images'

interface Note {
  id: string
  title: string
  content: string
  author_id: string
  updated_at: string
  image_paths: string[]
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
  const [uploadingImages, setUploadingImages] = useState(false)
  const [formImages, setFormImages] = useState<string[]>([])
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  function getImageUrl(path: string) {
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setUploadingImages(true)
    const uploaded: string[] = []
    for (const file of files) {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `notes/${campaignId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from(BUCKET).upload(path, file)
      if (!error) uploaded.push(path)
    }
    setFormImages(prev => [...prev, ...uploaded])
    setUploadingImages(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function removeFormImage(path: string) {
    await supabase.storage.from(BUCKET).remove([path])
    setFormImages(prev => prev.filter(p => p !== path))
  }

  async function removeNoteImage(note: Note, path: string) {
    const ok = await confirm({
      title: 'Rimuovi Immagine',
      message: 'Sei sicuro di voler rimuovere questa immagine?',
      confirmLabel: 'Rimuovi',
      cancelLabel: 'Annulla',
      danger: true
    })
    if (!ok) return
    await supabase.storage.from(BUCKET).remove([path])
    const newPaths = (note.image_paths ?? []).filter(p => p !== path)
    await supabase.from('campaign_notes').update({ image_paths: newPaths }).eq('id', note.id)
    loadNotes()
  }

  async function handleSave() {
    if (!title) return
    setSaving(true)
    if (editing) {
      const existingPaths = editing.image_paths ?? []
      await supabase.from('campaign_notes')
        .update({
          title, content,
          updated_at: new Date().toISOString(),
          image_paths: [...existingPaths, ...formImages]
        })
        .eq('id', editing.id)
    } else {
      await supabase.from('campaign_notes').insert({
        campaign_id: campaignId,
        author_id: userId,
        title, content,
        image_paths: formImages
      })
    }
    setShowForm(false)
    setEditing(null)
    setTitle('')
    setContent('')
    setFormImages([])
    loadNotes()
    setSaving(false)
  }

  async function handleDelete(n: Note) {
    const ok = await confirm({
      title: 'Elimina Nota',
      message: `Sei sicuro di voler eliminare "${n.title}"?`,
      confirmLabel: `${UI_ICONS.delete} Elimina`,
      cancelLabel: 'Annulla',
      danger: true
    })
    if (!ok) return
    if (n.image_paths?.length > 0) {
      await supabase.storage.from(BUCKET).remove(n.image_paths)
    }
    await supabase.from('campaign_notes').delete().eq('id', n.id)
    loadNotes()
  }

  function startEdit(n: Note) {
    setEditing(n)
    setTitle(n.title)
    setContent(n.content ?? '')
    setFormImages([])
    setShowForm(true)
  }

  if (loading) return <p style={{ color: '#555', textAlign: 'center', padding: 20 }}>Caricamento...</p>

  return (
    <div>
      <DialogComponent />

      <button
        onClick={() => { setShowForm(true); setEditing(null); setTitle(''); setContent(''); setFormImages([]) }}
        style={{
          width: '100%', padding: '12px 0', marginBottom: 20,
          background: 'linear-gradient(135deg, #c9a84c, #a07830)',
          color: '#0f0f13', border: 'none', borderRadius: 8,
          fontWeight: 700, fontSize: 14
        }}
      >{UI_ICONS.add} Nuova Nota</button>

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

          {/* Upload immagini */}
          <div style={{ marginBottom: 12 }}>
            <div style={{
              fontSize: 11, color: '#888', letterSpacing: 1,
              textTransform: 'uppercase', marginBottom: 8, fontWeight: 600
            }}>
              {UI_ICONS.photo} Immagini
            </div>

            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 8, padding: '20px 16px',
              borderRadius: 12, cursor: uploadingImages ? 'default' : 'pointer',
              background: '#1e1e2a',
              border: `2px dashed ${uploadingImages ? '#3a3a4a' : '#c9a84c44'}`,
              transition: 'all 0.2s',
              marginBottom: formImages.length > 0 ? 12 : 0
            }}
              onMouseEnter={e => { if (!uploadingImages) e.currentTarget.style.borderColor = '#c9a84c' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#c9a84c44' }}
            >
              <div style={{ fontSize: 28 }}>
                {uploadingImages ? UI_ICONS.loading : UI_ICONS.photo}
              </div>
              <div style={{ fontSize: 13, color: '#888', textAlign: 'center' }}>
                {uploadingImages ? 'Caricamento in corso...' : 'Tocca per aggiungere foto'}
              </div>
              {!uploadingImages && (
                <div style={{
                  fontSize: 11, color: '#555', background: '#2a2a3a',
                  borderRadius: 6, padding: '4px 10px'
                }}>
                  JPG · PNG · WEBP
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file" accept="image/*" multiple
                onChange={handleImageUpload}
                style={{ display: 'none' }}
                disabled={uploadingImages}
              />
            </label>

            {formImages.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>
                  {formImages.length} {formImages.length === 1 ? 'immagine aggiunta' : 'immagini aggiunte'}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {formImages.map(path => (
                    <div key={path} style={{ position: 'relative', width: 80, height: 80 }}>
                      <img
                        src={getImageUrl(path)}
                        style={{
                          width: 80, height: 80, objectFit: 'cover',
                          borderRadius: 10, border: '2px solid #c9a84c44', display: 'block'
                        }}
                      />
                      <button
                        onClick={() => removeFormImage(path)}
                        style={{
                          position: 'absolute', top: -8, right: -8,
                          width: 22, height: 22, borderRadius: '50%',
                          background: '#e05555', border: '2px solid #16161f',
                          color: '#fff', fontSize: 11, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700
                        }}
                      >×</button>
                    </div>
                  ))}

                  <label style={{
                    width: 80, height: 80, borderRadius: 10,
                    border: '2px dashed #2a2a3a', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: 4, background: '#1e1e2a', transition: 'border-color 0.2s'
                  }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#c9a84c'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a3a'}
                  >
                    <span style={{ fontSize: 20, color: '#444' }}>+</span>
                    <span style={{ fontSize: 9, color: '#444', letterSpacing: 0.5 }}>ALTRA</span>
                    <input type="file" accept="image/*" multiple
                      onChange={handleImageUpload} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>
            )}

            {editing && (editing.image_paths ?? []).length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{
                  fontSize: 11, color: '#555', marginBottom: 8,
                  letterSpacing: 1, textTransform: 'uppercase'
                }}>
                  Già salvate
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(editing.image_paths ?? []).map(path => (
                    <div key={path} style={{ position: 'relative', width: 80, height: 80 }}>
                      <img
                        src={getImageUrl(path)}
                        style={{
                          width: 80, height: 80, objectFit: 'cover',
                          borderRadius: 10, border: '2px solid #2a2a3a', display: 'block'
                        }}
                      />
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: 'rgba(0,0,0,0.5)', borderRadius: '0 0 8px 8px',
                        fontSize: 9, color: '#888', textAlign: 'center', padding: '2px 0'
                      }}>salvata</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSave} disabled={saving || uploadingImages} style={{
              flex: 1, padding: '8px 0',
              background: 'linear-gradient(135deg, #c9a84c, #a07830)',
              color: '#0f0f13', border: 'none', borderRadius: 8, fontWeight: 700
            }}>{saving ? '...' : 'Salva'}</button>
            <button onClick={() => { setShowForm(false); setEditing(null); setFormImages([]) }} style={{
              padding: '8px 16px', background: 'none',
              border: '1px solid #2a2a3a', color: '#888', borderRadius: 8
            }}>Annulla</button>
          </div>
        </div>
      )}

      {notes.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', color: '#444', padding: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>{UI_ICONS.notes}</div>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <span style={{ fontSize: 11, color: '#555' }}>
                    {new Date(n.updated_at).toLocaleDateString('it-IT')}
                  </span>
                  {(n.image_paths ?? []).length > 0 && (
                    <span style={{ fontSize: 11, color: '#555' }}>
                      · {UI_ICONS.photo} {n.image_paths.length}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={e => { e.stopPropagation(); startEdit(n) }}
                  style={{ background: 'none', border: 'none', color: '#555', fontSize: 14, cursor: 'pointer' }}>
                  {UI_ICONS.edit}
                </button>
                {(isMaster || n.author_id === userId) && (
                  <button onClick={e => { e.stopPropagation(); handleDelete(n) }}
                    style={{ background: 'none', border: 'none', color: '#555', fontSize: 16, cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#e05555')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#555')}>
                    {UI_ICONS.close}
                  </button>
                )}
                <span style={{ color: '#555', fontSize: 12 }}>{expanded === n.id ? '▲' : '▼'}</span>
              </div>
            </div>

            {expanded === n.id && (
              <div style={{ borderTop: '1px solid #2a2a3a' }}>
                {n.content && (
                  <div style={{
                    padding: '12px 16px', fontSize: 13, color: '#888',
                    lineHeight: 1.8, whiteSpace: 'pre-wrap'
                  }}>
                    {n.content}
                  </div>
                )}

                {(n.image_paths ?? []).length > 0 && (
                  <div style={{ padding: '0 16px 16px' }}>
                    <div style={{
                      fontSize: 11, color: '#555', marginBottom: 10,
                      letterSpacing: 1, textTransform: 'uppercase'
                    }}>
                      {UI_ICONS.photo} Immagini
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {n.image_paths.map(path => (
                        <div key={path} style={{ position: 'relative' }}>
                          <img
                            src={getImageUrl(path)}
                            onClick={() => setLightboxUrl(getImageUrl(path))}
                            style={{
                              width: 100, height: 100, objectFit: 'cover',
                              borderRadius: 10, border: '2px solid #2a2a3a',
                              cursor: 'zoom-in', display: 'block',
                              transition: 'border-color 0.2s'
                            }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = '#c9a84c')}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2a3a')}
                          />
                          {(isMaster || n.author_id === userId) && (
                            <button
                              onClick={() => removeNoteImage(n, path)}
                              style={{
                                position: 'absolute', top: -8, right: -8,
                                width: 22, height: 22, borderRadius: '50%',
                                background: '#e05555', border: '2px solid #16161f',
                                color: '#fff', fontSize: 11, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700
                              }}
                            >×</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 400,
            background: 'rgba(0,0,0,0.95)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out'
          }}
        >
          <img
            src={lightboxUrl}
            style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: 12 }}
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxUrl(null)}
            style={{
              position: 'absolute', top: 20, right: 20,
              background: 'rgba(255,255,255,0.1)', border: 'none',
              color: '#fff', fontSize: 24, width: 40, height: 40,
              borderRadius: '50%', cursor: 'pointer'
            }}
          >{UI_ICONS.close}</button>
        </div>
      )}
    </div>
  )
}