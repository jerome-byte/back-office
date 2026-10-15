# Back-office Carnivore (React + Ant Design)

Interface de gestion du restaurant : tableau de bord, commandes en temps réel, écran cuisine (Kanban), livraisons sur carte, réservations et plan des tables, carte (plats et catégories), événements, codes promo, avis, clients, équipe, paramètres et journal d'activité.

## Démarrer

```bash
npm install
cp .env.example .env    # renseigner l'URL Supabase, la clé anon et l'URL de l'API
npm run dev             # http://localhost:5173
npm run build           # version de production dans dist/
```

## Déploiement (Render, site statique)

- Build command : `npm install && npm run build`
- Publish directory : `dist`
- Rewrite rule : `/*` → `/index.html` (pour les routes React)
- Variables d'environnement : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` et `VITE_API_URL`

## Rôles

| Rôle | Accès |
|---|---|
| Administrateur | tout, y compris la gestion de l'équipe |
| Gérant | tout sauf la modification de l'équipe |
| Cuisine | commandes, écran cuisine, ruptures de stock, réservations (lecture) |
| Livreur | ses livraisons, la carte et le partage de sa position GPS |

Le premier administrateur se crée dans Supabase (voir `GUIDE_INSTALLATION.md`).

## Carte

La carte utilise OpenStreetMap (gratuit, sans clé). Pour passer à Google Maps, seul `src/components/Carte.jsx` est à modifier.
