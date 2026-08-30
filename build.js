const fs=require('node:fs');
const path=require('node:path');

const root=__dirname;
const out=path.join(root,'dist');
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});

const sourceIndex=path.join(root,'index.html');
let html=fs.readFileSync(sourceIndex,'utf8');
const mobileUiFixTag='<link rel="stylesheet" href="/mobile-ui-fixes.css">';
const coverResponsiveFixTag='<link rel="stylesheet" href="/cover-responsive-fixes.css?v=20260830e">';
if(!html.includes('/mobile-ui-fixes.css')){
  if(!html.includes('</head>'))throw new Error('index.html sem </head> para injeção dos ajustes mobile');
  html=html.replace('</head>',`${mobileUiFixTag}\n</head>`);
}
if(!html.includes('/cover-responsive-fixes.css')){
  if(!html.includes('</head>'))throw new Error('index.html sem </head> para injeção dos ajustes da capa');
  html=html.replace('</head>',`${coverResponsiveFixTag}\n</head>`);
}
const networkTags='<script src="/multiplayer.js"></script>\n<script src="/multiplayer-bridge.js"></script>\n<script src="/multiplayer-gameplay-fixes.js"></script>\n<script src="/multiplayer-lineup-hour.js"></script>\n<script src="/multiplayer-initial-cta.js"></script>\n<script src="/multiplayer-private-deck-card-fixes.js"></script>\n<script src="/mobile-round-fixes.js"></script>\n<script src="/cpu-turn-headliner-hotfix.js?v=20260830c"></script>\n<script src="/approved-cover-loader.js?v=20260830-approved-clean-b"></script>\n<script src="/final-poster-actions.js"></script>\n<script src="/multiplayer-festival-privacy.js?v=20260830a"></script>\n<script src="/multiplayer-invite-hotfix.js?v=20260830a"></script>';
if(!html.includes('/multiplayer.js')){
  if(!html.includes('</body>'))throw new Error('index.html sem </body> para injeção do multiplayer');
  html=html.replace('</body>',`${networkTags}\n</body>`);
}
fs.writeFileSync(path.join(out,'index.html'),html);
fs.cpSync(path.join(root,'assets'),path.join(out,'assets'),{recursive:true});
const previewArt=path.join(root,'preview-new-cards','art');
if(fs.existsSync(previewArt)){
  fs.mkdirSync(path.join(out,'preview-new-cards'),{recursive:true});
  fs.cpSync(previewArt,path.join(out,'preview-new-cards','art'),{recursive:true});
}
fs.cpSync(path.join(root,'approved-cover'),path.join(out,'approved-cover'),{recursive:true});
fs.copyFileSync(path.join(root,'mobile-ui-fixes.css'),path.join(out,'mobile-ui-fixes.css'));
fs.copyFileSync(path.join(root,'cover-responsive-fixes.css'),path.join(out,'cover-responsive-fixes.css'));
fs.copyFileSync(path.join(root,'multiplayer.js'),path.join(out,'multiplayer.js'));
fs.copyFileSync(path.join(root,'multiplayer-bridge.js'),path.join(out,'multiplayer-bridge.js'));
fs.copyFileSync(path.join(root,'multiplayer-gameplay-fixes.js'),path.join(out,'multiplayer-gameplay-fixes.js'));
fs.copyFileSync(path.join(root,'multiplayer-lineup-hour.js'),path.join(out,'multiplayer-lineup-hour.js'));
fs.copyFileSync(path.join(root,'multiplayer-initial-cta.js'),path.join(out,'multiplayer-initial-cta.js'));
fs.copyFileSync(path.join(root,'multiplayer-private-deck-card-fixes.js'),path.join(out,'multiplayer-private-deck-card-fixes.js'));
fs.copyFileSync(path.join(root,'mobile-round-fixes.js'),path.join(out,'mobile-round-fixes.js'));
fs.copyFileSync(path.join(root,'cpu-turn-headliner-hotfix.js'),path.join(out,'cpu-turn-headliner-hotfix.js'));
fs.copyFileSync(path.join(root,'approved-cover-loader.js'),path.join(out,'approved-cover-loader.js'));
fs.copyFileSync(path.join(root,'final-poster-actions.js'),path.join(out,'final-poster-actions.js'));
fs.copyFileSync(path.join(root,'multiplayer-festival-privacy.js'),path.join(out,'multiplayer-festival-privacy.js'));
fs.copyFileSync(path.join(root,'multiplayer-invite-hotfix.js'),path.join(out,'multiplayer-invite-hotfix.js'));
console.log('Headliner build pronto em dist/');
