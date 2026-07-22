import { Router } from "express";

import {
  getCurrentUser,
  login,
  logout,
} from "../controllers/authController.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/authenticate.js";

import {
  loginRateLimiter,
} from "../middleware/loginRateLimiter.js";

const router = Router();

router.post(
  "/login",
  loginRateLimiter,
  login,
);

router.get(
  "/me",
  authenticate,
  authorizeRoles("health_manager"),
  getCurrentUser,
);

/*
 * Logout is intentionally allowed even when the JWT
 * has expired, because the browser should still be able
 * to clear a stale authentication cookie.
 */
router.post(
  "/logout",
  logout,
);

export default router;