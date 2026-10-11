import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = await mkdtemp(path.join(tmpdir(), 'happy-bank-parser-'));
const outfile = path.join(dir, 'parser.mjs');
await build({entryPoints:['src/utils/bankMessage.ts'],bundle:true,format:'esm',platform:'node',outfile});
const {parseBankMessage} = await import(pathToFileURL(outfile).href);
test.after(async () => { await rm(dir, {recursive:true,force:true}); });
const examples = [
 ['شراء-POS\nبـ23.75 SAR\nمن NABA ALSA\nلك-ابل*8466\nفي 10/10/26 21:42', {amount:'23.75',merchant:'NABA ALSA',date:'2026-10-10'}],
 ['شراء محلي عبر الانترنت\nبـ101.65 SAR\nمن 8901*\nمن Amazon No\nلك *8466\nفي 10/10/26 14:06', {amount:'101.65',merchant:'Amazon No',date:'2026-10-10'}],
 ['شراء إنترنت ‬‪\nمبلغ ‬‪55.32 ‬‪SAR (‬‪55.32 SAR)\nبطاقة ‬‪مسبقة الدفع ***1963\nمن ‬‪OPENAI *CHATGPT SUBSCR\nالتاريخ ‬‪08/10/26 ‬‪15:59\nالرصيد المتبقي ‬‪0.00 ‬‪SAR', {amount:'55.32',merchant:'OPENAI *CHATGPT SUBSCR',date:'2026-10-08'}],
 ['شراء عبر الانترنت\nمن*5661 مدى-ابل باي\nبـ7.39 SR\nرقم الحساب 8794\nمنJeeny\n07/10/26 19:00', {amount:'7.39',merchant:'Jeeny',date:'2026-10-07'}],
];
for (const [index, [message, expected]] of examples.entries()) test(`bank example ${index + 1} extracts purchase without balance/card/account`,()=>assert.deepEqual(parseBankMessage(message),expected));
test('Arabic digits, decimal separator and thousands',()=>assert.equal(parseBankMessage('شراء\nبـ١٬٢٣٤٫٥٦ SAR').amount,'1234.56'));
test('reject ambiguity, refunds, non-purchases, invalid amounts and other currencies',()=>{
 for(const message of ['', 'الرصيد المتبقي 55 SAR', 'شراء بـ23 USD','شراء بـ0 SAR','شراء بـ-23 SAR','شراء بـ12.345 SAR','إلغاء شراء بـ23 SAR',examples[0][0]+'\n'+examples[1][0], 'شراء بـ23 SAR\nمبلغ 24 SAR']) assert.equal(parseBankMessage(message),null,message);
});
test('invalid date does not replace the selected date',()=>assert.equal(parseBankMessage('شراء بـ25 SAR\n31/02/26').date,undefined));
