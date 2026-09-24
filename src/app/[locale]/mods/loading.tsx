import { ModGridSkeleton } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="page-container py-12 space-y-8">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-5 w-72" />
      <ModGridSkeleton />
    </div>
  );
}
