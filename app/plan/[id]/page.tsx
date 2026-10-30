"use client";

import { SearchX } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PlanDashboard from "@/components/plan/PlanDashboard";
import { useToast } from "@/components/Toast";
import { deletePlan, getPlan, savePlan, type SavedPlan } from "@/lib/store";

export default function PlanPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  // undefined = still loading (storage is only readable in the browser), null = not found
  const [saved, setSaved] = useState<SavedPlan | null | undefined>(undefined);

  useEffect(() => {
    setSaved(getPlan(id) ?? null);
  }, [id]);

  useEffect(() => {
    if (saved) document.title = `${saved.plan.title} · UtsavAI`;
  }, [saved]);

  if (saved === undefined) {
    return (
      <div className="page container">
        <div className="skeleton" style={{ height: 56, width: "50%", marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 110, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 360 }} />
      </div>
    );
  }

  if (saved === null) {
    return (
      <div className="page container">
        <div className="card empty">
          <div className="big" aria-hidden="true"><SearchX size={40} strokeWidth={1.5} /></div>
          <h2>Plan not found</h2>
          <p className="muted">Plans are saved in the browser they were made in. This one isn&apos;t in this browser.</p>
          <div className="row" style={{ justifyContent: "center", marginTop: 16 }}>
            <Link href="/plans" className="btn">My plans</Link>
            <Link href="/plan/new" className="btn btn-primary">Create a plan</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page container">
      <nav className="small faint no-print" aria-label="Breadcrumb" style={{ marginBottom: 16 }}>
        <Link href="/plans" className="nav-link" style={{ padding: 0 }}>My plans</Link> / <span>{saved.plan.title}</span>
      </nav>
      <PlanDashboard
        saved={saved}
        inviteHref={`/plan/${saved.id}/invite`}
        editHref={`/plan/new?edit=${saved.id}`}
        onChange={(next) => {
          setSaved(next);
          if (!savePlan(next)) toast("Couldn't save changes in this browser.", "error");
        }}
        onDelete={() => {
          if (!window.confirm(`Delete "${saved.plan.title}"? This can't be undone.`)) return;
          deletePlan(saved.id);
          toast("Plan deleted.", "success");
          router.push("/plans");
        }}
      />
    </div>
  );
}
