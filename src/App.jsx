import React, { useMemo, useRef, useState } from "react";
import Plot from "react-plotly.js";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";

/**
 * Dataset: SPD Crime Data: 2008-Present (Seattle Open Data)
 * API endpoint (SODA2): https://data.seattle.gov/resource/tazs-3rd5.json
 *
 * Notes:
 * - The full dataset is very large. This app loads a bounded time window (default: last 365 days)
 *   and paginates requests to stay within browser limits.
 * - You can widen the date window, but load time will increase.
 */

const API_BASE = "https://data.seattle.gov/resource/tazs-3rd5.json";

// Pagination: rows per API request (Socrata allows up to 50k; 5000 is a safe per-request size)
const PAGE_SIZE = 5000;
// Max total rows to fetch for one "Load data" (keeps browser responsive; increase if needed)
const MAX_TOTAL_ROWS = 50000;

// How many points to render on the map (sampled after filtering to keep the map responsive)
const MAP_MAX_POINTS = 2000;

function isoDateOnly(d){
  // YYYY-MM-DD
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function toTitle(s){
  if (!s) return "";
  return String(s).replaceAll("_"," ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function safeNum(x){
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function pickFirstExistingKey(obj, keys){
  for (const k of keys){
    if (k in obj) return k;
  }
  return null;
}

function withinSeattle([lat, lon]){
  // Loose bounding box to avoid plotting junk coordinates
  return lat > 47.45 && lat < 47.75 && lon > -122.45 && lon < -122.20;
}

async function fetchSoqlPage({ where, select, orderBy, limit, offset }){
  const params = new URLSearchParams();
  if (select) params.set("$select", select);
  if (where) params.set("$where", where);
  if (orderBy) params.set("$order", orderBy);
  params.set("$limit", String(limit));
  params.set("$offset", String(offset));

  const url = `${API_BASE}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok){
    const text = await res.text();
    throw new Error(`Socrata request failed (${res.status}): ${text.slice(0, 250)}`);
  }
  return res.json();
}

export default function App(){
  const today = useMemo(() => new Date(), []);
  const defaultEnd = useMemo(() => isoDateOnly(today), [today]);
  const defaultStart = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 365);
    return isoDateOnly(d);
  }, [today]);

  // Global filters (UI)
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [precinct, setPrecinct] = useState("ALL");
  const [crimeAgainst, setCrimeAgainst] = useState("ALL");

  // Cross-chart selection (interactivity)
  const [selectedOffenseGroup, setSelectedOffenseGroup] = useState(null);

  // Data (no auto-fetch: user clicks "Load data" to call the API)
  const [raw, setRaw] = useState([]);
  const [meta, setMeta] = useState({ loading: false, error: null, lastQuery: "" });

  // Cached key mapping once we see data
  const keyRef = useRef({
    dateKey: null,
    precinctKey: null,
    offenseGroupKey: null,
    crimeAgainstKey: null,
    latKey: null,
    lonKey: null,
    neighborhoodKey: null,
  });

  async function handleLoadData(){
    try{
      setMeta((m) => ({ ...m, loading: true, error: null }));

      const probeUrl = `${API_BASE}?$limit=1`;
      const probeRes = await fetch(probeUrl);
      const probe = await probeRes.json();
      const first = probe?.[0] || {};

      const dateKey = pickFirstExistingKey(first, [
        "report_date_time",
        "offense_date",
        "offense_start_datetime",
        "reported_date_time",
        "report_datetime",
        "report_date",
      ]);
      const precinctKey = pickFirstExistingKey(first, ["precinct", "precinct_name"]);
      const offenseGroupKey = pickFirstExistingKey(first, [
        "nibrs_group_a_b",
        "offense_parent_group",
        "offense_group",
        "offense_category",
        "offense_parent_group_name",
      ]);
      const crimeAgainstKey = pickFirstExistingKey(first, [
        "nibrs_crime_against_category",
        "crime_against_category",
        "crime_against",
      ]);
      const latKey = pickFirstExistingKey(first, ["latitude", "lat"]);
      const lonKey = pickFirstExistingKey(first, ["longitude", "lon", "long"]);
      const neighborhoodKey = pickFirstExistingKey(first, ["neighborhood", "neighborhood_name", "mcpp"]);

      keyRef.current = { dateKey, precinctKey, offenseGroupKey, crimeAgainstKey, latKey, lonKey, neighborhoodKey };

      if (!dateKey){
        throw new Error("Could not infer the dataset's date/time field from the API response.");
      }

      const startIso = `${startDate}T00:00:00.000`;
      const endIso = `${endDate}T23:59:59.999`;

      const where = `${dateKey} between '${startIso}' and '${endIso}'`;
      const orderBy = `${dateKey} ASC`;

      const select = [
        dateKey,
        precinctKey,
        offenseGroupKey,
        crimeAgainstKey,
        latKey,
        lonKey,
        neighborhoodKey,
      ].filter(Boolean).join(",");

      const allRows = [];
      let offset = 0;

      while (offset < MAX_TOTAL_ROWS) {
        const rows = await fetchSoqlPage({
          where,
          select,
          orderBy,
          limit: PAGE_SIZE,
          offset,
        });
        allRows.push(...rows);
        if (rows.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }

      const lastQuery = `${API_BASE} (date range: ${startDate}–${endDate}, fetched ${allRows.length.toLocaleString()} rows)`;
      const rows = allRows;

      setRaw(rows);
      setMeta({ loading: false, error: null, lastQuery });
    }catch(err){
      setMeta((m) => ({ ...m, loading: false, error: err?.message || String(err) }));
    }
  }

  const keys = keyRef.current;

  const cleaned = useMemo(() => {
    const { dateKey, precinctKey, offenseGroupKey, crimeAgainstKey, latKey, lonKey, neighborhoodKey } = keys;
    if (!raw?.length || !dateKey) return [];

    return raw.map((r) => {
      const dt = r[dateKey] ? new Date(r[dateKey]) : null;
      const lat = latKey ? safeNum(r[latKey]) : null;
      const lon = lonKey ? safeNum(r[lonKey]) : null;
      return {
        dt,
        dateOnly: dt ? isoDateOnly(dt) : null,
        precinct: precinctKey ? (r[precinctKey] || "Unknown") : "Unknown",
        offenseGroup: offenseGroupKey ? (r[offenseGroupKey] || "Unknown") : "Unknown",
        crimeAgainst: crimeAgainstKey ? (r[crimeAgainstKey] || "Unknown") : "Unknown",
        neighborhood: neighborhoodKey ? (r[neighborhoodKey] || "Unknown") : "Unknown",
        lat,
        lon,
        hasCoord: lat != null && lon != null && withinSeattle([lat, lon]),
      };
    }).filter((r) => r.dt);
  }, [raw, keys]);

  const precinctOptions = useMemo(() => {
    const s = new Set(cleaned.map((d) => d.precinct).filter(Boolean));
    return ["ALL", ...Array.from(s).sort()];
  }, [cleaned]);

  const crimeAgainstOptions = useMemo(() => {
    const s = new Set(cleaned.map((d) => d.crimeAgainst).filter(Boolean));
    return ["ALL", ...Array.from(s).sort()];
  }, [cleaned]);

  const filtered = useMemo(() => {
    let d = cleaned;

    // Client-side date filter so changing date range updates all vis without a new API call
    d = d.filter((x) => x.dateOnly >= startDate && x.dateOnly <= endDate);

    if (precinct !== "ALL"){
      d = d.filter((x) => x.precinct === precinct);
    }
    if (crimeAgainst !== "ALL"){
      d = d.filter((x) => x.crimeAgainst === crimeAgainst);
    }
    if (selectedOffenseGroup){
      d = d.filter((x) => x.offenseGroup === selectedOffenseGroup);
    }
    return d;
  }, [cleaned, startDate, endDate, precinct, crimeAgainst, selectedOffenseGroup]);

  const totalIncidents = filtered.length;

  const uniqueNeighborhoods = useMemo(() => {
    const s = new Set(filtered.map((d) => d.neighborhood).filter(Boolean));
    return s.size;
  }, [filtered]);

  const timeSeries = useMemo(() => {
    const m = new Map(); // date -> count
    for (const r of filtered){
      m.set(r.dateOnly, (m.get(r.dateOnly) || 0) + 1);
    }
    const xs = Array.from(m.keys()).sort();
    const ys = xs.map((x) => m.get(x));
    return { xs, ys };
  }, [filtered]);

  const offenseBars = useMemo(() => {
    const m = new Map();
    for (const r of filtered){
      m.set(r.offenseGroup, (m.get(r.offenseGroup) || 0) + 1);
    }
    const rows = Array.from(m.entries()).map(([k, v]) => ({ k, v }));
    rows.sort((a,b) => b.v - a.v);
    const top = rows.slice(0, 12);
    return { labels: top.map((r) => r.k), values: top.map((r) => r.v) };
  }, [filtered]);

  const mapPoints = useMemo(() => {
    const pts = filtered.filter((d) => d.hasCoord);

    // Simple down-sample to keep rendering fast
    if (pts.length <= MAP_MAX_POINTS) return pts;

    const step = Math.ceil(pts.length / MAP_MAX_POINTS);
    const sampled = [];
    for (let i = 0; i < pts.length; i += step){
      sampled.push(pts[i]);
    }
    return sampled;
  }, [filtered]);

  const leadText = useMemo(() => {
    const pieces = [];
    pieces.push(`Showing incidents from ${startDate} to ${endDate}.`);
    if (precinct !== "ALL") pieces.push(`Precinct: ${precinct}.`);
    if (crimeAgainst !== "ALL") pieces.push(`Crime against: ${crimeAgainst}.`);
    if (selectedOffenseGroup) pieces.push(`Selected offense group: ${selectedOffenseGroup}.`);
    return pieces.join(" ");
  }, [startDate, endDate, precinct, crimeAgainst, selectedOffenseGroup]);

  const onOffenseBarClick = (evt) => {
    const label = evt?.points?.[0]?.y;
    if (!label) return;
    setSelectedOffenseGroup(label);
  };

  const clearSelection = () => setSelectedOffenseGroup(null);

  const resetFilters = () => {
    setStartDate(defaultStart);
    setEndDate(defaultEnd);
    setPrecinct("ALL");
    setCrimeAgainst("ALL");
    setSelectedOffenseGroup(null);
  };

  return (
    <div>
      <div className="header">
        <div className="container">
          <h1 className="title">Seattle Police Department Crime Dashboard</h1>
          <p className="subtitle">
            Explore reported crime incidents with linked charts. Use the filters on the left, then click an offense group bar
            to cross filter the time series and map.
          </p>
          <p className="source">
            Data source: City of Seattle Open Data - SPD Crime Data: 2008-Present (dataset ID: tazs-3rd5). API: {API_BASE}
          </p>
        </div>
      </div>

      <div className="container">
        <div className="grid">
          <div className="card">
            <h2>Filters</h2>

            <div className="row">
              <div>
                <div className="label">Start date</div>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <div className="label">End date</div>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            <button
              className="loadButton"
              onClick={handleLoadData}
              disabled={meta.loading}
              style={{ marginTop: 12 }}
            >
              {meta.loading ? "Loading…" : "Load data"}
            </button>
            <div className="smallNote" style={{ marginTop: 6 }}>
              Fetches up to {MAX_TOTAL_ROWS.toLocaleString()} records for the date range (paginated). Date range, precinct, and crime category filter the loaded data; all charts update when you change filters.
            </div>

            <div className="label">Precinct</div>
            <select value={precinct} onChange={(e) => setPrecinct(e.target.value)}>
              {precinctOptions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>

            <div className="label">Crime against category</div>
            <select value={crimeAgainst} onChange={(e) => setCrimeAgainst(e.target.value)}>
              {crimeAgainstOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            <div className="label">Cross chart selection</div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span className="badge">{selectedOffenseGroup ? selectedOffenseGroup : "None"}</span>
            </div>

            <div className="row" style={{ marginTop: 10 }}>
              <button className="secondary" onClick={clearSelection} disabled={!selectedOffenseGroup}>
                Clear selection
              </button>
              <button className="secondary" onClick={resetFilters}>
                Reset all
              </button>
            </div>

            <div className="label" style={{ marginTop: 14 }}>Summary</div>
            <div className="kpis">
              <div className="kpi">
                <div className="k">Incidents (filtered)</div>
                <div className="v">{meta.loading ? "Loading..." : totalIncidents.toLocaleString()}</div>
              </div>
              <div className="kpi">
                <div className="k">Neighborhoods (filtered)</div>
                <div className="v">{meta.loading ? "Loading..." : uniqueNeighborhoods.toLocaleString()}</div>
              </div>
            </div>

            <div className="smallNote">
              <div style={{ marginTop: 10 }}><strong>How to use:</strong></div>
              <div>1) Set date range and click <strong>Load data</strong> to fetch records (paginated, up to {MAX_TOTAL_ROWS.toLocaleString()} rows).</div>
              <div>2) Change date range, precinct, or crime category—all three charts update immediately (no new API call).</div>
              <div>3) Clear selection to return to the broader view.</div>

              <div style={{ marginTop: 10 }}>
                <span className="badge">3 chart types</span>{" "}
                <span className="badge">linked interactivity</span>{" "}
                <span className="badge">filters</span>
              </div>
            </div>

            {meta.error ? (
              <div className="smallNote" style={{ marginTop: 12, color: "#b91c1c" }}>
                <div><strong>Error:</strong> {meta.error}</div>
                <div style={{ marginTop: 6 }}>
                  Tip: Narrow the date range (the dataset is large), then reload.
                </div>
              </div>
            ) : null}

            {!meta.error && meta.lastQuery ? (
              <div className="smallNote" style={{ marginTop: 12 }}>
                <div><strong>Current query:</strong></div>
                <div style={{ wordBreak: "break-word" }}>{meta.lastQuery}</div>
              </div>
            ) : null}
          </div>

          <div className="main">
            <div className="card">
              <h2>Lead in</h2>
              <div className="smallNote">
                {raw.length === 0 && !meta.loading && !meta.error
                  ? "Set date range and click Load data to fetch records (paginated). Then change filters—date, precinct, or crime category—and all charts update. Then use the filters and bar chart to explore."
                  : leadText}
              </div>
            </div>

            <div className="card chartWrap">
              <h2>Incidents over time (line chart)</h2>
              <Plot
                data={[
                  {
                    x: timeSeries.xs,
                    y: timeSeries.ys,
                    type: "scatter",
                    mode: "lines+markers",
                    hovertemplate: "%{x}<br>Incidents: %{y}<extra></extra>",
                  }
                ]}
                layout={{
                  autosize: true,
                  margin: { l: 50, r: 20, t: 10, b: 50 },
                  xaxis: { title: "Date" },
                  yaxis: { title: "Incidents" },
                }}
                useResizeHandler
                style={{ width: "100%", height: "340px" }}
                config={{ displayModeBar: false }}
              />
            </div>

            <div className="card chartWrap">
              <h2>Number of incidents by offense type (NIBRS group)</h2>
              <p className="chartSubtitle">
                The bars show the FBI’s NIBRS categories: <strong>Group A</strong> = crimes with full incident reporting (e.g. homicide, robbery, burglary, theft, assault). <strong>Group B</strong> = offenses for which only arrest data is reported (e.g. DUI, disorderly conduct). <strong>Click a bar</strong> to filter the line chart and map to that type.
              </p>
              <Plot
                data={[
                  {
                    x: offenseBars.values,
                    y: offenseBars.labels,
                    type: "bar",
                    orientation: "h",
                    hovertemplate: "%{y}<br>Number of incidents: %{x}<extra></extra>",
                  }
                ]}
                layout={{
                  autosize: true,
                  margin: { l: 200, r: 20, t: 10, b: 50 },
                  xaxis: { title: "Number of incidents" },
                  yaxis: { title: "Offense type (NIBRS group)" },
                }}
                useResizeHandler
                style={{ width: "100%", height: "380px" }}
                config={{ displayModeBar: false }}
                onClick={onOffenseBarClick}
              />
              <div className="smallNote">Click a bar to cross-filter the time series and map. Clear selection to show all types again.</div>
            </div>

            <div className="card chartWrap">
              <h2>Incident locations (map)</h2>
              <div className="smallNote" style={{ marginBottom: 10 }}>
                Showing up to {MAP_MAX_POINTS.toLocaleString()} points (sampled after filtering) for responsiveness.
              </div>

              <MapContainer center={[47.6062, -122.3321]} zoom={11} style={{ height: "420px", width: "100%", borderRadius: 12 }}>
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {mapPoints.map((p, idx) => (
                  <CircleMarker
                    key={`${p.dateOnly}-${idx}`}
                    center={[p.lat, p.lon]}
                    radius={4}
                    pathOptions={{}}
                  >
                    <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                      <div style={{ fontSize: 12 }}>
                        <div><strong>{p.offenseGroup}</strong></div>
                        <div>{p.dateOnly} | {p.precinct}</div>
                        <div>{p.neighborhood}</div>
                      </div>
                    </Tooltip>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>

            <div className="footer">
              Built with React, Plotly, and Leaflet. Deployed as a static site on GitHub Pages.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
