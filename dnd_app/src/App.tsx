import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import LoginPage from './pages/LoginPage'
import HomeLayout from './pages/HomeLayout'
import CharacterListPage from './pages/CharacterListPage'
import CampaignsPage from './pages/CampaignsPage'
import CreateCharacterPage from './pages/CreateCharacterPage'
import CharacterPage from './pages/CharacterPage'
import CampaignPage from './pages/CampaignPage'
import { UI_ICONS } from './icons'
import type { Session } from '@supabase/supabase-js'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: '#0f0f13', color: '#c9a84c'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>{UI_ICONS.logo}</div>
        <p>Caricamento...</p>
      </div>
    </div>
  )

  return (
    <div style={{ background: '#0f0f13', minHeight: '100vh' }}>
      {session ? (
        <HashRouter>
          <Routes>
            <Route element={<HomeLayout />}>
              <Route path="/" element={<Navigate to="/personaggi" replace />} />
              <Route path="/personaggi" element={<CharacterListPage />} />
              <Route path="/campagne" element={<CampaignsPage />} />
            </Route>
            <Route path="/personaggi/nuovo" element={<CreateCharacterPage />} />
            <Route path="/personaggi/:id" element={<CharacterPage />} />
            <Route path="/campagne/:id" element={<CampaignPage />} />
            <Route path="*" element={<Navigate to="/personaggi" replace />} />
          </Routes>
        </HashRouter>
      ) : <LoginPage />}
    </div>
  )
}