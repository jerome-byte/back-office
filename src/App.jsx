import { lazy, Suspense, useEffect } from 'react';
import { App as AntApp, ConfigProvider, Spin } from 'antd';
import frFR from 'antd/locale/fr_FR';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import { reveillerApi } from './lib/api';
import './lib/format';
import { ACCES, accueilPour } from './lib/acces';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Commandes = lazy(() => import('./pages/Commandes'));
const Cuisine = lazy(() => import('./pages/Cuisine'));
const Livraisons = lazy(() => import('./pages/Livraisons'));
const Reservations = lazy(() => import('./pages/Reservations'));
const Plats = lazy(() => import('./pages/Plats'));
const Categories = lazy(() => import('./pages/Categories'));
const Evenements = lazy(() => import('./pages/Evenements'));
const CodesPromo = lazy(() => import('./pages/CodesPromo'));
const Zones = lazy(() => import('./pages/Zones'));
const Avis = lazy(() => import('./pages/Avis'));
const Clients = lazy(() => import('./pages/Clients'));
const Equipe = lazy(() => import('./pages/Equipe'));
const Parametres = lazy(() => import('./pages/Parametres'));
const Journal = lazy(() => import('./pages/Journal'));

const theme = {
  token: {
    colorPrimary: '#E4572E',
    colorInfo: '#2F6FED',
    colorSuccess: '#2E9E5B',
    colorWarning: '#D4A017',
    colorError: '#DC2626',
    borderRadius: 10,
    fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    colorBgLayout: '#F4F5F7',
  },
  components: {
    Layout: { siderBg: '#16181D', headerBg: '#FFFFFF', headerHeight: 60, headerPadding: '0 20px' },
    Menu: { darkItemBg: '#16181D', darkSubMenuItemBg: '#16181D', darkItemSelectedBg: '#E4572E', itemBorderRadius: 8 },
    Table: { headerBg: '#FAFAFB', headerColor: '#6B7280', rowHoverBg: '#FFF8F5' },
    Card: { borderRadiusLG: 14 },
  },
};

function Protege({ chemin, children }) {
  const { role } = useAuth();
  if (!ACCES[chemin]?.includes(role)) return <Navigate to={accueilPour(role)} replace />;
  return children;
}

const Chargement = () => (
  <div style={{ display: 'grid', placeItems: 'center', height: '60vh' }}><Spin size="large" /></div>
);

function Routeur() {
  const { session, profil, estStaff, chargement } = useAuth();
  if (chargement) return <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}><Spin size="large" /></div>;
  if (!session || !profil || !estStaff) return <Login />;

  const pages = [
    ['/', Dashboard], ['/commandes', Commandes], ['/cuisine', Cuisine], ['/livraisons', Livraisons],
    ['/reservations', Reservations], ['/plats', Plats], ['/categories', Categories],
    ['/evenements', Evenements], ['/codes-promo', CodesPromo], ['/zones', Zones], ['/avis', Avis],
    ['/clients', Clients], ['/equipe', Equipe], ['/parametres', Parametres], ['/journal', Journal],
  ];
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {pages.map(([chemin, Page]) => (
          <Route key={chemin} path={chemin} element={
            <Protege chemin={chemin}><Suspense fallback={<Chargement />}><Page /></Suspense></Protege>
          } />
        ))}
        <Route path="*" element={<Navigate to={accueilPour(profil.role)} replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  useEffect(() => { reveillerApi(); }, []);
  return (
    <ConfigProvider theme={theme} locale={frFR}>
      <AntApp>
        <AuthProvider>
          <BrowserRouter>
            <Routeur />
          </BrowserRouter>
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  );
}
