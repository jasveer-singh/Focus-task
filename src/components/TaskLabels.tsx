"use client";

// Shared label pills shown on task cards across Today, Tasks, and Projects views.

export function InProgressLabel() {
  return (
    <span className="inline-flex items-center gap-1 rounded-pill bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[1px] text-amber-700">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      In progress
    </span>
  );
}

export function ProjectLabel({ title }: { title: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-pill border border-coral/30 px-2 py-0.5 text-[10px] font-medium text-coral/80">
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
        <rect x="0.5" y="1.5" width="7" height="5.5" rx="1" stroke="currentColor" strokeWidth="1"/>
        <path d="M2 1.5V1a.5.5 0 0 1 .5-.5h3A.5.5 0 0 1 6 1v.5" stroke="currentColor" strokeWidth="1"/>
      </svg>
      {title}
    </span>
  );
}
