const fs=require('node:fs');const path=require('node:path');const zlib=require('node:zlib');const crypto=require('node:crypto');
const payload=fs.readFileSync(path.join(__dirname,'source.br.b64'),'utf8').trim();
const bytes=zlib.brotliDecompressSync(Buffer.from(payload,'base64'));
const entries=JSON.parse(bytes.toString('utf8'));
for(const [name,content] of Object.entries(entries)){
 if(!/^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[\w./-]+$/.test(name))throw new Error('Invalid entry: '+name);
 const dest=path.resolve(__dirname,name);if(!dest.startsWith(__dirname+path.sep))throw new Error('Path escape');
 fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,content,'utf8');
}
console.log('COURTSIDE IQ: restored '+Object.keys(entries).length+' source files');
