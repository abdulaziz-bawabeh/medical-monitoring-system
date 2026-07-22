import {
  Router,
} from "express";

import {
  arriveDispatch,
  completeDispatch,
  listActiveOperationalDispatches,
  startDispatch,
} from "../controllers/dispatchController.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/authenticate.js";

import {
  readDispatchRoute,
} from "../controllers/dispatchRouteController.js";

const router =
  Router();

router.use(
  authenticate,

  authorizeRoles(
    "health_manager",
  ),
);

/*
 * Returns ASSIGNED, EN_ROUTE and ARRIVED dispatches.
 */
router.get(
  "/active",
  listActiveOperationalDispatches,
);

router.get(
  "/:dispatchId/route",
  readDispatchRoute,
);

/*
 * ASSIGNED → EN_ROUTE
 */
router.post(
  "/:dispatchId/start",
  startDispatch,
);

/*
 * EN_ROUTE → ARRIVED
 */
router.post(
  "/:dispatchId/arrive",
  arriveDispatch,
);

/*
 * ARRIVED → COMPLETED
 *
 * Also:
 * - Emergency → RESOLVED
 * - Ambulance → AVAILABLE
 */
router.post(
  "/:dispatchId/complete",
  completeDispatch,
);

export default router;