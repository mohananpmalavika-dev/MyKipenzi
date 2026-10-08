import { test, expect } from '@playwright/test';
test('opens at first unread and keeps unread count until jump to latest', async ({ page }) => {
 const me='11111111-1111-4111-8111-111111111111', peer='22222222-2222-4222-8222-222222222222', cid='33333333-3333-4333-8333-333333333333';
 let readSeq=1;
 const user={id:me,name:'Reader',handle:'reader',language:'en',ai_consent:false};
 const messages=Array.from({length:65},(_,i)=>({id:'message'+(i+1),seq:String(i+1),sender_id:peer,sender:{id:peer,name:'Friend'},conversation_id:cid,text:'Message '+(i+1)+' '+('Some history to read. '.repeat(20)),source_language:'en',created_at:'2026-10-08T10:00:00Z'}));
 await page.route('**/api/**',async route=>{
   const url=new URL(route.request().url());const path=url.pathname;
   let data={};
   if(path==='/api/auth/session')data={user,csrf:'test'};
   else if(path==='/api/capabilities')data={};
   else if(path==='/api/conversations')data=[{id:cid,read_seq:readSeq,unread:65-readSeq,peer:{id:peer,name:'Friend',handle:'friend',language:'en'},peer_read_seq:0}];
   else if(path.endsWith('/messages')){
     const after=url.searchParams.get('after');const rows=after===null?messages.slice(-50):messages.filter(m=>Number(m.seq)>Number(after)).slice(0,50);
     data={messages:rows,has_more:rows.length===50};
   }else if(path.endsWith('/read')){readSeq=route.request().postDataJSON().seq;}
   else if(path.endsWith('/calls'))data=[];
   else if(path.endsWith('/calls/current'))data=null;
   await route.fulfill({json:data});
 });
 await page.goto('/?chat='+cid+'&account='+me);
 await expect(page.getByRole('separator',{name:'Unread messages'})).toBeVisible();
 await expect(page.locator('#unread-divider + article')).toContainText('Message 2');
 await expect(page.getByRole('button',{name:/Jump to latest/})).toContainText('64 unread');
 expect(readSeq).toBe(1);
 await page.getByRole('button',{name:/Jump to latest/}).click();
 await expect(page.getByRole('button',{name:/Jump to latest/})).toHaveCount(0);
 await expect.poll(()=>readSeq).toBe(65);
 await page.locator('.message-list').evaluate(box=>{box.scrollTop=0;box.dispatchEvent(new Event('scroll'));});
 await expect(page.getByRole('button',{name:/Jump to latest/})).toBeVisible();
 await expect(page.getByRole('button',{name:/Jump to latest/})).not.toContainText('unread');
});
