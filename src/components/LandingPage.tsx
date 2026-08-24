import React from 'react';

interface LandingPageProps {
  hasAgreedTerms: boolean;
  isLoading: boolean;
  onAgreeTerms: () => void;
  onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ hasAgreedTerms, isLoading, onAgreeTerms, onLogin }) => {
  return (
    <div style={{ fontFamily: 'sans-serif', background: '#121212', color: '#fff', minHeight: '100vh', padding: '40px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', color: '#1db954', marginBottom: '10px' }}>🎵 Now Playing Hub</h1>
        <p style={{ fontSize: '1.2rem', color: '#b3b3b3', margin: '20px 0' }}>
          あなたのSpotifyでの「今聴いている音楽」をリアルタイムでシェアし、音楽仲間とつながる次世代プラットフォーム。
        </p>

        <div style={{ background: '#181818', padding: '30px', borderRadius: '12px', margin: '40px 0', border: '1px solid #282828', textAlign: 'left' }}>
          <h2 style={{ color: '#fff', textAlign: 'center', marginBottom: '20px' }}>🚀 バージョン 2.6の新機能</h2>
          <ul style={{ color: '#b3b3b3', lineHeight: '2.2', fontSize: '1.05rem', paddingLeft: '20px' }}>
            <li>✨ 高速化されたSpotifyリアルタイム楽曲同期エンジン</li>
            <li>💬 音楽仲間とリアルタイムで繋がるコミュニティチャット（開発中）</li>
            <li>🔒 セキュアなメンバーシップ認証とURLクーポン自動適用システム</li>
            <li>👑 VIPメンバーおよび管理者専用のカスタムダッシュボード</li>
          </ul>
        </div>

        {!hasAgreedTerms ? (
          <div style={{ background: '#282828', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #3e3e3e' }}>
            <p style={{ fontSize: '0.95rem', marginBottom: '15px', color: '#ddd' }}>
              ご利用には利用規約およびプライバシーポリシーへの同意が必要です。
            </p>
            <button 
              onClick={onAgreeTerms}
              style={{ background: '#1db954', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}
            >
              利用規約に同意して始める
            </button>
          </div>
        ) : (
          <button 
            onClick={onLogin}
            disabled={isLoading}
            style={{ background: '#1db954', color: '#fff', border: 'none', padding: '15px 40px', fontSize: '1.1rem', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(29, 185, 84, 0.3)' }}
          >
            {isLoading ? '接続中...' : 'Spotifyでログインしてはじめる'}
          </button>
        )}

        <div style={{ marginTop: '60px', fontSize: '0.8rem', color: '#727272', borderTop: '1px solid #282828', paddingTop: '20px' }}>
          <p>特定商取引法に基づく表記 | プライバシーポリシー | 利用規約</p>
        </div>
      </div>
    </div>
  );
};