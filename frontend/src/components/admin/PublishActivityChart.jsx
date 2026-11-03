// frontend/src/components/admin/PublishActivityChart.jsx
//
// Monthly Publish Activity widget (PRD §2.1 — Dashboard widgets).
// Renders a strict monochrome bar chart via Chart.js / react-chartjs-2:
// pure Black bars, Grey gridlines, Black/White tooltip — no accent colour
// anywhere, per the UI/UX brief's Black & White constraint.
//
// This is a "dumb" presentational component: Dashboard.jsx owns fetching,
// loading, and error states, and only renders this once data has arrived.
//
// Expected data shape (assumed contract — settingsController.js /
// adminPostController.js have not been built yet, so this should be
// reconciled against the real endpoint once it exists):
//   data = [{ month: "2026-01", count: 12 }, { month: "2026-02", count: 7 }, ...]

import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

// ── Design tokens (mirrors globals.css custom properties) ──────────────────
const INK_PRIMARY = "#000000";
const INK_MUTED = "#666666";
const SURFACE_MID = "#F0F0F0";
const SURFACE_LIGHT = "#FFFFFF";

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "short" });

/** "2026-01" -> "Jan" */
function formatMonthLabel(isoMonth) {
  const [year, month] = isoMonth.split("-").map(Number);
  if (!year || !month) return isoMonth;
  return MONTH_LABEL_FORMATTER.format(new Date(year, month - 1, 1));
}

export default function PublishActivityChart({ data }) {
  const hasData = Array.isArray(data) && data.length > 0;

  const chartData = useMemo(() => {
    if (!hasData) return null;
    return {
      labels: data.map((d) => formatMonthLabel(d.month)),
      datasets: [
        {
          label: "Posts published",
          data: data.map((d) => d.count),
          backgroundColor: INK_PRIMARY,
          hoverBackgroundColor: INK_MUTED,
          borderRadius: 2, // matches --radius-sm
          maxBarThickness: 28,
        },
      ],
    };
  }, [data, hasData]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 }, // matches --duration-normal
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: INK_PRIMARY,
          titleColor: SURFACE_LIGHT,
          bodyColor: SURFACE_LIGHT,
          borderColor: INK_PRIMARY,
          borderWidth: 0,
          padding: 10,
          cornerRadius: 2,
          displayColors: false,
          titleFont: { family: "Lato, Inter, sans-serif", weight: "600", size: 12 },
          bodyFont: { family: "Lato, Inter, sans-serif", size: 12 },
          callbacks: {
            label: (ctx) => `${ctx.parsed.y} ${ctx.parsed.y === 1 ? "post" : "posts"}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: SURFACE_MID },
          ticks: {
            color: INK_MUTED,
            font: { family: "Lato, Inter, sans-serif", size: 11 },
          },
        },
        y: {
          beginAtZero: true,
          grid: { color: SURFACE_MID },
          border: { display: false },
          ticks: {
            precision: 0,
            color: INK_MUTED,
            font: { family: "Lato, Inter, sans-serif", size: 11 },
          },
        },
      },
    }),
    []
  );

  if (!hasData) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center">
        <p className="font-sans text-sm text-[#777777]">
          No publishing activity yet.
        </p>
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={`Monthly publish activity: ${data
        .map((d) => `${formatMonthLabel(d.month)} ${d.count}`)
        .join(", ")}`}
      className="h-64"
    >
      <Bar data={chartData} options={options} />
    </div>
  );
}

