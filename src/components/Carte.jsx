import { useEffect } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';

/**
 * 🗺️ Carte OpenStreetMap (gratuite, sans clé).
 * Elle sera remplacée par Google Maps quand la clé API sera disponible :
 * seul ce composant est à modifier.
 */
function Cadrage({ points }) {
  const map = useMap();
  const cle = points.map((p) => p.join(',')).join('|');
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 15 });
    else if (points.length === 1) map.setView(points[0], 14);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);
  return null;
}

export default function Carte({ centre, marqueurs = [], trajets = [], hauteur = 460, children }) {
  const points = marqueurs.filter((m) => m.position?.[0] != null).map((m) => m.position);
  return (
    <MapContainer center={centre} zoom={13} style={{ height: hauteur, width: '100%' }} scrollWheelZoom>
      <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {marqueurs.filter((m) => m.position?.[0] != null).map((m) => (
        <Marker key={m.cle} position={m.position} icon={m.icone}>
          {m.popup && <Popup>{m.popup}</Popup>}
        </Marker>
      ))}
      {trajets.map((t) => <Polyline key={t.cle} positions={t.points} pathOptions={{ color: t.couleur ?? '#7A4FD6', weight: 3, dashArray: '6 8' }} />)}
      <Cadrage points={points} />
      {children}
    </MapContainer>
  );
}
