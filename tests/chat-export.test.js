import test from 'node:test';
import assert from 'node:assert/strict';
import { attachmentPath, conversationText, exportName, zipArchive } from '../shared/chatExport.js';

test('transcript preserves Malayalam, multiline text, stickers and translation', () => {
  const messages = [{created_at:'2026-10-08T12:00:00Z',sender:{name:'Dhanya',handle:'dhanya'},text:'ഹലോ\nHello',sticker:'love',translation:{language:'sw',text:'Habari'},attachment:{id:'one',name:'photo.png'}}];
  const text = conversationText('Our chat',messages,true,new Date('2026-10-08T12:00:00Z'));
  assert.match(text,/ഹലോ\nHello/); assert.match(text,/Habari/); assert.match(text,/💚/);
  assert.match(text,/attachments\/one-photo.png/);
  assert.equal(exportName('../bad\\path:name.txt'), '_bad_path_name.txt');
  assert.equal(attachmentPath({id:'two',name:'photo.png'}),'attachments/two-photo.png');
});
test('ZIP entries have UTF-8 names, valid CRC and matching central offsets', async () => {
  const bytes = new Uint8Array(await zipArchive([{name:'conversation.txt',bytes:new TextEncoder().encode('123456789')},{name:'attachments/മലയാളം.txt',bytes:new TextEncoder().encode('ഹലോ')}]).arrayBuffer());
  const view = new DataView(bytes.buffer);
  assert.equal(view.getUint32(0,true),0x04034b50);
  assert.equal(view.getUint16(6,true),0x800);
  assert.equal(view.getUint32(14,true),0xcbf43926);
  assert.equal(view.getUint32(bytes.length-22,true),0x06054b50);
  assert.equal(view.getUint16(bytes.length-12,true),2);
  const central = view.getUint32(bytes.length-6,true);
  assert.equal(view.getUint32(central,true),0x02014b50);
  assert.equal(view.getUint32(central+42,true),0);
  const next = central+46+view.getUint16(central+28,true);
  const second = view.getUint32(next+42,true);
  assert.equal(view.getUint32(second,true),0x04034b50);
  const length = view.getUint16(second+26,true);
  assert.equal(new TextDecoder().decode(bytes.slice(second+30,second+30+length)),'attachments/മലയാളം.txt');
});
