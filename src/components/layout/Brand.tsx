export default function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-brand text-lg font-bold text-primary-foreground">
        द
      </div>
      <div className="leading-tight">
        <div className="font-brand text-[20px] font-bold">Devanagari</div>
        <div className="font-brand text-sm text-muted-foreground">Prakashan</div>
      </div>
    </div>
  );
}
