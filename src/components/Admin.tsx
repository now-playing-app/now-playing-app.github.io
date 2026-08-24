import React, { useState } from 'react';

interface AdminProps {
  adminCoupons: any[];
  onCreateCoupon: (code: string, discount: number) => void;
  onDeleteCoupon: (id: string) => void;
}

export const Admin: React.FC<AdminProps> = ({ adminCoupons, onCreateCoupon, onDeleteCoupon }) => {
  const [newCode, setNewCode] = useState('');
  const [newDiscount, setNewDiscount] = useState(10);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    onCreateCoupon(newCode.trim(), Number(newDiscount));
    setNewCode('');
  };

  return (
    <div>
      <h2>👑 管理者ダッシュボード</h2>
      <div style={{ background: '#181818', padding: '25px', borderRadius: '12px', marginTop: '20px', border: '1px solid #282828' }}>
        <h4>クーポン新規発行</h4>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
          <input 
            type="text" 
            placeholder="クーポンコード (例: SUMMER2026)" 
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            style={{ padding: '8px', background: '#282828', border: '1px solid #333', color: '#fff', borderRadius: '4px', flex: 1 }}
          />
          <input 
            type="number" 
            value={newDiscount}
            onChange={(e) => setNewDiscount(Number(e.target.value))}
            style={{ padding: '8px', background: '#282828', border: '1px solid #333', color: '#fff', borderRadius: '4px', width: '80px' }}
          />
          <button type="submit" style={{ background: '#1db954', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>追加</button>
        </form>

        <h4 style={{ marginTop: '30px' }}>登録済みクーポン一覧</h4>
        <ul style={{ marginTop: '15px', paddingLeft: '20px' }}>
          {adminCoupons.map((c) => (
            <li key={c.id} style={{ margin: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>コード: <b>{c.code}</b> ({c.discount}% OFF)</span>
              <button onClick={() => onDeleteCoupon(c.id)} style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>削除</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};