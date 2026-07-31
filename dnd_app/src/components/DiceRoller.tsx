import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { UI_ICONS } from '../icons'

interface DiceRoll {
  id: string
  username: string
  dice: string
  result: number
  details: number[]
  created_at: string
}

const DICE_TYPES = [4, 6, 8, 10, 12, 20, 100]

const DICE_COLORS: Record<number, string> = {
  4:   '#e05555',
  6:   '#c9a84c',
  8:   '#4caf82',
  10:  '#5b8dd9',
  12:  '#7c4daa',
  20:  '#d95b8d',
  100: '#5bd9c9',
}

function DiceFace({ sides, value, color, rolling }: {
  sides: number
  value: number | null
  color: string
  rolling: boolean
}) {
  const size = 80

  const shape = () => {
    switch (sides) {
      case 4:
        return (
          <polygon
            points={`${size/2},8 ${size-8},${size-8} 8,${size-8}`}
            fill={color + '33'} stroke={color} strokeWidth={2}
          />
        )
      case 6:
        return (
          <rect x={8} y={8} width={size-16} height={size-16}
            rx={8} fill={color + '33'} stroke={color} strokeWidth={2} />
        )
      case 8:
        return (
          <polygon
            points={`${size/2},6 ${size-6},${size/2} ${size/2},${size-6} 6,${size/2}`}
            fill={color + '33'} stroke={color} strokeWidth={2}
          />
        )
      case 10:
        return (
          <polygon
            points={`${size/2},6 ${size-10},${size*0.4} ${size-6},${size-10} ${size/2},${size-6} 10,${size-10} 10,${size*0.4}`}
            fill={color + '33'} stroke={color} strokeWidth={2}
          />
        )
      case 12:
        return (
          <polygon
            points={Array.from({ length: 5 }, (_, i) => {
              const angle = (i * 72 - 90) * Math.PI / 180
              const r = size / 2 - 8
              return `${size/2 + r * Math.cos(angle)},${size/2 + r * Math.sin(angle)}`
            }).join(' ')}
            fill={color + '33'} stroke={color} strokeWidth={2}
          />
        )
      case 20:
        return (
          <polygon
            points={Array.from({ length: 6 }, (_, i) => {
              const angle = (i * 60 - 90) * Math.PI / 180
              const r = size / 2 - 8
              return `${size/2 + r * Math.cos(angle)},${size/2 + r * Math.sin(angle)}`
            }).join(' ')}
            fill={color + '33'} stroke={color} strokeWidth={2}
          />
        )
      case 100:
        return (
          <circle cx={size/2} cy={size/2} r={size/2 - 8}
            fill={color + '33'} stroke={color} strokeWidth={2} />
        )
      default:
        return null
    }
  }

  return (
    <svg width={size} height={size} style={{
      filter: rolling ? `drop-shadow(0 0 12px ${color})` : `drop-shadow(0 0 4px ${color}88)`,
      transition: 'filter 0.1s'
    }}>
      {shape()}
      <text
        x={size / 2} y={size / 2 + 1}
        textAnchor="middle" dominantBaseline="middle"
        fill={rolling ? color : '#e8e0d0'}
        fontSize={value !== null && value >= 100 ? 14 : 20}
        fontWeight={700}
        style={{ transition: 'fill 0.2s' }}
      >
        {rolling ? '?' : (value ?? sides)}
      </text>
    </svg>
  )
}

