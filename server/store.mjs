import {mergeOakTables,mergeOakWorkflow,retiredOakTableId} from './oak-table-migration.mjs';
import {workflowRecord,rentalWorkflowSource} from './enquiry-workflow.mjs';
import {workflowStore} from './workflow-store.mjs';
import {adminCodeStore} from './admin-code-store.mjs';
import {migrateCatalogDimensions} from './dimensions-migration.mjs';
import {migrateStylingPricing} from './pricing-migration.mjs';
import {defaultSettings} from '../public/site-settings.js?v=fest20261114';
import {deliveryCallLimits} from './delivery.mjs';
import {stylingStore,stylingSchema,createStylingItem} from './styling-store.mjs';
import mysql from 'mysql2/promise';
import {randomBytes,createHash} from 'node:crypto';
import {migrateProducts} from './walls.mjs';
import {catalogImageBounds} from '../public/catalog-image-bounds.js';
import {backfillProductBrands} from '../public/product-brand.js';
import {removeRetiredCosts} from './catalog.mjs';

export function createMysqlStore(env,seed){
 const enabled=!!(env.DB_HOST&&env.DB_USER&&env.DB_NAME&&env.DB_PASSWORD);
 const pool=enabled?mysql.createPool({host:env.DB_HOST,port:Number(env.DB_PORT||3306),user:env.DB_USER,password:env.DB_PASSWORD,database:env.DB_NAME,connectionLimit:5,queueLimit:30,connectTimeout:8000,charset:'utf8mb4',timezone:'Z',ssl:env.DB_SSL==='true'?{rejectUnauthorized:true}:undefined}):null;
 let ready;
 async function init(){
  if(!enabled)throw Error('Database er ikke konfigurert.');
  if(!ready)ready=(async()=>{
   for(const sql of [
    ...stylingSchema,
    'CREATE TABLE IF NOT EXISTS ku_catalog_migrations (name VARCHAR(100) PRIMARY KEY)',
    'CREATE TABLE IF NOT EXISTS ku_workflow (id CHAR(36) PRIMARY KEY, body LONGTEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS ku_warehouse_documents (confirmation_id CHAR(36) PRIMARY KEY,order_id CHAR(36) NOT NULL,picklist LONGBLOB NOT NULL,labels LONGBLOB,sent_at BIGINT,FOREIGN KEY(order_id) REFERENCES ku_workflow(id) ON DELETE CASCADE)',
    'CREATE TABLE IF NOT EXISTS ku_site_settings (id INT PRIMARY KEY, revision INT NOT NULL, body LONGTEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS ku_catalog (id INT PRIMARY KEY, revision INT NOT NULL, body LONGTEXT NOT NULL, updated_at DATETIME(3) NOT NULL)',
    'CREATE TABLE IF NOT EXISTS ku_discounts (id INT PRIMARY KEY, revision INT NOT NULL, body LONGTEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS ku_admin (id INT PRIMARY KEY, email VARCHAR(254) NOT NULL, password_hash VARCHAR(255) NOT NULL)',
    'CREATE TABLE IF NOT EXISTS ku_admin_email_code (id INT PRIMARY KEY, token_hash CHAR(64) NOT NULL, code_hash CHAR(64) NOT NULL, admin_hash CHAR(64) NOT NULL, expires_at BIGINT NOT NULL, attempts INT NOT NULL, send_after BIGINT NOT NULL, window_start BIGINT NOT NULL, sends INT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS ku_admin_mfa_sessions (token_hash CHAR(64) PRIMARY KEY, expires_at BIGINT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS ku_login_limits (bucket CHAR(64) PRIMARY KEY, attempts INT NOT NULL, reset_at BIGINT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS ku_delivery_limits (bucket VARCHAR(16) PRIMARY KEY, attempts INT NOT NULL, reset_at BIGINT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS ku_enquiries (id CHAR(36) PRIMARY KEY, fingerprint CHAR(64) NOT NULL, body LONGTEXT NOT NULL, created_at BIGINT NOT NULL, INDEX(created_at))',
    "CREATE TABLE IF NOT EXISTS ku_enquiry_mail (submission_id CHAR(36) NOT NULL, channel VARCHAR(12) NOT NULL, status VARCHAR(16) NOT NULL DEFAULT 'pending', attempts INT NOT NULL DEFAULT 0, next_at BIGINT NOT NULL, lease_until BIGINT NOT NULL DEFAULT 0, PRIMARY KEY(submission_id,channel), INDEX(status,next_at))",
    'CREATE TABLE IF NOT EXISTS ku_submissions (id CHAR(36) PRIMARY KEY, fingerprint CHAR(64) NOT NULL, status VARCHAR(16) NOT NULL, created_at BIGINT NOT NULL, INDEX(created_at))',
    'CREATE TABLE IF NOT EXISTS ku_submission_limits (bucket VARCHAR(90) PRIMARY KEY, attempts INT NOT NULL, reset_at BIGINT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS ku_media_purged (url VARCHAR(500) PRIMARY KEY)',
    'CREATE TABLE IF NOT EXISTS ku_media_state (url VARCHAR(500) PRIMARY KEY, deleted_at DATETIME(3) NOT NULL)',
    'CREATE TABLE IF NOT EXISTS ku_media (id CHAR(32) PRIMARY KEY, digest CHAR(64) UNIQUE NOT NULL, name VARCHAR(200) NOT NULL, mime VARCHAR(50) NOT NULL, bytes INT NOT NULL, body LONGBLOB NOT NULL, created_at DATETIME(3) NOT NULL)',
    'CREATE TABLE IF NOT EXISTS ku_media_bounds (id CHAR(32) PRIMARY KEY, bounds VARCHAR(100) NOT NULL, FOREIGN KEY(id) REFERENCES ku_media(id) ON DELETE CASCADE)'
   ])await pool.query(sql);
   await pool.execute("INSERT IGNORE INTO ku_discounts (id,revision,body) VALUES (1,1,'[]')");
   await pool.execute('INSERT IGNORE INTO ku_site_settings(id,revision,body) VALUES(1,1,?)',[JSON.stringify(defaultSettings)]);
   await pool.execute('INSERT IGNORE INTO ku_catalog (id,revision,body,updated_at) VALUES (1,?,?,?)',[Math.max(1,seed.revision||1),JSON.stringify(migrateProducts(removeRetiredCosts(seed.products))),new Date()]);
   // Remove the retired field from storage, including hidden and trashed products.
   const connection=await pool.getConnection();
   try{
    await connection.beginTransaction();
    const [[settingsRow]]=await connection.execute('SELECT body FROM ku_site_settings WHERE id=1 FOR UPDATE');
    const currentSettings=JSON.parse(settingsRow.body),nextSettings=migrateStylingPricing(currentSettings);
    if(nextSettings!==currentSettings)await connection.execute('UPDATE ku_site_settings SET revision=revision+1,body=? WHERE id=1',[JSON.stringify(nextSettings)]);
    const [[row]]=await connection.execute('SELECT body FROM ku_catalog WHERE id=1 FOR UPDATE');
    const products=JSON.parse(row.body),cleaned=mergeOakTables(migrateCatalogDimensions(removeRetiredCosts(products)));
    const [addition]=await connection.execute('INSERT IGNORE INTO ku_catalog_migrations (name) VALUES (?)',['rental-furniture-20261123']);
    if(addition.affectedRows){
     const ids=new Set(['obj_ikea_skansnas_brun','obj_ikea_skansnas_lys','obj_hm_nattbord_1108352003','obj_ikea_vihals_gronn']);
     for(const item of seed.products){
      if(ids.has(item.id)&&!cleaned.some(existing=>existing.id===item.id))cleaned.push(item);
     }
    }
    const [chairCategories]=await connection.execute('INSERT IGNORE INTO ku_catalog_migrations (name) VALUES (?)',['dining-chair-categories-20261123']);
    if(chairCategories.affectedRows){
     const chairIds=new Set(['obj_ikea_skansnas_brun','obj_ikea_skansnas_lys','obj_ikea_vihals_gronn']);
     for(const item of cleaned){
      if(chairIds.has(item.id)&&!item.subcategory)item.subcategory='Spisestoler';
     }
    }
    const branded=backfillProductBrands(cleaned);
    if(JSON.stringify(products)!==JSON.stringify(branded))
     await connection.execute('UPDATE ku_catalog SET revision=revision+1,body=?,updated_at=? WHERE id=1',[JSON.stringify(branded),new Date()]);
    if(products.some(p=>p.id===retiredOakTableId)){const [workflows]=await connection.execute('SELECT body FROM ku_workflow FOR UPDATE');
    for(const row of workflows){const r=JSON.parse(row.body),next=mergeOakWorkflow(r);if(next!==r)await connection.execute('UPDATE ku_workflow SET body=? WHERE id=?',[JSON.stringify(next),r.id]);}}
    await connection.commit();
   }catch(error){await connection.rollback();throw error;}finally{connection.release();}
  })().catch(error=>{ready=null;throw error;});
  return ready;
 }
 async function query(sql,args=[]){await init();return pool.execute(sql,args);}
 async function mutateCatalog(revision,products,urls,registration){
  products=removeRetiredCosts(products);
  await init();const connection=await pool.getConnection(),updatedAt=new Date();
  try{await connection.beginTransaction();const [[current]]=await connection.execute('SELECT revision FROM ku_catalog WHERE id=1 FOR UPDATE');if(current.revision!==revision){await connection.rollback();return null;}
   const [purged]=await connection.execute('SELECT url FROM ku_media_purged');const unavailable=new Set([...purged.map(row=>row.url),...urls]);
   if(products.some(p=>[p.image,p.wallCover,p.builderImage,...(p.gallery||[])].some(url=>unavailable.has(url))))throw Object.assign(Error('Et bilde er slettet permanent. Velg et annet bilde og lagre på nytt.'),{status:409});
   for(const url of urls){const [[trash]]=await connection.execute('SELECT url FROM ku_media_state WHERE url=? FOR UPDATE',[url]);if(!trash)throw Object.assign(Error('Papirkurven er endret. Last inn på nytt.'),{status:409});await connection.execute('INSERT IGNORE INTO ku_media_purged(url) VALUES (?)',[url]);if(/^\/media\/[a-f0-9]{32}$/.test(url))await connection.execute('DELETE FROM ku_media WHERE id=?',[url.slice(7)]);await connection.execute('DELETE FROM ku_media_state WHERE url=?',[url]);}
   const ids=[];
   if(registration){
    const {product,count,actor}=registration;
    await connection.execute('INSERT INTO ku_styling_catalog_stock(product) VALUES (?)',[product.id]);
    for(let i=0;i<count;i++)ids.push(await createStylingItem(connection,product,actor));
   }
   await connection.execute('UPDATE ku_catalog SET revision=revision+1,body=?,updated_at=? WHERE id=1',[JSON.stringify(products),updatedAt]);await connection.commit();return {revision:revision+1,products,updatedAt,...(registration?{ids}:{})};
  }catch(error){await connection.rollback();throw error;}finally{connection.release();}
 }
 const workflow=workflowStore(init,pool);
 return {...workflow,...stylingStore(init,pool,query),...adminCodeStore(init,pool),enabled,init,async close(){if(pool)await pool.end();},
  async warehouseArchive(orderId,id){
   const [[row]]=await query('SELECT picklist,labels FROM ku_warehouse_documents WHERE order_id=? AND confirmation_id=?',[orderId,id]);
   return row;
  },
  async saveWarehouseArchive(orderId,id,attachments){
   await query('INSERT INTO ku_warehouse_documents(order_id,confirmation_id,picklist,labels) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE confirmation_id=confirmation_id',[orderId,id,attachments[0].content,attachments[1]?.content||null]);
   return this.warehouseArchive(orderId,id);
  },
  async warehouseArchiveIndex(){
   const [rows]=await query('SELECT confirmation_id AS id,labels IS NOT NULL AS hasLabels,sent_at AS sentAt FROM ku_warehouse_documents');
   return rows;
  },
  async readEnquiry(id){
   const [[row]]=await query('SELECT fingerprint,body FROM ku_enquiries WHERE id=?',[id]);
   if(row)return {fingerprint:row.fingerprint,snapshot:JSON.parse(row.body)};
   const [[legacy]]=await query('SELECT fingerprint,status FROM ku_submissions WHERE id=?',[id]);
   return legacy?{legacy:true,status:legacy.status}:null;
  },
  async reserveEnquiry(id,fingerprint,snapshot,client,now){
   await init();const connection=await pool.getConnection();
   try{await connection.beginTransaction();
    for(const [bucket,ms,max] of [['global-hour',3600000,30],['global-day',86400000,100],['client-'+client,900000,3]]){
     const until=(Math.floor(now/ms)+1)*ms;
     await connection.execute('INSERT IGNORE INTO ku_submission_limits(bucket,attempts,reset_at) VALUES (?,0,?)',[bucket,until]);
     const [[row]]=await connection.execute('SELECT attempts,reset_at FROM ku_submission_limits WHERE bucket=? FOR UPDATE',[bucket]);
     const [[existing]]=await connection.execute('SELECT fingerprint,body FROM ku_enquiries WHERE id=?',[id]);
     if(existing){await connection.rollback();return existing.fingerprint===fingerprint?{snapshot:JSON.parse(existing.body)}:{conflict:true};}
     const [[legacy]]=await connection.execute('SELECT id FROM ku_submissions WHERE id=?',[id]);
     if(legacy){await connection.rollback();return {conflict:true};}
     const count=Number(row.reset_at)>now?row.attempts:0;
     if(count>=max){await connection.rollback();return {limited:true};}
     await connection.execute('UPDATE ku_submission_limits SET attempts=?,reset_at=? WHERE bucket=?',[count+1,until,bucket]);
    }
    await connection.execute('INSERT INTO ku_enquiries(id,fingerprint,body,created_at) VALUES (?,?,?,?)',[id,fingerprint,JSON.stringify(snapshot),now]);
    if(rentalWorkflowSource(snapshot))await connection.execute('INSERT IGNORE INTO ku_workflow(id,body) VALUES (?,?)',[id,JSON.stringify(workflowRecord(snapshot))]);
    for(const channel of ['internal','customer'])await connection.execute("INSERT INTO ku_enquiry_mail(submission_id,channel,next_at) VALUES (?,?,?)",[id,channel,now]);
    await connection.commit();return {snapshot};
   }catch(error){await connection.rollback();throw error;}finally{connection.release();}
  },
  async pendingEnquiryMail(now){
   // A process may have stopped after SMTP accepted DATA. Never blindly resend an expired lease.
   await query("UPDATE ku_enquiry_mail SET status='uncertain' WHERE status='sending' AND lease_until<?",[now]);
   const [rows]=await query("SELECT m.submission_id AS id,m.channel,e.body FROM ku_enquiry_mail m JOIN ku_enquiries e ON e.id=m.submission_id WHERE m.status='pending' AND m.attempts<5 AND m.next_at<=? ORDER BY m.next_at LIMIT 10",[now]);
   return rows.map(row=>({id:row.id,channel:row.channel,snapshot:JSON.parse(row.body)}));
  },
  async claimEnquiryMail(id,channel,now){const [result]=await query("UPDATE ku_enquiry_mail SET status='sending',attempts=attempts+1,lease_until=? WHERE submission_id=? AND channel=? AND status='pending' AND attempts<5 AND next_at<=?",[now+120000,id,channel,now]);return result.affectedRows===1;},
  async finishEnquiryMail(id,channel,status,now,warehouseOrderId){
   if(warehouseOrderId && channel==='customer' && status==='sent'){
    const c=await pool.getConnection();
    try{
     await c.beginTransaction();
     await c.execute('SELECT id FROM ku_catalog WHERE id=1 FOR UPDATE');
     const [[row]]=await c.execute('SELECT body FROM ku_workflow WHERE id=? FOR UPDATE',[warehouseOrderId]);
     const r=row && JSON.parse(row.body);
     const [result]=await c.execute("UPDATE ku_enquiry_mail SET status='sent',lease_until=0 WHERE submission_id=? AND channel='customer' AND status='sending'",[id]);
     if(result.affectedRows && r?.status==='confirmed' && r.history.filter(h=>h.type==='confirmation').at(-1)?.id===id){
      await c.execute("INSERT INTO ku_enquiry_mail(submission_id,channel,next_at) VALUES (?,'internal',?)",[id,now]);
     }
     await c.commit();
    }catch(error){await c.rollback();throw error;}finally{c.release();}
    await workflow.recordWorkflowMailSent(id,now);
    return;
   }
   if(channel==='internal' && status==='sent' && warehouseOrderId){
    await query("UPDATE ku_enquiry_mail m JOIN ku_warehouse_documents d ON d.confirmation_id=m.submission_id SET m.status='sent',m.lease_until=0,d.sent_at=? WHERE m.submission_id=? AND m.channel='internal' AND m.status='sending'",[now,id]);
    return;
   }
   // Keep bound status values out of MySQL IF expressions: connection/table collations can differ.
   await query("UPDATE ku_enquiry_mail SET status=?,next_at=?,lease_until=0 WHERE submission_id=? AND channel=? AND status='sending'",[status,now+300000,id,channel]);
   if(status==='sent')await workflow.recordWorkflowMailSent(id,now);
   if(status==='pending')await query("UPDATE ku_enquiry_mail SET status='failed' WHERE submission_id=? AND channel=? AND status='pending' AND attempts>=5",[id,channel]);
  },
  async enquiryMailHealth(now){
   const [[counts]]=await query("SELECT SUM(status='failed') AS failed,SUM(status='uncertain' OR (status='sending' AND lease_until<?)) AS uncertain,SUM(status='pending' AND next_at<?) AS `delayed` FROM ku_enquiry_mail",[now,now-15*60000]);
   return counts;
  },
  async enquiryMailStatus(){const [rows]=await query('SELECT m.submission_id AS reference,m.channel,m.status,m.attempts,e.created_at AS receivedAt FROM ku_enquiry_mail m JOIN ku_enquiries e ON e.id=m.submission_id ORDER BY e.created_at DESC,m.channel');return rows;},
  async retryEnquiryMail(id,channel,acknowledgeUncertain){const [result]=await query("UPDATE ku_enquiry_mail SET status='pending',attempts=0,next_at=0 WHERE submission_id=? AND channel=? AND (status='failed' OR (status='uncertain' AND ?=1))",[id,channel,acknowledgeUncertain?1:0]);return result.affectedRows===1;},
  async pruneEnquiries(now){
   await workflow.pruneWorkflow(now);
   await query('DELETE m FROM ku_enquiry_mail m JOIN ku_enquiries e ON e.id=m.submission_id WHERE e.created_at<?',[now-30*86400000]);
   await query('DELETE FROM ku_enquiries WHERE created_at<?',[now-30*86400000]);
   await query('DELETE FROM ku_submissions WHERE created_at<? LIMIT 100',[now-30*86400000]);
   await query('DELETE FROM ku_submission_limits WHERE reset_at<? LIMIT 100',[now-86400000]);
  },
  async reserveSubmission(id,fingerprint,client,now){
   await init();const connection=await pool.getConnection();
   try{await connection.beginTransaction();
    // Lock shared budget first so simultaneous requests cannot double-send an id.
    const limits=[['global-hour',3600000,30],['global-day',86400000,100],['client-'+client,900000,3]];
    for(const [bucket,ms,max] of limits){
     const until=(Math.floor(now/ms)+1)*ms;
     await connection.execute('INSERT IGNORE INTO ku_submission_limits(bucket,attempts,reset_at) VALUES (?,0,?)',[bucket,until]);
     const [[row]]=await connection.execute('SELECT attempts,reset_at FROM ku_submission_limits WHERE bucket=? FOR UPDATE',[bucket]);
     const [[existing]]=await connection.execute('SELECT fingerprint,status FROM ku_submissions WHERE id=?',[id]);
     if(existing){await connection.rollback();return existing.fingerprint===fingerprint?existing.status:'conflict';}
     const count=Number(row.reset_at)>now?row.attempts:0;
     if(count>=max){await connection.rollback();return 'limited';}
     await connection.execute('UPDATE ku_submission_limits SET attempts=?,reset_at=? WHERE bucket=?',[count+1,until,bucket]);
    }
    await connection.execute('DELETE FROM ku_submissions WHERE created_at<? LIMIT 100',[now-30*86400000]);
    await connection.execute('DELETE FROM ku_submission_limits WHERE reset_at<? LIMIT 100',[now-86400000]);
    await connection.execute("INSERT INTO ku_submissions(id,fingerprint,status,created_at) VALUES (?,?,'sending',?)",[id,fingerprint,now]);
    await connection.commit();return 'new';
   }catch(error){await connection.rollback();throw error;}finally{connection.release();}
  },
  async completeSubmission(id,status){await query('UPDATE ku_submissions SET status=? WHERE id=?',[status,id]);},
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
  async readCatalog(){
   const [[[r]],[profiles],[inventory]]=await Promise.all([
    query('SELECT revision,body,updated_at FROM ku_catalog WHERE id=1'),
    query('SELECT id,bounds FROM ku_media_bounds'),
    query("SELECT s.product,COUNT(i.id) AS total,SUM(CASE WHEN i.state='ready' THEN 1 ELSE 0 END) AS ready FROM ku_styling_catalog_stock s LEFT JOIN ku_styling_items i ON i.product=s.product AND i.state<>'withdrawn' GROUP BY s.product")
   ]);
   const bounds=new Map(profiles.map(row=>['/media/'+row.id,JSON.parse(row.bounds)]));
   const stock=new Map(inventory.map(row=>[row.product,row]));
   const products=migrateProducts(removeRetiredCosts(JSON.parse(r.body))).map(({imageBounds,qrStock,...product})=>{
    const frame=bounds.get(product.image)??catalogImageBounds[product.image];
    const managed=stock.get(product.id);
    return {...product,...(frame?{imageBounds:frame}:{}),...(managed?{qrStock:true,stock:Number(managed.total),unavailable:Number(managed.total)-Number(managed.ready)}:{})};
   });
   return {revision:r.revision,products,updatedAt:r.updated_at};
  },
  async saveCatalog(revision,products){return mutateCatalog(revision,products,[]);},
  async saveCatalogWithStyling(revision,products,registration){return mutateCatalog(revision,products,[],registration);},
  async purgeTrash(revision,products,urls){return mutateCatalog(revision,products,urls);},
  async purgedMedia(){const [rows]=await query('SELECT url FROM ku_media_purged');return rows.map(row=>row.url);},
  async mediaPurged(url){const [[row]]=await query('SELECT url FROM ku_media_purged WHERE url=? LIMIT 1',[url]);return !!row;},
  async admin(){const [[r]]=await query('SELECT email,password_hash AS passwordHash FROM ku_admin WHERE id=1');return r||null;},
  async createAdmin(email,passwordHash){const [r]=await query('INSERT IGNORE INTO ku_admin (id,email,password_hash) VALUES (1,?,?)',[email,passwordHash]);return r.affectedRows===1;},
  async changePassword(sessionHash,passwordHash){
   await init();const connection=await pool.getConnection();
   try{await connection.beginTransaction();await connection.execute('SELECT id FROM ku_admin WHERE id=1 FOR UPDATE');const [[session]]=await connection.execute('SELECT token_hash FROM ku_admin_mfa_sessions WHERE token_hash=? AND expires_at>?',[sessionHash,Date.now()]);if(!session){await connection.rollback();return false;}await connection.execute('UPDATE ku_admin SET password_hash=? WHERE id=1',[passwordHash]);await connection.execute('DELETE FROM ku_admin_mfa_sessions');await connection.commit();return true;}catch(error){await connection.rollback();throw error;}finally{connection.release();}
  },
  async session(hash){const [[r]]=await query('SELECT expires_at AS expiresAt FROM ku_admin_mfa_sessions WHERE token_hash=? AND expires_at>?',[hash,Date.now()]);return r||null;},
  async addSession(hash,expiresAt){await query('DELETE FROM ku_admin_mfa_sessions WHERE expires_at<?',[Date.now()]);await query('INSERT INTO ku_admin_mfa_sessions(token_hash,expires_at) VALUES (?,?)',[hash,expiresAt]);},
  async removeSession(hash){await query('DELETE FROM ku_admin_mfa_sessions WHERE token_hash=?',[hash]);},
  async attempt(bucket){const now=Date.now(),until=now+15*60*1000;await query('INSERT INTO ku_login_limits(bucket,attempts,reset_at) VALUES (?,1,?) ON DUPLICATE KEY UPDATE attempts=IF(reset_at<?,1,attempts+1),reset_at=IF(reset_at<?,VALUES(reset_at),reset_at)',[bucket,until,now,now]);const [[r]]=await query('SELECT attempts FROM ku_login_limits WHERE bucket=?',[bucket]);return r.attempts<=10;},
  async resetAttempts(bucket){await query('DELETE FROM ku_login_limits WHERE bucket=?',[bucket]);},
  async mediaTrashState(){const [rows]=await query('SELECT url,deleted_at FROM ku_media_state');return Object.fromEntries(rows.map(row=>[row.url,row.deleted_at]));},
  async trashMedia(url){await query('INSERT INTO ku_media_state(url,deleted_at) VALUES (?,?) ON DUPLICATE KEY UPDATE deleted_at=VALUES(deleted_at)',[url,new Date()]);},
  async restoreMedia(url){await query('DELETE FROM ku_media_state WHERE url=?',[url]);},
  async mediaList(){const [r]=await query('SELECT id,name,mime,bytes,created_at AS createdAt FROM ku_media ORDER BY created_at DESC LIMIT 2000');return r.map(x=>({...x,url:'/media/'+x.id,source:'upload'}));},
  async media(id){const [[r]]=await query('SELECT mime,body FROM ku_media WHERE id=?',[id]);return r||null;},
  async saveMediaBounds(id,bounds){await query('INSERT INTO ku_media_bounds(id,bounds) VALUES (?,?) ON DUPLICATE KEY UPDATE bounds=VALUES(bounds)',[id,JSON.stringify(bounds)]);},
  async addMedia(name,mime,body){const digest=createHash('sha256').update(body).digest('hex'),id=randomBytes(16).toString('hex');await query('INSERT IGNORE INTO ku_media(id,digest,name,mime,bytes,body,created_at) VALUES (?,?,?,?,?,?,?)',[id,digest,name,mime,body.length,body,new Date()]);const [[r]]=await query('SELECT id,name,mime,bytes,created_at AS createdAt FROM ku_media WHERE digest=?',[digest]);return {...r,url:'/media/'+r.id,source:'upload'};}
 };
}
