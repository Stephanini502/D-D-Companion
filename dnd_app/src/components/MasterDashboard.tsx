import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { UI_ICONS, RELATIONSHIP_COLORS, QUEST_STATUS } from '../icons'
import { Member } from '../models/Member'
import { Quest } from '../models/Quest'
import { NPC } from '../models/NPC'
import { Loot } from '../models/Loot'
import { XPLog } from '../models/XPLog'

const NPC_BUCKET = 'campaign-images'

export default function MasterDashboard({
  campaignId,
}: {
  campaignId: string
}) {
  const [section, setSection] = useState<'prep' | 'session' | 'post'>('prep')

  const [members, setMembers] = useState<Member[]>([])
  const [quests, setQuests] = useState<Quest[]>([])
  const [npcs, setNpcs] = useState<NPC[]>([])
  const [loot, setLoot] = useState<Loot[]>([])
  const [xpLog, setXpLog] = useState<XPLog[]>([])
  const [loading, setLoading] = useState(true)

  // Form quest
  const [showQuestForm, setShowQuestForm] = useState(false)
  const [questTitle, setQuestTitle] = useState('')
  const [questDesc, setQuestDesc] = useState('')

  // Form NPC
  const [showNpcForm, setShowNpcForm] = useState(false)
  const [npcName, setNpcName] = useState('')
  const [npcRole, setNpcRole] = useState('')
  const [npcDesc, setNpcDesc] = useState('')
  const [npcRelationship, setNpcRelationship] = useState<'alleato' | 'neutrale' | 'nemico'>('neutrale')
  const [npcNotes, setNpcNotes] = useState('')
  const [npcImage, setNpcImage] = useState<File | null>(null)
  const [npcImagePreview, setNpcImagePreview] = useState<string | null>(null)
  const [savingNpc, setSavingNpc] = useState(false)

  // Form loot
  const [showLootForm, setShowLootForm] = useState(false)
  const [lootName, setLootName] = useState('')
  const [lootDesc, setLootDesc] = useState('')
  const [lootTarget, setLootTarget] = useState('')

  // Form XP
  const [showXpForm, setShowXpForm] = useState(false)
  const [xpAmount, setXpAmount] = useState('')
  const [xpReason, setXpReason] = useState('')

  // Expanded
  const [expandedNpc, setExpandedNpc] = useState<string | null>(null)
  const [expandedQuest, setExpandedQuest] = useState<string | null>(null)

  useEffect(() => { loadAll() }, [campaignId])

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadMembers(), loadQuests(), loadNpcs(), loadLoot(), loadXpLog()])
    setLoading(false)
  }

  async function loadMembers() {
    const { data } = await supabase.rpc('get_campaign_members', { cid: campaignId })
    if (!data) return
    const withChars = await Promise.all(data.map(async (m: any) => {
      if (!m.character_id) return { ...m, character: null }
      const { data: char } = await supabase
        .from('characters')
        .select('id, name, race, character_class, level, hp_current, hp_max')
        .eq('id', m.character_id)
        .single()
      return { ...m, character: char }
    }))
    setMembers(withChars)
  }

  async function loadQuests() {
    const { data } = await supabase.from('campaign_quests').select('*')
      .eq('campaign_id', campaignId).order('created_at', { ascending: false })
    if (data) setQuests(data)
  }

  async function loadNpcs() {
    const { data } = await supabase.from('campaign_npcs').select('*')
      .eq('campaign_id', campaignId).order('name')
    if (data) setNpcs(data)
  }

  async function loadLoot() {
    const { data } = await supabase.from('campaign_loot').select('*')
      .eq('campaign_id', campaignId).order('created_at', { ascending: false })
    if (data) setLoot(data)
  }

  async function loadXpLog() {
    const { data } = await supabase.from('campaign_xp_log').select('*')
      .eq('campaign_id', campaignId).order('created_at', { ascending: false })
    if (data) setXpLog(data)
  }

  // QUEST
  async function addQuest() {
    if (!questTitle) return
    await supabase.from('campaign_quests').insert({
      campaign_id: campaignId, title: questTitle, description: questDesc, status: 'active'
    })
    setQuestTitle(''); setQuestDesc(''); setShowQuestForm(false); loadQuests()
  }

  async function updateQuestStatus(id: string, status: Quest['status']) {
    await supabase.from('campaign_quests').update({ status }).eq('id', id)
    loadQuests()
  }

  async function deleteQuest(id: string) {
    await supabase.from('campaign_quests').delete().eq('id', id)
    loadQuests()
  }

  // NPC
  function npcImageUrl(path: string) {
    return supabase.storage.from(NPC_BUCKET).getPublicUrl(path).data.publicUrl
  }

  function resetNpcForm() {
    setNpcName(''); setNpcRole(''); setNpcDesc(''); setNpcNotes('')
    setNpcRelationship('neutrale'); setNpcImage(null); setNpcImagePreview(null)
    setShowNpcForm(false)
  }

  async function addNpc() {
    if (!npcName) return
    setSavingNpc(true)
    let image_path: string | null = null
    if (npcImage) {
      const safe = npcImage.name.replace(/[^\w.\-]/g, '_')
      const path = `npcs/${campaignId}/${Date.now()}_${safe}`
      const { error } = await supabase.storage.from(NPC_BUCKET).upload(path, npcImage, { upsert: false })
      if (!error) image_path = path
    }
    await supabase.from('campaign_npcs').insert({
      campaign_id: campaignId, name: npcName, role: npcRole,
      description: npcDesc, relationship: npcRelationship, notes: npcNotes,
      image_path,
    })
    setSavingNpc(false)
    resetNpcForm()
    loadNpcs()
  }

  async function deleteNpc(id: string) {
    const npc = npcs.find(n => n.id === id)
    if (npc?.image_path) await supabase.storage.from(NPC_BUCKET).remove([npc.image_path])
    await supabase.from('campaign_npcs').delete().eq('id', id)
    loadNpcs()
  }

  function onNpcImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setNpcImage(f)
    setNpcImagePreview(f ? URL.createObjectURL(f) : null)
  }

  // LOOT
  async function addLoot() {
    if (!lootName) return
    await supabase.from('campaign_loot').insert({
      campaign_id: campaignId, name: lootName, description: lootDesc,
      distributed: false, target_character_id: lootTarget || null
    })
    setLootName(''); setLootDesc(''); setLootTarget('')
    setShowLootForm(false); loadLoot()
  }

  async function distributeLoot(lootItem: Loot) {
    if (!lootItem.target_character_id) return
    await supabase.from('inventory_items').insert({
      character_id: lootItem.target_character_id,
      character_name: members.find(m => m.character_id === lootItem.target_character_id)?.character?.name ?? '',
      name: lootItem.name, quantity: 1, notes: lootItem.description
    })
    await supabase.from('campaign_loot').update({ distributed: true }).eq('id', lootItem.id)
    loadLoot()
  }

  async function deleteLoot(id: string) {
    await supabase.from('campaign_loot').delete().eq('id', id)
    loadLoot()
  }

  // XP
  async function addXp() {
    if (!xpAmount) return
    await supabase.from('campaign_xp_log').insert({
      campaign_id: campaignId, amount: Number(xpAmount),
      reason: xpReason, distributed: false
    })
    setXpAmount(''); setXpReason(''); setShowXpForm(false); loadXpLog()
  }

  async function distributeXp(xpItem: XPLog) {
    await supabase.from('campaign_xp_log').update({ distributed: true }).eq('id', xpItem.id)
    loadXpLog()
  }

  if (loading) return <p style={{ color: '#555', textAlign: 'center', padding: 20 }}>Caricamento...</p>

  const totalXp = xpLog.filter(x => !x.distributed).reduce((sum, x) => sum + x.amount, 0)
  const undistributedLoot = loot.filter(l => !l.distributed)
  const activeQuests = quests.filter(q => q.status === 'active')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Riepilogo rapido */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {[
          { label: 'Quest Attive', value: activeQuests.length, icon: UI_ICONS.quest, color: '#4caf82' },
          { label: 'PNG', value: npcs.length, icon: UI_ICONS.npc, color: '#5b8dd9' },
          { label: 'Loot da dare', value: undistributedLoot.length, icon: UI_ICONS.loot, color: '#c9a84c' },
          { label: 'XP da dare', value: totalXp, icon: UI_ICONS.xp, color: '#7c4daa' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: '#16161f', border: `1px solid ${stat.color}44`,
            borderRadius: 10, padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <span style={{ fontSize: 22 }}>{stat.icon}</span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5 }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Switcher Pre/Durante/Post */}
      <div style={{ display: 'flex', gap: 6 }}>
        {([
          { key: 'prep', label: `${UI_ICONS.prep} Pre-Sessione` },
          { key: 'session', label: `${UI_ICONS.during} Durante` },
          { key: 'post', label: `${UI_ICONS.post} Post-Sessione` },
        ] as const).map(s => (
          <button key={s.key} onClick={() => setSection(s.key)} style={{
            flex: 1, padding: '8px 4px', fontSize: 11,
            background: section === s.key ? '#c9a84c22' : '#1e1e2a',
            border: `1px solid ${section === s.key ? '#c9a84c' : '#2a2a3a'}`,
            color: section === s.key ? '#c9a84c' : '#555',
            borderRadius: 8, fontWeight: section === s.key ? 700 : 400,
            cursor: 'pointer'
          }}>{s.label}</button>
        ))}
      </div>

      {/* PRE-SESSIONE */}
      {section === 'prep' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Quest tracker */}
          <div style={{ background: '#16161f', border: '1px solid #2a2a3a', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 700, color: '#e8e0d0', fontSize: 14 }}>{UI_ICONS.quest} Quest</div>
              <button onClick={() => setShowQuestForm(true)} style={{
                background: 'linear-gradient(135deg, #c9a84c, #a07830)',
                border: 'none', color: '#0f0f13', borderRadius: 6,
                padding: '4px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer'
              }}>{UI_ICONS.add} Nuova</button>
            </div>

            {showQuestForm && (
              <div style={{ background: '#1e1e2a', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <input placeholder="Titolo quest *" value={questTitle}
                  onChange={e => setQuestTitle(e.target.value)}
                  style={{ width: '100%', marginBottom: 8 }} autoFocus />
                <textarea placeholder="Descrizione..." value={questDesc}
                  onChange={e => setQuestDesc(e.target.value)}
                  rows={3} style={{ width: '100%', resize: 'vertical', marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={addQuest} style={{
                    flex: 1, padding: '6px 0',
                    background: 'linear-gradient(135deg, #c9a84c, #a07830)',
                    border: 'none', color: '#0f0f13', borderRadius: 6, fontWeight: 700, cursor: 'pointer'
                  }}>Salva</button>
                  <button onClick={() => { setShowQuestForm(false); setQuestTitle(''); setQuestDesc('') }} style={{
                    padding: '6px 12px', background: 'none',
                    border: '1px solid #2a2a3a', color: '#888', borderRadius: 6, cursor: 'pointer'
                  }}>Annulla</button>
                </div>
              </div>
            )}

            {quests.length === 0 && !showQuestForm && (
              <p style={{ color: '#444', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>Nessuna quest ancora.</p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {quests.map(quest => (
                <div key={quest.id} style={{
                  background: '#1e1e2a', borderRadius: 8, overflow: 'hidden',
                  border: `1px solid ${QUEST_STATUS[quest.status].color}33`
                }}>
                  <div
                    onClick={() => setExpandedQuest(expandedQuest === quest.id ? null : quest.id)}
                    style={{ padding: '10px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#e8e0d0' }}>{quest.title}</span>
                      <span style={{
                        marginLeft: 8, fontSize: 10, padding: '1px 6px', borderRadius: 3,
                        background: QUEST_STATUS[quest.status].color + '22',
                        color: QUEST_STATUS[quest.status].color,
                        border: `1px solid ${QUEST_STATUS[quest.status].color}44`
                      }}>{QUEST_STATUS[quest.status].label}</span>
                    </div>
                    <span style={{ color: '#555', fontSize: 11 }}>{expandedQuest === quest.id ? '▲' : '▼'}</span>
                  </div>
                  {expandedQuest === quest.id && (
                    <div style={{ padding: '0 12px 12px', borderTop: '1px solid #2a2a3a' }}>
                      {quest.description && (
                        <p style={{ fontSize: 12, color: '#888', lineHeight: 1.6, marginBottom: 10, marginTop: 8, whiteSpace: 'pre-wrap' }}>
                          {quest.description}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {(['active', 'completed', 'failed'] as const).map(s => (
                          <button key={s} onClick={() => updateQuestStatus(quest.id, s)} style={{
                            fontSize: 11, padding: '3px 10px', borderRadius: 4,
                            background: quest.status === s ? QUEST_STATUS[s].color + '33' : '#2a2a3a',
                            color: quest.status === s ? QUEST_STATUS[s].color : '#555',
                            border: `1px solid ${quest.status === s ? QUEST_STATUS[s].color : '#3a3a4a'}`,
                            cursor: 'pointer'
                          }}>{QUEST_STATUS[s].label}</button>
                        ))}
                        <button onClick={() => deleteQuest(quest.id)} style={{
                          fontSize: 11, padding: '3px 10px', borderRadius: 4,
                          background: 'none', color: '#e05555',
                          border: '1px solid #e0555544', cursor: 'pointer', marginLeft: 'auto'
                        }}>{UI_ICONS.delete}</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* PNG / NPC */}
          <div style={{ background: '#16161f', border: '1px solid #2a2a3a', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 700, color: '#e8e0d0', fontSize: 14 }}>{UI_ICONS.npc} PNG Importanti</div>
              <button onClick={() => setShowNpcForm(true)} style={{
                background: 'linear-gradient(135deg, #c9a84c, #a07830)',
                border: 'none', color: '#0f0f13', borderRadius: 6,
                padding: '4px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer'
              }}>{UI_ICONS.add} Nuovo</button>
            </div>

            {showNpcForm && (
              <div style={{ background: '#1e1e2a', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <input placeholder="Nome PNG *" value={npcName}
                  onChange={e => setNpcName(e.target.value)}
                  style={{ width: '100%', marginBottom: 8 }} autoFocus />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <input placeholder="Ruolo (es. Mercante)" value={npcRole}
                    onChange={e => setNpcRole(e.target.value)} />
                  <select value={npcRelationship} onChange={e => setNpcRelationship(e.target.value as any)}>
                    <option value="alleato">Alleato</option>
                    <option value="neutrale">Neutrale</option>
                    <option value="nemico">Nemico</option>
                  </select>
                </div>
                <textarea placeholder="Descrizione..." value={npcDesc}
                  onChange={e => setNpcDesc(e.target.value)}
                  rows={2} style={{ width: '100%', resize: 'vertical', marginBottom: 8 }} />
                <textarea placeholder="Note private del master..." value={npcNotes}
                  onChange={e => setNpcNotes(e.target.value)}
                  rows={2} style={{ width: '100%', resize: 'vertical', marginBottom: 8 }} />

                {/* Immagine PNG (opzionale) */}
                <div style={{ marginBottom: 8 }}>
                  {npcImagePreview ? (
                    <div style={{ position: 'relative', width: 84, height: 84 }}>
                      <img src={npcImagePreview} alt="anteprima"
                        style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 8, border: '1px solid #3a3a4a' }} />
                      <button onClick={() => { setNpcImage(null); setNpcImagePreview(null) }} style={{
                        position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: '50%',
                        background: '#e05555', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, lineHeight: 1
                      }}>{UI_ICONS.close}</button>
                    </div>
                  ) : (
                    <label style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                      fontSize: 12, color: '#888', padding: '6px 12px',
                      background: '#16161f', border: '1px dashed #3a3a4a', borderRadius: 8
                    }}>
                      {UI_ICONS.photo} Immagine PNG (opzionale)
                      <input type="file" accept="image/*" onChange={onNpcImageChange} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={addNpc} disabled={savingNpc} style={{
                    flex: 1, padding: '6px 0',
                    background: 'linear-gradient(135deg, #c9a84c, #a07830)',
                    border: 'none', color: '#0f0f13', borderRadius: 6, fontWeight: 700,
                    cursor: savingNpc ? 'default' : 'pointer'
                  }}>{savingNpc ? 'Salvataggio...' : 'Salva'}</button>
                  <button onClick={resetNpcForm} disabled={savingNpc} style={{
                    padding: '6px 12px', background: 'none',
                    border: '1px solid #2a2a3a', color: '#888', borderRadius: 6, cursor: 'pointer'
                  }}>Annulla</button>
                </div>
              </div>
            )}

            {npcs.length === 0 && !showNpcForm && (
              <p style={{ color: '#444', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>Nessun PNG ancora.</p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {npcs.map(npc => (
                <div key={npc.id} style={{
                  background: '#1e1e2a', borderRadius: 8, overflow: 'hidden',
                  borderLeft: `3px solid ${RELATIONSHIP_COLORS[npc.relationship] ?? '#555'}`
                }}>
                  <div
                    onClick={() => setExpandedNpc(expandedNpc === npc.id ? null : npc.id)}
                    style={{ padding: '10px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      {npc.image_path && (
                        <img src={npcImageUrl(npc.image_path)} alt={npc.name}
                          style={{ width: 34, height: 34, borderRadius: 6, objectFit: 'cover', flexShrink: 0, border: '1px solid #3a3a4a' }} />
                      )}
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#e8e0d0' }}>{npc.name}</span>
                        {npc.role && <span style={{ fontSize: 11, color: '#555', marginLeft: 8 }}>{npc.role}</span>}
                        <span style={{
                          marginLeft: 8, fontSize: 10, padding: '1px 6px', borderRadius: 3,
                          background: (RELATIONSHIP_COLORS[npc.relationship] ?? '#555') + '22',
                          color: RELATIONSHIP_COLORS[npc.relationship] ?? '#555',
                        }}>{npc.relationship}</span>
                      </div>
                    </div>
                    <span style={{ color: '#555', fontSize: 11, flexShrink: 0, marginLeft: 8 }}>{expandedNpc === npc.id ? '▲' : '▼'}</span>
                  </div>
                  {expandedNpc === npc.id && (
                    <div style={{ padding: '0 12px 12px', borderTop: '1px solid #2a2a3a' }}>
                      {npc.image_path && (
                        <img src={npcImageUrl(npc.image_path)} alt={npc.name}
                          style={{ width: '100%', borderRadius: 8, marginTop: 8, border: '1px solid #2a2a3a' }} />
                      )}
                      {npc.description && (
                        <p style={{ fontSize: 12, color: '#888', marginTop: 8, marginBottom: 6, whiteSpace: 'pre-wrap' }}>
                          {npc.description}
                        </p>
                      )}
                      {npc.notes && (
                        <div style={{
                          background: '#c9a84c11', border: '1px solid #c9a84c22',
                          borderRadius: 6, padding: '6px 10px', marginBottom: 8
                        }}>
                          <div style={{ fontSize: 10, color: '#c9a84c', fontWeight: 700, marginBottom: 2 }}>NOTE PRIVATE</div>
                          <p style={{ fontSize: 12, color: '#888', margin: 0, whiteSpace: 'pre-wrap' }}>{npc.notes}</p>
                        </div>
                      )}
                      <button onClick={() => deleteNpc(npc.id)} style={{
                        fontSize: 11, padding: '3px 10px', borderRadius: 4,
                        background: 'none', color: '#e05555',
                        border: '1px solid #e0555544', cursor: 'pointer'
                      }}>{UI_ICONS.delete} Elimina</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Loot pianificato */}
          <div style={{ background: '#16161f', border: '1px solid #2a2a3a', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 700, color: '#e8e0d0', fontSize: 14 }}>{UI_ICONS.loot} Loot Pianificato</div>
              <button onClick={() => setShowLootForm(true)} style={{
                background: 'linear-gradient(135deg, #c9a84c, #a07830)',
                border: 'none', color: '#0f0f13', borderRadius: 6,
                padding: '4px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer'
              }}>{UI_ICONS.add} Aggiungi</button>
            </div>

            {showLootForm && (
              <div style={{ background: '#1e1e2a', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <input placeholder="Nome oggetto *" value={lootName}
                  onChange={e => setLootName(e.target.value)}
                  style={{ width: '100%', marginBottom: 8 }} autoFocus />
                <textarea placeholder="Descrizione..." value={lootDesc}
                  onChange={e => setLootDesc(e.target.value)}
                  rows={2} style={{ width: '100%', resize: 'vertical', marginBottom: 8 }} />
                <select value={lootTarget} onChange={e => setLootTarget(e.target.value)}
                  style={{ width: '100%', marginBottom: 8 }}>
                  <option value=''>Destinatario (opzionale)</option>
                  {members.filter(m => m.character).map(m => (
                    <option key={m.id} value={m.character_id!}>
                      {m.character?.name} ({m.username})
                    </option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={addLoot} style={{
                    flex: 1, padding: '6px 0',
                    background: 'linear-gradient(135deg, #c9a84c, #a07830)',
                    border: 'none', color: '#0f0f13', borderRadius: 6, fontWeight: 700, cursor: 'pointer'
                  }}>Salva</button>
                  <button onClick={() => setShowLootForm(false)} style={{
                    padding: '6px 12px', background: 'none',
                    border: '1px solid #2a2a3a', color: '#888', borderRadius: 6, cursor: 'pointer'
                  }}>Annulla</button>
                </div>
              </div>
            )}

            {loot.length === 0 && !showLootForm && (
              <p style={{ color: '#444', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>Nessun loot pianificato.</p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {loot.map(item => (
                <div key={item.id} style={{
                  background: '#1e1e2a', borderRadius: 8, padding: '10px 12px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  opacity: item.distributed ? 0.5 : 1
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e8e0d0' }}>
                      {item.name}
                      {item.distributed && (
                        <span style={{ marginLeft: 8, fontSize: 10, color: '#4caf82' }}>{UI_ICONS.check} Distribuito</span>
                      )}
                    </div>
                    {item.description && (
                      <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{item.description}</div>
                    )}
                    {item.target_character_id && (
                      <div style={{ fontSize: 11, color: '#c9a84c', marginTop: 2 }}>
                        → {members.find(m => m.character_id === item.target_character_id)?.character?.name}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {!item.distributed && item.target_character_id && (
                      <button onClick={() => distributeLoot(item)} style={{
                        fontSize: 11, padding: '4px 10px', borderRadius: 4,
                        background: '#4caf8222', color: '#4caf82',
                        border: '1px solid #4caf8244', cursor: 'pointer', fontWeight: 600
                      }}>Dai</button>
                    )}
                    <button onClick={() => deleteLoot(item.id)} style={{
                      background: 'none', border: 'none', color: '#3a3a4a',
                      fontSize: 16, cursor: 'pointer'
                    }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#e05555')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#3a3a4a')}
                    >{UI_ICONS.close}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DURANTE LA SESSIONE */}
      {section === 'session' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Stato gruppo */}
          <div style={{ background: '#16161f', border: '1px solid #2a2a3a', borderRadius: 12, padding: 16 }}>
            <div style={{ fontWeight: 700, color: '#e8e0d0', fontSize: 14, marginBottom: 12 }}>
              {UI_ICONS.group} Stato del Gruppo
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {members.map(m => {
                const char = m.character
                return (
                  <div key={m.id} style={{ background: '#1e1e2a', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#e8e0d0' }}>
                          {char ? char.name : m.username}
                        </span>
                        {char && (
                          <span style={{ fontSize: 11, color: '#555', marginLeft: 8 }}>
                            {char.race} {char.character_class} Liv.{char.level}
                          </span>
                        )}
                      </div>
                      {char && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#e05555' }}>
                          {UI_ICONS.hp} PF Massimi {char.hp_max}
                        </span>
                      )}
                    </div>
                    {!char && (
                      <div style={{ fontSize: 11, color: '#444' }}>Nessun personaggio collegato</div>
                    )}
                  </div>
                )
              })}
              {members.length === 0 && (
                <p style={{ color: '#444', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>Nessun giocatore nella campagna.</p>
              )}
            </div>
          </div>

          {/* Quest attive */}
          <div style={{ background: '#16161f', border: '1px solid #2a2a3a', borderRadius: 12, padding: 16 }}>
            <div style={{ fontWeight: 700, color: '#e8e0d0', fontSize: 14, marginBottom: 12 }}>
              {UI_ICONS.quest} Quest Attive
            </div>
            {activeQuests.length === 0 && (
              <p style={{ color: '#444', fontSize: 13, textAlign: 'center' }}>Nessuna quest attiva.</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeQuests.map(quest => (
                <div key={quest.id} style={{
                  background: '#1e1e2a', borderRadius: 8, padding: '10px 12px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: 13, color: '#e8e0d0', fontWeight: 500 }}>{quest.title}</span>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => updateQuestStatus(quest.id, 'completed')} style={{
                      fontSize: 11, padding: '3px 8px', borderRadius: 4,
                      background: '#4caf8222', color: '#4caf82',
                      border: '1px solid #4caf8244', cursor: 'pointer'
                    }}>{UI_ICONS.check}</button>
                    <button onClick={() => updateQuestStatus(quest.id, 'failed')} style={{
                      fontSize: 11, padding: '3px 8px', borderRadius: 4,
                      background: '#e0555522', color: '#e05555',
                      border: '1px solid #e0555544', cursor: 'pointer'
                    }}>{UI_ICONS.cross}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* POST-SESSIONE */}
      {section === 'post' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* XP */}
          <div style={{ background: '#16161f', border: '1px solid #2a2a3a', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700, color: '#e8e0d0', fontSize: 14 }}>{UI_ICONS.xp} Punti Esperienza</div>
                {totalXp > 0 && (
                  <div style={{ fontSize: 11, color: '#7c4daa', marginTop: 2 }}>
                    {totalXp} XP da distribuire
                  </div>
                )}
              </div>
              <button onClick={() => setShowXpForm(true)} style={{
                background: 'linear-gradient(135deg, #c9a84c, #a07830)',
                border: 'none', color: '#0f0f13', borderRadius: 6,
                padding: '4px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer'
              }}>{UI_ICONS.add} Aggiungi</button>
            </div>

            {showXpForm && (
              <div style={{ background: '#1e1e2a', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                  <input type="number" placeholder="Quantità XP *" value={xpAmount}
                    onChange={e => setXpAmount(e.target.value)}
                    style={{ width: '100%', textAlign: 'center', fontWeight: 700, fontSize: 16 }} autoFocus />
                  <input placeholder="Motivo (es. Boss sconfitto)" value={xpReason}
                    onChange={e => setXpReason(e.target.value)}
                    style={{ width: '100%' }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={addXp} style={{
                    flex: 1, padding: '6px 0',
                    background: 'linear-gradient(135deg, #c9a84c, #a07830)',
                    border: 'none', color: '#0f0f13', borderRadius: 6, fontWeight: 700, cursor: 'pointer'
                  }}>Salva</button>
                  <button onClick={() => setShowXpForm(false)} style={{
                    padding: '6px 12px', background: 'none',
                    border: '1px solid #2a2a3a', color: '#888', borderRadius: 6, cursor: 'pointer'
                  }}>Annulla</button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {xpLog.map(entry => (
                <div key={entry.id} style={{
                  background: '#1e1e2a', borderRadius: 8, padding: '10px 12px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  opacity: entry.distributed ? 0.5 : 1
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#7c4daa' }}>+{entry.amount}</span>
                    {entry.reason && (
                      <span style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>{entry.reason}</span>
                    )}
                    {entry.distributed && (
                      <span style={{ fontSize: 10, color: '#4caf82', marginLeft: 8 }}>{UI_ICONS.check} Distribuito</span>
                    )}
                  </div>
                  {!entry.distributed && (
                    <button onClick={() => distributeXp(entry)} style={{
                      fontSize: 11, padding: '4px 10px', borderRadius: 4,
                      background: '#7c4daa22', color: '#7c4daa',
                      border: '1px solid #7c4daa44', cursor: 'pointer', fontWeight: 600, flexShrink: 0
                    }}>Distribuisci</button>
                  )}
                </div>
              ))}
              {xpLog.length === 0 && !showXpForm && (
                <p style={{ color: '#444', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>Nessun XP ancora.</p>
              )}
            </div>
          </div>

          {/* Distribuzione loot */}
          {undistributedLoot.length > 0 && (
            <div style={{ background: '#16161f', border: '1px solid #2a2a3a', borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 700, color: '#e8e0d0', fontSize: 14, marginBottom: 12 }}>
                {UI_ICONS.loot} Loot da Distribuire
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {undistributedLoot.map(item => (
                  <div key={item.id} style={{
                    background: '#1e1e2a', borderRadius: 8, padding: '10px 12px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#e8e0d0' }}>{item.name}</div>
                      {item.target_character_id ? (
                        <div style={{ fontSize: 11, color: '#c9a84c', marginTop: 2 }}>
                          → {members.find(m => m.character_id === item.target_character_id)?.character?.name}
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Nessun destinatario</div>
                      )}
                    </div>
                    {item.target_character_id && (
                      <button onClick={() => distributeLoot(item)} style={{
                        fontSize: 11, padding: '4px 10px', borderRadius: 4,
                        background: '#4caf8222', color: '#4caf82',
                        border: '1px solid #4caf8244', cursor: 'pointer', fontWeight: 600, flexShrink: 0
                      }}>Dai oggetto</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Riepilogo sessione */}
          <div style={{
            background: '#c9a84c11', border: '1px solid #c9a84c33',
            borderRadius: 12, padding: 16
          }}>
            <div style={{ fontWeight: 700, color: '#c9a84c', fontSize: 14, marginBottom: 8 }}>
              {UI_ICONS.summary} Vuoi creare il riassunto della sessione?
            </div>
            <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
              Vai nel tab Sessioni per aggiungere un riassunto di questa sessione con immagini e note.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}