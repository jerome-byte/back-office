import { useEffect, useMemo, useState } from 'react';
import { App, Avatar, Badge, Button, Drawer, Dropdown, Layout, Menu, Popover, Segmented, Tag, Tooltip } from 'antd';
import {
  AppstoreOutlined, BellOutlined, CalendarOutlined, CarOutlined, DashboardOutlined, FireOutlined,
  GiftOutlined, HistoryOutlined, LogoutOutlined, MenuOutlined, NotificationOutlined, SettingOutlined,
  ShoppingOutlined, StarOutlined, TeamOutlined, UnorderedListOutlined, UserOutlined,
  EnvironmentOutlined, FullscreenOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ACCES } from '../lib/acces';
import { supabase } from '../lib/supabase';
import { patch } from '../lib/api';
import { bip, depuis, ROLES } from '../lib/format';
import { useEstMobile } from '../lib/hooks';

const { Sider, Header, Content } = Layout;

const SECTIONS = [
  { titre: 'Activité', items: [
    { key: '/', icon: <DashboardOutlined />, label: 'Tableau de bord' },
    { key: '/commandes', icon: <ShoppingOutlined />, label: 'Commandes', compteur: 'commandes_en_attente' },
    { key: '/cuisine', icon: <FireOutlined />, label: 'Écran cuisine' },
    { key: '/livraisons', icon: <CarOutlined />, label: 'Livraisons' },
    { key: '/reservations', icon: <CalendarOutlined />, label: 'Réservations', compteur: 'reservations_en_attente' },
  ] },
  { titre: 'Carte', items: [
    { key: '/plats', icon: <AppstoreOutlined />, label: 'Plats' },
    { key: '/categories', icon: <UnorderedListOutlined />, label: 'Catégories' },
  ] },
  { titre: 'Marketing', items: [
    { key: '/evenements', icon: <NotificationOutlined />, label: 'Événements' },
    { key: '/codes-promo', icon: <GiftOutlined />, label: 'Codes promo' },
    { key: '/avis', icon: <StarOutlined />, label: 'Avis clients', compteur: 'avis_sans_reponse' },
    { key: '/clients', icon: <UserOutlined />, label: 'Clients' },
  ] },
  { titre: 'Réglages', items: [
    { key: '/zones', icon: <EnvironmentOutlined />, label: 'Zones de livraison' },
    { key: '/equipe', icon: <TeamOutlined />, label: 'Équipe' },
    { key: '/parametres', icon: <SettingOutlined />, label: 'Paramètres' },
    { key: '/journal', icon: <HistoryOutlined />, label: 'Journal' },
  ] },
];

