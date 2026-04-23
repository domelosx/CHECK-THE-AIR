// SCBA calculation utilities
// Formula: bottle capacity (L) x pressure (bar) = liters of air
// Remaining time = liters / 60 L/min (breathing rate)

export const AIR_CONSUMPTION_RATE = 60; // liters per minute (theoretical)
export const PRESSURE_WARNING_BAR = 60; // signal to return (critical)
export const PRESSURE_ADVISORY_BAR = 175; // return advisory
export const TIME_WARNING_SECONDS = 10 * 60; // 10 minutes remaining

export function calcLiters(capacity, pressure) {
    return capacity * pressure;
}

export function calcRemainingSeconds(capacity, pressure) {
    const liters = calcLiters(capacity, pressure);
    return (liters / AIR_CONSUMPTION_RATE) * 60;
}

// Theoretical projection at 60 L/min (nominal breathing rate)
export function projectedRemainingSeconds(firefighter, currentElapsedSeconds) {
    const readings = firefighter.readings || [];
    const last =
        readings.length > 0
            ? readings[readings.length - 1]
            : {
                  pressure: firefighter.initial_pressure,
                  elapsed_seconds: 0,
              };
    const litersAtReading = calcLiters(firefighter.cylinder_capacity, last.pressure);
    const secondsSinceReading = Math.max(0, currentElapsedSeconds - last.elapsed_seconds);
    const consumedLiters = (AIR_CONSUMPTION_RATE * secondsSinceReading) / 60;
    const remainingLiters = Math.max(0, litersAtReading - consumedLiters);
    return (remainingLiters / AIR_CONSUMPTION_RATE) * 60;
}

// Linear regression (least squares) over all readings, including the
// initial pressure (t=0). Returns { slope, intercept } in bar/second units,
// or null if cannot compute (< 1 reading or singular).
function pressureRegression(firefighter) {
    const readings = firefighter.readings || [];
    if (readings.length < 1) return null;
    const points = [
        { t: 0, p: firefighter.initial_pressure },
        ...readings.map((r) => ({ t: r.elapsed_seconds, p: r.pressure })),
    ];
    const n = points.length;
    let sumT = 0;
    let sumP = 0;
    let sumTT = 0;
    let sumTP = 0;
    for (const pt of points) {
        sumT += pt.t;
        sumP += pt.p;
        sumTT += pt.t * pt.t;
        sumTP += pt.t * pt.p;
    }
    const denom = n * sumTT - sumT * sumT;
    if (denom === 0) return null;
    const slope = (n * sumTP - sumT * sumP) / denom; // bar per second
    const intercept = (sumP - slope * sumT) / n; // bar at t=0
    return { slope, intercept };
}

// Real average consumption in L/min, computed via linear regression over all
// readings since the start of the action. Works with >= 1 reading (uses
// initial_pressure as anchor point). Returns null if not decreasing.
export function realConsumptionLPerMin(firefighter) {
    const reg = pressureRegression(firefighter);
    if (!reg) return null;
    if (reg.slope >= 0) return null;
    const barPerSec = -reg.slope;
    return barPerSec * firefighter.cylinder_capacity * 60;
}

// Projected seconds until pressure drops to PRESSURE_WARNING_BAR (60 bar),
// using linear regression over all readings.
export function projectedSecondsTo60Bar(firefighter, currentElapsedSeconds) {
    const reg = pressureRegression(firefighter);
    if (!reg) return null;
    if (reg.slope >= 0) return null;
    const t60 = (PRESSURE_WARNING_BAR - reg.intercept) / reg.slope;
    const remaining = t60 - currentElapsedSeconds;
    return remaining <= 0 ? 0 : remaining;
}

// Live estimated pressure at the current moment.
// Piecewise: pressure stays at the last measured value UP TO the reading
// timestamp, then decreases at the regression-computed rate between readings
// (so the display always snaps to the exact measured value when a new reading
// arrives, and ticks down naturally between measurements).
// Before any reading, returns initial_pressure.
export function currentEstimatedPressure(firefighter, currentElapsedSeconds) {
    const readings = firefighter.readings || [];
    if (readings.length === 0) return firefighter.initial_pressure;
    const reg = pressureRegression(firefighter);
    const last = readings[readings.length - 1];
    if (currentElapsedSeconds <= last.elapsed_seconds) return last.pressure;
    if (!reg || reg.slope >= 0) return last.pressure;
    const secondsSince = currentElapsedSeconds - last.elapsed_seconds;
    const projected = last.pressure + reg.slope * secondsSince;
    return Math.max(0, projected);
}

export function currentEstimatedLiters(firefighter, currentElapsedSeconds) {
    return calcLiters(
        firefighter.cylinder_capacity,
        currentEstimatedPressure(firefighter, currentElapsedSeconds),
    );
}

export function lastPressure(firefighter) {
    const readings = firefighter.readings || [];
    if (readings.length === 0) return firefighter.initial_pressure;
    return readings[readings.length - 1].pressure;
}

export function formatTime(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) {
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    }
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function formatClock(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function elapsedSecondsSince(startIso, nowMs) {
    const startMs = new Date(startIso).getTime();
    return Math.max(0, Math.floor((nowMs - startMs) / 1000));
}

export function secondsUntilNextReading(firefighter, currentElapsedSeconds, intervalSeconds = 5 * 60) {
    const readings = firefighter.readings || [];
    const lastElapsed = readings.length > 0 ? readings[readings.length - 1].elapsed_seconds : 0;
    const nextDue = lastElapsed + intervalSeconds;
    return nextDue - currentElapsedSeconds;
}

export function isReadingDue(firefighter, currentElapsedSeconds, intervalSeconds = 5 * 60) {
    return secondsUntilNextReading(firefighter, currentElapsedSeconds, intervalSeconds) <= 0;
}
