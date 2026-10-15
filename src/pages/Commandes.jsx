import { useMemo, useState } from 'react';
import { Alert, Button, DatePicker, Input, Segmented, Space, Table, Tag } from 'antd';
import { DownloadOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { PageEntete, TagPaiement, TagStatut } from '../components/ui';
import CommandeDrawer from '../components/CommandeDrawer';
import { supabase } from '../lib/supabase';
import { sb, useDonnees } from '../lib/hooks';
import { dayjs, dateHeure, depuis, exporterCsv, fcfa, MODES_PAIEMENT, STATUTS_COMMANDE } from '../lib/format';

const FILTRES = {
  en_cours: ['en_attente', 'confirmee', 'en_preparation', 'prete', 'en_route'],
  en_attente: ['en_attente'],
  livree: ['livree'],
  annulee: ['annulee'],
  toutes: null,
};

export default function Commandes() {
  const [filtre, setFiltre] = useState('en_cours');
  const [recherche, setRecherche] = useState('');
  const [plage, setPlage] = useState([dayjs().subtract(6, 'day').startOf('day'), dayjs().endOf('day')]);
  const [ouverte, setOuverte] = useState(null);

  const { donnees, chargement, erreur, recharger } = useDonnees(async () => {
    let q = supabase.from('commandes')
      .select('id, numero, client_nom, client_phone, type, montant_total, mode_paiement, statut_paiement, statut, created_at, adresse_livraison, livreur_id, commande_items(nom, quantite)')
      .order('created_at', { ascending: false }).limit(500);
    if (FILTRES[filtre]) q = q.in('statut', FILTRES[filtre]);
    if (filtre !== 'en_cours' && filtre !== 'en_attente') {
      q = q.gte('created_at', plage[0].toISOString()).lte('created_at', plage[1].toISOString());
    }
    return sb(q);
  }, ['commandes'], [filtre, plage[0].valueOf(), plage[1].valueOf()]);

  const lignes = useMemo(() => {
    const r = recherche.trim().toLowerCase();
    if (!r) return donnees ?? [];
    return (donnees ?? []).filter((c) =>
      [c.numero, c.client_nom, c.client_phone, c.adresse_livraison].some((v) => v?.toLowerCase().includes(r)));
  }, [donnees, recherche]);

  const exporter = () => exporterCsv(`commandes_${dayjs().format('YYYYMMDD_HHmm')}.csv`, [
    { titre: 'Numéro', valeur: (c) => c.numero },
    { titre: 'Date', valeur: (c) => dateHeure(c.created_at) },
    { titre: 'Client', valeur: (c) => c.client_nom },
    { titre: 'Téléphone', valeur: (c) => c.client_phone },
    { titre: 'Type', valeur: (c) => c.type },
    { titre: 'Articles', valeur: (c) => c.commande_items.map((i) => `${i.quantite}x ${i.nom}`).join(', ') },
    { titre: 'Montant', valeur: (c) => c.montant_total },
    { titre: 'Paiement', valeur: (c) => MODES_PAIEMENT[c.mode_paiement]?.label },
    { titre: 'Statut paiement', valeur: (c) => c.statut_paiement },
    { titre: 'Statut', valeur: (c) => STATUTS_COMMANDE[c.statut]?.label },
  ], lignes);

  return (
    <>
      <PageEntete titre="Commandes" sousTitre="Mise à jour en temps réel — cliquez sur une commande pour la traiter."
        actions={<>
          <Button icon={<ReloadOutlined />} onClick={() => recharger()}>Actualiser</Button>
          <Button icon={<DownloadOutlined />} onClick={exporter} disabled={!lignes.length}>Exporter CSV</Button>
        </>} />

      <div className="carte" style={{ padding: 16 }}>
        <Space wrap style={{ marginBottom: 14, width: '100%', justifyContent: 'space-between' }}>
          <Segmented value={filtre} onChange={setFiltre} options={[
            { label: 'En cours', value: 'en_cours' }, { label: 'À accepter', value: 'en_attente' },
            { label: 'Livrées', value: 'livree' }, { label: 'Annulées', value: 'annulee' }, { label: 'Toutes', value: 'toutes' },
          ]} />
          <Space wrap>
            {filtre !== 'en_cours' && filtre !== 'en_attente' && (
              <DatePicker.RangePicker value={plage} format="DD/MM/YY" allowClear={false}
                onChange={(v) => v && setPlage([v[0].startOf('day'), v[1].endOf('day')])} />
            )}
            <Input allowClear prefix={<SearchOutlined />} placeholder="N°, client, téléphone…" style={{ width: 240 }}
              value={recherche} onChange={(e) => setRecherche(e.target.value)} />
          </Space>
        </Space>
        {erreur && <Alert type="error" showIcon title={erreur} style={{ marginBottom: 12 }} />}
        <Table rowKey="id" loading={chargement} dataSource={lignes} scroll={{ x: 900 }} size="middle"
          pagination={{ pageSize: 25, showSizeChanger: false, showTotal: (t) => `${t} commande(s)` }}
          onRow={(r) => ({ onClick: () => setOuverte(r.id), style: { cursor: 'pointer' } })}
          columns={[
            { title: 'N°', dataIndex: 'numero', width: 110, render: (v) => <b>{v}</b> },
            { title: 'Client', render: (_, r) => <><div style={{ fontWeight: 500 }}>{r.client_nom || '—'}</div><div style={{ color: '#8A8F98', fontSize: 12 }}>{r.client_phone}</div></> },
            { title: 'Articles', render: (_, r) => <span style={{ fontSize: 12.5 }}>{r.commande_items.map((i) => `${i.quantite}× ${i.nom}`).join(', ')}</span>, ellipsis: true },
            { title: 'Type', dataIndex: 'type', width: 110, render: (t) => <Tag variant="filled">{t === 'livraison' ? '🛵 Livraison' : '🛍 Emporter'}</Tag> },
            { title: 'Montant', dataIndex: 'montant_total', align: 'right', width: 120, render: (v) => <b>{fcfa(v)}</b>,
              sorter: (a, b) => a.montant_total - b.montant_total },
            { title: 'Paiement', width: 150, render: (_, r) => <><div style={{ fontSize: 12.5 }}>{MODES_PAIEMENT[r.mode_paiement]?.label}</div><TagPaiement statut={r.statut_paiement} /></> },
            { title: 'Statut', dataIndex: 'statut', width: 140, render: (v) => <TagStatut statut={v} />,
              filters: Object.entries(STATUTS_COMMANDE).map(([value, s]) => ({ value, text: s.label })), onFilter: (v, r) => r.statut === v },
            { title: 'Reçue', dataIndex: 'created_at', width: 130, render: (d) => <span title={dateHeure(d)}>{depuis(d)}</span>,
              sorter: (a, b) => a.created_at.localeCompare(b.created_at) },
          ]} />
      </div>
      <CommandeDrawer commandeId={ouverte} onClose={() => setOuverte(null)} />
    </>
  );
}
