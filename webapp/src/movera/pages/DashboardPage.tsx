import { useState } from "react";
import {
  DASHBOARD_ALERTS,
  DASHBOARD_STATS,
  DEMAND_POINTS,
  FARE_CATEGORIES,
  QUICK_ACTIONS,
  SUPPLY_POINTS,
  TOTAL_TRIPS,
  ZONE_VOLUMES,
  calculateFare,
  catalogFor,
  formatUsd,
  type FareCategoryId,
} from "../data/catalog";
import { PageHeading } from "../ui/PageHeading";
import { StatsGrid } from "../ui/StatsGrid";
import { ZoneSelect } from "../ui/ZoneSelect";

const CHART_RANGES = ["Day", "Week", "Month"] as const;

export function DashboardPage() {
  const page = catalogFor("dashboard");
  const [category, setCategory] = useState<FareCategoryId>("economy");
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [fare, setFare] = useState("$0.00");
  const [chartRange, setChartRange] = useState<(typeof CHART_RANGES)[number]>("Day");

  function onCalculate() {
    const total = calculateFare(
      category,
      Number(distance) || 0,
      Number(duration) || 0,
    );
    setFare(formatUsd(total));
  }

  return (
    <>
      <PageHeading title={page.title} subtitle={page.subtitle}>
        <ZoneSelect />
      </PageHeading>

      <section className="panel fare-panel">
        <div className="panel-title-row">
          <div>
            <h3>Fare Estimation Tool</h3>
            <p>Estimate a ride fare using zone, category, distance and duration.</p>
          </div>
        </div>
        <div className="fare-grid">
          <label>
            Zone
            <ZoneSelect includeAll={false} compact={false} id="fareZone" />
          </label>
          <label>
            Vehicle Category
            <select
              id="fareCategory"
              value={category}
              onChange={(event) => setCategory(event.target.value as FareCategoryId)}
            >
              {FARE_CATEGORIES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Distance (km)
            <input
              type="number"
              id="fareDistance"
              min={0}
              step={0.1}
              placeholder="0"
              value={distance}
              onChange={(event) => setDistance(event.target.value)}
            />
          </label>
          <label>
            Duration (min)
            <input
              type="number"
              id="fareDuration"
              min={0}
              step={1}
              placeholder="0"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            />
          </label>
          <button className="primary-btn fare-button" id="calcFare" type="button" onClick={onCalculate}>
            Calculate Fare
          </button>
          <div className="fare-result" id="fareResult">
            {fare}
          </div>
        </div>
      </section>

      <StatsGrid variant="dashboard" stats={DASHBOARD_STATS} />

      <section className="dashboard-grid">
        <article className="panel chart-panel">
          <div className="panel-title-row">
            <h3>Demand vs Supply</h3>
            <div className="segmented">
              {CHART_RANGES.map((range) => (
                <button
                  key={range}
                  type="button"
                  className={range === chartRange ? "active" : undefined}
                  onClick={() => setChartRange(range)}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <div className="fake-chart">
            <div className="chart-grid-lines" />
            <svg viewBox="0 0 800 260" preserveAspectRatio="none" aria-label="Demand versus supply chart">
              <polyline className="line demand" points={DEMAND_POINTS} />
              <polyline className="line supply" points={SUPPLY_POINTS} />
            </svg>
            <div className="chart-legend">
              <span>
                <i className="dot demand-dot" />
                Demand
              </span>
              <span>
                <i className="dot supply-dot" />
                Supply
              </span>
            </div>
          </div>
        </article>

        <article className="panel zone-volume">
          <div className="panel-title-row">
            <h3>Trip Volume by Zone</h3>
          </div>
          <div className="donut-wrap">
            <div className="donut">
              <div>
                {TOTAL_TRIPS}
                <small>Trips</small>
              </div>
            </div>
            <div className="legend-list">
              {ZONE_VOLUMES.map((zone) => (
                <div key={zone.name}>
                  <span>
                    <i className={`legend-color ${zone.swatch}`} />
                    {zone.name}
                  </span>
                  <b>{zone.count}</b>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="dashboard-grid lower">
        <article className="panel alerts">
          <div className="panel-title-row">
            <h3>System Alerts</h3>
            <button className="text-btn" type="button">
              View All
            </button>
          </div>
          {DASHBOARD_ALERTS.map((alert) => (
            <div className={`alert-row ${alert.tone}`} key={alert.title}>
              <div className="alert-icon">{alert.icon}</div>
              <div className="grow">
                <strong>{alert.title}</strong>
                <p>{alert.body}</p>
                <small>{alert.time}</small>
              </div>
              <button className="small-btn" type="button">
                {alert.action}
              </button>
            </div>
          ))}
        </article>
        <article className="panel quick-actions">
          <div className="panel-title-row">
            <h3>Quick Actions</h3>
          </div>
          <div className="quick-grid">
            {QUICK_ACTIONS.map((action) => (
              <button key={action.label} type="button">
                <span>{action.icon}</span>
                {action.label}
              </button>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
