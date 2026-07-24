"use client";

import {
  Plus, GraduationCap, UsersRound, Hash, Megaphone, ChevronRight, Bell,
} from "lucide-react";
import {
  BLUE,
  ORANGE,
  OutlineHeaderButton,
  ToolbarSearch,
} from "../center-page-ui";
import {
  buildCommunauteInbox,
  HUB_FILTERS,
  type HubFilterId,
  type InboxRow,
  type InboxSection,
} from "./communauteHubInbox.core.mjs";

type Props = {
  centerName: string;
  totalUnread: number;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  filter: HubFilterId;
  onFilterChange: (f: HubFilterId) => void;
  centerAnnouncements: any[];
  freeGroups: any[];
  programmes: any[];
  lastMessages: Record<string, { text: string; time: string; sender?: string }>;
  unreadCounts: Record<string, number>;
  onOpenRoom: (room: any) => void;
  onCreateGroup: () => void;
  formatSidebarTime: (iso: string) => string;
};

function kindIcon(kind: InboxRow["kind"]) {
  if (kind === "announcement") return <Megaphone size={16} style={{ color: BLUE }} />;
  if (kind === "forum") return <Hash size={16} style={{ color: BLUE }} />;
  if (kind === "classroom") return <GraduationCap size={16} style={{ color: BLUE }} />;
  return <UsersRound size={16} style={{ color: ORANGE }} />;
}

function kindLabel(kind: InboxRow["kind"]) {
  if (kind === "announcement") return "Annonces";
  if (kind === "forum") return "Forum";
  if (kind === "classroom") return "Classe";
  return "Groupe";
}

function RoomRow({
  row,
  onOpen,
  formatSidebarTime,
}: {
  row: InboxRow;
  onOpen: (room: any) => void;
  formatSidebarTime: (iso: string) => string;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(row.room)}
      className="w-full flex items-center gap-3 px-3 sm:px-4 h-16 text-left hover:bg-neutral-50 border-b border-neutral-100 last:border-b-0 transition-colors"
    >
      <div className="h-10 w-10 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
        {kindIcon(row.kind)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold truncate" style={{ color: BLUE }}>
            {row.title}
          </p>
          {row.meta ? (
            <span className="text-[10px] font-bold text-neutral-400 truncate shrink-0">{row.meta}</span>
          ) : null}
        </div>
        <p className="text-[11px] text-neutral-500 truncate mt-0.5">
          {row.preview}
          {row.time ? ` · ${formatSidebarTime(row.time)}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {row.unread > 0 ? (
          <span
            className="min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black text-white flex items-center justify-center"
            style={{ backgroundColor: ORANGE }}
          >
            {row.unread > 99 ? "99+" : row.unread}
          </span>
        ) : null}
        <span className="hidden sm:inline text-[9px] font-black uppercase tracking-wider text-neutral-400 border border-neutral-200 rounded-full px-2 py-0.5">
          {kindLabel(row.kind)}
        </span>
        <ChevronRight size={14} className="text-neutral-300" />
      </div>
    </button>
  );
}

function SectionBlock({
  section,
  onOpen,
  formatSidebarTime,
}: {
  section: InboxSection;
  onOpen: (room: any) => void;
  formatSidebarTime: (iso: string) => string;
}) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2 bg-neutral-50/80">
        <h2 className="text-xs font-black uppercase tracking-wider flex-1 truncate" style={{ color: BLUE }}>
          {section.title}
        </h2>
        {section.summary ? (
          <span className="text-[11px] font-medium text-neutral-500 truncate">{section.summary}</span>
        ) : null}
        {section.unread > 0 ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-black text-orange-600">
            <Bell size={11} /> {section.unread}
          </span>
        ) : null}
      </div>
      <div>
        {section.rows.map((row) => (
          <RoomRow key={row.id} row={row} onOpen={onOpen} formatSidebarTime={formatSidebarTime} />
        ))}
      </div>
    </section>
  );
}

export default function CommunauteHubInbox(props: Props) {
  const {
    centerName,
    totalUnread,
    searchQuery,
    onSearchChange,
    filter,
    onFilterChange,
    centerAnnouncements,
    freeGroups,
    programmes,
    lastMessages,
    unreadCounts,
    onOpenRoom,
    onCreateGroup,
    formatSidebarTime,
  } = props;

  const { sections, emptyReason } = buildCommunauteInbox({
    centerAnnouncements,
    freeGroups,
    programmes,
    lastMessages,
    unreadCounts,
    searchQuery,
    filter,
  });

  return (
    <div className="h-[100dvh] bg-white flex flex-col overflow-hidden">
      <header className="shrink-0 h-[68px] border-b border-black/[0.06] bg-white z-10">
        <div className="nexa-center-shell h-full flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight truncate" style={{ color: BLUE }}>
              Communauté
            </h1>
            <p className="text-[11px] font-medium text-neutral-500 truncate">
              {centerName}
              {totalUnread > 0 ? ` · ${totalUnread} non lu${totalUnread > 1 ? "s" : ""}` : ""}
            </p>
          </div>
          <OutlineHeaderButton onClick={onCreateGroup}>
            <Plus size={14} /> Groupe
          </OutlineHeaderButton>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="nexa-center-shell py-5 space-y-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex gap-2 overflow-x-auto min-w-0 flex-1 pb-0.5">
              {HUB_FILTERS.map((f) => {
                const active = filter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onFilterChange(f.id)}
                    className={`shrink-0 h-9 px-3.5 rounded-full text-xs font-bold border transition-colors ${
                      active
                        ? "text-white border-transparent"
                        : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300"
                    }`}
                    style={active ? { backgroundColor: BLUE } : undefined}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
            <div className="w-[min(100%,14rem)] sm:w-[16rem] shrink-0">
              <ToolbarSearch
                value={searchQuery}
                onChange={onSearchChange}
                placeholder="Rechercher…"
              />
            </div>
          </div>

          {sections.map((section) => (
            <SectionBlock
              key={section.id}
              section={section}
              onOpen={onOpenRoom}
              formatSidebarTime={formatSidebarTime}
            />
          ))}

          {emptyReason === "none" && (
            <p className="text-sm text-neutral-400 italic py-10 text-center bg-white rounded-2xl border border-dashed border-neutral-200">
              Aucune salle disponible.
            </p>
          )}
          {emptyReason === "search" && (
            <p className="text-sm text-neutral-400 italic py-10 text-center bg-white rounded-2xl border border-dashed border-neutral-200">
              Aucun résultat pour « {searchQuery.trim()} ».
            </p>
          )}
          {emptyReason === "filter" && (
            <p className="text-sm text-neutral-400 italic py-10 text-center bg-white rounded-2xl border border-dashed border-neutral-200">
              Aucune salle dans ce filtre.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
