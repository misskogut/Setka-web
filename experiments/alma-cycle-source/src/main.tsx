// This wrapper is intentionally minimal. The lotus, date dial, calendar sheet,
// action editor, and cycle arithmetic are imported UNMODIFIED from ALMA:
// misskogut/Alma@694b83c46c7ffb7e52bbfa48e7888ab7fdf7e8e8
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import CycleHero from "../../../.alma-upstream/components/cycle-hero";
import { CycleSettingsSheet } from "../../../.alma-upstream/components/sheets";
import { addDays, buildDayModels, defaultProfile, TIMELINE_RADIUS, todayIso } from "../../../.alma-upstream/lib/alma";
import type { AlmaProfile } from "../../../.alma-upstream/lib/alma";

const KEY = "setka-alma-source-cycle-v1";
const LEGACY_KEY = "setka-cycle-lotus-lab-v1";

type Snapshot = {
  profile: AlmaProfile;
  events: Record<string, string[]>;
  configured: boolean;
};

function safeRead(): Snapshot | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const value = JSON.parse(raw) as Partial<Snapshot>;
      if (value.profile && typeof value.profile.lastPeriodStart === "string") {
        return {
          profile: { ...defaultProfile(todayIso()), ...value.profile },
          events: value.events && typeof value.events === "object" ? value.events : {},
          configured: !!value.configured,
        };
      }
    }
    // Import old TEST-PAGE input (latest recorded period); no data sent anywhere.
    const previous = JSON.parse(window.localStorage.getItem(LEGACY_KEY) || "null");
    const records = previous?.periods ?? previous?.records;
    if (Array.isArray(records) && records.length) {
      const last = records.filter((r: {start?: string}) => !!r?.start)
        .sort((a: {start: string}, b: {start: string}) => a.start.localeCompare(b.start)).at(-1);
      if (last && typeof last.start === "string") {
        const base = defaultProfile(todayIso());
        const length = Number(previous.cycleLength ?? previous.length);
        const periodLength = last.end
          ? Math.max(1, Math.min(10, Math.round((Date.parse(last.end) - Date.parse(last.start)) / 86400000) + 1))
          : base.periodLength;
        return {
          profile: {
            ...base,
            lastPeriodStart: last.start,
            periodLength,
            cycleLength: Number.isInteger(length) && length >= 15 && length <= 60 ? length : base.cycleLength,
          },
          events: {},
          configured: true,
        };
      }
    }
  } catch (_) {}
  return null;
}

const initialSnapshot = safeRead();

function CycleOnly() {
  const current = useMemo(() => todayIso(), []);
  const [profile, setProfile] = useState<AlmaProfile>(() => initialSnapshot?.profile ?? defaultProfile(current));
  const [events, setEvents] = useState<Record<string, string[]>>(() => initialSnapshot?.events ?? {});
  const [configured, setConfigured] = useState(() => initialSnapshot?.configured ?? false);
  const [activeIndex, setActiveIndex] = useState(TIMELINE_RADIUS);
  const [sheetOpen, setSheetOpen] = useState(false);

  const days = useMemo(() => buildDayModels(profile, {}, current), [profile, current]);
  const active = days[activeIndex] ?? days[TIMELINE_RADIUS];
  const selectedEvents = events[active.iso] ?? [];
  const actions = profile.cycleActions ?? ["Контрацептив", "Секс", "Мастурбация", "Тест на овуляцию"];
  const quick = (profile.cycleQuickAccessActions ?? ["Контрацептив", "Секс", "Тест на овуляцию"])
    .filter((label) => actions.includes(label));

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ profile, events, configured } satisfies Snapshot)); }
    catch (_) { /* Browsers with storage disabled can still inspect the component. */ }
  }, [profile, events, configured]);

  function toggleEvent(label: string) {
    setEvents((previous) => {
      const set = new Set(previous[active.iso] ?? []);
      if (set.has(label)) set.delete(label); else set.add(label);
      return { ...previous, [active.iso]: [...set] };
    });
  }

  function updateActions(next: string[], catalog?: string[]) {
    setProfile((old) => ({
      ...old, cycleActions: next,
      cycleActionCatalog: catalog ?? old.cycleActionCatalog,
      cycleQuickAccessActions: (old.cycleQuickAccessActions ?? []).filter((name) => next.includes(name)),
    }));
  }

  function updateQuick(next: string[]) {
    setProfile((old) => ({ ...old, cycleQuickAccessActions: next.slice(0, 5) }));
  }

  function saveProfile(next: AlmaProfile, focusIso?: string) {
    setConfigured(true);
    setProfile(next);
    if (focusIso) {
      const index = days.findIndex((day) => day.iso === focusIso);
      if (index >= 0) setActiveIndex(index);
    }
    setSheetOpen(false);
  }

  return <main className="app-stage">
    <div className="ambient-background" aria-hidden="true" />
    <div className="phone-scene">
      <header className="app-header">
        <div className="brand"><span className="brand-mark">S</span><div><strong>SETKA</strong><small>цикл · исходный модуль ALMA</small></div></div>
        <span className="sync-status status-local"><i />на устройстве</span>
      </header>

      {!configured && <div className="setka-demo-note">
        Демонстрационные даты ALMA. Отметь свою менструацию для личного расчёта.
      </div>}

      <CycleHero
        profile={profile}
        days={days}
        activeIndex={activeIndex}
        quickAccessLabels={quick}
        quickActionLabels={actions}
        selectedQuickActionLabels={selectedEvents}
        onToggleQuickAccess={toggleEvent}
        onUpdateQuickAccess={updateQuick}
        onSelectDay={setActiveIndex}
        onOpenPeriod={() => setSheetOpen(true)}
      />

      {sheetOpen && <CycleSettingsSheet
        profile={profile}
        activeIso={active.iso}
        selectedActionLabels={selectedEvents}
        onSave={saveProfile}
        onToggleQuickAction={(action) => toggleEvent(action.label)}
        onUpdateQuickActions={updateActions}
        onUpdateQuickAccess={updateQuick}
        onClose={() => setSheetOpen(false)}
      />}
    </div>
  </main>;
}

const root = document.getElementById("alma-cycle-root");
if (!root) throw new Error("Missing ALMA cycle root");
createRoot(root).render(<CycleOnly />);
