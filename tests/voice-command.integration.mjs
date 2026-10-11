import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = await mkdtemp(path.join(tmpdir(), 'happy-voice-'));
const outfile = path.join(dir,'parser.mjs');
await build({entryPoints:['src/utils/voiceCommand.ts'],bundle:true,platform:'node',format:'esm',outfile});
const {parseVoiceCommand} = await import(pathToFileURL(outfile).href);
test.after(()=>rm(dir,{recursive:true,force:true}));
test('Arabic/Persian decimal digits and expense category',()=>{
 for(const text of ['صرفت ٢٥٫٥٠ ريال بنزين','صرفت ۲۵٫۵۰ ريال بنزين']) {
 const result=parseVoiceCommand(text,'expense'); assert.equal(result.amount,25.5); assert.equal(result.categoryOrSource,'transport'); }
});
test('Arabic compound amounts used in the UI examples',()=>{
 for(const [text,amount] of [['راتب خمسة آلاف',5000],['صرفت مية وعشرين فاتورة مياه',120],['مكافأة ميتين وخمسين',250],['صرفت واحد ريال',1]]) assert.equal(parseVoiceCommand(text,'expense').amount,amount,text);
});
test('income source and negative amounts',()=>{
 assert.equal(parseVoiceCommand('راتب 5000 ريال','income').categoryOrSource,'راتب');
 for(const text of ['صرفت -25 ريال','صرفت سالب خمسة ريال','صرفت 12.345 ريال']) assert.equal(parseVoiceCommand(text,'expense').amount,undefined);
});
