import {
  Layers3,
  MapPinned,
} from "lucide-react";

import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  ZoomControl,
} from "react-leaflet";

import MarkerClusterGroup from "react-leaflet-cluster";

import GovernorateBoundariesLayer from "./GovernorateBoundariesLayer.jsx";
import HistoricalReplayMapLayer from "./HistoricalReplayMapLayer.jsx";
import MapResizeController from "./MapResizeController.jsx";

import {
  createMedicalClusterIcon,
  getAmbulanceMapIcon,
  getEmergencyMapIcon,
  getFacilityMapIcon,
} from "./mapIcons.js";

import {
  useMapUiStore,
} from "../../stores/mapUiStore.js";

import "../../styles/operations-map.css";

/*
 * Approximate geographical center of Syria.
 *
 * React Leaflet position order:
 * [latitude, longitude]
 */
const SYRIA_MAP_CENTER = [
  34.8,
  38.99,
];

const DEFAULT_SYRIA_ZOOM = 6;

function formatFacilityType(
  facilityType,
) {
  const labels = {
    CENTRAL_HOSPITAL:
      "Central Hospital",

    CLINIC:
      "Clinic",

    FIELD_MEDICAL_POINT:
      "Field Medical Point",
  };

  return (
    labels[facilityType] ??
    facilityType
  );
}

function formatDateTime(
  value,
) {
  if (!value) {
    return "No live update received";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      dateStyle:
        "medium",

      timeStyle:
        "medium",
    },
  ).format(date);
}

function hasValidLocation(
  resource,
) {
  return Boolean(
    resource?.location &&
      Number.isFinite(
        resource
          .location
          .latitude,
      ) &&
      Number.isFinite(
        resource
          .location
          .longitude,
      ),
  );
}

function FacilityPopup({
  facility,
}) {
  const occupancy =
    facility.occupancy;

  return (
    <div className="medical-map-popup">
      <span className="medical-map-popup__eyebrow">
        Medical Facility
      </span>

      <h3>
        {facility.name}
      </h3>

      <p className="medical-map-popup__subtitle">
        {formatFacilityType(
          facility.facilityType,
        )}
      </p>

      <dl className="medical-map-popup__details">
        <div>
          <dt>
            Governorate
          </dt>

          <dd>
            {facility.governorate
              ?.name ??
              "Unknown"}
          </dd>
        </div>

        <div>
          <dt>
            Total beds
          </dt>

          <dd>
            {facility.totalBeds}
          </dd>
        </div>

        <div>
          <dt>
            Occupied beds
          </dt>

          <dd>
            {occupancy
              ?.occupiedBeds ??
              "No data"}
          </dd>
        </div>

        <div>
          <dt>
            Available beds
          </dt>

          <dd>
            {occupancy
              ?.availableBeds ??
              "No data"}
          </dd>
        </div>

        <div>
          <dt>
            Occupancy
          </dt>

          <dd>
            {occupancy
              ? `${Number(
                  occupancy
                    .occupancyPercentage,
                ).toFixed(1)}%`
              : "No data"}
          </dd>
        </div>

        <div>
          <dt>
            Status
          </dt>

          <dd>
            <span
              className={`medical-map-popup__status medical-map-popup__status--${(
                occupancy?.status ??
                "UNKNOWN"
              ).toLowerCase()}`}
            >
              {occupancy?.status ??
                "UNKNOWN"}
            </span>
          </dd>
        </div>
      </dl>

      <p className="medical-map-popup__updated">
        Last occupancy update:
        <br />

        {formatDateTime(
          occupancy?.recordedAt,
        )}
      </p>
    </div>
  );
}

