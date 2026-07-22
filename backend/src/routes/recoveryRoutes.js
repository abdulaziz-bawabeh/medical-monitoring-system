import {
    Router,
  } from "express";
  
  import {
    recoverLiveOperations,
  } from "../controllers/recoveryController.js";
  
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
    "/live-operations",
    recoverLiveOperations,
  );
  
  export default router;