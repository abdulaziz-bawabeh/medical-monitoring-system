import { z } from "zod";

const idSchema = z
  .union([
    z.string(),
    z.number(),
  ])
  .transform((value) => String(value));

/*
 * PostgreSQL returns two-dimensional coordinates because
 * the imported geometries were normalized using ST_Force2D.
 *
 * GeoJSON coordinate order:
 * [longitude, latitude]
 */
const positionSchema = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]);

/*
 * MultiPolygon hierarchy:
 *
 * MultiPolygon
 *   → Polygons
 *     → Linear rings
 *       → Coordinate positions
 */
const linearRingSchema = z
  .array(positionSchema)
  .min(4);

const polygonCoordinatesSchema = z
  .array(linearRingSchema)
  .min(1);

const multiPolygonCoordinatesSchema = z
  .array(
    polygonCoordinatesSchema,
  )
  .min(1);

const governorateGeometrySchema =
  z.object({
    type: z.literal(
      "MultiPolygon",
    ),

    coordinates:
      multiPolygonCoordinatesSchema,
  });

const governoratePropertiesSchema =
  z.object({
    id: idSchema,

    name: z
      .string()
      .trim()
      .min(1),

    slug: z
      .string()
      .trim()
      .min(1),

    isActive: z.boolean(),

    isSelected: z.boolean(),
  });

const governorateFeatureSchema =
  z.object({
    type: z.literal("Feature"),

    id: idSchema,

    geometry:
      governorateGeometrySchema,

    properties:
      governoratePropertiesSchema,
  });

const boundarySourceSchema =
  z.object({
    provider: z.literal(
      "geoBoundaries",
    ),

    countryCode:
      z.literal("SYR"),

    administrativeLevel:
      z.literal("ADM1"),

    boundaryId: z
      .string()
      .min(1),

    representedYear: z
      .string()
      .min(1),

    license: z
      .string()
      .min(1),

    attribution: z
      .string()
      .min(1),
  });

export const governorateBoundaryResponseSchema =
  z.object({
    success: z.literal(true),

    data: z.object({
      type: z.literal(
        "FeatureCollection",
      ),

      features: z
        .array(
          governorateFeatureSchema,
        )
        .min(1)
        .max(14),

      metadata: z.object({
        generatedAt: z
          .string()
          .datetime({
            offset: true,
          }),

        featureCount: z
          .number()
          .int()
          .positive()
          .max(14),

        filteredGovernorateId:
          idSchema.nullable(),

        source:
          boundarySourceSchema,
      }),
    }),
  });