import {
  familyStatement,
  statementCSV,
  StatementRow,
} from "../utils/familyStatement";
export default function FamilyStatement({
  rows,
  start,
  end,
  name,
  currency,
}: {
  rows: StatementRow[];
  start: string;
  end: string;
  name: string;
  currency: string;
}) {
  const statement = familyStatement(rows, start, end),
    money = (minor: number) => (minor / 100).toFixed(2);
  return (
    <details className="family-panel family-statement">
      <summary className="cursor-pointer font-bold py-2">
        كشف حساب دفتر العائلة
      </summary>
      <p className="text-xs my-2">
        {name} · {start} إلى ما قبل {end} · {currency}
      </p>
      <div className="flex gap-2 my-2">
        <button
          type="button"
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob([statementCSV(statement, currency)], {
                type: "text/csv;charset=utf-8",
              }),
            );
            const link = document.createElement("a");
            link.href = url;
            link.download = `family-statement-${start}.csv`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          تنزيل CSV
        </button>
        <button
          type="button"
          onClick={() => {
            document.body.classList.add("family-print");
            window.addEventListener(
              "afterprint",
              () => document.body.classList.remove("family-print"),
              { once: true },
            );
            window.print();
          }}
        >
          طباعة / PDF
        </button>
      </div>
      {rows.some((row) => row.pending) && (
        <p>
          يتضمن الكشف مسودات محلية بانتظار المزامنة؛ ليس تأكيدًا بحفظها على
          السيرفر.
        </p>
      )}
      <p>
        رصيد افتتاحي: {money(statement.opening)} · وارد:{" "}
        {money(statement.income)} · مصروف: {money(statement.expense)} · رصيد
        ختامي: {money(statement.closing)}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              {[
                "التاريخ",
                "الوصف / التصنيف",
                "العضو",
                "الوارد",
                "المصروف",
                "الرصيد",
              ].map((label) => (
                <th key={label} className="p-2">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {statement.lines.map((row) => (
              <tr key={row.id}>
                <td className="p-2 whitespace-nowrap">{row.date}</td>
                <td>{row.note || row.category || row.source}</td>
                <td>{row.creatorName}</td>
                <td>{row.type === "income" ? money(row.amountMinor) : "—"}</td>
                <td>{row.type === "expense" ? money(row.amountMinor) : "—"}</td>
                <td>{money(row.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
