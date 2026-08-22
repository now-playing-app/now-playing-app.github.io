import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const CLIENT_ID = '09ff71b7dfe043128dd49071e8096124'
// 以下の行を固定のURLに変更
const REDIRECT_URI = 'https://now-playing-app.github.io/'
const SCOPES = ['user-read-currently-playing', 'user-read-playback-state', 'user-read-private']

const SUPABASE_URL = 'https://upwzobcmgblvidpxtdsh.supabase.co'
const SUPABASE_KEY = 'sb_publishable__Iz48wErET83IgfemgX-jg_u3hZyGLM'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// PKCE用のランダム文字列生成
function generateRandomString(length: number) {
  let text = ''
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

// Code Challenge生成
async function generateCodeChallenge(codeVerifier: string) {
  const data = new TextEncoder().encode(codeVerifier)
  const digest = await window.crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export default function App() {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [track, setTrack] = useState<any>(null)
  const [isGhostMode, setIsGhostMode] = useState(false)
  const [friendsStatus, setFriendsStatus] = useState<any[]>([])

  // ログインのリターン（Authorization Code）処理
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')

    if (code) {
      const codeVerifier = localStorage.getItem('code_verifier')
      if (codeVerifier) {
        fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: REDIRECT_URI,
            code_verifier: codeVerifier,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.access_token) {
              setToken(data.access_token)
              window.history.replaceState({}, document.title, window.location.pathname)
            }
          })
          .catch((err) => console.error(err))
      }
    }
  }, [])

  // ユーザー情報の取得
  useEffect(() => {
    if (!token) return
    fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.id) {
          setUser(data)
          const urlParams = new URLSearchParams(window.location.search)
          const refUser = urlParams.get('ref')
          if (refUser && refUser !== data.id) {
            addFriend(data.id, refUser)
          }
        }
      })
      .catch((err) => console.error(err))
  }, [token])

  const addFriend = async (myId: string, friendId: string) => {
    try {
      await supabase.from('friendships').upsert([{ user_id: myId, friend_id: friendId }])
      await supabase.from('friendships').upsert([{ user_id: friendId, friend_id: myId }])
      fetchFriendsStatus(myId)
    } catch (e) {
      console.error(e)
    }
  }

  const fetchCurrentlyPlaying = async () => {
    if (!token || !user) return

    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: `Bearer ${token}` },
      })

      let currentTrack = null
      if (res.status === 200) {
        const data = await res.json()
        currentTrack = data.item
      }
      setTrack(currentTrack)

      await supabase.from('user_status').upsert({
        id: user.id,
        display_name: user.display_name || user.id,
        avatar_url: user.images?.[0]?.url || '',
        track_name: isGhostMode ? null : currentTrack?.name || null,
        artist_name: isGhostMode ? null : currentTrack?.artists?.map((a: any) => a.name).join(', ') || null,
        album_cover: isGhostMode ? null : currentTrack?.album?.images?.[0]?.url || null,
        is_ghost: isGhostMode,
        updated_at: new Date().toISOString(),
      })
    } catch (err) {
      console.error(err)
    }
  }

  const fetchFriendsStatus = async (myId: string) => {
    try {
      const { data: friendData } = await supabase.from('friendships').select('friend_id').eq('user_id', myId)
      if (!friendData || friendData.length === 0) return

      const friendIds = friendData.map((f) => f.friend_id)
      const { data: statusData } = await supabase.from('user_status').select('*').in('id', friendIds)
      if (statusData) setFriendsStatus(statusData)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (token && user) {
      fetchCurrentlyPlaying()
      fetchFriendsStatus(user.id)

      const interval = setInterval(() => {
        fetchCurrentlyPlaying()
        fetchFriendsStatus(user.id)
      }, 5000)

      return () => clearInterval(interval)
    }
  }, [token, user, isGhostMode])

  // ログイン処理（PKCE対応）
  const handleLogin = async () => {
    const codeVerifier = generateRandomString(128)
    const codeChallenge = await generateCodeChallenge(codeVerifier)
    localStorage.setItem('code_verifier', codeVerifier)

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: SCOPES.join(' '),
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
    })

    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`
  }

  const shareUrl = user ? `${window.location.origin}${window.location.pathname}?ref=${user.id}` : ''

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
      <h1>Music Share</h1>

      {!token ? (
        <button onClick={handleLogin} style={{ padding: '12px 24px', fontSize: '16px', borderRadius: '20px', background: '#1DB954', color: '#fff', border: 'none', cursor: 'pointer' }}>
          Spotifyでログイン
        </button>
      ) : (
        <div>
          <div style={{ border: '1px solid #ddd', borderRadius: '12px', padding: '16px', marginBottom: '20px', background: '#f9f9f9' }}>
            <h3>自分の再生状況</h3>
            <label style={{ fontSize: '16px', cursor: 'pointer', display: 'block', marginBottom: '12px' }}>
              <input
                type="checkbox"
                checked={isGhostMode}
                onChange={(e) => setIsGhostMode(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              👻 ゴーストモード（共有オフ）
            </label>

            {isGhostMode ? (
              <p style={{ color: '#888' }}>共有を一時停止中</p>
            ) : track ? (
              <div>
                <img src={track.album?.images?.[0]?.url} alt="cover" style={{ width: '120px', borderRadius: '8px' }} />
                <h4>{track.name}</h4>
                <p style={{ color: '#666', fontSize: '14px' }}>{track.artists?.map((a: any) => a.name).join(', ')}</p>
              </div>
            ) : (
              <p style={{ color: '#888' }}>曲を再生していません</p>
            )}
          </div>

          <div style={{ border: '1px dashed #aaa', borderRadius: '12px', padding: '12px', marginBottom: '20px' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>友達を招待する URL</p>
            <input type="text" readOnly value={shareUrl} style={{ width: '90%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>

          <div style={{ textAlign: 'left' }}>
            <h3>友達の Now Playing</h3>
            {friendsStatus.length === 0 ? (
              <p style={{ color: '#888', fontSize: '14px' }}>まだ友達が追加されていないか、友達が曲を再生していません。</p>
            ) : (
              friendsStatus.map((friend) => (
                <div key={friend.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #eee', padding: '12px 0' }}>
                  <img src={friend.album_cover || friend.avatar_url || 'https://via.placeholder.com/50'} alt="cover" style={{ width: '50px', height: '50px', borderRadius: '6px', objectFit: 'cover' }} />
                  <div>
                    <strong style={{ fontSize: '14px' }}>{friend.display_name}</strong>
                    {friend.is_ghost || !friend.track_name ? (
                      <p style={{ margin: '4px 0 0 0', color: '#888', fontSize: '13px' }}>👻 共有オフ または 停止中</p>
                    ) : (
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>🎵 {friend.track_name} - {friend.artist_name}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}