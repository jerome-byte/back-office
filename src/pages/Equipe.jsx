import { useState } from 'react';
import { Alert, App, Avatar, Button, Form, Input, Modal, Select, Switch, Table, Tag } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { PageEntete } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { patch, post } from '../lib/api';
import { sb, useDonnees } from '../lib/hooks';
import { depuis, ROLES } from '../lib/format';

const OPTIONS_ROLES = ['admin', 'gerant', 'cuisine', 'livreur'].map((r) => ({ value: r, label: ROLES[r].label }));

export default function Equipe() {
  const { message } = App.useApp();
  const { profil, peut } = useAuth();
  const admin = peut('admin');
  const [creation, setCreation] = useState(false);
  const [promotion, setPromotion] = useState(false);
  const [form] = Form.useForm();
  const [formPromo] = Form.useForm();

  const { donnees, chargement } = useDonnees(() => sb(supabase.from('profiles').select('*').neq('role', 'client').order('role').order('nom')), ['profiles']);

  const maj = async (id, v, ok) => { try { await patch(`/equipe/${id}`, v); message.success(ok); } catch (e) { message.error(e.message); } };

  const creer = async (v) => {
    try { await post('/equipe', v); message.success('Compte créé. Communiquez l’email et le mot de passe au membre.'); setCreation(false); form.resetFields(); }
    catch (e) { message.error(e.message); }
  };

  // Donner un rôle à un client existant (ex. : un livreur qui a déjà l'app)
  const [recherche, setRecherche] = useState([]);
  const chercherClient = async (q) => {
    if (q.length < 2) return;
    const { data } = await supabase.from('profiles').select('id, nom, email, telephone').eq('role', 'client')
      .or(`nom.ilike.%${q}%,email.ilike.%${q}%,telephone.ilike.%${q}%`).limit(10);
    setRecherche(data ?? []);
  };

  return (
    <>
      <PageEntete titre="Équipe" sousTitre="Chaque membre se connecte avec son email. Son rôle définit ce qu’il voit."
        actions={admin && <>
          <Button onClick={() => setPromotion(true)}>Donner un rôle à un compte existant</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreation(true)}>Créer un compte</Button>
        </>} />
      {!admin && <Alert type="info" showIcon title="Seul un administrateur peut modifier l’équipe." style={{ marginBottom: 16 }} />}

      <div className="carte" style={{ padding: 16 }}>
        <Table rowKey="id" loading={chargement} dataSource={donnees ?? []} pagination={false} scroll={{ x: 700 }}
          columns={[
            { title: 'Membre', render: (_, m) => (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Avatar src={m.avatar_url} style={{ background: '#16181D' }}>{(m.nom || m.email || '?')[0].toUpperCase()}</Avatar>
                <div><div style={{ fontWeight: 600 }}>{m.nom || '—'} {m.id === profil.id && <Tag>vous</Tag>}</div><div style={{ fontSize: 12, color: '#8A8F98' }}>{m.email} {m.telephone && `· ${m.telephone}`}</div></div>
              </div>
            ) },
            { title: 'Rôle', dataIndex: 'role', width: 200, render: (r, m) => (admin && m.id !== profil.id
              ? <Select size="small" value={r} style={{ width: 170 }} options={[...OPTIONS_ROLES, { value: 'client', label: 'Retirer de l’équipe' }]}
                  onChange={(v) => maj(m.id, { role: v }, 'Rôle mis à jour')} />
              : <Tag color={ROLES[r]?.color}>{ROLES[r]?.label}</Tag>) },
            { title: 'Actif', dataIndex: 'actif', width: 90, render: (a, m) => <Switch size="small" checked={a} disabled={!admin || m.id === profil.id} onChange={(v) => maj(m.id, { actif: v }, v ? 'Compte réactivé' : 'Compte désactivé')} /> },
            { title: 'Depuis', dataIndex: 'created_at', width: 140, render: depuis },
          ]} />
      </div>

      <Modal open={creation} title="Nouveau membre de l’équipe" okText="Créer le compte" onCancel={() => setCreation(false)} onOk={() => form.submit()} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={creer} initialValues={{ role: 'cuisine' }}>
          <Form.Item name="nom" label="Nom complet" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="email" label="Email (identifiant)" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
          <Form.Item name="telephone" label="Téléphone"><Input /></Form.Item>
          <Form.Item name="password" label="Mot de passe provisoire" rules={[{ required: true, min: 6 }]}><Input.Password /></Form.Item>
          <Form.Item name="role" label="Rôle" rules={[{ required: true }]} extra={
            <span style={{ fontSize: 12 }}>Gérant : tout sauf l’équipe · Cuisine : commandes, écran cuisine, ruptures · Livreur : ses livraisons</span>
          }><Select options={OPTIONS_ROLES} /></Form.Item>
        </Form>
      </Modal>

      <Modal open={promotion} title="Donner un rôle à un compte existant" okText="Valider" onCancel={() => setPromotion(false)} onOk={() => formPromo.submit()} destroyOnHidden>
        <Form form={formPromo} layout="vertical" onFinish={async (v) => { await maj(v.id, { role: v.role }, 'Rôle attribué'); setPromotion(false); }}>
          <Form.Item name="id" label="Compte client" rules={[{ required: true }]}>
            <Select showSearch filterOption={false} onSearch={chercherClient} placeholder="Tapez un nom, email ou téléphone" suffixIcon={<SearchOutlined />}
              options={recherche.map((c) => ({ value: c.id, label: `${c.nom ?? ''} · ${c.email ?? c.telephone ?? ''}` }))} />
          </Form.Item>
          <Form.Item name="role" label="Rôle" rules={[{ required: true }]}><Select options={OPTIONS_ROLES} /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}
