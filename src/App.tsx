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

  // 拡張機能用の状態
  const [bio, setBio] = useState('')
  const [statusMsg, setStatusMsg] = useState('')
  const [pinnedTrack, setPinnedTrack] = useState('')
  const [isPremium, setIsPremium] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'neon' | 'cyber'>('dark')

  // グループ機能用の状態
  const [groups, setGroups] = useState<any[]>([])
  const [newGroupName, setNewGroupName] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [groupMembers, setGroupMembers] = useState<any[]>([])

  // 1. 初回アクセス時に招待コード(?ref=)があれば保存
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const ref = urlParams.get('ref')
    if (ref) localStorage.setItem('pending_ref', ref)
  }, [])

  // 2. Spotify OAuth認証処理
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

  // 3. ユーザープロフィール＆フレンド情報取得
  useEffect(() => {
    if (!token) return

    const fetchProfile = async () => {
      try {
        const res = await fetch('https://api.spotify.com/v1/me', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.status === 401) {
          handleLogout()
          return
        }

        const data = await res.json()
        if (data && data.id) {
          setUser(data)

          // Supabaseから追加プロフィールを取得
          const { data: dbUser } = await supabase.from('user_status').select('*').eq('id', data.id).single()
          if (dbUser) {
            setBio(dbUser.bio || '')
            setStatusMsg(dbUser.status_message || '')
            setPinnedTrack(dbUser.pinned_track || '')
            setIsPremium(dbUser.is_premium || false)
          }

          const pendingRef = localStorage.getItem('pending_ref')
          if (pendingRef && pendingRef !== data.id) {
            await addFriend(data.id, pendingRef)
            localStorage.removeItem('pending_ref')
          } else {
            fetchFriendsStatus(data.id)
          }
          fetchGroups(data.id)
        }
      } catch (err) {
        console.error('Spotify user fetch error:', err)
      }
    }

    fetchProfile()
  }, [token])

  // フレンド追加
  const addFriend = async (myId: string, friendId: string) => {
    try {
      await supabase.from('friendships').insert([{ user_id: myId, friend_id: friendId }])
      await supabase.from('friendships').insert([{ user_id: friendId, friend_id: myId }])
      fetchFriendsStatus(myId)
    } catch (e) {
      fetchFriendsStatus(myId)
    }
  }

  // 再生中トラックの更新 & DB書き込み
  const fetchCurrentlyPlaying = async () => {
    if (!token || !user) return

    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.status === 401) {
        handleLogout()
        return
      }

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
          bio: bio,
          status_message: statusMsg,
          pinned_track: pinnedTrack,
          is_premium: isPremium,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
    } catch (err) {
      console.error('Track fetch error:', err)
    }
  }

  // フレンドステータス取得
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

  // グループ取得
  const fetchGroups = async (myId: string) => {
    const { data: myGroupMembers } = await supabase.from('group_members').select('group_id').eq('user_id', myId)
    if (myGroupMembers && myGroupMembers.length > 0) {
      const groupIds = myGroupMembers.map((g) => g.group_id)
      const { data: groupList } = await supabase.from('groups').select('*').in('id', groupIds)
      if (groupList) setGroups(groupList)
    }
  }

  // グループ作成
  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !user) return
    const { data: group } = await supabase.from('groups').insert([{ name: newGroupName, owner_id: user.id }]).select().single()
    if (group) {
      await supabase.from('group_members').insert([{ group_id: group.id, user_id: user.id }])
      setNewGroupName('')
      fetchGroups(user.id)
    }
  }

  // グループメンバー再生状況取得
  const loadGroupMembers = async (groupId: string) => {
    setSelectedGroup(groupId)
    const { data: members } = await supabase.from('group_members').select('user_id').eq('group_id', groupId)
    if (members) {
      const userIds = members.map((m) => m.user_id)
      const { data: statuses } = await supabase.from('user_status').select('*').in('id', userIds)
      if (statuses) setGroupMembers(statuses)
    }
  }

  // リアクション送信
  const sendReaction = async (toUserId: string, emoji: string) => {
    if (!user) return
    await supabase.from('reactions').insert([{ from_user_id: user.id, to_user_id: toUserId, emoji }])
    alert(`${emoji} リアクションを送りました！`)
  }

  // 3秒ごとの自動更新
  useEffect(() => {
    if (token && user) {
      fetchCurrentlyPlaying()
      fetchFriendsStatus(user.id)

      const interval = setInterval(() => {
        fetchCurrentlyPlaying()
        fetchFriendsStatus(user.id)
        if (selectedGroup) loadGroupMembers(selectedGroup)
      }, 3000)

      return () => clearInterval(interval)
    }
  }, [token, user, isGhostMode, bio, statusMsg, pinnedTrack, isPremium, selectedGroup])

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
    localStorage.removeItem('code_verifier')
    setToken(null)
    setUser(null)
  }

  const shareUrl = user ? `${window.location.origin}${window.location.pathname}?ref=${user.id}` : ''

  // テーマ切り替え用スタイル
  const getThemeStyle = () => {
    if (theme === 'neon') return { bg: '#0d0221', card: '#241442', accent: '#ff007f', color: '#00f6ff' }
    if (theme === 'cyber') return { bg: '#050505', card: '#121212', accent: '#00ff66', color: '#ffffff' }
    return { bg: '#121212', card: '#222222', accent: '#1DB954', color: '#ffffff' }
  }

  const currentTheme = getThemeStyle()

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '500px', margin: '0 auto', textAlign: 'center', background: currentTheme.bg, color: currentTheme.color, minHeight: '100vh' }}>
      <h1>Music Share {isPremium && <span style={{ fontSize: '12px', background: 'gold', color: '#000', padding: '2px 8px', borderRadius: '10px' }}>VIP PREMIUM</span>}</h1>

      {!token ? (
        <button
          onClick={handleLogin}
          style={{ padding: '12px 24px', fontSize: '16px', borderRadius: '20px', background: currentTheme.accent, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Spotifyでログイン
        </button>
      ) : (
        <div>
          {/* テーマ・Premium設定 */}
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
            <button onClick={() => setTheme('dark')} style={{ padding: '4px 8px' }}>Dark</button>
            <button onClick={() => setTheme('neon')} style={{ padding: '4px 8px' }}>Neon</button>
            <button onClick={() => setTheme('cyber')} style={{ padding: '4px 8px' }}>Cyber</button>
            <button onClick={() => setIsPremium(!isPremium)} style={{ padding: '4px 8px', background: 'gold', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              {isPremium ? '有料プラン中' : '有料プラン体験'}
            </button>
          </div>

          {/* 自分の再生状況 */}
          <div style={{ border: `1px solid ${currentTheme.accent}`, borderRadius: '12px', padding: '16px', marginBottom: '20px', background: currentTheme.card }}>
            <h3>自分の再生状況</h3>
            <label style={{ fontSize: '14px', cursor: 'pointer', display: 'block', marginBottom: '12px' }}>
              <input type="checkbox" checked={isGhostMode} onChange={(e) => setIsGhostMode(e.target.checked)} style={{ marginRight: '8px' }} />
              👻 ゴーストモード（共有オフ）
            </label>

            {isGhostMode ? (
              <p style={{ color: '#aaa' }}>共有を一時停止中</p>
            ) : track ? (
              <div>
                <img src={track.album?.images?.[0]?.url} alt="cover" style={{ width: '120px', borderRadius: '8px', marginBottom: '8px' }} />
                <h4 style={{ margin: '8px 0 4px 0' }}>{track.name}</h4>
                <p style={{ color: '#aaa', fontSize: '14px', margin: '0 0 8px 0' }}>{track.artists?.map((a: any) => a.name).join(', ')}</p>
                <a href={track.external_urls?.spotify} target="_blank" rel="noreferrer" style={{ color: currentTheme.accent, fontSize: '12px' }}>Spotifyアプリで開く 🎧</a>
              </div>
            ) : (
              <p style={{ color: '#aaa' }}>曲を再生していません</p>
            )}

            {/* プロフィール編集領域 */}
            <div style={{ marginTop: '16px', borderTop: '1px solid #444', paddingTop: '12px', textAlign: 'left' }}>
              <p style={{ fontSize: '12px', margin: '4px 0' }}>一言ステータス:</p>
              <input type="text" value={statusMsg} onChange={(e) => setStatusMsg(e.target.value)} placeholder="例: 作業中..." style={{ width: '95%', padding: '4px', borderRadius: '4px', background: '#111', color: '#fff', border: '1px solid #444' }} />
              <p style={{ fontSize: '12px', margin: '8px 0 4px 0' }}>自己紹介 (Bio):</p>
              <input type="text" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="好きなジャンルなど" style={{ width: '95%', padding: '4px', borderRadius: '4px', background: '#111', color: '#fff', border: '1px solid #444' }} />
              <p style={{ fontSize: '12px', margin: '8px 0 4px 0' }}>イチオシ固定曲 (Pin):</p>
              <input type="text" value={pinnedTrack} onChange={(e) => setPinnedTrack(e.target.value)} placeholder="曲名 - アーティスト" style={{ width: '95%', padding: '4px', borderRadius: '4px', background: '#111', color: '#fff', border: '1px solid #444' }} />
            </div>
          </div>

          {/* 友達招待URL */}
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

          {/* グループ機能 */}
          <div style={{ border: '1px solid #444', borderRadius: '12px', padding: '12px', marginBottom: '20px', background: currentTheme.card, textAlign: 'left' }}>
            <h3>👥 グループ機能</h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="新グループ名" style={{ flex: 1, padding: '6px', borderRadius: '4px', background: '#111', color: '#fff', border: '1px solid #444' }} />
              <button onClick={handleCreateGroup} style={{ background: currentTheme.accent, color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer' }}>作成</button>
            </div>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
              {groups.map((g) => (
                <button key={g.id} onClick={() => loadGroupMembers(g.id)} style={{ padding: '6px 12px', borderRadius: '16px', border: '1px solid #666', background: selectedGroup === g.id ? currentTheme.accent : '#333', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {g.name}
                </button>
              ))}
            </div>

            {selectedGroup && (
              <div style={{ marginTop: '12px', borderTop: '1px solid #444', paddingTop: '8px' }}>
                <p style={{ fontSize: '12px', fontWeight: 'bold' }}>グループメンバーのなうプレ:</p>
                {groupMembers.map((m) => (
                  <div key={m.id} style={{ fontSize: '13px', margin: '4px 0', color: m.track_name ? currentTheme.accent : '#aaa' }}>
                    {m.display_name}: {m.track_name ? `🎵 ${m.track_name} - ${m.artist_name}` : '停止中'}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 友達の Now Playing 一覧 */}
          <div style={{ textAlign: 'left', marginBottom: '20px' }}>
            <h3>友達の Now Playing</h3>
            {friendsStatus.length === 0 ? (
              <p style={{ color: '#aaa', fontSize: '14px' }}>まだ友達が追加されていないか、曲を再生していません。</p>
            ) : (
              friendsStatus.map((friend) => (
                <div key={friend.id} style={{ borderBottom: '1px solid #333', padding: '12px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img
                      src={friend.album_cover || friend.avatar_url || 'https://via.placeholder.com/50'}
                      alt="cover"
                      style={{ width: '50px', height: '50px', borderRadius: '6px', objectFit: 'cover' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ fontSize: '14px' }}>{friend.display_name}</strong>
                        {friend.is_premium && <span style={{ fontSize: '10px', background: 'gold', color: '#000', padding: '1px 4px', borderRadius: '4px' }}>VIP</span>}
                      </div>
                      {friend.status_message && <p style={{ margin: '2px 0', fontSize: '11px', color: '#ffd700' }}>💬 {friend.status_message}</p>}
                      {friend.is_ghost || !friend.track_name ? (
                        <p style={{ margin: '4px 0 0 0', color: '#aaa', fontSize: '13px' }}>👻 共有オフ または 停止中</p>
                      ) : (
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: currentTheme.accent }}>🎵 {friend.track_name} - {friend.artist_name}</p>
                      )}
                      {friend.pinned_track && <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#aaa' }}>📌 推し曲: {friend.pinned_track}</p>}
                    </div>
                  </div>

                  {/* リアクションボタン */}
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px', paddingLeft: '62px' }}>
                    {['❤️', '🔥', '🎵', '👏'].map((emoji) => (
                      <button key={emoji} onClick={() => sendReaction(friend.id, emoji)} style={{ background: '#333', border: 'none', borderRadius: '12px', padding: '2px 8px', cursor: 'pointer', fontSize: '12px' }}>
                        {emoji}
                      </button>
                    ))}
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