import L from "leaflet";

/*
 * Leaflet's default image markers can require additional
 * asset-path configuration in Vite.
 *
 * We use DivIcon markers instead. They are rendered using
 * HTML and CSS and do not depend on external image files.
 */

const markerIconCache = new Map();

function normalizeStatus(status) {
  return String(
    status || "UNKNOWN",
  ).toLowerCase();
}

function getCachedMarkerIcon({
  resourceType,
  status,
  label,
}) {
  const normalizedStatus =
    normalizeStatus(status);

  const cacheKey =
    `${resourceType}:${normalizedStatus}`;

  if (markerIconCache.has(cacheKey)) {
    return markerIconCache.get(cacheKey);
  }

  const icon = L.divIcon({
    className:
      "medical-map-marker-wrapper",

    html: `
      <div
        class="
          medical-map-marker
          medical-map-marker--${resourceType}
          medical-map-marker--${normalizedStatus}
        "
        aria-hidden="true"
      >
        <span class="medical-map-marker__halo"></span>

        <span class="medical-map-marker__content">
          ${label}
        </span>
      </div>
    `,

    iconSize: [42, 42],

    iconAnchor: [21, 21],

    popupAnchor: [0, -24],
  });

  markerIconCache.set(
    cacheKey,
    icon,
  );

  return icon;
}

export function getFacilityMapIcon(
  status,
) {
  return getCachedMarkerIcon({
    resourceType: "facility",
    status,
    label: "+",
  });
}

export function getAmbulanceMapIcon(
  status,
) {
  return getCachedMarkerIcon({
    resourceType: "ambulance",
    status,
    label: "A",
  });
}

export function getEmergencyMapIcon(
    status,
  ) {
    return getCachedMarkerIcon({
      resourceType: "emergency",
  
      status,
  
      label: "!",
    });
  }
  
/*
 * Creates the circular icon displayed when several nearby
 * markers are combined into one cluster.
 */
export function createMedicalClusterIcon(
  cluster,
) {
  const markerCount =
    cluster.getChildCount();

  let clusterSizeClass =
    "medical-map-cluster--small";

  if (markerCount >= 10) {
    clusterSizeClass =
      "medical-map-cluster--medium";
  }

  if (markerCount >= 50) {
    clusterSizeClass =
      "medical-map-cluster--large";
  }

  return L.divIcon({
    className:
      "medical-map-cluster-wrapper",

    html: `
      <div
        class="
          medical-map-cluster
          ${clusterSizeClass}
        "
      >
        <span>${markerCount}</span>
      </div>
    `,

    iconSize: [48, 48],

    iconAnchor: [24, 24],
  });
}