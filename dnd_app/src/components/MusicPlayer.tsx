import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { UI_ICONS } from '../data/icons'
import { useDialog } from './Dialog'
import { Track } from '../models/Track'

const AUDIO_BUCKET = 'campaign-audio'

// Categorie predefinite (colore + icona per il tema dark/oro dell'app)
const CATEGORIES: { name: string; color: string; icon: string }[] = [
  { name: 'Combattimento', color: '#e05555', icon: '⚔️' },
  { name: 'Boss', color: '#7c4daa', icon: '🐉' },
  { name: 'Taverna', color: '#c9a84c', icon: '🍺' },
  { name: 'Città', color: '#5b8dd9', icon: '🏰' },
  { name: 'Esplorazione', color: '#4caf82', icon: '🗺️' },
  { name: 'Tensione', color: '#e0894c', icon: '🕯️' },
  { name: 'Riposo', color: '#6a9a8a', icon: '🌙' },
  { name: 'Altro', color: '#888', icon: '🎵' },
]
function catMeta(name: string) {
  return CATEGORIES.find(c => c.name === name) ?? { name, color: '#888', icon: '🎵' }
}

// --- YouTube ---
function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  if (m) return m[1]
  if (/^[\w-]{11}$/.test(url.trim())) return url.trim()
  return null
}

// Caricatore singleton dell'IFrame API di YouTube
let ytApiPromise: Promise<any> | null = null
function loadYouTubeApi(): Promise<any> {
  const w = window as any
  if (w.YT?.Player) return Promise.resolve(w.YT)
  if (ytApiPromise) return ytApiPromise
  ytApiPromise = new Promise(resolve => {
    const prev = w.onYouTubeIframeAPIReady
    w.onYouTubeIframeAPIReady = () => { prev?.(); resolve(w.YT) }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.body.appendChild(tag)
  })
  return ytApiPromise
}

