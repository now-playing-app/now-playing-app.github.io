// src/components/Chat.tsx
import React, { useState } from 'react';

interface ChatProps {
  messages: any[];
  user: any;
  onSendMessage: (content: string, name: string) => void;
}

export const Chat: React.FC<ChatProps> = ({ messages, user, onSendMessage }) => {
  const [chatInput, setChatInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput, user.display_name || '名無しさん');
    setChatInput('');
  };

  return (
    <div style={{ background: '#181818', padding: '30px', borderRadius: '12px', border: '1px solid #282828' }}>
      <h2>💬 コミュニティチャット</h2>
      <div style={{ background: '#282828', padding: '15px', borderRadius: '8px', margin: '15px 0', borderLeft: '4px solid #f1c40f' }}>
        <p style={{ color: '#f1c40f', margin: 0, fontWeight: 'bold' }}>🚧 現在開発中です（プレビュー版）</p>
        <p style={{ color: '#b3b3b3', fontSize: '0.9rem', margin: '5px 0 0 0' }}>リアルタイムメッセージ機能の検証を行っています。</p>
      </div>

      <div style={{ height: '300px', background: '#121212', borderRadius: '8px', padding: '15px', overflowY: 'auto', marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.length === 0 ? (
          <p style={{ color: '#727272', textAlign: 'center', marginTop: '100px' }}>まだメッセージはありません。最初のメッセージを送ってみましょう！</p>
        ) : (
          messages.map((msg, index) => (
            <div key={index} style={{ background: '#181818', padding: '10px 15px', borderRadius: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: 'bold', color: '#1db954', fontSize: '0.9rem' }}>{msg.user_name}</span>
                <span style={{ color: '#727272', fontSize: '0.75rem' }}>{new Date(msg.created_at).toLocaleTimeString()}</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>{msg.content}</p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          placeholder="メッセージを入力..." 
          value={chatInput} 
          onChange={(e) => setChatInput(e.target.value)}
          style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #333', background: '#282828', color: '#fff' }}
        />
        <button type="submit" style={{ background: '#1db954', color: '#fff', border: 'none', padding: '0 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>送信</button>
      </form>
    </div>
  );
};