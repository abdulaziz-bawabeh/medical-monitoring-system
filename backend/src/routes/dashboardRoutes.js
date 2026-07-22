import {
  Router,
} from "express";

import {
  dashboardSnapshot,
} from "../controllers/dashboardController.js";

import {
  getGovernorateBoundaries,
} from "../controllers/governorateBoundaryController.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/authenticate.js";

const router = Router();

/*
 * All Dashboard endpoints require:
 *
 * 1. A valid JWT HttpOnly Cookie.
 * 2. An authenticated health_manager.
 */
router.use(
  authenticate,
  authorizeRoles(
    "health_manager",
  ),
);

router.get(
  "/snapshot",
  dashboardSnapshot,
);

router.get(
  "/governorate-boundaries",
  getGovernorateBoundaries,
);

export default router;