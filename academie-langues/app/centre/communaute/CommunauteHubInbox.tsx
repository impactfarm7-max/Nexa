"use client";

import { useState } from "react";
import {
  Plus, GraduationCap, UsersRound, Hash, Megaphone, ChevronRight, ChevronDown, Bell,
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

type SectionTone = {
  accent: string;
  headerBg: string;
  headerBorder: string;
  iconBg: string;
  iconBorder: string;
  badgeBg: string;
};

const TONE_CENTER: SectionTone = {
  accent: BLUE,
  headerBg: "rgba(17,34,78,0.06)",
  headerBorder: "rgba(17,34,78,0.14)",
  iconBg: "rgba(17,34,78,0.08)",
  iconBorder: "rgba(17,34,78,0.16)",
  badgeBg: ORANGE,
};

const TONE_FILIERE: SectionTone = {
  accent: ORANGE,
  headerBg: "rgba(235,103,14,0.08)",
  headerBorder: "rgba(235,103,14,0.18)",
  iconBg: "rgba(235,103,14,0.1)",
  iconBorder: "rgba(235,103,14,0.22)",
  badgeBg: ORANGE,
};

const TONE_GROUPS: SectionTone = {
  accent: "#059669",
  headerBg: "rgba(5,150,105,0.08)",
  headerBorder: "rgba(5,150,105,0.18)",
  iconBg: "rgba(5,150,105,0.1)",
  iconBorder: "rgba(5,150,105,0.22)",
  badgeBg: "#059669",
};

const KIND_COLORS: Record<InboxRow["kind"], string> = {
  announcement: BLUE,
  forum: ORANGE,
  classroom: "#0369a1",
  group: "#059669",
};

function sectionTone(sectionId: string): SectionTone {
  if (sectionId === "center") return TONE_CENTER;
  if (sectionId === "groups") return TONE_GROUPS;
  return TONE_FILIERE;
}

function kindIcon(kind: InboxRow["kind"]) {
  const color = KIND_COLORS[kind];
  if (kind === "announcement") return <Megaphone size={16} style={{ color }} />;
  if (kind === "forum") return <Hash size={16} style={{ color }} />;
  if (kind === "classroom") return <GraduationCap size={16} style={{ color }} />;
  return <UsersRound size={16} style={{ color }} />;
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
  tone,
}: {
  row: InboxRow;
  onOpen: (room: any) => void;
  formatSidebarTime: (iso: string) => string;
  tone: SectionTone;
}) {
  const kindColor = KIND_COLORS[row.kind];
  return (
    <button
      type="button"
      onClick={() => onOpen(row.room)}
      className="w-full flex items-center gap-3 px-3 sm:px-4 h-16 text-left hover:bg-black/[0.02] border-b border-neutral-100 last:border-b-0 transition-colors"
    >
      <div
        className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: tone.iconBg, border: `1px solid ${tone.iconBorder}` }}
      >
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
            style={{ backgroundColor: tone.badgeBg }}
          >
            {row.unread > 99 ? "99+" : row.unread}
          </span>
        ) : null}
        <span
          className="hidden sm:inline text-[9px] font-black uppercase tracking-wider rounded-full px-2 py-0.5 border"
          style={{ color: kindColor, borderColor: `${kindColor}33`, backgroundColor: `${kindColor}12` }}
        >
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
  const tone = sectionTone(section.id);
  const [open, setOpen] = useState(section.unread > 0);

  return (
    <section
      className="rounded-2xl border bg-white overflow-hidden"
      style={{ borderColor: tone.headerBorder }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full px-4 py-3 flex items-center gap-2.5 text-left transition-colors hover:brightness-[0.98]"
        style={{ backgroundColor: tone.headerBg, borderBottom: open ? `1px solid ${tone.headerBorder}` : undefined }}
      >
        <span
          className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: tone.iconBg, border: `1px solid ${tone.iconBorder}` }}
        >
          {section.id === "center" ? (
            <Megaphone size={15} style={{ color: tone.accent }} />
          ) : section.id === "groups" ? (
            <UsersRound size={15} style={{ color: tone.accent }} />
          ) : (
            <GraduationCap size={15} style={{ color: tone.accent }} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xs font-black uppercase tracking-wider truncate" style={{ color: tone.accent }}>
            {section.title}
          </h2>
          {section.summary ? (
            <p className="text-[11px] font-medium text-neutral-500 truncate mt-0.5">{section.summary}</p>
          ) : null}
        </div>
        {section.unread > 0 ? (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-black shrink-0"
            style={{ color: tone.accent }}
          >
            <Bell size={11} /> {section.unread}
          </span>
        ) : (
          <span className="text-[10px] font-bold text-neutral-400 shrink-0">
            {section.rows.length}
          </span>
        )}
        <ChevronDown
          size={16}
          className={`shrink-0 text-neutral-400 transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
        />
      </button>
      {open ? (
        <div>
          {section.rows.map((row) => (
            <RoomRow
              key={row.id}
              row={row}
              onOpen={onOpen}
              formatSidebarTime={formatSidebarTime}
              tone={tone}
            />
          ))}
        </div>
      ) : null}
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
    <div className="h-[100dvh] bg-[#FFFBF7] flex flex-col overflow-hidden">
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
        <div className="nexa-center-shell py-5 space-y-3">
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
