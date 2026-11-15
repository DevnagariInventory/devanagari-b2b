export const formatINR = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatLongDate = (d: Date) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    }).formatToParts(d).map((x) => [x.type, x.value])
  );
  return `${p.weekday}, ${p.day} ${p.month} ${p.year}`;
};
