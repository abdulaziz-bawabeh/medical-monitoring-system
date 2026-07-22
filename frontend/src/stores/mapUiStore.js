import { create } from "zustand";

const initialState = {
  selectedGovernorateId: null,

  selectedResource: null,

  visibleLayers: {
    facilities: true,
    ambulances: true,
    emergencies: true,
    governorates: true,
    routes: true,
  },
};

export const useMapUiStore =
  create((set) => ({
    ...initialState,

    setSelectedGovernorateId: (
      governorateId,
    ) => {
      set({
        selectedGovernorateId:
          governorateId
            ? String(governorateId)
            : null,

        selectedResource: null,
      });
    },

    selectResource: (
      resource,
    ) => {
      set({
        selectedResource:
          resource,
      });
    },

    clearSelectedResource: () => {
      set({
        selectedResource: null,
      });
    },

    toggleLayer: (
      layerName,
    ) => {
      set((state) => ({
        visibleLayers: {
          ...state.visibleLayers,

          [layerName]:
            !state.visibleLayers[
              layerName
            ],
        },
      }));
    },

    resetMapUi: () => {
      set({
        ...initialState,
      });
    },
  }));