export default function Loading() {
  return (
    <div>
      <div className="skeleton h-8 w-48 rounded-lg" />
      <div className="skeleton mt-2 h-4 w-72 rounded" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
      </div>
      <div className="mt-6 space-y-3 rounded-2xl bg-white p-4">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
      </div>
    </div>
  );
}
