import { useState } from 'react';
import { App, Badge, Button, Drawer, Input, Switch, Tag } from 'antd';
import { ClockCircleOutlined, StopOutlined } from '@ant-design/icons';
import { PageEntete } from '../components/ui';
import CommandeDrawer from '../components/CommandeDrawer';
import { supabase } from '../lib/supabase';
import { patch } from '../lib/api';
import { sb, useDonnees, useTic } from '../lib/hooks';
import { dayjs, etapeSuivante, fcfa, heure, MODES_PAIEMENT, STATUTS_COMMANDE } from '../lib/format';

const COLONNES = ['en_attente', 'confirmee', 'en_preparation', 'prete'];

export default function Cuisine() {
  useTic(30000);
  const { message } = App.useApp();
  const [ouverte, setOuverte] = useState(null);
  const [enCours, setEnCours] = useState(null);
  const [ruptures, setRuptures] = useState(false);
  const [filtrePlat, setFiltrePlat] = useState('');

  const { donnees } = useDonnees(
    () => sb(supabase.from('commandes')
      .select('id, numero, type, statut, statut_paiement, mode_paiement, client_nom, montant_total, instructions, created_at, temps_estime_min, commande_items(id, nom, quantite, notes)')
      .in('statut', COLONNES).order('created_at', { ascending: true })),
    ['commandes'],
  );

  const { donnees: plats, setDonnees: setPlats } = useDonnees(
    () => sb(supabase.from('plats').select('id, nom_fr, en_rupture, actif').eq('actif', true).order('nom_fr')),
    [],
  );

  const avancer = async (cmd) => {
    const s = etapeSuivante(cmd);
    if (!s) return;
    setEnCours(cmd.id);
    try { await patch(`/commandes/${cmd.id}/statut`, { statut: s.statut }); }
    catch (e) { message.error(e.message); }
    finally { setEnCours(null); }
  };

  const basculerRupture = async (p, v) => {
    setPlats((l) => l.map((x) => (x.id === p.id ? { ...x, en_rupture: v } : x)));
    try { await patch(`/plats/${p.id}/rupture`, { en_rupture: v }); message.success(v ? `${p.nom_fr} en rupture` : `${p.nom_fr} disponible`); }
    catch (e) { message.error(e.message); setPlats((l) => l.map((x) => (x.id === p.id ? { ...x, en_rupture: !v } : x))); }
  };

  const nbRuptures = (plats ?? []).filter((p) => p.en_rupture).length;

  return (
    <>
      <PageEntete titre="Écran cuisine" sousTitre="Les tickets avancent de gauche à droite. Rouge = en retard sur le temps estimé."
        actions={<Badge count={nbRuptures}><Button icon={<StopOutlined />} onClick={() => setRuptures(true)}>Ruptures de stock</Button></Badge>} />

      <div className="kanban">
        {COLONNES.map((col) => {
          const tickets = (donnees ?? []).filter((c) => c.statut === col);
          return (
            <div key={col} className="kanban-col">
              <div className="kanban-col-titre">
                <span><span className="pastille" style={{ background: STATUTS_COMMANDE[col].hex }} />{STATUTS_COMMANDE[col].label}</span>
                <Tag style={{ margin: 0 }}>{tickets.length}</Tag>
              </div>
              {tickets.map((c) => {
                const minutes = dayjs().diff(dayjs(c.created_at), 'minute');
                const retard = c.temps_estime_min && minutes > c.temps_estime_min;
                const s = etapeSuivante(c);
                const attentePaiement = c.mode_paiement !== 'especes' && c.statut_paiement !== 'paye';
                return (
                  <div key={c.id} className={`ticket${retard ? ' retard' : ''}`} style={{ borderLeftColor: retard ? undefined : STATUTS_COMMANDE[col].hex }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <a onClick={() => setOuverte(c.id)} style={{ fontWeight: 750, color: '#111827' }}>{c.numero}</a>
                      <span style={{ fontSize: 12, color: retard ? '#DC2626' : '#8A8F98', fontWeight: retard ? 700 : 500 }}>
                        <ClockCircleOutlined /> {minutes} min · {heure(c.created_at)}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      {c.type === 'livraison' ? '🛵 Livraison' : '🛍 À emporter'} · {c.client_nom || 'Client'}
                    </div>
                    <ul className="ticket-lignes">
                      {c.commande_items.map((i) => (
                        <li key={i.id} style={{ flexDirection: 'column' }}>
                          <span><span className="qte">{i.quantite}×</span>{i.nom}</span>
                          {i.notes && <span className="ticket-note">↳ {i.notes}</span>}
                        </li>
                      ))}
                    </ul>
                    {c.instructions && <div style={{ fontSize: 12, background: '#f3f4f6', borderRadius: 6, padding: '4px 8px', marginBottom: 8 }}>📝 {c.instructions}</div>}
                    {attentePaiement && col === 'en_attente' ? (
                      <Tag color="gold" style={{ width: '100%', textAlign: 'center', padding: 4 }}>Attente paiement {MODES_PAIEMENT[c.mode_paiement].label}</Tag>
                    ) : s && (
                      <Button type={col === 'en_preparation' ? 'primary' : 'default'} block loading={enCours === c.id} onClick={() => avancer(c)}>
                        {s.label}
                      </Button>
                    )}
                    <div style={{ fontSize: 11.5, color: '#9aa0ab', marginTop: 6, textAlign: 'right' }}>{fcfa(c.montant_total)}</div>
                  </div>
                );
              })}
              {tickets.length === 0 && <div style={{ textAlign: 'center', color: '#9aa0ab', padding: 24, fontSize: 13 }}>Aucun ticket</div>}
            </div>
          );
        })}
      </div>

      <Drawer open={ruptures} onClose={() => setRuptures(false)} title="Ruptures de stock" size={400}>
        <p style={{ color: '#6b7280', marginTop: 0 }}>Un plat en rupture n’est plus commandable dans l’application.</p>
        <Input.Search placeholder="Chercher un plat" allowClear onChange={(e) => setFiltrePlat(e.target.value.toLowerCase())} style={{ marginBottom: 12 }} />
        {(plats ?? []).filter((p) => p.nom_fr.toLowerCase().includes(filtrePlat)).map((p) => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
            <span style={{ color: p.en_rupture ? '#DC2626' : undefined, fontWeight: p.en_rupture ? 600 : 400 }}>{p.nom_fr}</span>
            <Switch checked={!p.en_rupture} checkedChildren="Dispo" unCheckedChildren="Rupture" onChange={(v) => basculerRupture(p, !v)} />
          </div>
        ))}
      </Drawer>
      <CommandeDrawer commandeId={ouverte} onClose={() => setOuverte(null)} />
    </>
  );
}
