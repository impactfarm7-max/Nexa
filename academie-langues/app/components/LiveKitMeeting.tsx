"use client";

import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";

type Props = {
  url: string;
  token: string;
  onClose: () => void;
};

export default function LiveKitMeeting({ url, token, onClose }: Props) {
  return (
    <LiveKitRoom
      serverUrl={url}
      token={token}
      connect={true}
      video={true}
      audio={true}
      onDisconnected={onClose}
      data-lk-theme="default"
      style={{ height: "100%", width: "100%" }}
    >
      <VideoConference />
    </LiveKitRoom>
  );
}
