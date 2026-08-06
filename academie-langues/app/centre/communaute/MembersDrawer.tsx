"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, UserPlus, UserMinus, X, Loader2, Users, ShieldCheck } from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { useI18n } from "@/app/i18n/I18nProvider";

const BLUE = "#11224E";
const ORANGE = "#eb670e";

type Member = {
  user_id: string;
  prenom: string;
  nom: string;
  email: string;
  role: string; // rôle global (student, trainer, center_manager...)
  room_role: string; // rôle dans la salle (member, owner, room_admin)
};

type CenterProfile = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  role: string;
};

const ROLE_KEYS: Record<string, string> = {
  center_manager: "membersRoleDirector", campus_manager: "membersRoleCampusDirector", staff: "staffAdministrative",
  trainer: "accountRoleTrainer", student: "membersRoleStudent", admin: "membersRoleNexaAdmin",
};

const ROOM_ROLE_KEYS: Record<string, string> = {
  owner: "membersRoomOwner", room_admin: "membersRoomAdmin", member: "communityMember",
};

export default function MembersDrawer({ roomId, roomName, centerId, onClose }: {
  roomId: string;
  roomName: string;
  centerId: string;
  onClose: () => void;
}){
  const { t } = useI18n();
  
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchMembers, setSearchMembers] = useState("");

  // Ajout
  const [showAdd, setShowAdd] = useState(false);
  const [searchAdd, setSearchAdd] = useState("");
  const [candidates, setCandidates] = useState<CenterProfile[]>([]);
  const [searchingCandidates, setSearchingCandidates] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  // Suppression
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("community_room_members")
      .select("user_id, role, profiles:user_id(prenom, nom, email, role)")
      .eq("room_id", roomId);

    const list: Member[] = (data || []).map((m: any) => ({
      user_id: m.user_id,
      prenom: m.profiles?.prenom || "—",
      nom: m.profiles?.nom || "",
      email: m.profiles?.email || "",
      role: m.profiles?.role || "student",
      room_role: m.role || "member",
    }));

    // Trier : owners en premier, puis par nom
    list.sort((a, b) => {
      const order: Record<string, number> = { owner: 0, room_admin: 1, member: 2 };
      const diff = (order[a.room_role] ?? 2) - (order[b.room_role] ?? 2);
      if (diff !== 0) return diff;
      return `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`);
    });

    setMembers(list);
    setLoading(false);
  }, [roomId]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  // Rechercher des personnes du centre à ajouter
  const searchCenterProfiles = useCallback(async (query: string) => {
    if (!query.trim()) { setCandidates([]); return; }
    setSearchingCandidates(true);

    const { data } = await supabase
      .from("profiles")
      .select("id, prenom, nom, email, role")
      .eq("center_id", centerId)
      .or(`prenom.ilike.%${query}%,nom.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10);

    // Exclure ceux qui sont déjà membres
    const memberIds = new Set(members.map(m => m.user_id));
    setCandidates((data || []).filter(p => !memberIds.has(p.id)));
    setSearchingCandidates(false);
  }, [centerId, members]);

  useEffect(() => {
    const timer = setTimeout(() => searchCenterProfiles(searchAdd), 300);
    return () => clearTimeout(timer);
  }, [searchAdd, searchCenterProfiles]);

  const addMember = async (profileId: string) => {
    setAdding(profileId);
    const { error } = await supabase.rpc("add_member_if_missing", {
      p_room_id: roomId,
      p_user_id: profileId,
      p_role: "member",
    });
    if (error) {
      alert(`${t("centre", "membersError")} : ${error.message}`);
    } else {
      await loadMembers();
      setCandidates(prev => prev.filter(c => c.id !== profileId));
    }
    setAdding(null);
  };

  const removeMember = async (userId: string) => {
    setRemoving(userId);
    const { error } = await supabase
      .from("community_room_members")
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", userId);

    if (error) {
      alert(`${t("centre", "membersError")} : ${error.message}`);
    } else {
      setMembers(prev => prev.filter(m => m.user_id !== userId));
    }
    setRemoving(null);
    setConfirmRemove(null);
  };

  const filteredMembers = members.filter(m =>
    `${m.prenom} ${m.nom} ${m.email}`.toLowerCase().includes(searchMembers.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-black text-sm" style={{ color: BLUE }}>{t("centre", "communityMembers")}</h3>
            <p className="text-[10px] text-neutral-400 mt-0.5">{roomName} · {t("centre", "communityMemberCount", { count: members.length })}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        {/* Recherche + bouton ajouter */}
        <div className="px-5 py-3 border-b flex items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={searchMembers}
              onChange={e => setSearchMembers(e.target.value)}
              placeholder={t("centre", "membersSearch")}
              className="w-full h-9 pl-8 pr-3 rounded-xl bg-neutral-100 text-xs font-medium outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>
          <button
            onClick={() => { setShowAdd(!showAdd); setSearchAdd(""); setCandidates([]); }}
            className={`h-9 px-3 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all ${showAdd ? "bg-neutral-100 text-neutral-500" : "text-white"}`}
            style={!showAdd ? { backgroundColor: ORANGE } : {}}
          >
            {showAdd ? <X size={13} /> : <UserPlus size={13} />}
            {showAdd ? t("centre", "periodClose") : t("centre", "periodAdd")}
          </button>
        </div>

        {/* Panneau d'ajout */}
        {showAdd && (
          <div className="px-5 py-3 border-b bg-orange-50/50 shrink-0">
            <p className="text-[10px] font-black uppercase text-neutral-400 mb-2">{t("centre", "membersAddCenterMember")}</p>
            <div className="relative mb-2">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={searchAdd}
                onChange={e => setSearchAdd(e.target.value)}
                placeholder={t("centre", "membersSearchPlaceholder")}
                className="w-full h-9 pl-8 pr-3 rounded-xl bg-white border text-xs font-medium outline-none focus:border-orange-300"
                autoFocus
              />
            </div>

            {searchingCandidates && (
              <div className="flex justify-center py-3"><Loader2 size={16} className="animate-spin text-neutral-400" /></div>
            )}

            {!searchingCandidates && searchAdd.trim() && candidates.length === 0 && (
              <p className="text-[11px] text-neutral-400 italic py-2">{t("centre", "membersNoCandidate")}</p>
            )}

            <div className="max-h-40 overflow-y-auto space-y-1">
              {candidates.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-[9px] font-black text-orange-600 shrink-0">
                      {c.prenom[0]}{c.nom?.[0] || ""}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold truncate" style={{ color: BLUE }}>{c.prenom} {c.nom}</p>
                      <p className="text-[9px] text-neutral-400 truncate">{c.email} · {ROLE_KEYS[c.role] ? t("centre", ROLE_KEYS[c.role]) : c.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => addMember(c.id)}
                    disabled={adding === c.id}
                    className="h-7 px-2.5 rounded-lg text-[9px] font-black uppercase text-white flex items-center gap-1 disabled:opacity-50 shrink-0"
                    style={{ backgroundColor: ORANGE }}
                  >
                    {adding === c.id ? <Loader2 size={10} className="animate-spin" /> : <UserPlus size={10} />}
                    {t("centre", "periodAdd")}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Liste des membres */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-neutral-300" /></div>
          ) : filteredMembers.length === 0 ? (
            <p className="text-center text-xs text-neutral-400 py-10">{t("centre", "membersNoneFound")}</p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {filteredMembers.map(m => {
                const isStaff = ["admin", "center_manager", "campus_manager", "staff", "trainer"].includes(m.role);
                return (
                  <div key={m.user_id} className="px-5 py-3 flex items-center gap-3 hover:bg-neutral-50 transition-colors">
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${isStaff ? "bg-gradient-to-br from-slate-800 to-slate-900 text-orange-400" : "bg-gradient-to-br from-orange-400 to-orange-500 text-white"}`}>
                      {m.prenom[0]}{m.nom?.[0] || ""}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold truncate" style={{ color: BLUE }}>{m.prenom} {m.nom}</p>
                        {m.room_role !== "member" && (
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200 shrink-0">
                            {ROOM_ROLE_KEYS[m.room_role] ? t("centre", ROOM_ROLE_KEYS[m.room_role]) : m.room_role}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-neutral-400 truncate">{m.email}</p>
                      <span className="text-[9px] font-bold text-neutral-300">{ROLE_KEYS[m.role] ? t("centre", ROLE_KEYS[m.role]) : m.role}</span>
                    </div>

                    {/* Action retirer */}
                    {m.room_role !== "owner" && (
                      <div className="shrink-0">
                        {confirmRemove === m.user_id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => removeMember(m.user_id)}
                              disabled={removing === m.user_id}
                              className="h-7 px-2 rounded-lg text-[9px] font-black uppercase bg-red-600 text-white flex items-center gap-1 disabled:opacity-50"
                            >
                              {removing === m.user_id ? <Loader2 size={10} className="animate-spin" /> : t("centre", "membersConfirm")}
                            </button>
                            <button onClick={() => setConfirmRemove(null)} className="h-7 px-2 rounded-lg text-[9px] font-bold bg-neutral-100">{t("centre", "settingsNo")}</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmRemove(m.user_id)}
                            className="w-7 h-7 rounded-lg bg-neutral-100 hover:bg-red-50 flex items-center justify-center text-neutral-400 hover:text-red-500 transition-colors"
                            title={t("centre", "membersRemoveFromRoom")}
                          >
                            <UserMinus size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer récap */}
        <div className="px-5 py-3 border-t bg-neutral-50 shrink-0">
          <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400">
            <span>{members.filter(m => ["admin", "center_manager", "campus_manager", "staff", "trainer"].includes(m.role)).length} {t("centre", "membersStaff")}</span>
            <span>{members.filter(m => m.role === "student").length} {t("centre", "membersStudentsLower")}</span>
            <span>{members.length} {t("centre", "membersTotalLower")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
