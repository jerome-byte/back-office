import { useState } from 'react';
import { App, Button, DatePicker, Dropdown, Form, Input, InputNumber, Modal, Popconfirm, Segmented, Select, Space, Switch, Table, Tabs, Tag } from 'antd';
import { DeleteOutlined, EditOutlined, MoreOutlined, PlusOutlined } from '@ant-design/icons';
import { PageEntete, TagReservation } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { del, patch, post } from '../lib/api';
import { sb, signalerModification, useDonnees } from '../lib/hooks';
import { dayjs, STATUTS_RESERVATION } from '../lib/format';

const ZONES = ['Intérieur', 'Terrasse', 'Salon privé'];

export default function Reservations() {
  const { peut } = useAuth();
  return (
    <>
      <PageEntete titre="Réservations" sousTitre="Confirmez les demandes, attribuez une table et suivez l’arrivée des clients." />
      <Tabs items={[
        { key: 'r', label: 'Réservations', children: <ListeReservations modifiable={peut('admin', 'gerant')} /> },
        ...(peut('admin', 'gerant') ? [{ key: 't', label: 'Plan des tables', children: <Tables /> }] : []),
      ]} />
    </>
  );
}

function ListeReservations({ modifiable }) {
  const { message } = App.useApp();
  const [vue, setVue] = useState('aujourdhui');
  const [jour, setJour] = useState(dayjs());
  const [creation, setCreation] = useState(false);
  const [form] = Form.useForm();

  const bornes = () => {
    if (vue === 'aujourdhui') return [dayjs().startOf('day'), dayjs().endOf('day')];
    if (vue === 'a_venir') return [dayjs().startOf('day'), dayjs().add(60, 'day')];
    if (vue === 'jour') return [jour.startOf('day'), jour.endOf('day')];
    return [dayjs().subtract(60, 'day'), dayjs()];
  };

  const { donnees, chargement } = useDonnees(async () => {
    const [d, f] = bornes();
    let q = supabase.from('reservations').select('*, tables_restaurant(numero, zone)')
      .gte('date_heure', d.toISOString()).lte('date_heure', f.toISOString())
      .order('date_heure', { ascending: vue !== 'passees' });
    if (vue === 'a_traiter') q = supabase.from('reservations').select('*, tables_restaurant(numero, zone)').eq('statut', 'en_attente').order('date_heure');
    return sb(q);
  }, ['reservations'], [vue, jour.valueOf()]);

  const { donnees: tables } = useDonnees(() => sb(supabase.from('tables_restaurant').select('*').eq('actif', true).order('numero')), []);

  const maj = async (id, valeurs, ok) => {
    try { await patch(`/reservations/${id}`, valeurs); message.success(ok); } catch (e) { message.error(e.message); }
  };

  const creer = async (v) => {
    try {
      await sb(supabase.from('reservations').insert({
        client_nom: v.client_nom, client_phone: v.client_phone, nombre_personnes: v.nombre_personnes,
        date_heure: v.date_heure.toISOString(), zone: v.zone, notes: v.notes ?? null, occasion: v.occasion ?? null, statut: 'confirmee',
      }));
      signalerModification(); message.success('Réservation ajoutée'); setCreation(false); form.resetFields();
    } catch (e) { message.error(e.message); }
  };

  const couverts = (donnees ?? []).filter((r) => ['en_attente', 'confirmee', 'arrivee'].includes(r.statut)).reduce((a, r) => a + r.nombre_personnes, 0);

  return (
    <div className="carte" style={{ padding: 16 }}>
      <Space wrap style={{ marginBottom: 14, width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <Segmented value={vue} onChange={setVue} options={[
            { label: "Aujourd'hui", value: 'aujourdhui' }, { label: 'À traiter', value: 'a_traiter' },
            { label: 'À venir', value: 'a_venir' }, { label: 'Un jour…', value: 'jour' }, { label: 'Passées', value: 'passees' },
          ]} />
          {vue === 'jour' && <DatePicker value={jour} onChange={(d) => d && setJour(d)} format="DD/MM/YYYY" allowClear={false} />}
          <Tag color="blue" style={{ padding: '4px 10px' }}>{couverts} couverts attendus</Tag>
        </Space>
        {modifiable && <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreation(true)}>Réservation téléphonique</Button>}
      </Space>

      <Table rowKey="id" loading={chargement} dataSource={donnees ?? []} scroll={{ x: 900 }} pagination={{ pageSize: 30 }}
        columns={[
          { title: 'Date', dataIndex: 'date_heure', width: 150, render: (d) => <><b>{dayjs(d).format('HH:mm')}</b> <span style={{ color: '#8A8F98' }}>{dayjs(d).format('ddd DD/MM')}</span></> },
          { title: 'Client', render: (_, r) => <><div style={{ fontWeight: 500 }}>{r.client_nom}</div><a href={`tel:${r.client_phone}`} style={{ fontSize: 12 }}>{r.client_phone}</a></> },
          { title: 'Pers.', dataIndex: 'nombre_personnes', width: 70, align: 'center', render: (n) => <b>{n}</b> },
          { title: 'Zone', dataIndex: 'zone', width: 120, render: (z) => <Tag variant="filled">{z}</Tag> },
          { title: 'Table', width: 150, render: (_, r) => (modifiable && !['annulee', 'terminee', 'absent'].includes(r.statut) ? (
            <Select size="small" style={{ width: 130 }} placeholder="Attribuer" allowClear value={r.table_id ?? undefined}
              options={(tables ?? []).map((t) => ({ value: t.id, label: `${t.numero} · ${t.capacite} pl.${t.capacite < r.nombre_personnes ? ' ⚠' : ''}` }))}
              onChange={(v) => maj(r.id, { table_id: v ?? null }, 'Table attribuée')} />
          ) : r.tables_restaurant?.numero ?? '—') },
          { title: 'Occasion / notes', render: (_, r) => <span style={{ fontSize: 12.5 }}>{[r.occasion, r.notes].filter(Boolean).join(' · ') || '—'}</span> },
          { title: 'Statut', dataIndex: 'statut', width: 130, render: (s) => <TagReservation statut={s} /> },
          ...(modifiable ? [{ title: '', width: 160, render: (_, r) => (
            <Space>
              {r.statut === 'en_attente' && <Button size="small" type="primary" onClick={() => maj(r.id, { statut: 'confirmee' }, 'Réservation confirmée')}>Confirmer</Button>}
              {r.statut === 'confirmee' && <Button size="small" onClick={() => maj(r.id, { statut: 'arrivee' }, 'Client installé')}>Arrivé</Button>}
              {r.statut === 'arrivee' && <Button size="small" onClick={() => maj(r.id, { statut: 'terminee' }, 'Terminée')}>Terminer</Button>}
              <Dropdown trigger={['click']} menu={{ items: Object.entries(STATUTS_RESERVATION).filter(([k]) => k !== r.statut).map(([k, s]) => ({
                key: k, label: s.label, danger: k === 'annulee' || k === 'absent', onClick: () => maj(r.id, { statut: k }, s.label),
              })) }}>
                <Button size="small" icon={<MoreOutlined />} />
              </Dropdown>
            </Space>
          ) }] : []),
        ]} />

      <Modal open={creation} title="Nouvelle réservation" onCancel={() => setCreation(false)} onOk={() => form.submit()} okText="Enregistrer" destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={creer} initialValues={{ nombre_personnes: 2, zone: 'Intérieur' }}>
          <Form.Item name="client_nom" label="Nom" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="client_phone" label="Téléphone" rules={[{ required: true }]}><Input /></Form.Item>
          <Space.Compact block>
            <Form.Item name="date_heure" label="Date et heure" rules={[{ required: true }]} style={{ flex: 2 }}>
              <DatePicker showTime={{ format: 'HH:mm', minuteStep: 15 }} format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="nombre_personnes" label="Personnes" rules={[{ required: true }]} style={{ flex: 1, marginLeft: 8 }}>
              <InputNumber min={1} max={100} style={{ width: '100%' }} />
            </Form.Item>
          </Space.Compact>
          <Form.Item name="zone" label="Zone"><Select options={ZONES.map((z) => ({ value: z, label: z }))} /></Form.Item>
          <Form.Item name="occasion" label="Occasion"><Input placeholder="Anniversaire, dîner d'affaires…" /></Form.Item>
          <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function Tables() {
  const { message } = App.useApp();
  const [edition, setEdition] = useState(null);
  const [form] = Form.useForm();
  const { donnees, chargement } = useDonnees(() => sb(supabase.from('tables_restaurant').select('*').order('zone').order('numero')), ['tables_restaurant']);

  const ouvrir = (t) => { setEdition(t ?? {}); form.setFieldsValue(t ?? { zone: 'Intérieur', capacite: 4, actif: true }); };
  const enregistrer = async (v) => {
    try {
      if (edition?.id) await patch(`/tables/${edition.id}`, v); else await post('/tables', v);
      message.success('Table enregistrée'); setEdition(null);
    } catch (e) { message.error(e.message); }
  };

  const total = (donnees ?? []).filter((t) => t.actif).reduce((a, t) => a + t.capacite, 0);

  return (
    <div className="carte" style={{ padding: 16 }}>
      <Space style={{ marginBottom: 14, width: '100%', justifyContent: 'space-between' }}>
        <span style={{ color: '#6b7280' }}>{(donnees ?? []).length} tables · {total} places</span>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => ouvrir()}>Ajouter une table</Button>
      </Space>
      {ZONES.concat([...new Set((donnees ?? []).map((t) => t.zone))].filter((z) => !ZONES.includes(z))).map((zone) => {
        const liste = (donnees ?? []).filter((t) => t.zone === zone);
        if (!liste.length && chargement) return null;
        return (
          <div key={zone} style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 650, marginBottom: 8 }}>{zone}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {liste.map((t) => (
                <div key={t.id} onClick={() => ouvrir(t)} style={{
                  width: 110, padding: 12, borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                  border: '1px solid #eceef2', background: t.actif ? '#fff' : '#f5f5f5', opacity: t.actif ? 1 : 0.6,
                }}>
                  <div style={{ fontWeight: 750, fontSize: 18 }}>{t.numero}</div>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>{t.capacite} places</div>
                </div>
              ))}
              {!liste.length && <span style={{ color: '#9aa0ab', fontSize: 13 }}>Aucune table</span>}
            </div>
          </div>
        );
      })}
      <Modal open={!!edition} title={edition?.id ? `Table ${edition.numero}` : 'Nouvelle table'} onCancel={() => setEdition(null)}
        destroyOnHidden footer={[
          edition?.id && (
            <Popconfirm key="d" title="Supprimer cette table ?" onConfirm={async () => {
              try { await del(`/tables/${edition.id}`); setEdition(null); message.success('Supprimée'); } catch (e) { message.error(e.message); }
            }}><Button danger icon={<DeleteOutlined />}>Supprimer</Button></Popconfirm>
          ),
          <Button key="ok" type="primary" icon={<EditOutlined />} onClick={() => form.submit()}>Enregistrer</Button>,
        ]}>
        <Form form={form} layout="vertical" onFinish={enregistrer}>
          <Form.Item name="numero" label="Numéro / nom" rules={[{ required: true }]}><Input placeholder="T7" /></Form.Item>
          <Form.Item name="zone" label="Zone" rules={[{ required: true }]}>
            <Select options={ZONES.map((z) => ({ value: z, label: z }))} />
          </Form.Item>
          <Form.Item name="capacite" label="Nombre de places" rules={[{ required: true }]}><InputNumber min={1} max={50} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="actif" label="Disponible" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
