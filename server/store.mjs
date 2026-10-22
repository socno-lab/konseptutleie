import {defaultSettings} from '../public/site-settings.js';
import {deliveryCallLimits} from './delivery.mjs';
import mysql from 'mysql2/promise';
import {randomBytes,createHash} from 'node:crypto';
import {migrateProducts} from './walls.mjs';
import {removeRetiredCosts} from './catalog.mjs';

export function createMysqlStore(env,seed){
 const enabled=!!(env.DB_HOST&&env.DB_USER&&env.DB_NAME&&env.DB_PASSWORD);
 const pool=enabled?mysql.createPool({host:env.DB_HOST,port:Number(env.DB_PORT||3306),user:env.DB_USER,password:env.DB_PASSWORD,database:env.DB_NAME,connectionLimit:5,queueLimit:30,connectTimeout:8000,charset:'utf8mb4',timezone:'Z',ssl:env.DB_SSL==='true'?{rejectUnauthorized:true}:undefined}):null;
 let ready;
 async function init(){
  if(!enabled)throw Error('Database er ikke konfigurert.');
  if(!ready)ready=(async()=>{
   for(const sql of [
    'CREATE TABLE IF NOT EXISTS ku_site_settings (id INT PRIMARY KEY, revision INT NOT NULL, body LONGTEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS ku_catalog (id INT PRIMARY KEY, revision INT NOT NULL, body LONGTEXT NOT NULL, updated_at DATETIME(3) NOT NULL)',
    'CREATE TABLE IF NOT EXISTS ku_discounts (id INT PRIMARY KEY, revision INT NOT NULL, body LONGTEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS ku_admin (id INT PRIMARY KEY, email VARCHAR(254) NOT NULL, password_hash VARCHAR(255) NOT NULL)',
    'CREATE TABLE IF NOT EXISTS ku_sessions (token_hash CHAR(64) PRIMARY KEY, expires_at BIGINT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS ku_login_limits (bucket CHAR(64) PRIMARY KEY, attempts INT NOT NULL, reset_at BIGINT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS ku_delivery_limits (bucket VARCHAR(16) PRIMARY KEY, attempts INT NOT NULL, reset_at BIGINT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS ku_media_purged (url VARCHAR(500) PRIMARY KEY)',
    'CREATE TABLE IF NOT EXISTS ku_media_state (url VARCHAR(500) PRIMARY KEY, deleted_at DATETIME(3) NOT NULL)',
    'CREATE TABLE IF NOT EXISTS ku_media (id CHAR(32) PRIMARY KEY, digest CHAR(64) UNIQUE NOT NULL, name VARCHAR(200) NOT NULL, mime VARCHAR(50) NOT NULL, bytes INT NOT NULL, body LONGBLOB NOT NULL, created_at DATETIME(3) NOT NULL)'
   ])await pool.query(sql);
   await pool.execute("INSERT IGNORE INTO ku_discounts (id,revision,body) VALUES (1,1,'[]')");
   await pool.execute('INSERT IGNORE INTO ku_site_settings(id,revision,body) VALUES(1,1,?)',[JSON.stringify(defaultSettings)]);
   await pool.execute('INSERT IGNORE INTO ku_catalog (id,revision,body,updated_at) VALUES (1,?,?,?)',[Math.max(1,seed.revision||1),JSON.stringify(migrateProducts(removeRetiredCosts(seed.products))),new Date()]);
   // Remove the retired field from storage, including hidden and trashed products.
   const connection=await pool.getConnection();
   try{
    await connection.beginTransaction();
    const [[row]]=await connection.execute('SELECT body FROM ku_catalog WHERE id=1 FOR UPDATE');
    const products=JSON.parse(row.body),cleaned=removeRetiredCosts(products);
    if(products.some(product=>Object.hasOwn(product,'acquisitionCost')))
     await connection.execute('UPDATE ku_catalog SET revision=revision+1,body=?,updated_at=? WHERE id=1',[JSON.stringify(cleaned),new Date()]);
    await connection.commit();
   }catch(error){await connection.rollback();throw error;}finally{connection.release();}
  })().catch(error=>{ready=null;throw error;});
  return ready;
 }
 async function query(sql,args=[]){await init();return pool.execute(sql,args);}
 async function mutateCatalog(revision,products,urls){
  products=removeRetiredCosts(products);
  await init();const connection=await pool.getConnection(),updatedAt=new Date();
  try{await connection.beginTransaction();const [[current]]=await connection.execute('SELECT revision FROM ku_catalog WHERE id=1 FOR UPDATE');if(current.revision!==revision){await connection.rollback();return null;}
   const [purged]=await connection.execute('SELECT url FROM ku_media_purged');const unavailable=new Set([...purged.map(row=>row.url),...urls]);
   if(products.some(p=>[p.image,p.wallCover,p.builderImage,...(p.gallery||[])].some(url=>unavailable.has(url))))throw Object.assign(Error('Et bilde er slettet permanent. Velg et annet bilde og lagre på nytt.'),{status:409});
   for(const url of urls){const [[trash]]=await connection.execute('SELECT url FROM ku_media_state WHERE url=? FOR UPDATE',[url]);if(!trash)throw Object.assign(Error('Papirkurven er endret. Last inn på nytt.'),{status:409});await connection.execute('INSERT IGNORE INTO ku_media_purged(url) VALUES (?)',[url]);if(/^\/media\/[a-f0-9]{32}$/.test(url))await connection.execute('DELETE FROM ku_media WHERE id=?',[url.slice(7)]);await connection.execute('DELETE FROM ku_media_state WHERE url=?',[url]);}
   await connection.execute('UPDATE ku_catalog SET revision=revision+1,body=?,updated_at=? WHERE id=1',[JSON.stringify(products),updatedAt]);await connection.commit();return {revision:revision+1,products,updatedAt};
  }catch(error){await connection.rollback();throw error;}finally{connection.release();}
 }
 return {enabled,init,async close(){if(pool)await pool.end();},
  async reserveDeliveryCall(now){
   await init();const connection=await pool.getConnection();
   try{await connection.beginTransaction();
    for(const limit of deliveryCallLimits){
     const until=(Math.floor(now/limit.ms)+1)*limit.ms;
     await connection.execute('INSERT IGNORE INTO ku_delivery_limits(bucket,attempts,reset_at) VALUES (?,0,?)',[limit.name,until]);
     const [[row]]=await connection.execute('SELECT attempts,reset_at FROM ku_delivery_limits WHERE bucket=? FOR UPDATE',[limit.name]);
     const count=Number(row.reset_at)>now?row.attempts:0;
     if(count>=limit.max){await connection.rollback();return false;}
     await connection.execute('UPDATE ku_delivery_limits SET attempts=?,reset_at=? WHERE bucket=?',[count+1,until,limit.name]);
    }await connection.commit();return true;
   }catch(error){await connection.rollback();throw error;}finally{connection.release();}
  },
  async readDiscountCodes(){const [[r]]=await query('SELECT revision,body FROM ku_discounts WHERE id=1');return {revision:r.revision,codes:JSON.parse(r.body)};},
  async saveDiscountCodes(revision,codes){const [r]=await query('UPDATE ku_discounts SET revision=revision+1,body=? WHERE id=1 AND revision=?',[JSON.stringify(codes),revision]);return r.affectedRows?{revision:revision+1,codes}:null;},
  async readSiteSettings(){const [[r]]=await query('SELECT revision,body FROM ku_site_settings WHERE id=1');return {revision:r.revision,settings:JSON.parse(r.body)};},
  async saveSiteSettings(revision,settings){const [r]=await query('UPDATE ku_site_settings SET revision=revision+1,body=? WHERE id=1 AND revision=?',[JSON.stringify(settings),revision]);return r.affectedRows?{revision:revision+1,settings}:null;},
  async readCatalog(){const [[r]]=await query('SELECT revision,body,updated_at FROM ku_catalog WHERE id=1');return {revision:r.revision,products:migrateProducts(removeRetiredCosts(JSON.parse(r.body))),updatedAt:r.updated_at};},
  async saveCatalog(revision,products){return mutateCatalog(revision,products,[]);},
  async purgeTrash(revision,products,urls){return mutateCatalog(revision,products,urls);},
  async purgedMedia(){const [rows]=await query('SELECT url FROM ku_media_purged');return rows.map(row=>row.url);},
  async admin(){const [[r]]=await query('SELECT email,password_hash AS passwordHash FROM ku_admin WHERE id=1');return r||null;},
  async createAdmin(email,passwordHash){const [r]=await query('INSERT IGNORE INTO ku_admin (id,email,password_hash) VALUES (1,?,?)',[email,passwordHash]);return r.affectedRows===1;},
  async changePassword(sessionHash,passwordHash){
   await init();const connection=await pool.getConnection();
   try{await connection.beginTransaction();await connection.execute('SELECT id FROM ku_admin WHERE id=1 FOR UPDATE');const [[session]]=await connection.execute('SELECT token_hash FROM ku_sessions WHERE token_hash=? AND expires_at>?',[sessionHash,Date.now()]);if(!session){await connection.rollback();return false;}await connection.execute('UPDATE ku_admin SET password_hash=? WHERE id=1',[passwordHash]);await connection.execute('DELETE FROM ku_sessions');await connection.commit();return true;}catch(error){await connection.rollback();throw error;}finally{connection.release();}
  },
  async session(hash){const [[r]]=await query('SELECT expires_at AS expiresAt FROM ku_sessions WHERE token_hash=? AND expires_at>?',[hash,Date.now()]);return r||null;},
  async addSession(hash,expiresAt){await query('DELETE FROM ku_sessions WHERE expires_at<?',[Date.now()]);await query('INSERT INTO ku_sessions(token_hash,expires_at) VALUES (?,?)',[hash,expiresAt]);},
  async removeSession(hash){await query('DELETE FROM ku_sessions WHERE token_hash=?',[hash]);},
  async attempt(bucket){const now=Date.now(),until=now+15*60*1000;await query('INSERT INTO ku_login_limits(bucket,attempts,reset_at) VALUES (?,1,?) ON DUPLICATE KEY UPDATE attempts=IF(reset_at<?,1,attempts+1),reset_at=IF(reset_at<?,VALUES(reset_at),reset_at)',[bucket,until,now,now]);const [[r]]=await query('SELECT attempts FROM ku_login_limits WHERE bucket=?',[bucket]);return r.attempts<=10;},
  async resetAttempts(bucket){await query('DELETE FROM ku_login_limits WHERE bucket=?',[bucket]);},
  async mediaTrashState(){const [rows]=await query('SELECT url,deleted_at FROM ku_media_state');return Object.fromEntries(rows.map(row=>[row.url,row.deleted_at]));},
  async trashMedia(url){await query('INSERT INTO ku_media_state(url,deleted_at) VALUES (?,?) ON DUPLICATE KEY UPDATE deleted_at=VALUES(deleted_at)',[url,new Date()]);},
  async restoreMedia(url){await query('DELETE FROM ku_media_state WHERE url=?',[url]);},
  async mediaList(){const [r]=await query('SELECT id,name,mime,bytes,created_at AS createdAt FROM ku_media ORDER BY created_at DESC LIMIT 2000');return r.map(x=>({...x,url:'/media/'+x.id,source:'upload'}));},
  async media(id){const [[r]]=await query('SELECT mime,body FROM ku_media WHERE id=?',[id]);return r||null;},
  async addMedia(name,mime,body){const digest=createHash('sha256').update(body).digest('hex'),id=randomBytes(16).toString('hex');await query('INSERT IGNORE INTO ku_media(id,digest,name,mime,bytes,body,created_at) VALUES (?,?,?,?,?,?,?)',[id,digest,name,mime,body.length,body,new Date()]);const [[r]]=await query('SELECT id,name,mime,bytes,created_at AS createdAt FROM ku_media WHERE digest=?',[digest]);return {...r,url:'/media/'+r.id,source:'upload'};}
 };
}
