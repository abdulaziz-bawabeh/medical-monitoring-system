import {
    HttpError,
  } from "../utils/httpError.js";
  
  import {
    selectFacilityOccupancyHistory,
    selectHistoryOverview,
  } from "../repositories/historyRepository.js";
  
  import {
    resolveHistoryRange,
  } from "../utils/historyRange.js";


  function mapOverviewRow(
    row,
  ) {
    return {
      facilities: {
        occupancyReadingCount:
          Number(
            row
              .occupancy_reading_count,
          ),
  
        monitoredFacilityCount:
          Number(
            row
              .monitored_facility_count,
          ),
  
        redOccupancyReadingCount:
          Number(
            row
              .red_occupancy_reading_count,
          ),
  
        averageOccupancyPercentage:
          Number(
            Number(
              row
                .average_occupancy_percentage,
            ).toFixed(2),
          ),
      },
  
      ambulances: {
        locationReadingCount:
          Number(
            row
              .ambulance_location_reading_count,
          ),
  
        trackedAmbulanceCount:
          Number(
            row
              .tracked_ambulance_count,
          ),
      },
  
      emergencies: {
        total:
          Number(
            row.emergency_count,
          ),
  
        active:
          Number(
            row
              .active_emergency_count,
          ),
  
        resolved:
          Number(
            row
              .resolved_emergency_count,
          ),
      },
  
      dispatches: {
        total:
          Number(
            row.dispatch_count,
          ),
  
        active:
          Number(
            row
              .active_dispatch_count,
          ),
  
        completed:
          Number(
            row
              .completed_dispatch_count,
          ),
  
        routePointCount:
          Number(
            row.route_point_count,
          ),
  
        statusEventCount:
          Number(
            row
              .dispatch_status_event_count,
          ),
      },
  
      alerts: {
        total:
          Number(
            row.alert_count,
          ),
  
        open:
          Number(
            row.open_alert_count,
          ),
  
        acknowledged:
          Number(
            row
              .acknowledged_alert_count,
          ),
  
        resolved:
          Number(
            row
              .resolved_alert_count,
          ),
      },
    };
  }
  
  function mapOccupancyPoint(
    row,
  ) {
    return {
      id:
        row.id,
  
      eventId:
        row.event_id,
  
      facilityId:
        row.facility_id,
  
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
          row
            .occupancy_percentage,
        ),
  
      status:
        row.status,
  
      recordedAt:
        row.recorded_at,
  
      receivedAt:
        row.received_at,
  
      payload:
        row.payload,
    };
  }
  
  export async function getHistoryOverview(
    query,
  ) {
    const range =
      resolveHistoryRange(
        query,
      );
  
    const row =
      await selectHistoryOverview({
        from:
          range.from,
  
        to:
          range.to,
  
        governorateId:
          query.governorateId ??
          null,
      });
  
    return {
      generatedAt:
        new Date()
          .toISOString(),
  
      range,
  
      filters: {
        governorateId:
          query.governorateId ??
          null,
      },
  
      summary:
        mapOverviewRow(
          row,
        ),
    };
  }
  
  export async function getFacilityOccupancyHistory(
    query,
  ) {
    const range =
      resolveHistoryRange(
        query,
      );
  
    const requestedLimit =
      Number(
        query.limit,
      );
  
    const rows =
      await selectFacilityOccupancyHistory({
        from:
          range.from,
  
        to:
          range.to,
  
        governorateId:
          query.governorateId ??
          null,
  
        facilityId:
          query.facilityId ??
          null,
  
        limit:
          requestedLimit,
      });
  
    const hasMore =
      rows.length >
      requestedLimit;
  
    const visibleRows =
      hasMore
        ? rows.slice(
            0,
            requestedLimit,
          )
        : rows;
  
    const facilitiesById =
      new Map();
  
    for (
      const row of
      visibleRows
    ) {
      if (
        facilitiesById.has(
          row.facility_id,
        )
      ) {
        continue;
      }
  
      facilitiesById.set(
        row.facility_id,
        {
          id:
            row.facility_id,
  
          name:
            row.facility_name,
  
          facilityType:
            row.facility_type,
  
          totalBeds:
            Number(
              row
                .facility_total_beds,
            ),
  
          governorate: {
            id:
              row.governorate_id,
  
            name:
              row
                .governorate_name,
  
            slug:
              row
                .governorate_slug,
          },
        },
      );
    }
  
    return {
      generatedAt:
        new Date()
          .toISOString(),
  
      range,
  
      filters: {
        governorateId:
          query.governorateId ??
          null,
  
        facilityId:
          query.facilityId ??
          null,
      },
  
      count:
        visibleRows.length,
  
      limit:
        requestedLimit,
  
      hasMore,
  
      facilities:
        Array.from(
          facilitiesById.values(),
        ),
  
      points:
        visibleRows.map(
          mapOccupancyPoint,
        ),
    };
  }