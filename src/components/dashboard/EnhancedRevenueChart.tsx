import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, Area, AreaChart } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, LineChart as LineChartIcon, TrendingUp, DollarSign } from "lucide-react";

interface RevenueData {
  month: string;
  monthName: string;
  revenue: number;
  count: number;
}

interface EnhancedRevenueChartProps {
  title?: string;
}

const chartConfig = {
  revenue: {
    label: "Revenus",
    color: "hsl(var(--primary))",
  },
};

export function EnhancedRevenueChart({ title = "Revenus mensuels" }: EnhancedRevenueChartProps) {
  const [data, setData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalPayments, setTotalPayments] = useState(0);

  useEffect(() => {
    fetchRevenueData();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('revenue-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'payments' },
        () => {
          fetchRevenueData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      
      const currentYear = new Date().getFullYear();
      const startOfYear = new Date(currentYear, 0, 1);
      const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

      const { data: payments, error } = await supabase
        .from('payments')
        .select('amount, created_at, status')
        .eq('status', 'paid')
        .gte('created_at', startOfYear.toISOString())
        .lte('created_at', endOfYear.toISOString());

      if (error) throw error;

      // Generate all 12 months
      const monthNames = [
        'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
        'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'
      ];

      const monthlyData: RevenueData[] = [];
      
      for (let i = 0; i < 12; i++) {
        const monthPayments = payments?.filter(payment => {
          const paymentMonth = new Date(payment.created_at).getMonth();
          return paymentMonth === i;
        }) || [];

        const monthRevenue = monthPayments.reduce((sum, payment) => sum + payment.amount, 0);
        
        monthlyData.push({
          month: (i + 1).toString().padStart(2, '0'),
          monthName: monthNames[i],
          revenue: monthRevenue,
          count: monthPayments.length
        });
      }

      setData(monthlyData);
      
      // Calculate totals
      const total = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      setTotalRevenue(total);
      setTotalPayments(payments?.length || 0);
      
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getGrowthRate = () => {
    if (data.length < 2) return 0;
    
    const currentMonth = new Date().getMonth();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    
    const currentRevenue = data[currentMonth]?.revenue || 0;
    const lastRevenue = data[lastMonth]?.revenue || 0;
    
    if (lastRevenue === 0) return 0;
    
    return Math.round(((currentRevenue - lastRevenue) / lastRevenue) * 100);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {title}
            </CardTitle>
            <div className="flex items-center gap-4 mt-2">
              <div className="text-sm text-muted-foreground">
                Total: {formatCurrency(totalRevenue)}
              </div>
              <div className="text-sm text-muted-foreground">
                {totalPayments} paiements
              </div>
              <Badge variant={getGrowthRate() >= 0 ? "default" : "destructive"} className="text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                {getGrowthRate() >= 0 ? '+' : ''}{getGrowthRate()}% vs mois dernier
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={chartType === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('bar')}
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              Barres
            </Button>
            <Button
              variant={chartType === 'line' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('line')}
            >
              <LineChartIcon className="h-4 w-4 mr-1" />
              Ligne
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height={400}>
              {chartType === 'bar' ? (
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis 
                    dataKey="monthName" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent 
                      formatter={(value, name) => [
                        formatCurrency(value as number),
                        'Revenus'
                      ]}
                      labelFormatter={(label) => `${label} ${new Date().getFullYear()}`}
                    />}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="var(--color-revenue)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              ) : (
                <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis 
                    dataKey="monthName" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent 
                      formatter={(value, name) => [
                        formatCurrency(value as number),
                        'Revenus'
                      ]}
                      labelFormatter={(label) => `${label} ${new Date().getFullYear()}`}
                    />}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--color-revenue)"
                    strokeWidth={3}
                    dot={{ fill: "var(--color-revenue)", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: "var(--color-revenue)", strokeWidth: 2 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}