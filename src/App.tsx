import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const CLIENT_ID = '09ff71b7dfe043128dd49071e8096124'
const REDIRECT_URI = 'https://now-playing-app.github.io/'
const SCOPES = ['user-read-currently-playing', 'user-read-playback-state', 'user-read-private']

const SUPABASE_URL = 'https://upwzobcmgblvidpxtdsh.supabase.co'
const SUPABASE_KEY = 'sb_publishable__Iz48wErET83IgfemgX-jg_u3hZyGLM'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function generateRandomString(length: number) {
  let text = ''
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

async function generateCodeChallenge(codeVerifier: string) {
  const data = new TextEncoder().encode(codeVerifier)
  const digest = await window.crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('spotify_token'))
  const [user, setUser] = useState<any>(null)
  const [track, setTrack] = useState<any>(null)
  const [isGhostMode, setIsGhostMode] = useState(false)
  const [friendsStatus, setFriendsStatus] = useState<any[]>([])

  // 1. 初回アクセス時に招待コード(?ref=)があればローカルに保存
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const ref = urlParams.get('ref')
    if (ref) {
      localStorage.setItem('pending_ref', ref)
    }
  }, [])

  // 2. Spotifyからの戻り処理 (Authorization Code から Access Token を取得)
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
              localStorage.setItem('spotify_token', data.access_token)
              window.history.replaceState({}, document.title, window.location.pathname)
            }
          })
          .catch((err) => console.error('Token fetch error:', err))
      }
    }
  }, [])

  // 3. ユーザー情報の取得 & 招待コードがあれば自動で相互フレンド追加
  useEffect(() => {
    if (!token) return
    fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) {
          handleLogout()
          return null
        }
        return res.json()
      })
      .then((data) => {
        if (data && data.id) {
          setUser(data)

          // 招待コード(ref)が残っていれば相互フレンドに登録
          const pendingRef = localStorage.getItem('pending_ref')
          if (pendingRef && pendingRef !== data.id) {
            addFriend(data.id, pendingRef)
            localStorage.removeItem('pending_ref')
          } else {
            fetchFriendsStatus(data.id)
          }
        }
      })
      .catch((err) => console.error('Spotify user fetch error:', err))
  }, [token])

  // フレンド双方向登録 (insert で安全に追加)
  const addFriend = async (myId: string, friendId: string) => {
    try {
      await supabase.from('friendships').insert([{ user_id: myId, friend_id: friendId }])
      await supabase.from('friendships').insert([{ user_id: friendId, friend_id: myId }])
      fetchFriendsStatus(myId)
    } catch (e) {
      console.log('フレンド登録済、またはエラー:', e)
      fetchFriendsStatus(myId)
    }
  }

  // 自分の再生状況を取得し Supabase を更新
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

      await supabase.from('user_status').upsert(
        {
          id: user.id,
          display_name: user.display_name || user.id,
          avatar_url: user.images?.[0]?.url || '',
          track_name: isGhostMode ? null : currentTrack?.name || null,
          artist_name: isGhostMode ? null : currentTrack?.artists?.map((a: any) => a.name).join(', ') || null,
          album_cover: isGhostMode ? null : currentTrack?.album?.images?.[0]?.url || null,
          is_ghost: isGhostMode,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
    } catch (err) {
      console.error('Track fetch error:', err)
    }
  }

  // フレンドの再生状況を取得
  const fetchFriendsStatus = async (myId: string) => {
    try {
      const { data: friendData } = await supabase.from('friendships').select('friend_id').eq('user_id', myId)
      if (!friendData || friendData.length === 0) {
        setFriendsStatus([])
        return
      }

      const friendIds = friendData.map((f) => f.friend_id)
      const { data: statusData } = await supabase.from('user_status').select('*').in('id', friendIds)
      if (statusData) setFriendsStatus(statusData)
    } catch (e) {
      console.error('Friends status fetch error:', e)
    }
  }

  // 3秒ごとの定期自動更新
  useEffect(() => {
    if (token && user) {
      fetchCurrentlyPlaying()
      fetchFriendsStatus(user.id)

      const interval = setInterval(() => {
        fetchCurrentlyPlaying()
        fetchFriendsStatus(user.id)
      }, 3000)

      return () => clearInterval(interval)
    }
  }, [token, user, isGhostMode])

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

  const handleLogout = () => {
    localStorage.removeItem('spotify_token')
    localStorage.removeItem('pending_ref')
    setToken(null)
    setUser(null)
  }

  const shareUrl = user ? `${window.location.origin}${window.location.pathname}?ref=${user.id}` : ''

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '500px', margin: '0 auto', textAlign: 'center', color: '#fff' }}>
      <h1>Music Share</h1>

      {!token ? (
        <button
          onClick={handleLogin}
          style={{ padding: '12px 24px', fontSize: '16px', borderRadius: '20px', background: '#1DB954', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Spotifyでログイン
        </button>
      ) : (
        <div>
          <div style={{ border: '1px solid #444', borderRadius: '12px', padding: '16px', marginBottom: '20px', background: '#222' }}>
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
              <p style={{ color: '#aaa' }}>共有を一時停止中</p>
            ) : track ? (
              <div>
                <img src={track.album?.images?.[0]?.url} alt="cover" style={{ width: '120px', borderRadius: '8px', marginBottom: '8px' }} />
                <h4 style={{ margin: '8px 0 4px 0' }}>{track.name}</h4>
                <p style={{ color: '#aaa', fontSize: '14px', margin: 0 }}>{track.artists?.map((a: any) => a.name).join(', ')}</p>
              </div>
            ) : (
              <p style={{ color: '#aaa' }}>曲を再生していません</p>
            )}
          </div>

          <div style={{ border: '1px dashed #666', borderRadius: '12px', padding: '12px', marginBottom: '20px' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>友達を招待する URL</p>
            <input
              type="text"
              readOnly
              value={shareUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              style={{ width: '90%', padding: '8px', borderRadius: '6px', border: '1px solid #444', background: '#111', color: '#fff', textAlign: 'center' }}
            />
          </div>

          <div style={{ textAlign: 'left', marginBottom: '20px' }}>
            <h3>友達の Now Playing</h3>
            {friendsStatus.length === 0 ? (
              <p style={{ color: '#aaa', fontSize: '14px' }}>まだ友達が追加されていないか、友達が曲を再生していません。</p>
            ) : (
              friendsStatus.map((friend) => (
                <div key={friend.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #333', padding: '12px 0' }}>
                  <img
                    src={friend.album_cover || friend.avatar_url || 'https://via.placeholder.com/50'}
                    alt="cover"
                    style={{ width: '50px', height: '50px', borderRadius: '6px', objectFit: 'cover' }}
                  />
                  <div>
                    <strong style={{ fontSize: '14px' }}>{friend.display_name}</strong>
                    {friend.is_ghost || !friend.track_name ? (
                      <p style={{ margin: '4px 0 0 0', color: '#aaa', fontSize: '13px' }}>👻 共有オフ または 停止中</p>
                    ) : (
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#1DB954' }}>🎵 {friend.track_name} - {friend.artist_name}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            onClick={handleLogout}
            style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '12px', background: '#444', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            ログアウト
          </button>
        </div>
      )}
    </div>
  )
}