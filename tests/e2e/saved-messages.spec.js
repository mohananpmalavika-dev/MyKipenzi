import { test, expect } from '@playwright/test';
test('star, pin, browse saved messages and remove them',async({page})=>{
 const me='11111111-1111-4111-8111-111111111111',peer='22222222-2222-4222-8222-222222222222',cid='33333333-3333-4333-8333-333333333333',mid='44444444-4444-4444-8444-444444444444';
 const message={id:mid,seq:'1',sender_id:peer,sender:{id:peer,name:'Friend'},conversation_id:cid,text:'Address: 12 Garden Road',source_language:'en',created_at:'2026-10-08T10:00:00Z',starred:false,pinned:false};
 await page.route('**/api/**',async route=>{
  const url=new URL(route.request().url()),path=url.pathname;let data={};
  if(path==='/api/auth/session')data={user:{id:me,name:'Reader',handle:'reader',language:'en',ai_consent:false},csrf:'test'};
  else if(path==='/api/conversations')data=[{id:cid,read_seq:1,unread:0,peer:{id:peer,name:'Friend',handle:'friend',language:'en'},peer_read_seq:0}];
  else if(path.endsWith('/messages'))data={messages:[message],has_more:false};
  else if(path.endsWith('/star')){message.starred=route.request().method()==='PUT';data={starred:message.starred};}
  else if(path.endsWith('/pin')){message.pinned=route.request().method()==='PUT';data={pinned:message.pinned};}
  else if(path==='/api/messages/'+mid)data=message;
  else if(path.endsWith('/library')){const kind=url.searchParams.get('kind');data={messages:(kind==='starred'?message.starred:message.pinned)?[message]:[],has_more:false};}
  else if(path.endsWith('/calls'))data=[];
  else if(path.endsWith('/calls/current'))data=null;
  await route.fulfill({json:data});
 });
 await page.goto('/?chat='+cid+'&account='+me);
 const row=page.locator('article.message');
 await row.getByRole('button',{name:'Star',exact:true}).click();
 await expect(row.getByRole('button',{name:'Unstar',exact:true})).toBeVisible();
 await row.getByRole('button',{name:'Pin',exact:true}).click();
 await expect(row.getByRole('button',{name:'Unpin',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Starred messages',exact:true}).click();
 await expect(page.locator('.library-item')).toContainText('12 Garden Road');
 await page.getByRole('button',{name:'View in chat',exact:true}).click();
 await expect(row).toHaveClass(/message-highlight/);
 await page.getByRole('button',{name:'Pinned messages',exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:'Unpin',exact:true}).click();
 await expect(page.locator('.library-item')).toHaveCount(0);
 await page.getByRole('button',{name:'Starred',exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:'Unstar',exact:true}).click();
 await expect(page.locator('.library-item')).toHaveCount(0);
});
