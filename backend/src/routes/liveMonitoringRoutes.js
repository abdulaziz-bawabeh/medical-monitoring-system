import { Router } from "express";

import {
  receiveAmbulanceLocation,
  receiveFacilityOccupancy,
} from "../controllers/liveMonitoringController.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/authenticate.js";

import {
  createDispatchRoutePoint,
} from "../controllers/dispatchRouteController.js";

const router = Router();

/*
 * Temporary MVP protection:
 * health_manager authentication is used for testing.
 *
 * Device-specific authentication will be added later.
 */
router.post(
  "/facility-occupancy",
  authenticate,
  authorizeRoles(
    "health_manager",
  ),
  receiveFacilityOccupancy,
);

router.post(
  "/ambulance-location",
  authenticate,
  authorizeRoles(
    "health_manager",
  ),
  receiveAmbulanceLocation,
);

router.post(
  "/dispatch-route-point",
  createDispatchRoutePoint,
);

export default router;