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

// Apply the filter immediately, even if the current view was rendered before this script loaded.
if(typeof navigate==='function')navigate('home');

/* Three strength sessions aligned with the Gravel + Massa program.
   Five guided exercises per session to retain the existing 30-minute timer. */
strengthPlans.splice(0,strengthPlans.length,
 {name:'Forza A · Parte superiore',focus:'Dorso, petto e spalle · lunedì',blocks:[
  ['Riscaldamento e mobilità',1,'4 min'],
  ['Trazioni assistite con elastico',3,'5–8 rip.'],
  ['Rematore TRX',3,'10–12 rip.'],
  ['Push-up',3,'8–12 rip.'],
  ['TRX Y-Raise',2,'10–12 rip.'],
  ['Curl TRX',2,'10–12 rip.']]},
 {name:'Forza B · Gambe e core',focus:'Gambe, stabilità e core · mercoledì',blocks:[
  ['Riscaldamento e mobilità',1,'4 min'],
  ['Squat con zaino',3,'10 rip.'],
  ['Affondi bulgari',2,'8 per gamba'],
  ['Stacco rumeno con zaino',3,'10 rip.'],
  ['Calf raise',2,'15 rip.'],
  ['Dead bug',2,'10 per lato']]},
 {name:'Forza C · Full body',focus:'Richiamo leggero · venerdì, facoltativo nello scarico',blocks:[
  ['Riscaldamento e mobilità',1,'4 min'],
  ['Rematore TRX',3,'10 rip.'],
  ['Push-up',3,'10 rip.'],
  ['TRX Y-Raise',2,'12 rip.'],
  ['Ponte glutei',2,'12 rip.'],
  ['Side plank',2,'30 sec per lato']]}
);
const originalChooseStrength=chooseStrength;
chooseStrength=function(){
 originalChooseStrength();
 const heading=main.querySelector('.pageHeading p');
 if(heading)heading.textContent='Tre schede A / B / C da circa 30 minuti, coordinate con il piano Gravel + Massa.';
 const banner=main.querySelector('.strengthBanner strong');
 if(banner)banner.textContent='Tre schede a settimana. Due nelle settimane più impegnative.';
 main.querySelectorAll('.planTile').forEach((tile,i)=>{
  const sub=tile.querySelectorAll('small');
  if(sub.length>1)sub[1].textContent='◷ circa 30 minuti · 5 esercizi guidati';
 });
};
