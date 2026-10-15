import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.locale('fr');
dayjs.extend(relativeTime);
export { dayjs };

export const fcfa = (n) =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n) || 0)} FCFA`;
export const nombre = (n) => new Intl.NumberFormat('fr-FR').format(Number(n) || 0);
export const dateHeure = (d) => (d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '—');
export const heure = (d) => (d ? dayjs(d).format('HH:mm') : '—');
export const depuis = (d) => (d ? dayjs(d).fromNow() : '—');

export const STATUTS_COMMANDE = {
  en_attente: { label: 'En attente', color: 'gold', hex: '#D4A017' },
  confirmee: { label: 'Confirmée', color: 'blue', hex: '#2F6FED' },
  en_preparation: { label: 'En préparation', color: 'orange', hex: '#E4572E' },
  prete: { label: 'Prête', color: 'cyan', hex: '#0FA3A3' },
  en_route: { label: 'En route', color: 'purple', hex: '#7A4FD6' },
  livree: { label: 'Livrée', color: 'green', hex: '#2E9E5B' },
  annulee: { label: 'Annulée', color: 'default', hex: '#8A8F98' },
};

/** Étape suivante proposée pour une commande. */
export function etapeSuivante(cmd) {
  switch (cmd.statut) {
    case 'en_attente': return { statut: 'confirmee', label: 'Accepter' };
    case 'confirmee': return { statut: 'en_preparation', label: 'Lancer la préparation' };
    case 'en_preparation': return { statut: 'prete', label: 'Marquer prête' };
    case 'prete':
      return cmd.type === 'emporter'
        ? { statut: 'livree', label: 'Remise au client' }
        : { statut: 'en_route', label: 'Partir en livraison' };
    case 'en_route': return { statut: 'livree', label: 'Livrée' };
    default: return null;
  }
}

export const STATUTS_PAIEMENT = {
  en_attente: { label: 'Non payé', color: 'gold' },
  paye: { label: 'Payé', color: 'green' },
  echoue: { label: 'Échec', color: 'red' },
  rembourse: { label: 'Remboursé', color: 'default' },
};

export const MODES_PAIEMENT = {
  especes: { label: 'Espèces', color: '#2E9E5B' },
  yas: { label: 'Yas Money', color: '#F2B705' },
  moov: { label: 'Moov Money', color: '#2F6FED' },
};

export const STATUTS_RESERVATION = {
  en_attente: { label: 'À confirmer', color: 'gold' },
  confirmee: { label: 'Confirmée', color: 'blue' },
  arrivee: { label: 'Client arrivé', color: 'cyan' },
  terminee: { label: 'Terminée', color: 'green' },
  annulee: { label: 'Annulée', color: 'default' },
  absent: { label: 'Absent', color: 'red' },
};

export const ROLES = {
  admin: { label: 'Administrateur', color: 'red' },
  gerant: { label: 'Gérant', color: 'volcano' },
  cuisine: { label: 'Cuisine', color: 'orange' },
  livreur: { label: 'Livreur', color: 'purple' },
  client: { label: 'Client', color: 'default' },
};

export const TYPES_CATEGORIE = [
  { value: 'plat', label: 'Plat' },
  { value: 'entree', label: 'Entrée' },
  { value: 'accompagnement', label: 'Accompagnement' },
  { value: 'boisson', label: 'Boisson' },
  { value: 'dessert', label: 'Dessert' },
];

export const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

/** Petit signal sonore (nouvelle commande) — sans fichier audio. */
export function bip() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.18].forEach((t, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = i ? 1046 : 784;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.16);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.17);
    });
  } catch { /* navigateur sans audio */ }
}

/** Export CSV (Excel compatible) */
export function exporterCsv(nomFichier, colonnes, lignes) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const contenu = [colonnes.map((c) => esc(c.titre)).join(';')]
    .concat(lignes.map((l) => colonnes.map((c) => esc(c.valeur(l))).join(';')))
    .join('\n');
  const blob = new Blob(['﻿' + contenu], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nomFichier;
  a.click();
  URL.revokeObjectURL(a.href);
}
