import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// --- 環境定数 ---
const CLIENT_ID = '09ff71b7dfe043128dd49071e8096124'
const REDIRECT_URI = 'https://now-playing-app.github.io/'
const SCOPES = ['user-read-currently-playing', 'user-read-playback-state', 'user-read-private', 'playlist-modify-public']

const SUPABASE_URL = 'https://upwzobcmgblvidpxtdsh.supabase.co'
const SUPABASE_KEY = 'sb_publishable__Iz48wErET83IgfemgX-jg_u3hZyGLM'

// 管理者権限を持つ特定のSpotifyアカウントID
const ADMIN_SPOTIFY_ID = 'Igfemg'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// --- 型定義 ---
interface Coupon {
  id: string
  code: string
  discount_rate: number
  max_uses: number
  created_at: string
}

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
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('spotify_token'))
  const [user, setUser] = useState<any>(null)
  const [track, setTrack] = useState<any>(null)
  const [isGhostMode, setIsGhostMode] = useState(false)
  const [friendsStatus, setFriendsStatus] = useState<any[]>([])

  // UI・ナビゲーション
  const [currentTab, setCurrentTab] = useState<'home' | 'mypage' | 'groups' | 'search' | 'chat' | 'stats' | 'settings' | 'admin'>('home')
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [highContrast, setHighContrast] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'neon' | 'cyber' | 'retro'>('dark')

  // プロフィール & サブスク
  const [bio, setBio] = useState('')
  const [statusMsg, setStatusMsg] = useState('')
  const [pinnedTrack, setPinnedTrack] = useState('')
  const [planType, setPlanType] = useState<'free' | 'standard' | 'pro' | 'family'>('free')
  const [selectedPlanForPurchase, setSelectedPlanForPurchase] = useState<'standard' | 'pro' | 'family'>('pro')
  const [trialStartedAt, setTrialStartedAt] = useState<string | null>(null)
  const [couponInput, setCouponInput] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0)

  // リアクション & 履歴 & お気に入り
  const [history, setHistory] = useState<any[]>([])
  const [favorites, setFavorites] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])

  // グループ & チャット
  const [groups, setGroups] = useState<any[]>([])
  const [newGroupName, setNewGroupName] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [groupMembers, setGroupMembers] = useState<any[]>([])
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [msgInput, setMsgInput] = useState('')

  // 管理者専用 state（クーポン機能）
  const [adminCoupons, setAdminCoupons] = useState<Coupon[]>([])
  const [newCouponCode, setNewCouponCode] = useState('')
  const [newCouponDiscount, setNewCouponDiscount] = useState<number>(10)
  const [newCouponMaxUses, setNewCouponMaxUses] = useState<number>(100)

  // モーダル・ポップアップ通知
  const [activeModal, setActiveModal] = useState<'terms' | 'privacy' | 'tokushoho' | 'vip' | 'api' | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [sleepTimer, setSleepTimer] = useState<number | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // PWA & キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyM') showToast('🎵 ショートカット: ミュート切り替え')
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // スリープタイマー処理
  useEffect(() => {
    if (sleepTimer === null || sleepTimer <= 0) return
    const timer = setTimeout(() => {
      setSleepTimer((prev) => {
        if (prev === null || prev <= 1) {
          showToast('⏰ スリープタイマー：時間が経過しました')
          return null
        }
        return prev - 1
      })
    }, 60000)
    return () => clearTimeout(timer)
  }, [sleepTimer])

  // 招待コードの取得
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const ref = urlParams.get('ref')
    const groupRef = urlParams.get('group_ref')
    if (ref) localStorage.setItem('pending_ref', ref)
    if (groupRef) localStorage.setItem('pending_group_ref', groupRef)
  }, [])

  // Spotify Auth Code処理
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
            code,
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
              showToast('ログインに成功しました！')
            }
          })
      }
    }
  }, [])

  const isTrialActive = () => {
    if (!trialStartedAt) return false
    const startDate = new Date(trialStartedAt).getTime()
    return (new Date().getTime() - startDate) / (1000 * 3600 * 24) <= 30
  }

  const isProMember = planType !== 'free' || isTrialActive()

  useEffect(() => {
    if (!token) return

    const fetchProfile = async () => {
      try {
        const res = await fetch('https://api.spotify.com/v1/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.status === 401) return handleLogout()

        const data = await res.json()
        if (data?.id) {
          setUser(data)

          const { data: dbUser } = await supabase.from('user_status').select('*').eq('id', data.id).single()
          if (dbUser) {
            setBio(dbUser.bio || '')
            setStatusMsg(dbUser.status_message || '')
            setPinnedTrack(dbUser.pinned_track || '')
            setPlanType(dbUser.plan_type || 'free')
            setTrialStartedAt(dbUser.trial_started_at || null)
            if (dbUser.font_size) setFontSize(dbUser.font_size)
          }

          const pendingRef = localStorage.getItem('pending_ref')
          if (pendingRef && pendingRef !== data.id) {
            await supabase.from('friendships').upsert([{ user_id: data.id, friend_id: pendingRef }, { user_id: pendingRef, friend_id: data.id }])
            localStorage.removeItem('pending_ref')
            if (!dbUser?.trial_started_at) {
              const nowIso = new Date().toISOString()
              setTrialStartedAt(nowIso)
              await supabase.from('user_status').update({ trial_started_at: nowIso, invited_by: pendingRef }).eq('id', data.id)
              showToast('🎁 友達招待特典：Proプラン1ヶ月体験が付与されました！')
            }
          }

          const pendingGroupRef = localStorage.getItem('pending_group_ref')
          if (pendingGroupRef) {
            await supabase.from('group_members').upsert({ group_id: pendingGroupRef, user_id: data.id })
            localStorage.removeItem('pending_group_ref')
            showToast('👥 招待されたグループに参加しました！')
          }

          fetchFriendsStatus(data.id)
          fetchGroups(data.id)

          // 管理者プロフィールの場合はクーポン一覧を取得
          if (data.id === ADMIN_SPOTIFY_ID) {
            fetchAdminCoupons()
          }
        }
      } catch (err) {
        console.error(err)
      }
    }

    fetchProfile()
  }, [token])

  const fetchCurrentlyPlaying = async () => {
    if (!token || !user) return
    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) return handleLogout()

      let currentTrack: any = null
      if (res.status === 200) {
        const data = await res.json()
        currentTrack = data.item
        if (currentTrack && (!history.length || history[0].id !== currentTrack.id)) {
          setHistory((prev) => [currentTrack, ...prev.slice(0, 19)])
        }
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
        bio,
        status_message: statusMsg,
        pinned_track: isProMember ? pinnedTrack : null,
        is_premium: isProMember,
        plan_type: planType,
        trial_started_at: trialStartedAt,
        font_size: fontSize,
        updated_at: new Date().toISOString(),
      })
    } catch (err) {
      console.error(err)
    }
  }

  const fetchFriendsStatus = async (myId: string) => {
    const { data: friendData } = await supabase.from('friendships').select('friend_id').eq('user_id', myId)
    if (friendData && friendData.length > 0) {
      const { data: statusData } = await supabase.from('user_status').select('*').in('id', friendData.map((f) => f.friend_id))
      if (statusData) setFriendsStatus(statusData)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery || !token) return
    const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (data?.tracks?.items) setSearchResults(data.tracks.items)
  }

  const fetchGroups = async (myId: string) => {
    const { data: myGroupMembers } = await supabase.from('group_members').select('group_id').eq('user_id', myId)
    if (myGroupMembers && myGroupMembers.length > 0) {
      const { data: groupList } = await supabase.from('groups').select('*').in('id', myGroupMembers.map((g) => g.group_id))
      if (groupList) setGroups(groupList)
    }
  }

  const fetchGroupDetails = async (groupId: string) => {
    setSelectedGroup(groupId)
    const { data: members } = await supabase.from('group_members').select('user_id').eq('group_id', groupId)
    if (members && members.length > 0) {
      const { data: users } = await supabase.from('user_status').select('*').in('id', members.map((m) => m.user_id))
      if (users) setGroupMembers(users)
    } else {
      setGroupMembers([])
    }

    const { data: messages } = await supabase.from('chat_messages').select('*').eq('group_id', groupId).order('created_at', { ascending: true })
    if (messages) setChatMessages(messages)
  }

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !user) return
    const { data: group } = await supabase.from('groups').insert([{ name: newGroupName, owner_id: user.id }]).select().single()
    if (group) {
      await supabase.from('group_members').insert([{ group_id: group.id, user_id: user.id }])
      setNewGroupName('')
      fetchGroups(user.id)
      fetchGroupDetails(group.id)
      showToast('グループを作成しました！')
    }
  }

  const handleSendMessage = async () => {
    if (!msgInput.trim() || !selectedGroup || !user) return
    const newMsg = {
      group_id: selectedGroup,
      user_id: user.id,
      user_name: user.display_name || user.id,
      message: msgInput,
      created_at: new Date().toISOString(),
    }
    await supabase.from('chat_messages').insert([newMsg])
    setChatMessages((prev) => [...prev, newMsg])
    setMsgInput('')
  }

  const handleSendReaction = (friendId: string, emoji: string) => {
    showToast(`${emoji} リアクションを送信しました！ (ID: ${friendId})`)
  }

  // --- クーポン関連処理 ---
  const fetchAdminCoupons = async () => {
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false })
    if (data) setAdminCoupons(data)
  }

  const handleCreateAdminCoupon = async () => {
    if (!newCouponCode.trim()) {
      showToast('⚠️ クーポンコードを入力してください')
      return
    }
    const couponObj = {
      code: newCouponCode.trim().toUpperCase(),
      discount_rate: newCouponDiscount,
      max_uses: newCouponMaxUses,
      created_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('coupons').insert([couponObj]).select().single()
    if (error) {
      showToast('❌ クーポン作成エラーが発生しました')
      console.error(error)
    } else if (data) {
      setAdminCoupons((prev) => [data, ...prev])
      setNewCouponCode('')
      showToast(`🎉 クーポン [${data.code}] を作成しました！`)
    }
  }

  const handleDeleteAdminCoupon = async (id: string) => {
    const { error } = await supabase.from('coupons').delete().eq('id', id)
    if (!error) {
      setAdminCoupons((prev) => prev.filter((c) => c.id !== id))
      showToast('🗑️ クーポンを削除しました')
    }
  }

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase()
    if (!code) return

    if (code === 'PRO2026') {
      setAppliedDiscount(20)
      showToast('🎉 特典クーポン適用: 20% OFF!')
      return
    }

    const { data } = await supabase.from('coupons').select('*').eq('code', code).single()
    if (data && data.discount_rate) {
      setAppliedDiscount(data.discount_rate)
      showToast(`🎉 クーポン適用: ${data.discount_rate}% OFF!`)
    } else {
      showToast('❌ 無効なクーポンコードです')
    }
  }

  const handleSpeech = () => {
    if (!track) return
    const text = `現在再生中: ${track.name}、${track.artists?.[0]?.name}`
    const uttr = new SpeechSynthesisUtterance(text)
    uttr.lang = 'ja-JP'
    window.speechSynthesis.speak(uttr)
  }

  useEffect(() => {
    if (token && user) {
      fetchCurrentlyPlaying()
      const interval = setInterval(() => {
        fetchCurrentlyPlaying()
        fetchFriendsStatus(user.id)
        if (selectedGroup) fetchGroupDetails(selectedGroup)
      }, 4000)
      return () => clearInterval(interval)
    }
  }, [token, user, isGhostMode, bio, statusMsg, pinnedTrack, planType, trialStartedAt, selectedGroup])

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
    localStorage.clear()
    setToken(null)
    setUser(null)
    showToast('ログアウトしました')
  }

  const getFontSizePx = () => (fontSize === 'small' ? '13px' : fontSize === 'large' ? '18px' : '15px')

  const activeTheme = highContrast
    ? { bg: '#000000', card: '#111111', border: '#ffffff', accent: '#ffff00', color: '#ffffff' }
    : theme === 'neon'
    ? { bg: '#0b031a', card: '#160933', border: '#ff007f', accent: '#ff007f', color: '#00f6ff' }
    : theme === 'cyber'
    ? { bg: '#000000', card: '#0d0d0d', border: '#00ff66', accent: '#00ff66', color: '#ffffff' }
    : theme === 'retro'
    ? { bg: '#2b1e1a', card: '#3d2b25', border: '#d4a373', accent: '#faedcd', color: '#fefae0' }
    : { bg: '#121212', card: '#181818', border: '#282828', accent: '#1DB954', color: '#ffffff' }

  const shareUrl = user ? `${window.location.origin}${window.location.pathname}?ref=${user.id}` : ''
  const groupShareUrl = selectedGroup ? `${window.location.origin}${window.location.pathname}?group_ref=${selectedGroup}` : ''

  const basePrice = selectedPlanForPurchase === 'standard' ? 200 : selectedPlanForPurchase === 'pro' ? 400 : 800
  const finalPrice = Math.floor(basePrice * (1 - appliedDiscount / 100))

  return (
    <div style={{ background: activeTheme.bg, color: activeTheme.color, minHeight: '100vh', fontSize: getFontSizePx(), fontFamily: 'sans-serif' }}>
      
      {/* トーストポップアップ */}
      {toastMessage && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', background: activeTheme.accent, color: '#000', padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', zIndex: 2000, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
          🔔 {toastMessage}
        </div>
      )}

      {/* ヘッダー */}
      <header style={{ padding: '12px 20px', borderBottom: `1px solid ${activeTheme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ margin: 0, fontSize: '1.2em' }}>🎵 Music Share Pro (Music Share App Platform)</h1>

        {token && (
          <nav style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button onClick={() => setCurrentTab('home')} style={{ background: currentTab === 'home' ? activeTheme.accent : '#222', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '16px', cursor: 'pointer' }}>ホーム</button>
            <button onClick={() => setCurrentTab('search')} style={{ background: currentTab === 'search' ? activeTheme.accent : '#222', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '16px', cursor: 'pointer' }}>検索</button>
            <button onClick={() => setCurrentTab('groups')} style={{ background: currentTab === 'groups' ? activeTheme.accent : '#222', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '16px', cursor: 'pointer' }}>グループ</button>
            <button onClick={() => setCurrentTab('chat')} style={{ background: currentTab === 'chat' ? activeTheme.accent : '#222', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '16px', cursor: 'pointer' }}>チャット</button>
            <button onClick={() => setCurrentTab('stats')} style={{ background: currentTab === 'stats' ? activeTheme.accent : '#222', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '16px', cursor: 'pointer' }}>統計</button>
            <button onClick={() => setCurrentTab('mypage')} style={{ background: currentTab === 'mypage' ? activeTheme.accent : '#222', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '16px', cursor: 'pointer' }}>マイページ</button>
            <button onClick={() => setCurrentTab('settings')} style={{ background: currentTab === 'settings' ? activeTheme.accent : '#222', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '16px', cursor: 'pointer' }}>設定</button>
            
            {user?.id === ADMIN_SPOTIFY_ID && (
              <button onClick={() => setCurrentTab('admin')} style={{ background: currentTab === 'admin' ? '#e74c3c' : '#8b0000', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '16px', fontWeight: 'bold', cursor: 'pointer' }}>👑 管理者</button>
            )}
          </nav>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setActiveModal('vip')} style={{ background: 'gold', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '16px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85em' }}>💎 プラン比較</button>
          {token && <button onClick={handleLogout} style={{ background: '#333', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85em' }}>ログアウト</button>}
        </div>
      </header>

      {/* メインコンテンツ */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
        {!token ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <h2>音楽でリアルタイムにつながるWeb App</h2>
            <p style={{ color: '#aaa' }}>今聴いている曲を自動共有。友達やグループと一緒に試聴しよう。</p>
            <button onClick={handleLogin} style={{ background: activeTheme.accent, color: '#fff', border: 'none', padding: '14px 28px', borderRadius: '30px', fontWeight: 'bold', fontSize: '1.1em', cursor: 'pointer', marginTop: '16px' }}>
              Spotify連携ログイン
            </button>
          </div>
        ) : (
          <>
            {/* ホームタブ */}
            {currentTab === 'home' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                <div style={{ background: activeTheme.card, border: `1px solid ${activeTheme.border}`, borderRadius: '12px', padding: '20px' }}>
                  <h3>🎧 今聴いている曲</h3>
                  {track ? (
                    <div style={{ textAlign: 'center' }}>
                      <img src={track.album?.images?.[0]?.url} alt="cover" style={{ width: '160px', height: '160px', borderRadius: '8px', objectFit: 'cover' }} />
                      <h4>{track.name}</h4>
                      <p style={{ color: '#aaa' }}>{track.artists?.map((a: any) => a.name).join(', ')}</p>
                      
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
                        <button onClick={() => { setFavorites([...favorites, track]); showToast('お気に入りに追加しました！') }} style={{ background: '#333', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>❤️ お気に入り</button>
                        <button onClick={handleSpeech} style={{ background: '#333', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>🗣️ 読み上げ</button>
                      </div>

                      {track.id && <iframe src={`https://open.spotify.com/embed/track/${track.id}`} width="100%" height="80" frameBorder="0" allow="encrypted-media" style={{ borderRadius: '8px' }}></iframe>}
                    </div>
                  ) : <p style={{ color: '#888' }}>再生していません</p>}
                </div>

                <div style={{ background: activeTheme.card, border: `1px solid ${activeTheme.border}`, borderRadius: '12px', padding: '20px' }}>
                  <h3>👥 友達の Now Playing</h3>
                  {friendsStatus.length === 0 ? <p style={{ color: '#888' }}>友達がいません。マイページの招待URLを共有しよう！</p> : (
                    friendsStatus.map((friend) => (
                      <div key={friend.id} style={{ borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong>{friend.display_name}</strong> {friend.is_premium && <span style={{ background: 'gold', color: '#000', fontSize: '0.7em', padding: '1px 4px', borderRadius: '4px' }}>PRO</span>}
                          </div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => handleSendReaction(friend.id, '🔥')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🔥</button>
                            <button onClick={() => handleSendReaction(friend.id, '❤️')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>❤️</button>
                            <button onClick={() => handleSendReaction(friend.id, '👏')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>👏</button>
                          </div>
                        </div>
                        <p style={{ margin: '4px 0', color: activeTheme.accent, fontSize: '0.9em' }}>{friend.track_name ? `🎵 ${friend.track_name} - ${friend.artist_name}` : '停止中'}</p>
                        {friend.status_message && <p style={{ margin: 0, fontSize: '0.8em', color: '#aaa' }}>💬 {friend.status_message}</p>}
                        {friend.pinned_track && <p style={{ margin: 0, fontSize: '0.8em', color: 'gold' }}>📌 推し曲: {friend.pinned_track}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 検索タブ */}
            {currentTab === 'search' && (
              <div style={{ background: activeTheme.card, border: `1px solid ${activeTheme.border}`, borderRadius: '12px', padding: '20px' }}>
                <h2>🔍 曲の検索 & プレビュー</h2>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="曲名・アーティスト名" style={{ flex: 1, padding: '8px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '6px' }} />
                  <button onClick={handleSearch} style={{ background: activeTheme.accent, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>検索</button>
                </div>
                {searchResults.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #222' }}>
                    <div>
                      <strong>{item.name}</strong>
                      <p style={{ margin: 0, fontSize: '0.85em', color: '#aaa' }}>{item.artists.map((a: any) => a.name).join(', ')}</p>
                    </div>
                    {item.preview_url ? <audio controls src={item.preview_url} style={{ height: '30px' }}></audio> : <span style={{ fontSize: '0.8em', color: '#666' }}>試聴不可</span>}
                  </div>
                ))}
              </div>
            )}

            {/* グループタブ */}
            {currentTab === 'groups' && (
              <div style={{ background: activeTheme.card, border: `1px solid ${activeTheme.border}`, borderRadius: '12px', padding: '20px' }}>
                <h2>👥 グループ管理</h2>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="新規グループ名" style={{ flex: 1, padding: '8px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '6px' }} />
                  <button onClick={handleCreateGroup} style={{ background: activeTheme.accent, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>作成</button>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                  {groups.map((g) => (
                    <button key={g.id} onClick={() => fetchGroupDetails(g.id)} style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #444', background: selectedGroup === g.id ? activeTheme.accent : '#222', color: '#fff', cursor: 'pointer' }}>{g.name}</button>
                  ))}
                </div>

                {selectedGroup && (
                  <div>
                    <h4>グループ参加メンバー</h4>
                    <ul>
                      {groupMembers.map((m) => (
                        <li key={m.id}>{m.display_name} {m.track_name ? `(🎵 ${m.track_name})` : ''}</li>
                      ))}
                    </ul>
                    <div style={{ marginTop: '12px' }}>
                      <p style={{ fontSize: '0.85em', color: '#aaa' }}>グループ招待URL:</p>
                      <input type="text" readOnly value={groupShareUrl} onClick={(e) => (e.target as HTMLInputElement).select()} style={{ width: '100%', padding: '6px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '4px' }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* チャットタブ */}
            {currentTab === 'chat' && (
              <div style={{ background: activeTheme.card, border: `1px solid ${activeTheme.border}`, borderRadius: '12px', padding: '20px' }}>
                <h2>💬 グループチャット</h2>
                {!selectedGroup ? <p style={{ color: '#888' }}>「グループ」タブからグループを選択してください。</p> : (
                  <div>
                    <div style={{ height: '300px', overflowY: 'auto', border: '1px solid #333', padding: '12px', borderRadius: '8px', marginBottom: '12px', background: '#0a0a0a' }}>
                      {chatMessages.length === 0 ? <p style={{ color: '#666' }}>メッセージはまだありません。</p> : (
                        chatMessages.map((m, idx) => (
                          <div key={idx} style={{ marginBottom: '8px' }}>
                            <strong style={{ fontSize: '0.85em', color: activeTheme.accent }}>{m.user_name}</strong>
                            <p style={{ margin: '2px 0', background: '#222', padding: '6px 10px', borderRadius: '6px', display: 'inline-block' }}>{m.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="text" value={msgInput} onChange={(e) => setMsgInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="メッセージを入力..." style={{ flex: 1, padding: '8px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '6px' }} />
                      <button onClick={handleSendMessage} style={{ background: activeTheme.accent, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>送信</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 統計＆履歴タブ */}
            {currentTab === 'stats' && (
              <div style={{ background: activeTheme.card, border: `1px solid ${activeTheme.border}`, borderRadius: '12px', padding: '20px' }}>
                <h2>📊 リスニング統計 & 再生履歴</h2>
                <p>最近聴いた曲数: <strong>{history.length}</strong> 曲</p>
                <p>お気に入り追加数: <strong>{favorites.length}</strong> 曲</p>

                <h4>お気に入りリスト</h4>
                {favorites.length === 0 ? <p style={{ color: '#888' }}>登録なし</p> : (
                  favorites.map((f, i) => (
                    <div key={i} style={{ padding: '4px 0', color: activeTheme.accent }}>❤️ {f.name} - {f.artists?.[0]?.name}</div>
                  ))
                )}

                <h4 style={{ marginTop: '20px' }}>最近の再生履歴</h4>
                {history.map((h, i) => (
                  <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid #222', fontSize: '0.9em' }}>
                    🎵 {h.name} - {h.artists?.[0]?.name}
                  </div>
                ))}
              </div>
            )}

            {/* マイページタブ */}
            {currentTab === 'mypage' && (
              <div style={{ background: activeTheme.card, border: `1px solid ${activeTheme.border}`, borderRadius: '12px', padding: '20px' }}>
                <h2>👤 マイページ</h2>
                <p>プラン: <strong>{planType.toUpperCase()}</strong> {isTrialActive() && '(1ヶ月無料体験中)'}</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label><input type="checkbox" checked={isGhostMode} onChange={(e) => setIsGhostMode(e.target.checked)} /> 👻 ゴーストモード（再生曲を他人に非表示）</label>
                  <div>
                    <label style={{ fontSize: '0.85em', color: '#aaa' }}>自己紹介バイオ</label>
                    <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="自己紹介" style={{ width: '100%', padding: '8px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '6px', resize: 'vertical' }} />
                  </div>
                  <input type="text" value={statusMsg} onChange={(e) => setStatusMsg(e.target.value)} placeholder="一言ステータス" style={{ padding: '8px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '6px' }} />
                  <input type="text" value={pinnedTrack} onChange={(e) => setPinnedTrack(e.target.value)} placeholder="📌 推し曲固定（有料限定）" disabled={!isProMember} style={{ padding: '8px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '6px' }} />
                </div>

                <div style={{ marginTop: '20px' }}>
                  <h4>💌 あなたの招待URL</h4>
                  <input type="text" readOnly value={shareUrl} onClick={(e) => (e.target as HTMLInputElement).select()} style={{ width: '100%', padding: '8px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '6px' }} />
                </div>
              </div>
            )}

            {/* 設定タブ */}
            {currentTab === 'settings' && (
              <div style={{ background: activeTheme.card, border: `1px solid ${activeTheme.border}`, borderRadius: '12px', padding: '20px' }}>
                <h2>⚙️ アクセシビリティ & 設定</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <h4>文字サイズ</h4>
                    <button onClick={() => setFontSize('small')} style={{ padding: '6px 12px', marginRight: '6px' }}>小</button>
                    <button onClick={() => setFontSize('medium')} style={{ padding: '6px 12px', marginRight: '6px' }}>中</button>
                    <button onClick={() => setFontSize('large')} style={{ padding: '6px 12px' }}>大</button>
                  </div>
                  <div>
                    <h4>視覚アクセシビリティ</h4>
                    <label><input type="checkbox" checked={highContrast} onChange={(e) => setHighContrast(e.target.checked)} /> ハイコントラスト（黄/白/黒）</label>
                  </div>
                  <div>
                    <h4>デザインテーマ</h4>
                    <button onClick={() => setTheme('dark')} style={{ padding: '6px 12px', marginRight: '6px' }}>ダーク</button>
                    <button onClick={() => setTheme('neon')} style={{ padding: '6px 12px', marginRight: '6px' }}>ネオン</button>
                    <button onClick={() => setTheme('cyber')} style={{ padding: '6px 12px', marginRight: '6px' }}>サイバー</button>
                    <button onClick={() => setTheme('retro')} style={{ padding: '6px 12px' }}>レトロ</button>
                  </div>
                  <div>
                    <h4>⏰ スリープタイマー</h4>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button onClick={() => { setSleepTimer(15); showToast('タイマー: 15分に設定') }} style={{ padding: '6px 12px' }}>15分</button>
                      <button onClick={() => { setSleepTimer(30); showToast('タイマー: 30分に設定') }} style={{ padding: '6px 12px' }}>30分</button>
                      <button onClick={() => { setSleepTimer(60); showToast('タイマー: 60分に設定') }} style={{ padding: '6px 12px' }}>60分</button>
                      {sleepTimer !== null && <span style={{ color: activeTheme.accent }}>残り {sleepTimer} 分</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 管理者タブ */}
            {currentTab === 'admin' && (
              <div style={{ background: activeTheme.card, border: '2px solid #e74c3c', borderRadius: '12px', padding: '20px' }}>
                {user?.id === ADMIN_SPOTIFY_ID ? (
                  <div>
                    <h2 style={{ color: '#e74c3c' }}>👑 管理者ダッシュボード (Music Share App 管理権限)</h2>
                    <p style={{ fontSize: '0.9em', color: '#aaa' }}>Spotify ID: <strong>{ADMIN_SPOTIFY_ID}</strong> として認証済みです。</p>

                    <div style={{ border: '1px solid #333', padding: '16px', borderRadius: '8px', marginBottom: '24px', background: '#0d0d0d' }}>
                      <h3>🎟️ 新規クーポンコードの発行</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div>
                          <label style={{ fontSize: '0.85em', color: '#aaa' }}>コード名</label>
                          <input type="text" value={newCouponCode} onChange={(e) => setNewCouponCode(e.target.value)} placeholder="例: SUMMER2026" style={{ width: '100%', padding: '8px', background: '#111', color: '#fff', border: '1px solid #444', borderRadius: '4px' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.85em', color: '#aaa' }}>割引率 (%)</label>
                            <input type="number" value={newCouponDiscount} onChange={(e) => setNewCouponDiscount(Number(e.target.value))} style={{ width: '100%', padding: '8px', background: '#111', color: '#fff', border: '1px solid #444', borderRadius: '4px' }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.85em', color: '#aaa' }}>最大利用可能回数</label>
                            <input type="number" value={newCouponMaxUses} onChange={(e) => setNewCouponMaxUses(Number(e.target.value))} style={{ width: '100%', padding: '8px', background: '#111', color: '#fff', border: '1px solid #444', borderRadius: '4px' }} />
                          </div>
                        </div>
                        <button onClick={handleCreateAdminCoupon} style={{ background: '#2ea44f', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}>
                          クーポンを発行してDBに登録
                        </button>
                      </div>
                    </div>

                    <h3>📋 発行済みクーポン一覧</h3>
                    {adminCoupons.length === 0 ? <p style={{ color: '#888' }}>発行済みのクーポンはありません。</p> : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9em' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #444', background: '#222' }}>
                            <th style={{ padding: '8px' }}>コード</th>
                            <th style={{ padding: '8px' }}>割引率</th>
                            <th style={{ padding: '8px' }}>上限数</th>
                            <th style={{ padding: '8px' }}>操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminCoupons.map((c) => (
                            <tr key={c.id} style={{ borderBottom: '1px solid #333' }}>
                              <td style={{ padding: '8px', fontWeight: 'bold', color: 'gold' }}>{c.code}</td>
                              <td style={{ padding: '8px' }}>{c.discount_rate}% OFF</td>
                              <td style={{ padding: '8px' }}>{c.max_uses} 回</td>
                              <td style={{ padding: '8px' }}>
                                <button onClick={() => handleDeleteAdminCoupon(c.id)} style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>削除</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ) : (
                  <div style={{ color: '#e74c3c', textAlign: 'center', padding: '40px' }}>
                    ❌ 拒否されました: このダッシュボードは特定の管理者（Igfemg）以外アクセスできません。
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* フッター */}
      <footer style={{ marginTop: '40px', padding: '20px', borderTop: `1px solid ${activeTheme.border}`, textAlign: 'center', fontSize: '0.85em', color: '#888' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '8px' }}>
          <button onClick={() => setActiveModal('terms')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>利用規約</button>
          <button onClick={() => setActiveModal('privacy')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>プライバシーポリシー</button>
          <button onClick={() => setActiveModal('tokushoho')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>特定商取引法表記</button>
          <button onClick={() => setActiveModal('api')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>Spotify APIポリシー</button>
        </div>
        <p>© 2026 Music Share App. All rights reserved.</p>
      </footer>

      {/* モーダルポップアップ */}
      {activeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#1e1e1e', color: '#fff', padding: '24px', borderRadius: '12px', maxWidth: '500px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
            
            {activeModal === 'vip' && (
              <div>
                <h3 style={{ color: 'gold', textAlign: 'center' }}>💎 料金プランの変更</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', margin: '16px 0' }}>
                  <div onClick={() => setSelectedPlanForPurchase('standard')} style={{ border: selectedPlanForPurchase === 'standard' ? '2px solid gold' : '1px solid #444', padding: '8px', borderRadius: '6px', textAlign: 'center', cursor: 'pointer' }}>
                    <h4>スタンダード</h4>
                    <p style={{ color: 'gold' }}>¥200/月</p>
                  </div>
                  <div onClick={() => setSelectedPlanForPurchase('pro')} style={{ border: selectedPlanForPurchase === 'pro' ? '2px solid gold' : '1px solid #444', padding: '8px', borderRadius: '6px', textAlign: 'center', cursor: 'pointer' }}>
                    <h4>プロ</h4>
                    <p style={{ color: 'gold' }}>¥400/月</p>
                  </div>
                  <div onClick={() => setSelectedPlanForPurchase('family')} style={{ border: selectedPlanForPurchase === 'family' ? '2px solid gold' : '1px solid #444', padding: '8px', borderRadius: '6px', textAlign: 'center', cursor: 'pointer' }}>
                    <h4>ファミリー</h4>
                    <p style={{ color: 'gold' }}>¥800/月</p>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.85em', color: '#aaa' }}>クーポンコード（PRO2026）</label>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                    <input type="text" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="コードを入力" style={{ flex: 1, padding: '6px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '4px' }} />
                    <button onClick={handleApplyCoupon} style={{ padding: '6px 12px', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>適用</button>
                  </div>
                  {appliedDiscount > 0 && <p style={{ color: 'gold', fontSize: '0.85em', margin: '4px 0' }}>割引後価格: ¥{finalPrice}/月</p>}
                </div>

                <button onClick={() => { setPlanType(selectedPlanForPurchase); setActiveModal(null); showToast('プランを変更しました！') }} style={{ background: 'gold', color: '#000', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', width: '100%', cursor: 'pointer' }}>1ヶ月無料体験で開始 (¥{finalPrice}/月)</button>
              </div>
            )}

            {activeModal === 'terms' && <div><h3>利用規約</h3><p style={{ fontSize: '0.85em', color: '#ccc' }}>第1条（目的）本規約は、本アプリの提供条件および利用に関する権利義務関係を定めるものです...</p></div>}
            {activeModal === 'privacy' && <div><h3>プライバシーポリシー</h3><p style={{ fontSize: '0.85em', color: '#ccc' }}>当社はSpotify API連携を通じ、ユーザーの基本プロフィール情報および再生中トラックデータを取得します...</p></div>}
            {activeModal === 'tokushoho' && (
              <div>
                <h3>特定商取引法に基づく表記</h3>
                <p style={{ fontSize: '0.85em', color: '#ccc' }}>
                  販売事業者:  Music Share App 運営事務局<br />
                  運営責任者: 代表<br />
                  連絡先: support@musicshare.example.com<br />
                  販売価格: 各プランの購入ページに表示
                </p>
              </div>
            )}
            {activeModal === 'api' && <div><h3>Spotify API連携方針</h3><p style={{ fontSize: '0.85em', color: '#ccc' }}>本アプリはSpotify Developer Termsのガイドラインに準拠して構築されています。</p></div>}

            <button onClick={() => setActiveModal(null)} style={{ marginTop: '16px', background: activeTheme.accent, color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', width: '100%', cursor: 'pointer' }}>閉じる</button>
          </div>
        </div>
      )}
    </div>
  )
}