function AmbulancePopup({
  ambulance,
}) {
  return (
    <div className="medical-map-popup">
      <span className="medical-map-popup__eyebrow">
        Ambulance Unit
      </span>

      <h3>
        {ambulance.code}
      </h3>

      <p className="medical-map-popup__subtitle">
        {ambulance.baseFacility
          ?.name ??
          "No base facility"}
      </p>

      <dl className="medical-map-popup__details">
        <div>
          <dt>
            Status
          </dt>

          <dd>
            <span
              className={`medical-map-popup__status medical-map-popup__status--${ambulance.status.toLowerCase()}`}
            >
              {ambulance.status}
            </span>
          </dd>
        </div>

        <div>
          <dt>
            Operational
          </dt>

          <dd>
            {ambulance.isOperational
              ? "Yes"
              : "No"}
          </dd>
        </div>

        <div>
          <dt>
            Governorate
          </dt>

          <dd>
            {ambulance.governorate
              ?.name ??
              "Unknown"}
          </dd>
        </div>

        <div>
          <dt>
            Device sequence
          </dt>

          <dd>
            {ambulance
              .lastSequenceNumber ??
              0}
          </dd>
        </div>

        <div>
          <dt>
            Route sequence
          </dt>

          <dd>
            {ambulance
              .routeSequenceNumber ??
              "Not active"}
          </dd>
        </div>

        <div>
          <dt>
            Latitude
          </dt>

          <dd>
            {ambulance.location
              ?.latitude
              ?.toFixed(5) ??
              "Unavailable"}
          </dd>
        </div>

        <div>
          <dt>
            Longitude
          </dt>

          <dd>
            {ambulance.location
              ?.longitude
              ?.toFixed(5) ??
              "Unavailable"}
          </dd>
        </div>
      </dl>

      <p className="medical-map-popup__updated">
        Last location update:
        <br />

        {formatDateTime(
          ambulance.lastLocationAt,
        )}
      </p>
    </div>
  );
}

function EmergencyPopup({
  emergency,
}) {
  return (
    <div className="medical-map-popup">
      <span className="medical-map-popup__eyebrow">
        Emergency Case
      </span>

      <h3>
        {emergency.caseNumber}
      </h3>

      <p className="medical-map-popup__subtitle">
        {emergency.summary}
      </p>

      <dl className="medical-map-popup__details">
        <div>
          <dt>
            Status
          </dt>

          <dd>
            <span
              className={`medical-map-popup__status medical-map-popup__status--${emergency.status.toLowerCase()}`}
            >
              {emergency.status}
            </span>
          </dd>
        </div>

        <div>
          <dt>
            Governorate
          </dt>

          <dd>
            {emergency.governorate
              ?.name ??
              "Unknown"}
          </dd>
        </div>

        <div>
          <dt>
            Latitude
          </dt>

          <dd>
            {emergency.location
              .latitude
              .toFixed(5)}
          </dd>
        </div>

        <div>
          <dt>
            Longitude
          </dt>

          <dd>
            {emergency.location
              .longitude
              .toFixed(5)}
          </dd>
        </div>

        <div>
          <dt>
            Active alerts
          </dt>

          <dd>
            {emergency
              .activeAlertCount ??
              0}
          </dd>
        </div>

        <div>
          <dt>
            Created by
          </dt>

          <dd>
            {emergency.createdBy
              ?.name ??
              "Unknown"}
          </dd>
        </div>
      </dl>

      <p className="medical-map-popup__updated">
        Reported:
        <br />

        {formatDateTime(
          emergency.reportedAt,
        )}
      </p>
    </div>
  );
}

function DispatchRoutePopup({
  route,
}) {
  const latestPoint =
    route.points[
      route.points.length - 1
    ];

  return (
    <div className="medical-map-popup">
      <span className="medical-map-popup__eyebrow">
        Active Ambulance Route
      </span>

      <h3>
        {route.dispatchNumber}
      </h3>

      <p className="medical-map-popup__subtitle">
        Ambulance{" "}
        {route.ambulanceCode}
      </p>

      <dl className="medical-map-popup__details">
        <div>
          <dt>
            Dispatch status
          </dt>

          <dd>
            <span
              className={`medical-map-popup__status medical-map-popup__status--${route.status.toLowerCase()}`}
            >
              {route.status}
            </span>
          </dd>
        </div>

        <div>
          <dt>
            Route points
          </dt>

          <dd>
            {route.points.length}
          </dd>
        </div>

        <div>
          <dt>
            Last sequence
          </dt>

          <dd>
            {route.lastSequence}
          </dd>
        </div>

        <div>
          <dt>
            Speed
          </dt>

          <dd>
            {latestPoint
              ?.speedKmh !== null &&
            latestPoint
              ?.speedKmh !== undefined
              ? `${latestPoint.speedKmh.toFixed(
                  1,
                )} km/h`
              : "Unavailable"}
          </dd>
        </div>

        <div>
          <dt>
            Latitude
          </dt>

          <dd>
            {latestPoint
              ?.location
              ?.latitude
              ?.toFixed(5) ??
              "Unavailable"}
          </dd>
        </div>

        <div>
          <dt>
            Longitude
          </dt>

          <dd>
            {latestPoint
              ?.location
              ?.longitude
              ?.toFixed(5) ??
              "Unavailable"}
          </dd>
        </div>
      </dl>

      <p className="medical-map-popup__updated">
        Last route update:
        <br />

        {formatDateTime(
          latestPoint?.recordedAt,
        )}
      </p>
    </div>
  );
}

