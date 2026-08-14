export default function WorkspaceLoading() {
  return (
    <div
      className="animate-pulse p-4 sm:p-6 lg:p-8"
      aria-label="Carregando conteúdo"
    >
      <div className="h-3 w-28 rounded bg-gray-200" />
      <div className="mt-3 h-8 w-64 rounded bg-gray-200" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-32 rounded-xl border border-gray-200 bg-white"
          />
        ))}
      </div>
      <div className="mt-5 h-80 rounded-xl border border-gray-200 bg-white" />
    </div>
  );
}
