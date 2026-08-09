import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export function useCurrentUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    base44.auth.me()
      .then((u) => active && setUser(u))
      .catch(() => active && setUser(null))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);
  return { user, loading, setUser, reload: () => base44.auth.me().then(setUser) };
}

export function membershipActive(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.membership_status !== 'active') return false;
  if (user.membership_end && new Date(user.membership_end) < new Date()) return false;
  return true;
}