import test from 'node:test';
import assert from 'node:assert/strict';
import {access} from 'node:fs/promises';
import {aboutTeam} from '../server/about-page.mjs';
import {readHtmlTemplate} from '../server/html-templates.mjs';
import {pageModel,renderSeo,sitemap} from '../server/seo.mjs';
test('about page renders the approved seven people and local portraits before JavaScript',async()=>{
 const html=renderSeo(await readHtmlTemplate('index.html'),pageModel('/om-oss',new URLSearchParams(),[]),[],true);
 assert.equal(aboutTeam.length,7);
 for(const [name,,photo] of aboutTeam){assert.ok(html.includes(name));if(photo)await access(new URL('../public/assets/team/'+photo+'.jpg',import.meta.url));}
 assert.doesNotMatch(html,/Rebecca|id="homeUseCases"|src="\/app.js/);
 assert.match(html,/<link rel="canonical" href="https:\/\/konseptuell.no\/om-oss">/);
 assert.match(html,/href="\/foresporsel.html"/);
 assert.match(sitemap([],true),/https:\/\/konseptuell.no\/om-oss/);
});
