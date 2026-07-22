import {
    create,
  } from "zustand";
  
  import {
    fetchGovernorateBoundaries,
  } from "../services/governorateBoundaryService.js";
  
  const initialState = {
    status: "idle",
  
    error: null,
  
    featureCollection: null,
  
    metadata: null,
  };
  
  export const useGovernorateBoundaryStore =
    create((set, get) => ({
      ...initialState,
  
      loadGovernorateBoundaries:
        async ({
          force = false,
        } = {}) => {
          const currentState =
            get();
  
          if (
            currentState.status ===
            "loading"
          ) {
            return;
          }
  
          if (
            !force &&
            currentState.status ===
              "ready" &&
            currentState
              .featureCollection
          ) {
            return;
          }
  
          set({
            status: "loading",
  
            error: null,
          });
  
          try {
            const result =
              await fetchGovernorateBoundaries();
  
            /*
             * Only standard GeoJSON fields are passed
             * later to Leaflet.
             *
             * Metadata is stored separately.
             */
            const featureCollection = {
              type:
                result.type,
  
              features:
                result.features,
            };
  
            set({
              status: "ready",
  
              error: null,
  
              featureCollection,
  
              metadata:
                result.metadata,
            });
          } catch (error) {
            set({
              status: "error",
  
              error:
                error instanceof Error
                  ? error.message
                  : "Governorate boundaries could not be loaded.",
            });
          }
        },
  
      resetGovernorateBoundaries:
        () => {
          set({
            ...initialState,
          });
        },
    }));