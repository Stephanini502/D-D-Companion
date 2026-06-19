import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Item } from '../models/item'
import { getCategoryIcon, UI_ICONS } from '../data/icons'

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

export default function InventoryTab({
  characterId,
  characterName
}: {
  characterId: string
  characterName: string
}) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [justAdded, setJustAdded] = useState<string | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [categories, setCategories] = useState<string[]>([])

  const [showCustomModal, setShowCustomModal] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customWeight, setCustomWeight] = useState('')
  const [customNotes, setCustomNotes] = useState('')
  const [customDamage, setCustomDamage] = useState('')
  const [customAC, setCustomAC] = useState('')

  async function loadItems() {
    const { data } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('character_id', characterId)
      .order('created_at', { ascending: true })
    if (data) setItems(data)
    setLoading(false)
  }

  async function loadCatalog() {
    setCatalogLoading(true)
    const { data } = await supabase
      .from('catalog_items')
      .select('id, name, category, cost, weight, description, damage, armor_class')
      .order('category', { ascending: true })
      .order('name', { ascending: true })
    if (data) {
      setCatalog(data)
      const uniqueCategories = [...new Set(data.map(i => i.category).filter(Boolean))]
      setCategories(uniqueCategories.sort())
    }
    setCatalogLoading(false)
  }

  useEffect(() => { loadItems() }, [characterId])
  useEffect(() => { if (showModal) loadCatalog() }, [showModal])

  async function handleAdd(item: CatalogItem) {
    const existing = items.find(i => i.name === item.name)
    if (existing) {
      // Aumenta la quantità se già presente
      await supabase.from('inventory_items')
        .update({ quantity: existing.quantity + 1 })
        .eq('id', existing.id)
    } else {
      await supabase.from('inventory_items').insert({
        character_id: characterId,
        character_name: characterName,
        name: item.name,
        quantity: 1,
        weight: item.weight ?? 0,
        notes: [
          item.damage ? `Danno: ${item.damage}` : '',
          item.armor_class ? `CA: ${item.armor_class}` : '',
          item.cost ? `Costo: ${item.cost}` : '',
          item.description ?? ''
        ].filter(Boolean).join(' · ')
      })
    }
    loadItems()
    setJustAdded(item.name)
    setTimeout(() => setJustAdded(null), 2000)
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
        character_id: characterId,
        character_name: characterName,
        name: customName,
        quantity: 1,
        weight: customWeight ? Number(customWeight) : 0,
        notes,
        is_custom: true
      })
    }

    setJustAdded(customName)
    setTimeout(() => setJustAdded(null), 2000)
    setCustomName('')
    setCustomWeight('')
    setCustomNotes('')
    setCustomDamage('')
    setCustomAC('')
    setShowCustomModal(false)
    loadItems()
  }

  async function handleDelete(id: string) {
    await supabase.from('inventory_items').delete().eq('id', id)
    loadItems()
  }

  async function updateQuantity(id: string, delta: number) {
    const item = items.find(i => i.id === id)
    if (!item) return
    const newQty = Math.max(0, item.quantity + delta)
    await supabase.from('inventory_items').update({ quantity: newQty }).eq('id', id)
    loadItems()
  }

  const filteredCatalog = catalog.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase())
    const matchCategory = filterCategory === 'all' || i.category === filterCategory
    return matchSearch && matchCategory
  })

  const totalWeight = items.reduce((sum, i) => sum + (i.weight ?? 0) * i.quantity, 0)

  if (loading) return <p style={{ color: '#555', textAlign: 'center', padding: 20 }}>Caricamento...</p>

  return (
    <div>

      {/* Feedback aggiunta */}
      {justAdded && (
        <div style={{
          background: '#4caf8222', border: '1px solid #4caf82',
          borderRadius: 8, padding: '10px 14px', marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 13, color: '#4caf82', fontWeight: 600
        }}>
          {UI_ICONS.success} "{justAdded}" aggiunto all'inventario!
        </div>
      )}

      {/* Bottoni in cima */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <button
          onClick={() => setShowModal(true)}
          style={{
            flex: 1, padding: '12px 0',
            background: 'linear-gradient(135deg, #c9a84c, #a07830)',
            color: '#0f0f13', border: 'none', borderRadius: 8,
            fontWeight: 700, fontSize: 14
          }}
        >
          {UI_ICONS.add} Dal Catalogo
        </button>
        <button
          onClick={() => setShowCustomModal(true)}
          style={{
            flex: 1, padding: '12px 0',
            background: '#1e1e2a', border: '1px solid #c9a84c',
            color: '#c9a84c', borderRadius: 8,
            fontWeight: 700, fontSize: 14
          }}
        >
          {UI_ICONS.custom} Personalizzato
        </button>
        {items.length > 0 && (
          <span style={{ fontSize: 12, color: '#666', whiteSpace: 'nowrap' }}>
            {UI_ICONS.weight} {totalWeight.toFixed(1)} kg
          </span>
        )}
      </div>

      {/* Lista oggetti */}
      {items.length === 0 && (
        <div style={{ textAlign: 'center', color: '#444', padding: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>{UI_ICONS.inventory}</div>
          <p>Inventario vuoto.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(item => (
          <div key={item.id} style={{
            background: '#16161f', border: '1px solid #2a2a3a',
            borderRadius: 10, padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: 12
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: '#e8e0d0' }}>
                  {item.name}
                </span>
                {(item as any).is_custom && (
                  <span style={{
                    fontSize: 9, padding: '1px 5px', borderRadius: 3,
                    background: '#c9a84c22', color: '#c9a84c', border: '1px solid #c9a84c44'
                  }}>custom</span>
                )}
              </div>
              {item.notes && (
                <div style={{
                  fontSize: 12, color: '#666', marginTop: 2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {item.notes}
                </div>
              )}
              {item.weight ? (
                <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>
                  {item.weight} kg/unità
                </div>
              ) : null}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <button
                onClick={() => updateQuantity(item.id, -1)}
                style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: '#1e1e2a', border: '1px solid #3a3a4a',
                  color: '#e8e0d0', fontSize: 16, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                }}
              >{UI_ICONS.damage}</button>
              <span style={{
                minWidth: 24, textAlign: 'center',
                fontSize: 14, fontWeight: 700, color: '#c9a84c'
              }}>
                {item.quantity}
              </span>
              <button
                onClick={() => updateQuantity(item.id, +1)}
                style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: '#1e1e2a', border: '1px solid #3a3a4a',
                  color: '#e8e0d0', fontSize: 16, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                }}
              >{UI_ICONS.heal}</button>
            </div>

            <button
              onClick={() => handleDelete(item.id)}
              style={{
                background: 'none', border: 'none',
                color: '#3a3a4a', fontSize: 20, padding: '0 4px',
                transition: 'color 0.2s', flexShrink: 0, cursor: 'pointer'
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#e05555')}
              onMouseLeave={e => (e.currentTarget.style.color = '#3a3a4a')}
            >{UI_ICONS.close}</button>
          </div>
        ))}
      </div>

      {/* Modale Oggetto Personalizzato */}
      {showCustomModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
        }} onClick={() => setShowCustomModal(false)}>
          <div style={{
            background: '#16161f', borderRadius: '16px 16px 0 0',
            padding: 20, width: '100%', maxWidth: 480,
            maxHeight: '85vh', display: 'flex', flexDirection: 'column',
            border: '1px solid #2a2a3a', borderBottom: 'none'
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 16
            }}>
              <h3 style={{ color: '#c9a84c', margin: 0 }}>
                {UI_ICONS.custom} Oggetto Personalizzato
              </h3>
              <button onClick={() => setShowCustomModal(false)} style={{
                background: 'none', border: 'none', color: '#666', fontSize: 22, cursor: 'pointer'
              }}>{UI_ICONS.close}</button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              <input
                placeholder="Nome oggetto *"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                style={{ width: '100%', marginBottom: 8 }}
                autoFocus
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <input
                  placeholder="Peso (kg)"
                  type="number"
                  value={customWeight}
                  onChange={e => setCustomWeight(e.target.value)}
                />
                <input
                  placeholder="Danno (es. 1d6)"
                  value={customDamage}
                  onChange={e => setCustomDamage(e.target.value)}
                />
              </div>
              <input
                placeholder="CA (es. 14)"
                value={customAC}
                onChange={e => setCustomAC(e.target.value)}
                style={{ width: '100%', marginBottom: 8 }}
              />
              <textarea
                placeholder="Note e descrizione..."
                value={customNotes}
                onChange={e => setCustomNotes(e.target.value)}
                rows={3}
                style={{ width: '100%', resize: 'vertical', marginBottom: 16 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
              <button onClick={handleAddCustomItem} style={{
                flex: 1, padding: '12px 0',
                background: 'linear-gradient(135deg, #c9a84c, #a07830)',
                color: '#0f0f13', border: 'none', borderRadius: 8,
                fontWeight: 700, fontSize: 14
              }}>
                {UI_ICONS.add} Aggiungi
              </button>
              <button onClick={() => setShowCustomModal(false)} style={{
                padding: '12px 16px', background: 'none',
                border: '1px solid #2a2a3a', color: '#888', borderRadius: 8
              }}>
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale Catalogo */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: '#16161f', borderRadius: '16px 16px 0 0',
            padding: 20, width: '100%', maxWidth: 480,
            maxHeight: '85vh', display: 'flex', flexDirection: 'column',
            border: '1px solid #2a2a3a', borderBottom: 'none'
          }} onClick={e => e.stopPropagation()}>

            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 16
            }}>
              <h3 style={{ color: '#c9a84c', margin: 0 }}>
                {UI_ICONS.inventory} Scegli Oggetto
              </h3>
              <button onClick={() => setShowModal(false)} style={{
                background: 'none', border: 'none', color: '#666', fontSize: 22, cursor: 'pointer'
              }}>{UI_ICONS.close}</button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                placeholder="Cerca..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex: 1 }}
                autoFocus
              />
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                style={{ width: 130 }}
              >
                <option value="all">Tutte</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button
                onClick={() => { setShowModal(false); setShowCustomModal(true) }}
                style={{
                  padding: '8px 12px',
                  background: '#1e1e2a', border: '1px solid #c9a84c',
                  color: '#c9a84c', borderRadius: 8,
                  fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', cursor: 'pointer'
                }}
              >
                {UI_ICONS.custom} Custom
              </button>
            </div>

            <p style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>
              {catalogLoading ? 'Caricamento...' : `${filteredCatalog.length} oggetti disponibili`}
            </p>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {catalogLoading && (
                <p style={{ color: '#555', textAlign: 'center', padding: 20 }}>Caricamento catalogo...</p>
              )}
              {!catalogLoading && filteredCatalog.map(item => {
                const wasJustAdded = justAdded === item.name
                const existing = items.find(i => i.name === item.name)
                return (
                  <div key={item.id} style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', padding: '10px 0',
                    borderBottom: '1px solid #1e1e2a'
                  }}>
                    <div style={{ flex: 1, marginRight: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 16 }}>{getCategoryIcon(item.category)}</span>
                        <span style={{ fontWeight: 500, fontSize: 14, color: '#e8e0d0' }}>
                          {item.name}
                        </span>
                        {existing && (
                          <span style={{
                            fontSize: 10, padding: '1px 5px', borderRadius: 3,
                            background: '#c9a84c22', color: '#c9a84c', border: '1px solid #c9a84c44'
                          }}>x{existing.quantity}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#555', marginTop: 2, marginLeft: 22 }}>
                        {item.category}
                        {item.cost ? ` · ${item.cost}` : ''}
                        {item.weight ? ` · ${item.weight} kg` : ''}
                        {item.damage ? ` · ${item.damage}` : ''}
                        {item.armor_class ? ` · CA ${item.armor_class}` : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAdd(item)}
                      style={{
                        padding: '5px 14px', borderRadius: 6, border: 'none',
                        background: wasJustAdded
                          ? '#4caf82'
                          : 'linear-gradient(135deg, #c9a84c, #a07830)',
                        color: '#0f0f13', cursor: 'pointer',
                        fontSize: 13, fontWeight: 600, flexShrink: 0,
                        transition: 'background 0.3s'
                      }}
                    >
                      {wasJustAdded ? `${UI_ICONS.success} Aggiunto` : `${UI_ICONS.add} Aggiungi`}
                    </button>
                  </div>
                )
              })}
              {!catalogLoading && filteredCatalog.length === 0 && (
                <p style={{ color: '#555', textAlign: 'center', marginTop: 30 }}>
                  Nessun oggetto trovato.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}