function Logo() {
  return (
    <div className="logo-marque">
      <div className="logo-icone">
        <svg width="18" height="18" viewBox="0 0 64 64"><path d="M32 6c5 10 15 15 15 28a15 15 0 0 1-30 0c0-8 4-12 8-15 0 5 2 8 5 9-1-8 0-15 2-22z" fill="#fff" /></svg>
      </div>
      <div>
        <div className="logo-texte">CARNIVORE</div>
        <div className="logo-sous">Back-office</div>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const { profil, role, deconnexion, peut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { notification } = App.useApp();
  const mobile = useEstMobile();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [compteurs, setCompteurs] = useState({});
  const [notifs, setNotifs] = useState([]);
  const [vuJusqua, setVuJusqua] = useState(() => {
    try { return localStorage.getItem('notifs_vues') || ''; } catch { return ''; }
  });
  const [restaurant, setRestaurant] = useState(null);

  // --------- Compteurs + notifications du personnel en temps réel ---------
  useEffect(() => {
    const chargerCompteurs = async () => {
      const { data } = await supabase.rpc('compteurs_staff');
      if (data) setCompteurs(data);
    };
    const chargerNotifs = async () => {
      const { data } = await supabase.from('notifications').select('*')
        .eq('cible', 'staff').order('created_at', { ascending: false }).limit(30);
      setNotifs(data ?? []);
    };
    const chargerResto = async () => {
      const { data } = await supabase.from('parametres').select('mode_ouverture, nom_restaurant').eq('id', 1).single();
      const { data: ouvert } = await supabase.rpc('est_ouvert');
      setRestaurant(data ? { ...data, ouvert } : null);
    };
    chargerCompteurs(); chargerNotifs(); chargerResto();

    const canal = supabase.channel('staff-global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'commandes' }, (p) => {
        bip();
        notification.open({
          title: `Nouvelle commande ${p.new.numero ?? ''}`,
          description: `${p.new.client_nom ?? p.new.client_phone} — ${p.new.montant_total} FCFA`,
          icon: <ShoppingOutlined style={{ color: '#E4572E' }} />,
          placement: 'bottomRight',
          duration: 8,
        });
        if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
          new Notification(`Nouvelle commande ${p.new.numero ?? ''}`, { body: `${p.new.montant_total} FCFA`, icon: '/favicon.svg' });
        }
        chargerCompteurs();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'commandes' }, chargerCompteurs)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, chargerCompteurs)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'avis' }, chargerCompteurs)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (p) => {
        if (p.new.cible === 'staff') setNotifs((l) => [p.new, ...l].slice(0, 30));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'parametres' }, chargerResto)
      .subscribe();

    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    const t = setInterval(chargerResto, 60000);
    return () => { supabase.removeChannel(canal); clearInterval(t); };
  }, [notification]);

  const nonLues = notifs.filter((n) => n.created_at > vuJusqua).length;
  const marquerVues = () => {
    const d = notifs[0]?.created_at || new Date().toISOString();
    setVuJusqua(d);
    try { localStorage.setItem('notifs_vues', d); } catch { /* stockage indisponible */ }
  };

  const itemsMenu = useMemo(() => SECTIONS.map((s) => {
    const items = s.items.filter((i) => ACCES[i.key]?.includes(role)).map((i) => ({
      key: i.key, icon: i.icon,
      label: (
        <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {i.label}
          {i.compteur && compteurs[i.compteur] > 0 && <Badge count={compteurs[i.compteur]} size="small" style={{ boxShadow: 'none' }} />}
        </span>
      ),
    }));
    return items.length ? { type: 'group', key: s.titre, label: s.titre, children: items } : null;
  }).filter(Boolean), [role, compteurs]);

  const changerOuverture = async (mode) => {
    try {
      await patch('/parametres', { mode_ouverture: mode });
      notification.success({ title: mode === 'auto' ? 'Ouverture selon les horaires' : mode === 'ouvert' ? 'Restaurant ouvert' : 'Restaurant fermé', placement: 'bottomRight', duration: 2 });
    } catch (e) { notification.error({ title: e.message }); }
  };

  const menu = (
    <Menu theme="dark" mode="inline" selectedKeys={[pathname]} items={itemsMenu}
      onClick={({ key }) => { navigate(key); setMenuOuvert(false); }} style={{ padding: '0 10px', border: 0 }} />
  );

  const panneauNotifs = (
    <div style={{ width: 340, maxHeight: 420, overflow: 'auto' }}>
      {notifs.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: '#9aa0ab' }}>Aucune notification</div>}
      {notifs.map((n) => (
        <div key={n.id} style={{ padding: '10px 4px', borderBottom: '1px solid #f0f0f0', opacity: n.created_at > vuJusqua ? 1 : 0.65 }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{n.titre}</div>
          <div style={{ color: '#6b7280', fontSize: 12.5 }}>{n.message}</div>
          <div style={{ color: '#9aa0ab', fontSize: 11, marginTop: 2 }}>{depuis(n.created_at)}</div>
        </div>
      ))}
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!mobile && (
        <Sider width={248} style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'auto' }}>
          <Logo />
          {menu}
        </Sider>
      )}
      <Drawer open={mobile && menuOuvert} onClose={() => setMenuOuvert(false)} placement="left" size={260}
        styles={{ body: { padding: 0, background: '#16181D' }, header: { display: 'none' } }}>
        <Logo />
        {menu}
      </Drawer>

      <Layout>
        <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #eceef2', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {mobile && <Button type="text" icon={<MenuOutlined />} onClick={() => setMenuOuvert(true)} />}
            {restaurant && (
              <Tag color={restaurant.ouvert ? 'green' : 'red'} style={{ margin: 0, fontWeight: 600 }}>
                <span className="pastille" style={{ background: restaurant.ouvert ? '#2E9E5B' : '#DC2626' }} />
                {restaurant.ouvert ? 'Ouvert' : 'Fermé'}
              </Tag>
            )}
            {restaurant && peut('admin', 'gerant') && !mobile && (
              <Segmented size="small" value={restaurant.mode_ouverture} onChange={changerOuverture}
                options={[{ label: 'Auto', value: 'auto' }, { label: 'Ouvert', value: 'ouvert' }, { label: 'Fermé', value: 'ferme' }]} />
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {pathname === '/cuisine' && (
              <Tooltip title="Plein écran (TV cuisine)">
                <Button type="text" icon={<FullscreenOutlined />} onClick={() => document.documentElement.requestFullscreen?.()} />
              </Tooltip>
            )}
            <Popover content={panneauNotifs} title="Notifications" trigger="click" placement="bottomRight"
              onOpenChange={(o) => { if (!o) marquerVues(); }}>
              <Badge count={nonLues} size="small" offset={[-4, 4]}>
                <Button type="text" shape="circle" icon={<BellOutlined style={{ fontSize: 18 }} />} />
              </Badge>
            </Popover>
            <Dropdown trigger={['click']} menu={{
              items: [
                { key: 'role', label: <Tag color={ROLES[role]?.color}>{ROLES[role]?.label}</Tag>, disabled: true },
                { type: 'divider' },
                { key: 'out', icon: <LogoutOutlined />, label: 'Se déconnecter', danger: true, onClick: deconnexion },
              ],
            }}>
              <Button type="text" style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40 }}>
                <Avatar size={30} src={profil?.avatar_url} style={{ background: '#E4572E' }}>
                  {(profil?.nom || profil?.email || '?').charAt(0).toUpperCase()}
                </Avatar>
                {!mobile && <span style={{ fontWeight: 600 }}>{profil?.nom || profil?.email}</span>}
              </Button>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ padding: mobile ? 14 : 24, maxWidth: 1480, width: '100%', margin: '0 auto' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
