"use client";

import { Suspense, useEffect, useMemo, useState, useCallback } from "react";
import RequireAuth from "@/components/RequireAuth";
import { fetchWithRefresh } from "@/app/lib/fetchWithRefresh";

/** ---- Types (align loosely with your backend) ---- */
type SessionResponse =
  | { authenticated: true; user: { id: number | string; email?: string; is_staff?: boolean } }
  | { authenticated: false }
  | null;

type Report = {
  id: number;
  target_type: "poll" | "comment" | string;
  target_id: number;
  reason?: string | null;
  reporter_email?: string | null;
  created_at: string;
};

/** ---- Small helpers ---- */
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-3 py-2"><div className="h-4 w-10 rounded bg-white/10" /></td>
      <td className="px-3 py-2"><div className="h-4 w-24 rounded bg-white/10" /></td>
      <td className="px-3 py-2"><div className="h-4 w-40 rounded bg-white/10" /></td>
      <td className="px-3 py-2"><div className="h-4 w-32 rounded bg-white/10" /></td>
      <td className="px-3 py-2"><div className="h-8 w-48 rounded bg-white/10" /></td>
    </tr>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10 disabled:opacity-50"
    >
      {label}
    </button>
  );
}

function ModerationInner() {
  const [session, setSession] = useState<SessionResponse>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const [reports, setReports] = useState<Report[] | null>(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null); // report id currently acting upon

  const isStaff = useMemo(() => {
    if (!session || !("authenticated" in session) || !session.authenticated) return false;
    return Boolean((session.user as any)?.is_staff);
  }, [session]);

  // Load session
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingSession(true);
      try {
        const res = await fetchWithRefresh("/api/auth/session", {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) {
          setSession({ authenticated: false });
        } else {
          const data = (await res.json()) as any;
          if ("authenticated" in (data ?? {})) {
            setSession(data as SessionResponse);
          } else {
            setSession(data?.user ? { authenticated: true, user: data.user } : { authenticated: false });
          }
        }
      } catch {
        setSession({ authenticated: false });
      } finally {
        if (!cancelled) setLoadingSession(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load reports (only if staff)
  useEffect(() => {
    if (!isStaff) {
      setReports(null);
      setLoadingReports(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingReports(true);
      setErr(null);
      try {
        const res = await fetchWithRefresh("/api/moderation/reports", {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(t || `HTTP ${res.status}`);
        }
        const json = (await res.json()) as Report[];
        if (!cancelled) setReports(Array.isArray(json) ? json : []);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Не удалось загрузить жалобы");
      } finally {
        if (!cancelled) setLoadingReports(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isStaff]);

  const act = useCallback(
    async (pollId: number, action: "hide" | "unhide" | "freeze" | "unfreeze", reportId?: number) => {
      try {
        if (reportId) setBusy(reportId);
        const res = await fetchWithRefresh(`/api/moderation/polls/${pollId}/action`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ action }),
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          window.alert(`Ошибка: ${t || res.status}`);
          return;
        }
        window.alert("OK");
        const r = await fetchWithRefresh("/api/moderation/reports", {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (r.ok) {
          const json = (await r.json()) as Report[];
          setReports(Array.isArray(json) ? json : []);
        }
      } catch {
        window.alert("Ошибка сети");
      } finally {
        setBusy(null);
      }
    },
    []
  );

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-10 pt-6">
      <h1 className="text-xl font-semibold">Модерация</h1>

      {loadingSession ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm opacity-80">
          Проверяем доступ…
        </div>
      ) : !isStaff ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
          Нет доступа
        </div>
      ) : (
        <>
          {err && (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {err}
            </div>
          )}

          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">ID</th>
                  <th className="px-3 py-2 text-left font-medium">Target</th>
                  <th className="px-3 py-2 text-left font-medium">Reason</th>
                  <th className="px-3 py-2 text-left font-medium">Reporter</th>
                  <th className="px-3 py-2 text-left font-medium">Created</th>
                  <th className="px-3 py-2 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingReports ? (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                ) : (reports ?? []).length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-center opacity-70" colSpan={6}>
                      Жалоб нет
                    </td>
                  </tr>
                ) : (
                  (reports ?? []).map((r) => {
                    const isPoll = r.target_type === "poll";
                    const targetLabel = `${r.target_type}#${r.target_id}`;
                    const created =
                      new Date(r.created_at).toLocaleString?.() ?? r.created_at;

                    return (
                      <tr key={r.id} className="border-t border-white/10">
                        <td className="px-3 py-2 align-top">{r.id}</td>
                        <td className="px-3 py-2 align-top">{targetLabel}</td>
                        <td className="px-3 py-2 align-top">{r.reason ?? "—"}</td>
                        <td className="px-3 py-2 align-top">{r.reporter_email ?? "—"}</td>
                        <td className="px-3 py-2 align-top whitespace-nowrap">{created}</td>
                        <td className="px-3 py-2 align-top">
                          <div className="flex flex-wrap gap-2">
                            <ActionButton
                              label="Hide"
                              disabled={!isPoll || busy === r.id}
                              onClick={() => act(r.target_id, "hide", r.id)}
                            />
                            <ActionButton
                              label="Unhide"
                              disabled={!isPoll || busy === r.id}
                              onClick={() => act(r.target_id, "unhide", r.id)}
                            />
                            <ActionButton
                              label="Freeze"
                              disabled={!isPoll || busy === r.id}
                              onClick={() => act(r.target_id, "freeze", r.id)}
                            />
                            <ActionButton
                              label="Unfreeze"
                              disabled={!isPoll || busy === r.id}
                              onClick={() => act(r.target_id, "unfreeze", r.id)}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}

export default function ModerationPage() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-md px-4 pb-10 pt-6">Проверяем доступ…</main>}>
      <RequireAuth>
        <ModerationInner />
      </RequireAuth>
    </Suspense>
  );
}
