import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getDatabase,
    ref,
    set,
    onValue,
    update,
    remove
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCOTja98aA-0umXrqm2c2k4frUFn6why1o",
  authDomain: "bleu-4.firebaseapp.com",
  databaseURL: "https://bleu-4-default-rtdb.firebaseio.com",
  projectId: "bleu-4",
  storageBucket: "bleu-4.firebasestorage.app",
  messagingSenderId: "788139266954",
  appId: "1:788139266954:web:c1896f25eb57687846ae73"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

export { ref, set, onValue, update, remove };
