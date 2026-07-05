// ======================================
// BLEU4 v2 - CALENDRIER
// ======================================

const MONTHS = [
    "Janvier", "Février", "Mars", "Avril",
    "Mai", "Juin", "Juillet", "Août",
    "Septembre", "Octobre", "Novembre", "Décembre"
];

const COLORS = [
    "#1976D2", "#388E3C", "#D32F2F", "#F9A825",
    "#7B1FA2", "#0097A7", "#F57C00", "#5D4037",
    "#455A64", "#C2185B"
];

let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

let missions = [];
let selectedDate = null;
let onSelectCallback = null;

// ======================================
// INITIALISATION
// (appelée une seule fois par app.js)
// ======================================

export function initCalendar(onDateSelected) {

    onSelectCallback = onDateSelected;

    document.getElementById("prevMonth").addEventListener("click", () => {

        currentMonth--;

        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }

        renderCalendar();

    });

    document.getElementById("nextMonth").addEventListener("click", () => {

        currentMonth++;

        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }

        renderCalendar();

    });

    renderCalendar();

}

// ======================================
// Reçoit les missions depuis app.js
// (pas de lecture Firebase ici, juste un affichage)
// ======================================

export function setCalendarMissions(newMissions) {

    missions = newMissions || [];

    renderCalendar();

}

export function getSelectedDate() {

    return selectedDate;

}

// ======================================
// RENDU
// ======================================

function renderCalendar() {

    const calendar = document.getElementById("calendar");
    const title = document.getElementById("monthTitle");

    if (!calendar) return;

    calendar.innerHTML = "";

    title.innerText = `${MONTHS[currentMonth]} ${currentYear}`;

    const firstDay = new Date(currentYear, currentMonth, 1);

    let start = firstDay.getDay();
    start = start === 0 ? 6 : start - 1; // lundi = premier jour

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // jours vides avant le 1er du mois
    for (let i = 0; i < start; i++) {

        const empty = document.createElement("div");
        empty.className = "day empty";
        calendar.appendChild(empty);

    }

    const today = new Date();

    for (let d = 1; d <= daysInMonth; d++) {

        const day = document.createElement("div");
        day.className = "day";

        const date =
            `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

        day.dataset.date = date;

        if (
            today.getDate() === d &&
            today.getMonth() === currentMonth &&
            today.getFullYear() === currentYear
        ) {
            day.classList.add("today");
        }

        if (date === selectedDate) {
            day.classList.add("selected");
        }

        const number = document.createElement("div");
        number.className = "day-number";
        number.innerText = d;
        day.appendChild(number);

        // pastilles missions
        const dots = document.createElement("div");
        dots.className = "dots";

        missions.forEach((m, index) => {

            if (!m.start || !m.end) return;

            if (date >= m.start && date <= m.end) {

                const dot = document.createElement("div");
                dot.className = "dot";
                dot.style.background = COLORS[index % COLORS.length];
                dots.appendChild(dot);

            }

        });

        day.appendChild(dots);

        day.addEventListener("click", () => {

            selectedDate = date;

            document
                .querySelectorAll(".day")
                .forEach((x) => x.classList.remove("selected"));

            day.classList.add("selected");

            if (onSelectCallback) {
                onSelectCallback(date);
            }

        });

        calendar.appendChild(day);

    }

}
