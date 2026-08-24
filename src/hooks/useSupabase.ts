// src/hooks/useSupabase.ts
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://your-supabase-url.supabase.co';
const SUPABASE_ANON_KEY = 'your-supabase-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const useSupabase = (userId?: string) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [adminCoupons, setAdminCoupons] = useState<any[]>([
    { id: '1', code: 'PRO2026', discount: 20 }
  ]);
  const [hasAgreedTerms, setHasAgreedTerms] = useState<boolean>(
    localStorage.getItem('terms_agreed') === 'true'
  );

  const agreeTerms = () => {
    localStorage.setItem('terms_agreed', 'true');
    setHasAgreedTerms(true);
  };

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(50);

        if (!error && data) {
          setMessages(data);
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
      }
    };

    fetchMessages();

    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const sendMessage = async (content: string, userName: string) => {
    if (!content.trim() || !userId) return;
    try {
      await supabase.from('messages').insert([
        { user_id: userId, user_name: userName, content: content.trim(), created_at: new Date().toISOString() }
      ]);
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const createCoupon = async (code: string, discount: number) => {
    const newCoupon = { id: Date.now().toString(), code, discount };
    setAdminCoupons((prev) => [...prev, newCoupon]);
    try {
      await supabase.from('coupons').insert([newCoupon]);
    } catch (err) {
      console.error('Error creating coupon:', err);
    }
  };

  const deleteCoupon = async (id: string) => {
    setAdminCoupons((prev) => prev.filter((c) => c.id !== id));
    try {
      await supabase.from('coupons').delete().eq('id', id);
    } catch (err) {
      console.error('Error deleting coupon:', err);
    }
  };

  return {
    messages,
    adminCoupons,
    hasAgreedTerms,
    agreeTerms,
    sendMessage,
    createCoupon,
    deleteCoupon,
  };
};