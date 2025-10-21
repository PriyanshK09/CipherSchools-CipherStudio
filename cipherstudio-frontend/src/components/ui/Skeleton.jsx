import React from "react";

export const Skeleton = ({ className = "", style }) => (
  <div className={("skeleton rounded-md bg-slate-800/40 " + className).trim()} style={style} />
);

export const SkeletonText = ({ lines = 3, className = "" }) => (
  <div className={("space-y-2 " + className).trim()}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className={"h-3 w-full " + (i === lines - 1 ? "w-2/3" : "")} />
    ))}
  </div>
);

export const SkeletonAvatar = ({ size = 32, className = "" }) => (
  <div className={("skeleton rounded-full bg-slate-800/40 " + className).trim()} style={{ width: size, height: size }} />
);

export const ProjectCardSkeleton = () => (
  <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-4">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <Skeleton className="mb-2 h-4 w-2/3" />
        <Skeleton className="mb-2 h-2 w-1/3" />
        <Skeleton className="h-2 w-1/5" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-16 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
    </div>
  </div>
);

export const IDESkeleton = ({ theme = "dark", fullscreen = false } = {}) => (
  <div className={(
    "ide-surface relative flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 " +
    (fullscreen ? "h-screen " : "h-[calc(100vh-4rem)] ") +
    (theme === "light" ? "theme-light " : "")
  ).trim()}>
    <header className="flex items-center justify-between gap-6 border-b border-slate-800/60 bg-slate-950/80 px-6 py-3 backdrop-blur-sm">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton className="h-2 w-24" />
        <Skeleton className="h-9 w-80" />
      </div>
      <div className="flex flex-none items-center gap-3">
        <Skeleton className="h-9 w-32 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
    </header>
    <div className="flex h-full overflow-hidden pb-12">
      <div className="flex w-[52px] flex-col items-center gap-3 border-r border-slate-800/60 bg-slate-950/70 p-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-8 rounded-md" />
        ))}
      </div>
      <div className="w-72 border-r border-slate-800/60 p-3">
        <Skeleton className="mb-3 h-9 w-full" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="mb-2 h-5 w-full" />
        ))}
      </div>
      <div className="flex-1 p-3">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
      <div className="w-[420px] border-l border-slate-800/60 p-3">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    </div>
    <div className="absolute inset-x-0 bottom-0 border-t border-slate-800/60 bg-slate-950/80 p-2">
      <Skeleton className="h-6 w-full" />
    </div>
  </div>
);

export default Skeleton;
