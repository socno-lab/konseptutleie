const day=86400000;
export const usagePeriods=new Set(['30','90','365','all']);

export function stylingUsage(products,history,period,now=Date.now()){
 const from=period==='all'?0:now-Number(period)*day;
 const byUnit=new Map();
 for(const row of history){
  const unit=byUnit.get(row.item)??{product:row.product,events:[]};
  unit.events.push({...row,created:Number(row.created)});
  byUnit.set(row.item,unit);
 }
 const stats=new Map(products.map(p=>[p.id,{id:p.id,name:p.name,jobs:new Set(),checkouts:0,unitsUsed:0,approved:0,first:null,everUsed:false,outMillis:0}]));
 for(const {product,events} of byUnit.values()){
  const stat=stats.get(product);
  if(!stat)continue;
  let start=null,first=null,usedInPeriod=false;
  const addTime=end=>{
   if(start!==null)stat.outMillis+=Math.max(0,Math.min(now,end)-Math.max(from,start));
  };
  for(const event of events){
   if(event.created>now)continue;
   if(event.state==='ready'&&first===null)first=event.created;
   if(event.state!=='out'){addTime(event.created);start=null;continue;}
   stat.everUsed=true;
   first??=event.created;
   if(start!==null)continue;
   start=event.created;
   if(event.created>=from){stat.checkouts++;usedInPeriod=true;if(event.job)stat.jobs.add(event.job);}
  }
  addTime(now);
  if(usedInPeriod)stat.unitsUsed++;
  if(first!==null){
   stat.approved++;
   stat.first=stat.first===null?first:Math.min(stat.first,first);
  }
 }
 return [...stats.values()].filter(p=>p.approved).map(({jobs,outMillis,...p})=>({
  ...p,jobs:jobs.size,days:outMillis/day,daysPerUnit:outMillis/day/p.approved
 }));
}
