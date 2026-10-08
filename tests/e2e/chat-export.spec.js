import { test, expect } from '@playwright/test';
test('export downloads all history as text or a ZIP with attachments',async({page})=>{
 const me='11111111-1111-4111-8111-111111111111',peer='22222222-2222-4222-8222-222222222222',cid='33333333-3333-4333-8333-333333333333',mid='44444444-4444-4444-8444-444444444444';
 const message={id:mid,seq:'1',sender_id:peer,sender:{id:peer,name:'Friend'},conversation_id:cid,text:'Address: 12 Garden Road',source_language:'en',created_at:'2026-10-08T10:00:00Z',starred:false,pinned:false,attachment:{id:'photo',name:'memory.png',mime:'image/png',size:68}};
 let uploads=0;
 let pages=0;
 await page.route('**/api/**',async route=>{
  const url=new URL(route.request().url()),path=url.pathname;let data={};
  if(path.endsWith('/export')) {pages++;const first=!url.searchParams.has('through');data={through:'2',messages:first?[{...message,seq:'1',text:'ഹലോ from history'}]:[{...message,id:'older',seq:'2',text:'Second page'}],has_more:first};}
  else if(path==='/api/attachments/photo'){data={url:'/test-photo.png'};}
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


 await page.getByRole('button',{name:'Export chat',exact:true}).click();
 const modal=page.getByRole('dialog',{name:'Export chat'});
 await modal.getByRole('checkbox').uncheck();
 const textDownload=page.waitForEvent('download');
 await modal.getByRole('button',{name:'Download text',exact:true}).click();
 const text=await textDownload;
 const {readFile}=await import('node:fs/promises');
 expect(text.suggestedFilename()).toMatch(/Friend-.*\.txt$/);
 const transcript=await readFile(await text.path(),'utf8');
 expect(transcript).toContain('ഹലോ from history'); expect(transcript).toContain('Second page');
 await modal.getByRole('checkbox').check();
 const zipDownload=page.waitForEvent('download');
 await modal.getByRole('button',{name:'Download ZIP',exact:true}).click();
 const zip=await zipDownload;
 expect(zip.suggestedFilename()).toMatch(/\.zip$/);
 const bytes=await readFile(await zip.path());
 expect(bytes.readUInt32LE(0)).toBe(0x04034b50);
 expect(bytes.includes(Buffer.from('attachments/photo-memory.png'))).toBe(true);
 expect(bytes.readUInt16LE(bytes.length-12)).toBe(2);
 expect(pages).toBe(4);
});
