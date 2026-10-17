import {createServer} from './app-server.mjs';

// Hostinger imports the entry file, so listen must run without an argv/main guard.
const port=Number(process.env.PORT||3000);
if(!Number.isInteger(port)||port<0||port>65535)throw Error('Ugyldig PORT.');
const server=createServer();
server.listen(port,'0.0.0.0',()=>console.log(`Konsept Utleie lytter på port ${server.address().port}`));
