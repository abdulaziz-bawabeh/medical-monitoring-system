import {
    z,
  } from "zod";
  
  const idSchema = z
    .union([
      z.string(),
      z.number(),
    ])
    .transform(
      (value) => String(value),
    );
  
  const dateTimeSchema = z
    .string()
    .datetime({
      offset: true,
    });
  
  const nullableDateTimeSchema =
    dateTimeSchema.nullable();
  
  const locationSchema = z.object({
    longitude: z
      .number()
      .min(-180)
      .max(180),
  
    latitude: z
      .number()
      .min(-90)
      .max(90),
  });
  
  const nullableLocationSchema =
    locationSchema.nullable();
  
  const payloadSchema = z
    .union([
      z.record(
        z.string(),
        z.unknown(),
      ),
  
      z.null(),
    ])
    .transform(
      (value) =>
        value ?? {},
    );
  
  const governorateSchema = z.object({
    id:
      idSchema,
  
    name: z
      .string()
      .min(1),
  
    slug: z
      .string()
      .min(1),
  });
  
  const historyRangeSchema = z.object({
    from:
      dateTimeSchema,
  
    to:
      dateTimeSchema,
  
    retentionHours: z
      .number()
      .int()
      .positive(),
  });
  
  const ambulanceStatusSchema = z.enum([
    "AVAILABLE",
    "BUSY",
    "OFFLINE",
    "MAINTENANCE",
  ]);
  
  const emergencyStatusSchema = z.enum([
    "OPEN",
    "AWAITING_MANAGER_CONFIRMATION",
    "DISPATCHED",
    "RESOLVED",
    "CANCELLED",
  ]);
  
  const dispatchStatusSchema = z.enum([
    "ASSIGNED",
    "EN_ROUTE",
    "ARRIVED",
    "COMPLETED",
    "CANCELLED",
  ]);
  
  const occupancyStatusSchema = z.enum([
    "GREEN",
    "RED",
    "UNKNOWN",
  ]);
  
  /*
   * ==========================================================
   * History overview
   * ==========================================================
   */
  
  export const historyOverviewSchema =
    z.object({
      generatedAt:
        dateTimeSchema,
  
      range:
        historyRangeSchema,
  
      filters: z.object({
        governorateId:
          idSchema.nullable(),
      }),
  
      summary: z.object({
        facilities: z.object({
          occupancyReadingCount: z
            .number()
            .int()
            .nonnegative(),
  
          monitoredFacilityCount: z
            .number()
            .int()
            .nonnegative(),
  
          redOccupancyReadingCount: z
            .number()
            .int()
            .nonnegative(),
  
          averageOccupancyPercentage: z
            .number()
            .nonnegative(),
        }),
  
        ambulances: z.object({
          locationReadingCount: z
            .number()
            .int()
            .nonnegative(),
  
          trackedAmbulanceCount: z
            .number()
            .int()
            .nonnegative(),
        }),
  
        emergencies: z.object({
          total: z
            .number()
            .int()
            .nonnegative(),
  
          active: z
            .number()
            .int()
            .nonnegative(),
  
          resolved: z
            .number()
            .int()
            .nonnegative(),
        }),
  
        dispatches: z.object({
          total: z
            .number()
            .int()
            .nonnegative(),
  
          active: z
            .number()
            .int()
            .nonnegative(),
  
          completed: z
            .number()
            .int()
            .nonnegative(),
  
          routePointCount: z
            .number()
            .int()
            .nonnegative(),
  
          statusEventCount: z
            .number()
            .int()
            .nonnegative(),
        }),
  
        alerts: z.object({
          total: z
            .number()
            .int()
            .nonnegative(),
  
          open: z
            .number()
            .int()
            .nonnegative(),
  
          acknowledged: z
            .number()
            .int()
            .nonnegative(),
  
          resolved: z
            .number()
            .int()
            .nonnegative(),
        }),
      }),
    });
  
  export const historyOverviewResponseSchema =
    z.object({
      success:
        z.literal(true),
  
      data:
        historyOverviewSchema,
    });
  
  /*
   * ==========================================================
   * Facility occupancy history
   * ==========================================================
   */
  
  export const historicalFacilitySchema =
    z.object({
      id:
        idSchema,
  
      name: z
        .string()
        .min(1),
  
      facilityType: z
        .string()
        .min(1),
  
      totalBeds: z
        .number()
        .int()
        .nonnegative(),
  
      governorate:
        governorateSchema,
    });
  
  export const facilityOccupancyHistoryPointSchema =
    z.object({
      id:
        idSchema,
  
      eventId: z
        .string()
        .uuid(),
  
      facilityId:
        idSchema,
  
      sourceDeviceId: z
        .string()
        .min(1),
  
      sequenceNumber: z
        .number()
        .int()
        .nonnegative(),
  
      totalBeds: z
        .number()
        .int()
        .nonnegative(),
  
      occupiedBeds: z
        .number()
        .int()
        .nonnegative(),
  
      availableBeds: z
        .number()
        .int()
        .nonnegative(),
  
      occupancyPercentage: z
        .number()
        .nonnegative(),
  
      status:
        occupancyStatusSchema,
  
      recordedAt:
        dateTimeSchema,
  
      receivedAt:
        dateTimeSchema,
  
      payload:
        payloadSchema,
    });
  
  export const facilityOccupancyHistoryResponseSchema =
    z.object({
      success:
        z.literal(true),
  
      data: z.object({
        generatedAt:
          dateTimeSchema,
  
        range:
          historyRangeSchema,
  
        filters: z.object({
          governorateId:
            idSchema.nullable(),
  
          facilityId:
            idSchema.nullable(),
        }),
  
        count: z
          .number()
          .int()
          .nonnegative(),
  
        limit: z
          .number()
          .int()
          .positive(),
  
        hasMore:
          z.boolean(),
  
        facilities: z.array(
          historicalFacilitySchema,
        ),
  
        points: z.array(
          facilityOccupancyHistoryPointSchema,
        ),
      }),
    });
  
  /*
   * ==========================================================
   * Ambulance location history
   * ==========================================================
   */
  
  export const historicalAmbulanceSchema =
    z.object({
      id:
        idSchema,
  
      code: z
        .string()
        .min(1),
  
      deviceId: z
        .string()
        .min(1),
  
      currentStatus:
        ambulanceStatusSchema,
  
      isOperational:
        z.boolean(),
  
      governorate:
        governorateSchema,
  
      baseFacility: z
        .object({
          id:
            idSchema,
  
          name: z
            .string()
            .min(1),
        })
        .nullable(),
    });
  
  export const ambulanceLocationHistoryPointSchema =
    z.object({
      id:
        idSchema,
  
      eventId: z
        .string()
        .uuid(),
  
      ambulanceId:
        idSchema,
  
      ambulanceCode: z
        .string()
        .min(1),
  
      sourceDeviceId: z
        .string()
        .min(1),
  
      sequenceNumber: z
        .number()
        .int()
        .nonnegative(),
  
      location:
        locationSchema,
  
      speedKmh: z
        .number()
        .nonnegative()
        .nullable(),
  
      headingDegrees: z
        .number()
        .min(0)
        .lt(360)
        .nullable(),
  
      recordedAt:
        dateTimeSchema,
  
      receivedAt:
        dateTimeSchema,
  
      payload:
        payloadSchema,
    });
  
  export const ambulanceLocationHistoryResponseSchema =
    z.object({
      success:
        z.literal(true),
  
      data: z.object({
        generatedAt:
          dateTimeSchema,
  
        range:
          historyRangeSchema,
  
        filters: z.object({
          governorateId:
            idSchema.nullable(),
  
          ambulanceId:
            idSchema.nullable(),
        }),
  
        count: z
          .number()
          .int()
          .nonnegative(),
  
        limit: z
          .number()
          .int()
          .positive(),
  
        hasMore:
          z.boolean(),
  
        ambulances: z.array(
          historicalAmbulanceSchema,
        ),
  
        points: z.array(
          ambulanceLocationHistoryPointSchema,
        ),
      }),
    });
  
  /*
   * ==========================================================
   * Emergency history
   * ==========================================================
   */
  
  export const historicalEmergencySchema =
    z.object({
      id:
        idSchema,
  
      eventId: z
        .string()
        .uuid(),
  
      caseNumber: z
        .string()
        .min(1),
  
      summary: z
        .string()
        .min(1),
  
      status:
        emergencyStatusSchema,
  
      governorate:
        governorateSchema,
  
      location:
        locationSchema,
  
      createdBy: z.object({
        id:
          idSchema,
  
        name: z
          .string()
          .min(1),
      }),
  
      activeAlertCount: z
        .number()
        .int()
        .nonnegative(),
  
      dispatchCount: z
        .number()
        .int()
        .nonnegative(),
  
      reportedAt:
        dateTimeSchema,
  
      receivedAt:
        dateTimeSchema,
  
      resolvedAt:
        nullableDateTimeSchema,
  
      payload:
        payloadSchema,
  
      createdAt:
        dateTimeSchema,
  
      updatedAt:
        dateTimeSchema,
    });
  
  export const emergencyHistoryResponseSchema =
    z.object({
      success:
        z.literal(true),
  
      data: z.object({
        generatedAt:
          dateTimeSchema,
  
        range:
          historyRangeSchema,
  
        filters: z.object({
          governorateId:
            idSchema.nullable(),
  
          status:
            emergencyStatusSchema
              .nullable(),
        }),
  
        count: z
          .number()
          .int()
          .nonnegative(),
  
        limit: z
          .number()
          .int()
          .positive(),
  
        hasMore:
          z.boolean(),
  
        emergencies: z.array(
          historicalEmergencySchema,
        ),
      }),
    });
  
  /*
   * ==========================================================
   * Dispatch history
   * ==========================================================
   */
  
  export const historicalDispatchSchema =
    z.object({
      id:
        idSchema,
  
      eventId: z
        .string()
        .uuid(),
  
      dispatchNumber: z
        .string()
        .min(1),
  
      recommendationId:
        idSchema,
  
      status:
        dispatchStatusSchema,
  
      assignedDistanceMeters: z
        .number()
        .nonnegative(),
  
      assignedDistanceKilometers: z
        .number()
        .nonnegative(),
  
      emergencyCase: z.object({
        id:
          idSchema,
  
        caseNumber: z
          .string()
          .min(1),
  
        summary: z
          .string()
          .min(1),
  
        status:
          emergencyStatusSchema,
  
        governorate:
          governorateSchema,
  
        location:
          locationSchema,
      }),
  
      ambulance: z.object({
        id:
          idSchema,
  
        code: z
          .string()
          .min(1),
  
        currentStatus:
          ambulanceStatusSchema,
  
        isOperational:
          z.boolean(),
  
        startLocation:
          locationSchema,
      }),
  
      confirmedBy: z.object({
        id:
          idSchema,
  
        name: z
          .string()
          .min(1),
      }),
  
      storedRoutePointCount: z
        .number()
        .int()
        .nonnegative(),
  
      statusEventCount: z
        .number()
        .int()
        .nonnegative(),
  
      assignedAt:
        dateTimeSchema,
  
      enRouteAt:
        nullableDateTimeSchema,
  
      arrivedAt:
        nullableDateTimeSchema,
  
      completedAt:
        nullableDateTimeSchema,
  
      cancelledAt:
        nullableDateTimeSchema,
  
      cancellationReason: z
        .string()
        .nullable(),
  
      lastRouteSequenceNumber: z
        .number()
        .int()
        .nonnegative(),
  
      lastRoutePointAt:
        nullableDateTimeSchema,
  
      payload:
        payloadSchema,
  
      createdAt:
        dateTimeSchema,
  
      updatedAt:
        dateTimeSchema,
    });
  
  export const dispatchHistoryResponseSchema =
    z.object({
      success:
        z.literal(true),
  
      data: z.object({
        generatedAt:
          dateTimeSchema,
  
        range:
          historyRangeSchema,
  
        filters: z.object({
          governorateId:
            idSchema.nullable(),
  
          ambulanceId:
            idSchema.nullable(),
  
          status:
            dispatchStatusSchema
              .nullable(),
        }),
  
        count: z
          .number()
          .int()
          .nonnegative(),
  
        limit: z
          .number()
          .int()
          .positive(),
  
        hasMore:
          z.boolean(),
  
        dispatches: z.array(
          historicalDispatchSchema,
        ),
      }),
    });
  
  /*
   * ==========================================================
   * Historical dispatch route
   * ==========================================================
   */
  
  export const historicalRoutePointSchema =
    z.object({
      id:
        idSchema,
  
      eventId: z
        .string()
        .uuid(),
  
      dispatchId:
        idSchema,
  
      ambulanceId:
        idSchema,
  
      sequenceNumber: z
        .number()
        .int()
        .positive(),
  
      location:
        locationSchema,
  
      speedKmh: z
        .number()
        .nonnegative()
        .nullable(),
  
      headingDegrees: z
        .number()
        .min(0)
        .lt(360)
        .nullable(),
  
      recordedAt:
        dateTimeSchema,
  
      receivedAt:
        dateTimeSchema,
  
      isRecovered:
        z.boolean(),
  
      source: z
        .string()
        .min(1),
  
      payload:
        payloadSchema,
    });
  
  export const historicalDispatchStatusEventSchema =
    z.object({
      id:
        idSchema,
  
      eventId: z
        .string()
        .uuid(),
  
      dispatchId:
        idSchema,
  
      status:
        dispatchStatusSchema,
  
      changedBy: z
        .object({
          id:
            idSchema,
  
          name: z
            .string()
            .min(1),
        })
        .nullable(),
  
      occurredAt:
        dateTimeSchema,
  
      receivedAt:
        dateTimeSchema,
  
      payload:
        payloadSchema,
    });
  
  export const dispatchRouteHistoryResponseSchema =
    z.object({
      success:
        z.literal(true),
  
      data: z.object({
        generatedAt:
          dateTimeSchema,
  
        range:
          historyRangeSchema,
  
        dispatch: z.object({
          id:
            idSchema,
  
          dispatchNumber: z
            .string()
            .min(1),
  
          status:
            dispatchStatusSchema,
  
          assignedDistanceMeters: z
            .number()
            .nonnegative(),
  
          assignedAt:
            dateTimeSchema,
  
          enRouteAt:
            nullableDateTimeSchema,
  
          arrivedAt:
            nullableDateTimeSchema,
  
          completedAt:
            nullableDateTimeSchema,
  
          cancelledAt:
            nullableDateTimeSchema,
  
          lastRouteSequenceNumber: z
            .number()
            .int()
            .nonnegative(),
  
          lastRoutePointAt:
            nullableDateTimeSchema,
  
          emergencyCase: z.object({
            id:
              idSchema,
  
            caseNumber: z
              .string()
              .min(1),
  
            summary: z
              .string()
              .min(1),
  
            status:
              emergencyStatusSchema,
  
            governorate:
              governorateSchema,
  
            location:
              locationSchema,
          }),
  
          ambulance: z.object({
            id:
              idSchema,
  
            code: z
              .string()
              .min(1),
          }),
        }),
  
        afterSequence: z
          .number()
          .int()
          .nonnegative(),
  
        count: z
          .number()
          .int()
          .nonnegative(),
  
        limit: z
          .number()
          .int()
          .positive(),
  
        hasMore:
          z.boolean(),
  
        nextAfterSequence: z
          .number()
          .int()
          .nonnegative(),
  
        points: z.array(
          historicalRoutePointSchema,
        ),
  
        statusEvents: z.array(
          historicalDispatchStatusEventSchema,
        ),
      }),
    });
  
  /*
   * ==========================================================
   * Time Machine snapshot
   * ==========================================================
   */
  
  const snapshotFacilitySchema =
    z.object({
      id:
        idSchema,
  
      name: z
        .string()
        .min(1),
  
      facilityType: z
        .string()
        .min(1),
  
      totalBeds: z
        .number()
        .int()
        .nonnegative(),
  
      governorate:
        governorateSchema,
  
      location:
        locationSchema,
  
      occupancy: z
        .object({
          eventId: z
            .string()
            .uuid(),
  
          sourceDeviceId: z
            .string()
            .min(1),
  
          sequenceNumber: z
            .number()
            .int()
            .nonnegative(),
  
          totalBeds: z
            .number()
            .int()
            .nonnegative(),
  
          occupiedBeds: z
            .number()
            .int()
            .nonnegative(),
  
          availableBeds: z
            .number()
            .int()
            .nonnegative(),
  
          occupancyPercentage: z
            .number()
            .nonnegative(),
  
          status:
            occupancyStatusSchema,
  
          recordedAt:
            dateTimeSchema,
  
          receivedAt:
            dateTimeSchema,
        })
        .nullable(),
    });
  
  const snapshotAmbulanceSchema =
    z.object({
      id:
        idSchema,
  
      code: z
        .string()
        .min(1),
  
      deviceId: z
        .string()
        .min(1),
  
      status:
        ambulanceStatusSchema,
  
      statusSource: z
        .string()
        .min(1),
  
      isOperational:
        z.boolean(),
  
      currentStatus:
        ambulanceStatusSchema,
  
      governorate:
        governorateSchema,
  
      baseFacility: z
        .object({
          id:
            idSchema,
  
          name: z
            .string()
            .min(1),
        })
        .nullable(),
  
      location:
        nullableLocationSchema,
  
      locationSource: z
        .string()
        .nullable(),
  
      locationSequenceNumber: z
        .number()
        .int()
        .nonnegative()
        .nullable(),
  
      speedKmh: z
        .number()
        .nonnegative()
        .nullable(),
  
      headingDegrees: z
        .number()
        .min(0)
        .lt(360)
        .nullable(),
  
      locationRecordedAt:
        nullableDateTimeSchema,
  
      activeDispatch: z
        .object({
          id:
            idSchema,
  
          dispatchNumber: z
            .string()
            .min(1),
  
          status:
            dispatchStatusSchema,
        })
        .nullable(),
    });
  
  const snapshotEmergencySchema =
    z.object({
      id:
        idSchema,
  
      eventId: z
        .string()
        .uuid(),
  
      caseNumber: z
        .string()
        .min(1),
  
      summary: z
        .string()
        .min(1),
  
      status:
        emergencyStatusSchema,
  
      governorate:
        governorateSchema,
  
      location:
        locationSchema,
  
      createdBy: z.object({
        id:
          idSchema,
  
        name: z
          .string()
          .min(1),
      }),
  
      reportedAt:
        dateTimeSchema,
  
      receivedAt:
        dateTimeSchema,
  
      resolvedAt:
        nullableDateTimeSchema,
  
      activeAlertCount: z
        .number()
        .int()
        .nonnegative(),
  
      activeDispatch: z
        .object({
          id:
            idSchema,
  
          dispatchNumber: z
            .string()
            .min(1),
  
          status:
            dispatchStatusSchema,
        })
        .nullable(),
    });
  
  const snapshotDispatchSchema =
    z.object({
      id:
        idSchema,
  
      dispatchNumber: z
        .string()
        .min(1),
  
      status:
        dispatchStatusSchema,
  
      assignedDistanceMeters: z
        .number()
        .nonnegative(),
  
      assignedDistanceKilometers: z
        .number()
        .nonnegative(),
  
      assignedAt:
        dateTimeSchema,
  
      enRouteAt:
        nullableDateTimeSchema,
  
      arrivedAt:
        nullableDateTimeSchema,
  
      emergencyCase: z.object({
        id:
          idSchema,
  
        caseNumber: z
          .string()
          .min(1),
  
        summary: z
          .string()
          .min(1),
  
        location:
          locationSchema,
      }),
  
      ambulance: z.object({
        id:
          idSchema,
  
        code: z
          .string()
          .min(1),
      }),
  
      governorate:
        governorateSchema,
  
      routePointCountAtTime: z
        .number()
        .int()
        .nonnegative(),
  
      latestRoutePoint: z
        .object({
          sequenceNumber: z
            .number()
            .int()
            .positive(),
  
          location:
            locationSchema,
  
          recordedAt:
            dateTimeSchema,
        })
        .nullable(),
    });
  
  export const historySnapshotSchema =
    z.object({
      generatedAt:
        dateTimeSchema,
  
      snapshotAt:
        dateTimeSchema,
  
      retention: z.object({
        hours: z
          .number()
          .int()
          .positive(),
  
        earliestAvailableAt:
          dateTimeSchema,
      }),
  
      filters: z.object({
        governorateId:
          idSchema.nullable(),
      }),
  
      summary: z.object({
        facilities: z.object({
          total: z
            .number()
            .int()
            .nonnegative(),
  
          withOccupancyData: z
            .number()
            .int()
            .nonnegative(),
  
          withoutOccupancyData: z
            .number()
            .int()
            .nonnegative(),
  
          red: z
            .number()
            .int()
            .nonnegative(),
  
          availableBeds: z
            .number()
            .int()
            .nonnegative(),
        }),
  
        ambulances: z.object({
          total: z
            .number()
            .int()
            .nonnegative(),
  
          withLocation: z
            .number()
            .int()
            .nonnegative(),
  
          available: z
            .number()
            .int()
            .nonnegative(),
  
          busy: z
            .number()
            .int()
            .nonnegative(),
  
          unavailable: z
            .number()
            .int()
            .nonnegative(),
        }),
  
        emergencies: z.object({
          active: z
            .number()
            .int()
            .nonnegative(),
        }),
  
        dispatches: z.object({
          active: z
            .number()
            .int()
            .nonnegative(),
  
          assigned: z
            .number()
            .int()
            .nonnegative(),
  
          enRoute: z
            .number()
            .int()
            .nonnegative(),
  
          arrived: z
            .number()
            .int()
            .nonnegative(),
        }),
      }),
  
      facilities: z.array(
        snapshotFacilitySchema,
      ),
  
      ambulances: z.array(
        snapshotAmbulanceSchema,
      ),
  
      emergencies: z.array(
        snapshotEmergencySchema,
      ),
  
      dispatches: z.array(
        snapshotDispatchSchema,
      ),
  
      reconstructionNotes: z.object({
        ambulanceLocation:
          z.string(),
  
        ambulanceStatus:
          z.string(),
  
        emergencyStatus:
          z.string(),
      }),
    });
  
  export const historySnapshotResponseSchema =
    z.object({
      success:
        z.literal(true),
  
      data:
        historySnapshotSchema,
    });