const labAccess=document.getElementById("laboratoriesLink");
labAccess.addEventListener("click", (e)=>{
    e.preventDefault();
    const loginDetails=localStorage.getItem("isLoggedIn");
    if(loginDetails){
        window.location.href="laboratories.html";
    }
    else{
        window.location.href="login.html";
    }
});

