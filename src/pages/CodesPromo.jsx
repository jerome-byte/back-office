import { Button, Col, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Progress, Row, Segmented, Space, Switch, Table, Tag } from 'antd';
import { CopyOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { App } from 'antd';
import { PageEntete } from '../components/ui';
import { supabase } from '../lib/supabase';
import { sb, useDonnees } from '../lib/hooks';
import { useEdition } from '../lib/crud';
import { dayjs, fcfa } from '../lib/format';

export default function CodesPromo() {
  const { message } = App.useApp();
  const { donnees, chargement } = useDonnees(() => sb(supabase.from('codes_promo').select('*').order('created_at', { ascending: false })), []);
  const e = useEdition('codes-promo', {
    defauts: { type: 'pourcentage', valeur: 10, minimum_commande: 0, utilisations_par_client: 1, actif: true, premiere_commande_only: false },
    versFormulaire: (x) => ({ ...x, periode: [x.date_debut ? dayjs(x.date_debut) : null, x.date_fin ? dayjs(x.date_fin) : null] }),
    versApi: ({ periode, ...v }) => ({ ...v, code: v.code.trim().toUpperCase(), date_debut: periode?.[0]?.toISOString() ?? null, date_fin: periode?.[1]?.toISOString() ?? null }),
  });
  const type = Form.useWatch('type', e.form);

  const etat = (c) => {
    if (!c.actif) return <Tag>Désactivé</Tag>;
    if (c.date_fin && dayjs(c.date_fin).isBefore(dayjs())) return <Tag color="red">Expiré</Tag>;
    if (c.date_debut && dayjs(c.date_debut).isAfter(dayjs())) return <Tag color="blue">Programmé</Tag>;
    if (c.utilisations_max && c.nb_utilisations >= c.utilisations_max) return <Tag color="red">Épuisé</Tag>;
    return <Tag color="green">Actif</Tag>;
  };

  return (
    <>
      <PageEntete titre="Codes promo" sousTitre="Les clients saisissent le code au moment de payer. La réduction est calculée par le serveur."
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => e.ouvrir()}>Nouveau code</Button>} />
      <div className="carte" style={{ padding: 16 }}>
        <Table rowKey="id" loading={chargement} dataSource={donnees ?? []} scroll={{ x: 900 }}
          columns={[
            { title: 'Code', dataIndex: 'code', render: (c) => (
              <Space><Tag color="volcano" style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>{c}</Tag>
                <CopyOutlined style={{ color: '#9aa0ab', cursor: 'pointer' }} onClick={() => { navigator.clipboard?.writeText(c); message.success('Copié'); }} /></Space>
            ) },
            { title: 'Réduction', render: (_, c) => <b>{c.type === 'pourcentage' ? `-${Number(c.valeur)} %` : `-${fcfa(c.valeur)}`}</b> },
            { title: 'Conditions', render: (_, c) => (
              <span style={{ fontSize: 12.5, color: '#6b7280' }}>
                {Number(c.minimum_commande) > 0 && `Dès ${fcfa(c.minimum_commande)} · `}
                {c.reduction_max && `max ${fcfa(c.reduction_max)} · `}
                {c.utilisations_par_client}× / client{c.premiere_commande_only && ' · 1ʳᵉ commande'}
              </span>
            ) },
            { title: 'Validité', render: (_, c) => <span style={{ fontSize: 12.5 }}>{c.date_debut ? dayjs(c.date_debut).format('DD/MM/YY') : '…'} → {c.date_fin ? dayjs(c.date_fin).format('DD/MM/YY') : '∞'}</span> },
            { title: 'Utilisations', width: 160, render: (_, c) => (c.utilisations_max
              ? <Progress percent={Math.round((c.nb_utilisations / c.utilisations_max) * 100)} size="small" format={() => `${c.nb_utilisations}/${c.utilisations_max}`} />
              : `${c.nb_utilisations} utilisation(s)`) },
            { title: 'État', render: (_, c) => etat(c) },
            { title: '', width: 140, render: (_, c) => (
              <Space>
                <Switch size="small" checked={c.actif} onChange={(v) => e.basculer(c.id, 'actif', v)} />
                <Button size="small" icon={<EditOutlined />} onClick={() => e.ouvrir(c)} />
                <Popconfirm title="Supprimer ce code ?" onConfirm={() => e.supprimer(c.id)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm>
              </Space>
            ) },
          ]} />
      </div>
      <Modal open={!!e.edition} title={e.edition?.id ? 'Modifier le code' : 'Nouveau code promo'} onCancel={e.fermer}
        onOk={() => e.form.submit()} okText="Enregistrer" confirmLoading={e.enregistrement} width={620} destroyOnHidden>
        <Form form={e.form} layout="vertical" onFinish={e.enregistrer}>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="code" label="Code" rules={[{ required: true }, { pattern: /^[A-Za-z0-9_-]{3,20}$/, message: '3 à 20 lettres/chiffres' }]}>
              <Input style={{ textTransform: 'uppercase', fontFamily: 'monospace' }} placeholder="NOEL2026" />
            </Form.Item></Col>
            <Col span={12}><Form.Item name="type" label="Type">
              <Segmented block options={[{ label: 'Pourcentage', value: 'pourcentage' }, { label: 'Montant fixe', value: 'montant' }]} />
            </Form.Item></Col>
            <Col span={12}><Form.Item name="valeur" label={type === 'montant' ? 'Montant (FCFA)' : 'Pourcentage'} rules={[{ required: true }]}>
              <InputNumber min={1} max={type === 'pourcentage' ? 100 : undefined} style={{ width: '100%' }} suffix={type === 'montant' ? 'FCFA' : '%'} />
            </Form.Item></Col>
            <Col span={12}><Form.Item name="reduction_max" label="Plafond de réduction"><InputNumber min={0} style={{ width: '100%' }} disabled={type === 'montant'} placeholder="Aucun" suffix="FCFA" /></Form.Item></Col>
            <Col span={12}><Form.Item name="minimum_commande" label="Code valable dès" extra="Montant d’achat requis pour ce code · 0 = sans condition"><InputNumber min={0} style={{ width: '100%' }} suffix="FCFA" /></Form.Item></Col>
            <Col span={12}><Form.Item name="periode" label="Validité">
              <DatePicker.RangePicker format="DD/MM/YY" style={{ width: '100%' }} allowEmpty={[true, true]} />
            </Form.Item></Col>
            <Col span={8}><Form.Item name="utilisations_max" label="Total max"><InputNumber min={1} style={{ width: '100%' }} placeholder="∞" /></Form.Item></Col>
            <Col span={8}><Form.Item name="utilisations_par_client" label="Par client"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="premiere_commande_only" label="1ʳᵉ commande" valuePropName="checked"><Switch /></Form.Item></Col>
          </Row>
          <Form.Item name="description" label="Description (affichée au client)"><Input placeholder="-15 % sur votre première commande" /></Form.Item>
          <Form.Item name="actif" label="Actif" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}
