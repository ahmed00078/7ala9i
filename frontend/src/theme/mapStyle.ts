/**
 * §5.11 — warm-monochrome Google Maps style. Soft beige roads, muted greens for
 * parks, near-white POIs. Hides clutter (transit, business POIs) so salon pins
 * carry the visual weight. Apply via `<MapView customMapStyle={mapStyle} />`.
 *
 * Tested only with the Google provider on Android; iOS (AppleMaps) ignores it.
 */
export const warmMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#F2EFEA' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5B6573' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#F7F6F2' }] },

  { featureType: 'administrative.land_parcel', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#3D434F' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#6F7886' }] },

  // POIs muted — we don't want competing branding on the map
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#8A93A1' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#D7DBC8' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6B7659' }] },

  // Roads — warm beige, light hierarchy
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FAF6EE' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#F1ECDF' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#6F6952' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#E9DEC2' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#5C4F2A' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#8A8676' }] },

  { featureType: 'transit', stylers: [{ visibility: 'off' }] },

  // Water — soft slate-teal, not bright blue
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#C9DCDB' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4F6A6F' }] },
] as const;
