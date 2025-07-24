import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface ClassData {
  name: string;
  value: number;
  color: string;
}

interface ClassDistributionChartProps {
  data: ClassData[];
  title?: string;
}

const chartConfig = {
  beginner: {
    label: "Débutant",
    color: "hsl(var(--chart-1))",
  },
  intermediate: {
    label: "Intermédiaire", 
    color: "hsl(var(--chart-2))",
  },
  advanced: {
    label: "Avancé",
    color: "hsl(var(--chart-3))",
  },
};

export function ClassDistributionChart({ data, title = "Répartition des cours" }: ClassDistributionChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
        <div className="flex justify-center space-x-4 mt-4">
          {data.map((entry, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-muted-foreground">{entry.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}