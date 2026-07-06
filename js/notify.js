// ======================================
// BLEU4 v2 - NOTIFICATIONS (en-appli)
// Alerte sonore + bannière visuelle quand une
// nouvelle mission apparaît, PENDANT que l'appli
// est ouverte sur le téléphone/ordinateur.
//
// ⚠️ Ce n'est PAS une notification push classique :
// ça ne sonnera pas si le téléphone est verrouillé
// ou l'appli totalement fermée. Une vraie notification
// push nécessite Firebase Cloud Messaging + un plan
// Firebase payant (Blaze) + une Cloud Function.
// ======================================

let audioCtx = null;

// ======================================
// SON (deux bips, généré directement,
// aucun fichier audio à héberger)
// ======================================

export function playAlertSound() {

    try {

        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();

        if (audioCtx.state === "suspended") {
            audioCtx.resume();
        }

        const now = audioCtx.currentTime;

        [0, 0.18].forEach((offset, i) => {

            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = "sine";
            osc.frequency.value = i === 0 ? 880 : 1046;

            gain.gain.setValueAtTime(0.0001, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.3, now + offset + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.16);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start(now + offset);
            osc.stop(now + offset + 0.18);

        });

    } catch (err) {

        console.error("Son d'alerte indisponible :", err);

    }

}

// ======================================
// BANNIERE VISUELLE (dans la page)
// ======================================

export function showMissionBanner(message) {

    let banner = document.getElementById("missionAlertBanner");

    if (!banner) {
        banner = document.createElement("div");
        banner.id = "missionAlertBanner";
        banner.className = "mission-alert-banner";
        document.body.appendChild(banner);
    }

    banner.innerText = message;
    banner.classList.add("visible");

    clearTimeout(banner._hideTimeout);

    banner._hideTimeout = setTimeout(() => {
        banner.classList.remove("visible");
    }, 6000);

}

// ======================================
// NOTIFICATION SYSTEME (si le navigateur
// le permet et que l'utilisateur a autorisé) —
// bonus : marche même onglet en arrière-plan
// sur certains navigateurs (pas iPhone/Safari).
// ======================================

export function requestNotificationPermission() {

    if (typeof Notification === "undefined") return;

    if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
    }

}

export function showSystemNotification(title, body) {

    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;

    try {
        new Notification(title, {
            body,
            icon: "assets/logo-icon.png"
        });
    } catch (err) {
        console.error("Notification système impossible :", err);
    }

}
