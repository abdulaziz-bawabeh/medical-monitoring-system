import {
    Router,
  } from "express";
  
  import {
    confirmRecommendation,
    rejectRecommendation,
  } from "../controllers/dispatchController.js";
  
  import {
    authenticate,
    authorizeRoles,
  } from "../middleware/authenticate.js";
  
  const router =
    Router();
  
  router.use(
    authenticate,
  
    authorizeRoles(
      "health_manager",
    ),
  );
  
  router.post(
    "/:recommendationId/confirm",
    confirmRecommendation,
  );
  
  router.post(
    "/:recommendationId/reject",
    rejectRecommendation,
  );
  
  export default router;