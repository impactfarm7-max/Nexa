"use client";

import { Globe, GraduationCap, Users, Plus, Crown, ShieldCheck } from "lucide-react";
import type { CommunityRoom } from "./useRooms";
import { useI18n } from "@/app/i18n/I18nProvider";

const TYPE_ICON: Record<string, any> = {
  announcement: Globe,
  classroom: GraduationCap,
  study_group: Users,
};

export default function RoomSwitcher({
  rooms,
  activeRoomId,
  onSelect,
  onOpenCreateOrJoin,
}: {
  rooms: CommunityRoom[];
  activeRoomId: string | null;
  onSelect: (room: CommunityRoom) => void;
  onOpenCreateOrJoin: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="flex overflow-x-auto hide-scrollbar px-4 pb-3 gap-2 border-t border-slate-100 pt-3 bg-slate-50/50 max-w-5xl mx-auto">
      {rooms.map((room) => {
        const Icon = TYPE_ICON[room.type] || Globe;
        const isActive = activeRoomId === room.id;
        return (
          <button
            key={room.id}
            onClick={() => onSelect(room)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border-2 shrink-0 ${
              isActive
                ? "bg-slate-900 text-white border-slate-900 shadow-md"
                : "bg-white text-slate-600 border-slate-200 hover:border-orange-500 hover:text-orange-600"
            }`}
          >
            {room.photo_url ? (
              <img src={room.photo_url} alt="" className="w-4 h-4 rounded-full object-cover" />
            ) : (
              <Icon size={14} className={isActive ? "text-orange-500" : "text-slate-400"} />
            )}
            {room.name}
            {room.role === "owner" && <Crown size={11} className={isActive ? "text-orange-400" : "text-orange-500"} />}
            {room.role === "room_admin" && <ShieldCheck size={11} className={isActive ? "text-orange-400" : "text-orange-500"} />}
          </button>
        );
      })}

      <button
        onClick={onOpenCreateOrJoin}
        title={t("dashboard", "communauteCreateOrJoin")}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border-2 border-dashed border-slate-300 text-slate-400 hover:border-orange-400 hover:text-orange-600 shrink-0"
      >
        <Plus size={14} />
        {t("dashboard", "communauteRoom")}
      </button>
    </div>
  );
}
