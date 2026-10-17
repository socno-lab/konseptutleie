import html from '../../public/admin/index.html?raw';
import { getChatGPTUser } from '../chatgpt-auth';
import { isAdmin } from '../../lib/catalog';
export const dynamic='force-dynamic';
export async function GET(){const user=await getChatGPTUser();if(!user)return Response.redirect(new URL('/signin-with-chatgpt?return_to=%2Fadmin','https://konsept-utleie.astutechick6.chatgpt.site'),302);if(!isAdmin(user))return new Response('Du har ikke administratortilgang.',{status:403});return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});}
