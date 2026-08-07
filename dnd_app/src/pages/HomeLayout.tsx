import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useDialog } from '../components/Dialog'
import { UI_ICONS, SECTION_LABELS } from '../icons'

const SECTIONS = [
  { to: '/personaggi', label: SECTION_LABELS.characters },
  { to: '/campagne', label: SECTION_LABELS.campaigns },
]

export default function HomeLayout() {
  const { confirm, DialogComponent } = useDialog()

  async function handleLogout() {
    const ok = await confirm({
      title: 'Esci',
      message: 'Sei sicuro di voler uscire?',
      confirmLabel: 'Esci',
      cancelLabel: 'Annulla',
      danger: false
    })
    if (!ok) return
    await supabase.auth.signOut()
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh' }}>
      <DialogComponent />

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 24px', borderBottom: '1px solid #2a2a3a'
      }}>
        <h1 style={{ color: '#c9a84c', fontSize: 20, fontWeight: 700, margin: 0 }}>
          {UI_ICONS.combat} D&D Companion
        </h1>
        <button onClick={handleLogout} style={{
          background: 'none', border: '1px solid #2a2a3a',
          color: '#888', borderRadius: 8, padding: '6px 12px', fontSize: 13
        }}>
          {UI_ICONS.logout} Esci
        </button>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #2a2a3a', padding: '0 24px' }}>
        {SECTIONS.map(s => (
          <NavLink key={s.to} to={s.to} style={({ isActive }) => ({
            padding: '12px 16px', background: 'none', border: 'none',
            borderBottom: isActive ? '2px solid #c9a84c' : '2px solid transparent',
            color: isActive ? '#c9a84c' : '#555',
            fontWeight: isActive ? 700 : 400,
            cursor: 'pointer', fontSize: 14, transition: 'color 0.2s',
            textDecoration: 'none'
          })}>
            {s.label}
          </NavLink>
        ))}
      </div>

      <div style={{ padding: 24 }}>
        <Outlet />
      </div>
    </div>
  )
}
