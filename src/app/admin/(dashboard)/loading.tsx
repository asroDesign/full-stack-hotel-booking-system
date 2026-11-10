export default function AdminLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-7 w-64" />
        <div className="skeleton h-3 w-80" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-cream-200 bg-white p-4">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton mt-3 h-6 w-24" />
            <div className="skeleton mt-2 h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="skeleton h-16 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
