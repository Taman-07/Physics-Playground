const loginForm=document.getElementById("loginForm");
const loginMsg=document.getElementById("loginMessage");

loginForm.addEventListener("submit", async(e)=>{
    e.preventDefault();
    const email=document.getElementById("email").value.trim();
    const password=document.getElementById("password").value;

    loginMsg.style.color = "#ff8e9e";

    const existingUser=localStorage.getItem("users");
    if(!existingUser){
        loginMsg.textContent="No account found. Please sign up.";
        return;
    }

    const users=JSON.parse(existingUser);
    const user=users.find(user => user.email === email);
    if(!user){
        loginMsg.textContent = "Incorrect email or password.";
        return;
    }
    const hashedPwd=await hashPassword(password);

    if(hashedPwd===user.password){
        localStorage.setItem("isLoggedIn", user.email);
        localStorage.setItem("loginTime", Date.now());
        loginMsg.style.color = "#7dffb0";
        loginMsg.textContent="Login successful!";
        setTimeout(() => {
            window.location.href = "index.html";
        }, 500);
    }
    else{
        loginMsg.textContent="Incorrect email or password.";
    }
});

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    return hashArray.map(byte => byte.toString(16).padStart(2, "0")).join("");
}
