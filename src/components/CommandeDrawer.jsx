import { useEffect, useState } from 'react';
import { App, Button, Descriptions, Divider, Drawer, Input, Popconfirm, Select, Skeleton, Space, Tag, Timeline } from 'antd';
import { PhoneOutlined, PrinterOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { supabase } from '../lib/supabase';
import { patch, post } from '../lib/api';
import { dateHeure, etapeSuivante, fcfa, heure, MODES_PAIEMENT, STATUTS_COMMANDE } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { TagPaiement, TagStatut } from './ui';

/** Détail complet d'une commande + actions (statut, livreur, annulation, ticket). */
export default function CommandeDrawer({ commandeId, onClose }) {
  const { message } = App.useApp();
  const { peut } = useAuth();
  const [cmdChargee, setCmd] = useState(null);
  const [livreurs, setLivreurs] = useState([]);
  const [occupe, setOccupe] = useState(false);
  const [motif, setMotif] = useState('');

  useEffect(() => {
    if (!commandeId) return undefined;
    const charger = async () => {
      const { data } = await supabase.from('commandes')
        .select('*, commande_items(*), commande_historique(statut, note, created_at), paiements(*), zones_livraison(nom)')
        .eq('id', commandeId).single();
      setCmd(data);
    };
    charger();
    window.addEventListener('donnees-modifiees', charger);
    const canal = supabase.channel(`cmd-${commandeId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'commandes', filter: `id=eq.${commandeId}` }, charger)
      .subscribe();
    return () => { supabase.removeChannel(canal); window.removeEventListener('donnees-modifiees', charger); };
  }, [commandeId]);

  useEffect(() => {
    if (peut('admin', 'gerant')) {
      supabase.from('profiles').select('id, nom, livreurs(disponible)').eq('role', 'livreur').eq('actif', true)
        .then(({ data }) => setLivreurs(data ?? []));
    }
  }, [peut]);

  const action = async (fn, succes) => {
    setOccupe(true);
    try { await fn(); message.success(succes); } catch (e) { message.error(e.message); } finally { setOccupe(false); }
  };

  const cmd = cmdChargee?.id === commandeId ? cmdChargee : null;
  const suivante = cmd ? etapeSuivante(cmd) : null;
  const historique = [...(cmd?.commande_historique ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));

  const imprimer = () => {
    const w = window.open('', '_blank', 'width=380,height=640');
    if (!w) return;
    const lignes = cmd.commande_items.map((i) => `<tr><td>${i.quantite}×</td><td>${i.nom}${i.notes ? `<br><small>↳ ${i.notes}</small>` : ''}</td><td style="text-align:right">${i.total}</td></tr>`).join('');
    w.document.write(`<html><head><title>${cmd.numero}</title><style>body{font-family:monospace;font-size:13px;padding:10px;width:280px}h2{text-align:center;margin:4px 0}table{width:100%;border-collapse:collapse}td{padding:3px 0;vertical-align:top}.t{border-top:1px dashed #000;margin-top:6px;padding-top:6px}</style></head><body>
      <h2>Le Carnivore By Cambérène</h2><div style="text-align:center">${cmd.numero} · ${dateHeure(cmd.created_at)}</div>
      <p>${cmd.type === 'livraison' ? 'LIVRAISON' : 'À EMPORTER'}<br>${cmd.client_nom ?? ''} ${cmd.client_phone}<br>${cmd.adresse_livraison ?? ''}</p>
      <table>${lignes}</table>
      <div class="t">Sous-total : ${cmd.sous_total}<br>Livraison : ${cmd.frais_livraison}<br>Réduction : -${Number(cmd.reduction) + Number(cmd.reduction_points)}<br><b>TOTAL : ${cmd.montant_total} FCFA</b><br>Paiement : ${MODES_PAIEMENT[cmd.mode_paiement]?.label} (${cmd.statut_paiement === 'paye' ? 'payé' : 'à encaisser'})</div>
      ${cmd.instructions ? `<p>Note : ${cmd.instructions}</p>` : ''}<p style="text-align:center">Merci et bon appétit !</p>
      <script>window.print();setTimeout(()=>window.close(),300)</script></body></html>`);
    w.document.close();
  };

  return (
    <Drawer open={!!commandeId} onClose={onClose} size={520} destroyOnHidden
      title={cmd ? <Space>{cmd.numero}<TagStatut statut={cmd.statut} /></Space> : 'Commande'}
      extra={cmd && <Button icon={<PrinterOutlined />} onClick={imprimer}>Ticket</Button>}>
      {!cmd ? <Skeleton active /> : (
        <>
          {suivante && cmd.statut !== 'annulee' && (
            <Button type="primary" size="large" block loading={occupe} style={{ marginBottom: 16 }}
              onClick={() => action(() => patch(`/commandes/${cmd.id}/statut`, { statut: suivante.statut }), STATUTS_COMMANDE[suivante.statut].label)}>
              {suivante.label}
            </Button>
          )}
          {cmd.mode_paiement !== 'especes' && cmd.statut_paiement !== 'paye' && cmd.statut === 'en_attente' && (
            <Tag color="gold" style={{ marginBottom: 12, whiteSpace: 'normal' }}>
              En attente du paiement {MODES_PAIEMENT[cmd.mode_paiement].label} du client
            </Tag>
          )}

          <Descriptions column={1} size="small" bordered items={[
            { key: 'c', label: 'Client', children: <>{cmd.client_nom || '—'}<br /><a href={`tel:${cmd.client_phone}`}><PhoneOutlined /> {cmd.client_phone}</a></> },
            { key: 't', label: 'Type', children: cmd.type === 'livraison' ? 'Livraison' : 'À emporter' },
            ...(cmd.type === 'livraison' ? [{ key: 'a', label: 'Adresse', children: <>
              {cmd.adresse_livraison}{cmd.zones_livraison && <Tag style={{ marginLeft: 6 }}>{cmd.zones_livraison.nom}</Tag>}
              {cmd.latitude && <div><a target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${cmd.latitude}&mlon=${cmd.longitude}#map=17/${cmd.latitude}/${cmd.longitude}`}><EnvironmentOutlined /> Voir sur la carte</a></div>}
            </> }] : []),
            ...(cmd.instructions ? [{ key: 'i', label: 'Instructions', children: cmd.instructions }] : []),
            { key: 'p', label: 'Paiement', children: <Space>{MODES_PAIEMENT[cmd.mode_paiement]?.label}<TagPaiement statut={cmd.statut_paiement} /></Space> },
            { key: 'd', label: 'Passée le', children: dateHeure(cmd.created_at) },
            ...(cmd.temps_estime_min ? [{ key: 'e', label: 'Temps estimé', children: `${cmd.temps_estime_min} min` }] : []),
          ]} />

          <Divider titlePlacement="start" plain style={{ fontWeight: 600 }}>Articles</Divider>
          {cmd.commande_items.map((i) => (
            <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
              <div>
                <b style={{ color: '#E4572E', marginRight: 8 }}>{i.quantite}×</b>{i.nom}
                {i.notes && <div style={{ fontSize: 12, color: '#b45309', marginLeft: 26 }}>↳ {i.notes}</div>}
              </div>
              <span>{fcfa(i.total)}</span>
            </div>
          ))}
          <div style={{ marginTop: 10, fontSize: 13.5, lineHeight: 1.9 }}>
            <Ligne l="Sous-total" v={fcfa(cmd.sous_total)} />
            {cmd.type === 'livraison' && <Ligne l="Livraison" v={fcfa(cmd.frais_livraison)} />}
            {Number(cmd.reduction) > 0 && <Ligne l={`Code ${cmd.code_promo ?? ''}`} v={`- ${fcfa(cmd.reduction)}`} />}
            {Number(cmd.reduction_points) > 0 && <Ligne l={`Fidélité (${cmd.points_utilises} pts)`} v={`- ${fcfa(cmd.reduction_points)}`} />}
            <Ligne l={<b>Total</b>} v={<b style={{ fontSize: 16 }}>{fcfa(cmd.montant_total)}</b>} />
          </div>

          {cmd.type === 'livraison' && peut('admin', 'gerant') && !['livree', 'annulee'].includes(cmd.statut) && (
            <>
              <Divider titlePlacement="start" plain style={{ fontWeight: 600 }}>Livreur</Divider>
              <Select style={{ width: '100%' }} placeholder="Assigner un livreur" allowClear value={cmd.livreur_id ?? undefined}
                options={livreurs.map((l) => ({ value: l.id, label: `${l.nom ?? 'Livreur'}${l.livreurs?.disponible === false ? ' (en course)' : ''}` }))}
                onChange={(v) => action(() => patch(`/commandes/${cmd.id}/livreur`, { livreur_id: v ?? null }), v ? 'Livreur assigné' : 'Livreur retiré')} />
            </>
          )}

          <Divider titlePlacement="start" plain style={{ fontWeight: 600 }}>Suivi</Divider>
          <Timeline items={historique.map((h) => ({
            color: STATUTS_COMMANDE[h.statut]?.hex,
            title: heure(h.created_at),
            content: <>{STATUTS_COMMANDE[h.statut]?.label}{h.note && <div style={{ color: '#8A8F98', fontSize: 12 }}>{h.note}</div>}</>,
          }))} />

          {cmd.paiements?.length > 0 && (
            <>
              <Divider titlePlacement="start" plain style={{ fontWeight: 600 }}>Transactions</Divider>
              {cmd.paiements.map((p) => (
                <div key={p.id} style={{ fontSize: 12.5, padding: '4px 0' }}>
                  <TagPaiement statut={p.statut} /> {MODES_PAIEMENT[p.operateur]?.label} · {p.telephone} · {fcfa(p.montant)}
                  <div style={{ color: '#8A8F98' }}>{p.reference} {p.simule && '(simulé)'} · {dateHeure(p.created_at)}</div>
                </div>
              ))}
            </>
          )}

          {!['livree', 'annulee'].includes(cmd.statut) && (peut('admin', 'gerant') || (peut('cuisine') && ['en_attente', 'confirmee'].includes(cmd.statut))) && (
            <div style={{ marginTop: 24 }}>
              <Popconfirm title="Annuler cette commande ?" okText="Annuler la commande" cancelText="Retour" okButtonProps={{ danger: true }}
                description={<Input.TextArea rows={2} placeholder="Motif (envoyé au client)" value={motif} onChange={(e) => setMotif(e.target.value)} />}
                onConfirm={() => action(() => post(`/commandes/${cmd.id}/annuler`, { motif: motif || undefined }), 'Commande annulée')}>
                <Button danger block>Annuler la commande</Button>
              </Popconfirm>
            </div>
          )}
          {cmd.motif_annulation && <p style={{ color: '#DC2626', marginTop: 16 }}>Motif d'annulation : {cmd.motif_annulation}</p>}
        </>
      )}
    </Drawer>
  );
}

const Ligne = ({ l, v }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>{l}</span><span>{v}</span></div>
);
