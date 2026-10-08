import { test, expect } from '@playwright/test';
test('all expiry choices are available and open messages disappear at expiry',async({page})=>{
 const me='11111111-1111-4111-8111-111111111111',peer='22222222-2222-4222-8222-222222222222',cid='33333333-3333-4333-8333-333333333333';
 let seconds=0;let expiry=null;
 const message={id:'temporary',seq:'1',sender_id:peer,sender:{id:peer,name:'Friend'},conversation_id:cid,text:'Temporary message',source_language:'en',created_at:'2026-10-08T10:00:00Z'};
 await page.route('**/api/**',async route=>{
  const url=new URL(route.request().url()),path=url.pathname;let data={};
  if(path==='/api/auth/session')data={user:{id:me,name:'Reader',handle:'reader',language:'en',ai_consent:false},csrf:'test'};
  else if(path==='/api/conversations')data=[{id:cid,disappearing_seconds:seconds,read_seq:1,unread:0,peer:{id:peer,name:'Friend',handle:'friend',language:'en'},peer_read_seq:0}];
  else if(path.endsWith('/messages'))data={messages:expiry && Date.now()>=expiry?[]:[{...message,expires_at:expiry?new Date(expiry).toISOString():null}],has_more:false};
  else if(path.endsWith('/disappearing')){seconds=route.request().postDataJSON().seconds;data={seconds};}
  else if(path.endsWith('/calls'))data=[];
  else if(path.endsWith('/calls/current'))data=null;
  await route.fulfill({json:data});
 });
 await page.goto('/?chat='+cid+'&account='+me);
 await expect(page.locator('article.message')).toContainText('Temporary message');
 await page.getByRole('button',{name:'Disappearing messages',exact:true}).click();
 const select=page.getByRole('combobox',{name:'Message expiry'});
 await expect(select.locator('option')).toHaveText(['Off','1 hour','24 hours','7 days','30 days']);
 await select.selectOption('3600');await expect(select).toHaveValue('3600');
 await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
 await expect(page.locator('.expiry-banner')).toContainText('1 hour');
 expiry=Date.now()+6000;
 await page.goto('/?chat='+cid+'&account='+me);
 await expect(page.locator('article.message')).toHaveCount(1);
 await expect(page.locator('article.message')).toHaveCount(0,{timeout:12000});
});
