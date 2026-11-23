// Keep the rental checkout's original style order and first-paint scripts.
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {readHtmlTemplate} from './html-templates.mjs';

const publicDir=new URL('../public/',import.meta.url);
const styles=/<link rel="stylesheet" href="(\/[\w.-]+\.css)(?:\?[^"]*)?">/g;
const classic=/<script src="(\/[\w.-]+\.js)(?:\?[^"]*)?"><\/script>/g;
const tags=(html,pattern)=>[...html.matchAll(pattern)].map(match=>match[1]);
const join=async files=>(await Promise.all(files.map(file=>readFile(new URL(file.slice(1),publicDir),'utf8')))).join('\n');
const hash=text=>createHash('sha256').update(text).digest('hex').slice(0,12);
const configuration=async()=>{
 const source=await readHtmlTemplate('utvalg.html');
 const css=tags(source,styles),js=tags(source,classic);
 const sheet=await join(css),script=await join([...js,'/request-route-bootstrap.js']);
 return {css,js,sheet,script};
};
export async function buildEnquiryHead(write=false){
 const {css,js,sheet,script}=await configuration();
 const manifest=JSON.stringify({css,js,cssHash:hash(sheet),jsHash:hash(script)},null,2)+'\n';
 for(const [file,contents] of [['rental-enquiry-head.css',sheet],['rental-enquiry-head.js',script],['../server/enquiry-head-manifest.json',manifest]]){
  const url=new URL(file,publicDir);
  if(write)await writeFile(url,contents);
  else if(await readFile(url,'utf8')!==contents)throw Error('Regenerate checkout assets with node scripts/build-enquiry-bundle.mjs');
 }
}
export function streamlineHead(source,saved){
 if(JSON.stringify(tags(source,styles))!==JSON.stringify(saved.css)||JSON.stringify(tags(source,classic))!==JSON.stringify(saved.js))return source;
 // Run the small synchronous bootstrap before any blocking CSS. The module still runs after parsing.
 const entry=source.match(/<script type="module" src="(\/rental-enquiry\.bundle\.js[^"]*)"/)?.[1];
 const preload=entry?'<link rel="modulepreload" href="'+entry+'">':'';
 const sheet='/rental-enquiry-head.css?v='+saved.cssHash;
 source=source.replaceAll('src="/assets/konseptuell-leie-og-kjop-logo.png"', 'src="/assets/konseptuell-leie-og-kjop-logo.png" srcset="/assets/konseptuell-logo-600.webp 600w, /assets/konseptuell-logo-900.webp 900w, /assets/konseptuell-leie-og-kjop-logo.png 2172w" sizes="(max-width:640px) 180px, 250px"');
 return source.replace(classic,'').replace(styles,'').replace('</title>',`</title><link rel="preload" as="style" href="${sheet}">${preload}<script src="/rental-enquiry-head.js?v=${saved.jsHash}"></script><link rel="stylesheet" href="/rental-enquiry-head.css?v=${saved.cssHash}">`);
}
