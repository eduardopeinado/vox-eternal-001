import React from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface SubscriptionStatusBarProps {
  data: { status: string; count: number }[];
}

export const SubscriptionStatusBar: React.FC<SubscriptionStatusBarProps> = ({ data }) => {
  const labels = data.map((s) => s.status);
  const counts = data.map((s) => s.count);

  return (
    <div className="p-4 border rounded-xl shadow bg-white flex flex-col items-center">
      <h3 className="font-semibold mb-2">Estado de Suscripciones</h3>
      <div className="w-full max-w-lg">
        <Bar
          data={{
            labels,
            datasets: [
              {
                label: "Cantidad",
                data: counts,
                backgroundColor: "#4F46E5",
                borderRadius: 8,
                maxBarThickness: 40,
              },
            ],
          }}
          options={{
            responsive: true,
            plugins: {
              legend: { display: false },
              tooltip: { enabled: true },
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { font: { size: 14 } },
              },
              y: {
                beginAtZero: true,
                grid: { color: "#E5E7EB" },
                ticks: { font: { size: 14 } },
              },
            },
            maintainAspectRatio: false,
          }}
        />
      </div>
    </div>
  );
};
