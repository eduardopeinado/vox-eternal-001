import React from "react";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
  subtitle?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  icon,
  color = "bg-indigo-500",
  subtitle,
}) => (
  <div className="flex flex-col items-center justify-center p-4 rounded-xl shadow border bg-white min-w-[160px] min-h-[120px]">
    <div className={`w-10 h-10 flex items-center justify-center rounded-full mb-2 ${color} text-white`}>
      {icon}
    </div>
    <div className="text-3xl font-bold mb-1">{value}</div>
    <div className="text-sm font-semibold text-gray-700">{title}</div>
    {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
  </div>
);
