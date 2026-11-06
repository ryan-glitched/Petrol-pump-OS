"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/format";

const pieColors = ["#16a34a", "#0284c7", "#f97316"];

export function RevenueTrendChart({ data }: { data: { date: string; revenue: number }[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="revenue" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#16a34a" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000000}M`} />
          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
          <Area type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={3} fill="url(#revenue)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ProductSalesChart({ data }: { data: { product: string; litres: number; color: string }[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="product" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <Tooltip />
          <Bar dataKey="litres" radius={[12, 12, 0, 0]}>
            {data.map((entry) => (
              <Cell fill={entry.color} key={entry.product} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PaymentMixChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={96} paddingAngle={4}>
            {data.map((entry, index) => (
              <Cell fill={pieColors[index % pieColors.length]} key={entry.name} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ForecastChart({ data }: { data: Array<Record<string, string | number>> }) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="day" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="hiSuper" fill="#16a34a" radius={[10, 10, 0, 0]} />
          <Bar dataKey="hobc" fill="#0284c7" radius={[10, 10, 0, 0]} />
          <Bar dataKey="diesel" fill="#f97316" radius={[10, 10, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
