import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { supabase } from './supabase';

/**
 * Charge des données et les recharge automatiquement quand une des tables
 * Supabase change (temps réel). `charger` doit renvoyer une promesse.
 */
export function useDonnees(charger, tables = [], deps = []) {
  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const ref = useRef(charger);
  useLayoutEffect(() => { ref.current = charger; });

  const recharger = useCallback(async (silencieux = false) => {
    if (!silencieux) setChargement(true);
    try {
      setDonnees(await ref.current());
      setErreur(null);
    } catch (e) {
      setErreur(e.message || String(e));
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    // chargement initial / quand les dépendances changent (données externes)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recharger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    const h = () => recharger(true);
    window.addEventListener('donnees-modifiees', h);
    return () => window.removeEventListener('donnees-modifiees', h);
  }, [recharger]);

  const cleTables = tables.join(',');
  useEffect(() => {
    if (!cleTables) return undefined;
    let timer;
    const canal = supabase.channel(`rt-${cleTables}-${Math.random().toString(36).slice(2)}`);
    cleTables.split(',').forEach((table) => {
      canal.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => recharger(true), 300);
      });
    });
    canal.subscribe();
    return () => { clearTimeout(timer); supabase.removeChannel(canal); };
  }, [cleTables, recharger]);

  return { donnees, chargement, erreur, recharger, setDonnees };
}

/** Résultat d'une requête Supabase → données ou exception */
export async function sb(requete) {
  const { data, error } = await requete;
  if (error) throw new Error(error.message);
  return data;
}

/** À appeler après une écriture directe dans Supabase. */
export const signalerModification = () => window.dispatchEvent(new Event('donnees-modifiees'));

export function useEstMobile(seuil = 900) {
  const [mobile, setMobile] = useState(() => window.innerWidth < seuil);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < seuil);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [seuil]);
  return mobile;
}

/** Re-render toutes les `ms` (chronos en cuisine). */
export function useTic(ms = 30000) {
  const [, set] = useState(0);
  useEffect(() => { const t = setInterval(() => set((x) => x + 1), ms); return () => clearInterval(t); }, [ms]);
}
