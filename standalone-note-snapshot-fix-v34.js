(() => {
  "use strict";

  const C = window.SetkaStandaloneV34;
  const Setka = window.SetkaApp;
  if (!C || !Setka) return;

  const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));

  function patternIdOf(note) {
    return note?.patternId || note?.state?.patternId || note?.config?.patternId || null;
  }

  function resolveNote(card) {
    const text = card.querySelector(".st34-note-text")?.textContent || "";
    const meta = card.querySelector(".st34-note-meta")?.textContent || "";
    const notes = Array.isArray(C.getData?.()?.notes) ? C.getData().notes : [];
    const sameText = notes.filter(n => String(n?.text ?? "") === text);
    if (sameText.length === 1) return sameText[0];
    const byTime = sameText.find(n => {
      try { return meta.startsWith(C.dt?.(n.observedAt) || ""); }
      catch (_) { return false; }
    });
    return byTime || sameText.at(-1) || null;
  }

  function repairCard(card) {
    if (!(card instanceof Element)) return;
    const note = resolveNote(card);
    if (!note?.config) return;

    const pid = patternIdOf(note);
    const canvas = card.querySelector("canvas.st34-note-preview");
    if (canvas && typeof Setka.renderPreview === "function") {
      try {
        Setka.renderPreview(canvas, clone(note.config), note.frame ?? 44, pid);
        canvas.dataset.snapshotPatternId = pid || "";
      } catch (e) {
        console.warn("SETKA note snapshot preview repair failed", e);
      }
    }

    const open = card.querySelector(".st34-note-preview-button");
    if (open) {
      open.onclick = e => {
        e?.preventDefault?.();
        e?.stopPropagation?.();
        C.hideLayer?.();
        Setka.openConfig?.(clone(note.config), {
          type: "memory",
          id: note.id,
          patternId: pid,
          baseId: pid,
          communityId: note.communityId || null,
          noteId: note.id
        });
      };
    }

    const label = card.querySelector(".st34-note-preview-label");
    if (label) {
      const title = pid && Setka.getPatternTitle?.(pid);
      label.textContent = title
        ? `ПАТТЕРН В МОМЕНТ ЗАМЕТКИ · ${String(title).toUpperCase()}`
        : "ПАТТЕРН В МОМЕНТ ЗАМЕТКИ";
    }

    card.dataset.noteSnapshotFixed = "1";
  }

  function scan(root = document) {
    const cards = root.matches?.(".st34-note-card") ? [root] : root.querySelectorAll?.(".st34-note-card") || [];
    for (const card of cards) repairCard(card);
  }

  const observer = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType === 1) scan(node);
      }
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  scan();

  window.__SETKA_NOTE_SNAPSHOT_FIX_V34__ = true;
})();