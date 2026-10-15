import { useEffect, useState } from 'react';
import { Alert, App, Button, Col, Form, Input, InputNumber, Row, Segmented, Skeleton, Switch, Tabs, TimePicker } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useMapEvents } from 'react-leaflet';
import { ImageUpload, PageEntete } from '../components/ui';
import Carte from '../components/Carte';
import { ICONES } from '../components/icones';
import { supabase } from '../lib/supabase';
import { patch, put } from '../lib/api';
import { sb } from '../lib/hooks';
import { dayjs, JOURS } from '../lib/format';

function Clic({ onClic }) {
  useMapEvents({ click: (e) => onClic(+e.latlng.lat.toFixed(5), +e.latlng.lng.toFixed(5)) });
  return null;
}

export default function Parametres() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [horaires, setHoraires] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const [charge, setCharge] = useState(false);
  const lat = Form.useWatch('latitude', form);
  const lng = Form.useWatch('longitude', form);

  useEffect(() => {
    Promise.all([
      sb(supabase.from('parametres').select('*').eq('id', 1).single()),
      sb(supabase.from('horaires').select('*').order('jour')),
    ]).then(([p, h]) => { form.setFieldsValue(p); setHoraires(h); setCharge(true); })
      .catch((e) => message.error(e.message));
  }, [form, message]);

  const enregistrer = async () => {
    setEnvoi(true);
    try {
      const v = await form.validateFields();
      await patch('/parametres', v);
      await put('/horaires', { horaires: horaires.map((h) => ({ jour: h.jour, ouverture: h.ouverture.slice(0, 5), fermeture: h.fermeture.slice(0, 5), ferme: h.ferme })) });
      message.success('Paramètres enregistrés');
    } catch (e) {
      if (e?.errorFields) message.error('Vérifiez les champs en rouge'); else message.error(e.message);
    } finally { setEnvoi(false); }
  };

  const majJour = (jour, champ, valeur) => setHoraires((l) => l.map((h) => (h.jour === jour ? { ...h, [champ]: valeur } : h)));

  if (!charge) return <Skeleton active paragraph={{ rows: 10 }} />;

  const ordreJours = [1, 2, 3, 4, 5, 6, 0];

  return (
    <>
      <PageEntete titre="Paramètres" sousTitre="Réglages appliqués immédiatement à l’application client."
        actions={<Button type="primary" icon={<SaveOutlined />} loading={envoi} onClick={enregistrer}>Enregistrer</Button>} />
      <Form form={form} layout="vertical">
        <div className="carte" style={{ padding: '4px 20px 20px' }}>
          <Tabs items={[
            { key: 'resto', label: 'Restaurant', forceRender: true, children: (
              <Row gutter={20}>
                <Col xs={24} md={6}><Form.Item name="logo_url" label="Logo"><ImageUpload dossier="restaurant" /></Form.Item></Col>
                <Col xs={24} md={18}>
                  <Row gutter={12}>
                    <Col xs={24} md={12}><Form.Item name="nom_restaurant" label="Nom" rules={[{ required: true }]}><Input /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item name="slogan" label="Slogan"><Input /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item name="telephone" label="Téléphone"><Input /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item name="email" label="Email"><Input /></Form.Item></Col>
                    <Col span={24}><Form.Item name="adresse" label="Adresse"><Input /></Form.Item></Col>
                    <Col span={12}><Form.Item name="latitude" label="Latitude"><InputNumber style={{ width: '100%' }} step={0.0001} /></Form.Item></Col>
                    <Col span={12}><Form.Item name="longitude" label="Longitude"><InputNumber style={{ width: '100%' }} step={0.0001} /></Form.Item></Col>
                  </Row>
                  <div style={{ fontSize: 12.5, color: '#6b7280', marginBottom: 6 }}>Cliquez sur la carte pour placer le restaurant (point de départ des livreurs).</div>
                  {lat != null && (
                    <Carte centre={[lat, lng]} hauteur={260} marqueurs={[{ cle: 'r', position: [lat, lng], icone: ICONES.restaurant }]}>
                      <Clic onClic={(a, b) => form.setFieldsValue({ latitude: a, longitude: b })} />
                    </Carte>
                  )}
                </Col>
              </Row>
            ) },
            { key: 'horaires', label: 'Ouverture & horaires', forceRender: true, children: (
              <>
                <Form.Item name="mode_ouverture" label="Mode d’ouverture" extra="« Automatique » suit les horaires ci-dessous. Les deux autres modes forcent l’état.">
                  <Segmented options={[{ label: 'Automatique', value: 'auto' }, { label: 'Toujours ouvert', value: 'ouvert' }, { label: 'Fermé (exceptionnel)', value: 'ferme' }]} />
                </Form.Item>
                <Form.Item name="message_fermeture" label="Message affiché quand le restaurant est fermé"><Input /></Form.Item>
                <div style={{ fontWeight: 600, marginBottom: 10 }}>Horaires de la semaine</div>
                {ordreJours.map((j) => {
                  const h = horaires.find((x) => x.jour === j) ?? { jour: j, ouverture: '10:00', fermeture: '23:00', ferme: true };
                  return (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #f3f4f6', flexWrap: 'wrap' }}>
                      <span style={{ width: 90, fontWeight: 500 }}>{JOURS[j]}</span>
                      <Switch checked={!h.ferme} checkedChildren="Ouvert" unCheckedChildren="Fermé" onChange={(v) => majJour(j, 'ferme', !v)} />
                      <TimePicker.RangePicker format="HH:mm" minuteStep={15} disabled={h.ferme} allowClear={false} order={false}
                        value={[dayjs(h.ouverture, 'HH:mm'), dayjs(h.fermeture, 'HH:mm')]}
                        onChange={(v) => { if (v) { majJour(j, 'ouverture', v[0].format('HH:mm')); majJour(j, 'fermeture', v[1].format('HH:mm')); } }} />
                      {h.fermeture.slice(0, 5) < h.ouverture.slice(0, 5) && !h.ferme && <span style={{ fontSize: 12, color: '#6b7280' }}>ferme le lendemain</span>}
                    </div>
                  );
                })}
              </>
            ) },
            { key: 'commandes', label: 'Commandes', forceRender: true, children: (
              <Row gutter={16}>
                <Col xs={12} md={6}><Form.Item name="livraison_active" label="Livraison" valuePropName="checked"><Switch /></Form.Item></Col>
                <Col xs={12} md={6}><Form.Item name="emporter_active" label="À emporter" valuePropName="checked"><Switch /></Form.Item></Col>
                <Col xs={24} md={12} />
                <Col xs={24} md={12}><Form.Item name="frais_livraison_defaut" label="Frais de livraison par défaut" extra="Si le client ne choisit pas de zone"><InputNumber min={0} style={{ width: '100%' }} suffix="FCFA" /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item name="temps_preparation_moyen" label="Temps de préparation moyen"><InputNumber min={0} style={{ width: '100%' }} suffix="min" /></Form.Item></Col>
              </Row>
            ) },
            { key: 'resa', label: 'Réservations', forceRender: true, children: (
              <Row gutter={16}>
                <Col xs={12} md={6}><Form.Item name="reservation_active" label="Réservations en ligne" valuePropName="checked"><Switch /></Form.Item></Col>
                <Col xs={12} md={6}><Form.Item name="reservation_auto_confirmee" label="Confirmation automatique" valuePropName="checked"><Switch /></Form.Item></Col>
                <Col xs={24} md={12} />
                <Col xs={24} md={8}><Form.Item name="capacite_par_creneau" label="Couverts max par créneau"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="duree_creneau_min" label="Durée d’un repas"><InputNumber min={15} step={15} style={{ width: '100%' }} suffix="min" /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="delai_min_reservation_min" label="Délai minimum avant"><InputNumber min={0} step={15} style={{ width: '100%' }} suffix="min" /></Form.Item></Col>
              </Row>
            ) },
            { key: 'fidelite', label: 'Fidélité', forceRender: true, children: (
              <Row gutter={16}>
                <Col span={24}><Form.Item name="fidelite_active" label="Programme de fidélité" valuePropName="checked"><Switch /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="fidelite_tranche" label="1 point gagné tous les" extra="Points crédités à la livraison"><InputNumber min={1} style={{ width: '100%' }} suffix="FCFA" /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="fidelite_valeur_point" label="Valeur d’un point"><InputNumber min={1} style={{ width: '100%' }} suffix="FCFA" /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="fidelite_seuil" label="Points minimum pour utiliser" extra="0 = utilisables dès le premier point"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
              </Row>
            ) },
            { key: 'simulation', label: 'Paiement & GPS', forceRender: true, children: (
              <>
                <Alert type="info" showIcon style={{ marginBottom: 16 }} title="Mode démonstration"
                  description="Tant que les vraies API Yas / Moov et Google Maps ne sont pas branchées, l’application simule le paiement (code PIN 0000 = refus) et le trajet du livreur." />
                <Form.Item name="simulation_paiement" label="Paiement Mobile Money simulé" valuePropName="checked"><Switch /></Form.Item>
                <Form.Item name="simulation_gps" label="Position du livreur simulée" valuePropName="checked" extra="Désactivé automatiquement pour un livreur qui partage sa vraie position."><Switch /></Form.Item>
              </>
            ) },
          ]} />
        </div>
      </Form>
    </>
  );
}
