export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-6 pb-20 pt-36">
      <div className="skeleton mx-auto h-10 w-64 rounded-xl" />
      <div className="skeleton mx-auto mt-4 h-4 w-96 max-w-full rounded-lg" />
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-3xl bg-white">
            <div className="skeleton aspect-[4/3]" />
            <div className="space-y-3 p-5">
              <div className="skeleton h-5 w-2/3 rounded" />
              <div className="skeleton h-4 w-full rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
