import {adminStamp,reserveChallenge,verifyChallenge} from './admin-email-code.mjs';
// All transitions lock the same administrator row, including password changes.
// Verification consumes the challenge and creates the session in one transaction.
export function adminCodeStore(init,pool){
 async function transaction(fn){await init();const db=await pool.getConnection();try{await db.beginTransaction();const [[user]]=await db.execute('SELECT email,password_hash AS passwordHash FROM ku_admin WHERE id=1 FOR UPDATE');const result=await fn(db,user);await db.commit();return result;}catch(error){await db.rollback();throw error;}finally{db.release();}}
 const select='SELECT token_hash AS tokenHash,code_hash AS codeHash,admin_hash AS adminHash,expires_at AS expiresAt,attempts,send_after AS sendAfter,window_start AS windowStart,sends FROM ku_admin_email_code WHERE id=1 FOR UPDATE';
 return {
  reserveAdminCode: (record,now)=>transaction(async(db,user)=>{
   if(!user||adminStamp(user)!==record.adminHash)return false;
   const [[previous]]=await db.execute(select),row=reserveChallenge(previous,record,now);if(!row)return false;
   await db.execute('INSERT INTO ku_admin_email_code (id,token_hash,code_hash,admin_hash,expires_at,attempts,send_after,window_start,sends) VALUES (1,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE token_hash=VALUES(token_hash),code_hash=VALUES(code_hash),admin_hash=VALUES(admin_hash),expires_at=VALUES(expires_at),attempts=VALUES(attempts),send_after=VALUES(send_after),window_start=VALUES(window_start),sends=VALUES(sends)',[row.tokenHash,row.codeHash,row.adminHash,row.expiresAt,row.attempts,row.sendAfter,row.windowStart,row.sends]);return true;
  }),
  consumeAdminCode: (tokenHash,codeHash,sessionHash,now)=>transaction(async(db,user)=>{
   const [[row]]=await db.execute(select);
   const valid=verifyChallenge(row,tokenHash,codeHash,user?adminStamp(user):'',now);
   if(row)await db.execute('UPDATE ku_admin_email_code SET attempts=?,expires_at=? WHERE id=1',[row.attempts,row.expiresAt]);
   if(valid){await db.execute('DELETE FROM ku_admin_mfa_sessions WHERE expires_at<?',[now]);await db.execute('INSERT INTO ku_admin_mfa_sessions(token_hash,expires_at) VALUES (?,?)',[sessionHash,now+8*3600000]);}return valid;
  }),
  cancelAdminCode: tokenHash=>transaction(async db=>{await db.execute('UPDATE ku_admin_email_code SET expires_at=0 WHERE id=1 AND token_hash=?',[tokenHash]);})
 };
}