function fmtTime(s: number) {
  if (!isFinite(s) || s < 0) s = 0
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function MusicPlayer({ campaignId }: { campaignId: string }) {
  const { confirm, DialogComponent } = useDialog()

  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)

  // Form
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0].name)
  const [mode, setMode] = useState<'youtube' | 'file'>('youtube')
  const [ytUrl, setYtUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Player
  const [current, setCurrent] = useState<Track | null>(null)
  const [queue, setQueue] = useState<Track[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [pos, setPos] = useState(0)      // secondi correnti
  const [dur, setDur] = useState(0)      // durata totale

  const ytRef = useRef<any>(null)
  const ytReady = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const pendingRef = useRef<Track | null>(null)

  useEffect(() => { loadTracks() }, [campaignId])

  // Inizializza player YouTube (nascosto/piccolo)
  useEffect(() => {
    let mounted = true
    loadYouTubeApi().then(YT => {
      if (!mounted) return
      ytRef.current = new YT.Player('yt-jukebox-player', {
        height: '100%', width: '100%',
        playerVars: { playsinline: 1, rel: 0 },
        events: {
          onReady: () => {
            ytReady.current = true
            if (pendingRef.current) {
              const id = extractYouTubeId(pendingRef.current.url)
              if (id) ytRef.current.loadVideoById(id)
              pendingRef.current = null
            }
          },
          onStateChange: (e: any) => {
            // 0 = ended, 1 = playing, 2 = paused
            if (e.data === 0) playNext()
            else if (e.data === 1) setIsPlaying(true)
            else if (e.data === 2) setIsPlaying(false)
          },
        },
      })
    })
    return () => { mounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Polling avanzamento (funziona sia per YT sia per file)
  useEffect(() => {
    const iv = setInterval(() => {
      if (current?.source_type === 'youtube' && ytRef.current?.getCurrentTime) {
        setPos(ytRef.current.getCurrentTime() || 0)
        setDur(ytRef.current.getDuration() || 0)
      } else if (current?.source_type === 'file' && audioRef.current) {
        setPos(audioRef.current.currentTime || 0)
        setDur(audioRef.current.duration || 0)
      }
    }, 500)
    return () => clearInterval(iv)
  }, [current])

  // Cambio brano corrente → pilota il motore giusto
  useEffect(() => {
    if (!current) return
    setPos(0); setDur(0)
    if (current.source_type === 'youtube') {
      audioRef.current?.pause()
      const id = extractYouTubeId(current.url)
      if (!id) return
      if (ytReady.current && ytRef.current) ytRef.current.loadVideoById(id)
      else pendingRef.current = current
    } else {
      ytRef.current?.pauseVideo?.()
      if (audioRef.current) {
        audioRef.current.src = fileUrl(current.url)
        audioRef.current.play().catch(() => {})
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])

  async function loadTracks() {
    setLoading(true)
    const { data } = await supabase
      .from('campaign_tracks')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true })
    if (data) setTracks(data)
    setLoading(false)
  }

  function fileUrl(path: string) {
    return supabase.storage.from(AUDIO_BUCKET).getPublicUrl(path).data.publicUrl
  }

  async function addTrack() {
    setFormError('')
    if (!title.trim()) { setFormError('Serve un titolo.'); return }
    setSaving(true)
    try {
      let source_type: Track['source_type']
      let url: string
      if (mode === 'youtube') {
        if (!extractYouTubeId(ytUrl)) {
          setFormError('Link YouTube non valido.'); setSaving(false); return
        }
        source_type = 'youtube'; url = ytUrl.trim()
      } else {
        if (!file) { setFormError('Seleziona un file audio.'); setSaving(false); return }
        const safe = file.name.replace(/[^\w.\-]/g, '_')
        const path = `${campaignId}/${Date.now()}_${safe}`
        const { error: upErr } = await supabase.storage
          .from(AUDIO_BUCKET).upload(path, file, { upsert: false })
        if (upErr) { setFormError('Errore upload: ' + upErr.message); setSaving(false); return }
        source_type = 'file'; url = path
      }
      const { error } = await supabase.from('campaign_tracks').insert({
        campaign_id: campaignId, title: title.trim(), category, source_type, url,
      })
      if (error) { setFormError(error.message); setSaving(false); return }
      setTitle(''); setYtUrl(''); setFile(null); setShowForm(false)
      await loadTracks()
    } finally {
      setSaving(false)
    }
  }

  async function deleteTrack(t: Track) {
    const ok = await confirm({
      title: 'Rimuovi brano',
      message: `Rimuovere "${t.title}" dalla playlist?`,
      confirmLabel: `${UI_ICONS.delete} Rimuovi`, cancelLabel: 'Annulla', danger: true,
    })
    if (!ok) return
    if (t.source_type === 'file') {
      await supabase.storage.from(AUDIO_BUCKET).remove([t.url])
    }
    await supabase.from('campaign_tracks').delete().eq('id', t.id)
    if (current?.id === t.id) stop()
    setTracks(prev => prev.filter(x => x.id !== t.id))
  }

  function playTrack(t: Track, catTracks: Track[]) {
    setQueue(catTracks)
    setCurrent(t)
    setIsPlaying(true)
  }

  function togglePlay() {
    if (!current) return
    if (current.source_type === 'youtube') {
      if (isPlaying) ytRef.current?.pauseVideo?.()
      else ytRef.current?.playVideo?.()
    } else {
      if (isPlaying) audioRef.current?.pause()
      else audioRef.current?.play().catch(() => {})
    }
  }

  function playNext() {
    if (!current || queue.length === 0) return
    const i = queue.findIndex(t => t.id === current.id)
    const next = queue[(i + 1) % queue.length]
    if (next) { setCurrent(next); setIsPlaying(true) }
  }

  function playPrev() {
    if (!current || queue.length === 0) return
    const i = queue.findIndex(t => t.id === current.id)
    const prev = queue[(i - 1 + queue.length) % queue.length]
    if (prev) { setCurrent(prev); setIsPlaying(true) }
  }

  function stop() {
    ytRef.current?.stopVideo?.()
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.removeAttribute('src') }
    setCurrent(null); setQueue([]); setIsPlaying(false); setPos(0); setDur(0)
  }

  function seek(fraction: number) {
    const target = fraction * dur
    if (current?.source_type === 'youtube') ytRef.current?.seekTo?.(target, true)
    else if (audioRef.current) audioRef.current.currentTime = target
    setPos(target)
  }

  // Raggruppa per categoria, nell'ordine di CATEGORIES poi extra
  const grouped: { name: string; items: Track[] }[] = []
  for (const c of CATEGORIES) {
    const items = tracks.filter(t => t.category === c.name)
    if (items.length) grouped.push({ name: c.name, items })
  }
  for (const t of tracks) {
    if (!CATEGORIES.some(c => c.name === t.category) && !grouped.some(g => g.name === t.category)) {
      grouped.push({ name: t.category, items: tracks.filter(x => x.category === t.category) })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: current ? 96 : 0 }}>
      <DialogComponent />

      {/* Player YouTube nascosto (montato una sola volta) */}
      <div style={{
        position: 'fixed', width: 1, height: 1, left: -9999, top: -9999,
        overflow: 'hidden', pointerEvents: 'none'
      }}>
        <div id="yt-jukebox-player" />
      </div>
      <audio ref={audioRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={playNext}
      />

      {/* Header + aggiungi */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, color: '#e8e0d0', fontSize: 16 }}>🎵 Jukebox</div>
        <button onClick={() => { setShowForm(v => !v); setFormError('') }} style={{
          background: 'linear-gradient(135deg, #c9a84c, #a07830)',
          border: 'none', color: '#0f0f13', borderRadius: 6,
          padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer'
        }}>{UI_ICONS.add} Aggiungi brano</button>
      </div>

      {/* Form aggiunta */}
      {showForm && (
        <div style={{ background: '#1e1e2a', borderRadius: 10, padding: 14 }}>
          <input placeholder="Titolo *" value={title} onChange={e => setTitle(e.target.value)}
            style={{ width: '100%', marginBottom: 10 }} autoFocus />

          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Categoria</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: '100%' }}>
                {CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Sorgente</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['youtube', 'file'] as const).map(m => (
                  <button key={m} onClick={() => { setMode(m); setFormError('') }} style={{
                    flex: 1, padding: '7px 0', fontSize: 12, borderRadius: 6, cursor: 'pointer',
                    background: mode === m ? '#c9a84c22' : '#16161f',
                    border: `1px solid ${mode === m ? '#c9a84c' : '#2a2a3a'}`,
                    color: mode === m ? '#c9a84c' : '#666', fontWeight: mode === m ? 700 : 400,
                  }}>{m === 'youtube' ? '▶ YouTube' : '📁 File'}</button>
                ))}
              </div>
            </div>
          </div>

          {mode === 'youtube' ? (
            <input placeholder="Incolla link YouTube (https://youtu.be/...)" value={ytUrl}
              onChange={e => setYtUrl(e.target.value)} style={{ width: '100%', marginBottom: 10 }} />
          ) : (
            <input type="file" accept="audio/*" onChange={e => setFile(e.target.files?.[0] ?? null)}
              style={{ width: '100%', marginBottom: 10, color: '#888', fontSize: 12 }} />
          )}

          {formError && (
            <div style={{ color: '#e05555', fontSize: 12, marginBottom: 10 }}>{formError}</div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addTrack} disabled={saving} style={{
              flex: 1, padding: '8px 0',
              background: 'linear-gradient(135deg, #c9a84c, #a07830)',
              border: 'none', color: '#0f0f13', borderRadius: 6, fontWeight: 700,
              cursor: saving ? 'default' : 'pointer'
            }}>{saving ? 'Salvataggio...' : 'Aggiungi'}</button>
            <button onClick={() => { setShowForm(false); setFormError('') }} style={{
              padding: '8px 14px', background: 'none',
              border: '1px solid #2a2a3a', color: '#888', borderRadius: 6, cursor: 'pointer'
            }}>Annulla</button>
          </div>
        </div>
      )}

      {/* Lista per categoria */}
      {loading ? (
        <p style={{ color: '#555', textAlign: 'center', padding: 20 }}>Caricamento...</p>
      ) : tracks.length === 0 ? (
        <p style={{ color: '#444', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
          Nessun brano ancora. Aggiungi la colonna sonora della tua sessione! 🎶
        </p>
      ) : (
        grouped.map(group => {
          const meta = catMeta(group.name)
          return (
            <div key={group.name} style={{ background: '#16161f', border: '1px solid #2a2a3a', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: meta.color, marginBottom: 10, letterSpacing: 0.5 }}>
                {meta.icon} {group.name} <span style={{ color: '#444', fontWeight: 400 }}>({group.items.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {group.items.map(t => {
                  const active = current?.id === t.id
                  return (
                    <div key={t.id} style={{
                      background: active ? meta.color + '18' : '#1e1e2a',
                      border: `1px solid ${active ? meta.color + '66' : 'transparent'}`,
                      borderRadius: 8, padding: '8px 10px',
                      display: 'flex', alignItems: 'center', gap: 10
                    }}>
                      <button onClick={() => (active && isPlaying) ? togglePlay() : playTrack(t, group.items)} style={{
                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                        background: active ? meta.color : '#2a2a3a', border: 'none',
                        color: active ? '#0f0f13' : '#c9a84c', cursor: 'pointer', fontSize: 12
                      }}>{active && isPlaying ? '⏸' : '▶'}</button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 600, color: active ? meta.color : '#e8e0d0',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>{t.title}</div>
                        <div style={{ fontSize: 10, color: '#555' }}>
                          {t.source_type === 'youtube' ? '▶ YouTube' : '📁 File'}
                        </div>
                      </div>
                      <button onClick={() => deleteTrack(t)} style={{
                        background: 'none', border: 'none', color: '#3a3a4a',
                        fontSize: 15, cursor: 'pointer', flexShrink: 0
                      }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#e05555')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#3a3a4a')}
                      >{UI_ICONS.close}</button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })
      )}

      {/* Player bar */}
      {current && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 150,
          background: '#16161f', borderTop: '1px solid #2a2a3a',
          padding: '10px 16px', maxWidth: 480, margin: '0 auto'
        }}>
          {/* barra avanzamento */}
          <div
            onClick={e => {
              const r = e.currentTarget.getBoundingClientRect()
              seek((e.clientX - r.left) / r.width)
            }}
            style={{ height: 5, background: '#2a2a3a', borderRadius: 3, cursor: 'pointer', marginBottom: 8 }}
          >
            <div style={{
              height: '100%', width: `${dur ? Math.min(100, (pos / dur) * 100) : 0}%`,
              background: catMeta(current.category).color, borderRadius: 3, transition: 'width 0.3s'
            }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: '#e8e0d0',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
              }}>{current.title}</div>
              <div style={{ fontSize: 10, color: '#666' }}>
                {catMeta(current.category).icon} {current.category} · {fmtTime(pos)} / {fmtTime(dur)}
              </div>
            </div>
            <button onClick={playPrev} style={ctrlBtn}>⏮</button>
            <button onClick={togglePlay} style={{ ...ctrlBtn, width: 44, height: 44, fontSize: 18, background: '#c9a84c', color: '#0f0f13', border: 'none' }}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button onClick={playNext} style={ctrlBtn}>⏭</button>
            <button onClick={stop} style={{ ...ctrlBtn, color: '#e05555', borderColor: '#e0555544' }}>✕</button>
          </div>
        </div>
      )}
    </div>
  )
}

const ctrlBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: '50%',
  background: '#1e1e2a', border: '1px solid #2a2a3a',
  color: '#c9a84c', cursor: 'pointer', fontSize: 14, flexShrink: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
