'use strict';
// UI-only: preserve all historical activities and original backup/sync format.
delete types.mtb;
delete types.corsa;
delete types.trekking;
const originalPlanner=trainingPlanner;
trainingPlanner=function(){
 originalPlanner();
 const select=document.querySelector('#planType');
 if(select)for(const value of ['mtb','corsa'])select.querySelector('option[value="'+value+'"]')?.remove();
};
const originalStats=stats;
stats=function(){
 originalStats();
 const title=main.querySelector('h2');
 if(title)title.textContent='Statistiche Gravel + Corpo Libero';
 const section=[...main.querySelectorAll('section')].find(el=>el.querySelector('h2')?.textContent==='Tempo per attività');
 if(section){
  const rows=[...section.querySelectorAll('.row')];
  for(const row of rows){
   const label=row.querySelector('span')?.textContent||'';
   if(!label.includes('Gravel')&&!label.includes('Corpo Libero')){
    const next=row.nextElementSibling;
    if(next?.classList.contains('progress'))next.remove();
    row.remove();
   }
  }
 }
};
const originalCycling=cyclingDashboard;
cyclingDashboard=function(){
 originalCycling();
 const eyebrow=main.querySelector('.pageHeading .eyebrow');
 if(eyebrow)eyebrow.textContent='GRAVEL · RESISTENZA';
};
const originalSettings=settings;
settings=function(){
 originalSettings();
 main.querySelectorAll('p').forEach(p=>{
  if(p.textContent.includes('My Training 1.9.2'))p.textContent=p.textContent.replace('1.9.2','1.9.3');
 });
};
