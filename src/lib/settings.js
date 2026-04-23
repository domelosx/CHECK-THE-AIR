const KEY = "scba-settings-v1";

const DEFAULTS = {
    pressureWarningBar: 60,
    pressureAdvisoryBar: 175,
    timeWarningSeconds: 10 * 60,
    readingIntervalSeconds: 5 * 60,
    soundEnabled: true,
};

export function loadSettings() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return { ...DEFAULTS };
        const parsed = JSON.parse(raw);
        return { ...DEFAULTS, ...parsed };
    } catch {
        return { ...DEFAULTS };
    }
}

export function saveSettings(s) {
    localStorage.setItem(KEY, JSON.stringify(s));
    window.dispatchEvent(new CustomEvent("scba-settings-change"));
}

export function resetSettings() {
    saveSettings({ ...DEFAULTS });
}

export { DEFAULTS as DEFAULT_SETTINGS };
