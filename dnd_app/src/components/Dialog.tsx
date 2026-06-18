import { useState } from 'react'

interface DialogOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

type DialogResolver = (value: boolean) => void

let resolver: DialogResolver | null = null

export function useDialog() {
  const [visible, setVisible] = useState(false)
  const [options, setOptions] = useState<DialogOptions>({
    title: '',
    message: ''
  })

  function confirm(opts: DialogOptions): Promise<boolean> {
    setOptions(opts)
    setVisible(true)
    return new Promise(resolve => {
      resolver = resolve
    })
  }

  function handleConfirm() {
    setVisible(false)
    resolver?.(true)
    resolver = null
  }

  function handleCancel() {
    setVisible(false)
    resolver?.(false)
    resolver = null
  }

  const DialogComponent = () => !visible ? null : (
    <div
      onClick={handleCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#16161f',
          border: `1px solid ${options.danger ? '#e05555' : '#2a2a3a'}`,
          borderRadius: 16, padding: 24,
          width: '100%', maxWidth: 360,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
        }}
      >
        {/* Icona */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 40 }}>
            {options.danger ? '⚠️' : '❓'}
          </div>
        </div>

        {/* Titolo */}
        <h3 style={{
          color: options.danger ? '#e05555' : '#c9a84c',
          margin: '0 0 10px', fontSize: 18,
          fontWeight: 700, textAlign: 'center'
        }}>
          {options.title}
        </h3>

        {/* Messaggio */}
        <p style={{
          color: '#888', fontSize: 14,
          lineHeight: 1.6, textAlign: 'center',
          margin: '0 0 24px'
        }}>
          {options.message}
        </p>

        {/* Bottoni */}
        <div style={{ display: 'flex', gap: 10 }}>
          {options.cancelLabel !== undefined && (
            <button
              onClick={handleCancel}
              style={{
                flex: 1, padding: '12px 0',
                background: 'none',
                border: '1px solid #2a2a3a',
                color: '#888', borderRadius: 10,
                fontWeight: 600, fontSize: 14, cursor: 'pointer'
              }}
            >
              {options.cancelLabel ?? 'Annulla'}
            </button>
          )}
          <button
            onClick={handleConfirm}
            style={{
              flex: 1, padding: '12px 0',
              background: options.danger
                ? 'linear-gradient(135deg, #e05555, #a03030)'
                : 'linear-gradient(135deg, #c9a84c, #a07830)',
              color: options.danger ? '#fff' : '#0f0f13',
              border: 'none', borderRadius: 10,
              fontWeight: 700, fontSize: 14, cursor: 'pointer'
            }}
          >
            {options.confirmLabel ?? 'OK'}
          </button>
        </div>
      </div>
    </div>
  )

  return { confirm, DialogComponent }
}