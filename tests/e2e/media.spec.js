import { test, expect } from '@playwright/test';
test('photos open full-screen and failed uploads can be retried',async({page})=>{
 const me='11111111-1111-4111-8111-111111111111',peer='22222222-2222-4222-8222-222222222222',cid='33333333-3333-4333-8333-333333333333',mid='44444444-4444-4444-8444-444444444444';
 const message={id:mid,seq:'1',sender_id:peer,sender:{id:peer,name:'Friend'},conversation_id:cid,text:'Address: 12 Garden Road',source_language:'en',created_at:'2026-10-08T10:00:00Z',starred:false,pinned:false,attachment:{id:'photo',name:'memory.png',mime:'image/png',size:68}};
 let uploads=0;
 await page.route('**/api/**',async route=>{
  const url=new URL(route.request().url()),path=url.pathname;let data={};
  if(path==='/api/attachments/photo'){data={url:'/test-photo.png'};}
  else if(path.endsWith('/uploads')){uploads++;await route.fulfill({status:uploads===1?503:201,json:uploads===1?{error:'Temporary upload failure'}:{id:'uploaded'}});return;}
  else if(path==='/api/auth/session')data={user:{id:me,name:'Reader',handle:'reader',language:'en',ai_consent:false},csrf:'test'};
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
 await page.route('**/test-photo.png',route=>route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=','base64')}));
 await page.goto('/?chat='+cid+'&account='+me);

 await page.getByRole('button',{name:'View photo memory.png'}).click();
 await expect(page.getByRole('dialog',{name:'Photo: memory.png'})).toBeVisible();
 await page.getByRole('button',{name:'Zoom in',exact:true}).click();
 await expect(page.getByRole('button',{name:'Reset zoom'})).toHaveText('150%');
 await page.keyboard.press('Escape');
 await expect(page.getByRole('dialog',{name:'Photo: memory.png'})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'View photo memory.png'})).toBeFocused();
 await page.locator('input[type=file]').last().setInputFiles({name:'new-photo.png',mimeType:'image/png',buffer:Buffer.from('photo')});
 await page.locator('.composer-area button[type=submit]').click();
 await expect(page.getByRole('button',{name:'Retry upload',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Retry upload',exact:true}).click();
 await expect(page.locator('.queued-file')).toHaveCount(0);
 expect(uploads).toBe(2);
});
