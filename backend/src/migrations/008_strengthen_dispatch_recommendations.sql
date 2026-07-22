/*
 * Prevent one ambulance from being reserved by more than one
 * active recommendation at the same time.
 */
CREATE UNIQUE INDEX
    dispatch_recommendations_one_pending_per_ambulance_uidx

ON dispatch_recommendations (
    ambulance_id
)

WHERE status = 'PENDING';


/*
 * ST_DWithin is executed using geography because the maximum
 * dispatch distance is configured in meters.
 *
 * This expression index supports the geography cast used by
 * the nearest-ambulance query.
 */
CREATE INDEX
    ambulances_current_location_geography_gix

ON ambulances
USING GIST (
    (current_location::GEOGRAPHY)
)

WHERE current_location IS NOT NULL;