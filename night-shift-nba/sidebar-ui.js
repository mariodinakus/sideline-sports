/* NBA ATLAS navigation controller: persistent compact rail + mobile drawer. */
(function(){
'use strict';
const key='nba-atlas-sidebar-compact';
let compact=false;
try{compact=localStorage.getItem(key)==='1'}catch(e){}
if(compact)document.documentElement.classList.add('atlas-rail-compact');
const close=()=>{document.body.classList.remove('atlas-drawer-open');document.getElementById('nav-mobile-open')?.setAttribute('aria-expanded','false')};
const setToggle=()=>{
const b=document.getElementById('nav-toggle');if(!b)return;
const collapsed=document.documentElement.classList.contains('atlas-rail-compact');
b.textContent=collapsed?'»':'«';b.setAttribute('aria-expanded',String(!collapsed));b.setAttribute('aria-label',collapsed?'Expand navigation':'Collapse navigation');b.title=collapsed?'Expand menu':'Collapse menu'};
const open=()=>{document.body.classList.add('atlas-drawer-open');document.getElementById('nav-mobile-open')?.setAttribute('aria-expanded','true')};
document.addEventListener('click',e=>{
 if(e.target.closest('#nav-toggle')){compact=!document.documentElement.classList.contains('atlas-rail-compact');document.documentElement.classList.toggle('atlas-rail-compact',compact);try{localStorage.setItem(key,compact?'1':'0')}catch(_){}setToggle();return}
 if(e.target.closest('#nav-mobile-open,#nav-mobile-more')){open();return}
 if(e.target.closest('#nav-mobile-close,#nav-overlay')){close();return}
 if(e.target.closest('#desktop-nav [data-go]'))close();
});
window.addEventListener('hashchange',close);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('atlas-drawer-open'))close()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setToggle);else setToggle();
})();