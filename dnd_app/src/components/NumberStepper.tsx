import type { CSSProperties } from 'react'

// Stepper numerico controllabile da PC e da telefono:
// pulsanti −/+ ampi (touch-friendly) + campo digitabile con tastierino
// numerico su mobile. Clamp min/max e seleziona-tutto al focus.
export default function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  ariaLabel,
  height = 40,
  maxWidth,
}: {
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  step?: number
  ariaLabel?: string
  height?: number
  maxWidth?: number
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n))
  const atMin = value <= min
  const atMax = value >= max

  const btnW = Math.round(height * 0.9)
  const btnFont = Math.round(height * 0.5)
  const inputFont = Math.max(13, Math.round(height * 0.4))

  const btnStyle = (disabled: boolean): CSSProperties => ({
    width: btnW,
    flexShrink: 0,
    alignSelf: 'stretch',
    background: disabled ? '#16161f' : '#1e1e2a',
    border: 'none',
    color: disabled ? '#3a3a4a' : '#c9a84c',
    fontSize: btnFont,
    fontWeight: 700,
    lineHeight: 1,
    cursor: disabled ? 'default' : 'pointer',
    userSelect: 'none',
    touchAction: 'manipulation',
  })

  return (
    <div style={{
      display: 'flex',
      alignItems: 'stretch',
      border: '1px solid #2a2a3a',
      borderRadius: height / 2,
      overflow: 'hidden',
      background: '#16161f',
      height,
      width: '100%',
      maxWidth,
      margin: '0 auto',
    }}>
      <button
        type="button"
        aria-label="Diminuisci"
        disabled={atMin}
        onClick={() => onChange(clamp(value - step))}
        style={btnStyle(atMin)}
      >−</button>

      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={ariaLabel}
        value={value}
        onFocus={e => e.currentTarget.select()}
        onChange={e => {
          const digits = e.target.value.replace(/[^0-9]/g, '')
          onChange(digits === '' ? min : clamp(parseInt(digits, 10)))
        }}
        style={{
          flex: 1,
          minWidth: 0,
          textAlign: 'center',
          border: 'none',
          background: 'transparent',
          color: '#e8e0d0',
          fontWeight: 700,
          fontSize: inputFont,
          padding: 0,
          outline: 'none',
        }}
      />

      <button
        type="button"
        aria-label="Aumenta"
        disabled={atMax}
        onClick={() => onChange(clamp(value + step))}
        style={btnStyle(atMax)}
      >+</button>
    </div>
  )
}
