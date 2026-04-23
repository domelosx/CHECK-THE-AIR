import { formatTime, calcLiters, realConsumptionLPerMin, projectedSecondsTo60Bar } from "@/lib/calculations";

// Compute per-reading instantaneous consumption and projection-to-60bar
function computeReadingExtras(ff) {
    const readings = ff.readings || [];
    const rows = readings.map((r, idx) => {
        const prev = idx === 0
            ? { pressure: ff.initial_pressure, elapsed_seconds: 0 }
            : readings[idx - 1];
        const deltaBar = prev.pressure - r.pressure;
        const deltaSec = r.elapsed_seconds - prev.elapsed_seconds;
        let consumption = null;
        if (deltaSec > 0 && deltaBar > 0) {
            consumption = (deltaBar * ff.cylinder_capacity / deltaSec) * 60;
        }
        // Projection from THIS reading forward (virtual)
        // Simulate projectedSecondsTo60Bar using last two readings up to this index
        let projectedTo60 = null;
        if (idx >= 1) {
            const slice = { ...ff, readings: readings.slice(0, idx + 1) };
            projectedTo60 = projectedSecondsTo60Bar(slice, r.elapsed_seconds);
        }
        return { ...r, consumption, projectedTo60 };
    });
    return rows;
}

export function printRotaReport(rota) {
    const startDate = new Date(rota.started_at);
    const endDate = rota.finished_at ? new Date(rota.finished_at) : new Date();
    const duration = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);

    const renderFF = (ff) => {
        const rows = computeReadingExtras(ff);
        const finalConsumption = realConsumptionLPerMin(ff);
        const readingsRows =
            rows.length === 0
                ? `<tr><td colspan="6" class="empty">Brak odczytów / No readings</td></tr>`
                : rows
                      .map((r, idx) => {
                          const liters = Math.round(calcLiters(ff.cylinder_capacity, r.pressure));
                          const critical = r.pressure < 60 ? ' class="critical"' : r.pressure <= 175 ? ' class="advisory"' : "";
                          return `<tr${critical}>
                            <td>${idx + 1}</td>
                            <td class="mono">${formatTime(r.elapsed_seconds)}</td>
                            <td class="mono">${r.pressure} bar</td>
                            <td class="mono">${liters} L</td>
                            <td class="mono">${r.consumption !== null ? r.consumption.toFixed(0) + " L/min" : "—"}</td>
                            <td class="mono">${r.projectedTo60 !== null ? formatTime(r.projectedTo60) : "—"}</td>
                          </tr>`;
                      })
                      .join("");

        return `
        <section class="ff">
          <div class="ff-head">
            <div class="pos ${ff.position}">${ff.position === "przodownik" ? "PRZODOWNIK / TEAM LEADER" : "POMOCNIK / ASSISTANT"}</div>
            <div class="name">${ff.first_name} ${ff.last_name} ${ff.rank ? `<span class="rank">(${ff.rank})</span>` : ""}</div>
          </div>
          <div class="ff-meta">
            <div><span>Pojemność / Capacity:</span> <b>${ff.cylinder_capacity} L</b></div>
            <div><span>Ciśnienie pocz. / Initial:</span> <b>${ff.initial_pressure} bar</b></div>
            <div><span>Powietrze startowe / Start air:</span> <b>${Math.round(calcLiters(ff.cylinder_capacity, ff.initial_pressure))} L</b></div>
            <div><span>Odczyty / Readings:</span> <b>${rows.length}</b></div>
            <div><span>Śr. zużycie / Avg consumption:</span> <b>${finalConsumption !== null ? finalConsumption.toFixed(1) + " L/min" : "—"}</b></div>
            <div><span>Status:</span> <b>${rota.status === "active" ? "W AKCJI / ACTIVE" : "ZAKOŃCZONA / FINISHED"}</b></div>
          </div>
          <table class="readings">
            <thead>
              <tr>
                <th>#</th>
                <th>Czas / Time</th>
                <th>Ciśnienie / Pressure</th>
                <th>Powietrze / Air</th>
                <th>Zużycie / Consumption</th>
                <th>Do 60 bar / To 60 bar</th>
              </tr>
            </thead>
            <tbody>${readingsRows}</tbody>
          </table>
        </section>`;
    };

    const html = `<!doctype html>
<html lang="pl"><head><meta charset="utf-8">
<title>Karta kontroli — STOPER ${rota.stoper_number}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #000; margin: 0; }
  header { border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-end; }
  h1 { margin: 0; font-size: 20px; letter-spacing: 1px; }
  .sub { font-size: 10px; letter-spacing: 2px; color: #666; text-transform: uppercase; margin-top: 3px; }
  .stoper { font-size: 28px; font-weight: 900; letter-spacing: 2px; }
  .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 10px 0 14px; font-size: 11px; }
  .meta > div { border: 1px solid #ccc; padding: 5px 7px; }
  .meta span { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #666; }
  .meta b { font-size: 13px; }
  .ff { margin-bottom: 14px; border: 1px solid #000; padding: 8px 10px; page-break-inside: avoid; }
  .ff-head { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 6px; }
  .pos { font-size: 9px; letter-spacing: 2px; font-weight: bold; }
  .pos.przodownik { color: #c00; }
  .pos.pomocnik { color: #005; }
  .name { font-size: 14px; font-weight: bold; }
  .rank { color: #666; font-weight: normal; font-size: 11px; }
  .ff-meta { display: grid; grid-template-columns: repeat(6, 1fr); gap: 5px; font-size: 10px; margin-bottom: 6px; }
  .ff-meta span { color: #666; display: block; font-size: 9px; }
  table.readings { width: 100%; border-collapse: collapse; font-size: 10px; }
  table.readings th { text-align: left; border-bottom: 2px solid #000; padding: 4px 5px; text-transform: uppercase; font-size: 9px; letter-spacing: 1px; }
  table.readings td { border-bottom: 1px solid #ddd; padding: 3px 5px; }
  .mono { font-family: 'Courier New', monospace; }
  tr.critical td { background: #ffe0e0; font-weight: bold; }
  tr.advisory td { background: #fff6d0; }
  .empty { text-align: center; color: #888; font-style: italic; padding: 8px; }
  footer { margin-top: 18px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; font-size: 10px; }
  .sign { border-top: 1px solid #000; padding-top: 3px; text-align: center; color: #666; }
  .copyright { text-align: center; color: #999; font-size: 9px; margin-top: 8px; }
</style></head>
<body>
  <header>
    <div>
      <h1>KARTA KONTROLI APARATÓW ODDECHOWYCH / SCBA CONTROL CARD</h1>
      <div class="sub">Check the air — punkt kontroli / control point</div>
    </div>
    <div class="stoper">STOPER ${rota.stoper_number}</div>
  </header>
  <div class="meta">
    <div><span>Rozpoczęcie / Start</span><b>${startDate.toLocaleString("pl-PL")}</b></div>
    <div><span>Zakończenie / End</span><b>${rota.finished_at ? endDate.toLocaleString("pl-PL") : "W TRAKCIE / IN PROGRESS"}</b></div>
    <div><span>Czas w akcji / Action time</span><b class="mono">${formatTime(duration)}</b></div>
    <div><span>Status</span><b>${rota.status === "active" ? "AKTYWNA / ACTIVE" : "ZAKOŃCZONA / FINISHED"}</b></div>
  </div>
  ${rota.firefighters.map(renderFF).join("")}
  <footer>
    <div class="sign">Dyżurny punktu kontroli<br/>SCBA Controller</div>
    <div class="sign">Dowódca akcji<br/>Incident Commander</div>
    <div class="sign">Data i podpis<br/>Date &amp; Signature</div>
  </footer>
  <div class="copyright">© 2026 Damian Dąbek — Check the air</div>
<script>window.onload = () => { window.print(); };</script>
</body></html>`;

    const w = window.open("", "_blank");
    if (w) {
        w.document.write(html);
        w.document.close();
    }
}
