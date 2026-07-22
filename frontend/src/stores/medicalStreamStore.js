import { create } from "zustand";

import { socket } from "../services/socket.js";
import {
  confirmedMedicalReadingSchema,
  medicalReadingSchema,
} from "../schemas/medicalReadingSchema.js";

let listenersRegistered = false;

export const useMedicalStreamStore = create((set, get) => ({
  connectionStatus: "disconnected",
  socketId: null,

  sequence: 0,

  lastReading: null,
  lastAcknowledgement: null,
  connectionMessage: null,
  error: null,

  connect: () => {
    /*
     * تسجيل المستمعين مرة واحدة فقط.
     * هذا يمنع تكرار الأحداث أثناء إعادة Render.
     */
    if (!listenersRegistered) {
      socket.on("connect", () => {
        set({
          connectionStatus: "connected",
          socketId: socket.id,
          error: null,
        });
      });

      socket.on("connection:ready", (payload) => {
        set({
          socketId: payload.socketId,
          connectionMessage: payload.message,
          error: null,
        });
      });

      socket.on("disconnect", (reason) => {
        set({
          connectionStatus: "disconnected",
          socketId: null,
          connectionMessage: null,
          error: `Socket disconnected: ${reason}`,
        });
      });

      socket.on("connect_error", (error) => {
        set({
          connectionStatus: "error",
          socketId: null,
          error: error.message,
        });
      });

      socket.on("medical:reading-confirmed", (payload) => {
        const validationResult =
          confirmedMedicalReadingSchema.safeParse(payload);

        if (!validationResult.success) {
          console.error(
            "Invalid confirmed medical reading:",
            validationResult.error.issues,
          );

          set({
            error: "The server returned an invalid medical reading.",
          });

          return;
        }

        set({
          lastReading: validationResult.data,
          error: null,
        });
      });

      listenersRegistered = true;
    }

    set({
      connectionStatus: "connecting",
      error: null,
    });

    if (!socket.connected) {
      socket.connect();
    }
  },

  disconnect: () => {
    socket.disconnect();

    set({
      connectionStatus: "disconnected",
      socketId: null,
      connectionMessage: null,
    });
  },

  sendTestReading: () => {
    if (!socket.connected) {
      set({
        error: "Socket.IO is not connected.",
      });

      return;
    }

    const nextSequence = get().sequence + 1;

    const reading = {
      eventId: crypto.randomUUID(),
      patientId: "patient-test-001",
      sequence: nextSequence,
      recordedAt: new Date().toISOString(),
      heartRate: 82,
      latitude: 33.5138,
      longitude: 36.2765,
    };

    const validationResult =
      medicalReadingSchema.safeParse(reading);

    if (!validationResult.success) {
      console.error(
        "Invalid outgoing medical reading:",
        validationResult.error.issues,
      );

      set({
        error: "The outgoing medical reading is invalid.",
      });

      return;
    }

    set({
      sequence: nextSequence,
      lastAcknowledgement: null,
      error: null,
    });

    socket
      .timeout(5000)
      .emit(
        "medical:test-reading",
        validationResult.data,
        (error, acknowledgement) => {
          if (error) {
            set({
              error:
                "The server did not acknowledge the reading within 5 seconds.",
            });

            return;
          }

          set({
            lastAcknowledgement: acknowledgement,
            error: null,
          });
        },
      );
  },

  clearError: () => {
    set({
      error: null,
    });
  },
}));