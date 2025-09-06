'use client'

import { useEffect, useState } from 'react'

export default function EnvironmentChecker() {
  const [env, setEnv] = useState<any>(null)

  useEffect(() => {
    const checkEnv = () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const projectId = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
      
      setEnv({
        supabaseUrl,
        projectId,
        isLocal: window.location.hostname === 'localhost',
        isProduction: window.location.hostname !== 'localhost'
      })
    }

    checkEnv()
  }, [])

  if (!env) return null

  return (
    <div className="fixed top-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-800 px-3 py-2 rounded text-sm z-50">
      <div className="font-semibold">Environment:</div>
      <div>Project: {env.projectId}</div>
      <div>Host: {env.isLocal ? 'Local' : 'Production'}</div>
    </div>
  )
}