/*
 * Determines the initial map viewport from all currently
 * visible operational positions.
 */
function getMapConfiguration(
  facilities,
  ambulances,
  emergencies,
  dispatchRoutes,
) {
  const positions = [];

  for (
    const facility of
    facilities
  ) {
    if (
      hasValidLocation(
        facility,
      )
    ) {
      positions.push([
        facility.location
          .latitude,

        facility.location
          .longitude,
      ]);
    }
  }

  for (
    const ambulance of
    ambulances
  ) {
    if (
      hasValidLocation(
        ambulance,
      )
    ) {
      positions.push([
        ambulance.location
          .latitude,

        ambulance.location
          .longitude,
      ]);
    }
  }

  for (
    const emergency of
    emergencies
  ) {
    if (
      hasValidLocation(
        emergency,
      )
    ) {
      positions.push([
        emergency.location
          .latitude,

        emergency.location
          .longitude,
      ]);
    }
  }

  for (
    const route of
    dispatchRoutes
  ) {
    const routePoints = [
      ...(
        route.points ??
        []
      ),
  
      ...(
        route.remainingPoints ??
        []
      ),
  
      route.currentPoint,
    ];
  
    for (
      const point of
      routePoints
    ) {
      if (
        hasValidLocation(
          point,
        )
      ) {
        positions.push([
          point.location
            .latitude,
  
          point.location
            .longitude,
        ]);
      }
    }
  }

  if (
    positions.length > 1
  ) {
    return {
      bounds:
        positions,

      boundsOptions: {
        padding: [
          45,
          45,
        ],

        maxZoom:
          11,
      },
    };
  }

  if (
    positions.length === 1
  ) {
    return {
      center:
        positions[0],

      zoom:
        11,
    };
  }

  return {
    center:
      SYRIA_MAP_CENTER,

    zoom:
      DEFAULT_SYRIA_ZOOM,
  };
}

