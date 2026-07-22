import { io } from "socket.io-client";

const SOCKET_URL = (
  import.meta.env.VITE_SOCKET_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

/**
 * A single shared Socket.IO client.
 *
 * autoConnect is false because the application must not open
 * a live connection before REST authentication has completed.
 */
export const socket = io(
  SOCKET_URL,
  {
    autoConnect: false,

    /*
     * Sends the HttpOnly authentication Cookie
     * during the Socket.IO handshake.
     */
    withCredentials: true,

    transports: [
      "websocket",
    ],

    reconnection: true,

    reconnectionAttempts:
      Infinity,

    reconnectionDelay:
      1000,

    reconnectionDelayMax:
      5000,

    timeout:
      10000,
  },
);

export function connectSocket() {
  if (!socket.connected) {
    socket.connect();
  }
}

export function disconnectSocket() {
  socket.disconnect();
}

export { SOCKET_URL };