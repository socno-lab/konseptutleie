import {randomUUID} from 'node:crypto';
import {physicalRentalProduct,promoteConfirmedStock} from './qr-catalog-stock.mjs';

const fail=(message,status=409)=>{throw Object.assign(Error(message),{status});};
export const retirementReasons={sold:'Solgt',scrapped:'Kassert',lost:'Tapt'};
export const controlSchema=[
 'CREATE TABLE IF NOT EXISTS ku_stock_counts (id CHAR(36) PRIMARY KEY,category VARCHAR(200) NOT NULL,actor VARCHAR(254) NOT NULL,started BIGINT NOT NULL,closed BIGINT,products LONGTEXT NOT NULL,expected LONGTEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS ku_stock_observations (session_id CHAR(36) NOT NULL,item VARCHAR(18) NOT NULL,PRIMARY KEY(session_id,item),FOREIGN KEY(session_id) REFERENCES ku_stock_counts(id) ON DELETE CASCADE)',
 'CREATE TABLE IF NOT EXISTS ku_stock_retirements (item VARCHAR(18) PRIMARY KEY,reason VARCHAR(12) NOT NULL,FOREIGN KEY(item) REFERENCES ku_styling_items(id))',
 'CREATE TABLE IF NOT EXISTS ku_stock_baselines (product VARCHAR(120) PRIMARY KEY,quantity INT NOT NULL)'
];
export function inventoryControl(transaction,query,recordMove){
 return {
  async countSessions(){return (await query('SELECT id,category,started,closed FROM ku_stock_counts ORDER BY started DESC'))[0];},
  async countStart(category,actor){
   return transaction(async db=>{
    const [[catalog]]=await db.execute('SELECT body FROM ku_catalog WHERE id=1');
    const products=JSON.parse(catalog.body).filter(p=>physicalRentalProduct(p)&&(!category||p.category===category)).map(p=>p.id);
    if(!products.length)fail('Ingen utleieprodukter i kategorien.',400);
    const [items]=await db.execute("SELECT id,product FROM ku_styling_items WHERE state='ready' AND job IS NULL");
    const scope=new Set(products),expected=items.filter(i=>scope.has(i.product)).map(i=>i.id),id=randomUUID();
    await db.execute('INSERT INTO ku_stock_counts(id,category,actor,started,products,expected) VALUES(?,?,?,?,?,?)',[id,category,actor,Date.now(),JSON.stringify(products),JSON.stringify(expected)]);
    return {id};
   });
  },
  async countDetails(id){
   return transaction(async db=>{
    const [[session]]=await db.execute('SELECT id,category,started,closed,expected FROM ku_stock_counts WHERE id=?',[id]);
    if(!session)fail('Tellingen finnes ikke.',404);
    const [rows]=await db.execute('SELECT item FROM ku_stock_observations WHERE session_id=?',[id]);
    return {...session,expected:JSON.parse(session.expected),seen:rows.map(row=>row.item)};
   });
  },
  async countRecord(id,item){
   return transaction(async db=>{
    const [[session]]=await db.execute('SELECT closed,products FROM ku_stock_counts WHERE id=? FOR UPDATE',[id]);
    if(!session||session.closed)fail('Tellingen er avsluttet eller finnes ikke.');
    const [[unit]]=await db.execute('SELECT product,state FROM ku_styling_items WHERE id=?',[item]);
    if(!unit)fail('Ukjent etikett.',404);
    if(unit.state==='withdrawn')fail('Etiketten er tatt ut av bruk.');
    if(!JSON.parse(session.products).includes(unit.product))fail('Møbelet tilhører ikke denne tellingen.',400);
    const [result]=await db.execute('INSERT IGNORE INTO ku_stock_observations(session_id,item) VALUES(?,?)',[id,item]);
    return {already:!result.affectedRows};
   });
  },
  async countClose(id){
   await query('UPDATE ku_stock_counts SET closed=? WHERE id=? AND closed IS NULL',[Date.now(),id]);return {ok:true};
  },
  async retireUnit({id,revision,reason},actor){
   if(!Object.hasOwn(retirementReasons,reason))fail('Velg en gyldig årsak.',400);
   return transaction(async db=>{
    const [[catalog]]=await db.execute('SELECT body FROM ku_catalog WHERE id=1 FOR UPDATE');
    const [[item]]=await db.execute('SELECT * FROM ku_styling_items WHERE id=? FOR UPDATE',[id]);
    if(!item||item.state==='withdrawn'||item.revision!==revision)fail('Møbelet er endret. Kontroller status før du fortsetter.');
    const products=JSON.parse(catalog.body),product=products.find(p=>p.id===item.product);
    const [[managed]]=await db.execute('SELECT product FROM ku_styling_catalog_stock WHERE product=?',[item.product]);
    let decrease=1;
    if(product&&!managed){
     const [sides]=await db.execute("SELECT i.id,s.side FROM ku_styling_items i LEFT JOIN ku_styling_item_sides s ON s.item=i.id WHERE i.product=? AND i.state<>'withdrawn'",[item.product]);
     const total=rows=>rows.filter(i=>!i.side).length+Math.min(...['left','right'].map(side=>rows.filter(i=>i.side===side).length));
     decrease=total(sides)-total(sides.filter(i=>i.id!==id));
    }
    await db.execute('INSERT INTO ku_stock_retirements(item,reason) VALUES(?,?)',[id,reason]);
    await recordMove(db,item,{state:'withdrawn',job:null},actor,item.job,reason);
    if(product&&!managed&&decrease){
     product.stock=Math.max(0,(Number(product.stock)||0)-decrease);
     product.unavailable=Math.min(product.stock,Number(product.unavailable)||0);
     await db.execute('UPDATE ku_catalog SET body=?,revision=revision+1,updated_at=NOW(3) WHERE id=1',[JSON.stringify(products)]);
     await promoteConfirmedStock(db,products,item.product);
    }
    return {ok:true};
   });
  },
  async stockBaselines(){return Object.fromEntries((await query('SELECT product,quantity FROM ku_stock_baselines'))[0].map(r=>[r.product,r.quantity]));}
 };
}
