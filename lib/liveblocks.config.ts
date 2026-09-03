"use client";

import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
});

// Presence = ephemeral per-user state (cursor position, typing, etc.)
type Presence = {
  cursor: { x: number; y: number } | null;
  isTyping: boolean;
  name: string;
  color: string;
};

// UserMeta = static info returned from the auth endpoint
type UserMeta = {
  id: string;
  info: {
    name: string;
    avatar: string;
    color: string;
  };
};

export const {
  RoomProvider,
  useOthers,
  useMyPresence,
  useSelf,
} = createRoomContext<Presence, never, UserMeta>(client);
