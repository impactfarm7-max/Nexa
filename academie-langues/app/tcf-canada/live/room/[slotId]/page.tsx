import { Suspense } from "react";
import TcfCollectiveRoomPage from "./TcfCollectiveRoomClient";

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    }>
      <TcfCollectiveRoomPage />
    </Suspense>
  );
}
