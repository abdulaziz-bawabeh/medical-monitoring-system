import pool, {
    testDatabaseConnection,
  } from "../config/database.js";
  
  async function runDatabaseTest() {
    try {
      const databaseInfo = await testDatabaseConnection();
  
      console.log("----------------------------------------");
      console.log("PostgreSQL connection successful");
      console.log(`Database: ${databaseInfo.database_name}`);
      console.log(`User: ${databaseInfo.database_user}`);
      console.log(`PostGIS: ${databaseInfo.postgis_version}`);
      console.log(`Connected at: ${databaseInfo.connected_at}`);
      console.log("----------------------------------------");
    } catch (error) {
      console.error("----------------------------------------");
      console.error("PostgreSQL connection failed");
      console.error(error.message);
      console.error("----------------------------------------");
  
      process.exitCode = 1;
    } finally {
      await pool.end();
    }
  }
  
  runDatabaseTest();