import { useEffect, useState, useCallback } from 'react';
import { Layout, Table, Tag, Button, Typography, Space, Card, Alert, Tabs, Modal, Form, Input, InputNumber, Switch, Select, message, Popconfirm, Upload, DatePicker } from 'antd';
import { CarOutlined, CheckCircleOutlined, CalendarOutlined, AppstoreOutlined, UnorderedListOutlined, RocketOutlined, EditOutlined, DeleteOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import axios from 'axios';
import { supabase } from './supabaseClient';
import dayjs from 'dayjs';
import { requestFCMToken, onForegroundMessage } from './firebase';

const { Header, Content } = Layout;
const { Title } = Typography;
const { TextArea } = Input;

const API_URL = 'https://api-restaurant-3hn0.onrender.com'; 

const cleanNumber = (val) => val === null || val === undefined || isNaN(val) ? 0 : val;

function App() {
  const [activeTab, setActiveTab] = useState('commandes');
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);

  const addNotification = useCallback((titre, msg, type) => {
    const notif = {
      id: Date.now().toString(),
      titre,
      message: msg,
      type,
      date: new Date().toLocaleString('fr-FR'),
      lu: false,
    };
    setNotifications(prev => [notif, ...prev]);

    if (Notification.permission === 'granted') {
      new Notification(titre, { body: msg });
    }
  }, []);

  // Initialisation FCM + écoute messages foreground
  useEffect(() => {
    requestFCMToken().then(token => {
      if (token) console.log('✅ FCM back-office prêt');
    });

    onForegroundMessage((payload) => {
      addNotification(
        payload.notification?.title || 'Notification',
        payload.notification?.body || '',
        payload.data?.type || 'info'
      );
    });
  }, [addNotification]);

  const unreadCount = notifications.filter(n => !n.lu).length;

  const items = [
    { key: 'commandes', label: 'Commandes', icon: <CarOutlined />, children: <CommandesTab onNew={(msg) => addNotification('Nouvelle commande', msg, 'commande')} /> },
    { key: 'reservations', label: 'Réservations', icon: <CalendarOutlined />, children: <ReservationsTab onNew={(msg) => addNotification('Nouvelle réservation', msg, 'reservation')} /> },
    { key: 'categories', label: 'Catégories', icon: <UnorderedListOutlined />, children: <CategoriesTab /> },
    { key: 'menu', label: 'Gérer les Plats', icon: <AppstoreOutlined />, children: <MenuTab /> },
    { key: 'evenements', label: 'Événements & Promos', icon: <RocketOutlined />, children: <EvenementsTab /> },
  ];

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Header style={{ backgroundColor: '#fff', padding: '0 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Title level={3} style={{ margin: 0, color: '#ff7a00' }}>🍔 Carnivore Back-Office</Title>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
  <Button type="text" icon={<span style={{ fontSize: 20 }}>🔔</span>} onClick={() => setNotifOpen(!notifOpen)} />  {unreadCount > 0 && (
    <span style={{
      position: 'absolute', top: -4, right: -4,
      backgroundColor: '#ff4d4f', color: '#fff',
      fontSize: 10, minWidth: 16, height: 16,
      borderRadius: 8, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '0 4px',
    }}>
      {unreadCount}
    </span>
  )}
</div>
          {notifOpen && (
            <div style={{
              position: 'absolute', top: 45, right: 0, width: 360,
              backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              zIndex: 1000, maxHeight: 500, overflow: 'auto',
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Notifications</strong>
                {notifications.length > 0 && (
                  <Button type="link" size="small" onClick={() => {
                    setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
                  }}>Tout marquer lu</Button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#999' }}>Aucune notification</div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} style={{
                    padding: '10px 16px', borderBottom: '1px solid #f5f5f5',
                    backgroundColor: n.lu ? '#fff' : '#fff7e6',
                    cursor: 'pointer',
                  }}>
                    <div style={{ fontWeight: n.lu ? 'normal' : 'bold', fontSize: 13 }}>{n.titre}</div>
                    <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>{n.message}</div>
                    <div style={{ color: '#999', fontSize: 11, marginTop: 4 }}>{n.date}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </Header>
      <Content style={{ padding: '24px' }}>
        <Card variant="borderless" style={{ borderRadius: '12px' }}>
          <Tabs activeKey={activeTab} onChange={(key) => { setActiveTab(key); setNotifOpen(false); }} items={items} centered size="large" />
        </Card>
      </Content>
    </Layout>
  );
}

// --- COMPOSANT UPLOAD D'IMAGE ---
const ImageUpload = ({ value, onChange }) => {
  const [loading, setLoading] = useState(false);

  const handleUpload = async ({ file }) => {
    if (!file) return;
    const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const filePath = `${Date.now()}_${cleanName}`;
    setLoading(true);
    
    try {
      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, file, { upsert: true });

      if (error) throw error;
      
      const { data: publicUrlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);
      
      onChange(publicUrlData.publicUrl);
      message.success('Image uploadée avec succès');
    } catch (err) {
      console.error('Erreur upload:', err.message);
      message.error("Erreur lors de l'upload : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form.Item label="Image">
      <Upload
        name="image"
        listType="picture-card"
        className="avatar-uploader"
        showUploadList={false}
        customRequest={handleUpload}
        accept="image/*"
      >
        {value ? (
          <img src={value} alt="plat" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ padding: 20 }}>
            {loading ? <UploadOutlined style={{ fontSize: 30, color: '#999' }} /> : <PlusOutlined style={{ fontSize: 30, color: '#999' }} />}
            <div style={{ marginTop: 8, color: '#999' }}>Cliquer pour uploader</div>
          </div>
        )}
      </Upload>
    </Form.Item>
  );
};

// --- COMPOSANT COMMANDES ---
function CommandesTab({ onNew }) {
  const [commandes, setCommandes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  const fetchCommandes = async () => {
    setChargement(true);
    try {
      const { data, error } = await supabase.from('commandes').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setCommandes(data);
    } catch (err) { setErreur(err.message); } finally { setChargement(false); }
  };

  useEffect(() => {
    fetchCommandes();
    const channel = supabase.channel('public:commandes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'commandes' }, (payload) => {
        fetchCommandes();
        if (onNew) {
          const c = payload.new;
          onNew(`Commande de ${c.client_phone} — ${c.montant_total} FCFA`);
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const changerStatut = async (id, nouveauStatut) => {
    try {
      await axios.get(`${API_URL}/commandes/test-statut/${id}?statut=${nouveauStatut}`);
      await supabase.from('commandes').update({ statut: nouveauStatut }).eq('id', id);
      fetchCommandes();
    } catch (err) { setErreur("Impossible de contacter l'API NestJS."); }
  };

  const colonnes = [
    { title: 'N°', dataIndex: 'id', key: 'id', render: (t) => t.substring(0, 8) + '...' },
    { title: 'Tél', dataIndex: 'client_phone', key: 'client_phone' },
    { title: 'Total', dataIndex: 'montant_total', key: 'montant_total', render: (t) => `${t} FCFA` },
    { title: 'Statut', dataIndex: 'statut', key: 'statut', render: (s) => {
      let c = 'default', tx = 'En attente';
      if (s === 'payee_en_preparation') { c = 'orange'; tx = 'En préparation'; }
      if (s === 'en_route') { c = 'blue'; tx = 'En route'; }
      if (s === 'livree') { c = 'green'; tx = 'Livrée'; }
      return <Tag color={c}>{tx}</Tag>;
    }},
    { title: 'Action', key: 'action', render: (_, r) => (
      <Space>
        {r.statut === 'payee_en_preparation' && <Button type="primary" icon={<CarOutlined />} onClick={() => changerStatut(r.id, 'en_route')}>Partir</Button>}
        {r.statut === 'en_route' && <Button type="primary" icon={<CheckCircleOutlined />} style={{ background: '#52c41a', borderColor: '#52c41a' }} onClick={() => changerStatut(r.id, 'livree')}>Livrée</Button>}
      </Space>
    )},
  ];

  return (
    <>
      {erreur && <Alert message="Erreur" description={erreur} type="error" showIcon style={{ marginBottom: 16 }} />}
      <Table columns={colonnes} dataSource={commandes} loading={chargement} rowKey="id" pagination={false} />
    </>
  );
}

// --- COMPOSANT RÉSERVATIONS ---
function ReservationsTab({ onNew }) {
  const [reservations, setReservations] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  const fetchReservations = async () => {
    setChargement(true);
    try {
      const { data, error } = await supabase.from('reservations').select('*').order('date_heure', { ascending: true });
      if (error) throw error;
      setReservations(data);
    } catch (err) { setErreur(err.message); } finally { setChargement(false); }
  };

  useEffect(() => {
    fetchReservations();
    const channel = supabase.channel('public:reservations')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reservations' }, (payload) => {
        fetchReservations();
                if (onNew) {
              const r = payload.new;
          onNew(`Réservation de ${r.client_nom} — ${r.nombre_personnes} personnes`);
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const terminerReservation = async (id) => {
    await supabase.from('reservations').update({ statut: 'terminee' }).eq('id', id);
    fetchReservations();
  };

  const colonnes = [
    { title: 'Client', dataIndex: 'client_nom', key: 'client_nom' },
    { title: 'Téléphone', dataIndex: 'client_phone', key: 'client_phone' },
    { title: 'Personnes', dataIndex: 'nombre_personnes', key: 'nombre_personnes' },
    { title: 'Date & Heure', dataIndex: 'date_heure', key: 'date_heure', render: (date) => new Date(date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) },
    { title: 'Zone', dataIndex: 'zone', key: 'zone', render: (zone) => <Tag color={zone === 'Terrasse' ? 'green' : zone === 'Salon privé' ? 'purple' : 'blue'}>{zone}</Tag> },
    { title: 'Statut', dataIndex: 'statut', key: 'statut', render: (statut) => statut === 'confirmee' ? <Tag color="orange">Confirmée</Tag> : <Tag color="grey">Terminée</Tag> },
    { title: 'Action', key: 'action', render: (_, record) => (record.statut === 'confirmee' ? <Button type="primary" icon={<CheckCircleOutlined />} style={{ background: '#52c41a', borderColor: '#52c41a' }} onClick={() => terminerReservation(record.id)}>Client arrivé</Button> : 'Traité') },
  ];

  return (
    <>
      {erreur && <Alert message="Erreur" description={erreur} type="error" showIcon style={{ marginBottom: 16 }} />}
      <Table columns={colonnes} dataSource={reservations} loading={chargement} rowKey="id" pagination={false} />
    </>
  );
}

// --- COMPOSANT CATÉGORIES ---
function CategoriesTab() {
  const [data, setData] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setChargement(true);
    try {
      const res = await fetch(`${API_URL}/categories`);
      if (!res.ok) throw new Error(`Erreur HTTP: ${res.status}`);
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch (err) {
      message.error("Erreur de chargement: " + err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (values) => {
    try {
      const payload = {
        ...values,
        ordre_affichage: cleanNumber(values.ordre_affichage),
      };

      const url = editingRecord ? `${API_URL}/categories/${editingRecord.id}` : `${API_URL}/categories`;
      const method = editingRecord ? 'PATCH' : 'POST';

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`Erreur HTTP: ${res.status}`);

      message.success(editingRecord ? 'Catégorie modifiée !' : 'Catégorie ajoutée !');
      closeModal();
      fetchData();
    } catch (err) {
      message.error("Erreur d'enregistrement : " + err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${API_URL}/categories/${id}`, { method: 'DELETE' });
      message.success('Supprimé');
      fetchData();
    } catch (err) { message.error("Erreur de suppression"); }
  };

  const openModal = (record = null) => {
    setEditingRecord(record);
    if (record) {
      form.setFieldsValue(record);
    } else {
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const colonnes = [
    { title: 'Nom (FR)', dataIndex: 'nom_fr', key: 'nom_fr', render: (t) => <strong>{t}</strong> },
    { title: 'Type', dataIndex: 'type', key: 'type', render: (t) => <Tag color={t === 'boisson' ? 'blue' : 'orange'}>{t}</Tag> },
    { title: 'Ordre', dataIndex: 'ordre_affichage', key: 'ordre_affichage' },
    { title: 'Actions', key: 'actions', render: (_, record) => (
      <Space>
        <Button icon={<EditOutlined />} onClick={() => openModal(record)} />
        <Popconfirm title="Supprimer cette catégorie ?" onConfirm={() => handleDelete(record.id)}>
          <Button icon={<DeleteOutlined />} danger />
        </Popconfirm>
      </Space>
    )}
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Catégories</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} style={{ background: '#ff7a00', borderColor: '#ff7a00' }}>Ajouter</Button>
      </div>
      <Table columns={colonnes} dataSource={data} loading={chargement} rowKey="id" pagination={false} />

      <Modal title={editingRecord ? "Modifier la catégorie" : "Ajouter une catégorie"} open={isModalOpen} onCancel={closeModal} footer={null} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="nom_fr" label="Nom (Français)" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select options={[{ value: 'plat', label: 'Plat' }, { value: 'boisson', label: 'Boisson' }]} />
          </Form.Item>
          <Form.Item name="ordre_affichage" label="Ordre d'affichage" initialValue={0}><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" block style={{ background: '#ff7a00', borderColor: '#ff7a00' }}>Enregistrer</Button></Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// --- COMPOSANT GESTION DES PLATS ---
function MenuTab() {
  const [plats, setPlats] = useState([]);
  const [categories, setCategories] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [form] = Form.useForm();

  const fetchData = async () => {
    setChargement(true);
    try {
      const resPlats = await fetch(`${API_URL}/plats`);
      if (!resPlats.ok) throw new Error(`Erreur plats: ${resPlats.status}`);
      const platsData = await resPlats.json();
      setPlats(Array.isArray(platsData) ? platsData : []);

      const resCat = await fetch(`${API_URL}/categories`);
      if (!resCat.ok) throw new Error(`Erreur catégories: ${resCat.status}`);
      const catData = await resCat.json();
      setCategories(Array.isArray(catData) ? catData : []);
    } catch (err) {
      console.error('Erreur fetchData:', err.message);
      message.error("Erreur de chargement : " + err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (values) => {
    try {
      const url = editingRecord ? `${API_URL}/plats/${editingRecord.id}` : `${API_URL}/plats`;
      const method = editingRecord ? 'PATCH' : 'POST';

      const payload = {
        ...values,
        image_url: imageUrl || null,
        prix: cleanNumber(values.prix),
        temps_preparation: cleanNumber(values.temps_preparation),
      };

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`Erreur HTTP: ${res.status}`);

      message.success(editingRecord ? 'Plat modifié !' : 'Plat ajouté !');
      closeModal();
      fetchData();
    } catch (err) {
      message.error("Erreur d'enregistrement : " + err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${API_URL}/plats/${id}`, { method: 'DELETE' });
      message.success('Plat supprimé');
      fetchData();
    } catch (err) { message.error("Erreur de suppression"); }
  };

  const openModal = (record = null) => {
    setEditingRecord(record);
    if (record) {
      form.setFieldsValue(record);
      setImageUrl(record.image_url || '');
    } else {
      form.resetFields();
      setImageUrl('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
    form.resetFields();
    setImageUrl('');
  };

  const colonnes = [
    { title: 'Image', dataIndex: 'image_url', key: 'img', render: (url) => url ? <img src={url} style={{ width: 50, height: 50, borderRadius: 8, objectFit: 'cover' }} /> : <AppstoreOutlined /> },
    { title: 'Nom', dataIndex: 'nom_fr', key: 'nom_fr', render: (text) => <strong>{text}</strong> },
    { title: 'Catégorie', key: 'cat', render: (_, record) => record.categories?.nom_fr || 'Aucune' },
    { title: 'Prix', dataIndex: 'prix', key: 'prix', render: (p) => `${p} FCFA` },
    { title: 'Spécialité', dataIndex: 'est_specialite', key: 'spec', render: (s) => s ? <Tag color="orange">Oui</Tag> : 'Non' },
    { title: 'Populaire', dataIndex: 'est_populaire', key: 'pop', render: (p) => p ? <Tag color="blue">Oui</Tag> : 'Non' },
    { title: 'Actions', key: 'actions', render: (_, record) => (
      <Space>
        <Button icon={<EditOutlined />} onClick={() => openModal(record)} />
        <Popconfirm title="Supprimer ce plat ?" onConfirm={() => handleDelete(record.id)}>
          <Button icon={<DeleteOutlined />} danger />
        </Popconfirm>
      </Space>
    )}
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Liste des plats</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} style={{ background: '#ff7a00', borderColor: '#ff7a00' }}>Ajouter un plat</Button>
      </div>

      <Table columns={colonnes} dataSource={plats} loading={chargement} rowKey="id" pagination={false} />

      <Modal title={editingRecord ? "Modifier le plat" : "Ajouter un nouveau plat"} open={isModalOpen} onCancel={closeModal} footer={null} width={700} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <ImageUpload value={imageUrl} onChange={setImageUrl} />

          <Form.Item name="nom_fr" label="Nom (FR)" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="categorie_id" label="Catégorie" rules={[{ required: true }]}>
            <Select placeholder="Choisir une catégorie créée">
              {categories.map(cat => (<Select.Option key={cat.id} value={cat.id}>{cat.nom_fr} ({cat.type})</Select.Option>))}
            </Select>
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item name="prix" label="Prix (FCFA)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
            <Form.Item name="temps_preparation" label="Temps (min)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          </div>
          <Form.Item name="description_fr" label="Description"><TextArea rows={2} /></Form.Item>
          <Form.Item name="ingredients" label="Ingrédients"><TextArea rows={2} placeholder="Ex: Boeuf, Sel, Poivre..." /></Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <Form.Item name="est_specialite" label="Spécialité" valuePropName="checked"><Switch /></Form.Item>
            <Form.Item name="est_populaire" label="Populaire" valuePropName="checked"><Switch /></Form.Item>
            <Form.Item name="en_promo" label="En promotion" valuePropName="checked"><Switch /></Form.Item>
          </div>
          <Form.Item><Button type="primary" htmlType="submit" block style={{ background: '#ff7a00', borderColor: '#ff7a00' }}>Enregistrer</Button></Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// --- COMPOSANT ÉVÉNEMENTS ---
function EvenementsTab() {
  const [data, setData] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [form] = Form.useForm();

  const fetchData = async () => {
    setChargement(true);
    try {
      const res = await fetch(`${API_URL}/evenements`);
      if (!res.ok) throw new Error(`Erreur événements: ${res.status}`);
      const eventsData = await res.json();
      setData(Array.isArray(eventsData) ? eventsData : []);
    } catch (err) {
      console.error('Erreur fetchData:', err.message);
      message.error("Erreur de chargement : " + err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (values) => {
    try {
      const url = editingRecord ? `${API_URL}/evenements/${editingRecord.id}` : `${API_URL}/evenements`;
      const method = editingRecord ? 'PATCH' : 'POST';

      let formattedDate = null;
      if (values.heure_debut) {
        formattedDate = values.heure_debut.format('YYYY-MM-DD HH:mm:ss');
      }

      const payload = {
        ...values,
        image_url: imageUrl || null,
        heure_debut: formattedDate,
        prix_entree: cleanNumber(values.prix_entree),
      };

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`Erreur HTTP: ${res.status}`);

      message.success('Événement sauvegardé !');
      closeModal();
      fetchData();
    } catch (err) {
      message.error("Erreur : " + err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${API_URL}/evenements/${id}`, { method: 'DELETE' });
      message.success('Supprimé');
      fetchData();
    } catch (err) { message.error("Erreur de suppression"); }
  };

  const openModal = (record = null) => {
    setEditingRecord(record);
    if (record) {
      setImageUrl(record.image_url || '');
      form.setFieldsValue({
        ...record,
        heure_debut: record.heure_debut ? dayjs(record.heure_debut) : null,
      });
    } else {
      form.resetFields();
      setImageUrl('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
    form.resetFields();
    setImageUrl('');
  };

  const colonnes = [
    { title: 'Image', dataIndex: 'image_url', key: 'img', render: (url) => url ? <img src={url} style={{ width: 60, height: 40, borderRadius: 8, objectFit: 'cover' }} /> : 'Pas de photo' },
    { title: 'Nom', dataIndex: 'nom', key: 'nom', render: (t) => <strong>{t}</strong> },
    { title: 'Date/Heure', dataIndex: 'heure_debut', key: 'heure', render: (h) => h ? new Date(h).toLocaleString('fr-FR') : 'N/A' },
    { title: 'Prix Entrée', dataIndex: 'prix_entree', key: 'prix', render: (p) => p ? `${p} FCFA` : 'Gratuit' },
    { title: 'Promo', dataIndex: 'promotion_active', key: 'promo', render: (p) => p ? <Tag color="red">Active</Tag> : 'Non' },
    { title: 'Actions', key: 'actions', render: (_, record) => (
      <Space>
        <Button icon={<EditOutlined />} onClick={() => openModal(record)} />
        <Popconfirm title="Supprimer cet événement ?" onConfirm={() => handleDelete(record.id)}>
          <Button icon={<DeleteOutlined />} danger />
        </Popconfirm>
      </Space>
    )}
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Événements & Promotions</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} style={{ background: '#ff7a00', borderColor: '#ff7a00' }}>Créer un événement</Button>
      </div>
      <Table columns={colonnes} dataSource={data} loading={chargement} rowKey="id" pagination={false} />

      <Modal title={editingRecord ? "Modifier l'événement" : "Nouvel événement"} open={isModalOpen} onCancel={closeModal} footer={null} width={600} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <ImageUpload value={imageUrl} onChange={setImageUrl} />

          <Form.Item name="nom" label="Nom de l'événement" rules={[{ required: true }]}><Input placeholder="Ex: Soirée Jazz" /></Form.Item>
          <Form.Item name="description" label="Description"><TextArea rows={3} /></Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item name="prix_entree" label="Prix d'entrée (FCFA)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
            <Form.Item name="heure_debut" label="Date et Heure"><DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm" placeholder="Sélectionner date et heure" /></Form.Item>
          </div>
          <Form.Item name="promotion_active" label="Activer une promotion ?" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item name="texte_promo" label="Texte de la promotion (ex: -20%)"><Input placeholder="Réduction affichée sur l'application" /></Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" block style={{ background: '#ff7a00', borderColor: '#ff7a00' }}>Enregistrer</Button></Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export default App;