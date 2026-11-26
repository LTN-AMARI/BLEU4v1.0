
// ======================================
// BLEU4 v2 - NOTIFICATIONS 2027
// Son + bannière + notification système
// ======================================

let audioCtx = null;

// ======================================
// ALERTE SONORE
// Deux bips
// ======================================

export async function playAlertSound() {

    try {

        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) return;

        audioCtx = audioCtx || new AudioContextClass();

        if (audioCtx.state === "suspended") {
            await audioCtx.resume();
        }

        const now = audioCtx.currentTime;

        [0, 0.18].forEach((offset, i) => {

            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = "sine";
            osc.frequency.value = i === 0 ? 880 : 1046;

            gain.gain.setValueAtTime(0.0001, now + offset);

            gain.gain.exponentialRampToValueAtTime(
                0.3,
                now + offset + 0.02
            );

            gain.gain.exponentialRampToValueAtTime(
                0.0001,
                now + offset + 0.16
            );

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
// BANNIERE VISUELLE
// ======================================

export function showMissionBanner(message) {

    let banner = document.getElementById("missionAlertBanner");

    if (!banner) {

        banner = document.createElement("div");

        banner.id = "missionAlertBanner";
        banner.className = "mission-alert-banner";

        document.body.appendChild(banner);
    }

    banner.textContent = message;

    banner.classList.add("visible");

    clearTimeout(banner._hideTimeout);

    banner._hideTimeout = setTimeout(() => {

        banner.classList.remove("visible");

    }, 6000);
}

// ======================================
// AUTORISATION NOTIFICATIONS
// ======================================

export async function requestNotificationPermission() {

    if (!("Notification" in window)) return;

    if (Notification.permission === "default") {

        try {

            await Notification.requestPermission();

        } catch (err) {

            console.error(
                "Autorisation notification impossible :",
                err
            );
        }
    }
}

// ======================================
// NOTIFICATION SYSTEME
// ======================================

export function showSystemNotification(title, body) {

    if (!("Notification" in window)) return;

    if (Notification.permission !== "granted") return;

    try {

        const notification = new Notification(title, {
            body,
            icon: "assets/logo-icon.png",
            tag: "bleu4-mission"
        });

        notification.onclick = () => {

            window.focus();
            notification.close();

        };

    } catch (err) {

        console.error(
            "Notification système impossible :",
            err
        );
    }
}
