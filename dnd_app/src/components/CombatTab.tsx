import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Character } from '../models/character'
import { calculateAC, detectArmorType, getArmorCategoryLabel } from '../data/armorTypes'
import { UI_ICONS } from '../data/icons'

interface Item {
  id: string
  name: string
  notes: string
  weight: number
  quantity: number
}

export default function CombatTab({
  character,
  characterId
}: {
  character: Character
  characterId: string
}) {
  const [items, setItems] = useState<Item[]>([])
  const [equippedArmorId, setEquippedArmorId] = useState<string | null>(null)
  const [equippedShieldId, setEquippedShieldId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const desMod = Math.floor(((character.stats.DES as number) - 10) / 2)

  function mod(val: number) {
    const m = Math.floor((val - 10) / 2)
    return (m >= 0 ? '+' : '') + m
  }

  useEffect(() => {
    async function load() {
      const { data: invData } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('character_id', characterId)
      if (invData) setItems(invData)

      const { data: charData } = await supabase
        .from('characters')
        .select('equipped_armor')
        .eq('id', characterId)
        .single()

      if (charData?.equipped_armor) {
        try {
          const equipped = JSON.parse(charData.equipped_armor)
          setEquippedArmorId(equipped.armorId ?? null)
          setEquippedShieldId(equipped.shieldId ?? null)
        } catch {
          setEquippedArmorId(null)
          setEquippedShieldId(null)
        }
      }
      setLoading(false)
    }
    load()
  }, [characterId])

  async function saveEquipped(armorId: string | null, shieldId: string | null) {
    await supabase
      .from('characters')
      .update({ equipped_armor: JSON.stringify({ armorId, shieldId }) })
      .eq('id', characterId)
  }

  const armors = items.filter(i => {
    const armorType = detectArmorType(i.name, i.notes)
    return armorType && armorType.category !== 'shield'
  })

  const shields = items.filter(i => {
    const armorType = detectArmorType(i.name, i.notes)
    return armorType && armorType.category === 'shield'
  })

  const equippedArmor = items.find(i => i.id === equippedArmorId) ?? null
  const equippedShield = items.find(i => i.id === equippedShieldId) ?? null

  const totalAC = calculateAC(equippedArmor, equippedShield, desMod)

  if (loading) return <p style={{ color: '#555', textAlign: 'center', padding: 20 }}>Caricamento...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* CA principale */}
      <div style={{
        background: '#16161f', border: '2px solid #c9a84c',
        borderRadius: 16, padding: 24, textAlign: 'center'
      }}>
        <div style={{ fontSize: 11, color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
          Classe Armatura
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, color: '#c9a84c', lineHeight: 1 }}>
          {totalAC}
        </div>
        <div style={{ fontSize: 12, color: '#555', marginTop: 8 }}>
          {equippedArmor ? equippedArmor.name : 'Senza armatura'}
          {equippedShield ? ' + ' + equippedShield.name : ''}
        </div>
      </div>

      {/* Selettore armatura */}
      <div style={{
        background: '#16161f', border: '1px solid #2a2a3a',
        borderRadius: 12, padding: 16
      }}>
        <div style={{
          fontSize: 11, color: '#888', letterSpacing: 1,
          textTransform: 'uppercase', marginBottom: 12, fontWeight: 600
        }}>
          {UI_ICONS.armorClass} Armatura
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            onClick={() => {
              setEquippedArmorId(null)
              saveEquipped(null, equippedShieldId)
            }}
            style={{
              padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
              background: !equippedArmorId ? '#c9a84c22' : '#1e1e2a',
              border: `1px solid ${!equippedArmorId ? '#c9a84c' : '#3a3a4a'}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}
          >
            <div>
              <div style={{ fontSize: 13, color: !equippedArmorId ? '#c9a84c' : '#888', fontWeight: !equippedArmorId ? 600 : 400 }}>
                Senza armatura
              </div>
              <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>CA base + DES</div>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: !equippedArmorId ? '#c9a84c' : '#555' }}>
              CA {10 + desMod}
            </span>
          </div>

          {armors.length === 0 && (
            <p style={{ color: '#444', fontSize: 12, textAlign: 'center', padding: '8px 0' }}>
              Nessuna armatura nell'inventario
            </p>
          )}

          {armors.map(armor => {
            const armorType = detectArmorType(armor.name, armor.notes)
            const ac = calculateAC(armor, null, desMod)
            const isEquipped = equippedArmorId === armor.id
            return (
              <div
                key={armor.id}
                onClick={() => {
                  setEquippedArmorId(armor.id)
                  saveEquipped(armor.id, equippedShieldId)
                }}
                style={{
                  padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                  background: isEquipped ? '#c9a84c22' : '#1e1e2a',
                  border: `1px solid ${isEquipped ? '#c9a84c' : '#3a3a4a'}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: 13, color: isEquipped ? '#c9a84c' : '#e8e0d0', fontWeight: isEquipped ? 600 : 400 }}>
                    {armor.name}
                  </div>
                  {armorType && (
                    <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>
                      {getArmorCategoryLabel(armorType.category)} · Base {armorType.baseAC}
                      {armorType.category === 'light' && ` + DES (${mod(character.stats.DES as number)})`}
                      {armorType.category === 'medium' && ` + DES max +2`}
                      {armorType.category === 'heavy' && ` (DES ignorato)`}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: isEquipped ? '#c9a84c' : '#555' }}>
                  CA {ac}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Selettore scudo */}
      <div style={{
        background: '#16161f', border: '1px solid #2a2a3a',
        borderRadius: 12, padding: 16
      }}>
        <div style={{
          fontSize: 11, color: '#888', letterSpacing: 1,
          textTransform: 'uppercase', marginBottom: 12, fontWeight: 600
        }}>
          {UI_ICONS.armorClass} Scudo
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            onClick={() => {
              setEquippedShieldId(null)
              saveEquipped(equippedArmorId, null)
            }}
            style={{
              padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
              background: !equippedShieldId ? '#c9a84c22' : '#1e1e2a',
              border: `1px solid ${!equippedShieldId ? '#c9a84c' : '#3a3a4a'}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}
          >
            <span style={{ fontSize: 13, color: !equippedShieldId ? '#c9a84c' : '#888', fontWeight: !equippedShieldId ? 600 : 400 }}>
              Senza scudo
            </span>
            <span style={{ fontSize: 13, color: '#555' }}>+0</span>
          </div>

          {shields.length === 0 && (
            <p style={{ color: '#444', fontSize: 12, textAlign: 'center', padding: '8px 0' }}>
              Nessuno scudo nell'inventario
            </p>
          )}

          {shields.map(shield => {
            const isEquipped = equippedShieldId === shield.id
            return (
              <div
                key={shield.id}
                onClick={() => {
                  setEquippedShieldId(shield.id)
                  saveEquipped(equippedArmorId, shield.id)
                }}
                style={{
                  padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                  background: isEquipped ? '#c9a84c22' : '#1e1e2a',
                  border: `1px solid ${isEquipped ? '#c9a84c' : '#3a3a4a'}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}
              >
                <span style={{ fontSize: 13, color: isEquipped ? '#c9a84c' : '#e8e0d0', fontWeight: isEquipped ? 600 : 400 }}>
                  {shield.name}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: isEquipped ? '#c9a84c' : '#555' }}>
                  +2
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Altre stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { label: 'Iniziativa', value: mod(character.stats.DES as number), icon: UI_ICONS.initiative_icon },
          { label: 'Velocità', value: '9 m', icon: UI_ICONS.speed },
          { label: 'Bonus Competenza', value: '+' + (character.level < 5 ? 2 : character.level < 9 ? 3 : 4), icon: UI_ICONS.proficiency },
          { label: 'Modificatore DES', value: mod(character.stats.DES as number), icon: UI_ICONS.dice },
        ].map(item => (
          <div key={item.label} style={{
            background: '#16161f', border: '1px solid #2a2a3a',
            borderRadius: 10, padding: 16, textAlign: 'center'
          }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{item.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#c9a84c' }}>{item.value}</div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {item.label}
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}