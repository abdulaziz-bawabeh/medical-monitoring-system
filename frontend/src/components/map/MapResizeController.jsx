import {
    useEffect,
  } from "react";
  
  import {
    useMap,
  } from "react-leaflet";
  
  /*
   * Leaflet calculates the map size when the map is created.
   *
   * If the Sidebar, browser window or responsive layout changes
   * the available width, the map must recalculate its dimensions.
   */
  function MapResizeController() {
    const map = useMap();
  
    useEffect(() => {
      const mapContainer =
        map.getContainer();
  
      let animationFrameId =
        null;
  
      function invalidateMapSize() {
        if (
          animationFrameId !==
          null
        ) {
          cancelAnimationFrame(
            animationFrameId,
          );
        }
  
        animationFrameId =
          requestAnimationFrame(
            () => {
              map.invalidateSize({
                pan: false,
  
                debounceMoveend:
                  true,
              });
            },
          );
      }
  
      /*
       * Run once after the current layout is painted.
       */
      invalidateMapSize();
  
      let resizeObserver =
        null;
  
      if (
        typeof ResizeObserver !==
        "undefined"
      ) {
        resizeObserver =
          new ResizeObserver(
            invalidateMapSize,
          );
  
        resizeObserver.observe(
          mapContainer,
        );
      }
  
      window.addEventListener(
        "resize",
        invalidateMapSize,
      );
  
      return () => {
        if (
          animationFrameId !==
          null
        ) {
          cancelAnimationFrame(
            animationFrameId,
          );
        }
  
        resizeObserver
          ?.disconnect();
  
        window.removeEventListener(
          "resize",
          invalidateMapSize,
        );
      };
    }, [map]);
  
    return null;
  }
  
  export default MapResizeController;