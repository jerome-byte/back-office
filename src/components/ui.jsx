import { useState } from 'react';
import { App, Tag, Upload } from 'antd';
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { supabase } from '../lib/supabase';
import { STATUTS_COMMANDE, STATUTS_PAIEMENT, STATUTS_RESERVATION } from '../lib/format';

export function PageEntete({ titre, sousTitre, actions }) {
  return (
    <div className="page-entete">
      <div>
        <h1>{titre}</h1>
        {sousTitre && <p>{sousTitre}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>{actions}</div>}
    </div>
  );
}

export function Kpi({ icone, label, valeur, sous, couleur }) {
  return (
    <div className="carte kpi">
      <div className="kpi-label">
        <span className="kpi-icone" style={couleur ? { background: `${couleur}18`, color: couleur } : undefined}>{icone}</span>
        {label}
      </div>
      <div className="kpi-valeur">{valeur}</div>
      {sous && <div className="kpi-sous">{sous}</div>}
    </div>
  );
}

export const TagStatut = ({ statut }) => {
  const s = STATUTS_COMMANDE[statut] ?? { label: statut, color: 'default' };
  return <Tag color={s.color} style={{ fontWeight: 600 }}>{s.label}</Tag>;
};

export const TagPaiement = ({ statut }) => {
  const s = STATUTS_PAIEMENT[statut] ?? { label: statut, color: 'default' };
  return <Tag color={s.color} variant="outlined">{s.label}</Tag>;
};

export const TagReservation = ({ statut }) => {
  const s = STATUTS_RESERVATION[statut] ?? { label: statut, color: 'default' };
  return <Tag color={s.color} style={{ fontWeight: 600 }}>{s.label}</Tag>;
};

/** Envoi d'image vers le stockage Supabase (bucket "images"). */
export function ImageUpload({ value, onChange, dossier = 'divers', ratio = 1 }) {
  const [envoi, setEnvoi] = useState(false);
  const { message } = App.useApp();

  const televerser = async ({ file }) => {
    if (file.size > 5 * 1024 * 1024) { message.error('Image trop lourde (5 Mo maximum).'); return; }
    setEnvoi(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      const chemin = `${dossier}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('images').upload(chemin, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from('images').getPublicUrl(chemin);
      onChange?.(data.publicUrl);
      message.success('Image envoyée');
    } catch (e) {
      message.error(`Envoi impossible : ${e.message}`);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Upload listType="picture-card" showUploadList={false} customRequest={televerser} accept="image/*"
      style={{ width: '100%' }}>
      {value ? (
        <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, aspectRatio: ratio }} />
      ) : (
        <div style={{ color: '#9aa0ab' }}>
          {envoi ? <LoadingOutlined /> : <PlusOutlined />}
          <div style={{ marginTop: 6, fontSize: 12 }}>Ajouter une image</div>
        </div>
      )}
    </Upload>
  );
}

export function Vignette({ src, taille = 44 }) {
  return src ? (
    <img src={src} alt="" style={{ width: taille, height: taille, objectFit: 'cover', borderRadius: 10, display: 'block' }} />
  ) : (
    <div style={{ width: taille, height: taille, borderRadius: 10, background: '#f1f2f5', display: 'grid', placeItems: 'center', color: '#c0c4cc' }}>🍽</div>
  );
}