function SyriaOperationsMap({
  facilities = [],
  ambulances = [],
  emergencies = [],
  dispatchRoutes = [],
  generatedAt,
  selectedGovernorateId,
  mode = "live",
}) {
  const visibleLayers =
    useMapUiStore(
      (state) =>
        state.visibleLayers,
    );

  const toggleLayer =
    useMapUiStore(
      (state) =>
        state.toggleLayer,
    );

  const selectResource =
    useMapUiStore(
      (state) =>
        state.selectResource,
    );

  const validFacilities =
    facilities.filter(
      hasValidLocation,
    );

  const validAmbulances =
    ambulances.filter(
      hasValidLocation,
    );

  const validEmergencies =
    emergencies.filter(
      hasValidLocation,
    );

    const validDispatchRoutes =
    dispatchRoutes
      .map((route) => ({
        ...route,
  
        points:
          (
            route.points ??
            []
          ).filter(
            hasValidLocation,
          ),
  
        remainingPoints:
          (
            route
              .remainingPoints ??
            []
          ).filter(
            hasValidLocation,
          ),
  
        currentPoint:
          hasValidLocation(
            route.currentPoint,
          )
            ? route.currentPoint
            : null,
      }))
      .filter(
        (route) =>
          route.points.length >
            0 ||
          route
            .remainingPoints
            .length >
            0 ||
          route.currentPoint,
      );
  
  const replayAmbulanceIds =
    new Set(
      validDispatchRoutes
        .filter(
          (route) =>
            route
              .isHistoricalReplay &&
            route.currentPoint,
        )
        .map(
          (route) =>
            String(
              route
                .ambulanceId,
            ),
        ),
    );
  
  const ambulancesForMarkers =
    validAmbulances.filter(
      (ambulance) =>
        !replayAmbulanceIds.has(
          String(
            ambulance.id,
          ),
        ),
    );
  const mapConfiguration =
    getMapConfiguration(
      validFacilities,
      validAmbulances,
      validEmergencies,
      validDispatchRoutes,
    );

  /*
   * MapContainer options are initial configuration.
   *
   * Changing the governorate or manually refreshing the
   * snapshot recreates the map with the new initial bounds.
   *
   * Normal Socket.IO location updates do not change generatedAt,
   * so live markers move without rebuilding the entire map.
   */
  const historicalReplayDispatchId =
  validDispatchRoutes.find(
    (route) =>
      route
        .isHistoricalReplay,
  )?.dispatchId ??
  "no-replay";

  const mapInstanceKey = [
    selectedGovernorateId ??
      "all-governorates",
  
    mode,
  
    /*
     * Live updates must not recreate the Leaflet map.
     *
     * In historical mode, the map may be recreated when the
     * selected snapshot time changes.
     */
    mode === "historical"
      ? (
          generatedAt ??
          "initial-historical-snapshot"
        )
      : "persistent-live-map",
  
    historicalReplayDispatchId,
  ].join(":");

  const visibleFacilityCount =
    visibleLayers.facilities
      ? validFacilities.length
      : 0;

  const visibleAmbulanceCount =
    visibleLayers.ambulances
      ? validAmbulances.length
      : 0;

  const visibleEmergencyCount =
    visibleLayers.emergencies
      ? validEmergencies.length
      : 0;

  const visibleRouteCount =
    visibleLayers.routes
      ? validDispatchRoutes.length
      : 0;

  return (
    <section className="operations-map-card">
      <header className="operations-map-card__header">
        <div>
          <span className="operations-map-card__eyebrow">
            GIS Operations
          </span>

          <h2>
  {mode === "historical"
    ? "Historical Resource Map"
    : "Medical Resource Map"}
</h2>

<p>
  {mode === "historical"
    ? (
      <>
        Historical medical
        facilities, ambulance
        positions, emergency cases
        and dispatch routes at the
        selected time.
      </>
    )
    : (
      <>
        Live medical facilities,
        ambulance positions,
        emergency cases and active
        dispatch routes across the
        selected operational area.
      </>
    )}
</p>
        </div>

        <div className="operations-map-card__layers">
          <div className="operations-map-card__layers-label">
            <Layers3 size={15} />

            Map layers
          </div>

          <button
            type="button"
            className={
              visibleLayers.governorates
                ? "operations-map-layer operations-map-layer--active"
                : "operations-map-layer"
            }
            onClick={() => {
              toggleLayer(
                "governorates",
              );
            }}
            aria-pressed={
              visibleLayers.governorates
            }
          >
            <span className="operations-map-layer__dot operations-map-layer__dot--governorate" />

            Governorates
          </button>

          <button
            type="button"
            className={
              visibleLayers.facilities
                ? "operations-map-layer operations-map-layer--active"
                : "operations-map-layer"
            }
            onClick={() => {
              toggleLayer(
                "facilities",
              );
            }}
            aria-pressed={
              visibleLayers.facilities
            }
          >
            <span className="operations-map-layer__dot operations-map-layer__dot--facility" />

            Facilities
          </button>

          <button
            type="button"
            className={
              visibleLayers.ambulances
                ? "operations-map-layer operations-map-layer--active"
                : "operations-map-layer"
            }
            onClick={() => {
              toggleLayer(
                "ambulances",
              );
            }}
            aria-pressed={
              visibleLayers.ambulances
            }
          >
            <span className="operations-map-layer__dot operations-map-layer__dot--ambulance" />

            Ambulances
          </button>

          <button
            type="button"
            className={
              visibleLayers.emergencies
                ? "operations-map-layer operations-map-layer--active"
                : "operations-map-layer"
            }
            onClick={() => {
              toggleLayer(
                "emergencies",
              );
            }}
            aria-pressed={
              visibleLayers.emergencies
            }
          >
            <span className="operations-map-layer__dot operations-map-layer__dot--emergency" />

            Emergencies
          </button>

          <button
            type="button"
            className={
              visibleLayers.routes
                ? "operations-map-layer operations-map-layer--active"
                : "operations-map-layer"
            }
            onClick={() => {
              toggleLayer(
                "routes",
              );
            }}
            aria-pressed={
              visibleLayers.routes
            }
          >
            <span className="operations-map-layer__dot operations-map-layer__dot--route" />

            Routes
          </button>
        </div>
      </header>

      <div className="operations-map-card__map-wrapper">
        <MapContainer
          key={mapInstanceKey}
          {...mapConfiguration}
          className="operations-map"
          minZoom={5}
          maxZoom={18}
          scrollWheelZoom
          zoomControl={false}
        >
          <TileLayer
            attribution={
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapResizeController />

          {visibleLayers.governorates && (
            <GovernorateBoundariesLayer />
          )}

          <ZoomControl position="bottomright" />

          {visibleLayers.routes &&
            validDispatchRoutes.map(
              (route) => {
                const positions =
                  route.points.map(
                    (point) => [
                      point.location
                        .latitude,

                      point.location
                        .longitude,
                    ],
                  );

                if (
                  positions.length <
                  2
                ) {
                  return null;
                }

                return (
                  <Polyline
                    key={`dispatch-route:${route.dispatchId}`}
                    positions={
                      positions
                    }
                    pathOptions={{
                      color:
                        "#0f766e",

                      weight:
                        5,

                      opacity:
                        0.85,

                      lineCap:
                        "round",

                      lineJoin:
                        "round",
                    }}
                  >
                    <Popup minWidth={260}>
                      <DispatchRoutePopup
                        route={
                          route
                        }
                      />
                    </Popup>
                  </Polyline>
                );
              },
            )}
<HistoricalReplayMapLayer
  routes={
    validDispatchRoutes
  }
  visible={
    visibleLayers.routes
  }
/>
          <MarkerClusterGroup
            chunkedLoading
            showCoverageOnHover={
              false
            }
            spiderfyOnMaxZoom
            removeOutsideVisibleBounds
            maxClusterRadius={52}
            iconCreateFunction={
              createMedicalClusterIcon
            }
          >
            {visibleLayers.facilities &&
              validFacilities.map(
                (facility) => (
                  <Marker
                    key={`facility:${facility.id}`}
                    position={[
                      facility.location
                        .latitude,

                      facility.location
                        .longitude,
                    ]}
                    icon={getFacilityMapIcon(
                      facility.occupancy
                        ?.status ??
                        "UNKNOWN",
                    )}
                    eventHandlers={{
                      click: () => {
                        selectResource({
                          type:
                            "facility",

                          id:
                            facility.id,
                        });
                      },
                    }}
                  >
                    <Popup minWidth={260}>
                      <FacilityPopup
                        facility={
                          facility
                        }
                      />
                    </Popup>
                  </Marker>
                ),
              )}

            {visibleLayers.ambulances &&
  ambulancesForMarkers.map(
                (ambulance) => (
                  <Marker
                    key={`ambulance:${ambulance.id}`}
                    position={[
                      ambulance.location
                        .latitude,

                      ambulance.location
                        .longitude,
                    ]}
                    icon={getAmbulanceMapIcon(
                      ambulance.status,
                    )}
                    zIndexOffset={500}
                    eventHandlers={{
                      click: () => {
                        selectResource({
                          type:
                            "ambulance",

                          id:
                            ambulance.id,
                        });
                      },
                    }}
                  >
                    <Popup minWidth={260}>
                      <AmbulancePopup
                        ambulance={
                          ambulance
                        }
                      />
                    </Popup>
                  </Marker>
                ),
              )}
          </MarkerClusterGroup>

          {visibleLayers.emergencies &&
            validEmergencies.map(
              (emergency) => (
                <Marker
                  key={`emergency:${emergency.id}`}
                  position={[
                    emergency.location
                      .latitude,

                    emergency.location
                      .longitude,
                  ]}
                  icon={getEmergencyMapIcon(
                    emergency.status,
                  )}
                  zIndexOffset={1000}
                  eventHandlers={{
                    click: () => {
                      selectResource({
                        type:
                          "emergency",

                        id:
                          emergency.id,
                      });
                    },
                  }}
                >
                  <Popup minWidth={270}>
                    <EmergencyPopup
                      emergency={
                        emergency
                      }
                    />
                  </Popup>
                </Marker>
              ),
            )}
        </MapContainer>

        <div className="operations-map-legend">
          <div className="operations-map-legend__title">
            <MapPinned size={15} />

            Visible resources
          </div>

          <div>
            <span className="operations-map-legend__marker operations-map-legend__marker--emergency">
              !
            </span>

            <span>
  {visibleRouteCount}
  {" "}
  {mode === "historical"
    ? "replayed routes"
    : "active routes"}
</span>
          </div>

          <div>
            <span className="operations-map-legend__marker operations-map-legend__marker--facility">
              +
            </span>

            <span>
              {visibleFacilityCount}
              {" "}
              facilities
            </span>
          </div>

          <div>
            <span className="operations-map-legend__marker operations-map-legend__marker--ambulance">
              A
            </span>

            <span>
              {visibleAmbulanceCount}
              {" "}
              ambulances
            </span>
          </div>

          <div>
            <span className="operations-map-legend__marker operations-map-legend__marker--route">
              R
            </span>

            <span>
              {visibleRouteCount}
              {" "}
              active routes
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default SyriaOperationsMap;