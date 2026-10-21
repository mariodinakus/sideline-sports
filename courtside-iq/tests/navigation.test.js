import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NAV_GROUPS,NAV_ROUTES,groupFor,pageFor,navigationMatches} from '../lib/navigation.js';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const studio=readFileSync(new URL('../studio.js',import.meta.url),'utf8');

test('seven user-oriented categories cover 26 tools without duplicates',()=>{
 assert.equal(NAV_GROUPS.length,7);
 assert.equal(NAV_ROUTES.length,27); // Overview + 26 tools
 assert.equal(new Set(NAV_ROUTES).size,NAV_ROUTES.length);
 for (const group of NAV_GROUPS){
  assert.ok(group.label && group.description);
  assert.ok(group.pages.length>=2);
  for(const page of group.pages){
   assert.equal(groupFor(page.route)?.id,group.id);
   assert.equal(pageFor(page.route)?.label,page.label);
  }
 }
});

test('all twenty-seven screens have an accessible deep-linked navigation item',()=>{
 for (const route of NAV_ROUTES){
  assert.ok(html.includes(`data-tab="${route}"`),`missing ${route}`);
  assert.ok(NAV_ROUTES.includes(route),`unregistered route ${route}`);
 }
});

test('every category can be expanded and collapsed with accessible controls',()=>{
 for(const group of NAV_GROUPS){
  assert.ok(html.includes(`data-group-toggle="${group.id}"`));
  assert.ok(html.includes(`aria-controls="group-${group.id}"`));
  assert.ok(html.includes(`id="group-${group.id}" hidden`));
 }
 assert.ok(studio.includes('aria-expanded'));
});

test('navigation lookup supports advanced-stats synonyms and section labels',()=>{
 assert.ok(navigationMatches('academy','RAPTOR'));
 assert.ok(navigationMatches('visuals','spider'));
 assert.ok(navigationMatches('livecenter','standings'));
 assert.ok(navigationMatches('nations','World Cup'));
 assert.ok(navigationMatches('globalgoat','greatest'));
 assert.equal(navigationMatches('nations','headshots'),false);
});

test('navigation preserves existing hash routes and contextual links',()=>{
 assert.equal(pageFor('dashboard').label,'Overview');
 assert.equal(pageFor('missing'),null);
 assert.ok(studio.includes('sectionTabs()'));
 assert.ok(studio.includes("history.replaceState(null,'','#'+ST.tab)"));
});