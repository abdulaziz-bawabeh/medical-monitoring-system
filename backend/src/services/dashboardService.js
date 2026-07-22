import {
    listActiveGovernorates,
    listDashboardAmbulances,
    listDashboardFacilities,
  } from "../repositories/dashboardRepository.js";
  
  function mapFacility(row) {
    const hasOccupancy =
      row.occupancy_event_id !== null;
  
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      facilityType:
        row.facility_type,
      address: row.address,
      totalBeds:
        row.total_beds,
      isOperational:
        row.is_operational,
  
      governorate: {
        id: row.governorate_id,
        name:
          row.governorate_name,
        slug:
          row.governorate_slug,
      },
  
      location: {
        longitude:
          row.longitude,
        latitude:
          row.latitude,
      },
  
      occupancy: hasOccupancy
        ? {
            eventId:
              row.occupancy_event_id,
  
            sourceDeviceId:
              row.occupancy_source_device_id,
  
            sequenceNumber:
              row.occupancy_sequence_number,
  
            totalBeds:
              row.total_beds,
  
            occupiedBeds:
              row.occupied_beds,
  
            availableBeds:
              row.available_beds,
  
            occupancyPercentage:
              row.occupancy_percentage,
  
            status:
              row.occupancy_status,
  
            recordedAt:
              row.occupancy_recorded_at,
          }
        : null,
    };
  }
  
  function mapAmbulance(row) {
    return {
      id: row.id,
      code: row.code,
      deviceId: row.device_id,
      status: row.status,
      isOperational:
        row.is_operational,
  
      governorate: {
        id: row.governorate_id,
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
        row.longitude !== null &&
        row.latitude !== null
          ? {
              longitude:
                row.longitude,
              latitude:
                row.latitude,
            }
          : null,
  
      lastLocationAt:
        row.last_location_at,
  
      lastSequenceNumber:
        row.last_sequence_number,
    };
  }
  
  function createSummary(
    facilities,
    ambulances,
  ) {
    return {
      facilities: {
        total:
          facilities.length,
  
        green:
          facilities.filter(
            (facility) =>
              facility.occupancy
                ?.status === "GREEN",
          ).length,
  
        red:
          facilities.filter(
            (facility) =>
              facility.occupancy
                ?.status === "RED",
          ).length,
  
        withoutOccupancyData:
          facilities.filter(
            (facility) =>
              facility.occupancy ===
              null,
          ).length,
      },
  
      ambulances: {
        total:
          ambulances.length,
  
        available:
          ambulances.filter(
            (ambulance) =>
              ambulance.status ===
                "AVAILABLE" &&
              ambulance.isOperational,
          ).length,
  
        busy:
          ambulances.filter(
            (ambulance) =>
              ambulance.status ===
              "BUSY",
          ).length,
  
        offline:
          ambulances.filter(
            (ambulance) =>
              ambulance.status ===
              "OFFLINE",
          ).length,
  
        maintenance:
          ambulances.filter(
            (ambulance) =>
              ambulance.status ===
              "MAINTENANCE",
          ).length,
      },
    };
  }
  
  export async function getDashboardSnapshot({
    governorateId,
  }) {
    const [
      governorateRows,
      facilityRows,
      ambulanceRows,
    ] = await Promise.all([
      listActiveGovernorates(),
  
      listDashboardFacilities(
        governorateId,
      ),
  
      listDashboardAmbulances(
        governorateId,
      ),
    ]);
  
    const governorates =
      governorateRows.map(
        (row) => ({
          id: row.id,
          name: row.name,
          slug: row.slug,
          hasBoundary:
            row.has_boundary,
        }),
      );
  
    const facilities =
      facilityRows.map(
        mapFacility,
      );
  
    const ambulances =
      ambulanceRows.map(
        mapAmbulance,
      );
  
    return {
      generatedAt:
        new Date().toISOString(),
  
      filters: {
        governorateId:
          governorateId
            ? String(governorateId)
            : null,
      },
  
      summary:
        createSummary(
          facilities,
          ambulances,
        ),
  
      governorates,
      facilities,
      ambulances,
    };
  }