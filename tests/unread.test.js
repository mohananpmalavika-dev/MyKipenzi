import test from 'node:test';
import assert from 'node:assert/strict';
import { firstUnreadMessage, unreadMessageCount, isNearLatest } from '../shared/unread.js';
test('unread boundary skips own and deleted messages and accepts bigint strings',()=>{
 const messages=[{id:'old',seq:'9',sender_id:'friend'},{id:'mine',seq:'11',sender_id:'me'},{id:'deleted',seq:'12',sender_id:'friend',deleted_at:'date'},{id:'first',seq:'13',sender_id:'friend'},{id:'next',seq:'14',sender_id:'friend'}];
 assert.equal(firstUnreadMessage(messages,'10','me').id,'first');
 assert.equal(unreadMessageCount(messages,'10','me'),2);
 assert.equal(firstUnreadMessage(messages,'14','me'),undefined);
 assert.equal(unreadMessageCount(messages,'14','me'),0);
});
test('jump control only clears when the reader reaches the latest area',()=>{
 assert.equal(isNearLatest({scrollHeight:1000,scrollTop:100,clientHeight:400}),false);
 assert.equal(isNearLatest({scrollHeight:1000,scrollTop:500,clientHeight:400}),true);
 assert.equal(isNearLatest({scrollHeight:200,scrollTop:0,clientHeight:400}),true);
});
