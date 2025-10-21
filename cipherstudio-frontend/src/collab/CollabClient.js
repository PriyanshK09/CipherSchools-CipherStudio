import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.VITE_API_URL?.replace(/\/api$/, "") || "http://localhost:5000");

export default class CollabClient {
  constructor({ room, user }) {
    this.socket = io(SOCKET_URL, { withCredentials: true });
    this.room = room;
    this.user = user;
  }

  connect() {
    this.socket.emit("join", { room: this.room, user: this.user });
    return this;
  }

  onPresenceJoin(cb) { this.socket.on("presence:join", cb); return this; }
  onPresenceLeave(cb) { this.socket.on("presence:leave", cb); return this; }
  onCursorUpdate(cb) { this.socket.on("cursor:update", cb); return this; }
  onContentApply(cb) { this.socket.on("content:apply", cb); return this; }

  sendCursor(position) { this.socket.emit("cursor", { room: this.room, userId: this.user?.id, position }); }
  sendPatch(patch) { this.socket.emit("content:change", { room: this.room, patch }); }

  disconnect() { this.socket.disconnect(); }
}
