import { Table, Tag } from 'antd';
import { PageEntete } from '../components/ui';
import { supabase } from '../lib/supabase';
import { sb, useDonnees } from '../lib/hooks';
import { dateHeure } from '../lib/format';

const ACTIONS = { insert: ['Création', 'green'], update: ['Modification', 'blue'], delete: ['Suppression', 'red'], statut: ['Statut', 'purple'] };
const ENTITES = {
  categories: 'Catégorie', plats: 'Plat', codes_promo: 'Code promo', zones_livraison: 'Zone', evenements: 'Événement',
  tables_restaurant: 'Table', parametres: 'Paramètres', horaires: 'Horaires', commandes: 'Commande',
};

export default function Journal() {
  const { donnees, chargement } = useDonnees(async () => {
    const lignes = await sb(supabase.from('journal_activite').select('*').order('created_at', { ascending: false }).limit(300));
    const ids = [...new Set(lignes.map((l) => l.user_id).filter(Boolean))];
    const profils = ids.length ? await sb(supabase.from('profiles').select('id, nom, email').in('id', ids)) : [];
    const noms = Object.fromEntries(profils.map((p) => [p.id, p.nom || p.email]));
    return lignes.map((l) => ({ ...l, auteur: noms[l.user_id] ?? '—' }));
  }, ['journal_activite']);

  return (
    <>
      <PageEntete titre="Journal d’activité" sousTitre="Les 300 dernières actions de l’équipe (traçabilité)." />
      <div className="carte" style={{ padding: 16 }}>
        <Table rowKey="id" size="small" loading={chargement} dataSource={donnees ?? []} scroll={{ x: 700 }} pagination={{ pageSize: 50 }}
          columns={[
            { title: 'Date', dataIndex: 'created_at', width: 160, render: dateHeure },
            { title: 'Membre', dataIndex: 'auteur', width: 180 },
            { title: 'Action', dataIndex: 'action', width: 130, render: (a) => <Tag color={ACTIONS[a]?.[1]}>{ACTIONS[a]?.[0] ?? a}</Tag> },
            { title: 'Élément', render: (_, l) => <>{ENTITES[l.entite] ?? l.entite} {l.details?.statut && <Tag>{l.details.statut}</Tag>}{l.details?.nom_fr || l.details?.nom || l.details?.code || ''}</> },
          ]} />
      </div>
    </>
  );
}
