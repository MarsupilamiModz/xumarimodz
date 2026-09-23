export function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-50 h-header border-b border-line bg-canvas" aria-hidden>
      <div className="page-container flex h-full items-center gap-6">
        <div className="h-7 w-32 animate-pulse rounded-md bg-elevated" />
        <div className="hidden gap-5 md:flex">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 w-14 animate-pulse rounded bg-elevated" />
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <div className="h-10 w-10 animate-pulse rounded-md bg-elevated" />
          <div className="h-9 w-24 animate-pulse rounded-md bg-elevated" />
        </div>
      </div>
    </header>
  );
}
