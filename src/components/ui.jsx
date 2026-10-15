import { useState } from 'react';
import { App, Tag, Upload } from 'antd';
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { supabase } from '../lib/supabase';
import { post } from '../lib/api';
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
/** Réduit une photo (max 1600 px, JPEG 85 %) avant l'envoi. Renvoie le fichier d'origine si le navigateur ne sait pas la lire. */
async function compresser(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const echelle = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    if (echelle === 1 && file.size < 900 * 1024) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * echelle);
    canvas.height = Math.round(bitmap.height * echelle);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', 0.85));
    return blob ? new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
  } catch {
    return file;
  }
}

const enBase64 = (blob) => new Promise((ok, ko) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result).split(',')[1] ?? '');
  r.onerror = () => ko(r.error);
  r.readAsDataURL(blob);
});

export function ImageUpload({ value, onChange, dossier = 'divers', ratio = 1 }) {
  const [envoi, setEnvoi] = useState(false);
  const { message } = App.useApp();

  const televerser = async ({ file, onSuccess, onError }) => {
    if (!file.type?.startsWith('image/')) { message.error('Choisissez une image (JPG, PNG ou WEBP).'); return; }
    if (/heic|heif/i.test(file.type)) { message.error('Format HEIC non pris en charge : exportez la photo en JPG.'); return; }
    setEnvoi(true);
    try {
      const image = await compresser(file);
      if (image.size > 8 * 1024 * 1024) throw new Error('Image trop lourde (8 Mo maximum).');
      let url;
      // 1. Envoi direct vers le stockage Supabase
      const ext = (image.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const chemin = `${dossier}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('images').upload(chemin, image, { upsert: false, contentType: image.type || 'image/jpeg' });
      if (!error) {
        url = supabase.storage.from('images').getPublicUrl(chemin).data.publicUrl;
      } else {
        // 2. Repli : envoi par l'API (clé serveur), si le stockage refuse l'envoi direct
        console.warn('Envoi direct refusé, passage par l’API :', error.message);
        const r = await post('/images', { dossier, type: image.type || 'image/jpeg', base64: await enBase64(image) });
        url = r.url;
      }
      onChange?.(url);
      onSuccess?.({ url });
      message.success('Image envoyée');
    } catch (e) {
      onError?.(e);
      message.error(`Envoi impossible : ${e.message}`);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <Upload listType="picture-card" showUploadList={false} customRequest={televerser} accept="image/jpeg,image/png,image/webp" disabled={envoi}>
        {value ? (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, aspectRatio: ratio, opacity: envoi ? 0.4 : 1 }} />
            {envoi && <LoadingOutlined style={{ position: 'absolute', inset: 0, margin: 'auto', fontSize: 22, height: 22 }} />}
          </div>
        ) : (
          <div style={{ color: '#9aa0ab' }}>
            {envoi ? <LoadingOutlined /> : <PlusOutlined />}
            <div style={{ marginTop: 6, fontSize: 12 }}>{envoi ? 'Envoi…' : 'Ajouter une image'}</div>
          </div>
        )}
      </Upload>
      {value && !envoi && (
        <a onClick={() => onChange?.(null)} style={{ fontSize: 12.5, color: '#dc2626', marginTop: 4 }}>Retirer</a>
      )}
    </div>
  );
}

export function Vignette({ src, taille = 44 }) {
  return src ? (
    <img src={src} alt="" style={{ width: taille, height: taille, objectFit: 'cover', borderRadius: 10, display: 'block' }} />
  ) : (
    <div style={{ width: taille, height: taille, borderRadius: 10, background: '#f1f2f5', display: 'grid', placeItems: 'center', color: '#c0c4cc' }}>🍽</div>
  );
}
