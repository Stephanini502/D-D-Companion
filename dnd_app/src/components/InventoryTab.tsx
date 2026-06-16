import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Item } from '../models/item'

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

const categoryIcons: Record<string, string> = {
  'Weapon': '⚔️',
  'Armor': '🛡️',
  'Adventuring Gear': '🎒',
  'Tools': '🔧',
  'Mounts and Vehicles': '🐴',
  'Trade Goods': '💰',
  'Treasure': '💎',
  'Potion': '🧪',
  'Ring': '💍',
  'Rod': '🪄',
  'Scroll': '📜',
  'Staff': '🪄',
  'Wand': '🪄',
  'Wondrous Items': '✨',
  'Equipment Pack': '🎒',
  'Magic Armor': '🛡️',
  'Magic Weapon': '⚔️',
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
  const [showModal, setShowModal] = useState(false)
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [categories, setCategories] = useState<string[]>([])

  async function loadItems() {
    const { data } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('character_id', characterId)
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
    const { error } = await supabase.from('inventory_items').insert({
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
    if (!error) loadItems()
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
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 16
      }}>
        <button
          onClick={() => setShowModal(true)}
          style={{
            flex: 1, padding: '12px 0',
            background: 'linear-gradient(135deg, #c9a84c, #a07830)',
            color: '#0f0f13', border: 'none', borderRadius: 8,
            fontWeight: 700, fontSize: 14
          }}
        >
          + Aggiungi Oggetto
        </button>
        {items.length > 0 && (
          <span style={{
            marginLeft: 12, fontSize: 12, color: '#666',
            whiteSpace: 'nowrap'
          }}>
            ⚖️ {totalWeight.toFixed(1)} kg
          </span>
        )}
      </div>

      {items.length === 0 && (
        <div style={{ textAlign: 'center', color: '#444', padding: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🎒</div>
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
              <div style={{ fontWeight: 600, fontSize: 14, color: '#e8e0d0' }}>
                {item.name}
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

            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0
            }}>
              <button
                onClick={() => updateQuantity(item.id, -1)}
                style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: '#1e1e2a', border: '1px solid #3a3a4a',
                  color: '#e8e0d0', fontSize: 16, display: 'flex',
                  alignItems: 'center', justifyContent: 'center'
                }}
              >−</button>
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
                  alignItems: 'center', justifyContent: 'center'
                }}
              >+</button>
            </div>

            <button
              onClick={() => handleDelete(item.id)}
              style={{
                background: 'none', border: 'none',
                color: '#3a3a4a', fontSize: 20, padding: '0 4px',
                transition: 'color 0.2s', flexShrink: 0
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#e05555')}
              onMouseLeave={e => (e.currentTarget.style.color = '#3a3a4a')}
            >×</button>
          </div>
        ))}
      </div>

      {/* Modale */}
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
              <h3 style={{ color: '#c9a84c', margin: 0 }}>🎒 Scegli Oggetto</h3>
              <button onClick={() => setShowModal(false)} style={{
                background: 'none', border: 'none', color: '#666', fontSize: 22
              }}>×</button>
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
            </div>

            <p style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>
              {catalogLoading ? 'Caricamento...' : `${filteredCatalog.length} oggetti disponibili`}
            </p>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {catalogLoading && (
                <p style={{ color: '#555', textAlign: 'center', padding: 20 }}>Caricamento catalogo...</p>
              )}
              {!catalogLoading && filteredCatalog.map(item => (
                <div key={item.id} style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '10px 0',
                  borderBottom: '1px solid #1e1e2a'
                }}>
                  <div style={{ flex: 1, marginRight: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 16 }}>
                        {categoryIcons[item.category] ?? '📦'}
                      </span>
                      <span style={{ fontWeight: 500, fontSize: 14, color: '#e8e0d0' }}>
                        {item.name}
                      </span>
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
                      background: 'linear-gradient(135deg, #c9a84c, #a07830)',
                      color: '#0f0f13', cursor: 'pointer',
                      fontSize: 13, fontWeight: 600, flexShrink: 0
                    }}
                  >
                    + Aggiungi
                  </button>
                </div>
              ))}
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