import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts";

interface AttendanceData {
  week: string;
  attendance: number;
}

interface AttendanceChartProps {
  data: AttendanceData[];
  title?: string;
}

const chartConfig = {
  attendance: {
    label: "Présence",
    color: "hsl(var(--primary))",
  },
};

export function AttendanceChart({ data, title = "Évolution de la présence" }: AttendanceChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <XAxis 
                dataKey="week" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                cursor={false}
              />
              <Line
                type="monotone"
                dataKey="attendance"
                stroke="var(--color-attendance)"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}