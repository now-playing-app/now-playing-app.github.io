// src/App.tsx
import { useState, useEffect } from 'react';
import { useSpotify } from './hooks/useSpotify';
import { useSupabase } from './hooks/useSupabase';
import { LandingPage } from './components/LandingPage';
import { Chat } from './components/Chat';
import { Admin } from './components/Admin';
import { MyPage } from './components/MyPage';

const ADMIN_SPOTIFY_ID = '31suahezgbtexyezvj5wsfxukaba';

export default function App() {
  const { token, user, track, topArtists, isLoading, handleLogin, handleLogout, fetchCurrentlyPlaying } = useSpotify();
  const { messages, adminCoupons, hasAgreedTerms, agreeTerms, sendMessage, createCoupon, deleteCoupon } = useSupabase(user?.id);

  const [currentTab, setCurrentTab] = useState<'home' | 'chat' | 'admin' | 'mypage'>('home');
  const [couponCode, setCouponCode] = useState<string>('');
  const [discountRate, setDiscountRate] = useState<number>(0);

  // URLパラメータからのクーポン自動適用
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCoupon = params.get('coupon');
    if (urlCoupon) {
      setCouponCode(urlCoupon);
      const found = adminCoupons.find((c) => c.code === urlCoupon);
      if (found) {
        setDiscountRate(found.discount);
      }
    }
  }, [adminCoupons]);

  // 定期的な再生中楽曲の更新
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      fetchCurrentlyPlaying();
    }, 5000);
    return () => clearInterval(interval);
  }, [token, fetchCurrentlyPlaying]);

  const handleApplyCoupon = () => {
    const found = adminCoupons.find((c) => c.code === couponCode);
    if (found) {
      setDiscountRate(found.discount);
      alert(`クーポンが適用されました！ ${found.discount}% OFF`);
    } else {
      alert('無効なクーポンコードです。');
    }
  };

  // 未ログイン時
  if (!token || !user) {
    return (
      <LandingPage 
        hasAgreedTerms={hasAgreedTerms}
        isLoading={isLoading}
        onAgreeTerms={agreeTerms}
        onLogin={handleLogin}
      />
    );
  }

  // ログイン中メイン画面
  return (
    <div style={{ fontFamily: 'sans-serif', background: '#121212', color: '#fff', minHeight: '100vh' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', background: '#000', borderBottom: '1px solid #282828' }}>
        <h2 style={{ margin: 0, color: '#1db954', cursor: 'pointer' }} onClick={() => setCurrentTab('home')}>🎵 Now Playing Hub</h2>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button onClick={() => setCurrentTab('home')} style={navBtnStyle(currentTab === 'home')}>ホーム</button>
          <button onClick={() => setCurrentTab('chat')} style={navBtnStyle(currentTab === 'chat')}>チャット (開発中)</button>
          {user.id === ADMIN_SPOTIFY_ID && (
            <button onClick={() => setCurrentTab('admin')} style={navBtnStyle(currentTab === 'admin')}>管理者</button>
          )}
          <button onClick={() => setCurrentTab('mypage')} style={navBtnStyle(currentTab === 'mypage')}>マイページ</button>
          <button onClick={handleLogout} style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>ログアウト</button>
        </div>
      </nav>

      <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
        {currentTab === 'home' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <h1>ようこそ、{user.display_name} さん</h1>
              {user.id === ADMIN_SPOTIFY_ID && (
                <span style={{ background: '#f1c40f', color: '#000', padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', height: 'fit-content' }}>VIP ADMIN</span>
              )}
            </div>
            
            <div style={{ background: '#181818', padding: '25px', borderRadius: '12px', marginTop: '30px', border: '1px solid #282828' }}>
              <h3>🎧 現在再生中の楽曲</h3>
              {track ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '15px' }}>
                  {track.album?.images?.[0]?.url && (
                    <img src={track.album.images[0].url} alt="Album Art" style={{ width: '100px', height: '100px', borderRadius: '8px', objectFit: 'cover' }} />
                  )}
                  <div>
                    <p style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0 0 5px 0' }}>{track.name}</p>
                    <p style={{ color: '#b3b3b3', margin: 0 }}>{track.artists?.map((a: any) => a.name).join(', ')}</p>
                    <p style={{ color: '#727272', fontSize: '0.9rem', marginTop: '5px' }}>アルバム: {track.album?.name}</p>
                  </div>
                </div>
              ) : (
                <p style={{ color: '#b3b3b3', marginTop: '10px' }}>現在音楽を再生していないか、取得できません。</p>
              )}
            </div>

            <div style={{ marginTop: '30px', background: '#181818', padding: '25px', borderRadius: '12px', border: '1px solid #282828' }}>
              <h4>💳 プレミアムクーポン適用</h4>
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <input 
                  type="text" 
                  placeholder="クーポンコードを入力" 
                  value={couponCode} 
                  onChange={(e) => setCouponCode(e.target.value)}
                  style={{ padding: '10px 15px', borderRadius: '6px', border: '1px solid #333', background: '#282828', color: '#fff', flex: 1 }}
                />
                <button onClick={handleApplyCoupon} style={{ background: '#1db954', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>適用</button>
              </div>
              {discountRate > 0 && <p style={{ color: '#1db954', marginTop: '12px', fontWeight: 'bold' }}>🎉 適用中: {discountRate}% 割引が適用されています！</p>}
            </div>

            {topArtists.length > 0 && (
              <div style={{ marginTop: '30px', background: '#181818', padding: '25px', borderRadius: '12px', border: '1px solid #282828' }}>
                <h4>🎤 あなたのトップアーティスト</h4>
                <div style={{ display: 'flex', gap: '15px', marginTop: '15px', overflowX: 'auto', paddingBottom: '10px' }}>
                  {topArtists.map((artist) => (
                    <div key={artist.id} style={{ textAlign: 'center', minWidth: '100px' }}>
                      {artist.images?.[0]?.url && (
                        <img src={artist.images[0].url} alt={artist.name} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', marginBottom: '8px' }} />
                      )}
                      <p style={{ fontSize: '0.85rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{artist.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {currentTab === 'chat' && (
          <Chat messages={messages} user={user} onSendMessage={sendMessage} />
        )}

        {currentTab === 'admin' && user.id === ADMIN_SPOTIFY_ID && (
          <Admin adminCoupons={adminCoupons} onCreateCoupon={createCoupon} onDeleteCoupon={deleteCoupon} />
        )}

        {currentTab === 'mypage' && (
          <MyPage user={user} />
        )}
      </div>
    </div>
  );
}

function navBtnStyle(active: boolean) {
  return {
    background: active ? '#1db954' : 'transparent',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: active ? 'bold' : 'normal',
    transition: 'background 0.2s'
  };
}