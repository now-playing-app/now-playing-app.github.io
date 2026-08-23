import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { LEGAL_TEXTS } from './LegalTexts'

const CLIENT_ID = '09ff71b7dfe043128dd49071e8096124'
const REDIRECT_URI = 'https://now-playing-app.github.io/'
const SCOPES = [
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-read-private',
  'playlist-modify-public',
  'user-top-read',
  'user-library-read'
]

const SUPABASE_URL = 'https://upwzobcmgblvidpxtdsh.supabase.co'
const SUPABASE_KEY = 'sb_publishable__Iz48wErET83IgfemgX-jg_u3hZyGLM'
const ADMIN_SPOTIFY_ID = '31suahezgbtexyezvj5wsfxukaba'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

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

  // タブ切り替え
  const [currentTab, setCurrentTab] = useState<
    'home' | 'mypage' | 'groups' | 'search' | 'chat' | 'stats' | 'settings' | 'admin' | 'about' | 'business' | 'donate'
  >('home')

  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [highContrast, setHighContrast] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'neon' | 'cyber' | 'retro'>('dark')

  // マイページ機能
  const [bio, setBio] = useState('')
  const [statusMsg, setStatusMsg] = useState('')
  const [pinnedTrack, setPinnedTrack] = useState('')
  const [customBadge, setCustomBadge] = useState('')
  const [socialTwitter, setSocialTwitter] = useState('')
  const [socialInsta, setSocialInsta] = useState('')

  // プラン・サブスク
  const [planType, setPlanType] = useState<'free' | 'standard' | 'pro' | 'family'>('free')
  const [selectedPlanForPurchase, setSelectedPlanForPurchase] = useState<'standard' | 'pro' | 'family'>('pro')
  const [hasUsedTrial, setHasUsedTrial] = useState(false)
  const [isShareholder, setIsShareholder] = useState(false)
  const [shareholderCodeInput, setShareholderCodeInput] = useState('')
  const [couponInput, setCouponInput] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0)

  // 履歴・検索・リアクション
  const [history, setHistory] = useState<any[]>([])
  const [favorites, setFavorites] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [reactionLogs, setReactionLogs] = useState<any[]>([])

  // ★ バックグラウンド音声再生用 Ref (タブを切り替えても再生が途切れない)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null)

  // グループ & チャット
  const [groups, setGroups] = useState<any[]>([])
  const [newGroupName, setNewGroupName] = useState('')
  const [isPublicGroup, setIsPublicGroup] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [groupMembers, setGroupMembers] = useState<any[]>([])
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [msgInput, setMsgInput] = useState('')
  const [stampPickerOpen, setStampPickerOpen] = useState(false)

  // 管理者機能
  const [adminCoupons, setAdminCoupons] = useState<Coupon[]>([])
  const [newCouponCode, setNewCouponCode] = useState('')
  const [newCouponDiscount, setNewCouponDiscount] = useState<number>(10)
  const [newCouponMaxUses, setNewCouponMaxUses] = useState<number>(100)

  // モーダル・便利ツール
  const [activeModal, setActiveModal] = useState<'terms' | 'privacy' | 'tokushoho' | 'vip' | 'api' | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [sleepTimer, setSleepTimer] = useState<number | null>(null)
  const [volume, setVolume] = useState(100)
  const [memoText, setMemoText] = useState(localStorage.getItem('app_memo') || '')
  const [topArtists, setTopArtists] = useState<any[]>([])
  const [donateAmount, setDonateAmount] = useState(500)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // 音量変更の反映
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100
    }
  }, [volume])

  // メモ保存
  useEffect(() => {
    localStorage.setItem('app_memo', memoText)
  }, [memoText])

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyM') showToast('🎵 ショートカット: ミュート切替動作')
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // スリープタイマー
  useEffect(() => {
    if (sleepTimer === null || sleepTimer <= 0) return
    const timer = setTimeout(() => {
      setSleepTimer((prev) => {
        if (prev === null || prev <= 1) {
          if (audioRef.current) {
            audioRef.current.pause()
            setPlayingPreviewId(null)
          }
          showToast('⏰ スリープタイマー：音楽を停止しました')
          return null
        }
        return prev - 1
      })
    }, 60000)
    return () => clearTimeout(timer)
  }, [sleepTimer])

  // パラメータ解析（招待処理）
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const ref = urlParams.get('ref')
    const groupRef = urlParams.get('group_ref')
    if (ref) localStorage.setItem('pending_ref', ref)
    if (groupRef) localStorage.setItem('pending_group_ref', groupRef)
  }, [])

  // PKCE認証処理
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

  const isProMember = planType !== 'free' || isShareholder

  // ユーザープロファイル・データ初期化
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
            setCustomBadge(dbUser.custom_badge || '')
            setSocialTwitter(dbUser.social_twitter || '')
            setSocialInsta(dbUser.social_insta || '')
            setPlanType(dbUser.plan_type || 'free')
            setHasUsedTrial(dbUser.has_used_trial || false)
            setIsShareholder(dbUser.is_shareholder || false)
            if (dbUser.font_size) setFontSize(dbUser.font_size)
          }

          const pendingRef = localStorage.getItem('pending_ref')
          if (pendingRef && pendingRef !== data.id) {
            await supabase.from('friendships').upsert([
              { user_id: data.id, friend_id: pendingRef },
              { user_id: pendingRef, friend_id: data.id }
            ])
            localStorage.removeItem('pending_ref')
            showToast('🎁 相互フレンド登録されました！')
          }

          const pendingGroupRef = localStorage.getItem('pending_group_ref')
          if (pendingGroupRef) {
            await supabase.from('group_members').upsert({ group_id: pendingGroupRef, user_id: data.id })
            localStorage.removeItem('pending_group_ref')
            showToast('👥 グループに参加しました！')
          }

          fetchFriendsStatus(data.id)
          fetchGroups(data.id)
          fetchTopArtists()

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

  // 再生中の曲取得 & 履歴追加
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

        if (currentTrack && currentTrack.id) {
          setHistory((prev) => {
            if (prev.length > 0 && prev[0].id === currentTrack.id) {
              return prev
            }
            return [currentTrack, ...prev.slice(0, 19)]
          })
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
        custom_badge: customBadge,
        social_twitter: socialTwitter,
        social_insta: socialInsta,
        is_premium: isProMember,
        plan_type: planType,
        has_used_trial: hasUsedTrial,
        is_shareholder: isShareholder,
        font_size: fontSize,
        updated_at: new Date().toISOString(),
      })
    } catch (err) {
      console.error(err)
    }
  }

  // 友達の再生ステータス更新
  const fetchFriendsStatus = async (myId: string) => {
    const { data: friendData } = await supabase.from('friendships').select('friend_id').eq('user_id', myId)
    if (friendData && friendData.length > 0) {
      const { data: statusData } = await supabase.from('user_status').select('*').in('id', friendData.map((f) => f.friend_id))
      if (statusData) setFriendsStatus(statusData)
    }
  }

  // トップアーティスト取得
  const fetchTopArtists = async () => {
    if (!token) return
    try {
      const res = await fetch('https://api.spotify.com/v1/me/top/artists?limit=5', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setTopArtists(data.items || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  // 検索
  const handleSearch = async () => {
    if (!searchQuery || !token) return
    const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=10`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (data?.tracks?.items) setSearchResults(data.tracks.items)
  }

  // ★ バックグラウンド持続可能なプレビュー再生機能
  const togglePreview = (url: string, id: string) => {
    if (!url) {
      showToast('⚠️ この曲の試聴音源はありません')
      return
    }

    if (playingPreviewId === id && audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setPlayingPreviewId(null)
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      const newAudio = new Audio(url)
      newAudio.volume = volume / 100
      newAudio.play()
      audioRef.current = newAudio
      setPlayingPreviewId(id)

      newAudio.onended = () => {
        setPlayingPreviewId(null)
        audioRef.current = null
      }
    }
  }

  // グループ一覧
  const fetchGroups = async (myId: string) => {
    const { data: myGroupMembers } = await supabase.from('group_members').select('group_id').eq('user_id', myId)
    if (myGroupMembers && myGroupMembers.length > 0) {
      const { data: groupList } = await supabase.from('groups').select('*').in('id', myGroupMembers.map((g) => g.group_id))
      if (groupList) setGroups(groupList)
    }
  }

  // チャット取得
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

  // Supabase Realtime チャット購読
  useEffect(() => {
    if (!selectedGroup) return

    const channel = supabase
      .channel(`chat:${selectedGroup}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `group_id=eq.${selectedGroup}` }, (payload) => {
        setChatMessages((prev) => [...prev, payload.new])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedGroup])

  // グループ作成
  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !user) return
    const { data: group } = await supabase
      .from('groups')
      .insert([{ name: newGroupName, owner_id: user.id, is_public: isPublicGroup }])
      .select()
      .single()

    if (group) {
      await supabase.from('group_members').insert([{ group_id: group.id, user_id: user.id }])
      setNewGroupName('')
      fetchGroups(user.id)
      fetchGroupDetails(group.id)
      showToast('グループを作成しました！')
    }
  }

  // メッセージ送信
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || msgInput
    if (!textToSend.trim() || !selectedGroup || !user) return
    const newMsg = {
      group_id: selectedGroup,
      user_id: user.id,
      user_name: user.display_name || user.id,
      message: textToSend,
      created_at: new Date().toISOString(),
    }
    await supabase.from('chat_messages').insert([newMsg])
    if (!customText) setMsgInput('')
    setStampPickerOpen(false)
  }

  // リアクション送信
  const handleSendReaction = (friendId: string, emoji: string) => {
    const friend = friendsStatus.find((f) => f.id === friendId)
    const log = {
      id: Date.now(),
      friendName: friend?.display_name || friendId,
      emoji,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    setReactionLogs((prev) => [log, ...prev])
    showToast(`${friend?.display_name || '友達'}へ ${emoji} リアクションを送信しました！`)
  }

  // サブスク処理
  const handleSubscribe = async (selectedPlan: 'standard' | 'pro' | 'family') => {
    if (!user) return
    if (!hasUsedTrial) {
      setHasUsedTrial(true)
      showToast('🎉 初回限定！1ヶ月無料体験を適用しました。')
    } else {
      showToast(`💳 ${selectedPlan.toUpperCase()}プランの契約を更新しました。`)
    }
    setPlanType(selectedPlan)
    await supabase.from('user_status').upsert({
      id: user.id,
      plan_type: selectedPlan,
      has_used_trial: true,
      is_shareholder: isShareholder,
      updated_at: new Date().toISOString()
    })
    setActiveModal(null)
  }

  const handleCancelSubscription = async () => {
    if (!user) return
    if (confirm('本当にサブスクリプションを解約しますか？')) {
      setPlanType('free')
      await supabase.from('user_status').update({ plan_type: 'free' }).eq('id', user.id)
      showToast('解約が完了し、無料プランへ変更されました。')
    }
  }

  const handleApplyShareholderCode = async () => {
    if (shareholderCodeInput.trim() === 'SH-2026-VIP') {
      setIsShareholder(true)
      setPlanType('pro')
      if (user) {
        await supabase.from('user_status').upsert({ id: user.id, is_shareholder: true, plan_type: 'pro' })
      }
      showToast('🏛️ 株主優待コードが認証されました。Proプランが適用されます。')
      setShareholderCodeInput('')
    } else {
      showToast('❌ 無効な株主優待コードです。')
    }
  }

  // クーポン管理
  const fetchAdminCoupons = async () => {
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false })
    if (data) setAdminCoupons(data)
  }

  const handleCreateAdminCoupon = async () => {
    if (!newCouponCode.trim()) return
    const couponObj = {
      code: newCouponCode.trim().toUpperCase(),
      discount_rate: newCouponDiscount,
      max_uses: newCouponMaxUses,
      created_at: new Date().toISOString(),
    }
    const { data } = await supabase.from('coupons').insert([couponObj]).select().single()
    if (data) {
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

  // 音声読み上げ
  const handleSpeech = () => {
    if (!track) return
    const text = `現在再生中: ${track.name}、${track.artists?.[0]?.name}`
    const uttr = new SpeechSynthesisUtterance(text)
    uttr.lang = 'ja-JP'
    window.speechSynthesis.speak(uttr)
  }

  // 寄付機能
  const handleDonate = () => {
    showToast(`💖 ${donateAmount}円のご寄付ありがとうございます！開発に活用させていただきます。`)
  }

  // 定期更新ポーリング
  useEffect(() => {
    if (token && user) {
      fetchCurrentlyPlaying()
      const interval = setInterval(() => {
        fetchCurrentlyPlaying()
        fetchFriendsStatus(user.id)
        if (selectedGroup) fetchGroupDetails(selectedGroup)
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [token, user, isGhostMode, bio, statusMsg, pinnedTrack, planType, selectedGroup])

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
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
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
    <div style={{ background: activeTheme.bg, color: activeTheme.color, minHeight: '100vh', fontSize: getFontSizePx(), fontFamily: 'sans-serif', paddingBottom: playingPreviewId ? '70px' : '0px' }}>
      {toastMessage && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', background: activeTheme.accent, color: '#000', padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', zIndex: 2000, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
          🔔 {toastMessage}
        </div>
      )}

      {/* バックグラウンド再生プレイヤーバー（画面底部に常時固定表示） */}
      {playingPreviewId && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#111', borderTop: `2px solid ${activeTheme.accent}`, padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1500 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.2em' }}>🎧</span>
            <div>
              <strong style={{ fontSize: '0.9em', color: activeTheme.accent }}>試聴音源をバックグラウンド再生中...</strong>
              <p style={{ margin: 0, fontSize: '0.75em', color: '#aaa' }}>他のタブに移動しても音楽は継続して再生されます</p>
            </div>
          </div>
          <button onClick={() => togglePreview('', playingPreviewId)} style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>
            ⏸ 停止
          </button>
        </div>
      )}

      {/* ヘッダー */}
      <header style={{ padding: '12px 20px', borderBottom: `1px solid ${activeTheme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ margin: 0, fontSize: '1.2em' }}>🎵 Music Share Pro Platform</h1>

        {token && (
          <nav style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button onClick={() => setCurrentTab('home')} style={{ background: currentTab === 'home' ? activeTheme.accent : '#222', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '16px', cursor: 'pointer' }}>ホーム</button>
            <button onClick={() => setCurrentTab('search')} style={{ background: currentTab === 'search' ? activeTheme.accent : '#222', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '16px', cursor: 'pointer' }}>検索 & 試聴</button>
            <button onClick={() => setCurrentTab('groups')} style={{ background: currentTab === 'groups' ? activeTheme.accent : '#222', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '16px', cursor: 'pointer' }}>グループ</button>
            <button onClick={() => setCurrentTab('chat')} style={{ background: currentTab === 'chat' ? activeTheme.accent : '#222', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '16px', cursor: 'pointer' }}>チャット</button>
            <button onClick={() => setCurrentTab('stats')} style={{ background: currentTab === 'stats' ? activeTheme.accent : '#222', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '16px', cursor: 'pointer' }}>統計 & ログ</button>
            <button onClick={() => setCurrentTab('mypage')} style={{ background: currentTab === 'mypage' ? activeTheme.accent : '#222', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '16px', cursor: 'pointer' }}>マイページ</button>
            <button onClick={() => setCurrentTab('settings')} style={{ background: currentTab === 'settings' ? activeTheme.accent : '#222', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '16px', cursor: 'pointer' }}>設定</button>
            <button onClick={() => setCurrentTab('about')} style={{ background: currentTab === 'about' ? activeTheme.accent : '#222', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '16px', cursor: 'pointer' }}>紹介</button>
            <button onClick={() => setCurrentTab('business')} style={{ background: currentTab === 'business' ? activeTheme.accent : '#222', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '16px', cursor: 'pointer' }}>企業向け</button>
            <button onClick={() => setCurrentTab('donate')} style={{ background: currentTab === 'donate' ? activeTheme.accent : '#222', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '16px', cursor: 'pointer' }}>ご寄付</button>
            
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

      {/* メインエリア */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
        {!token ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <h2>音楽でリアルタイムにつながる Web App</h2>
            <p style={{ color: '#aaa' }}>今聴いている曲を自動共有。友達やグループと一緒に音楽体験を楽しもう。</p>
            <button onClick={handleLogin} style={{ background: activeTheme.accent, color: '#fff', border: 'none', padding: '14px 28px', borderRadius: '30px', fontWeight: 'bold', fontSize: '1.1em', cursor: 'pointer', marginTop: '16px' }}>
              Spotify連携ログイン
            </button>
          </div>
        ) : (
          <>
            {/* ホームタブ */}
            {currentTab === 'home' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                              <strong>{friend.display_name}</strong> {friend.custom_badge && <span style={{ background: '#444', color: '#fff', fontSize: '0.7em', padding: '1px 4px', borderRadius: '4px', marginLeft: '4px' }}>{friend.custom_badge}</span>} {friend.is_premium && <span style={{ background: 'gold', color: '#000', fontSize: '0.7em', padding: '1px 4px', borderRadius: '4px' }}>PRO</span>}
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

                <div style={{ background: activeTheme.card, border: `1px solid ${activeTheme.border}`, borderRadius: '12px', padding: '20px' }}>
                  <h3>🔥 あなたのトップアーティスト</h3>
                  <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
                    {topArtists.map((artist) => (
                      <div key={artist.id} style={{ textAlign: 'center', minWidth: '100px' }}>
                        <img src={artist.images?.[0]?.url} alt={artist.name} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }} />
                        <p style={{ fontSize: '0.85em', margin: '6px 0 0 0' }}>{artist.name}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: activeTheme.card, border: `1px solid ${activeTheme.border}`, borderRadius: '12px', padding: '20px' }}>
                  <h3>📝 Quick 音楽メモ帳 (自動保存)</h3>
                  <textarea value={memoText} onChange={(e) => setMemoText(e.target.value)} placeholder="気になった曲やメモをここに自由に残せます..." style={{ width: '100%', height: '80px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '6px', padding: '8px' }} />
                </div>
              </div>
            )}

            {/* 検索タブ */}
            {currentTab === 'search' && (
              <div style={{ background: activeTheme.card, border: `1px solid ${activeTheme.border}`, borderRadius: '12px', padding: '20px' }}>
                <h2>🔍 曲の検索 & プレビュー試聴</h2>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="曲名・アーティスト名を入力..." style={{ flex: 1, padding: '8px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '6px' }} />
                  <button onClick={handleSearch} style={{ background: activeTheme.accent, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>検索</button>
                </div>
                {searchResults.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #222' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {item.album?.images?.[2]?.url && <img src={item.album.images[2].url} alt="thumb" style={{ width: '40px', height: '40px', borderRadius: '4px' }} />}
                      <div>
                        <strong>{item.name}</strong>
                        <p style={{ margin: 0, fontSize: '0.85em', color: '#aaa' }}>{item.artists.map((a: any) => a.name).join(', ')}</p>
                      </div>
                    </div>
                    <button onClick={() => togglePreview(item.preview_url, item.id)} style={{ background: playingPreviewId === item.id ? '#e74c3c' : activeTheme.accent, color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85em' }}>
                      {playingPreviewId === item.id ? '⏸ 停止' : '▶ 試聴'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* グループタブ */}
            {currentTab === 'groups' && (
              <div style={{ background: activeTheme.card, border: `1px solid ${activeTheme.border}`, borderRadius: '12px', padding: '20px' }}>
                <h2>👥 グループ管理</h2>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="新規グループ名" style={{ flex: 1, padding: '8px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '6px' }} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85em' }}>
                    <input type="checkbox" checked={isPublicGroup} onChange={(e) => setIsPublicGroup(e.target.checked)} /> 公開グループ
                  </label>
                  <button onClick={handleCreateGroup} style={{ background: activeTheme.accent, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>作成</button>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                  {groups.map((g) => (
                    <button key={g.id} onClick={() => fetchGroupDetails(g.id)} style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #444', background: selectedGroup === g.id ? activeTheme.accent : '#222', color: '#fff', cursor: 'pointer' }}>
                      {g.is_public ? '🌐' : '🔒'} {g.name}
                    </button>
                  ))}
                </div>

                {selectedGroup && (
                  <div>
                    <h4>👥 メンバーが現在聴いている曲一覧</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {groupMembers.map((m) => (
                        <div key={m.id} style={{ background: '#222', padding: '8px 12px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong>{m.display_name}</strong>
                            <span style={{ fontSize: '0.85em', color: activeTheme.accent, marginLeft: '10px' }}>
                              {m.track_name ? `🎵 ${m.track_name} - ${m.artist_name}` : '停止中'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: '16px' }}>
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
                <h2>💬 リアルタイムグループチャット</h2>
                {!selectedGroup ? <p style={{ color: '#888' }}>「グループ」タブからグループを選択してください。</p> : (
                  <div>
                    <div style={{ height: '320px', overflowY: 'auto', border: '1px solid #333', padding: '12px', borderRadius: '8px', marginBottom: '12px', background: '#0a0a0a' }}>
                      {chatMessages.length === 0 ? <p style={{ color: '#666' }}>メッセージはまだありません。</p> : (
                        chatMessages.map((m, idx) => (
                          <div key={idx} style={{ marginBottom: '8px' }}>
                            <strong style={{ fontSize: '0.85em', color: activeTheme.accent }}>{m.user_name}</strong>
                            <p style={{ margin: '2px 0', background: '#222', padding: '6px 10px', borderRadius: '6px', display: 'inline-block' }}>{m.message}</p>
                          </div>
                        ))
                      )}
                    </div>

                    {stampPickerOpen && (
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', background: '#222', padding: '8px', borderRadius: '8px' }}>
                        {['🎵', '🔥', '👏', '❤️', '🎉', '🎧', '🎸', '🎹'].map((stamp) => (
                          <button key={stamp} onClick={() => handleSendMessage(stamp)} style={{ background: 'none', border: 'none', fontSize: '1.5em', cursor: 'pointer' }}>{stamp}</button>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => setStampPickerOpen(!stampPickerOpen)} style={{ background: '#333', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>😊</button>
                      <input type="text" value={msgInput} onChange={(e) => setMsgInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="メッセージを入力..." style={{ flex: 1, padding: '8px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '6px' }} />
                      <button onClick={() => handleSendMessage()} style={{ background: activeTheme.accent, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>送信</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 統計＆ログ */}
            {currentTab === 'stats' && (
              <div style={{ background: activeTheme.card, border: `1px solid ${activeTheme.border}`, borderRadius: '12px', padding: '20px' }}>
                <h2>📊 リスニング統計 & リアクションログ</h2>
                <p>最近聴いた曲数: <strong>{history.length}</strong> 曲</p>
                <p>お気に入り追加数: <strong>{favorites.length}</strong> 曲</p>

                <h4>⚡ 送信したリアクションの履歴</h4>
                {reactionLogs.length === 0 ? <p style={{ color: '#888' }}>ログはありません。</p> : (
                  reactionLogs.map((log) => (
                    <div key={log.id} style={{ padding: '4px 0', borderBottom: '1px solid #222', fontSize: '0.85em', color: '#ccc' }}>
                      [{log.time}] <strong>{log.friendName}</strong> に {log.emoji} を送信しました
                    </div>
                  ))
                )}

                <h4 style={{ marginTop: '20px' }}>お気に入りリスト</h4>
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

            {/* マイページ */}
            {currentTab === 'mypage' && (
              <div style={{ background: activeTheme.card, border: `1px solid ${activeTheme.border}`, borderRadius: '12px', padding: '20px' }}>
                <h2>👤 マイページ・各種設定</h2>
                <p>現在のプラン: <strong style={{ color: 'gold' }}>{planType.toUpperCase()}</strong> {isShareholder && ' (株主優待会員)'}</p>

                {planType !== 'free' && (
                  <button onClick={handleCancelSubscription} style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', marginBottom: '16px' }}>
                    サブスクリプションを解約する
                  </button>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label><input type="checkbox" checked={isGhostMode} onChange={(e) => setIsGhostMode(e.target.checked)} /> 👻 ゴーストモード（再生曲を他人に非表示）</label>
                  <div>
                    <label style={{ fontSize: '0.85em', color: '#aaa' }}>自己紹介バイオ</label>
                    <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="自己紹介" style={{ width: '100%', padding: '8px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '6px' }} />
                  </div>
                  <input type="text" value={statusMsg} onChange={(e) => setStatusMsg(e.target.value)} placeholder="一言ステータス" style={{ padding: '8px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '6px' }} />
                  <input type="text" value={pinnedTrack} onChange={(e) => setPinnedTrack(e.target.value)} placeholder="📌 推し曲固定（有料限定）" disabled={!isProMember} style={{ padding: '8px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '6px' }} />
                  
                  <input type="text" value={customBadge} onChange={(e) => setCustomBadge(e.target.value)} placeholder="🏷️ カスタム肩書き・バッジ" style={{ padding: '8px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '6px' }} />
                  <input type="text" value={socialTwitter} onChange={(e) => setSocialTwitter(e.target.value)} placeholder="🐦 Twitter/X ユーザー名" style={{ padding: '8px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '6px' }} />
                  <input type="text" value={socialInsta} onChange={(e) => setSocialInsta(e.target.value)} placeholder="📷 Instagram ユーザー名" style={{ padding: '8px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '6px' }} />
                </div>

                <hr style={{ borderColor: '#333', margin: '20px 0' }} />
                <h4>🏛️ 株主優待コードの認証</h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="text" value={shareholderCodeInput} onChange={(e) => setShareholderCodeInput(e.target.value)} placeholder="優待コードを入力 (例: SH-2026-VIP)" style={{ padding: '8px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '6px', flex: 1 }} />
                  <button onClick={handleApplyShareholderCode} style={{ background: 'gold', color: '#000', border: 'none', padding: '8px 16px', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>認証</button>
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
                <h2>⚙️ アクセシビリティ & プレイヤー設定</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <h4>音量制御</h4>
                    <input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))} /> {volume}%
                  </div>
                  <div>
                    <h4>文字サイズ</h4>
                    <button onClick={() => setFontSize('small')} style={{ padding: '6px 12px', marginRight: '6px' }}>小</button>
                    <button onClick={() => setFontSize('medium')} style={{ padding: '6px 12px', marginRight: '6px' }}>中</button>
                    <button onClick={() => setFontSize('large')} style={{ padding: '6px 12px' }}>大</button>
                  </div>
                  <div>
                    <h4>ハイコントラスト</h4>
                    <label><input type="checkbox" checked={highContrast} onChange={(e) => setHighContrast(e.target.checked)} /> オン</label>
                  </div>
                  <div>
                    <h4>テーマ設定</h4>
                    <button onClick={() => setTheme('dark')} style={{ padding: '6px 12px', marginRight: '6px' }}>ダーク</button>
                    <button onClick={() => setTheme('neon')} style={{ padding: '6px 12px', marginRight: '6px' }}>ネオン</button>
                    <button onClick={() => setTheme('cyber')} style={{ padding: '6px 12px', marginRight: '6px' }}>サイバー</button>
                    <button onClick={() => setTheme('retro')} style={{ padding: '6px 12px' }}>レトロ</button>
                  </div>
                  <div>
                    <h4>⏰ スリープタイマー</h4>
                    <button onClick={() => setSleepTimer(15)} style={{ padding: '6px 12px', marginRight: '6px' }}>15分</button>
                    <button onClick={() => setSleepTimer(30)} style={{ padding: '6px 12px', marginRight: '6px' }}>30分</button>
                    <button onClick={() => setSleepTimer(60)} style={{ padding: '6px 12px' }}>60分</button>
                    {sleepTimer !== null && <span style={{ color: activeTheme.accent, marginLeft: '10px' }}>残り {sleepTimer} 分</span>}
                  </div>
                </div>
              </div>
            )}

            {/* アプリ紹介 */}
            {currentTab === 'about' && (
              <div style={{ background: activeTheme.card, border: `1px solid ${activeTheme.border}`, borderRadius: '12px', padding: '20px' }}>
                <h2>ℹ️ Music Share Pro について</h2>
                <p>Music Share Pro は、Spotify APIを活用して仲間と音楽体験をリアルタイム共有できるWebプラットフォームです。</p>
                <h3>🌟 主な特徴</h3>
                <ul>
                  <li><strong>リアルタイムステータス連動：</strong> 今再生している曲をグループや友達に即時共有。</li>
                  <li><strong>充実のグループ機能：</strong> リアルタイムチャットやスタンプ機能で盛り上がれる。</li>
                  <li><strong>アクセシビリティ対応：</strong> ハイコントラストや文字サイズ変更、音声読み上げを搭載。</li>
                </ul>
              </div>
            )}

            {/* 企業向け案内 */}
            {currentTab === 'business' && (
              <div style={{ background: activeTheme.card, border: `1px solid ${activeTheme.border}`, borderRadius: '12px', padding: '20px' }}>
                <h2>🏢 企業・事業者様向けのご案内</h2>
                <p>本サービスでは、店舗BGMのリアルタイム共有や、アーティスト様の販促連携、タイアップ広告を募集しております。</p>
                <div style={{ background: '#111', padding: '16px', borderRadius: '8px', marginTop: '12px' }}>
                  <h4>📋 事業者情報</h4>
                  <p><strong>運営形態：</strong> 個人事業主 (Music Share Studio)</p>
                  <p><strong>事業内容：</strong> 音楽連動Webアプリケーションの開発・運営</p>
                  <p><strong>お問い合わせ：</strong> support@example.com</p>
                </div>
              </div>
            )}

            {/* ご寄付のお願い */}
            {currentTab === 'donate' && (
              <div style={{ background: activeTheme.card, border: `1px solid ${activeTheme.border}`, borderRadius: '12px', padding: '20px' }}>
                <h2>💖 開発ご寄付のお願い</h2>
                <p>Music Share Pro は個人事業主として開発・運営を行っております。サーバー維持費や新機能開発のため、温かいご支援をお願い申し上げます。</p>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '16px' }}>
                  <button onClick={() => setDonateAmount(500)} style={{ padding: '8px 16px', background: donateAmount === 500 ? 'gold' : '#333', color: '#000' }}>¥500</button>
                  <button onClick={() => setDonateAmount(1000)} style={{ padding: '8px 16px', background: donateAmount === 1000 ? 'gold' : '#333', color: '#000' }}>¥1,000</button>
                  <button onClick={() => setDonateAmount(3000)} style={{ padding: '8px 16px', background: donateAmount === 3000 ? 'gold' : '#333', color: '#000' }}>¥3,000</button>
                  <button onClick={handleDonate} style={{ background: activeTheme.accent, color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>寄付する</button>
                </div>
              </div>
            )}

            {/* 管理者タブ */}
            {currentTab === 'admin' && (
              <div style={{ background: activeTheme.card, border: '2px solid #e74c3c', borderRadius: '12px', padding: '20px' }}>
                {user?.id === ADMIN_SPOTIFY_ID ? (
                  <div>
                    <h2 style={{ color: '#e74c3c' }}>👑 管理者ダッシュボード</h2>
                    <p style={{ fontSize: '0.9em', color: '#aaa' }}>Spotify ID: <strong>{ADMIN_SPOTIFY_ID}</strong></p>

                    <div style={{ border: '1px solid #333', padding: '16px', borderRadius: '8px', marginBottom: '24px', background: '#0d0d0d' }}>
                      <h3>🎟️ 新規クーポンコードの発行</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <input type="text" value={newCouponCode} onChange={(e) => setNewCouponCode(e.target.value)} placeholder="例: SUMMER2026" style={{ width: '100%', padding: '8px', background: '#111', color: '#fff', border: '1px solid #444', borderRadius: '4px' }} />
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <input type="number" value={newCouponDiscount} onChange={(e) => setNewCouponDiscount(Number(e.target.value))} style={{ flex: 1, padding: '8px', background: '#111', color: '#fff', border: '1px solid #444', borderRadius: '4px' }} />
                          <input type="number" value={newCouponMaxUses} onChange={(e) => setNewCouponMaxUses(Number(e.target.value))} style={{ flex: 1, padding: '8px', background: '#111', color: '#fff', border: '1px solid #444', borderRadius: '4px' }} />
                        </div>
                        <button onClick={handleCreateAdminCoupon} style={{ background: '#2ea44f', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                          クーポンを発行してDBに保存
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
                    ❌ アクセス拒否: 管理者権限がありません。
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* フッター */}
      <footer style={{ marginTop: '40px', padding: '20px', borderTop: `1px solid ${activeTheme.border}`, textAlign: 'center', fontSize: '0.85em', color: '#888' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => setActiveModal('terms')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>利用規約</button>
          <button onClick={() => setActiveModal('privacy')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>プライバシーポリシー</button>
          <button onClick={() => setActiveModal('tokushoho')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>特定商取引法表記</button>
          <button onClick={() => setActiveModal('api')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>Spotify APIポリシー</button>
        </div>
        <p>© 2026 Music Share App. All rights reserved.</p>
      </footer>

      {/* モーダル */}
      {activeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#1e1e1e', color: '#fff', padding: '24px', borderRadius: '12px', maxWidth: '500px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
            {activeModal === 'vip' && (
              <div>
                <h3 style={{ color: 'gold', textAlign: 'center' }}>💎 料金プラン比較・変更</h3>
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
                  <label style={{ fontSize: '0.85em', color: '#aaa' }}>クーポンコード (例: PRO2026)</label>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                    <input type="text" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="コードを入力" style={{ flex: 1, padding: '6px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '4px' }} />
                    <button onClick={handleApplyCoupon} style={{ padding: '6px 12px', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>適用</button>
                  </div>
                  {appliedDiscount > 0 && <p style={{ color: 'gold', fontSize: '0.85em', margin: '4px 0' }}>割引適用後: ¥{finalPrice}/月</p>}
                </div>

                <button onClick={() => handleSubscribe(selectedPlanForPurchase)} style={{ background: 'gold', color: '#000', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', width: '100%', cursor: 'pointer' }}>
                  {!hasUsedTrial ? `1ヶ月無料体験で開始 (以降 ¥${finalPrice}/月)` : `プランを購入 (¥${finalPrice}/月)`}
                </button>
              </div>
            )}

            {activeModal !== 'vip' && (
              <div>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'sans-serif', fontSize: '0.9em', color: '#ccc' }}>
                  {LEGAL_TEXTS[activeModal]}
                </pre>
              </div>
            )}

            <button onClick={() => setActiveModal(null)} style={{ marginTop: '16px', background: activeTheme.accent, color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', width: '100%', cursor: 'pointer' }}>閉じる</button>
          </div>
        </div>
      )}
    </div>
  )
}