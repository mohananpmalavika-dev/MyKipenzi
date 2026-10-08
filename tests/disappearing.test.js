import test from 'node:test';
import assert from 'node:assert/strict';
import { expiryOptions, hasExpired } from '../shared/disappearing.js';
test('expiry supports off, 1 hour, 24 hours, 7 days, and 30 days',()=>{assert.deepEqual(Object.keys(expiryOptions),['0','3600','86400','604800','2592000']);});
test('expiry boundary hides messages at expiry and leaves permanent messages',()=>{assert.equal(hasExpired({expires_at:null},1000),false);assert.equal(hasExpired({expires_at:new Date(1000).toISOString()},999),false);assert.equal(hasExpired({expires_at:new Date(1000).toISOString()},1000),true);});
