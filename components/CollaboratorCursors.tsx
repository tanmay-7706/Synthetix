"use client";

import { useOthers, useSelf } from "@/lib/liveblocks.config";

/**
 * Renders floating avatar pills for all collaborators currently in the room.
 * Shows a green dot for online presence and each user's name initial.
 */
export function CollaboratorAvatars() {
  const others = useOthers();
  const self = useSelf();

  if (others.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {/* Self (dimmed) */}
      {self && (
        <div
          className="relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#111] text-[10px] font-bold text-white/90 shadow-sm"
          style={{ background: self.info?.color ?? "#3b82f6" }}
          title={`${self.info?.name ?? "You"} (you)`}
        >
          {(self.info?.name ?? "Y")[0].toUpperCase()}
        </div>
      )}

      {/* Others */}
      {others.map(({ connectionId, info }) => (
        <div
          key={connectionId}
          className="relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#111] text-[10px] font-bold text-white/90 shadow-sm transition-transform hover:scale-110"
          style={{ background: info?.color ?? "#8b5cf6" }}
          title={info?.name ?? "Guest"}
        >
          {(info?.name ?? "G")[0].toUpperCase()}
          {/* Online dot */}
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-[#111] bg-emerald-400" />
        </div>
      ))}

      {others.length > 0 && (
        <span className="ml-1 text-[10px] text-white/25">
          {others.length} online
        </span>
      )}
    </div>
  );
}

/**
 * Renders floating cursor labels for collaborators.
 * Each cursor shows a colored pointer with the user's name.
 */
export function CollaboratorCursors() {
  const others = useOthers();

  return (
    <>
      {others.map(({ connectionId, presence, info }) => {
        if (!presence?.cursor) return null;
        return (
          <div
            key={connectionId}
            className="pointer-events-none fixed z-[9999] transition-all duration-75"
            style={{
              left: presence.cursor.x,
              top: presence.cursor.y,
            }}
          >
            {/* Cursor arrow */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              style={{ color: info?.color ?? "#8b5cf6" }}
            >
              <path
                d="M0.928548 0.65885C0.804665 0.130405 1.36639 -0.297341 1.84637 -0.0165199L14.7791 7.47769C15.2943 7.77906 15.1355 8.55993 14.5387 8.63178L8.07979 9.40879C7.8724 9.43372 7.69515 9.57483 7.6249 9.77254L5.31814 16.2579C5.10798 16.8491 4.29644 16.8733 4.05243 16.2933L0.928548 0.65885Z"
                fill="currentColor"
              />
            </svg>
            {/* Name label */}
            <div
              className="ml-3 -mt-0.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium text-white shadow-lg"
              style={{ background: info?.color ?? "#8b5cf6" }}
            >
              {info?.name ?? "Guest"}
            </div>
          </div>
        );
      })}
    </>
  );
}
