// Direct PDF export using jsPDF (no browser print dialog)
import { jsPDF } from "jspdf";
import {
    formatTime,
    calcLiters,
    realConsumptionLPerMin,
    projectedSecondsTo60Bar,
} from "@/lib/calculations";

function computeReadingExtras(ff) {
    const readings = ff.readings || [];
    return readings.map((r, idx) => {
        const prev =
            idx === 0
                ? { pressure: ff.initial_pressure, elapsed_seconds: 0 }
                : readings[idx - 1];
        const deltaBar = prev.pressure - r.pressure;
        const deltaSec = r.elapsed_seconds - prev.elapsed_seconds;
        let consumption = null;
        if (deltaSec > 0 && deltaBar > 0) {
            consumption = (deltaBar * ff.cylinder_capacity / deltaSec) * 60;
        }
        let projectedTo60 = null;
        if (idx >= 1) {
            const slice = { ...ff, readings: readings.slice(0, idx + 1) };
            projectedTo60 = projectedSecondsTo60Bar(slice, r.elapsed_seconds);
        }
        return { ...r, consumption, projectedTo60 };
    });
}

function sanitize(s) {
    // jsPDF default fonts lack full UTF-8 — replace Polish diacritics only
    return String(s ?? "").replace(/[ąćęłńóśźż]/g, (c) =>
        ({ ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ź: "z", ż: "z" })[c],
    ).replace(/[ĄĆĘŁŃÓŚŹŻ]/g, (c) =>
        ({ Ą: "A", Ć: "C", Ę: "E", Ł: "L", Ń: "N", Ó: "O", Ś: "S", Ź: "Z", Ż: "Z" })[c],
    );
}

function addRotaPage(doc, rota, isFirst) {
    if (!isFirst) doc.addPage();
    const M = 12;
    const W = doc.internal.pageSize.getWidth();
    let y = M;

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("SCBA CONTROL CARD — Check the air", M, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(sanitize("Karta kontroli aparatow oddechowych"), M, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(0);
    doc.text(`STOPER ${rota.stoper_number}`, W - M, M + 2, { align: "right" });
    y += 4;
    doc.setDrawColor(0);
    doc.setLineWidth(0.6);
    doc.line(M, y, W - M, y);
    y += 6;

    // Meta
    const startDate = new Date(rota.started_at);
    const endDate = rota.finished_at ? new Date(rota.finished_at) : new Date();
    const duration = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const metaLines = [
        [`Start: ${startDate.toLocaleString("pl-PL")}`, `Status: ${rota.status === "active" ? "ACTIVE" : "FINISHED"}`],
        [
            `End: ${rota.finished_at ? endDate.toLocaleString("pl-PL") : "IN PROGRESS"}`,
            `Action time: ${formatTime(duration)}`,
        ],
    ];
    metaLines.forEach((row) => {
        doc.text(sanitize(row[0]), M, y);
        doc.text(sanitize(row[1]), W / 2, y);
        y += 5;
    });
    y += 2;

    // Firefighters
    rota.firefighters.forEach((ff) => {
        const rows = computeReadingExtras(ff);
        const avgCons = realConsumptionLPerMin(ff);

        doc.setFillColor(240);
        doc.rect(M, y, W - 2 * M, 7, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(ff.position === "przodownik" ? 200 : 0, 0, ff.position === "pomocnik" ? 150 : 0);
        doc.text(
            sanitize(
                `${ff.position === "przodownik" ? "TEAM LEADER" : "ASSISTANT"}: ${ff.first_name} ${ff.last_name}${ff.rank ? " (" + ff.rank + ")" : ""}`,
            ),
            M + 2,
            y + 5,
        );
        doc.setTextColor(0);
        y += 9;

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(
            sanitize(
                `Cylinder: ${ff.cylinder_capacity} L   Initial pressure: ${ff.initial_pressure} bar   Start air: ${Math.round(calcLiters(ff.cylinder_capacity, ff.initial_pressure))} L   Avg consumption: ${avgCons !== null ? avgCons.toFixed(1) + " L/min" : "—"}`,
            ),
            M,
            y,
        );
        y += 5;

        // Table header
        const cols = [
            { label: "#", w: 8 },
            { label: "Time", w: 20 },
            { label: "Pressure", w: 26 },
            { label: "Air (L)", w: 22 },
            { label: "Consumption", w: 32 },
            { label: "To 60 bar", w: 26 },
        ];
        let x = M;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setFillColor(30);
        doc.setTextColor(255);
        doc.rect(M, y, W - 2 * M, 6, "F");
        cols.forEach((c) => {
            doc.text(c.label, x + 2, y + 4);
            x += c.w;
        });
        doc.setTextColor(0);
        y += 6;

        // Rows
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        if (rows.length === 0) {
            doc.setTextColor(120);
            doc.text("No readings", M + 2, y + 4);
            doc.setTextColor(0);
            y += 6;
        } else {
            rows.forEach((r, idx) => {
                if (y > doc.internal.pageSize.getHeight() - 30) {
                    doc.addPage();
                    y = M;
                }
                // Alt row shade
                if (idx % 2 === 0) {
                    doc.setFillColor(245);
                    doc.rect(M, y, W - 2 * M, 5.5, "F");
                }
                // Critical / advisory row accent
                if (r.pressure < 60) {
                    doc.setFillColor(255, 220, 220);
                    doc.rect(M, y, W - 2 * M, 5.5, "F");
                } else if (r.pressure <= 175) {
                    doc.setFillColor(255, 245, 200);
                    doc.rect(M, y, W - 2 * M, 5.5, "F");
                }
                const liters = Math.round(calcLiters(ff.cylinder_capacity, r.pressure));
                const vals = [
                    String(idx + 1),
                    formatTime(r.elapsed_seconds),
                    `${r.pressure} bar`,
                    `${liters}`,
                    r.consumption !== null ? `${r.consumption.toFixed(0)} L/min` : "—",
                    r.projectedTo60 !== null ? formatTime(r.projectedTo60) : "—",
                ];
                let cx = M;
                vals.forEach((v, i) => {
                    doc.text(sanitize(v), cx + 2, y + 4);
                    cx += cols[i].w;
                });
                y += 5.5;
            });
        }
        y += 4;
    });

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.setDrawColor(150);
    doc.setLineWidth(0.2);
    doc.line(M, footerY - 3, W - M, footerY - 3);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(sanitize("© 2026 Damian Dabek — Check the air"), W / 2, footerY, { align: "center" });
    doc.setTextColor(0);
}

export function exportRotaToPdf(rota) {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    addRotaPage(doc, rota, true);
    doc.save(`check-the-air_STOPER-${rota.stoper_number}_${new Date(rota.started_at).toISOString().slice(0, 10)}.pdf`);
}

export function exportHistoryToPdf(rotas) {
    if (!rotas.length) return;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    rotas.forEach((r, idx) => addRotaPage(doc, r, idx === 0));
    doc.save(`check-the-air_history_${new Date().toISOString().slice(0, 10)}.pdf`);
}
