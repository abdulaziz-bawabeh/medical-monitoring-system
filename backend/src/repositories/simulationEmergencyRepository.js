import {
    pool,
  } from "../config/databasePool.js";
  
  /*
   * A medical facility is used as a safe geographic anchor.
   *
   * The generator creates a nearby emergency point and the
   * existing emergency service verifies that the point remains
   * inside a supported Syrian governorate.
   */
  export async function selectRandomEmergencyAnchor(
    queryable = pool,
  ) {
    const result =
      await queryable.query(
        `
          SELECT
            facility.id::TEXT
              AS facility_id,
  
            facility.name
              AS facility_name,
  
            facility.facility_type,
  
            governorate.id::TEXT
              AS governorate_id,
  
            governorate.name
              AS governorate_name,
  
            governorate.slug
              AS governorate_slug,
  
            ST_X(
              facility.location
            )::DOUBLE PRECISION
              AS longitude,
  
            ST_Y(
              facility.location
            )::DOUBLE PRECISION
              AS latitude
  
          FROM public.medical_facilities
            AS facility
  
          JOIN public.governorates
            AS governorate
            ON governorate.id =
               facility.governorate_id
  
          WHERE
            facility.location IS NOT NULL
  
          ORDER BY
            RANDOM()
  
          LIMIT 1;
        `,
      );
  
    return result.rows[0] ??
      null;
  }