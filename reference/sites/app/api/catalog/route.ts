import { readCatalog, publicCatalog, isAdmin } from '../../../lib/catalog';
import { getChatGPTUser } from '../../chatgpt-auth';
export const dynamic='force-dynamic';
export async function GET(){try{const catalog=await readCatalog();return Response.json({...catalog,products:publicCatalog(catalog.products),canAdmin:isAdmin(await getChatGPTUser())},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Katalogen kunne ikke lastes. Prøv igjen.'},{status:503});}}
