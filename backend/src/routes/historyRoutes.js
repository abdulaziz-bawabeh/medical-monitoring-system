import {
    Router,
  } from "express";
  
  import {
    readFacilityOccupancyHistory,
    readHistoryOverview,
  } from "../controllers/historyController.js";
  
  import {
    readAmbulanceLocationHistory,
    readDispatchHistory,
    readDispatchRouteHistory,
    readEmergencyHistory,
  } from "../controllers/historyOperationsController.js";

  import {
    readHistorySnapshot,
  } from "../controllers/historySnapshotController.js";
  const router =
    Router();
  
  router.get(
    "/overview",
    readHistoryOverview,
  );

  router.get(
    "/snapshot",
    readHistorySnapshot,
  );
  
  router.get(
    "/facility-occupancy",
    readFacilityOccupancyHistory,
  );

  router.get(
    "/ambulance-locations",
    readAmbulanceLocationHistory,
  );
  
  router.get(
    "/emergencies",
    readEmergencyHistory,
  );
  
  router.get(
    "/dispatches",
    readDispatchHistory,
  );
  
  router.get(
    "/dispatches/:dispatchId/route",
    readDispatchRouteHistory,
  );

  
  
  export default router;