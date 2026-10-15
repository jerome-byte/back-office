/** Pages accessibles par rôle (le menu suit la même règle) */
export const ACCES = {
  '/': ['admin', 'gerant'],
  '/commandes': ['admin', 'gerant', 'cuisine'],
  '/cuisine': ['admin', 'gerant', 'cuisine'],
  '/livraisons': ['admin', 'gerant', 'livreur'],
  '/reservations': ['admin', 'gerant', 'cuisine'],
  '/plats': ['admin', 'gerant'],
  '/categories': ['admin', 'gerant'],
  '/evenements': ['admin', 'gerant'],
  '/codes-promo': ['admin', 'gerant'],
  '/zones': ['admin', 'gerant'],
  '/avis': ['admin', 'gerant'],
  '/clients': ['admin', 'gerant'],
  '/equipe': ['admin', 'gerant'],
  '/parametres': ['admin', 'gerant'],
  '/journal': ['admin', 'gerant'],
};

export const accueilPour = (role) =>
  role === 'cuisine' ? '/cuisine' : role === 'livreur' ? '/livraisons' : '/';

