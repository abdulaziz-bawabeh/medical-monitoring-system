import {
    Router,
  } from "express";
  
  import {
    acknowledgeOperationalAlert,
    listOperationalAlerts,
  } from "../controllers/alertController.js";
  
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
  
  router.get(
    "/",
    listOperationalAlerts,
  );
  
  router.patch(
    "/:alertId/acknowledge",
    acknowledgeOperationalAlert,
  );
  
  export default router;