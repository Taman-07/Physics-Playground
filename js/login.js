const loginForm=document.getElementById("loginForm");
const loginMsg=document.getElementById("loginMessage");

loginForm.addEventListener("submit", async(e)=>{
    e.preventDefault();
    const email=document.getElementById("email").value.trim();
    const password=document.getElementById("password").value;

    loginMsg.style.color = "#ff8e9e";

    const existingUser=localStorage.getItem("user");
    if(!existingUser){
        loginMsg.textContent="No account found. Please sign up.";
        return;
    }

    const user=JSON.parse(existingUser);
    const hashedPwd=await hashPassword(password);

    if(email===user.email && hashedPwd===user.password){
        localStorage.setItem("isLoggedIn", user.email);
        loginMsg.style.color = "#7dffb0";
        loginMsg.textContent="Login successful!";
        setTimeout(() => {
            window.location.href = "laboratories.html";
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
