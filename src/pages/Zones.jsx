import { useState } from 'react';
import { Button, Col, Form, Input, InputNumber, Modal, Popconfirm, Row, Space, Switch, Table } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useMapEvents } from 'react-leaflet';
import { PageEntete } from '../components/ui';
import Carte from '../components/Carte';
import { ICONES } from '../components/icones';
import { supabase } from '../lib/supabase';
import { sb, useDonnees } from '../lib/hooks';
import { useEdition } from '../lib/crud';
import { fcfa } from '../lib/format';

export default function Zones() {
  const { donnees, chargement } = useDonnees(() => sb(supabase.from('zones_livraison').select('*').order('ordre').order('nom')), ['zones_livraison']);
  const { donnees: resto } = useDonnees(() => sb(supabase.from('parametres').select('latitude, longitude').eq('id', 1).single()), []);
  const e = useEdition('zones-livraison', { defauts: { frais: 500, delai_min: 30, actif: true, ordre: 0 } });
  const [selection, setSelection] = useState(null);
  const centre = resto ? [resto.latitude, resto.longitude] : [6.1319, 1.2228];

  return (
    <>
      <PageEntete titre="Zones de livraison" sousTitre="Le client choisit son quartier : les frais et le délai s’appliquent automatiquement."
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => e.ouvrir()}>Ajouter une zone</Button>} />
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <div className="carte" style={{ padding: 16 }}>
            <Table rowKey="id" loading={chargement} dataSource={donnees ?? []} pagination={false} scroll={{ x: 600 }}
              onRow={(r) => ({ onMouseEnter: () => setSelection(r.id) })}
              columns={[
                { title: 'Quartier', dataIndex: 'nom', render: (t) => <b>{t}</b> },
                { title: 'Frais', dataIndex: 'frais', align: 'right', render: fcfa },
                { title: 'Délai', dataIndex: 'delai_min', render: (v) => `${v} min` },
                { title: 'Active', dataIndex: 'actif', render: (v, r) => <Switch size="small" checked={v} onChange={(x) => e.basculer(r.id, 'actif', x)} /> },
                { title: '', width: 96, render: (_, r) => (
                  <Space>
                    <Button size="small" icon={<EditOutlined />} onClick={() => e.ouvrir(r)} />
                    <Popconfirm title="Supprimer cette zone ?" onConfirm={() => e.supprimer(r.id)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm>
                  </Space>
                ) },
              ]} />
          </div>
        </Col>
        <Col xs={24} xl={10}>
          <div className="carte" style={{ padding: 6 }}>
            <Carte centre={centre} hauteur={480} marqueurs={[
              { cle: 'r', position: centre, icone: ICONES.restaurant, popup: 'Restaurant' },
              ...(donnees ?? []).filter((z) => z.latitude).map((z) => ({
                cle: z.id, position: [z.latitude, z.longitude], icone: z.id === selection ? ICONES.livreur : ICONES.client,
                popup: `${z.nom} · ${fcfa(z.frais)}`,
              })),
            ]} />
          </div>
        </Col>
      </Row>
      <Modal open={!!e.edition} title={e.edition?.id ? 'Modifier la zone' : 'Nouvelle zone'} onCancel={e.fermer}
        onOk={() => e.form.submit()} okText="Enregistrer" confirmLoading={e.enregistrement} width={640} destroyOnHidden>
        <Form form={e.form} layout="vertical" onFinish={e.enregistrer}>
          <Form.Item name="nom" label="Quartier" rules={[{ required: true }]}><Input /></Form.Item>
          <Row gutter={12}>
            <Col span={8}><Form.Item name="frais" label="Frais" rules={[{ required: true }]}><InputNumber min={0} step={100} style={{ width: '100%' }} suffix="FCFA" /></Form.Item></Col>
            <Col span={8}><Form.Item name="delai_min" label="Délai"><InputNumber min={0} style={{ width: '100%' }} suffix="min" /></Form.Item></Col>
            <Col span={4}><Form.Item name="ordre" label="Ordre"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={4}><Form.Item name="actif" label="Active" valuePropName="checked"><Switch /></Form.Item></Col>
            <Col span={12}><Form.Item name="latitude" label="Latitude"><InputNumber style={{ width: '100%' }} step={0.001} /></Form.Item></Col>
            <Col span={12}><Form.Item name="longitude" label="Longitude"><InputNumber style={{ width: '100%' }} step={0.001} /></Form.Item></Col>
          </Row>
          <div style={{ fontSize: 12.5, color: '#6b7280', marginBottom: 6 }}>Cliquez sur la carte pour placer le centre du quartier :</div>
          <ChoixPosition form={e.form} centre={centre} />
        </Form>
      </Modal>
    </>
  );
}

function Clic({ onClic }) {
  useMapEvents({ click: (ev) => onClic(+ev.latlng.lat.toFixed(5), +ev.latlng.lng.toFixed(5)) });
  return null;
}

function ChoixPosition({ form, centre }) {
  const lat = Form.useWatch('latitude', form);
  const lng = Form.useWatch('longitude', form);
  return (
    <Carte centre={lat ? [lat, lng] : centre} hauteur={220}
      marqueurs={lat ? [{ cle: 'p', position: [lat, lng], icone: ICONES.client }] : []}>
      <Clic onClic={(a, b) => form.setFieldsValue({ latitude: a, longitude: b })} />
    </Carte>
  );
}
