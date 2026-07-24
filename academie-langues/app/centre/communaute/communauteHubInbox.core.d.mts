export type HubFilterId = "all" | "announcements" | "forums" | "classes" | "groups";

export type HubFilter = { id: HubFilterId; label: string };

export type InboxRowKind = "announcement" | "forum" | "classroom" | "group";

export type InboxRow = {
  id: string;
  room: any;
  kind: InboxRowKind;
  title: string;
  meta: string | null;
  preview: string;
  time: string | null;
  unread: number;
};

export type InboxSection = {
  id: string;
  title: string;
  summary: string | null;
  unread: number;
  rows: InboxRow[];
};

export type BuildCommunauteInboxInput = {
  centerAnnouncements?: any[];
  freeGroups?: any[];
  programmes?: any[];
  lastMessages?: Record<string, { text: string; time: string; sender?: string }>;
  unreadCounts?: Record<string, number>;
  searchQuery?: string;
  filter?: HubFilterId;
};

export type BuildCommunauteInboxResult = {
  sections: InboxSection[];
  emptyReason: null | "none" | "search" | "filter";
};

export const HUB_FILTERS: HubFilter[];
export function buildCommunauteInbox(input: BuildCommunauteInboxInput): BuildCommunauteInboxResult;
