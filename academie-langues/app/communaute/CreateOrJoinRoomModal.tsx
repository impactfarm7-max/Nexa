"use client";

import { useState } from "react";
import { X, Link2, Plus, Loader2 } from "lucide-react";
import type { RoomType } from "./useRooms";
import { useI18n } from "@/app/i18n/I18nProvider";

type Props = {
  isStaff: boolean; // admin / trainer / center_manager
  canCreateStudyGroup: boolean; // profiles.can_create_study_group
  centerId: string | null;
  onClose: () => void;
  onJoin: (code: string) => Promise<any>;
  onCreate: (params: { name: string; type: RoomType; expiresAt?: string | null }) => Promise<any>;
};

export default function CreateOrJoinRoomModal({ isStaff, canCreateStudyGroup, centerId, onClose, onJoin, onCreate }: Props) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"join" | "create">(isStaff || canCreateStudyGroup ? "create" : "join");

  // Rejoindre
  const [code, setCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);

  // Créer
  const [name, setName] = useState("");
  const [type, setType] = useState<RoomType>(isStaff ? "classroom" : "study_group");
  const [expiresAt, setExpiresAt] = useState("");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const canCreate = isStaff || canCreateStudyGroup;

  const handleJoin = async () => {
    if (!code.trim()) return;
    setJoining(true);
    setJoinError("");
    try {
      await onJoin(code.trim());
      onClose();
    } catch (e: any) {
      setJoinError(e.message || t("dashboard", "communauteInvalidCode"));
    } finally {
      setJoining(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      await onCreate({
        name: name.trim(),
        type,
        expiresAt: type === "study_group" && expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      onClose();
    } catch (e: any) {
      setCreateError(e.message || t("dashboard", "communauteCreateError"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-[2rem] rounded-t-[2rem] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <p className="font-black text-slate-900">{t("dashboard", "communauteRooms")}</p>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {canCreate && (
          <div className="flex px-5 pt-4 gap-2">
            <button
              onClick={() => setTab("join")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${tab === "join" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}
            >
              {t("dashboard", "communauteJoin")}
            </button>
            <button
              onClick={() => setTab("create")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${tab === "create" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}
            >
              {t("dashboard", "communauteCreate")}
            </button>
          </div>
        )}

        <div className="p-5 space-y-4">
          {tab === "join" && (
            <>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">{t("dashboard", "communauteInviteCode")}</label>
                <div className="flex items-center gap-2 bg-slate-100 rounded-2xl px-4 py-3">
                  <Link2 size={16} className="text-slate-400 shrink-0" />
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="NEXA-7F2K9Q"
                    className="flex-1 bg-transparent outline-none text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-medium uppercase"
                  />
                </div>
                {joinError && <p className="text-xs font-bold text-red-500 mt-2">{joinError}</p>}
              </div>
              <button
                onClick={handleJoin}
                disabled={!code.trim() || joining}
                className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                {joining ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                {t("dashboard", "communauteJoinRoom")}
              </button>
            </>
          )}

          {tab === "create" && canCreate && (
            <>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">{t("dashboard", "communauteRoomName")}</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("dashboard", "communauteRoomNamePlaceholder")}
                  className="w-full bg-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-medium outline-none focus:ring-2 focus:ring-orange-200"
                />
              </div>

              {isStaff && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">{t("dashboard", "communauteType")}</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setType("classroom")}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-colors ${type === "classroom" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200"}`}
                    >
                      {t("centre", "communityClassroom")}
                    </button>
                    <button
                      onClick={() => setType("announcement")}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-colors ${type === "announcement" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200"}`}
                    >
                      {t("dashboard", "communauteAnnouncementsReadOnly")}
                    </button>
                  </div>
                </div>
              )}

              {!isStaff && canCreateStudyGroup && (
                <>
                  <input type="hidden" value="study_group" />
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">{t("dashboard", "communauteExpiresOptional")}</label>
                    <input
                      type="date"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="w-full bg-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-orange-200"
                    />
                    <p className="text-[10px] text-slate-400 font-medium mt-1.5">{t("dashboard", "communauteExpiresHint")}</p>
                  </div>
                </>
              )}

              {createError && <p className="text-xs font-bold text-red-500">{createError}</p>}

              <button
                onClick={handleCreate}
                disabled={!name.trim() || creating}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {t("dashboard", "communauteCreateRoom")}
              </button>
              <p className="text-[10px] text-slate-400 font-medium text-center">
                {t("dashboard", "communauteInviteHint")}
              </p>
            </>
          )}

          {tab === "create" && !canCreate && (
            <p className="text-sm text-slate-400 font-medium text-center py-6">{t("dashboard", "communauteNotAllowedCreate")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
