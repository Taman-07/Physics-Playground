const signInForm = document.getElementById("signIn");
const signInMessage = document.getElementById("signInMessage");

const nameRegex = /^[A-Za-z]{2,}(?: [A-Za-z]{2,})*$/;
const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,64}$/;


signInForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    signInMessage.style.color = "#ff8e9e";

    if (!nameRegex.test(name)) {
        signInMessage.textContent = "Name must contain only letters and spaces (at least 2 letters).";
        return;
    }

    if (!emailRegex.test(email)) {
        signInMessage.textContent = "Please enter a valid email address.";
        return;
    }

    if (!passwordRegex.test(password)) {
        signInMessage.textContent =
            "Password must be 8-64 characters with uppercase, lowercase, number and special character (@$!%*?&).";
        return;
    }

    const existingUser = localStorage.getItem("user");
    if (existingUser) {
        const savedUser = JSON.parse(existingUser);
        if (savedUser.email === email) {
            signInMessage.textContent = "An account with this email already exists. Please log in.";
            return;
        }
    }
    try {
        const hashedPwd = await hashPassword(password);
        const user = {
            name: name,
            email: email,
            password: hashedPwd
        };
        localStorage.setItem("user", JSON.stringify(user));

        signInMessage.style.color = "#7dffb0";
        signInMessage.textContent = "User created successfully!";

        setTimeout(function () {
            window.location.href = "login.html";
        }, 1000);

    } 
    catch (error){
        console.error(error);
        signInMessage.textContent = "Something went wrong. Please try again.";
    }
});


async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    return hashArray.map(byte => byte.toString(16).padStart(2, "0")).join("");
}