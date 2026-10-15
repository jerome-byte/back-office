import { useMemo, useState } from 'react';
import { Alert, Col, DatePicker, Empty, Row, Segmented, Skeleton, Table } from 'antd';
import {
  CalendarOutlined, ClockCircleOutlined, RiseOutlined, ShoppingCartOutlined, StarOutlined, UserAddOutlined, WalletOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { PageEntete, Kpi, TagStatut } from '../components/ui';
import { supabase } from '../lib/supabase';
import { sb, useDonnees } from '../lib/hooks';
import { dayjs, depuis, fcfa, MODES_PAIEMENT, nombre } from '../lib/format';

const BRAISE = '#E4572E';
const GRILLE = '#EEF0F3';
const AXE = { fontSize: 11.5, fill: '#8A8F98' };

function InfoBulle({ active, payload, label, format }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#16181D', color: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 12.5, boxShadow: '0 6px 20px rgba(0,0,0,.18)' }}>
      <div style={{ color: '#b3b8c2', marginBottom: 2 }}>{label}</div>
      {payload.map((p) => <div key={p.dataKey} style={{ fontWeight: 650 }}>{format ? format(p.value) : p.value}</div>)}
    </div>
  );
}

const PERIODES = {
  aujourdhui: () => [dayjs().startOf('day'), dayjs()],
  '7j': () => [dayjs().subtract(6, 'day').startOf('day'), dayjs()],
  '30j': () => [dayjs().subtract(29, 'day').startOf('day'), dayjs()],
  mois: () => [dayjs().startOf('month'), dayjs()],
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [periode, setPeriode] = useState('7j');
  const [plage, setPlage] = useState(PERIODES['7j']());

  const choisir = (p) => { setPeriode(p); setPlage(PERIODES[p]()); };

  const { donnees: s, chargement, erreur } = useDonnees(
    () => sb(supabase.rpc('stats_dashboard', { p_debut: plage[0].toISOString(), p_fin: plage[1].endOf('day').toISOString() })),
    ['commandes', 'avis'],
    [plage[0].valueOf(), plage[1].valueOf()],
  );

  const { donnees: enCours } = useDonnees(
    () => sb(supabase.from('commandes').select('id, numero, client_nom, client_phone, montant_total, statut, type, created_at')
      .in('statut', ['en_attente', 'confirmee', 'en_preparation', 'prete', 'en_route'])
      .order('created_at', { ascending: true }).limit(12)),
    ['commandes'],
  );

  // série par jour complète (jours sans vente = 0)
  const parJour = useMemo(() => {
    if (!s) return [];
    const map = Object.fromEntries((s.par_jour ?? []).map((d) => [d.jour, d]));
    const jours = [];
    for (let d = plage[0].startOf('day'); !d.isAfter(plage[1], 'day'); d = d.add(1, 'day')) {
      const k = d.format('YYYY-MM-DD');
      jours.push({ jour: d.format(plage[1].diff(plage[0], 'day') > 10 ? 'DD/MM' : 'ddd DD'), ca: Number(map[k]?.ca ?? 0), nb: map[k]?.nb ?? 0 });
    }
    return jours;
  }, [s, plage]);

  const parHeure = useMemo(() => {
    const map = Object.fromEntries((s?.par_heure ?? []).map((h) => [h.heure, h.nb]));
    return Array.from({ length: 24 }, (_, h) => ({ heure: `${h}h`, nb: map[h] ?? 0 })).filter((_, h) => h >= 8 || map[h]);
  }, [s]);

  const totalPaiements = Object.values(s?.par_paiement ?? {}).reduce((a, p) => a + Number(p.montant || 0), 0);
  const maxTop = Math.max(1, ...((s?.top_plats ?? []).map((p) => Number(p.quantite))));

  return (
    <>
      <PageEntete
        titre="Tableau de bord"
        sousTitre={`Du ${plage[0].format('DD MMM')} au ${plage[1].format('DD MMM YYYY')}`}
        actions={<>
          <Segmented value={periode} onChange={choisir} options={[
            { label: "Aujourd'hui", value: 'aujourdhui' }, { label: '7 jours', value: '7j' },
            { label: '30 jours', value: '30j' }, { label: 'Ce mois', value: 'mois' },
          ]} />
          <DatePicker.RangePicker value={plage} allowClear={false} format="DD/MM/YY"
            onChange={(v) => { if (v) { setPlage(v); setPeriode(null); } }} />
        </>}
      />
      {erreur && <Alert type="error" showIcon title={erreur} style={{ marginBottom: 16 }} />}

      {chargement && !s ? <Skeleton active paragraph={{ rows: 8 }} /> : s && (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={12} lg={6}><Kpi icone={<WalletOutlined />} label="Chiffre d'affaires" valeur={fcfa(s.chiffre_affaires)} sous={`+ ${fcfa(s.ca_en_cours)} en cours`} /></Col>
            <Col xs={12} lg={6}><Kpi icone={<ShoppingCartOutlined />} label="Commandes" valeur={nombre(s.nb_commandes)} sous={`${s.nb_livrees} livrées · ${s.nb_annulees} annulées`} couleur="#2F6FED" /></Col>
            <Col xs={12} lg={6}><Kpi icone={<RiseOutlined />} label="Panier moyen" valeur={fcfa(s.panier_moyen)} sous={`${s.nb_clients} clients distincts`} couleur="#2E9E5B" /></Col>
            <Col xs={12} lg={6}><Kpi icone={<ClockCircleOutlined />} label="Délai moyen" valeur={s.temps_moyen_livraison_min ? `${s.temps_moyen_livraison_min} min` : '—'} sous="de la commande à la remise" couleur="#7A4FD6" /></Col>
            <Col xs={12} lg={6}><Kpi icone={<CalendarOutlined />} label="Réservations" valeur={nombre(s.nb_reservations)} sous={`${s.couverts} couverts`} couleur="#0FA3A3" /></Col>
            <Col xs={12} lg={6}><Kpi icone={<UserAddOutlined />} label="Nouveaux clients" valeur={nombre(s.nouveaux_clients)} couleur="#2F6FED" /></Col>
            <Col xs={12} lg={6}><Kpi icone={<StarOutlined />} label="Note moyenne" valeur={s.note_moyenne ? `${s.note_moyenne} / 5` : '—'} couleur="#D4A017" /></Col>
            <Col xs={12} lg={6}><Kpi icone={<CloseCircleOutlined />} label="Taux d'annulation" valeur={s.nb_commandes ? `${Math.round((s.nb_annulees / s.nb_commandes) * 100)} %` : '—'} couleur="#DC2626" /></Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} xl={16}>
              <div className="carte" style={{ padding: 20 }}>
                <div style={{ fontWeight: 650, marginBottom: 4 }}>Chiffre d'affaires par jour</div>
                <div style={{ color: '#8A8F98', fontSize: 12.5, marginBottom: 12 }}>Commandes livrées, en FCFA</div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={parJour} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={GRILLE} />
                    <XAxis dataKey="jour" tick={AXE} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={AXE} axisLine={false} tickLine={false} width={56}
                      tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                    <Tooltip cursor={{ fill: 'rgba(228,87,46,0.08)' }} content={<InfoBulle format={fcfa} />} />
                    <Bar dataKey="ca" fill={BRAISE} radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Col>
            <Col xs={24} xl={8}>
              <div className="carte" style={{ padding: 20, height: '100%' }}>
                <div style={{ fontWeight: 650, marginBottom: 14 }}>Moyens de paiement</div>
                {totalPaiements === 0 ? <Empty description="Aucune vente" image={Empty.PRESENTED_IMAGE_SIMPLE} /> :
                  Object.entries(MODES_PAIEMENT).map(([k, m]) => {
                    const p = s.par_paiement?.[k] ?? { nb: 0, montant: 0 };
                    const pct = Math.round((Number(p.montant) / totalPaiements) * 100);
                    return (
                      <div key={k} style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 6 }}>
                          <span><span className="pastille" style={{ background: m.color }} />{m.label}</span>
                          <span style={{ fontWeight: 600 }}>{fcfa(p.montant)} <span style={{ color: '#8A8F98', fontWeight: 400 }}>· {pct} %</span></span>
                        </div>
                        <div style={{ height: 8, background: '#F1F2F5', borderRadius: 4 }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: m.color, borderRadius: 4 }} />
                        </div>
                        <div style={{ color: '#8A8F98', fontSize: 12, marginTop: 4 }}>{p.nb} commande(s)</div>
                      </div>
                    );
                  })}
                <div style={{ borderTop: '1px solid #eceef2', paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#8A8F98' }}>Livraison / À emporter</span>
                  <span style={{ fontWeight: 600 }}>{s.par_type?.livraison ?? 0} / {s.par_type?.emporter ?? 0}</span>
                </div>
              </div>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} lg={8}>
              <div className="carte" style={{ padding: 20, height: '100%' }}>
                <div style={{ fontWeight: 650, marginBottom: 14 }}>Plats les plus vendus</div>
                {(s.top_plats ?? []).length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Aucune vente" /> :
                  s.top_plats.map((p, i) => (
                    <div key={p.plat_id ?? i} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                        <span><b style={{ color: '#8A8F98', marginRight: 8 }}>{i + 1}</b>{p.nom}</span>
                        <span style={{ fontWeight: 600 }}>{p.quantite}</span>
                      </div>
                      <div style={{ height: 6, background: '#F1F2F5', borderRadius: 3, marginTop: 5 }}>
                        <div style={{ width: `${(p.quantite / maxTop) * 100}%`, height: '100%', background: BRAISE, borderRadius: 3 }} />
                      </div>
                    </div>
                  ))}
              </div>
            </Col>
            <Col xs={24} lg={8}>
              <div className="carte" style={{ padding: 20, height: '100%' }}>
                <div style={{ fontWeight: 650, marginBottom: 4 }}>Affluence par heure</div>
                <div style={{ color: '#8A8F98', fontSize: 12.5, marginBottom: 12 }}>Nombre de commandes</div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={parHeure} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={GRILLE} />
                    <XAxis dataKey="heure" tick={AXE} axisLine={false} tickLine={false} interval={1} />
                    <YAxis tick={AXE} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip cursor={{ fill: 'rgba(47,111,237,0.08)' }} content={<InfoBulle format={(v) => `${v} commande(s)`} />} />
                    <Bar dataKey="nb" fill="#2F6FED" radius={[4, 4, 0, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Col>
            <Col xs={24} lg={8}>
              <div className="carte" style={{ padding: 20, height: '100%' }}>
                <div style={{ fontWeight: 650, marginBottom: 14 }}>Zones les plus livrées</div>
                {(s.top_zones ?? []).length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Aucune livraison" /> :
                  s.top_zones.slice(0, 7).map((z) => (
                    <div key={z.zone} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13.5 }}>
                      <span>{z.zone}</span><b>{z.nb}</b>
                    </div>
                  ))}
              </div>
            </Col>
          </Row>

          <div className="carte" style={{ padding: 20, marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontWeight: 650 }}>Commandes en cours</div>
              <a onClick={() => navigate('/commandes')}>Tout voir →</a>
            </div>
            <Table size="small" rowKey="id" pagination={false} dataSource={enCours ?? []} scroll={{ x: 600 }}
              onRow={() => ({ onClick: () => navigate('/commandes'), style: { cursor: 'pointer' } })}
              locale={{ emptyText: 'Aucune commande en cours 🎉' }}
              columns={[
                { title: 'N°', dataIndex: 'numero', render: (v) => <b>{v}</b> },
                { title: 'Client', render: (_, r) => r.client_nom || r.client_phone },
                { title: 'Type', dataIndex: 'type', render: (t) => (t === 'livraison' ? 'Livraison' : 'À emporter') },
                { title: 'Montant', dataIndex: 'montant_total', align: 'right', render: fcfa },
                { title: 'Statut', dataIndex: 'statut', render: (v) => <TagStatut statut={v} /> },
                { title: 'Depuis', dataIndex: 'created_at', render: depuis },
              ]} />
          </div>
        </>
      )}
    </>
  );
}
