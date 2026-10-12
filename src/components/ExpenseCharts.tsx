import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from "recharts";
export default function ExpenseCharts({
  pieChartData,
  dailyDataArray,
  currency,
  currentLocale,
}: {
  pieChartData: any[];
  dailyDataArray: any[];
  currency: string;
  currentLocale: string;
}) {
  return (
    <div className="space-y-4">
      {/* 1. Category distribution (Doughnut/Pie) */}
      <div className="bg-white rounded-2xl p-4 border border-[#e8dcc8] shadow-sm">
        <h3 className="text-xs font-black text-[#2c1f0e] mb-3">
          📂 توزيع المصروفات تبعا للأصناف والبنود
        </h3>

        {pieChartData.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#7a6a52]">
            لا توجد كشوف مصاريف مسجلة لإنشاء الدائرة التفصيلية
          </div>
        ) : (
          <div>
            <div className="h-44 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: any) => [
                      `${value} ${currency}`,
                      "المبلغ",
                    ]}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>

            {/* Manual legend representation inside Arabic */}
            <div className="flex flex-wrap gap-2.5 items-center justify-center mt-3">
              {pieChartData.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1.5 text-[9.5px] font-bold text-[#7a6a52]"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span>
                    {entry.name}: {entry.value.toLocaleString(currentLocale)}{" "}
                    {currency}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Daily Expenses list chart (Bar chart) */}
      <div className="bg-white rounded-2xl p-4 border border-[#e8dcc8] shadow-sm">
        <h3 className="text-xs font-black text-[#2c1f0e] mb-3">
          📈 تمثيل تدفق النفقات خلال أيام الشهر المالية
        </h3>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart
              data={dailyDataArray}
              margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
            >
              <XAxis
                dataKey="day"
                stroke="#b8a88a"
                fontSize={10}
                tickLine={false}
              />
              <YAxis stroke="#b8a88a" fontSize={10} tickLine={false} />
              <RechartsTooltip
                formatter={(value: any) => [
                  `${value} ${currency}`,
                  "المصروف اليومي",
                ]}
              />
              <Bar dataKey="المصروف" fill="#e67e22" radius={[4, 4, 0, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
