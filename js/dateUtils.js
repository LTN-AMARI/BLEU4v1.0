
// ======================================
// BLEU4 2027 - DATE UTILS
// Base Firebase : AAAA-MM-JJ
// Affichage : JJ/MM/AAAA
// ======================================

// ======================================
// ISO -> FR
// ======================================

export function isoToFr(iso) {
    if (!iso) return "";

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);

    if (!match) return "";

    const [, year, month, day] = match;

    if (!isValidDate(year, month, day)) return "";

    return `${day}/${month}/${year}`;
}

// ======================================
// FR -> ISO
// ======================================

export function frToIso(fr) {
    if (!fr) return "";

    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(fr.trim());

    if (!match) return "";

    const [, day, month, year] = match;

    if (!isValidDate(year, month, day)) return "";

    return `${year}-${month}-${day}`;
}

// ======================================
// VALIDATION DATE
// ======================================

export function isValidDate(year, month, day) {
    const y = Number(year);
    const m = Number(month);
    const d = Number(day);

    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) {
        return false;
    }

    if (y < 1900 || y > 2200) return false;
    if (m < 1 || m > 12) return false;

    const date = new Date(y, m - 1, d);

    return (
        date.getFullYear() === y &&
        date.getMonth() === m - 1 &&
        date.getDate() === d
    );
}

// ======================================
// FORMATAGE SAISIE JJ/MM/AAAA
// ======================================

export function autoFormatDateInput(input) {
    if (!input) return;

    input.placeholder = "JJ/MM/AAAA";
    input.maxLength = 10;

    input.addEventListener("input", () => {
        let value = input.value.replace(/\D/g, "").slice(0, 8);

        if (value.length > 4) {
            value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
        } else if (value.length > 2) {
            value = `${value.slice(0, 2)}/${value.slice(2)}`;
        }

        input.value = value;
    });
}

// ======================================
// DATE DU JOUR EN ISO
// ======================================

export function getTodayIso() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// ======================================
// AJOUT DE JOURS
// ======================================

export function addDaysToIso(iso, numberOfDays) {
    if (!iso) return "";

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);

    if (!match) return "";

    const [, year, month, day] = match;

    if (!isValidDate(year, month, day)) return "";

    const date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day)
    );

    date.setDate(date.getDate() + Number(numberOfDays));

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");

    return `${y}-${m}-${d}`;
}
