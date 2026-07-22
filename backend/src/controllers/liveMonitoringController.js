import {
    ambulanceLocationEventSchema,
    facilityOccupancyEventSchema,
  } from "../validators/liveMonitoringSchemas.js";
  
  import {
    processAmbulanceLocationEvent,
    processFacilityOccupancyEvent,
  } from "../services/liveMonitoringService.js";
  
  function mapValidationErrors(
    zodError,
  ) {
    return zodError.issues.map(
      (issue) => ({
        field:
          issue.path.join("."),
        message:
          issue.message,
      }),
    );
  }
  
  export async function receiveFacilityOccupancy(
    req,
    res,
    next,
  ) {
    try {
      const validationResult =
        facilityOccupancyEventSchema
          .safeParse(req.body);
  
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          code:
            "VALIDATION_ERROR",
          message:
            "The facility occupancy event is invalid.",
          errors:
            mapValidationErrors(
              validationResult.error,
            ),
        });
      }
  
      const result =
        await processFacilityOccupancyEvent(
          validationResult.data,
        );
  
      return res
        .status(
          result.duplicate
            ? 200
            : 201,
        )
        .json({
          success: true,
  
          message:
            result.duplicate
              ? "The occupancy event was already processed."
              : "The occupancy event was stored successfully.",
  
          data: result,
        });
    } catch (error) {
      return next(error);
    }
  }
  
  export async function receiveAmbulanceLocation(
    req,
    res,
    next,
  ) {
    try {
      const validationResult =
        ambulanceLocationEventSchema
          .safeParse(req.body);
  
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          code:
            "VALIDATION_ERROR",
          message:
            "The ambulance location event is invalid.",
          errors:
            mapValidationErrors(
              validationResult.error,
            ),
        });
      }
  
      const result =
        await processAmbulanceLocationEvent(
          validationResult.data,
        );
  
      return res
        .status(
          result.duplicate
            ? 200
            : 201,
        )
        .json({
          success: true,
  
          message:
            result.duplicate
              ? "The ambulance location event was already processed."
              : "The ambulance location event was stored successfully.",
  
          data: result,
        });
    } catch (error) {
      return next(error);
    }
  }