/* NBA ATLAS install experience for Android Chrome and iOS Safari. */
(()=>{
  'use strict';
  const trigger=document.getElementById('install-trigger');
  const dialog=document.getElementById('install-dialog');
  const close=document.getElementById('install-close');
  const pwa=document.getElementById('install-pwa');
  const help=document.getElementById('install-help');
  if(!trigger||!dialog||!close||!pwa||!help)return;
  const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
  let pending=null;
  const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent);
  const update=()=>{
    trigger.hidden=standalone();
    pwa.hidden=!pending;
    if(isiOS)help.innerHTML='Σε Safari: <b>Κοινή χρήση → Προσθήκη στην οθόνη Αφετηρίας</b>.';
    else help.innerHTML='Σε Android Chrome: <b>⋮ → Εγκατάσταση εφαρμογής</b> ή <b>Προσθήκη στην αρχική οθόνη</b>.';
  };
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();pending=event;update();});
  window.addEventListener('appinstalled',()=>{pending=null;update();dialog.close();});
  trigger.addEventListener('click',()=>{update();if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');});
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  pwa.addEventListener('click',async()=>{
    if(!pending)return;
    const event=pending;pending=null;update();
    try{await event.prompt();await event.userChoice;}catch(_){}
    update();
  });
  update();
})();
