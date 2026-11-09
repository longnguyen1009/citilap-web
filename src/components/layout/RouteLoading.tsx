export default function RouteLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl animate-pulse px-4 py-6">
      <div className="mb-4 h-4 w-48 rounded bg-gray-200" />
      <div className="mb-6 h-8 w-2/3 rounded bg-gray-200" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-100 p-3">
            <div className="mb-3 aspect-square rounded bg-gray-200" />
            <div className="mb-2 h-4 rounded bg-gray-200" />
            <div className="h-4 w-1/2 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

