const launchButtons=document.querySelectorAll(".launch-lab");

const labPages={
    planets:"labs/planets.html",
    mechanics:"labs/mechanics.html",
    optics:"labs/optics.html",
    collisions:"labs/collisions.html",
    magnetism:"labs/magnetism.html"
};

launchButtons.forEach(button=>{
    button.addEventListener("click",()=>{
        const labName=button.dataset.lab;
        if(labPages[labName]){
            window.location.href=labPages[labName];
        }
    });
});
