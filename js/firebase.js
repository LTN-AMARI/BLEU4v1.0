// 🔥 FIREBASE CONFIG BLEU4

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
    getDatabase,
    ref,
    push,
    set,
    onValue,
    update,
    remove
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

import {
    getAuth,
    signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCOTja98aA-0umXrqm2c2k4frUFn6why1o",
    authDomain: "bleu-4.firebaseapp.com",
    databaseURL: "https://bleu-4-default-rtdb.firebaseio.com",
    projectId: "bleu-4",
    storageBucket: "bleu-4.appspot.com",
    messagingSenderId: "788139266954",
    appId: "1:788139266954:web:c1896f25eb57687846ae73"
};

// Initialisation
const app = initializeApp(firebaseConfig);

const db = getDatabase(app);

const auth = getAuth(app);

// Connexion anonyme automatique
signInAnonymously(auth)
    .then(() => {
        console.log("✅ Connecté à Firebase");
    })
    .catch((error) => {
        console.error("Erreur Firebase Auth :", error);
    });

export {
    db,
    ref,
    push,
    set,
    onValue,
    update,
    remove
};
