import { Button, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Tag } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { ImageUpload, PageEntete, Vignette } from '../components/ui';
import { supabase } from '../lib/supabase';
import { sb, useDonnees } from '../lib/hooks';
import { useEdition } from '../lib/crud';
import { TYPES_CATEGORIE } from '../lib/format';

const ICONES = [
  ['outdoor_grill', 'Grillades 🔥'], ['lunch_dining', 'Plats 🍔'], ['set_meal', 'Poissons 🐟'], ['rice_bowl', 'Accompagnements 🍚'],
  ['local_pizza', 'Pizzas 🍕'], ['local_drink', 'Boissons 🥤'], ['wine_bar', 'Vins 🍷'], ['local_bar', 'Cocktails 🍸'],
  ['icecream', 'Desserts 🍨'], ['eco', 'Salades 🥗'], ['soup_kitchen', 'Soupes 🍲'], ['bakery_dining', 'Entrées 🥐'],
];

export default function Categories() {
  const { donnees, chargement } = useDonnees(
    () => sb(supabase.from('categories').select('*, plats(count)').order('ordre_affichage').order('nom_fr')), ['categories', 'plats']);
  const e = useEdition('categories', { defauts: { type: 'plat', actif: true, ordre_affichage: (donnees?.length ?? 0) + 1 } });

  const deplacer = async (i, sens) => {
    const l = donnees; const j = i + sens;
    if (j < 0 || j >= l.length) return;
    await Promise.all([e.basculer(l[i].id, 'ordre_affichage', j + 1), e.basculer(l[j].id, 'ordre_affichage', i + 1)]);
  };

  return (
    <>
      <PageEntete titre="Catégories" sousTitre="L’ordre définit l’affichage dans l’application."
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => e.ouvrir()}>Ajouter</Button>} />
      <div className="carte" style={{ padding: 16 }}>
        <Table rowKey="id" loading={chargement} dataSource={donnees ?? []} pagination={false} scroll={{ x: 700 }}
          columns={[
            { title: 'Ordre', width: 90, render: (_, r, i) => (
              <Space size={2}>
                <Button size="small" type="text" icon={<ArrowUpOutlined />} disabled={i === 0} onClick={() => deplacer(i, -1)} />
                <Button size="small" type="text" icon={<ArrowDownOutlined />} disabled={i === donnees.length - 1} onClick={() => deplacer(i, 1)} />
              </Space>
            ) },
            { title: '', dataIndex: 'image_url', width: 60, render: (u) => <Vignette src={u} taille={38} /> },
            { title: 'Nom', dataIndex: 'nom_fr', render: (t) => <b>{t}</b> },
            { title: 'Type', dataIndex: 'type', render: (t) => <Tag>{TYPES_CATEGORIE.find((x) => x.value === t)?.label ?? t}</Tag> },
            { title: 'Plats', render: (_, r) => r.plats?.[0]?.count ?? 0 },
            { title: 'Visible', dataIndex: 'actif', render: (v, r) => <Switch size="small" checked={v} onChange={(x) => e.basculer(r.id, 'actif', x)} /> },
            { title: '', width: 96, render: (_, r) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => e.ouvrir(r)} />
                <Popconfirm title="Supprimer cette catégorie ?" description="Les plats resteront, sans catégorie." onConfirm={() => e.supprimer(r.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ) },
          ]} />
      </div>
      <Modal open={!!e.edition} title={e.edition?.id ? 'Modifier la catégorie' : 'Nouvelle catégorie'} onCancel={e.fermer}
        onOk={() => e.form.submit()} okText="Enregistrer" confirmLoading={e.enregistrement} destroyOnHidden>
        <Form form={e.form} layout="vertical" onFinish={(v) => e.enregistrer({ ...v, plats: undefined })}>
          <Form.Item name="nom_fr" label="Nom" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}><Select options={TYPES_CATEGORIE} /></Form.Item>
          <Form.Item name="icone" label="Icône dans l’application"><Select allowClear options={ICONES.map(([v, l]) => ({ value: v, label: l }))} /></Form.Item>
          <Form.Item name="description" label="Description"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="image_url" label="Image (optionnelle)"><ImageUpload dossier="categories" /></Form.Item>
          <Space>
            <Form.Item name="ordre_affichage" label="Ordre"><InputNumber /></Form.Item>
            <Form.Item name="actif" label="Visible" valuePropName="checked"><Switch /></Form.Item>
          </Space>
        </Form>
      </Modal>
    </>
  );
}
