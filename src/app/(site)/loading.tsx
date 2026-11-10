export default function SiteLoading() {
  return (
    <div className="container-x space-y-6 py-16">
      <div className="skeleton h-72 w-full rounded-[2rem]" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="glass space-y-3 rounded-3xl p-4">
            <div className="skeleton aspect-[4/3] w-full" />
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-1/2" />
            <div className="skeleton h-9 w-full rounded-xl" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="skeleton h-56 w-full" />
        <div className="skeleton h-56 w-full" />
      </div>
    </div>
  );
}
