import {randomUUID} from 'node:crypto';

export const stylingSchema = [
  'CREATE TABLE IF NOT EXISTS ku_stylists (email VARCHAR(254) PRIMARY KEY, password_hash VARCHAR(255), invitation CHAR(64) UNIQUE, expires BIGINT, active BOOLEAN NOT NULL DEFAULT TRUE)',
  'CREATE TABLE IF NOT EXISTS ku_stylist_sessions (token CHAR(64) PRIMARY KEY, email VARCHAR(254) NOT NULL, expires BIGINT NOT NULL, INDEX(email), INDEX(expires))',
  'CREATE TABLE IF NOT EXISTS ku_styling_jobs (id CHAR(36) PRIMARY KEY, address VARCHAR(200) NOT NULL, stylist VARCHAR(254) NOT NULL, created BIGINT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS ku_styling_items (id VARCHAR(18) PRIMARY KEY, product VARCHAR(120) NOT NULL, name VARCHAR(200) NOT NULL, state VARCHAR(20) NOT NULL, job CHAR(36), revision INT NOT NULL DEFAULT 1, INDEX(product), FOREIGN KEY(job) REFERENCES ku_styling_jobs(id))',
  'CREATE TABLE IF NOT EXISTS ku_styling_item_sides (item VARCHAR(18) PRIMARY KEY, side VARCHAR(5) NOT NULL, FOREIGN KEY(item) REFERENCES ku_styling_items(id))',
  'CREATE TABLE IF NOT EXISTS ku_styling_catalog_stock (product VARCHAR(120) PRIMARY KEY)',
  'CREATE TABLE IF NOT EXISTS ku_styling_job_closures (job CHAR(36) PRIMARY KEY, closed BIGINT NOT NULL, actor VARCHAR(254) NOT NULL, FOREIGN KEY(job) REFERENCES ku_styling_jobs(id) ON DELETE CASCADE)',
  'CREATE TABLE IF NOT EXISTS ku_styling_job_deviations (job CHAR(36) NOT NULL, item VARCHAR(18) NOT NULL, kind VARCHAR(10) NOT NULL, note VARCHAR(500) NOT NULL, PRIMARY KEY(job,item,kind), FOREIGN KEY(job) REFERENCES ku_styling_jobs(id) ON DELETE CASCADE)',
  'CREATE TABLE IF NOT EXISTS ku_styling_history (id BIGINT AUTO_INCREMENT PRIMARY KEY, item VARCHAR(18) NOT NULL, actor VARCHAR(254) NOT NULL, state VARCHAR(20) NOT NULL, job CHAR(36), created BIGINT NOT NULL, INDEX(item))'
];

