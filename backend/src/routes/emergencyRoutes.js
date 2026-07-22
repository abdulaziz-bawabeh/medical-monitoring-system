import {
    Router,
  } from "express";
  
  import {
    createEmergency,
    listOpenEmergencies,
  } from "../controllers/emergencyController.js";
  
  import {
    authenticate,
    authorizeRoles,
  } from "../middleware/authenticate.js";
  
  import {
    createRecommendation,
    getRecommendation,
  } from "../controllers/dispatchController.js";

  const router =
    Router();
  
  router.use(
    authenticate,
  
    authorizeRoles(
      "health_manager",
    ),
  );
  
  router.post(
    "/",
    createEmergency,
  );
  
  router.get(
    "/open",
    listOpenEmergencies,
  );
  
  router.post(
    "/:emergencyId/recommendation",
    createRecommendation,
  );
  
  router.get(
    "/:emergencyId/recommendation",
    getRecommendation,
  );

  export default router;