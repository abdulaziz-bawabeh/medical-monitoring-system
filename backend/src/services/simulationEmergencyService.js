import {
    randomInt,
    randomUUID,
  } from "node:crypto";
  
  import {
    createEmergencyCase,
    getActiveEmergencyCases,
  } from "./emergencyAlertService.js";
  
  import {
    selectRandomEmergencyAnchor,
  } from "../repositories/simulationEmergencyRepository.js";
  
  const GENERATOR_VERSION =
    "1.0.0";
  
  const MAXIMUM_LOCATION_ATTEMPTS =
    5;
  
  const EARTH_RADIUS_KILOMETERS =
    6371;
  
  const EMERGENCY_SCENARIOS = [
    {
      type:
        "TRAFFIC_ACCIDENT",
  
      summary:
        "Traffic accident requiring an ambulance response.",
  
      severity:
        "HIGH",
    },
  
    {
      type:
        "CARDIAC_EMERGENCY",
  
      summary:
        "Reported cardiac emergency requiring immediate medical assistance.",
  
      severity:
        "CRITICAL",
    },
  
    {
      type:
        "RESPIRATORY_DISTRESS",
  
      summary:
        "Patient experiencing severe respiratory distress.",
  
      severity:
        "HIGH",
    },
  
    {
      type:
        "FALL_INJURY",
  
      summary:
        "Serious fall injury requiring emergency transportation.",
  
      severity:
        "MEDIUM",
    },
  
    {
      type:
        "FIELD_MEDICAL_EMERGENCY",
  
      summary:
        "Field medical emergency requiring ambulance intervention.",
  
      severity:
        "HIGH",
    },
  
    {
      type:
        "UNCONSCIOUS_PATIENT",
  
      summary:
        "Unconscious patient reported by emergency responders.",
  
      severity:
        "CRITICAL",
    },
  ];
  
  function degreesToRadians(
    degrees,
  ) {
    return (
      degrees *
      Math.PI /
      180
    );
  }
  
  function radiansToDegrees(
    radians,
  ) {
    return (
      radians *
      180 /
      Math.PI
    );
  }
  
  /*
   * Creates a geographic point near a known facility.
   *
   * Distance is between approximately 300 meters and
   * 3 kilometers.
   */
  function createNearbyPoint({
    longitude,
    latitude,
  }) {
    const distanceKilometers =
      randomInt(
        300,
        3001,
      ) / 1000;
  
    const bearingDegrees =
      randomInt(
        0,
        360,
      );
  
    const angularDistance =
      distanceKilometers /
      EARTH_RADIUS_KILOMETERS;
  
    const bearing =
      degreesToRadians(
        bearingDegrees,
      );
  
    const latitudeRadians =
      degreesToRadians(
        latitude,
      );
  
    const longitudeRadians =
      degreesToRadians(
        longitude,
      );
  
    const generatedLatitude =
      Math.asin(
        Math.sin(
          latitudeRadians,
        ) *
          Math.cos(
            angularDistance,
          ) +
        Math.cos(
          latitudeRadians,
        ) *
          Math.sin(
            angularDistance,
          ) *
          Math.cos(
            bearing,
          ),
      );
  
    const generatedLongitude =
      longitudeRadians +
      Math.atan2(
        Math.sin(
          bearing,
        ) *
          Math.sin(
            angularDistance,
          ) *
          Math.cos(
            latitudeRadians,
          ),
  
        Math.cos(
          angularDistance,
        ) -
          Math.sin(
            latitudeRadians,
          ) *
            Math.sin(
              generatedLatitude,
            ),
      );
  
    return {
      longitude:
        Number(
          radiansToDegrees(
            generatedLongitude,
          ).toFixed(6),
        ),
  
      latitude:
        Number(
          radiansToDegrees(
            generatedLatitude,
          ).toFixed(6),
        ),
  
      distanceFromAnchorKilometers:
        distanceKilometers,
  
      bearingDegrees,
    };
  }
  
  function selectRandomScenario() {
    return EMERGENCY_SCENARIOS[
      randomInt(
        0,
        EMERGENCY_SCENARIOS.length,
      )
    ];
  }
  
  function isOutsideSupportedAreaError(
    error,
  ) {
    return (
      error?.code ===
      "EMERGENCY_LOCATION_OUTSIDE_SUPPORTED_AREA"
    );
  }
  
  export async function generateEmergencyScenario({
    simulationRunId,
    tickCount,
    startedByUserId,
    maxActiveEmergencies,
  }) {
    if (!startedByUserId) {
      throw new Error(
        "The simulation emergency generator requires the user who started the run.",
      );
    }
  
    /*
     * Reuse the existing active-emergency query instead of
     * duplicating its status rules.
     */
    const activeEmergencies =
      await getActiveEmergencyCases({
        limit:
          Math.max(
            100,
            Number(
              maxActiveEmergencies,
            ) + 1,
          ),
      });
  
    if (
      activeEmergencies.length >=
      maxActiveEmergencies
    ) {
      return {
        created:
          false,
  
        reason:
          "MAXIMUM_ACTIVE_EMERGENCIES_REACHED",
  
        activeEmergencyCount:
          activeEmergencies.length,
  
        maxActiveEmergencies,
      };
    }
  
    const anchor =
      await selectRandomEmergencyAnchor();
  
    if (!anchor) {
      throw new Error(
        "No medical facility with a valid geographic location is available for emergency generation.",
      );
    }
  
    const scenario =
      selectRandomScenario();
  
    const eventId =
      randomUUID();
  
    const reportedAt =
      new Date()
        .toISOString();
  
    let latestLocationError =
      null;
  
    /*
     * A generated nearby point may occasionally cross a
     * governorate or national boundary.
     *
     * The existing createEmergencyCase service validates every
     * point using PostGIS. If a candidate is invalid, generate
     * another one.
     */
    for (
      let attempt = 1;
      attempt <=
        MAXIMUM_LOCATION_ATTEMPTS;
      attempt += 1
    ) {
      const generatedPoint =
        createNearbyPoint({
          longitude:
            Number(
              anchor.longitude,
            ),
  
          latitude:
            Number(
              anchor.latitude,
            ),
        });
  
      try {
        const result =
          await createEmergencyCase(
            {
              eventId,
  
              summary:
                scenario.summary,
  
              longitude:
                generatedPoint.longitude,
  
              latitude:
                generatedPoint.latitude,
  
              reportedAt,
  
              payload: {
                source:
                  "simulation",
  
                generator:
                  "emergency-scenario",
  
                generatorVersion:
                  GENERATOR_VERSION,
  
                simulationRunId:
                  String(
                    simulationRunId,
                  ),
  
                simulationTick:
                  Number(
                    tickCount,
                  ),
  
                scenarioType:
                  scenario.type,
  
                severity:
                  scenario.severity,
  
                anchorFacilityId:
                  anchor.facility_id,
  
                anchorFacilityName:
                  anchor.facility_name,
  
                anchorGovernorateId:
                  anchor.governorate_id,
  
                anchorGovernorateName:
                  anchor.governorate_name,
  
                generatedDistanceKilometers:
                  generatedPoint
                    .distanceFromAnchorKilometers,
  
                generatedBearingDegrees:
                  generatedPoint
                    .bearingDegrees,
  
                generationAttempt:
                  attempt,
              },
            },
  
            {
              id:
                String(
                  startedByUserId,
                ),
            },
          );
  
        return {
          created:
            !result.duplicate,
  
          duplicate:
            result.duplicate,
  
          reason:
            result.duplicate
              ? "DUPLICATE_EVENT"
              : null,
  
          activeEmergencyCount:
            activeEmergencies.length +
            (
              result.duplicate
                ? 0
                : 1
            ),
  
          maxActiveEmergencies,
  
          emergencyCase:
            result.emergencyCase,
  
          alert:
            result.alert,
        };
      } catch (error) {
        if (
          isOutsideSupportedAreaError(
            error,
          )
        ) {
          latestLocationError =
            error;
  
          continue;
        }
  
        throw error;
      }
    }
  
    /*
     * The facility location itself should already be inside a
     * supported governorate. Use it as a safe final fallback.
     */
    try {
      const result =
        await createEmergencyCase(
          {
            eventId,
  
            summary:
              scenario.summary,
  
            longitude:
              Number(
                anchor.longitude,
              ),
  
            latitude:
              Number(
                anchor.latitude,
              ),
  
            reportedAt,
  
            payload: {
              source:
                "simulation",
  
              generator:
                "emergency-scenario",
  
              generatorVersion:
                GENERATOR_VERSION,
  
              simulationRunId:
                String(
                  simulationRunId,
                ),
  
              simulationTick:
                Number(
                  tickCount,
                ),
  
              scenarioType:
                scenario.type,
  
              severity:
                scenario.severity,
  
              anchorFacilityId:
                anchor.facility_id,
  
              anchorFacilityName:
                anchor.facility_name,
  
              anchorGovernorateId:
                anchor.governorate_id,
  
              anchorGovernorateName:
                anchor.governorate_name,
  
              locationFallback:
                true,
            },
          },
  
          {
            id:
              String(
                startedByUserId,
              ),
          },
        );
  
      return {
        created:
          !result.duplicate,
  
        duplicate:
          result.duplicate,
  
        reason:
          result.duplicate
            ? "DUPLICATE_EVENT"
            : null,
  
        activeEmergencyCount:
          activeEmergencies.length +
          (
            result.duplicate
              ? 0
              : 1
          ),
  
        maxActiveEmergencies,
  
        emergencyCase:
          result.emergencyCase,
  
        alert:
          result.alert,
      };
    } catch (fallbackError) {
      throw (
        latestLocationError ??
        fallbackError
      );
    }
  }