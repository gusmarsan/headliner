const fs=require('node:fs');
const path=require('node:path');

const root=__dirname;
const out=path.join(root,'dist');
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});

const sourceIndex=path.join(root,'index.html');
let html=fs.readFileSync(sourceIndex,'utf8');
const mobileUiFixTag='<link rel="stylesheet" href="/mobile-ui-fixes.css">';
if(!html.includes('/mobile-ui-fixes.css')){
  if(!html.includes('</head>'))throw new Error('index.html sem </head> para injeção dos ajustes mobile');
  html=html.replace('</head>',`${mobileUiFixTag}\n</head>`);
}
const networkTags='<script src="/multiplayer.js"></script>\n<script src="/multiplayer-bridge.js"></script>\n<script src="/multiplayer-gameplay-fixes.js"></script>\n<script src="/mobile-round-fixes.js"></script>\n<script src="/final-poster-actions.js"></script>';
if(!html.includes('/multiplayer.js')){
  if(!html.includes('</body>'))throw new Error('index.html sem </body> para injeção do multiplayer');
  html=html.replace('</body>',`${networkTags}\n</body>`);
}
fs.writeFileSync(path.join(out,'index.html'),html);
fs.cpSync(path.join(root,'assets'),path.join(out,'assets'),{recursive:true});
fs.copyFileSync(path.join(root,'mobile-ui-fixes.css'),path.join(out,'mobile-ui-fixes.css'));
fs.copyFileSync(path.join(root,'multiplayer.js'),path.join(out,'multiplayer.js'));
fs.copyFileSync(path.join(root,'multiplayer-bridge.js'),path.join(out,'multiplayer-bridge.js'));
fs.copyFileSync(path.join(root,'multiplayer-gameplay-fixes.js'),path.join(out,'multiplayer-gameplay-fixes.js'));
fs.copyFileSync(path.join(root,'mobile-round-fixes.js'),path.join(out,'mobile-round-fixes.js'));
fs.copyFileSync(path.join(root,'final-poster-actions.js'),path.join(out,'final-poster-actions.js'));
console.log('Headliner build pronto em dist/');
