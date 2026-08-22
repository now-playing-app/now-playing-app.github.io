import { useState, useEffect } from 'react'

const CLIENT_ID = '09ff71b7dfe043128dd49071e8096124'
const REDIRECT_URI = window.location.origin + window.location.pathname
const SCOPES = ['user-read-currently-playing', 'user-read-playback-state']

export default function App() {
  const [token, setToken] = useState<string | null>(null)
  const [track, setTrack] = useState<any>(null)
  const [isGhostMode, setIsGhostMode] = useState(false)

  // 1. URLのハッシュからアクセストークンを取得
  useEffect(() => {
    const hash = window.location.hash
    if (hash) {
      const tokenMatch = hash.match(/access_token=([^&]*)/)
      if (tokenMatch) {
        const _token = tokenMatch[1]
        setToken(_token)
        window.location.hash = ''
      }
    }
  }, [])

  // 2. Spotifyログイン用のURL生成
  const handleLogin = () => {
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES.join(' '))}`
    window.location.href = authUrl
  }

  // 3. 現在再生中の曲を取得
  const fetchCurrentlyPlaying = async () => {
    if (!token || isGhostMode) return

    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.status === 200) {
        const data = await res.json()
        setTrack(data.item)
      } else {
        setTrack(null)
      }
    } catch (err) {
      console.error(err)
    }
  }

  // 5秒ごとに曲情報を更新
  useEffect(() => {
    if (token) {
      fetchCurrentlyPlaying()
      const interval = setInterval(fetchCurrentlyPlaying, 5000)
      return () => clearInterval(interval)
    }
  }, [token, isGhostMode])

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>Now Playing</h1>

      {!token ? (
        <button onClick={handleLogin} style={{ padding: '12px 24px', fontSize: '16px', borderRadius: '20px', background: '#1DB954', color: '#fff', border: 'none', cursor: 'pointer' }}>
          Spotifyでログイン
        </button>
      ) : (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '18px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isGhostMode}
                onChange={(e) => setIsGhostMode(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              👻 ゴーストモード（共有オフ）
            </label>
          </div>

          {isGhostMode ? (
            <p style={{ color: '#888' }}>共有を一時停止中（非表示）</p>
          ) : track ? (
            <div style={{ border: '1px solid #ccc', padding: '16px', borderRadius: '12px', display: 'inline-block' }}>
              <img src={track.album.images[0]?.url} alt="album cover" style={{ width: '200px', borderRadius: '8px' }} />
              <h2>{track.name}</h2>
              <p>{track.artists.map((a: any) => a.name).join(', ')}</p>
            </div>
          ) : (
            <p>現在曲を再生していません</p>
          )}
        </div>
      )}
    </div>
  )
}