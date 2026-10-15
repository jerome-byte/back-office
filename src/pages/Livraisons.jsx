import { useEffect, useRef, useState } from 'react';
import { Alert, App, Button, Col, Empty, Row, Space, Switch, Tag } from 'antd';
import { AimOutlined, PhoneOutlined } from '@ant-design/icons';
import { PageEntete, TagStatut } from '../components/ui';
import Carte from '../components/Carte';
import { ICONES } from '../components/icones';
import CommandeDrawer from '../components/CommandeDrawer';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { patch, post } from '../lib/api';
import { sb, useDonnees } from '../lib/hooks';
import { depuis, fcfa, MODES_PAIEMENT } from '../lib/format';

export default function Livraisons() {
  const { message } = App.useApp();
  const { profil, peut } = useAuth();
  const estLivreur = peut('livreur');
  const [ouverte, setOuverte] = useState(null);
  const [partage, setPartage] = useState(false);
  const watch = useRef(null);
  const dernierEnvoi = useRef(0);

  const { donnees: resto } = useDonnees(() => sb(supabase.from('parametres').select('latitude, longitude, simulation_gps').eq('id', 1).single()), []);
  const { donnees: commandes } = useDonnees(
    () => sb(supabase.from('commandes')
      .select('id, numero, statut, type, client_nom, client_phone, adresse_livraison, latitude, longitude, livreur_id, livreur_lat, livreur_lng, montant_total, mode_paiement, statut_paiement, created_at, zones_livraison(nom), commande_items(nom, quantite)')
      .eq('type', 'livraison').in('statut', ['en_preparation', 'prete', 'en_route']).order('created_at')),
    ['commandes'],
  );
  const { donnees: livreurs } = useDonnees(
    () => (estLivreur ? Promise.resolve([]) : sb(supabase.from('profiles').select('id, nom, telephone, livreurs(*)').eq('role', 'livreur').eq('actif', true))),
    ['livreurs'],
  );

  // ----- Partage de la position (livreur) -----
  useEffect(() => {
    if (!partage) { if (watch.current != null) navigator.geolocation.clearWatch(watch.current); return undefined; }
    watch.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (Date.now() - dernierEnvoi.current < 8000) return;
        dernierEnvoi.current = Date.now();
        post('/livreurs/position', { latitude: pos.coords.latitude, longitude: pos.coords.longitude }).catch(() => {});
      },
      (err) => { message.error(`GPS : ${err.message}`); setPartage(false); },
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => { if (watch.current != null) navigator.geolocation.clearWatch(watch.current); };
  }, [partage, message]);

  const faire = async (fn, ok) => { try { await fn(); message.success(ok); } catch (e) { message.error(e.message); } };

  const centre = resto ? [resto.latitude, resto.longitude] : [6.1319, 1.2228];
  const liste = (commandes ?? []).filter((c) => !estLivreur || c.livreur_id === profil.id || (!c.livreur_id && c.statut !== 'en_route'));

  const marqueurs = [
    { cle: 'resto', position: centre, icone: ICONES.restaurant, popup: 'Restaurant' },
    ...liste.map((c) => ({ cle: `c-${c.id}`, position: [c.latitude, c.longitude], icone: ICONES.client, popup: `${c.numero} · ${c.client_nom ?? ''}` })),
    ...liste.filter((c) => c.statut === 'en_route' && c.livreur_lat).map((c) => ({ cle: `l-${c.id}`, position: [c.livreur_lat, c.livreur_lng], icone: ICONES.livreur, popup: `Livreur · ${c.numero}` })),
    ...(livreurs ?? []).filter((l) => l.livreurs?.latitude && l.livreurs?.position_maj_at).map((l) => ({
      cle: `lv-${l.id}`, position: [l.livreurs.latitude, l.livreurs.longitude], icone: l.livreurs.disponible ? ICONES.livreurLibre : ICONES.livreur, popup: l.nom,
    })),
  ];
  const trajets = liste.filter((c) => c.statut === 'en_route' && c.livreur_lat && c.latitude)
    .map((c) => ({ cle: c.id, points: [[c.livreur_lat, c.livreur_lng], [c.latitude, c.longitude]] }));

  return (
    <>
      <PageEntete titre={estLivreur ? 'Mes livraisons' : 'Livraisons'}
        sousTitre={resto?.simulation_gps ? 'Mode démo : la position des livreurs sans GPS est simulée.' : 'Positions des livreurs en temps réel.'}
        actions={estLivreur && (
          <Space><AimOutlined /> Partager ma position <Switch checked={partage} onChange={(v) => {
            if (v && !navigator.geolocation) { message.error('Géolocalisation indisponible sur cet appareil.'); return; }
            setPartage(v);
          }} /></Space>
        )} />

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={15}>
          <div className="carte" style={{ padding: 6 }}>
            <Carte centre={centre} marqueurs={marqueurs} trajets={trajets} hauteur={estLivreur ? 360 : 560} />
          </div>
          {!estLivreur && (
            <div className="carte" style={{ padding: 16, marginTop: 16 }}>
              <div style={{ fontWeight: 650, marginBottom: 10 }}>Livreurs</div>
              {(livreurs ?? []).length === 0 && <Alert type="info" showIcon title="Aucun livreur. Créez-en un dans « Équipe » (rôle Livreur)." />}
              <Space wrap>
                {(livreurs ?? []).map((l) => (
                  <Tag key={l.id} color={l.livreurs?.disponible ? 'green' : 'purple'} style={{ padding: '4px 10px' }}>
                    🛵 {l.nom} · {l.livreurs?.disponible ? 'disponible' : 'en course'}
                    {l.livreurs?.position_maj_at && <span style={{ opacity: 0.7 }}> · GPS {depuis(l.livreurs.position_maj_at)}</span>}
                  </Tag>
                ))}
              </Space>
            </div>
          )}
        </Col>
        <Col xs={24} xl={9}>
          {liste.length === 0 && <div className="carte" style={{ padding: 32 }}><Empty description="Aucune livraison en cours" /></div>}
          {liste.map((c) => (
            <div key={c.id} className="carte" style={{ padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <a onClick={() => setOuverte(c.id)} style={{ fontWeight: 750, color: '#111827' }}>{c.numero}</a>
                <TagStatut statut={c.statut} />
              </div>
              <div style={{ marginTop: 6, fontSize: 13.5 }}>{c.client_nom} · <a href={`tel:${c.client_phone}`}><PhoneOutlined /> {c.client_phone}</a></div>
              <div style={{ color: '#6b7280', fontSize: 13 }}>{c.adresse_livraison} {c.zones_livraison && <Tag>{c.zones_livraison.nom}</Tag>}</div>
              <div style={{ fontSize: 12.5, marginTop: 6 }}>{c.commande_items.map((i) => `${i.quantite}× ${i.nom}`).join(', ')}</div>
              <div style={{ marginTop: 6, fontWeight: 600 }}>
                {fcfa(c.montant_total)} · {c.statut_paiement === 'paye' ? <Tag color="green">Payé</Tag> : <Tag color="gold">À encaisser ({MODES_PAIEMENT[c.mode_paiement].label})</Tag>}
              </div>
              <Space wrap style={{ marginTop: 10 }}>
                {estLivreur && !c.livreur_id && <Button onClick={() => faire(() => patch(`/commandes/${c.id}/livreur`, { livreur_id: profil.id }), 'Course acceptée')}>Prendre la course</Button>}
                {c.statut === 'prete' && (peut('admin', 'gerant') || c.livreur_id === profil.id) &&
                  <Button type="primary" onClick={() => faire(() => patch(`/commandes/${c.id}/statut`, { statut: 'en_route' }), 'En route !')}>Partir</Button>}
                {c.statut === 'en_route' && (peut('admin', 'gerant') || c.livreur_id === profil.id) &&
                  <Button type="primary" style={{ background: '#2E9E5B' }} onClick={() => faire(() => patch(`/commandes/${c.id}/statut`, { statut: 'livree' }), 'Livraison terminée')}>Livrée</Button>}
                {c.latitude && <Button href={`https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}`} target="_blank">Itinéraire</Button>}
              </Space>
            </div>
          ))}
        </Col>
      </Row>
      <CommandeDrawer commandeId={ouverte} onClose={() => setOuverte(null)} />
    </>
  );
}
