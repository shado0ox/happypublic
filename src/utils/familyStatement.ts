export type StatementRow = {
  id: string;
  date: string;
  type: "income" | "expense";
  amountMinor: number;
  category?: string;
  source?: string;
  note?: string;
  creatorName?: string;
  pending?: boolean;
};
export function familyStatement(
  rows: StatementRow[],
  start: string,
  end: string,
) {
  const ordered = [...rows].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  );
  const opening = ordered
    .filter((row) => row.date < start)
    .reduce(
      (sum, row) =>
        sum + (row.type === "income" ? row.amountMinor : -row.amountMinor),
      0,
    );
  let balance = opening,
    income = 0,
    expense = 0;
  const lines = ordered
    .filter((row) => row.date >= start && row.date < end)
    .map((row) => {
      if (row.type === "income") {
        income += row.amountMinor;
        balance += row.amountMinor;
      } else {
        expense += row.amountMinor;
        balance -= row.amountMinor;
      }
      return { ...row, balance };
    });
  return { opening, income, expense, closing: balance, lines };
}
export function statementCSV(
  rows: ReturnType<typeof familyStatement>,
  currency: string,
) {
  // Quote every cell and neutralize spreadsheet formulas in user-provided fields.
  const cell = (value: unknown) => {
    const raw=String(value ?? '');
    const safe=/^-?\d+(?:\.\d+)?$/.test(raw) ? raw : raw.replace(/^[\s]*[=+@\-\t\r]/, "'$&");
    return '"' + safe.replace(/"/g, '""') + '"';
  };
  const records: any[][] = [
    [
      "التاريخ",
      "الوصف",
      "التصنيف",
      "العضو",
      "الوارد",
      "المصروف",
      "الرصيد",
      "العملة",
      "الحالة",
    ],
    [
      "",
      "رصيد افتتاحي",
      "",
      "",
      "",
      "",
      (rows.opening / 100).toFixed(2),
      currency,
      "",
    ],
    ...rows.lines.map((row) => [
      row.date,
      row.note,
      row.category || row.source,
      row.creatorName,
      row.type === "income" ? (row.amountMinor / 100).toFixed(2) : "",
      row.type === "expense" ? (row.amountMinor / 100).toFixed(2) : "",
      (row.balance / 100).toFixed(2),
      currency,
      row.pending ? "بانتظار المزامنة" : "آخر نسخة من السيرفر",
    ]),
    [
      "",
      "رصيد ختامي",
      "",
      "",
      (rows.income / 100).toFixed(2),
      (rows.expense / 100).toFixed(2),
      (rows.closing / 100).toFixed(2),
      currency,
      "",
    ],
  ];
  return "\ufeff" + records.map((row) => row.map(cell).join(",")).join("\r\n");
}
