import {
    Router,
  } from "express";
  
  import {
    readSimulationStatus,
    resetSimulationRuntime,
    startSimulationRuntime,
    stopSimulationRuntime,
  } from "../controllers/simulationController.js";
  import {
    authenticate,
    authorizeRoles,
  } from "../middleware/authenticate.js";
  
  const router =
    Router();
  
  /*
   * Simulation control is available only to an authenticated
   * health manager.
   *
   * The authentication middleware also attaches the current
   * user to the request object.
   */
  router.use(
    authenticate,
  
    authorizeRoles(
      "health_manager",
    ),
  );
  
  router.get(
    "/status",
    readSimulationStatus,
  );
  
  router.post(
    "/start",
    startSimulationRuntime,
  );
  
  router.post(
    "/stop",
    stopSimulationRuntime,
  );

  router.post(
    "/reset",
    resetSimulationRuntime,
  );
  
  export default router;