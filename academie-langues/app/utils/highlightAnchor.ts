export type HighlightAnchor = {
  startOffset: number;
  endOffset: number;
  prefix?: string;
  suffix?: string;
};

export function buildAnchorFromSelection(container: HTMLElement, range: Range): HighlightAnchor | null {
  const selectedText = range.toString().trim();
  if (!selectedText) return null;

  const preRange = document.createRange();
  preRange.selectNodeContents(container);
  preRange.setEnd(range.startContainer, range.startOffset);
  const startOffset = preRange.toString().length;
  const endOffset = startOffset + range.toString().length;

  const fullText = container.textContent || "";
  const prefix = fullText.slice(Math.max(0, startOffset - 32), startOffset);
  const suffix = fullText.slice(endOffset, endOffset + 32);

  return { startOffset, endOffset, prefix, suffix };
}

function findOffsetByContext(fullText: string, selectedText: string, anchor: HighlightAnchor): number {
  if (anchor.prefix !== undefined && anchor.suffix !== undefined) {
    const needle = `${anchor.prefix}${selectedText}${anchor.suffix}`;
    const idx = fullText.indexOf(needle);
    if (idx >= 0) return idx + anchor.prefix.length;
  }
  const direct = fullText.indexOf(selectedText);
  if (direct >= 0) return direct;
  if (anchor.startOffset >= 0 && anchor.endOffset <= fullText.length) {
    const slice = fullText.slice(anchor.startOffset, anchor.endOffset);
    if (slice === selectedText) return anchor.startOffset;
  }
  return -1;
}

function getTextNodes(root: Node): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n = walker.nextNode();
  while (n) {
    nodes.push(n as Text);
    n = walker.nextNode();
  }
  return nodes;
}

function offsetToRange(container: HTMLElement, start: number, end: number): Range | null {
  const nodes = getTextNodes(container);
  let pos = 0;
  let startNode: Text | null = null;
  let endNode: Text | null = null;
  let startOff = 0;
  let endOff = 0;

  for (const node of nodes) {
    const len = node.textContent?.length ?? 0;
    if (!startNode && pos + len >= start) {
      startNode = node;
      startOff = start - pos;
    }
    if (!endNode && pos + len >= end) {
      endNode = node;
      endOff = end - pos;
      break;
    }
    pos += len;
  }

  if (!startNode || !endNode) return null;
  const range = document.createRange();
  range.setStart(startNode, startOff);
  range.setEnd(endNode, endOff);
  return range;
}

export function applyHighlightsToContainer(
  container: HTMLElement,
  highlights: Array<{
    id: string;
    selected_text: string;
    color_key: string;
    anchor: HighlightAnchor;
    hex_color?: string;
  }>,
  colorHex: Record<string, string>
) {
  container.querySelectorAll("mark[data-highlight-id]").forEach((el) => {
    const parent = el.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(el.textContent || ""), el);
    parent.normalize();
  });

  const fullText = container.textContent || "";
  const sorted = [...highlights].sort((a, b) => {
    const aStart = findOffsetByContext(fullText, a.selected_text, a.anchor);
    const bStart = findOffsetByContext(fullText, b.selected_text, b.anchor);
    return bStart - aStart;
  });

  for (const h of sorted) {
    const start = findOffsetByContext(fullText, h.selected_text, h.anchor);
    if (start < 0) continue;
    const end = start + h.selected_text.length;
    const range = offsetToRange(container, start, end);
    if (!range) continue;

    const mark = document.createElement("mark");
    mark.dataset.highlightId = h.id;
    mark.style.backgroundColor = h.hex_color || colorHex[h.color_key] || "#FEF08A";
    mark.style.borderRadius = "2px";
    mark.style.padding = "0 1px";
    mark.style.cursor = "pointer";

    try {
      range.surroundContents(mark);
    } catch {
      const contents = range.extractContents();
      mark.appendChild(contents);
      range.insertNode(mark);
    }
  }
}

export function wrapRangeAsPending(range: Range): HTMLElement | null {
  const mark = document.createElement("mark");
  mark.className = "pending-highlight";
  mark.dataset.pendingHighlight = "1";
  mark.style.backgroundColor = "rgba(251, 191, 36, 0.5)";
  mark.style.outline = "2px dashed rgba(249, 115, 22, 0.65)";
  mark.style.borderRadius = "2px";
  mark.style.padding = "0 1px";

  try {
    range.surroundContents(mark);
  } catch {
    const contents = range.extractContents();
    mark.appendChild(contents);
    range.insertNode(mark);
  }
  return mark;
}

export function unwrapPendingMark(mark: HTMLElement | null) {
  if (!mark?.parentNode) return;
  const parent = mark.parentNode;
  while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
  parent.removeChild(mark);
  parent.normalize();
}

export function scrollToHighlight(container: HTMLElement, highlightId: string) {
  const el = container.querySelector(`mark[data-highlight-id="${CSS.escape(highlightId)}"]`);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("ring-2", "ring-orange-500", "ring-offset-2", "animate-pulse");
  setTimeout(() => el.classList.remove("ring-2", "ring-orange-500", "ring-offset-2", "animate-pulse"), 2500);
  return true;
}
