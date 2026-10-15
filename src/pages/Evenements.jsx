import { Button, Col, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Row, Space, Switch, Table, Tag, Tooltip } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { ImageUpload, PageEntete, Vignette } from '../components/ui';
import { supabase } from '../lib/supabase';
import { sb, useDonnees } from '../lib/hooks';
import { useEdition } from '../lib/crud';
import { dayjs, dateHeure, fcfa } from '../lib/format';

export default function Evenements() {
  const { donnees, chargement } = useDonnees(() => sb(supabase.from('evenements').select('*').order('heure_debut', { ascending: false, nullsFirst: true })), ['evenements']);
  const e = useEdition('evenements', {
    defauts: { actif: true, prix_entree: 0 },
    versFormulaire: (x) => ({ ...x, periode: x.heure_debut ? [dayjs(x.heure_debut), x.heure_fin ? dayjs(x.heure_fin) : null] : null }),
    versApi: ({ periode, ...v }) => ({ ...v, heure_debut: periode?.[0]?.toISOString() ?? null, heure_fin: periode?.[1]?.toISOString() ?? null }),
  });
  const promo = Form.useWatch('promotion_active', e.form);

  return (
    <>
      <PageEntete titre="Événements & promotions" sousTitre="Affichés dans le carrousel de l’application. Les clients reçoivent une notification à la création."
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => e.ouvrir()}>Créer un événement</Button>} />
      <div className="carte" style={{ padding: 16 }}>
        <Table rowKey="id" loading={chargement} dataSource={donnees ?? []} scroll={{ x: 800 }}
          columns={[
            { title: '', dataIndex: 'image_url', width: 80, render: (u) => <Vignette src={u} taille={56} /> },
            { title: 'Événement', render: (_, r) => <><b>{r.nom}</b><div style={{ color: '#6b7280', fontSize: 12.5, maxWidth: 360 }}>{r.description}</div></> },
            { title: 'Date', render: (_, r) => (r.heure_debut ? <>{dateHeure(r.heure_debut)}{dayjs(r.heure_fin ?? r.heure_debut).isBefore(dayjs()) && <Tooltip title="Date dépassée : l’événement n’est plus affiché dans l’application. Modifiez la date pour le remettre en avant."><Tag color="red" style={{ marginLeft: 6 }}>Passé · masqué dans l’app</Tag></Tooltip>}</> : 'Permanent') },
            { title: 'Entrée', dataIndex: 'prix_entree', render: (p) => (Number(p) > 0 ? fcfa(p) : <Tag color="green">Gratuit</Tag>) },
            { title: 'Promo', render: (_, r) => (r.promotion_active ? <Tag color="red">{r.texte_promo || 'Promo'}</Tag> : '—') },
            { title: 'Visible', dataIndex: 'actif', render: (v, r) => <Switch size="small" checked={v} onChange={(x) => e.basculer(r.id, 'actif', x)} /> },
            { title: '', width: 96, render: (_, r) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => e.ouvrir(r)} />
                <Popconfirm title="Supprimer cet événement ?" onConfirm={() => e.supprimer(r.id)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm>
              </Space>
            ) },
          ]} />
      </div>
      <Modal open={!!e.edition} title={e.edition?.id ? 'Modifier l’événement' : 'Nouvel événement'} onCancel={e.fermer}
        onOk={() => e.form.submit()} okText="Enregistrer" confirmLoading={e.enregistrement} width={680} destroyOnHidden>
        <Form form={e.form} layout="vertical" onFinish={e.enregistrer}>
          <Row gutter={16}>
            <Col xs={24} md={9}><Form.Item name="image_url" label="Affiche"><ImageUpload dossier="evenements" ratio={4 / 3} /></Form.Item></Col>
            <Col xs={24} md={15}>
              <Form.Item name="nom" label="Nom" rules={[{ required: true }]}><Input placeholder="Soirée jazz & grillades" /></Form.Item>
              <Form.Item name="periode" label="Début et fin">
                <DatePicker.RangePicker showTime={{ format: 'HH:mm' }} format="DD/MM/YY HH:mm" style={{ width: '100%' }} allowEmpty={[false, true]} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Description"><Input.TextArea rows={3} /></Form.Item>
          <Row gutter={12}>
            <Col xs={12} md={8}><Form.Item name="prix_entree" label="Entrée (FCFA)"><InputNumber min={0} step={500} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={12} md={8}><Form.Item name="places_max" label="Places max"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={12} md={8}><Form.Item name="lieu" label="Lieu"><Input placeholder="Terrasse" /></Form.Item></Col>
            <Col xs={12} md={8}><Form.Item name="promotion_active" label="Promotion" valuePropName="checked"><Switch /></Form.Item></Col>
            <Col xs={24} md={16}><Form.Item name="texte_promo" label="Texte promo"><Input disabled={!promo} placeholder="-20 % sur les grillades" /></Form.Item></Col>
            <Col xs={12} md={8}><Form.Item name="actif" label="Visible" valuePropName="checked"><Switch /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
}
