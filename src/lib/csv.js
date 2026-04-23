// CSV import/export for firefighters database
export function firefightersToCsv(firefighters) {
    const esc = (v) => {
        const s = String(v ?? "");
        if (s.includes(",") || s.includes('"') || s.includes("\n")) {
            return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
    };
    const header = "first_name,last_name,rank";
    const rows = firefighters.map((f) => `${esc(f.first_name)},${esc(f.last_name)},${esc(f.rank || "")}`);
    return header + "\n" + rows.join("\n");
}

export function downloadCsv(filename, content) {
    const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Simple CSV parser with quoted fields + header row support
export function parseFirefightersCsv(text) {
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];

    const parseLine = (line) => {
        const result = [];
        let cur = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQuotes) {
                if (ch === '"' && line[i + 1] === '"') {
                    cur += '"';
                    i++;
                } else if (ch === '"') {
                    inQuotes = false;
                } else {
                    cur += ch;
                }
            } else {
                if (ch === '"') inQuotes = true;
                else if (ch === ",") {
                    result.push(cur);
                    cur = "";
                } else cur += ch;
            }
        }
        result.push(cur);
        return result;
    };

    const header = parseLine(lines[0]).map((h) => h.trim().toLowerCase());
    const firstIdx = header.indexOf("first_name");
    const lastIdx = header.indexOf("last_name");
    const rankIdx = header.indexOf("rank");

    // If no proper header, assume: first_name,last_name,rank
    const hasHeader = firstIdx >= 0 && lastIdx >= 0;
    const dataLines = hasHeader ? lines.slice(1) : lines;
    const fi = hasHeader ? firstIdx : 0;
    const li = hasHeader ? lastIdx : 1;
    const ri = hasHeader ? rankIdx : 2;

    return dataLines
        .map((line) => {
            const cells = parseLine(line);
            const first = (cells[fi] || "").trim();
            const last = (cells[li] || "").trim();
            const rank = ri >= 0 ? (cells[ri] || "").trim() : "";
            return { first_name: first, last_name: last, rank };
        })
        .filter((r) => r.first_name && r.last_name);
}
