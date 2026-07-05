// ======================================
// BLEU4 v2 - DATE UTILS
// Toute la base (Firebase, comparaisons calendrier)
// reste en ISO "AAAA-MM-JJ". Ces fonctions ne servent
// qu'à l'affichage et à la saisie en français JJ/MM/AAAA.
// ======================================

// ISO "2026-07-04" -> "04/07/2026"
export function isoToFr(iso) {

    if (!iso) return "";

    const [y, m, d] = iso.split("-");

    return `${d}/${m}/${y}`;

}

// "04/07/2026" -> "2026-07-04" (ou null si invalide)
export function frToIso(fr) {

    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((fr || "").trim());

    if (!match) return null;

    const [, d, m, y] = match;

    const day = parseInt(d, 10);
    const month = parseInt(m, 10);
    const year = parseInt(y, 10);

    // vérifie que la date existe vraiment (ex: 31/02 refusé)
    const check = new Date(year, month - 1, day);

    const valid =
        check.getFullYear() === year &&
        check.getMonth() === month - 1 &&
        check.getDate() === day;

    if (!valid) return null;

    return `${y}-${m}-${d}`;

}

// Ajoute automatiquement les "/" pendant la saisie
// pour guider l'utilisateur au format JJ/MM/AAAA.
export function autoFormatDateInput(inputEl) {

    if (!inputEl) return;

    inputEl.addEventListener("input", () => {

        let digits = inputEl.value.replace(/\D/g, "").slice(0, 8);

        let formatted = digits;

        if (digits.length > 4) {
            formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
        } else if (digits.length > 2) {
            formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
        }

        inputEl.value = formatted;

    });

}
