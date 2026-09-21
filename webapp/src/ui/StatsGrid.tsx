import type { DashboardStat, StatTuple } from "../data/catalog";

type MiniStatsProps = {
  variant?: "mini";
  stats: readonly StatTuple[];
};

type DashboardStatsProps = {
  variant: "dashboard";
  stats: readonly DashboardStat[];
};

type StatsGridProps = MiniStatsProps | DashboardStatsProps;

export function StatsGrid(props: StatsGridProps) {
  if (props.variant === "dashboard") {
    return (
      <section className="stats-grid">
        {props.stats.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <div className="stat-icon">{stat.icon}</div>
            <div>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <small className="up">{stat.trend}</small>
            </div>
          </article>
        ))}
      </section>
    );
  }

  return (
    <section className="generated-grid">
      {props.stats.map(([label, value]) => (
        <article className="mini-stat" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
      ))}
    </section>
  );
}
