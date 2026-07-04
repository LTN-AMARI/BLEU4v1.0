import { db, ref, onValue, update } from "./firebase.js";

const user = JSON.parse(localStorage.getItem("BLEU4_USER"));

const container = document.createElement("div");
container.id = "notifications";
document.body.prepend(container);

// CHARGEMENT NOTIFICATIONS REALTIME
onValue(ref(db, "notifications"), (snap) => {

    const data = snap.val() || {};

    container.innerHTML = "";

    Object.values(data).forEach(n => {

        const div = document.createElement("div");
        div.className = "notif";

        div.innerHTML = `
            🔔 ${n.text}
        `;

        container.appendChild(div);

        // auto disparition après 5 sec visuelle
        setTimeout(() => {
            div.style.display = "none";
        }, 5000);
    });
});

// CREER NOTIF (utilisé par missions.js)
window.createNotification = function(text) {

    const id = Date.now().toString();

    update(ref(db, "notifications/" + id), {
        id,
        text,
        createdAt: Date.now()
    });
};
