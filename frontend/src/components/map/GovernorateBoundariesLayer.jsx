import {
    useEffect,
  } from "react";
  
  import L from "leaflet";
  
  import {
    GeoJSON,
    useMap,
  } from "react-leaflet";
  
  import {
    useGovernorateBoundaryStore,
  } from "../../stores/governorateBoundaryStore.js";
  
  import {
    useMapUiStore,
  } from "../../stores/mapUiStore.js";
  
  const GOVERNORATE_BOUNDARY_ATTRIBUTION =
    "Governorate boundaries: geoBoundaries, CC BY 3.0 IGO";
  
  function getGovernorateStyle(
    feature,
    selectedGovernorateId,
  ) {
    const featureId =
      String(
        feature?.properties
          ?.id ?? "",
      );
  
    const isSelected =
      selectedGovernorateId !==
        null &&
      featureId ===
        String(
          selectedGovernorateId,
        );
  
    if (isSelected) {
      return {
        color: "#096f69",
  
        weight: 3,
  
        opacity: 1,
  
        fillColor: "#23a99d",
  
        fillOpacity: 0.24,
  
        dashArray: null,
      };
    }
  
    return {
      color: "#317f83",
  
      weight: 1.4,
  
      opacity: 0.78,
  
      fillColor: "#56b8b2",
  
      fillOpacity: 0.07,
  
      dashArray: "5 4",
    };
  }
  
  function GovernorateViewportController({
    featureCollection,
    selectedGovernorateId,
  }) {
    const map = useMap();
  
    useEffect(() => {
      if (
        !featureCollection ||
        featureCollection.features
          .length === 0
      ) {
        return;
      }
  
      const selectedFeature =
        selectedGovernorateId
          ? featureCollection
              .features
              .find(
                (feature) =>
                  String(
                    feature
                      .properties
                      .id,
                  ) ===
                  String(
                    selectedGovernorateId,
                  ),
              )
          : null;
  
      const geographyToDisplay =
        selectedFeature ??
        featureCollection;
  
      const temporaryLayer =
        L.geoJSON(
          geographyToDisplay,
        );
  
      const bounds =
        temporaryLayer.getBounds();
  
      if (!bounds.isValid()) {
        return;
      }
  
      map.fitBounds(bounds, {
        padding: [28, 28],
  
        maxZoom:
          selectedFeature
            ? 10
            : 7,
  
        animate: true,
      });
    }, [
      featureCollection,
      map,
      selectedGovernorateId,
    ]);
  
    return null;
  }
  
  function GovernorateBoundariesLayer() {
    const status =
      useGovernorateBoundaryStore(
        (state) => state.status,
      );
  
    const featureCollection =
      useGovernorateBoundaryStore(
        (state) =>
          state.featureCollection,
      );
  
    const metadata =
      useGovernorateBoundaryStore(
        (state) =>
          state.metadata,
      );
  
    const loadGovernorateBoundaries =
      useGovernorateBoundaryStore(
        (state) =>
          state
            .loadGovernorateBoundaries,
      );
  
    const selectedGovernorateId =
      useMapUiStore(
        (state) =>
          state
            .selectedGovernorateId,
      );
  
    const setSelectedGovernorateId =
      useMapUiStore(
        (state) =>
          state
            .setSelectedGovernorateId,
      );
  
    const governoratesVisible =
      useMapUiStore(
        (state) =>
          state.visibleLayers
            .governorates,
      );
  
    useEffect(() => {
      loadGovernorateBoundaries();
    }, [
      loadGovernorateBoundaries,
    ]);
  
    if (
      status !== "ready" ||
      !featureCollection ||
      !governoratesVisible
    ) {
      return null;
    }
  
    function handleEachGovernorate(
      feature,
      layer,
    ) {
      const properties =
        feature.properties;
  
      layer.bindTooltip(
        properties.name,
        {
          permanent: false,
  
          direction: "center",
  
          className:
            "governorate-boundary-tooltip",
  
          sticky: true,
        },
      );
  
      layer.on({
        click: () => {
          setSelectedGovernorateId(
            properties.id,
          );
        },
  
        mouseover: (
          event,
        ) => {
          const hoveredLayer =
            event.target;
  
          hoveredLayer.setStyle({
            weight: 3,
  
            fillOpacity:
              String(
                properties.id,
              ) ===
              String(
                selectedGovernorateId,
              )
                ? 0.3
                : 0.16,
          });
  
          hoveredLayer
            .bringToFront();
        },
  
        mouseout: (
          event,
        ) => {
          event.target.setStyle(
            getGovernorateStyle(
              feature,
              selectedGovernorateId,
            ),
          );
        },
      });
    }
  
    return (
      <>
        <GovernorateViewportController
          featureCollection={
            featureCollection
          }
          selectedGovernorateId={
            selectedGovernorateId
          }
        />
  
        <GeoJSON
          /*
           * GeoJSON data is immutable after the Leaflet
           * layer is created.
           *
           * This key recreates the layer if a forced reload
           * returns another boundary dataset.
           */
          key={
            metadata?.generatedAt ??
            "governorate-boundaries"
          }
          data={featureCollection}
          style={(feature) =>
            getGovernorateStyle(
              feature,
              selectedGovernorateId,
            )
          }
          onEachFeature={
            handleEachGovernorate
          }
          attribution={
            GOVERNORATE_BOUNDARY_ATTRIBUTION
          }
        />
      </>
    );
  }
  
  export default GovernorateBoundariesLayer;