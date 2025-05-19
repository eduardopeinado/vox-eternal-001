import React from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

interface PlanDistributionPieProps {
  data: { plan: string; count: number }[];
}

const COLORS = [
  "#4F46E5",
  "#22D3EE",
  "#F59E42",
  "#F43F5E",
  "#10B981",
  "#6366F1",
  "#FBBF24",
  "#A21CAF",
];

export const PlanDistributionPie: React.FC<PlanDistributionPieProps> = ({ data }) => {
  const labels = data.map((p) => p.plan);
  const counts = data.map((p) => p.count);

  return (
    <div className="p-4 border rounded-xl shadow bg-white flex flex-col items-center">
      <h3 className="font-semibold mb-2">Distribución de Planes</h3>
      <div className="w-full max-w-xs">
        <Pie
          data={{
            labels,
            datasets: [
              {
                data: counts,
                backgroundColor: COLORS.slice(0, labels.length),
              },
            ],
          }}
          options={{
            plugins: {
              legend: {
                position: "bottom" as const,
                labels: { boxWidth: 18, font: { size: 14 } },
              },
            },
            maintainAspectRatio: false,
          }}
        />
      </div>
    </div>
  );
};
