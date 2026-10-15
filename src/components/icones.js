import L from 'leaflet';

const pastille = (emoji, couleur) => L.divIcon({
  className: '',
  html: `<div style="width:34px;height:34px;border-radius:50%;background:${couleur};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);display:grid;place-items:center;font-size:16px">${emoji}</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -16],
});

export const ICONES = {
  restaurant: pastille('🔥', '#E4572E'),
  client: pastille('🏠', '#2F6FED'),
  livreur: pastille('🛵', '#7A4FD6'),
  livreurLibre: pastille('🛵', '#2E9E5B'),
};

