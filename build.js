const fs=require('node:fs');
const path=require('node:path');

const root=__dirname;
const out=path.join(root,'dist');
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});

const sourceIndex=path.join(root,'index.html');
let html=fs.readFileSync(sourceIndex,'utf8');
const multiplayerTag='<script src="/multiplayer.js"></script>';
if(!html.includes(multiplayerTag)){
  if(!html.includes('</body>'))throw new Error('index.html sem </body> para injeção do multiplayer');
  html=html.replace('</body>',`${multiplayerTag}\n</body>`);
}
fs.writeFileSync(path.join(out,'index.html'),html);
fs.cpSync(path.join(root,'assets'),path.join(out,'assets'),{recursive:true});
fs.copyFileSync(path.join(root,'multiplayer.js'),path.join(out,'multiplayer.js'));
console.log('Headliner build pronto em dist/');
