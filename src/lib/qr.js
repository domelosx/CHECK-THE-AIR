// QR code generation and encoding/decoding helpers
import QRCode from "qrcode";

export const QR_PREFIX = "CTAIR"; // Check the air prefix

export function encodeFirefighter(ff) {
    // Format: CTAIR|v1|id|first|last|rank
    // Simple pipe-separated; pipes in names are stripped
    const clean = (s) => String(s ?? "").replace(/\|/g, " ");
    return `${QR_PREFIX}|v1|${clean(ff.id)}|${clean(ff.first_name)}|${clean(ff.last_name)}|${clean(ff.rank || "")}`;
}

export function decodeFirefighter(text) {
    if (!text) return null;
    const s = String(text).trim();
    if (!s.startsWith(QR_PREFIX + "|")) return null;
    const parts = s.split("|");
    if (parts.length < 5) return null;
    const [, version, id, first, last, rank] = parts;
    if (version !== "v1") return null;
    return {
        id: id || "",
        first_name: first || "",
        last_name: last || "",
        rank: rank || "",
    };
}

export async function generateQrDataUrl(text, size = 256) {
    return QRCode.toDataURL(text, {
        width: size,
        margin: 2,
        errorCorrectionLevel: "M",
        color: { dark: "#000000", light: "#ffffff" },
    });
}
