function readPositiveInteger(
    environmentVariableName,
    fallbackValue,
  ) {
    const rawValue =
      process.env[
        environmentVariableName
      ];
  
    if (
      rawValue === undefined ||
      rawValue === ""
    ) {
      return fallbackValue;
    }
  
    const parsedValue =
      Number(rawValue);
  
    if (
      !Number.isInteger(
        parsedValue,
      ) ||
      parsedValue <= 0
    ) {
      throw new Error(
        `${environmentVariableName} must be a positive integer.`,
      );
    }
  
    return parsedValue;
  }
  
  export const dispatchConfig =
    Object.freeze({
      maxLocationAgeSeconds:
        readPositiveInteger(
          "DISPATCH_MAX_LOCATION_AGE_SECONDS",
          120,
        ),
  
      maxDistanceMeters:
        readPositiveInteger(
          "DISPATCH_MAX_DISTANCE_METERS",
          300000,
        ),
  
      recommendationTtlSeconds:
        readPositiveInteger(
          "DISPATCH_RECOMMENDATION_TTL_SECONDS",
          300,
        ),
    });