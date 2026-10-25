"use client";

import type { ReactNode } from "react";
import { X, type LucideIcon } from "lucide-react";
import { useOsiris } from "@/lib/store";
import type { ToolId } from "@/lib/types";

export default function Panel({
  tool,
  title,
  subtitle,
  icon: Icon,
  children,
  actions,
  tabs,
}: {
  tool: ToolId;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  children: ReactNode;
  actions?: ReactNode;
  tabs?: { id: string; label: string; active: boolean; onClick: () => void }[];
}) {
  const setTool = useOsiris((s) => s.setTool);

  return (
    <section className="panel" aria-label={title}>
      <div className="panel-head">
        <span className="panel-icon">
          <Icon size={15} strokeWidth={1.7} />
        </span>
        <div className="panel-title">
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        {actions}
        <button className="panel-close" onClick={() => setTool(null)} aria-label={`Close ${tool}`}>
          <X size={14} />
        </button>
      </div>

      {tabs && tabs.length > 0 && (
        <div className="panel-tabs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`panel-tab ${t.active ? "active" : ""}`}
              onClick={t.onClick}
              role="tab"
              aria-selected={t.active}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="panel-body">{children}</div>
    </section>
  );
}

export function Loading({ label = "Acquiring feed" }: { label?: string }) {
  return (
    <div className="loading-inline">
      <span className="spinner" /> {label}
    </div>
  );
}

export function Empty({ label = "No data" }: { label?: string }) {
  return <div className="empty">{label}</div>;
}
