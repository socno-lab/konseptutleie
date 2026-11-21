import {osloToday} from './enquiries-model.js?v=returns20261121';
export function canConfirmReturn(r,today=osloToday()){
 if(r.status!=='confirmed')return false;
 const confirmed=r.history?.filter(h=>h.type==='confirmation').at(-1)?.document?.workflow;
 const start=confirmed?.start||r.reservation?.start||r.start;
 return /^\d{4}-\d{2}-\d{2}$/.test(start||'')&&start<=today;
}
