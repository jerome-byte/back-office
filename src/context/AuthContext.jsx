import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profil, setProfil] = useState(null);
  const [chargement, setChargement] = useState(true);

  const chargerProfil = useCallback(async (s) => {
    if (!s?.user) { setProfil(null); return; }
    const { data } = await supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle();
    setProfil(data);
  }, []);

  useEffect(() => {
    let actif = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!actif) return;
      setSession(data.session);
      await chargerProfil(data.session);
      setChargement(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((evt, s) => {
      setSession(s);
      if (evt === 'SIGNED_IN' || evt === 'SIGNED_OUT' || evt === 'USER_UPDATED') {
        // hors du callback pour éviter un blocage de supabase-js
        setTimeout(() => chargerProfil(s), 0);
      }
    });
    return () => { actif = false; sub.subscription.unsubscribe(); };
  }, [chargerProfil]);

  const valeur = useMemo(() => {
    const role = profil?.role ?? null;
    return {
      session,
      profil,
      role,
      chargement,
      estStaff: !!role && role !== 'client',
      peut: (...roles) => !!role && roles.includes(role),
      connexion: (email, password) => supabase.auth.signInWithPassword({ email, password }),
      deconnexion: () => supabase.auth.signOut(),
      rechargerProfil: () => chargerProfil(session),
    };
  }, [session, profil, chargement, chargerProfil]);

  return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
