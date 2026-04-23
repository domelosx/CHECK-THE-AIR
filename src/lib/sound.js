// Web Audio tactical alarm — two-tone beep pattern
let ctx = null;
let loopTimer = null;

function getCtx() {
    if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
}

function beep(freq, duration, startOffset = 0) {
    const c = getCtx();
    if (!c) return;
    const now = c.currentTime + startOffset;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.3, now + 0.01);
    gain.gain.setValueAtTime(0.3, now + duration - 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(c.destination);
    osc.start(now);
    osc.stop(now + duration);
}

export function playAlarm() {
    // Two quick high beeps — CRITICAL
    beep(1100, 0.18, 0);
    beep(1100, 0.18, 0.28);
}

// Soft chime — reading-reminder (different from alarm)
export function playReminderChime() {
    // Two soft sine tones, ascending (like an elevator chime)
    const c = getCtx();
    if (!c) return;
    const now = c.currentTime;
    [
        { freq: 660, start: 0, dur: 0.22 },
        { freq: 880, start: 0.22, dur: 0.34 },
    ].forEach(({ freq, start, dur }) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now + start);
        gain.gain.exponentialRampToValueAtTime(0.22, now + start + 0.02);
        gain.gain.setValueAtTime(0.22, now + start + dur - 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
        osc.connect(gain).connect(c.destination);
        osc.start(now + start);
        osc.stop(now + start + dur);
    });
}

export function startAlarmLoop() {
    if (loopTimer) return;
    playAlarm();
    loopTimer = setInterval(playAlarm, 1500);
}

export function stopAlarmLoop() {
    if (loopTimer) {
        clearInterval(loopTimer);
        loopTimer = null;
    }
}

export function unlockAudio() {
    // Must be called from user gesture
    getCtx();
}
