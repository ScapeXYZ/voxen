const ts=require('typescript'),fs=require('node:fs'),assert=require('node:assert/strict');
const source=ts.transpileModule(fs.readFileSync('lib/voxen/community-access.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const target={exports:{}};new Function('exports','module',source)(target.exports,target);
const parse=target.exports.parseCommunityAccess;
const wallet='0x'+'ab'.repeat(20),communityId='commons';
for(const role of ['OWNER','ADMIN','MEMBER']){
 const record={wallet,communityId,role,whitelisted:true};
 assert.equal(parse(record,wallet.toUpperCase(),communityId).status,'verified');
 assert.equal(parse({...record,whitelisted:false},wallet,communityId).status,'unavailable');
 assert.equal(parse(record,'0x'+'cd'.repeat(20),communityId).status,'unavailable');
 assert.equal(parse(record,wallet,'other').status,'unavailable');
}
assert.equal(parse({wallet,communityId,role:'NONE',whitelisted:false},wallet,communityId).status,'denied');
for(const value of [null,{}, {wallet,communityId,role:'SUPERUSER',whitelisted:true},{wallet,communityId,role:'NONE',whitelisted:true}]) assert.equal(parse(value,wallet,communityId).status,'unavailable');
console.log('PASS: membership roles, wallet/community scope mismatch and inconsistent grants fail closed. Presentation validation only.');
