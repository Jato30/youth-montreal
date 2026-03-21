import { transitLines, transitStations } from '../data/transitData.js';

function stationStyle(color) {
  return {
    radius: 4,
    color: '#0f172a',
    fillColor: color,
    fillOpacity: 0.95,
    weight: 1
  };
}

export function addTransitOverlay(map) {
  const layers = [];

  Object.entries(transitLines).forEach(([type, lines]) => {
    lines.forEach((line) => {
      const polyline = L.polyline(line.points, {
        color: line.color,
        weight: 4,
        opacity: 0.92,
        lineJoin: 'round'
      }).addTo(map);
      polyline.bindTooltip(line.name, { sticky: true });
      layers.push(polyline);
    });

    (transitStations[type] || []).forEach((station) => {
      const marker = L.circleMarker([station.lat, station.lng], stationStyle(station.color)).addTo(map);
      marker.bindTooltip(station.name, { direction: 'top', offset: [0, -4] });
      layers.push(marker);
    });
  });

  return L.layerGroup(layers);
}
