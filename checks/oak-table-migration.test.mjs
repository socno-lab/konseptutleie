import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeOakTables,mergeOakWorkflow,oakTableId,retiredOakTableId} from '../server/oak-table-migration.mjs';
test('oak tables merge stock once, retain canonical price and rewrite package references',()=>{
 const p=[{id:oakTableId,stock:5,unavailable:1,price:210,description:'Eksempel.',dimensions:{diameter:110}},{id:retiredOakTableId,stock:5,unavailable:2},{id:'package',components:[{id:retiredOakTableId,quantity:1}]}];const next=mergeOakTables(p);assert.equal(next.length,2);assert.equal(next[0].stock,10);assert.equal(next[0].unavailable,3);assert.equal(next[0].price,210);assert.match(next[0].name,/Ø110\/Ø120/);assert.equal(next[1].components[0].id,oakTableId);assert.deepEqual(mergeOakTables(next),next);
});
test('existing reservations combine without rewriting sent documents',()=>{
 const history=[{document:{workflow:{lines:[{id:retiredOakTableId}]}}}];const r={revision:1,lines:[{id:retiredOakTableId,originalId:retiredOakTableId,total:420}],requirements:[{id:oakTableId,quantity:1},{id:retiredOakTableId,quantity:2}],history};const n=mergeOakWorkflow(r);assert.equal(n.lines[0].id,oakTableId);assert.equal(n.lines[0].total,420);assert.deepEqual(n.requirements,[{id:oakTableId,quantity:3}]);assert.deepEqual(n.history,history);assert.equal(mergeOakWorkflow(n),n);
});
