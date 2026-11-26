
// ======================================
// BLEU4 v2 - DATE UTILS 2027
// Base Firebase : AAAA-MM-JJ
// Affichage utilisateur : JJ/MM/AAAA
// ======================================

// ======================================
// ISO -> FR
// "2026-07-04" -> "04/07/2026"
// ======================================

export function isoToFr(iso) {

    if (!iso) return "";

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);

    if (!match) return "";

    const [, y, m, d] = match;

    if (!isValidDate(y, m, d)) return "";

    return `${d}/${m}/${y}`;
}

// ======================================
// FR -> ISO
// "04/07/2026" -> "2026-07-04"
// ======================================

export function frToIso(fr) {

    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(
        (fr || "").trim()
    );

    if (!match) return null;

    const [, d, m, y] = match;

    if (!isValidDate(y, m, d)) return null;

    return `${y}-${m}-${d}`;
}

// ======================================
// VERIFICATION D'UNE DATE
// ======================================

function isValidDate(year, month, day) {

    const y = Number(year);
    const m = Number(month);
    const d = Number(day);

    const date = new Date(y, m - 1, d);

    return (
        date.getFullYear() === y &&
        date.getMonth() === m - 1 &&
        date.getDate() === d
    );
}

// ======================================
// FORMATAGE AUTOMATIQUE
// Ajoute les "/" pendant la saisie
// ======================================

export function autoFormatDateInput(inputEl) {

    if (!inputEl) return;

    inputEl.addEventListener("input", () => {

        const start = inputEl.selectionStart;
        const oldValue = inputEl.value;

        const digits = oldValue
            .replace(/\D/g, "")
            .slice(0, 8);

        let formatted = digits;

        if (digits.length > 4) {

            formatted =
                `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;

        } else if (digits.length > 2) {

            formatted =
                `${digits.slice(0, 2)}/${digits.slice(2)}`;
        }

        inputEl.value = formatted;

        // Replace le curseur à la fin
        if (start !== null) {
            inputEl.setSelectionRange(
                formatted.length,
                formatted.length
            );
        }
    });
}

// ======================================
// DATE DU JOUR -> ISO
// ======================================

export function getTodayIso() {

    const d = new Date();

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${y}-${m}-${day}`;
}
