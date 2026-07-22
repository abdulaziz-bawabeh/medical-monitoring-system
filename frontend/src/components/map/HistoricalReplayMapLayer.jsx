import {
    Fragment,
  } from "react";
  
  import {
    Marker,
    Polyline,
    Popup,
  } from "react-leaflet";
  
  import {
    getAmbulanceMapIcon,
  } from "./mapIcons.js";
  
  function hasValidLocation(
    resource,
  ) {
    return Boolean(
      resource?.location &&
        Number.isFinite(
          resource.location
            .latitude,
        ) &&
        Number.isFinite(
          resource.location
            .longitude,
        ),
    );
  }
  
  function formatDateTime(
    value,
  ) {
    if (!value) {
      return "Not available";
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
  
  function HistoricalReplayPopup({
    route,
  }) {
    const currentPoint =
      route.currentPoint;
  
    return (
      <div className="medical-map-popup">
        <span className="medical-map-popup__eyebrow">
          Historical Route Replay
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
              Sequence
            </dt>
  
            <dd>
              {currentPoint
                ?.sequenceNumber ??
                0}
            </dd>
          </div>
  
          <div>
            <dt>
              Completed points
            </dt>
  
            <dd>
              {route.points
                ?.length ??
                0}
            </dd>
          </div>
  
          <div>
            <dt>
              Remaining points
            </dt>
  
            <dd>
              {Math.max(
                0,
                (
                  route
                    .remainingPoints
                    ?.length ??
                  0
                ) -
                  1,
              )}
            </dd>
          </div>
  
          <div>
            <dt>
              Speed
            </dt>
  
            <dd>
              {currentPoint
                ?.speedKmh !==
                null &&
              currentPoint
                ?.speedKmh !==
                undefined
                ? `${currentPoint.speedKmh.toFixed(
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
              {currentPoint
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
              {currentPoint
                ?.location
                ?.longitude
                ?.toFixed(5) ??
                "Unavailable"}
            </dd>
          </div>
        </dl>
  
        <p className="medical-map-popup__updated">
          Recorded:
          <br />
  
          {formatDateTime(
            currentPoint
              ?.recordedAt,
          )}
        </p>
      </div>
    );
  }
  
  function HistoricalReplayMapLayer({
    routes = [],
    visible = true,
  }) {
    if (!visible) {
      return null;
    }
  
    return routes
      .filter(
        (route) =>
          route
            .isHistoricalReplay,
      )
      .map((route) => {
        const remainingPositions =
          (
            route.remainingPoints ??
            []
          )
            .filter(
              hasValidLocation,
            )
            .map(
              (point) => [
                point.location
                  .latitude,
  
                point.location
                  .longitude,
              ],
            );
  
        const currentPoint =
          hasValidLocation(
            route.currentPoint,
          )
            ? route.currentPoint
            : null;
  
        return (
          <Fragment
            key={`historical-replay:${route.dispatchId}`}
          >
            {remainingPositions.length >
              1 && (
              <Polyline
                positions={
                  remainingPositions
                }
                pathOptions={{
                  color:
                    "#7f9da8",
  
                  weight:
                    4,
  
                  opacity:
                    0.55,
  
                  dashArray:
                    "8 10",
  
                  lineCap:
                    "round",
  
                  lineJoin:
                    "round",
                }}
              />
            )}
  
            {currentPoint && (
              <Marker
                position={[
                  currentPoint
                    .location
                    .latitude,
  
                  currentPoint
                    .location
                    .longitude,
                ]}
                icon={getAmbulanceMapIcon(
                  "BUSY",
                )}
                zIndexOffset={1500}
              >
                <Popup minWidth={270}>
                  <HistoricalReplayPopup
                    route={
                      route
                    }
                  />
                </Popup>
              </Marker>
            )}
          </Fragment>
        );
      });
  }
  
  export default HistoricalReplayMapLayer;