
// =======================
// AUTH BLEU4 V2
// =======================

// récup inputs
const loginInput = document.getElementById("login");
const roleSelect = document.getElementById("role");
const passwordBox = document.getElementById("passwordBox");
const passwordInput = document.getElementById("password");
const btnLogin = document.getElementById("btnLogin");

// afficher mot de passe seulement pour commandement
roleSelect.addEventListener("change", () => {
    if (roleSelect.value === "commandement") {
        passwordBox.style.display = "block";
    } else {
        passwordBox.style.display = "none";
    }
});

// login
btnLogin.addEventListener("click", () => {

    const login = loginInput.value.trim();
    const role = roleSelect.value;
    const password = passwordInput.value;

    if (!login) {
        alert("Entre ton GRADE NOM");
        return;
    }

    // sécurité simple commandement
    if (role === "commandement") {
        if (password !== "BLEU4ADMIN") {
            alert("Code commandement incorrect");
            return;
        }
    }

    // sauvegarde session
    const user = {
        login,
        role
    };

    localStorage.setItem("BLEU4_USER", JSON.stringify(user));

    // redirect
    window.location.href = "app.html";
});
