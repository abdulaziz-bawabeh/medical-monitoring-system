import {
    pool,
  } from "../config/databasePool.js";
  
  import {
    resolveHistoryInstant,
  } from "../utils/historyRange.js";
  
  import {
    selectHistoricalActiveDispatches,
    selectHistoricalAmbulanceSnapshot,
    selectHistoricalEmergencySnapshot,
    selectHistoricalFacilitySnapshot,
  } from "../repositories/historySnapshotRepository.js";
  
  function nullableNumber(
    value,
  ) {
    return value === null ||
      value === undefined
      ? null
      : Number(value);
  }
  
  function mapFacility(
    row,
  ) {
    const hasOccupancy =
      Boolean(
        row.occupancy_event_id,
      );
  
    return {
      id:
        row.facility_id,
  
      name:
        row.facility_name,
  
      facilityType:
        row.facility_type,
  
      totalBeds:
        Number(
          row.configured_total_beds,
        ),
  
      governorate: {
        id:
          row.governorate_id,
  
        name:
          row.governorate_name,
  
        slug:
          row.governorate_slug,
      },
  
      location: {
        longitude:
          Number(
            row.longitude,
          ),
  
        latitude:
          Number(
            row.latitude,
          ),
      },
  
      occupancy:
        hasOccupancy
          ? {
              eventId:
                row.occupancy_event_id,
  
              sourceDeviceId:
                row.source_device_id,
  
              sequenceNumber:
                Number(
                  row.sequence_number,
                ),
  
              totalBeds:
                Number(
                  row.total_beds,
                ),
  
              occupiedBeds:
                Number(
                  row.occupied_beds,
                ),
  
              availableBeds:
                Number(
                  row.available_beds,
                ),
  
              occupancyPercentage:
                Number(
                  row.occupancy_percentage,
                ),
  
              status:
                row.occupancy_status,
  
              recordedAt:
                row.occupancy_recorded_at,
  
              receivedAt:
                row.occupancy_received_at,
            }
          : null,
    };
  }
  
  function mapAmbulance(
    row,
  ) {
    const longitude =
      nullableNumber(
        row.longitude,
      );
  
    const latitude =
      nullableNumber(
        row.latitude,
      );
  
    return {
      id:
        row.ambulance_id,
  
      code:
        row.ambulance_code,
  
      deviceId:
        row.device_id,
  
      status:
        row.historical_status,
  
      statusSource:
        row.status_source,
  
      isOperational:
        row.is_operational,
  
      currentStatus:
        row.current_status,
  
      governorate: {
        id:
          row.governorate_id,
  
        name:
          row.governorate_name,
  
        slug:
          row.governorate_slug,
      },
  
      baseFacility:
        row.base_facility_id
          ? {
              id:
                row.base_facility_id,
  
              name:
                row.base_facility_name,
            }
          : null,
  
      location:
        longitude !== null &&
        latitude !== null
          ? {
              longitude,
              latitude,
            }
          : null,
  
      locationSource:
        row.location_source,
  
      locationSequenceNumber:
        nullableNumber(
          row.location_sequence_number,
        ),
  
      speedKmh:
        nullableNumber(
          row.speed_kmh,
        ),
  
      headingDegrees:
        nullableNumber(
          row.heading_degrees,
        ),
  
      locationRecordedAt:
        row.location_recorded_at,
  
      activeDispatch:
        row.active_dispatch_id
          ? {
              id:
                row.active_dispatch_id,
  
              dispatchNumber:
                row.dispatch_number,
  
              status:
                row.active_dispatch_status,
            }
          : null,
    };
  }
  
  function mapEmergency(
    row,
  ) {
    return {
      id:
        row.emergency_id,
  
      eventId:
        row.event_id,
  
      caseNumber:
        row.case_number,
  
      summary:
        row.summary,
  
      status:
        row.historical_status,
  
      governorate: {
        id:
          row.governorate_id,
  
        name:
          row.governorate_name,
  
        slug:
          row.governorate_slug,
      },
  
      location: {
        longitude:
          Number(
            row.longitude,
          ),
  
        latitude:
          Number(
            row.latitude,
          ),
      },
  
      createdBy: {
        id:
          row.created_by_id,
  
        name:
          row.created_by_name,
      },
  
      reportedAt:
        row.reported_at,
  
      receivedAt:
        row.received_at,
  
      resolvedAt:
        row.resolved_at,
  
      activeAlertCount:
        Number(
          row.active_alert_count,
        ),
  
      activeDispatch:
        row.active_dispatch_id
          ? {
              id:
                row.active_dispatch_id,
  
              dispatchNumber:
                row.dispatch_number,
  
              status:
                row.active_dispatch_status,
            }
          : null,
    };
  }
  
  function mapDispatch(
    row,
  ) {
    const latestLongitude =
      nullableNumber(
        row.latest_route_longitude,
      );
  
    const latestLatitude =
      nullableNumber(
        row.latest_route_latitude,
      );
  
    return {
      id:
        row.dispatch_id,
  
      dispatchNumber:
        row.dispatch_number,
  
      status:
        row.historical_status,
  
      assignedDistanceMeters:
        Number(
          row.assigned_distance_meters,
        ),
  
      assignedDistanceKilometers:
        Number(
          (
            Number(
              row.assigned_distance_meters,
            ) /
            1000
          ).toFixed(2),
        ),
  
      assignedAt:
        row.assigned_at,
  
      enRouteAt:
        row.en_route_at,
  
      arrivedAt:
        row.arrived_at,
  
      emergencyCase: {
        id:
          row.emergency_id,
  
        caseNumber:
          row.case_number,
  
        summary:
          row.emergency_summary,
  
        location: {
          longitude:
            Number(
              row.emergency_longitude,
            ),
  
          latitude:
            Number(
              row.emergency_latitude,
            ),
        },
      },
  
      ambulance: {
        id:
          row.ambulance_id,
  
        code:
          row.ambulance_code,
      },
  
      governorate: {
        id:
          row.governorate_id,
  
        name:
          row.governorate_name,
  
        slug:
          row.governorate_slug,
      },
  
      routePointCountAtTime:
        Number(
          row.route_point_count_at_time,
        ),
  
      latestRoutePoint:
        latestLongitude !== null &&
        latestLatitude !== null
          ? {
              sequenceNumber:
                Number(
                  row.latest_route_sequence_number,
                ),
  
              location: {
                longitude:
                  latestLongitude,
  
                latitude:
                  latestLatitude,
              },
  
              recordedAt:
                row.latest_route_recorded_at,
            }
          : null,
    };
  }
  
  function createSummary({
    facilities,
    ambulances,
    emergencies,
    dispatches,
  }) {
    const facilitiesWithOccupancy =
      facilities.filter(
        (facility) =>
          facility.occupancy,
      );
  
    return {
      facilities: {
        total:
          facilities.length,
  
        withOccupancyData:
          facilitiesWithOccupancy.length,
  
        withoutOccupancyData:
          facilities.length -
          facilitiesWithOccupancy.length,
  
        red:
          facilitiesWithOccupancy.filter(
            (facility) =>
              facility
                .occupancy
                .status ===
              "RED",
          ).length,
  
        availableBeds:
          facilitiesWithOccupancy.reduce(
            (
              total,
              facility,
            ) =>
              total +
              facility
                .occupancy
                .availableBeds,
            0,
          ),
      },
  
      ambulances: {
        total:
          ambulances.length,
  
        withLocation:
          ambulances.filter(
            (ambulance) =>
              ambulance.location,
          ).length,
  
        available:
          ambulances.filter(
            (ambulance) =>
              ambulance.status ===
              "AVAILABLE",
          ).length,
  
        busy:
          ambulances.filter(
            (ambulance) =>
              ambulance.status ===
              "BUSY",
          ).length,
  
        unavailable:
          ambulances.filter(
            (ambulance) =>
              ambulance.status !==
                "AVAILABLE" &&
              ambulance.status !==
                "BUSY",
          ).length,
      },
  
      emergencies: {
        active:
          emergencies.length,
      },
  
      dispatches: {
        active:
          dispatches.length,
  
        assigned:
          dispatches.filter(
            (dispatch) =>
              dispatch.status ===
              "ASSIGNED",
          ).length,
  
        enRoute:
          dispatches.filter(
            (dispatch) =>
              dispatch.status ===
              "EN_ROUTE",
          ).length,
  
        arrived:
          dispatches.filter(
            (dispatch) =>
              dispatch.status ===
              "ARRIVED",
          ).length,
      },
    };
  }
  
  export async function getHistorySnapshot(
    query,
  ) {
    const instant =
      resolveHistoryInstant(
        query,
      );
  
    const governorateId =
      query.governorateId ??
      null;
  
    const client =
      await pool.connect();
  
    try {
      await client.query(
        `
          BEGIN TRANSACTION
          ISOLATION LEVEL REPEATABLE READ
          READ ONLY;
        `,
      );
  
      const facilityRows =
        await selectHistoricalFacilitySnapshot(
          client,
          {
            at:
              instant.at,
  
            earliestAvailableAt:
              instant.earliestAvailableAt,
  
            governorateId,
          },
        );
  
      const ambulanceRows =
        await selectHistoricalAmbulanceSnapshot(
          client,
          {
            at:
              instant.at,
  
            earliestAvailableAt:
              instant.earliestAvailableAt,
  
            governorateId,
          },
        );
  
      const emergencyRows =
        await selectHistoricalEmergencySnapshot(
          client,
          {
            at:
              instant.at,
  
            governorateId,
          },
        );
  
      const dispatchRows =
        await selectHistoricalActiveDispatches(
          client,
          {
            at:
              instant.at,
  
            governorateId,
          },
        );
  
      await client.query(
        "COMMIT",
      );
  
      const facilities =
        facilityRows.map(
          mapFacility,
        );
  
      const ambulances =
        ambulanceRows.map(
          mapAmbulance,
        );
  
      const emergencies =
        emergencyRows.map(
          mapEmergency,
        );
  
      const dispatches =
        dispatchRows.map(
          mapDispatch,
        );
  
      return {
        generatedAt:
          new Date()
            .toISOString(),
  
        snapshotAt:
          instant.at,
  
        retention: {
          hours:
            instant.retentionHours,
  
          earliestAvailableAt:
            instant.earliestAvailableAt,
        },
  
        filters: {
          governorateId,
        },
  
        summary:
          createSummary({
            facilities,
            ambulances,
            emergencies,
            dispatches,
          }),
  
        facilities,
  
        ambulances,
  
        emergencies,
  
        dispatches,
  
        reconstructionNotes: {
          ambulanceLocation:
            "The latest ambulance location or dispatch route point at or before the selected time is used.",
  
          ambulanceStatus:
            "BUSY is reconstructed from the dispatch timeline. Other operational states use the current ambulance record as a fallback.",
  
          emergencyStatus:
            "Active historical emergencies are reconstructed as OPEN or DISPATCHED from their dispatch timeline.",
        },
      };
    } catch (error) {
      try {
        await client.query(
          "ROLLBACK",
        );
      } catch {
        // The transaction may already be closed.
      }
  
      throw error;
    } finally {
      client.release();
    }
  }