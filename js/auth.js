const email=localStorage.getItem("isLoggedIn");
const time=localStorage.getItem("loginTime");

if(!email || !time){
    window.location.href="login.html";
}
else{
    const cTime=Date.now();
    const pTime=cTime-Number(time);

    const oneDay=24*60*60*1000;
    if(pTime>=oneDay){
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("loginTime");
        window.location.href="login.html";
    }
}