export default function DiceRoller({
  campaignId,
  username
}: {
  campaignId: string
  username: string
}) {
  const [selectedDice, setSelectedDice] = useState<number>(20)
  const [quantity, setQuantity] = useState(1)
  const [modifier, setModifier] = useState(0)
  const [rolling, setRolling] = useState(false)
  const [currentValues, setCurrentValues] = useState<number[]>([])
  const [finalValues, setFinalValues] = useState<number[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [history, setHistory] = useState<DiceRoll[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const rollInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    loadHistory()

    const channel = supabase
      .channel(`dice_rolls:${campaignId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'dice_rolls',
        filter: `campaign_id=eq.${campaignId}`
      }, () => { loadHistory() })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [campaignId])

  async function loadHistory() {
    const { data } = await supabase
      .from('dice_rolls')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setHistory(data)
    setLoadingHistory(false)
  }

  async function roll() {
    if (rolling) return
    setRolling(true)
    setTotal(null)
    setFinalValues([])

    const results = Array.from({ length: quantity }, () =>
      Math.floor(Math.random() * selectedDice) + 1
    )

    let ticks = 0
    rollInterval.current = setInterval(() => {
      setCurrentValues(Array.from({ length: quantity }, () =>
        Math.floor(Math.random() * selectedDice) + 1
      ))
      ticks++
      if (ticks >= 12) {
        clearInterval(rollInterval.current!)
        setCurrentValues(results)
        setFinalValues(results)
        const sum = results.reduce((a, b) => a + b, 0) + modifier
        setTotal(sum)
        setRolling(false)
        saveRoll(results, sum)
      }
    }, 80)
  }

  async function saveRoll(results: number[], sum: number) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('dice_rolls').insert({
      campaign_id: campaignId,
      user_id: user.id,
      username,
      dice: `${quantity}d${selectedDice}${modifier !== 0 ? (modifier > 0 ? `+${modifier}` : modifier) : ''}`,
      result: sum,
      details: results,
    })
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  }

  const diceLabel = `${quantity}d${selectedDice}${modifier !== 0 ? (modifier > 0 ? `+${modifier}` : modifier) : ''}`
  const isCrit = selectedDice === 20 && finalValues.includes(20)
  const isFumble = selectedDice === 20 && finalValues.includes(1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Selezione dado */}
      <div>
        <div style={{ fontSize: 11, color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>
          Tipo di Dado
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {DICE_TYPES.map(d => (
            <button
              key={d}
              onClick={() => { setSelectedDice(d); setTotal(null); setFinalValues([]) }}
              style={{
                padding: '8px 14px', borderRadius: 8,
                background: selectedDice === d ? DICE_COLORS[d] + '33' : '#1e1e2a',
                border: `1px solid ${selectedDice === d ? DICE_COLORS[d] : '#2a2a3a'}`,
                color: selectedDice === d ? DICE_COLORS[d] : '#888',
                fontWeight: selectedDice === d ? 700 : 400,
                fontSize: 14, cursor: 'pointer', transition: 'all 0.15s'
              }}
            >
              d{d}
            </button>
          ))}
        </div>
      </div>

      {/* Quantità e Modificatore */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>
            Quantità
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} style={{
              width: 32, height: 32, borderRadius: 8, border: '1px solid #2a2a3a',
              background: '#1e1e2a', color: '#e8e0d0', fontSize: 18, cursor: 'pointer'
            }}>−</button>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#c9a84c', minWidth: 24, textAlign: 'center' }}>
              {quantity}
            </span>
            <button onClick={() => setQuantity(q => Math.min(10, q + 1))} style={{
              width: 32, height: 32, borderRadius: 8, border: '1px solid #2a2a3a',
              background: '#1e1e2a', color: '#e8e0d0', fontSize: 18, cursor: 'pointer'
            }}>+</button>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>
            Modificatore
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setModifier(m => m - 1)} style={{
              width: 32, height: 32, borderRadius: 8, border: '1px solid #2a2a3a',
              background: '#1e1e2a', color: '#e8e0d0', fontSize: 18, cursor: 'pointer'
            }}>−</button>
            <span style={{ fontSize: 20, fontWeight: 700, color: modifier >= 0 ? '#4caf82' : '#e05555', minWidth: 24, textAlign: 'center' }}>
              {modifier >= 0 ? `+${modifier}` : modifier}
            </span>
            <button onClick={() => setModifier(m => m + 1)} style={{
              width: 32, height: 32, borderRadius: 8, border: '1px solid #2a2a3a',
              background: '#1e1e2a', color: '#e8e0d0', fontSize: 18, cursor: 'pointer'
            }}>+</button>
          </div>
        </div>
      </div>

      {/* Area dadi */}
      <div style={{
        background: '#16161f', border: `2px solid ${rolling ? DICE_COLORS[selectedDice] : '#2a2a3a'}`,
        borderRadius: 16, padding: 24, textAlign: 'center',
        transition: 'border-color 0.2s', minHeight: 180,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
          {quantity > 0 && Array.from({ length: quantity }, (_, i) => (
            <div key={i} style={{
              transform: rolling ? `rotate(${Math.random() * 30 - 15}deg)` : 'rotate(0deg)',
              transition: rolling ? 'transform 0.08s' : 'transform 0.3s'
            }}>
              <DiceFace
                sides={selectedDice}
                value={finalValues[i] ?? null}
                color={DICE_COLORS[selectedDice]}
                rolling={rolling}
              />
            </div>
          ))}
        </div>

        {total !== null && !rolling && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {isCrit && <div style={{ fontSize: 13, color: '#c9a84c', fontWeight: 700, letterSpacing: 1 }}>{UI_ICONS.crit} CRITICO!</div>}
            {isFumble && <div style={{ fontSize: 13, color: '#e05555', fontWeight: 700, letterSpacing: 1 }}>{UI_ICONS.fumble} FALLIMENTO CRITICO!</div>}
            <div style={{
              fontSize: 56, fontWeight: 700,
              color: isCrit ? '#c9a84c' : isFumble ? '#e05555' : '#e8e0d0',
              lineHeight: 1
            }}>{total}</div>
            <div style={{ fontSize: 12, color: '#555' }}>
              {diceLabel}
              {quantity > 1 && ` = [${finalValues.join(' + ')}]${modifier !== 0 ? ` ${modifier > 0 ? '+' : ''}${modifier}` : ''}`}
            </div>
          </div>
        )}

        {total === null && !rolling && (
          <div style={{ fontSize: 13, color: '#444' }}>Premi per lanciare {diceLabel}</div>
        )}

        {rolling && (
          <div style={{ fontSize: 13, color: DICE_COLORS[selectedDice] }}>Lanciando...</div>
        )}
      </div>

      {/* Bottone lancia */}
      <button
        onClick={roll}
        disabled={rolling}
        style={{
          width: '100%', padding: '16px 0',
          background: rolling ? '#1e1e2a' : `linear-gradient(135deg, ${DICE_COLORS[selectedDice]}, ${DICE_COLORS[selectedDice]}88)`,
          color: rolling ? '#555' : '#0f0f13',
          border: `1px solid ${rolling ? '#2a2a3a' : DICE_COLORS[selectedDice]}`,
          borderRadius: 12, fontWeight: 700, fontSize: 16,
          cursor: rolling ? 'default' : 'pointer',
          transition: 'all 0.2s', letterSpacing: 0.5
        }}
      >
        {rolling ? `${UI_ICONS.dice} ...` : `${UI_ICONS.dice} Lancia ${diceLabel}`}
      </button>
    </div>
  )
}