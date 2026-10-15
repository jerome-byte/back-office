import { useMemo, useState } from 'react';
import { App, Avatar, Button, Drawer, Form, Input, Modal, Segmented, Table, Tag } from 'antd';
import { DownloadOutlined, NotificationOutlined, SearchOutlined } from '@ant-design/icons';
import { PageEntete, TagStatut } from '../components/ui';
import { supabase } from '../lib/supabase';
import { post } from '../lib/api';
import { sb, useDonnees } from '../lib/hooks';
import { dateHeure, depuis, exporterCsv, fcfa } from '../lib/format';

export default function Clients() {
  const { message } = App.useApp();
  const [recherche, setRecherche] = useState('');
  const [tri, setTri] = useState('depense');
  const [fiche, setFiche] = useState(null);
  const [annonce, setAnnonce] = useState(false);
  const [form] = Form.useForm();

  const { donnees, chargement } = useDonnees(async () => {
    const [clients, commandes] = await Promise.all([
      sb(supabase.from('profiles').select('id, nom, telephone, email, avatar_url, points_fidelite, created_at, actif').eq('role', 'client').order('created_at', { ascending: false }).limit(2000)),
      sb(supabase.from('commandes').select('client_id, montant_total, statut, created_at').neq('statut', 'annulee').limit(10000)),
    ]);
    const agg = {};
    for (const c of commandes) {
      if (!c.client_id) continue;
      const a = (agg[c.client_id] ??= { nb: 0, total: 0, derniere: null });
      a.nb += 1; a.total += Number(c.montant_total);
      if (!a.derniere || c.created_at > a.derniere) a.derniere = c.created_at;
    }
    return clients.map((c) => ({ ...c, ...(agg[c.id] ?? { nb: 0, total: 0, derniere: null }) }));
  }, []);

  const lignes = useMemo(() => {
    const r = recherche.toLowerCase();
    const l = (donnees ?? []).filter((c) => !r || [c.nom, c.telephone, c.email].some((v) => v?.toLowerCase().includes(r)));
    const cle = { depense: (c) => -c.total, commandes: (c) => -c.nb, recents: (c) => -new Date(c.created_at), points: (c) => -c.points_fidelite }[tri];
    return [...l].sort((a, b) => cle(a) - cle(b));
  }, [donnees, recherche, tri]);

  const { donnees: historique } = useDonnees(
    () => (fiche ? sb(supabase.from('commandes').select('id, numero, montant_total, statut, created_at').eq('client_id', fiche.id).order('created_at', { ascending: false }).limit(50)) : Promise.resolve([])),
    [], [fiche?.id],
  );

  const diffuser = async (v) => {
    try { await post('/notifications/diffuser', v); message.success('Annonce envoyée à tous les clients'); setAnnonce(false); form.resetFields(); }
    catch (e) { message.error(e.message); }
  };

  return (
    <>
      <PageEntete titre="Clients" sousTitre={`${(donnees ?? []).length} clients inscrits`}
        actions={<>
          <Button icon={<NotificationOutlined />} onClick={() => setAnnonce(true)}>Envoyer une annonce</Button>
          <Button icon={<DownloadOutlined />} onClick={() => exporterCsv('clients.csv', [
            { titre: 'Nom', valeur: (c) => c.nom }, { titre: 'Téléphone', valeur: (c) => c.telephone }, { titre: 'Email', valeur: (c) => c.email },
            { titre: 'Commandes', valeur: (c) => c.nb }, { titre: 'Total dépensé', valeur: (c) => c.total }, { titre: 'Points', valeur: (c) => c.points_fidelite },
            { titre: 'Inscrit le', valeur: (c) => dateHeure(c.created_at) },
          ], lignes)}>Exporter</Button>
        </>} />
      <div className="carte" style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <Input allowClear prefix={<SearchOutlined />} placeholder="Nom, téléphone, email" style={{ width: 260 }} value={recherche} onChange={(e) => setRecherche(e.target.value)} />
          <Segmented value={tri} onChange={setTri} options={[
            { label: 'Meilleurs clients', value: 'depense' }, { label: 'Plus de commandes', value: 'commandes' },
            { label: 'Récents', value: 'recents' }, { label: 'Points', value: 'points' },
          ]} />
        </div>
        <Table rowKey="id" loading={chargement} dataSource={lignes} scroll={{ x: 800 }} pagination={{ pageSize: 25 }}
          onRow={(r) => ({ onClick: () => setFiche(r), style: { cursor: 'pointer' } })}
          columns={[
            { title: 'Client', render: (_, c) => (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Avatar src={c.avatar_url} style={{ background: '#E4572E' }}>{(c.nom || '?')[0]?.toUpperCase()}</Avatar>
                <div><div style={{ fontWeight: 600 }}>{c.nom || '—'}</div><div style={{ fontSize: 12, color: '#8A8F98' }}>{c.telephone || c.email}</div></div>
              </div>
            ) },
            { title: 'Commandes', dataIndex: 'nb', align: 'center' },
            { title: 'Total dépensé', dataIndex: 'total', align: 'right', render: (v) => <b>{fcfa(v)}</b> },
            { title: 'Points', dataIndex: 'points_fidelite', align: 'center', render: (p) => <Tag color="gold">{p} pts</Tag> },
            { title: 'Dernière commande', dataIndex: 'derniere', render: depuis },
            { title: 'Inscrit', dataIndex: 'created_at', render: depuis },
          ]} />
      </div>

      <Drawer open={!!fiche} onClose={() => setFiche(null)} size={460} title={fiche?.nom || 'Client'}>
        {fiche && (
          <>
            <p>📞 <a href={`tel:${fiche.telephone}`}>{fiche.telephone || '—'}</a><br />✉️ {fiche.email || '—'}<br />Inscrit le {dateHeure(fiche.created_at)}</p>
            <div style={{ display: 'flex', gap: 12, margin: '16px 0' }}>
              {[['Commandes', fiche.nb], ['Dépensé', fcfa(fiche.total)], ['Points', fiche.points_fidelite]].map(([l, v]) => (
                <div key={l} className="carte" style={{ padding: 12, flex: 1 }}><div style={{ fontSize: 12, color: '#8A8F98' }}>{l}</div><b>{v}</b></div>
              ))}
            </div>
            <div style={{ fontWeight: 650, marginBottom: 8 }}>Historique</div>
            {(historique ?? []).map((c) => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div><b>{c.numero}</b><div style={{ fontSize: 12, color: '#8A8F98' }}>{dateHeure(c.created_at)}</div></div>
                <div style={{ textAlign: 'right' }}>{fcfa(c.montant_total)}<br /><TagStatut statut={c.statut} /></div>
              </div>
            ))}
          </>
        )}
      </Drawer>

      <Modal open={annonce} title="Annonce à tous les clients" okText="Envoyer" onCancel={() => setAnnonce(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={diffuser}>
          <Form.Item name="titre" label="Titre" rules={[{ required: true, max: 80 }]}><Input placeholder="Happy hour ce soir 🍻" /></Form.Item>
          <Form.Item name="message" label="Message" rules={[{ required: true, max: 300 }]}><Input.TextArea rows={3} showCount maxLength={300} /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}