export function stylingError(message,status=400){return Object.assign(new Error(message),{status});}
export async function createStylingItem(db,product,actor,side,state='held'){
 const id='K-'+randomUUID().replaceAll('-','').slice(0,16).toUpperCase();
 await db.execute('INSERT INTO ku_styling_items(id,product,name,state) VALUES(?,?,?,?)',[id,product.id,product.name,state]);
 if(side)await db.execute('INSERT INTO ku_styling_item_sides(item,side) VALUES(?,?)',[id,side]);
 await db.execute('INSERT INTO ku_styling_history(item,actor,state,created) VALUES(?,?,?,?)',[id,actor,state,Date.now()]);
 return id;
}
export function nextMovement(item,action,job){
  if(['assign','scan'].includes(action)&&item.state==='ready'&&job)return {state:'assigned',job};
  if(action==='scan'){
    if(item.state==='assigned'&&item.job===job)return {state:'out',job};
    if(item.state==='out'&&item.job===job)throw stylingError('Møbelet er allerede ute. Bekreft retur før det legges til kontroll.',409);
  }
  if(action==='out'&&job&&(item.state==='ready'||(item.state==='assigned'&&item.job===job)))return {state:'out',job};
  if(action==='unassign'&&item.state==='assigned'&&item.job===job)return {state:'ready',job:null};
  if(action==='in' && item.state==='out' && item.job===job)return {state:'check',job:null};
  if(action==='ready' && ['check','held'].includes(item.state))return {state:'ready',job:null};
  if(action==='hold' && ['check','ready'].includes(item.state))return {state:'held',job:null};
  throw stylingError('Kontroller oppdraget og møbelets lagerstatus.',409);
}
export function stylingStore(init,pool,query){
  async function transaction(fn){
    await init();const db=await pool.getConnection();
    try{await db.beginTransaction();const result=await fn(db);await db.commit();return result;}
    catch(e){await db.rollback();throw e;}finally{db.release();}
  }
  async function lockJob(db,id){
    const [[job]]=await db.execute('SELECT id FROM ku_styling_jobs WHERE id=? FOR UPDATE',[id]);
    if(!job)throw stylingError('Oppdraget finnes ikke lenger.',409);
    const [[closure]]=await db.execute('SELECT closed FROM ku_styling_job_closures WHERE job=?',[id]);
    return closure;
  }
  async function recordMove(db,item,move,actor,job){
    await db.execute('UPDATE ku_styling_items SET state=?,job=?,revision=revision+1 WHERE id=?',[move.state,move.job,item.id]);
    await db.execute('INSERT INTO ku_styling_history(item,actor,state,job,created) VALUES(?,?,?,?,?)',[item.id,actor,move.state,job,Date.now()]);
  }
  return {
    async stylingOverview(){
      const [jobs,items]=await Promise.all([
        query('SELECT j.*,c.closed FROM ku_styling_jobs j LEFT JOIN ku_styling_job_closures c ON c.job=j.id ORDER BY j.created DESC'),
        query(`SELECT i.*,s.side,i.state='held' AND NOT EXISTS (
          SELECT 1 FROM ku_styling_history h WHERE h.item=i.id AND h.state IN ('ready','assigned','out','check')
        ) AS labelPending
        FROM ku_styling_items i LEFT JOIN ku_styling_item_sides s ON s.item=i.id ORDER BY i.name,s.side,i.id`)
      ]);
      return {jobs:jobs[0],items:items[0]};
    },
    async stylingJob(address,actor){
      const id=randomUUID();await query('INSERT INTO ku_styling_jobs VALUES(?,?,?,?)',[id,address,actor,Date.now()]);return {id};
    },
    async stylingDeleteJob(id){
      try{
        await query('DELETE FROM ku_styling_jobs WHERE id=?',[id]);
      }catch(error){
        if(error.code==='ER_ROW_IS_REFERENCED_2'){
          throw stylingError('Skann inn alle møblene på oppdraget før du sletter det.',409);
        }
        throw error;
      }
    },
    async stylingJobReturns(id){
      const [units]=await query(`SELECT i.id,i.product,i.name,i.state,i.revision,i.job,s.side,
        h.state AS movement,h.id=(SELECT MAX(latest.id) FROM ku_styling_history latest WHERE latest.item=i.id) AS is_latest
        FROM (SELECT item,MAX(id) AS history_id FROM ku_styling_history WHERE job=? AND state IN ('out','check','transferred') GROUP BY item) movements
        JOIN ku_styling_history h ON h.id=movements.history_id
        JOIN ku_styling_items i ON i.id=h.item
        LEFT JOIN ku_styling_item_sides s ON s.item=i.id ORDER BY i.name,i.id`,[id]);
      const [deviations]=await query('SELECT item,kind,note FROM ku_styling_job_deviations WHERE job=? ORDER BY item,kind',[id]);
      return {units,deviations};
    },
    async stylingReviewReturns(id,units,actor){
      return transaction(async db=>{
        await lockJob(db,id);
        for(const unit of [...units].sort((a,b)=>a.id.localeCompare(b.id))){
          const [[item]]=await db.execute('SELECT * FROM ku_styling_items WHERE id=? FOR UPDATE',[unit.id]);
          const [[latest]]=await db.execute('SELECT job,state FROM ku_styling_history WHERE item=? ORDER BY id DESC LIMIT 1',[unit.id]);
          if(!item||item.state!=='check'||item.revision!==unit.revision||latest?.job!==id||latest.state!=='check'){
            throw stylingError('Returlisten er endret. Oppdater valget og prøv igjen.',409);
          }
          await recordMove(db,item,nextMovement(item,unit.note?'hold':'ready'),actor,id);
          if(unit.note)await db.execute("INSERT INTO ku_styling_job_deviations(job,item,kind,note) VALUES(?,?,'damage',?) ON DUPLICATE KEY UPDATE note=?",[id,item.id,unit.note,unit.note]);
        }
      });
    },
    async stylingCloseJob(id,missingNote,actor){
      return transaction(async db=>{
        if(await lockJob(db,id))return;
        const [items]=await db.execute('SELECT id,state FROM ku_styling_items WHERE job=?',[id]);
        if(items.some(item=>item.state==='assigned'))throw stylingError('Sjekk ut eller fjern møblene som er lagt til før du avslutter oppdraget.',409);
        if(items.length&&!missingNote)throw stylingError('Beskriv avviket for møblene som fortsatt mangler.',409);
        for(const item of items){
          await db.execute("INSERT INTO ku_styling_job_deviations(job,item,kind,note) VALUES(?,?,'missing',?)",[id,item.id,missingNote]);
        }
        await db.execute('INSERT INTO ku_styling_job_closures(job,closed,actor) VALUES(?,?,?)',[id,Date.now(),actor]);
      });
    },
    async stylingCorrectUnused(product,count,expected,restore,actor){
      return transaction(async db=>{
        const from=restore?'withdrawn':'held';
        const to=restore?'held':'withdrawn';
        const [items]=await db.execute(
          'SELECT id,revision FROM ku_styling_items WHERE product=? AND state=? AND job IS NULL ORDER BY id FOR UPDATE',
          [product,from]
        );
        const eligible=restore?items:items.filter(item=>item.revision===1);
        if(eligible.length!==expected)throw stylingError('Listen over etiketter er endret. Prøv igjen.',409);
        if(eligible.length<count)throw stylingError('Det er for få ubrukte etiketter til denne korrigeringen.');
        for(const item of eligible.slice(0,count)){
          await recordMove(db,item,{state:to,job:null},actor,null);
        }
        return {count};
      });
    },
    async stylingRegister(product,count,actor){
      return transaction(async db=>{
        const ids=[];
        for(let n=0;n<count;n++){
          for(const side of product.moduleRole==='base'&&!product.qrStock?['left','right']:[null])ids.push(await createStylingItem(db,product,actor,side));
        }
        return {ids};
      });
    },
    async stylingSplit(id,revision,products,actor){
      return transaction(async db=>{
        const [[item]]=await db.execute('SELECT * FROM ku_styling_items WHERE id=? FOR UPDATE',[id]);
        const product=products.find(p=>p.id===item?.product);
        if(!item||product?.moduleRole!=='base'||product.qrStock||item.state!=='ready'||item.revision!==revision)throw stylingError('Kontroller at grunnsofaen kan deles og står på lager.',409);
        const [[side]]=await db.execute('SELECT side FROM ku_styling_item_sides WHERE item=? FOR UPDATE',[id]);
        if(side)throw stylingError('Modulene er allerede registrert.',409);
        await db.execute("INSERT INTO ku_styling_item_sides(item,side) VALUES(?,'left')",[id]);
        await db.execute('UPDATE ku_styling_items SET revision=revision+1 WHERE id=?',[id]);
        return {ids:[id,await createStylingItem(db,product,actor,'right',item.state)]};
      });
    },
    async stylingCheckoutAll(job,actor){
      return transaction(async db=>{
        if(await lockJob(db,job))throw stylingError('Oppdraget er avsluttet.',409);
        const [items]=await db.execute("SELECT id,state,job FROM ku_styling_items WHERE job=? AND state='assigned' ORDER BY id FOR UPDATE",[job]);
        for(const item of items)await recordMove(db,item,nextMovement(item,'out',job),actor,job);
        return {count:items.length};
      });
    },
    async stylingTransfer(input,actor){
      const {fromJob,job,id,revision}=input;
      return transaction(async db=>{
        for(const lockedJob of [fromJob,job].sort()){
          const closed=await lockJob(db,lockedJob);
          if(lockedJob===job&&closed)throw stylingError('Oppdraget er avsluttet.',409);
        }
        const [[item]]=await db.execute('SELECT * FROM ku_styling_items WHERE id=? FOR UPDATE',[id]);
        if(!item||item.revision!==revision||item.job!==fromJob||!['assigned','out'].includes(item.state)){
          throw stylingError('Møbelets status eller oppdrag er endret. Skann på nytt.',409);
        }
        const previousState=item.state==='out'?'transferred':'unassigned';
        await db.execute('INSERT INTO ku_styling_history(item,actor,state,job,created) VALUES(?,?,?,?,?)',[id,actor,previousState,fromJob,Date.now()]);
        const move={state:'assigned',job};
        await recordMove(db,item,move,actor,job);
        return move;
      });
    },
    async stylingMove(input,actor){
      return transaction(async db=>{
        if(['in','out','scan','assign','unassign'].includes(input.action)){
          const closure=await lockJob(db,input.job);
          if(closure&&input.action!=='in')throw stylingError('Oppdraget er avsluttet.',409);
        }
        const [[item]]=await db.execute('SELECT * FROM ku_styling_items WHERE id=? FOR UPDATE',[input.id]);
        if(!item || item.revision!==input.revision)throw stylingError('Møbelet er endret. Kontroller status og prøv igjen.',409);
        const move=nextMovement(item,input.action,input.job);
        await recordMove(db,item,move,actor,move.job||item.job);
        return move;
      });
    },
    async stylingHistory(id){return (await query('SELECT actor,state,job,created FROM ku_styling_history WHERE item=? ORDER BY id DESC',[id]))[0];},
    async stylingUsageHistory(){return (await query("SELECT h.item,i.product,h.state,h.job,h.created FROM ku_styling_history h JOIN ku_styling_items i ON i.id=h.item ORDER BY h.item,h.id"))[0];},
    async stylists(){return (await query('SELECT email,active,password_hash IS NOT NULL AS registered FROM ku_stylists ORDER BY email'))[0];},
    async stylingInvite(email,hash){
      await transaction(async db=>{
        await db.execute('INSERT INTO ku_stylists(email,invitation,expires) VALUES(?,?,?) ON DUPLICATE KEY UPDATE invitation=VALUES(invitation),expires=VALUES(expires),active=TRUE,password_hash=NULL',[email,hash,Date.now()+86400000]);
        await db.execute('DELETE FROM ku_stylist_sessions WHERE email=?',[email]);
      });
    },
    async stylingDisable(email){await transaction(async db=>{
      await db.execute('UPDATE ku_stylists SET active=FALSE,invitation=NULL,password_hash=NULL WHERE email=?',[email]);
      await db.execute('DELETE FROM ku_stylist_sessions WHERE email=?',[email]);
    });},
    async stylingClaim(hash,password){
      const [result]=await query('UPDATE ku_stylists SET password_hash=?,invitation=NULL WHERE active=TRUE AND invitation=? AND expires>?',[password,hash,Date.now()]);
      if(!result.affectedRows)throw stylingError('Invitasjonen er brukt eller utløpt.',403);
    },
    async stylingPassword(email){return (await query('SELECT password_hash FROM ku_stylists WHERE email=? AND active=TRUE',[email]))[0][0]?.password_hash;},
    async stylingSession(token){return (await query('SELECT s.email FROM ku_stylist_sessions s JOIN ku_stylists u ON u.email=s.email WHERE s.token=? AND s.expires>? AND u.active=TRUE',[token,Date.now()]))[0][0]?.email;},
    async stylingSignIn(email,passwordHash,token){
      await query('DELETE FROM ku_stylist_sessions WHERE expires<=?',[Date.now()]);
      const [r]=await query('INSERT INTO ku_stylist_sessions(token,email,expires) SELECT ?,email,? FROM ku_stylists WHERE email=? AND active=TRUE AND password_hash=?',[token,Date.now()+28800000,email,passwordHash]);if(!r.affectedRows)throw stylingError('Logg inn igjen.',401);
    },
    async stylingSignOut(token){await query('DELETE FROM ku_stylist_sessions WHERE token=?',[token]);}
  };
}
