import { useState } from 'react';
import { App, Button, Input, Modal, Rate, Segmented, Space, Switch, Table, Tag } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import { PageEntete } from '../components/ui';
import { supabase } from '../lib/supabase';
import { sb, signalerModification, useDonnees } from '../lib/hooks';
import { dateHeure } from '../lib/format';

export default function Avis() {
  const { message } = App.useApp();
  const [filtre, setFiltre] = useState('tous');
  const [reponse, setReponse] = useState(null);
  const [texte, setTexte] = useState('');

  const { donnees, chargement } = useDonnees(() => {
    let q = supabase.from('avis').select('*, plats(nom_fr), commandes(numero)').order('created_at', { ascending: false }).limit(300);
    if (filtre === 'sans_reponse') q = q.is('reponse', null);
    if (filtre === 'negatifs') q = q.lte('note', 2);
    return sb(q);
  }, ['avis'], [filtre]);

  const maj = async (id, valeurs, ok) => {
    try { await sb(supabase.from('avis').update(valeurs).eq('id', id)); signalerModification(); message.success(ok); } catch (e) { message.error(e.message); }
  };

  const moyenne = donnees?.length ? (donnees.reduce((a, x) => a + x.note, 0) / donnees.length).toFixed(1) : '—';

  return (
    <>
      <PageEntete titre="Avis clients" sousTitre={`Note moyenne affichée : ${moyenne} / 5`}
        actions={<Segmented value={filtre} onChange={setFiltre} options={[
          { label: 'Tous', value: 'tous' }, { label: 'Sans réponse', value: 'sans_reponse' }, { label: '1–2 ★', value: 'negatifs' },
        ]} />} />
      <div className="carte" style={{ padding: 16 }}>
        <Table rowKey="id" loading={chargement} dataSource={donnees ?? []} scroll={{ x: 900 }}
          columns={[
            { title: 'Note', dataIndex: 'note', width: 150, render: (n) => <Rate disabled value={n} style={{ fontSize: 14 }} /> },
            { title: 'Avis', render: (_, a) => (
              <>
                <div>{a.commentaire || <i style={{ color: '#9aa0ab' }}>Sans commentaire</i>}</div>
                <div style={{ fontSize: 12, color: '#8A8F98', marginTop: 4 }}>
                  {a.client_nom || 'Client'} · {a.plats?.nom_fr ? `Plat : ${a.plats.nom_fr}` : `Commande ${a.commandes?.numero ?? ''}`} · {dateHeure(a.created_at)}
                </div>
                {a.reponse && <div style={{ marginTop: 6, padding: '6px 10px', background: '#fff8f5', borderRadius: 8, fontSize: 13 }}><b>Votre réponse :</b> {a.reponse}</div>}
              </>
            ) },
            { title: 'Visible', dataIndex: 'visible', width: 90, render: (v, a) => <Switch size="small" checked={v} onChange={(x) => maj(a.id, { visible: x }, x ? 'Avis publié' : 'Avis masqué')} /> },
            { title: '', width: 120, render: (_, a) => (
              <Button size="small" icon={<MessageOutlined />} onClick={() => { setReponse(a); setTexte(a.reponse ?? ''); }}>
                {a.reponse ? 'Modifier' : 'Répondre'}
              </Button>
            ) },
          ]} />
      </div>
      <Modal open={!!reponse} title="Répondre à l’avis" okText="Publier la réponse" onCancel={() => setReponse(null)}
        onOk={async () => { await maj(reponse.id, { reponse: texte.trim() || null, repondu_at: new Date().toISOString() }, 'Réponse publiée'); setReponse(null); }}>
        {reponse && (
          <Space orientation="vertical" style={{ width: '100%' }}>
            <div><Rate disabled value={reponse.note} style={{ fontSize: 14 }} /> <Tag>{reponse.client_nom}</Tag></div>
            <div style={{ color: '#4b5563' }}>{reponse.commentaire}</div>
            <Input.TextArea rows={4} value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Merci pour votre retour…" maxLength={500} showCount />
            <div style={{ fontSize: 12, color: '#8A8F98' }}>Le client reçoit une notification avec votre réponse.</div>
          </Space>
        )}
      </Modal>
    </>
  );
}
