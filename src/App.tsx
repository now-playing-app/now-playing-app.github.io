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

  // プロフィール＆プラン
  const [bio, setBio] = useState('')
  const [statusMsg, setStatusMsg] = useState('')
  const [pinnedTrack, setPinnedTrack] = useState('')
  const [isPremium, setIsPremium] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'neon' | 'cyber'>('dark')

  // リアクション & ログ
  const [reactions, setReactions] = useState<any[]>([])
  const [reactionLogs, setReactionLogs] = useState<any[]>([])

  // グループ
  const [groups, setGroups] = useState<any[]>([])
  const [newGroupName, setNewGroupName] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [groupMembers, setGroupMembers] = useState<any[]>([])

  // モーダル（ダイアログ）表示管理
  const [activeModal, setActiveModal] = useState<'terms' | 'privacy' | 'api' | null>(null)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const ref = urlParams.get('ref')
    if (ref) localStorage.setItem('pending_ref', ref)
  }, [])

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
          .catch((err) => console.error(err))
      }
    }
  }, [])

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
          fetchReactions(data.id)
        }
      } catch (err) {
        console.error(err)
      }
    }

    fetchProfile()
  }, [token])

  const addFriend = async (myId: string, friendId: string) => {
    try {
      await supabase.from('friendships').insert([{ user_id: myId, friend_id: friendId }])
      await supabase.from('friendships').insert([{ user_id: friendId, friend_id: myId }])
      fetchFriendsStatus(myId)
    } catch (e) {
      fetchFriendsStatus(myId)
    }
  }

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
          pinned_track: isPremium ? pinnedTrack : null,
          is_premium: isPremium,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
    } catch (err) {
      console.error(err)
    }
  }

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
      console.error(e)
    }
  }

  const fetchReactions = async (myId: string) => {
    const { data } = await supabase.from('reactions').select('*').eq('to_user_id', myId).order('created_at', { ascending: false })
    if (data) {
      setReactionLogs(data)
      const counts: { [key: string]: number } = {}
      data.forEach((r) => {
        counts[r.emoji] = (counts[r.emoji] || 0) + 1
      })
      setReactions(Object.entries(counts).map(([emoji, count]) => ({ emoji, count })))
    }
  }

  const sendReaction = async (toUserId: string, emoji: string) => {
    if (!user) return
    await supabase.from('reactions').insert([{ from_user_id: user.id, to_user_id: toUserId, emoji }])
    alert(`${emoji} リアクションを送りました！`)
  }

  const fetchGroups = async (myId: string) => {
    const { data: myGroupMembers } = await supabase.from('group_members').select('group_id').eq('user_id', myId)
    if (myGroupMembers && myGroupMembers.length > 0) {
      const groupIds = myGroupMembers.map((g) => g.group_id)
      const { data: groupList } = await supabase.from('groups').select('*').in('id', groupIds)
      if (groupList) setGroups(groupList)
    }
  }

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !user) return
    const { data: group } = await supabase.from('groups').insert([{ name: newGroupName, owner_id: user.id }]).select().single()
    if (group) {
      await supabase.from('group_members').insert([{ group_id: group.id, user_id: user.id }])
      setNewGroupName('')
      fetchGroups(user.id)
    }
  }

  const loadGroupMembers = async (groupId: string) => {
    setSelectedGroup(groupId)
    const { data: members } = await supabase.from('group_members').select('user_id').eq('group_id', groupId)
    if (members) {
      const userIds = members.map((m) => m.user_id)
      const { data: statuses } = await supabase.from('user_status').select('*').in('id', userIds)
      if (statuses) setGroupMembers(statuses)
    }
  }

  useEffect(() => {
    if (token && user) {
      fetchCurrentlyPlaying()
      fetchFriendsStatus(user.id)
      fetchReactions(user.id)

      const interval = setInterval(() => {
        fetchCurrentlyPlaying()
        fetchFriendsStatus(user.id)
        fetchReactions(user.id)
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

  const getThemeStyle = () => {
    if (!isPremium) return { bg: '#121212', card: '#181818', border: '#282828', accent: '#1DB954', color: '#ffffff' }
    if (theme === 'neon') return { bg: '#0b031a', card: '#160933', border: '#ff007f', accent: '#ff007f', color: '#00f6ff' }
    if (theme === 'cyber') return { bg: '#000000', card: '#0d0d0d', border: '#00ff66', accent: '#00ff66', color: '#ffffff' }
    return { bg: '#121212', card: '#181818', border: '#282828', accent: '#1DB954', color: '#ffffff' }
  }

  const activeTheme = getThemeStyle()

  return (
    <div style={{ background: activeTheme.bg, color: activeTheme.color, minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* ヘッダー */}
      <header style={{ padding: '16px 24px', borderBottom: `1px solid ${activeTheme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>🎵 Music Share</h1>
        {token && (
          <button onClick={handleLogout} style={{ background: '#333', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
            ログアウト
          </button>
        )}
      </header>

      {/* メインコンテンツ */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        {!token ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <h2 style={{ fontSize: '28px', marginBottom: '12px' }}>音楽でつながるリアルタイム共有</h2>
            <p style={{ color: '#aaa', marginBottom: '24px' }}>今Spotifyで聴いている曲を友達と自動でリアルタイムシェアしよう！</p>
            <button onClick={handleLogin} style={{ background: activeTheme.accent, color: '#fff', border: 'none', padding: '14px 28px', borderRadius: '30px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
              Spotifyでログインして始める
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* 左カラム：自分の状況・プロフィール */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* 再生状況 */}
              <div style={{ background: activeTheme.card, border: `1px solid ${activeTheme.border}`, borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>自分の再生状況</h3>
                <label style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', marginBottom: '16px' }}>
                  <input type="checkbox" checked={isGhostMode} onChange={(e) => setIsGhostMode(e.target.checked)} />
                  👻 ゴーストモード（再生曲を非公開）
                </label>

                {isGhostMode ? (
                  <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>共有をオフにしています</p>
                ) : track ? (
                  <div style={{ textAlign: 'center' }}>
                    <img src={track.album?.images?.[0]?.url} alt="cover" style={{ width: '160px', height: '160px', borderRadius: '8px', objectFit: 'cover', marginBottom: '12px' }} />
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>{track.name}</h4>
                    <p style={{ margin: '0 0 12px 0', color: '#aaa', fontSize: '14px' }}>{track.artists?.map((a: any) => a.name).join(', ')}</p>
                    <a href={track.external_urls?.spotify} target="_blank" rel="noreferrer" style={{ color: activeTheme.accent, fontSize: '12px', textDecoration: 'none' }}>Spotifyで開く 🎧</a>
                  </div>
                ) : (
                  <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>曲を再生していません</p>
                )}
              </div>

              {/* プロフィール編集 */}
              <div style={{ background: activeTheme.card, border: `1px solid ${activeTheme.border}`, borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>プロフィール設定</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '4px' }}>一言ステータス</label>
                    <input type="text" value={statusMsg} onChange={(e) => setStatusMsg(e.target.value)} placeholder="例: 作業中..." style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #333', background: '#111', color: '#fff', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '4px' }}>自己紹介</label>
                    <input type="text" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="好きなジャンルなど" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #333', background: '#111', color: '#fff', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '4px' }}>📌 推し曲ピン留め（VIP限定）</label>
                    <input type="text" disabled={!isPremium} value={pinnedTrack} onChange={(e) => setPinnedTrack(e.target.value)} placeholder={isPremium ? '曲名 - アーティスト' : 'VIP会員のみ利用可能'} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #333', background: '#111', color: '#fff', opacity: isPremium ? 1 : 0.5, boxSizing: 'border-box' }} />
                  </div>
                </div>
              </div>

              {/* リアクションログ表示 */}
              <div style={{ background: activeTheme.card, border: `1px solid ${activeTheme.border}`, borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>届いたリアクション</h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  {reactions.length === 0 ? <p style={{ fontSize: '13px', color: '#888' }}>まだリアクションはありません</p> : reactions.map((r) => (
                    <span key={r.emoji} style={{ background: '#222', border: '1px solid #444', padding: '4px 8px', borderRadius: '12px', fontSize: '13px' }}>
                      {r.emoji} {r.count}
                    </span>
                  ))}
                </div>
                <div style={{ maxHeight: '120px', overflowY: 'auto', borderTop: '1px solid #333', paddingTop: '8px' }}>
                  {reactionLogs.slice(0, 5).map((log, i) => (
                    <div key={i} style={{ fontSize: '11px', color: '#aaa', marginBottom: '4px' }}>
                      {new Date(log.created_at).toLocaleTimeString()} に {log.emoji} が届きました
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 右カラム：フレンド・グループ・設定 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* 招待リンク */}
              <div style={{ background: activeTheme.card, border: `1px dashed ${activeTheme.border}`, borderRadius: '12px', padding: '16px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>友達を招待するリンク</p>
                <input type="text" readOnly value={shareUrl} onClick={(e) => (e.target as HTMLInputElement).select()} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #333', background: '#111', color: '#fff', textAlign: 'center', fontSize: '12px', boxSizing: 'border-box' }} />
              </div>

              {/* プレミアムプラン機能 */}
              <div style={{ background: activeTheme.card, border: `1px solid ${activeTheme.border}`, borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '15px' }}>VIP Premium 設定</h3>
                  <button onClick={() => setIsPremium(!isPremium)} style={{ background: isPremium ? 'gold' : '#333', color: isPremium ? '#000' : '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                    {isPremium ? 'VIP有効中' : 'VIP体験切り替え'}
                  </button>
                </div>
                {isPremium ? (
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                    <button onClick={() => setTheme('dark')} style={{ padding: '4px 8px', fontSize: '12px' }}>Dark</button>
                    <button onClick={() => setTheme('neon')} style={{ padding: '4px 8px', fontSize: '12px' }}>Neon</button>
                    <button onClick={() => setTheme('cyber')} style={{ padding: '4px 8px', fontSize: '12px' }}>Cyber</button>
                  </div>
                ) : (
                  <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#888' }}>VIPになると推し曲ピン留め・テーマカラー変更が利用可能になります。</p>
                )}
              </div>

              {/* グループ機能 */}
              <div style={{ background: activeTheme.card, border: `1px solid ${activeTheme.border}`, borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>👥 グループ機能</h3>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="新しいグループ名" style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #333', background: '#111', color: '#fff', fontSize: '13px' }} />
                  <button onClick={handleCreateGroup} style={{ background: activeTheme.accent, color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 12px', cursor: 'pointer', fontSize: '13px' }}>作成</button>
                </div>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                  {groups.map((g) => (
                    <button key={g.id} onClick={() => loadGroupMembers(g.id)} style={{ padding: '6px 12px', borderRadius: '16px', border: '1px solid #444', background: selectedGroup === g.id ? activeTheme.accent : '#222', color: '#fff', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {g.name}
                    </button>
                  ))}
                </div>
                {selectedGroup && (
                  <div style={{ marginTop: '12px', borderTop: '1px solid #333', paddingTop: '8px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 6px 0' }}>メンバーの状況:</p>
                    {groupMembers.map((m) => (
                      <div key={m.id} style={{ fontSize: '12px', marginBottom: '4px', color: m.track_name ? activeTheme.accent : '#888' }}>
                        {m.display_name}: {m.track_name ? `🎵 ${m.track_name}` : '停止中'}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 友達の Now Playing 一覧 */}
              <div style={{ background: activeTheme.card, border: `1px solid ${activeTheme.border}`, borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>友達の Now Playing</h3>
                {friendsStatus.length === 0 ? (
                  <p style={{ color: '#888', fontSize: '13px' }}>招待リンクから友達を追加してください。</p>
                ) : (
                  friendsStatus.map((friend) => (
                    <div key={friend.id} style={{ borderBottom: '1px solid #222', paddingBottom: '12px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <img src={friend.album_cover || friend.avatar_url || 'https://via.placeholder.com/48'} alt="cover" style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ fontSize: '14px' }}>{friend.display_name}</strong>
                            {friend.is_premium && <span style={{ fontSize: '10px', background: 'gold', color: '#000', padding: '1px 4px', borderRadius: '4px', fontWeight: 'bold' }}>VIP</span>}
                          </div>
                          {friend.status_message && <p style={{ margin: '2px 0', fontSize: '11px', color: '#ffd700' }}>💬 {friend.status_message}</p>}
                          {friend.is_ghost || !friend.track_name ? (
                            <p style={{ margin: '2px 0 0 0', color: '#888', fontSize: '12px' }}>👻 非公開 または 停止中</p>
                          ) : (
                            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: activeTheme.accent }}>🎵 {friend.track_name} - {friend.artist_name}</p>
                          )}
                          {friend.pinned_track && <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#aaa' }}>📌 推し曲: {friend.pinned_track}</p>}
                        </div>
                      </div>
                      <div style={{ marginTop: '8px', display: 'flex', gap: '6px', paddingLeft: '60px' }}>
                        {['❤️', '🔥', '🎵', '👏'].map((emoji) => (
                          <button key={emoji} onClick={() => sendReaction(friend.id, emoji)} style={{ background: '#222', border: '1px solid #333', borderRadius: '12px', padding: '2px 8px', cursor: 'pointer', fontSize: '12px' }}>
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* フッター（利用規約・プライバシーポリシー・API説明） */}
      <footer style={{ marginTop: '40px', padding: '20px', borderTop: `1px solid ${activeTheme.border}`, textAlign: 'center', fontSize: '12px', color: '#888' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '8px' }}>
          <button onClick={() => setActiveModal('terms')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '12px' }}>利用規約</button>
          <button onClick={() => setActiveModal('privacy')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '12px' }}>プライバシーポリシー</button>
          <button onClick={() => setActiveModal('api')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '12px' }}>Spotify APIについて</button>
        </div>
        <p style={{ margin: 0 }}>© 2026 Music Share App</p>
      </footer>

      {/* モーダル表示 */}
      {activeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#1e1e1e', color: '#fff', padding: '24px', borderRadius: '12px', maxWidth: '500px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
            {activeModal === 'terms' && (
              <div>
                <h3>利用規約</h3>
                <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#ccc' }}>
                  本サービスは、ユーザー間の音楽再生状況共有を目的としています。公序良俗に反する利用や、他者への嫌がらせ目的でのリアクション送信を禁止します。違反が確認された場合、アクセスを制限することがあります。
                </p>
              </div>
            )}
            {activeModal === 'privacy' && (
              <div>
                <h3>プライバシーポリシー</h3>
                <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#ccc' }}>
                  当アプリは、Spotify Web APIを利用して「現在再生中の曲情報」および「公開プロフィール情報」のみを取得します。取得したデータはフレンド間での共有目的にのみ使用し、第三者への提供や不要な保存は行いません。
                </p>
              </div>
            )}
            {activeModal === 'api' && (
              <div>
                <h3>Spotify APIの連携仕様</h3>
                <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#ccc' }}>
                  本アプリはSpotify Developer APIと連携しています。認証にはOAuth 2.0 PKCEフローを採用し、パスワード等の機密情報は保存しません。ゴーストモードを有効にすることで、いつでも再生情報の共有を停止できます。
                </p>
              </div>
            )}
            <button onClick={() => setActiveModal(null)} style={{ marginTop: '16px', background: activeTheme.accent, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', width: '100%' }}>
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  )
}