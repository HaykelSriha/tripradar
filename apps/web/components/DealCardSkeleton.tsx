export function DealCardSkeleton() {
  return (
    <div className="rounded-3xl overflow-hidden glass border border-white/5">
      {/* Image area */}
      <div className="h-48 skeleton" />

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Route */}
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1 mr-4">
            <div className="h-5 skeleton rounded-lg w-3/4" />
            <div className="h-3 skeleton rounded-lg w-1/2" />
          </div>
          <div className="w-14 h-14 skeleton rounded-full" />
        </div>

        {/* Price */}
        <div className="flex items-end gap-3">
          <div className="h-10 skeleton rounded-lg w-24" />
          <div className="h-4 skeleton rounded-lg w-16" />
        </div>

        {/* Dates */}
        <div className="h-3 skeleton rounded-lg w-2/3" />

        {/* CTA */}
        <div className="h-11 skeleton rounded-2xl w-full" />
      </div>
    </div>
  );
}
