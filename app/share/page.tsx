"use client";

import { Link2, Link2Off } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PlanDashboard from "@/components/plan/PlanDashboard";
import { useToast } from "@/components/Toast";
import { decodeShare } from "@/lib/share";
import { newId, savePlan, type SavedPlan } from "@/lib/store";

/** Opens a plan from a share link (/share#p=…). The plan lives in the URL fragment, which never reaches the server. */
export default function SharePage() {
  const router = useRouter();
  const toast = useToast();
  const [saved, setSaved] = useState<SavedPlan | null | undefined>(undefined);

  useEffect(() => {
    const m = location.hash.match(/^#p=(.+)$/);
    const shared = m ? decodeShare(m[1]) : null;
    setSaved(
      shared
        ? {
            id: newId(),
            input: shared.input,
            plan: shared.plan,
            source: "shared",
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
        : null,
    );
  }, []);

  if (saved === undefined)
    return (
      <div className="page container">
        <div className="skeleton" style={{ height: 400 }} />
      </div>
    );

  if (saved === null) {
    return (
      <div className="page container">
        <div className="card empty">
          <div className="big" aria-hidden="true">
            <Link2Off size={40} strokeWidth={1.5} />
          </div>
          <h2>This share link doesn&apos;t work</h2>
          <p className="muted">
            It may have been cut off when it was copied. Ask for the link again, or create your own plan.
          </p>
          <Link href="/plan/new" className="btn btn-primary mt-12">
            Create a plan
          </Link>
        </div>
      </div>
    );
  }

  const saveCopy = () => {
    if (!savePlan(saved)) return toast("Couldn't save in this browser.", "error");
    toast("Saved to My plans.", "success");
    router.push(`/plan/${saved.id}`);
  };

  return (
    <div className="page container">
      <PlanDashboard
        saved={saved}
        onChange={setSaved}
        banner={
          <div className="alert alert-warn no-print" style={{ marginBottom: 24, alignItems: "center" }}>
            <Link2 className="flex-none" size={20} aria-hidden="true" />
            <span style={{ flex: 1 }}>
              You&apos;re viewing a shared plan. Changes aren&apos;t kept until you save a copy.
            </span>
            <button type="button" className="btn btn-sm btn-primary" onClick={saveCopy}>
              Save to my plans
            </button>
          </div>
        }
      />
    </div>
  );
}
