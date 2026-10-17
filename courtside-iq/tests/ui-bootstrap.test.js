import test from 'node:test';
import assert from 'node:assert/strict';

// Verify the real browser entrypoint loads across routes. Syntax-only tests
// cannot catch undefined variables evaluated at module startup.
const routes=['dashboard','archive','awards','analytics','goat','twins','future','rookies','methodology'];
const nodes=new Map();
const element=selector=>{
 if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',textContent:'',value:'',dataset:{},style:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},focus(){},setSelectionRange(){}});
 return nodes.get(selector);
};
globalThis.document={querySelector:element,querySelectorAll:()=>[],addEventListener(){},documentElement:{lang:'en'}};
globalThis.history={replaceState(){}};
globalThis.window={addEventListener(){},scrollTo(){}};
globalThis.fetch=async()=>({ok:false,status:503});
for(const [index,route] of routes.entries()){
 test('frontend boots and renders '+route,async()=>{
   globalThis.location={hash:'#'+route};
   await import('../studio.js?smoke='+index);
   assert.ok(element('#content').innerHTML.length>500);
   assert.ok(element('#crumb').textContent.length>0);
 });
}
