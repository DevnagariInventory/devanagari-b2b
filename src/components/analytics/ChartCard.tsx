export default function ChartCard({
  title,
  height = 250,
  empty,
  children,
}: {
  title: string;
  height?: number;
  empty?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4" style={{ height }}>
        {empty ? (
          <div className="flex h-full items-center justify-center text-base text-muted-foreground">
            No data for this period
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
