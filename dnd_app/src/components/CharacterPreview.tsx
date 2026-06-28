import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Character } from '../models/character'
import type { Item } from '../models/item'
import type { Spell } from '../models/spell'
import { getDarkvision, getPassivePerception, getProficiencyBonus } from '../data/raceTraits'
import { getClassIcon, getSchoolColor, getCategoryIcon, UI_ICONS } from '../data/icons'
import { SKILLS, getSkillBonus, formatBonus } from '../data/skills'

const BUCKET = 'characters-images'

interface CatalogItem {
  id: string
  name: string
  category: string
  cost: string
  weight: number
  description: string
  damage: string
  armor_class: string
}

interface CatalogSpell {
  id: string
  name: string
  level: number
  school: string
  cast_time: string
  range: string
}

interface Trait {
  id: string
  name: string
  description: string
  level_required?: number
}

interface Talent {
  id: string
  name: string
  description: string
}

export default function CharacterPreview({
  characterId,
  onClose,
  isMaster = false
}: {
  characterId: string
  onClose: () => void
  isMaster?: boolean
}) {
  const [character, setCharacter] = useState<Character | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFullImage, setShowFullImage] = useState(false)
  const [tab, setTab] = useState<'stats' | 'abilities' | 'inventory' | 'spells'>('stats')

  // Abilità
  const [skillProficiencies, setSkillProficiencies] = useState<Record<string, boolean>>({})
  const [traits, setTraits] = useState<Trait[]>([])
  const [talents, setTalents] = useState<Talent[]>([])
  const [abilitySection, setAbilitySection] = useState<'skills' | 'traits' | 'talents'>('skills')
  const [expandedTrait, setExpandedTrait] = useState<string | null>(null)

  // Inventario
  const [items, setItems] = useState<Item[]>([])
  const [showCatalogModal, setShowCatalogModal] = useState(false)
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState('')
  const [catalogCategory, setCatalogCategory] = useState('all')
  const [categories, setCategories] = useState<string[]>([])
  const [customName, setCustomName] = useState('')
  const [customWeight, setCustomWeight] = useState('')
  const [customNotes, setCustomNotes] = useState('')
  const [customDamage, setCustomDamage] = useState('')
  const [customAC, setCustomAC] = useState('')
  const [justAddedItem, setJustAddedItem] = useState<string | null>(null)

  // Magie
  const [spells, setSpells] = useState<Spell[]>([])
  const [showSpellModal, setShowSpellModal] = useState(false)
  const [spellCatalog, setSpellCatalog] = useState<CatalogSpell[]>([])
  const [spellCatalogLoading, setSpellCatalogLoading] = useState(false)
  const [spellSearch, setSpellSearch] = useState('')
  const [spellLevelFilter, setSpellLevelFilter] = useState<number | 'all'>('all')
  const [justAddedSpell, setJustAddedSpell] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .single()
      if (data) {
        setCharacter(data as Character)
        if (data.skill_proficiencies) setSkillProficiencies(data.skill_proficiencies)
        if (data.image_path) {
          const url = supabase.storage.from(BUCKET).getPublicUrl(data.image_path).data.publicUrl
          setImageUrl(url + '?t=' + Date.now())
        }

        // Tratti razziali
        const { data: raceTraits } = await supabase
          .from('catalog_traits')
          .select('id, name, description, level_required')
          .filter('races', 'cs', `["${data.race}"]`)

        // Tratti di classe
        const { data: classTraits } = await supabase
          .from('catalog_traits')
          .select('id, name, description, level_required')
          .filter('classes', 'cs', `["${data.character_class}"]`)
          .lte('level_required', data.level)
          .order('level_required', { ascending: true })

        setTraits([...(raceTraits ?? []), ...(classTraits ?? [])])

        // Talenti
        const { data: talentData } = await supabase
          .from('character_talents')
          .select('*')
          .eq('character_id', characterId)
          .order('created_at', { ascending: true })
        if (talentData) setTalents(talentData)
      }
      setLoading(false)
    }
    load()
    loadItems()
    loadSpells()
  }, [characterId])

  async function loadItems() {
    const { data } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('character_id', characterId)
      .order('created_at', { ascending: true })
    setItems((data || []) as Item[])
  }

  async function loadSpells() {
    const { data } = await supabase
      .from('spells')
      .select('*')
      .eq('character_id', characterId)
      .order('level', { ascending: true })
    setSpells((data || []) as Spell[])
  }

  async function loadCatalog() {
    setCatalogLoading(true)
    const { data } = await supabase
      .from('catalog_items')
      .select('id, name, category, cost, weight, description, damage, armor_class')
      .order('category').order('name')
    if (data) {
      setCatalog(data)
      const uniqueCategories = [...new Set(data.map(i => i.category).filter(Boolean))]
      setCategories(uniqueCategories.sort())
    }
    setCatalogLoading(false)
  }

  async function loadSpellCatalog() {
    if (!character) return
    setSpellCatalogLoading(true)
    const { data } = await supabase
      .from('catalog_spells')
      .select('id, name, level, school, cast_time, range')
      .filter('classes', 'cs', `["${character.character_class}"]`)
      .order('level').order('name')
    if (data) setSpellCatalog(data)
    setSpellCatalogLoading(false)
  }

  useEffect(() => { if (showCatalogModal) loadCatalog() }, [showCatalogModal])
  useEffect(() => { if (showSpellModal) loadSpellCatalog() }, [showSpellModal, character])

  async function handleAddFromCatalog(item: CatalogItem) {
    const existing = items.find(i => i.name === item.name)
    if (existing) {
      await supabase.from('inventory_items')
        .update({ quantity: existing.quantity + 1 })
        .eq('id', existing.id)
    } else {
      await supabase.from('inventory_items').insert({
        character_id: characterId,
        character_name: character?.name,
        name: item.name, quantity: 1, weight: item.weight ?? 0,
        notes: [
          item.damage ? `Danno: ${item.damage}` : '',
          item.armor_class ? `CA: ${item.armor_class}` : '',
          item.cost ? `Costo: ${item.cost}` : '',
        ].filter(Boolean).join(' · ')
      })
    }
    loadItems()
    setJustAddedItem(item.name)
    setTimeout(() => setJustAddedItem(null), 2000)
  }

  async function handleAddCustomItem() {
    if (!customName) return
    const notes = [
      customDamage ? `Danno: ${customDamage}` : '',
      customAC ? `CA: ${customAC}` : '',
      customNotes
    ].filter(Boolean).join(' · ')
    const existing = items.find(i => i.name === customName)
    if (existing) {
      await supabase.from('inventory_items')
        .update({ quantity: existing.quantity + 1 })
        .eq('id', existing.id)
    } else {
      await supabase.from('inventory_items').insert({
        character_id: characterId, character_name: character?.name,
        name: customName, quantity: 1,
        weight: customWeight ? Number(customWeight) : 0,
        notes, is_custom: true
      })
    }
    setJustAddedItem(customName)
    setTimeout(() => setJustAddedItem(null), 2000)
    setCustomName(''); setCustomWeight(''); setCustomNotes('')
    setCustomDamage(''); setCustomAC('')
    setShowCustomModal(false)
    loadItems()
  }

  async function handleAddSpell(spell: CatalogSpell) {
    const already = spells.some(s => s.name === spell.name)
    if (already) return
    await supabase.from('spells').insert({
      character_id: characterId, character_name: character?.name,
      name: spell.name, level: spell.level,
      school: spell.school, cast_time: spell.cast_time, range: spell.range,
    })
    loadSpells()
    setJustAddedSpell(spell.name)
    setTimeout(() => setJustAddedSpell(null), 2000)
  }

  async function updateQuantity(id: string, delta: number) {
    const item = items.find(i => i.id === id)
    if (!item) return
    const newQty = Math.max(0, item.quantity + delta)
    await supabase.from('inventory_items').update({ quantity: newQty }).eq('id', id)
    loadItems()
  }

  async function deleteItem(id: string) {
    await supabase.from('inventory_items').delete().eq('id', id)
    loadItems()
  }

  async function deleteSpell(id: string) {
    await supabase.from('spells').delete().eq('id', id)
    loadSpells()
  }

  function mod(val: number) {
    const m = Math.floor((val - 10) / 2)
    return (m >= 0 ? '+' : '') + m
  }

  const filteredCatalog = catalog.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(catalogSearch.toLowerCase())
    const matchCategory = catalogCategory === 'all' || i.category === catalogCategory
    return matchSearch && matchCategory
  })

  const filteredSpellCatalog = spellCatalog.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(spellSearch.toLowerCase())
    const matchLevel = spellLevelFilter === 'all' || s.level === spellLevelFilter
    return matchSearch && matchLevel
  })

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
  const sagMod = Math.floor((character.stats.SAG - 10) / 2)
  const profBonus = getProficiencyBonus(character.level)
  const passivePerception = getPassivePerception(sagMod, profBonus, character.perception_proficiency ?? false)
  const darkvision = getDarkvision(character.race)
  const raceTraits = traits.filter(t => !t.level_required)
  const classTraits = traits.filter(t => t.level_required && t.level_required > 0)

  const modalBase = {
    position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.85)',
    zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
  }
  const modalContent = {
    background: '#16161f', borderRadius: '16px 16px 0 0',
    padding: 20, width: '100%', maxWidth: 480,
    maxHeight: '85vh', display: 'flex', flexDirection: 'column' as const,
    border: '1px solid #2a2a3a', borderBottom: 'none'
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.9)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          background: '#16161f', borderRadius: '20px 20px 0 0',
          width: '100%', maxWidth: 480,
          maxHeight: '90vh', overflowY: 'auto',
          border: '1px solid #2a2a3a', borderBottom: 'none'
        }}>
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
              {isMaster ? `${UI_ICONS.master} Vista Master` : `${UI_ICONS.character} Scheda Personaggio`}
            </h2>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', color: '#666', fontSize: 22, cursor: 'pointer'
            }}>{UI_ICONS.close}</button>
          </div>

          <div style={{ padding: 20 }}>

            {/* Immagine + info */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'flex-start' }}>
              <div onClick={() => imageUrl && setShowFullImage(true)} style={{
                width: 90, height: 110, borderRadius: 12, flexShrink: 0,
                background: '#1e1e2a', border: '2px solid #2a2a3a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', cursor: imageUrl ? 'zoom-in' : 'default'
              }}>
                {imageUrl ? (
                  <img src={imageUrl} alt={character.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 40 }}>{getClassIcon(character.character_class)}</span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ color: '#e8e0d0', margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>
                  {character.name}
                </h3>
                <p style={{ color: '#888', fontSize: 13, margin: '0 0 10px' }}>
                  {character.race} · {character.character_class} · Livello {character.level}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#888' }}>Punti Ferita</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: hpColor }}>
                    {character.hp_current} / {character.hp_max}
                  </span>
                </div>
                <div style={{ height: 6, background: '#2a2a3a', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${hpPercent}%`, background: hpColor, borderRadius: 3 }} />
                </div>
              </div>
            </div>

            {/* Tab bar */}
            <div style={{ display: 'flex', borderBottom: '1px solid #2a2a3a', marginBottom: 16 }}>
              {([
                { key: 'stats', label: '📊 Stats' },
                { key: 'abilities', label: '🎯 Abilità' },
                { key: 'inventory', label: `${UI_ICONS.inventory} Zaino` },
                { key: 'spells', label: `${UI_ICONS.spells} Magie` },
              ] as const).map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{
                  flex: 1, padding: '10px 2px',
                  background: 'none', border: 'none',
                  borderBottom: tab === t.key ? '2px solid #c9a84c' : '2px solid transparent',
                  color: tab === t.key ? '#c9a84c' : '#555',
                  fontWeight: tab === t.key ? 700 : 400,
                  cursor: 'pointer', fontSize: 11
                }}>{t.label}</button>
              ))}
            </div>

            {/* Tab Stats */}
            {tab === 'stats' && (
              <>
                <div style={{ fontSize: 11, color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>
                  Caratteristiche
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                  {Object.entries(character.stats).map(([key, val]) => (
                    <div key={key} style={{
                      background: '#1e1e2a', border: '1px solid #2a2a3a',
                      borderRadius: 10, padding: '10px 8px', textAlign: 'center'
                    }}>
                      <div style={{ fontSize: 10, color: '#666', letterSpacing: 1, textTransform: 'uppercase' }}>{key}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#e8e0d0', lineHeight: 1.2, marginTop: 4 }}>{val}</div>
                      <div style={{ fontSize: 12, color: '#c9a84c', fontWeight: 600, marginTop: 2 }}>{mod(val)}</div>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: 11, color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>
                  Combattimento
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 }}>
                  {[
                    { label: 'Classe Armatura', value: 10 + Math.floor((character.stats.DES - 10) / 2), icon: UI_ICONS.armorClass },
                    { label: 'Iniziativa', value: mod(character.stats.DES), icon: UI_ICONS.initiative_icon },
                    { label: 'Velocità', value: '9 m', icon: UI_ICONS.speed },
                    { label: 'Bonus Competenza', value: '+' + profBonus, icon: UI_ICONS.proficiency },
                  ].map(item => (
                    <div key={item.label} style={{
                      background: '#1e1e2a', border: '1px solid #2a2a3a',
                      borderRadius: 10, padding: 12, textAlign: 'center'
                    }}>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{item.icon}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#c9a84c' }}>{item.value}</div>
                      <div style={{ fontSize: 10, color: '#666', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{
                  background: '#1e1e2a', border: '1px solid #2a2a3a',
                  borderRadius: 10, padding: '12px 14px',
                  display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8
                }}>
                  <div style={{ fontSize: 28 }}>{UI_ICONS.perception}</div>
                  <div>
                    <div style={{ fontSize: 10, color: '#666', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
                      Percezione Passiva
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#c9a84c' }}>{passivePerception}</div>
                    <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                      10 {sagMod >= 0 ? '+' : ''}{sagMod} SAG
                      {character.perception_proficiency ? ` + ${profBonus} comp.` : ''}
                    </div>
                  </div>
                </div>

                <div style={{
                  background: '#1e1e2a', border: '1px solid #2a2a3a',
                  borderRadius: 10, padding: '12px 14px',
                  display: 'flex', alignItems: 'center', gap: 14
                }}>
                  <div style={{ fontSize: 28 }}>{UI_ICONS.darkvision}</div>
                  <div>
                    <div style={{ fontSize: 10, color: '#666', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
                      Scurovisione
                    </div>
                    {darkvision > 0 ? (
                      <>
                        <div style={{ fontSize: 28, fontWeight: 700, color: darkvision === 36 ? '#7c4daa' : '#c9a84c' }}>
                          {darkvision} m
                        </div>
                        <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                          {darkvision === 36 ? 'Scurovisione superiore' : 'Scurovisione standard'}
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 22, fontWeight: 700, color: '#3a3a4a' }}>Nessuna</div>
                        <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{character.race} non ha scurovisione</div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Tab Abilità */}
            {tab === 'abilities' && (
              <div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                  {([
                    { key: 'skills', label: '🎯 Abilità' },
                    { key: 'traits', label: '⭐ Tratti' },
                    { key: 'talents', label: `${UI_ICONS.spells} Talenti` },
                  ] as const).map(s => (
                    <button key={s.key} onClick={() => setAbilitySection(s.key)} style={{
                      flex: 1, padding: '8px 4px',
                      background: abilitySection === s.key ? '#c9a84c22' : '#1e1e2a',
                      border: `1px solid ${abilitySection === s.key ? '#c9a84c' : '#2a2a3a'}`,
                      color: abilitySection === s.key ? '#c9a84c' : '#555',
                      borderRadius: 8, fontWeight: abilitySection === s.key ? 700 : 400,
                      cursor: 'pointer', fontSize: 12
                    }}>{s.label}</button>
                  ))}
                </div>

                {abilitySection === 'skills' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>
                      Bonus competenza: <strong style={{ color: '#c9a84c' }}>+{profBonus}</strong>
                    </div>
                    {SKILLS.map(skill => {
                      const isProficient = skillProficiencies[skill.name] ?? false
                      const bonus = getSkillBonus(skill.name, character.stats, profBonus, skillProficiencies)
                      return (
                        <div key={skill.name} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 14px', borderRadius: 8,
                          background: isProficient ? '#c9a84c11' : '#1e1e2a',
                          border: `1px solid ${isProficient ? '#c9a84c44' : '#2a2a3a'}`
                        }}>
                          <div style={{
                            width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                            background: isProficient ? '#c9a84c' : 'transparent',
                            border: `2px solid ${isProficient ? '#c9a84c' : '#3a3a4a'}`
                          }} />
                          <span style={{ flex: 1, fontSize: 13, color: isProficient ? '#e8e0d0' : '#888', fontWeight: isProficient ? 600 : 400 }}>
                            {skill.name}
                          </span>
                          <span style={{ fontSize: 10, color: '#444', letterSpacing: 1, textTransform: 'uppercase' }}>
                            {skill.stat}
                          </span>
                          <span style={{ fontSize: 14, fontWeight: 700, minWidth: 30, textAlign: 'right', color: isProficient ? '#c9a84c' : '#666' }}>
                            {formatBonus(bonus)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {abilitySection === 'traits' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {traits.length === 0 && (
                      <p style={{ color: '#444', textAlign: 'center', padding: 20 }}>Nessun tratto disponibile.</p>
                    )}
                    {raceTraits.length > 0 && (
                      <>
                        <div style={{ fontSize: 11, color: '#c9a84c', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>
                          ⭐ Tratti Razziali
                        </div>
                        {raceTraits.map(trait => (
                          <div key={trait.id} style={{
                            background: '#1e1e2a', border: '1px solid #2a2a3a',
                            borderRadius: 10, overflow: 'hidden'
                          }}>
                            <div onClick={() => setExpandedTrait(expandedTrait === trait.id ? null : trait.id)}
                              style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 600, fontSize: 13, color: '#c9a84c' }}>{trait.name}</span>
                              <span style={{ color: '#555', fontSize: 11 }}>{expandedTrait === trait.id ? '▲' : '▼'}</span>
                            </div>
                            {expandedTrait === trait.id && trait.description && (
                              <div style={{ padding: '10px 14px 12px', fontSize: 12, color: '#888', lineHeight: 1.7, whiteSpace: 'pre-wrap', borderTop: '1px solid #2a2a3a' }}>
                                {trait.description}
                              </div>
                            )}
                          </div>
                        ))}
                      </>
                    )}

                    {classTraits.length > 0 && (
                      <>
                        <div style={{ fontSize: 11, color: '#c9a84c', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700, marginTop: 8, marginBottom: 4 }}>
                          {UI_ICONS.combat} Tratti di Classe
                        </div>
                        {classTraits.map(trait => (
                          <div key={trait.id} style={{
                            background: '#1e1e2a', border: '1px solid #2a2a3a',
                            borderRadius: 10, overflow: 'hidden'
                          }}>
                            <div onClick={() => setExpandedTrait(expandedTrait === trait.id ? null : trait.id)}
                              style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <span style={{ fontWeight: 600, fontSize: 13, color: '#e8e0d0' }}>{trait.name}</span>
                                {trait.level_required && (
                                  <span style={{
                                    marginLeft: 8, fontSize: 10, padding: '1px 5px', borderRadius: 3,
                                    background: '#c9a84c22', color: '#c9a84c', border: '1px solid #c9a84c44'
                                  }}>Liv. {trait.level_required}</span>
                                )}
                              </div>
                              <span style={{ color: '#555', fontSize: 11 }}>{expandedTrait === trait.id ? '▲' : '▼'}</span>
                            </div>
                            {expandedTrait === trait.id && trait.description && (
                              <div style={{ padding: '10px 14px 12px', fontSize: 12, color: '#888', lineHeight: 1.7, whiteSpace: 'pre-wrap', borderTop: '1px solid #2a2a3a' }}>
                                {trait.description}
                              </div>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}

                {abilitySection === 'talents' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {talents.length === 0 && (
                      <p style={{ color: '#444', textAlign: 'center', padding: 20 }}>Nessun talento ancora.</p>
                    )}
                    {talents.map(talent => (
                      <div key={talent.id} style={{
                        background: '#1e1e2a', border: '1px solid #2a2a3a',
                        borderRadius: 10, padding: '12px 14px'
                      }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#e8e0d0', marginBottom: talent.description ? 6 : 0 }}>
                          {talent.name}
                        </div>
                        {talent.description && (
                          <div style={{ fontSize: 12, color: '#888', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                            {talent.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab Inventario */}
            {tab === 'inventory' && (
              <div>
                {justAddedItem && (
                  <div style={{
                    background: '#4caf8222', border: '1px solid #4caf82',
                    borderRadius: 8, padding: '8px 14px', marginBottom: 12,
                    fontSize: 13, color: '#4caf82', fontWeight: 600
                  }}>
                    {UI_ICONS.success} "{justAddedItem}" aggiunto!
                  </div>
                )}
                {isMaster && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <button onClick={() => setShowCatalogModal(true)} style={{
                      flex: 1, padding: '10px 0',
                      background: 'linear-gradient(135deg, #c9a84c, #a07830)',
                      color: '#0f0f13', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13
                    }}>{UI_ICONS.add} Dal Catalogo</button>
                    <button onClick={() => setShowCustomModal(true)} style={{
                      flex: 1, padding: '10px 0',
                      background: '#1e1e2a', border: '1px solid #c9a84c',
                      color: '#c9a84c', borderRadius: 8, fontWeight: 700, fontSize: 13
                    }}>{UI_ICONS.custom} Personalizzato</button>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.length === 0 && <p style={{ color: '#444', textAlign: 'center', padding: 20 }}>Inventario vuoto.</p>}
                  {items.map(item => (
                    <div key={item.id} style={{
                      background: '#1e1e2a', border: '1px solid #2a2a3a',
                      borderRadius: 10, padding: '12px 14px',
                      display: 'flex', alignItems: 'center', gap: 10
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 600, fontSize: 14, color: '#e8e0d0' }}>{item.name}</span>
                          {(item as any).is_custom && (
                            <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: '#c9a84c22', color: '#c9a84c', border: '1px solid #c9a84c44' }}>custom</span>
                          )}
                        </div>
                        {item.notes && (
                          <div style={{ fontSize: 12, color: '#666', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.notes}
                          </div>
                        )}
                      </div>
                      {isMaster ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <button onClick={() => updateQuantity(item.id, -1)} style={{
                            width: 26, height: 26, borderRadius: 6, background: '#2a2a3a', border: '1px solid #3a3a4a',
                            color: '#e8e0d0', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                          }}>{UI_ICONS.damage}</button>
                          <span style={{ minWidth: 20, textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#c9a84c' }}>
                            {item.quantity}
                          </span>
                          <button onClick={() => updateQuantity(item.id, +1)} style={{
                            width: 26, height: 26, borderRadius: 6, background: '#2a2a3a', border: '1px solid #3a3a4a',
                            color: '#e8e0d0', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                          }}>{UI_ICONS.heal}</button>
                          <button onClick={() => deleteItem(item.id)} style={{
                            background: 'none', border: 'none', color: '#3a3a4a', fontSize: 18, cursor: 'pointer'
                          }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#e05555')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#3a3a4a')}
                          >{UI_ICONS.close}</button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 13, color: '#c9a84c', fontWeight: 700, flexShrink: 0 }}>x{item.quantity}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab Magie */}
            {tab === 'spells' && (
              <div>
                {justAddedSpell && (
                  <div style={{
                    background: '#4caf8222', border: '1px solid #4caf82',
                    borderRadius: 8, padding: '8px 14px', marginBottom: 12,
                    fontSize: 13, color: '#4caf82', fontWeight: 600
                  }}>
                    {UI_ICONS.success} "{justAddedSpell}" aggiunto!
                  </div>
                )}
                {isMaster && (
                  <button onClick={() => setShowSpellModal(true)} style={{
                    width: '100%', padding: '10px 0', marginBottom: 16,
                    background: 'linear-gradient(135deg, #c9a84c, #a07830)',
                    color: '#0f0f13', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13
                  }}>{UI_ICONS.add} Aggiungi Incantesimo</button>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {spells.length === 0 && <p style={{ color: '#444', textAlign: 'center', padding: 20 }}>Nessun incantesimo.</p>}
                  {spells.map(spell => (
                    <div key={spell.id} style={{
                      background: '#1e1e2a', border: '1px solid #2a2a3a',
                      borderRadius: 10, padding: '12px 14px',
                      display: 'flex', alignItems: 'center', gap: 10
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 600, fontSize: 14, color: '#e8e0d0' }}>{spell.name}</span>
                          {spell.school && (
                            <span style={{
                              fontSize: 9, padding: '1px 5px', borderRadius: 3,
                              background: getSchoolColor(spell.school) + '22',
                              color: getSchoolColor(spell.school),
                              border: `1px solid ${getSchoolColor(spell.school)}44`
                            }}>{spell.school}</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                          {spell.level === 0 ? 'Trucchetto' : `Liv. ${spell.level}`}
                          {spell.cast_time ? ` · ${spell.cast_time}` : ''}
                        </div>
                      </div>
                      {isMaster && (
                        <button onClick={() => deleteSpell(spell.id)} style={{
                          background: 'none', border: 'none', color: '#3a3a4a', fontSize: 18, cursor: 'pointer', flexShrink: 0
                        }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#e05555')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#3a3a4a')}
                        >{UI_ICONS.close}</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Modale catalogo oggetti */}
      {showCatalogModal && (
        <div style={modalBase} onClick={() => setShowCatalogModal(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ color: '#c9a84c', margin: 0 }}>{UI_ICONS.inventory} Scegli Oggetto</h3>
              <button onClick={() => setShowCatalogModal(false)} style={{ background: 'none', border: 'none', color: '#666', fontSize: 22, cursor: 'pointer' }}>{UI_ICONS.close}</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input placeholder="Cerca..." value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)} style={{ flex: 1 }} autoFocus />
              <select value={catalogCategory} onChange={e => setCatalogCategory(e.target.value)} style={{ width: 120 }}>
                <option value="all">Tutte</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <p style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>
              {catalogLoading ? 'Caricamento...' : `${filteredCatalog.length} oggetti`}
            </p>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filteredCatalog.map(item => {
                const wasJustAdded = justAddedItem === item.name
                const existing = items.find(i => i.name === item.name)
                return (
                  <div key={item.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0', borderBottom: '1px solid #1e1e2a'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14 }}>{getCategoryIcon(item.category)}</span>
                        <span style={{ fontWeight: 500, fontSize: 14, color: '#e8e0d0' }}>{item.name}</span>
                        {existing && (
                          <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: '#c9a84c22', color: '#c9a84c', border: '1px solid #c9a84c44' }}>
                            x{existing.quantity}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
                        {item.category}{item.cost ? ` · ${item.cost}` : ''}{item.weight ? ` · ${item.weight}kg` : ''}
                      </div>
                    </div>
                    <button onClick={() => handleAddFromCatalog(item)} style={{
                      padding: '5px 14px', borderRadius: 6, border: 'none',
                      background: wasJustAdded ? '#4caf82' : 'linear-gradient(135deg, #c9a84c, #a07830)',
                      color: '#0f0f13', cursor: 'pointer', fontSize: 13, fontWeight: 600, flexShrink: 0,
                      transition: 'background 0.3s'
                    }}>
                      {wasJustAdded ? `${UI_ICONS.success} Aggiunto` : `${UI_ICONS.add} Aggiungi`}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modale oggetto personalizzato */}
      {showCustomModal && (
        <div style={modalBase} onClick={() => setShowCustomModal(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ color: '#c9a84c', margin: 0 }}>{UI_ICONS.custom} Oggetto Personalizzato</h3>
              <button onClick={() => setShowCustomModal(false)} style={{ background: 'none', border: 'none', color: '#666', fontSize: 22, cursor: 'pointer' }}>{UI_ICONS.close}</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <input placeholder="Nome oggetto *" value={customName}
                onChange={e => setCustomName(e.target.value)}
                style={{ width: '100%', marginBottom: 8 }} autoFocus />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <input placeholder="Peso (kg)" type="number" value={customWeight}
                  onChange={e => setCustomWeight(e.target.value)} />
                <input placeholder="Danno (es. 1d6)" value={customDamage}
                  onChange={e => setCustomDamage(e.target.value)} />
              </div>
              <input placeholder="CA (es. 14)" value={customAC}
                onChange={e => setCustomAC(e.target.value)}
                style={{ width: '100%', marginBottom: 8 }} />
              <textarea placeholder="Note e descrizione..." value={customNotes}
                onChange={e => setCustomNotes(e.target.value)}
                rows={3} style={{ width: '100%', resize: 'vertical', marginBottom: 16 }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleAddCustomItem} style={{
                flex: 1, padding: '12px 0',
                background: 'linear-gradient(135deg, #c9a84c, #a07830)',
                color: '#0f0f13', border: 'none', borderRadius: 8, fontWeight: 700
              }}>{UI_ICONS.add} Aggiungi</button>
              <button onClick={() => setShowCustomModal(false)} style={{
                padding: '12px 16px', background: 'none',
                border: '1px solid #2a2a3a', color: '#888', borderRadius: 8
              }}>Annulla</button>
            </div>
          </div>
        </div>
      )}

      {/* Modale magie */}
      {showSpellModal && (
        <div style={modalBase} onClick={() => setShowSpellModal(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ color: '#c9a84c', margin: 0 }}>{UI_ICONS.spells} Scegli Incantesimo</h3>
              <button onClick={() => setShowSpellModal(false)} style={{ background: 'none', border: 'none', color: '#666', fontSize: 22, cursor: 'pointer' }}>{UI_ICONS.close}</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input placeholder="Cerca..." value={spellSearch}
                onChange={e => setSpellSearch(e.target.value)} style={{ flex: 1 }} autoFocus />
              <select value={spellLevelFilter}
                onChange={e => setSpellLevelFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                style={{ width: 110 }}>
                <option value="all">Tutti</option>
                <option value={0}>Trucchetti</option>
                {[1,2,3,4,5,6,7,8,9].map(l => <option key={l} value={l}>Liv. {l}</option>)}
              </select>
            </div>
            <p style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>
              {spellCatalogLoading ? 'Caricamento...' : `${filteredSpellCatalog.length} incantesimi per ${character.character_class}`}
            </p>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {spellCatalogLoading && <p style={{ color: '#555', textAlign: 'center', padding: 20 }}>Caricamento...</p>}
              {!spellCatalogLoading && filteredSpellCatalog.map(spell => {
                const alreadyAdded = spells.some(s => s.name === spell.name)
                const wasJustAdded = justAddedSpell === spell.name
                return (
                  <div key={spell.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0', borderBottom: '1px solid #1e1e2a'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 500, fontSize: 14, color: '#e8e0d0' }}>{spell.name}</span>
                        {spell.school && (
                          <span style={{
                            fontSize: 9, padding: '1px 5px', borderRadius: 3,
                            background: getSchoolColor(spell.school) + '22',
                            color: getSchoolColor(spell.school),
                          }}>{spell.school}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
                        {spell.level === 0 ? 'Trucchetto' : `Liv. ${spell.level}`} · {spell.cast_time}
                      </div>
                    </div>
                    <button onClick={() => handleAddSpell(spell)} disabled={alreadyAdded} style={{
                      padding: '5px 14px', borderRadius: 6, border: 'none',
                      background: wasJustAdded ? '#4caf82' : alreadyAdded ? '#2a2a3a' : 'linear-gradient(135deg, #c9a84c, #a07830)',
                      color: alreadyAdded && !wasJustAdded ? '#555' : '#0f0f13',
                      cursor: alreadyAdded ? 'default' : 'pointer',
                      fontSize: 13, fontWeight: 600, flexShrink: 0, transition: 'background 0.3s'
                    }}>
                      {wasJustAdded ? `${UI_ICONS.success} Aggiunto` : alreadyAdded ? UI_ICONS.success : `${UI_ICONS.add} Aggiungi`}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

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
          }}>{UI_ICONS.close}</button>
        </div>
      )}
    </>
  )
}