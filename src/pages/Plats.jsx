import { useMemo, useState } from 'react';
import { Button, Col, Form, Input, InputNumber, Modal, Popconfirm, Row, Segmented, Select, Space, Switch, Table, Tag, Tooltip } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined, StarFilled } from '@ant-design/icons';
import { ImageUpload, PageEntete, Vignette } from '../components/ui';
import { supabase } from '../lib/supabase';
import { sb, useDonnees } from '../lib/hooks';
import { useEdition } from '../lib/crud';
import { fcfa } from '../lib/format';

export default function Plats() {
  const [recherche, setRecherche] = useState('');
  const [categorie, setCategorie] = useState('toutes');
  const { donnees: plats, chargement } = useDonnees(
    () => sb(supabase.from('plats').select('*, categories(id, nom_fr)').order('ordre_affichage').order('nom_fr')), ['plats']);
  const { donnees: categories } = useDonnees(
    () => sb(supabase.from('categories').select('id, nom_fr, type').order('ordre_affichage')), ['categories']);
  const e = useEdition('plats', {
    defauts: { actif: true, temps_preparation: 15, ordre_affichage: 0 },
    versApi: (v) => ({ ...v, prix_promo: v.en_promo ? v.prix_promo : v.prix_promo ?? null }),
  });

  const lignes = useMemo(() => (plats ?? []).filter((p) =>
    (categorie === 'toutes' || p.categorie_id === categorie)
    && (!recherche || p.nom_fr.toLowerCase().includes(recherche.toLowerCase()))), [plats, categorie, recherche]);

  const enPromo = Form.useWatch('en_promo', e.form);

  return (
    <>
      <PageEntete titre="Plats" sousTitre={`${(plats ?? []).length} plats à la carte`}
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => e.ouvrir()}>Ajouter un plat</Button>} />
      <div className="carte" style={{ padding: 16 }}>
        <Space wrap style={{ marginBottom: 14 }}>
          <Segmented value={categorie} onChange={setCategorie}
            options={[{ label: 'Toutes', value: 'toutes' }, ...(categories ?? []).map((c) => ({ label: c.nom_fr, value: c.id }))]} />
          <Input allowClear prefix={<SearchOutlined />} placeholder="Rechercher" value={recherche} onChange={(x) => setRecherche(x.target.value)} style={{ width: 220 }} />
        </Space>
        <Table rowKey="id" loading={chargement} dataSource={lignes} scroll={{ x: 1000 }} pagination={{ pageSize: 20 }}
          columns={[
            { title: '', dataIndex: 'image_url', width: 64, render: (u) => <Vignette src={u} /> },
            { title: 'Plat', render: (_, p) => (
              <>
                <div style={{ fontWeight: 600, opacity: p.actif ? 1 : 0.55 }}>{p.nom_fr}</div>
                <Space size={4} wrap style={{ marginTop: 2 }}>
                  {!p.actif && <Tooltip title="Ce plat n’apparaît pas dans l’application. Activez « Visible » pour l’afficher."><Tag color="default">Masqué dans l’app</Tag></Tooltip>}
                  {p.en_rupture && <Tag color="volcano">Rupture</Tag>}
                  {p.est_specialite && <Tag color="orange">Spécialité</Tag>}
                  {p.est_populaire && <Tag color="blue">Populaire</Tag>}
                  {p.est_epice && <Tag color="red">Épicé</Tag>}
                  {p.est_vegetarien && <Tag color="green">Végé</Tag>}
                </Space>
              </>
            ) },
            { title: 'Catégorie', render: (_, p) => p.categories?.nom_fr ?? <Tag>Aucune</Tag> },
            { title: 'Prix', align: 'right', render: (_, p) => (p.en_promo && p.prix_promo != null ? (
              <><div style={{ textDecoration: 'line-through', color: '#9aa0ab', fontSize: 12 }}>{fcfa(p.prix)}</div><b style={{ color: '#E4572E' }}>{fcfa(p.prix_promo)}</b></>
            ) : <b>{fcfa(p.prix)}</b>), sorter: (a, b) => a.prix - b.prix },
            { title: 'Note', width: 90, render: (_, p) => (p.nb_avis ? <span><StarFilled style={{ color: '#D4A017' }} /> {Number(p.note_moyenne).toFixed(1)} <span style={{ color: '#9aa0ab' }}>({p.nb_avis})</span></span> : '—') },
            { title: 'Ventes', dataIndex: 'nb_ventes', width: 80, align: 'center', sorter: (a, b) => a.nb_ventes - b.nb_ventes },
            { title: 'Promo', width: 80, render: (_, p) => <Switch size="small" checked={p.en_promo} onChange={(v) => e.basculer(p.id, 'en_promo', v)} /> },
            { title: <Tooltip title="Disponible aujourd’hui (rupture de stock)">Stock</Tooltip>, width: 80, render: (_, p) => <Switch size="small" checked={!p.en_rupture} onChange={(v) => e.basculer(p.id, 'en_rupture', !v)} /> },
            { title: <Tooltip title="Affiché dans l’application client">Visible</Tooltip>, width: 80, render: (_, p) => <Switch size="small" checked={p.actif} onChange={(v) => e.basculer(p.id, 'actif', v)} /> },
            { title: '', width: 96, render: (_, p) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => e.ouvrir(p)} />
                <Popconfirm title="Supprimer ce plat ?" description="Préférez « Visible : non » pour garder l’historique." onConfirm={() => e.supprimer(p.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ) },
          ]} />
      </div>

      <Modal open={!!e.edition} title={e.edition?.id ? 'Modifier le plat' : 'Nouveau plat'} onCancel={e.fermer}
        onOk={() => e.form.submit()} okText="Enregistrer" confirmLoading={e.enregistrement} width={760} destroyOnHidden>
        <Form form={e.form} layout="vertical" onFinish={e.enregistrer}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="image_url" label="Photo"><ImageUpload dossier="plats" /></Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <Form.Item name="nom_fr" label="Nom" rules={[{ required: true, message: 'Nom requis' }]}><Input /></Form.Item>
              <Form.Item name="categorie_id" label="Catégorie" rules={[{ required: true, message: 'Choisissez une catégorie' }]}>
                <Select options={(categories ?? []).map((c) => ({ value: c.id, label: c.nom_fr }))} placeholder="Choisir" />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}><Form.Item name="prix" label="Prix (FCFA)" rules={[{ required: true }]}><InputNumber min={0} step={100} style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={12}><Form.Item name="temps_preparation" label="Préparation (min)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
              </Row>
            </Col>
          </Row>
          <Form.Item name="description_fr" label="Description"><Input.TextArea rows={2} maxLength={400} showCount /></Form.Item>
          <Form.Item name="ingredients" label="Ingrédients"><Input.TextArea rows={2} placeholder="Bœuf, sel, poivre…" /></Form.Item>
          <Row gutter={12}>
            <Col xs={12} md={6}><Form.Item name="est_specialite" label="Spécialité" valuePropName="checked"><Switch /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item name="est_populaire" label="Populaire" valuePropName="checked"><Switch /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item name="est_epice" label="Épicé" valuePropName="checked"><Switch /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item name="est_vegetarien" label="Végétarien" valuePropName="checked"><Switch /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item name="en_promo" label="En promotion" valuePropName="checked"><Switch /></Form.Item></Col>
            <Col xs={12} md={6}>
              <Form.Item name="prix_promo" label="Prix promo" rules={[{ required: !!enPromo, message: 'Prix promo requis' }]}>
                <InputNumber min={0} step={100} style={{ width: '100%' }} disabled={!enPromo} />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}><Form.Item name="calories" label="Calories"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item name="ordre_affichage" label="Ordre"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item name="actif" label="Visible" valuePropName="checked"><Switch /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
}
