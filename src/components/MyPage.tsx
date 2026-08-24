import React from 'react';

interface MyPageProps {
  user: any;
}

export const MyPage: React.FC<MyPageProps> = ({ user }) => {
  return (
    <div>
      <h2>👤 マイページ</h2>
      <div style={{ background: '#181818', padding: '25px', borderRadius: '12px', marginTop: '20px', border: '1px solid #282828', display: 'flex', gap: '20px', alignItems: 'center' }}>
        {user.images?.[0]?.url && (
          <img src={user.images[0].url} alt="Profile" style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover' }} />
        )}
        <div>
          <p style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}><b>{user.display_name}</b></p>
          <p style={{ margin: '0 0 5px 0', color: '#b3b3b3', fontSize: '0.9rem' }}><b>Spotify ID:</b> {user.id}</p>
          <p style={{ margin: 0, color: '#b3b3b3', fontSize: '0.9rem' }}><b>メールアドレス:</b> {user.email || '非公開'}</p>
        </div>
      </div>
    </div>
  );
};