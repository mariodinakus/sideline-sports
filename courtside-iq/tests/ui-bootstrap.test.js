import test from 'node:test';
import assert from 'node:assert/strict';

// The static JavaScript entrypoint must boot on every hash route. Syntax checks
// alone cannot catch a missing variable in the route registry at module load.
const routes = ['dashboard','archive','awards','analytics','goat','twins','future','rookies','methodology','season','news','nations','globalgoat','visuals','players','matchlab','livecenter','teamlab','evolution','academy'];
const nodes = new Map();
const element = selector => {
  if (!nodes.has(selector)) nodes.set(selector, {
    innerHTML:'', textContent:'', value:'', dataset:{}, style:{},
    classList:{add(){},remove(){},toggle(){}},
    addEventListener(){}, focus(){}, setSelectionRange(){}
  });
  return nodes.get(selector);
};
globalThis.document = {
  querySelector: element, querySelectorAll: () => [], addEventListener(){},
  documentElement: {lang:'en'}
};
globalThis.history = {replaceState(){}};
globalThis.window = {addEventListener(){}, scrollTo(){}};
globalThis.fetch = async () => ({ok:false,status:503});

for (const [index, route] of routes.entries()) {
  test(`frontend boots and renders ${route} route`, async () => {
    globalThis.location = {hash:'#'+route};
    await import(`../studio.js?smoke=${index}`);
    assert.ok(element('#content').innerHTML.length > 500);
    assert.ok(element('#crumb').textContent.length > 0);
  });
}