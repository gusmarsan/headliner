const fs=require('node:fs');
const path=require('node:path');

const root=__dirname;
const out=path.join(root,'dist');
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});

const sourceIndex=path.join(root,'index.html');
let html=fs.readFileSync(sourceIndex,'utf8');

if(!html.includes('</head>'))throw new Error('index.html sem </head> para injeção dos estilos');
if(!html.includes('</body>'))throw new Error('index.html sem </body> para injeção dos scripts');

function escapeRegExp(value){
  return value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
}

function ensureStylesheet(baseHref,tag){
  const escaped=escapeRegExp(baseHref);
  const re=new RegExp(`<link\\b[^>]*\\bhref=(["'])${escaped}(?:\\?[^"']*)?\\1[^>]*>\\s*`,'gi');
  html=html.replace(re,'');
  html=html.replace('</head>',`${tag}\n</head>`);
}

ensureStylesheet('/mobile-ui-fixes.css','<link rel="stylesheet" href="/mobile-ui-fixes.css">');
ensureStylesheet('/cover-responsive-fixes.css','<link rel="stylesheet" href="/cover-responsive-fixes.css?v=20260830e">');

/* Always rebuild the supplemental runtime tail from a canonical ordered list.
   The previous all-or-nothing `/multiplayer.js` check could leave newer fixes
   out of dist whenever just one legacy script was already present in source. */
const runtimeScripts=[
  ['/multiplayer.js','<script src="/multiplayer.js"></script>'],
  ['/multiplayer-bridge.js','<script src="/multiplayer-bridge.js"></script>'],
  ['/multiplayer-gameplay-fixes.js','<script src="/multiplayer-gameplay-fixes.js"></script>'],
  ['/multiplayer-lineup-hour.js','<script src="/multiplayer-lineup-hour.js"></script>'],
  ['/multiplayer-initial-cta.js','<script src="/multiplayer-initial-cta.js?v=20260831b"></script>'],
  ['/multiplayer-private-deck-card-fixes.js','<script src="/multiplayer-private-deck-card-fixes.js"></script>'],
  ['/mobile-round-fixes.js','<script src="/mobile-round-fixes.js?v=20260831d"></script>'],
  ['/solo-initial-lineup-review.js','<script src="/solo-initial-lineup-review.js?v=20260831f"></script>'],
  ['/solo-lineup-headliner-click-fix.js','<script src="/solo-lineup-headliner-click-fix.js?v=20260831c"></script>'],
  ['/solo-lineup-entry-guard.js','<script src="/solo-lineup-entry-guard.js?v=20260831c"></script>'],
  ['/cpu-turn-headliner-hotfix.js','<script src="/cpu-turn-headliner-hotfix.js?v=20260831f"></script>'],
  ['/initial-headliner-click-fix.js','<script src="/initial-headliner-click-fix.js?v=20260831a"></script>'],
  ['/headliner-scheduled-plaque.js','<script src="/headliner-scheduled-plaque.js?v=20260831c"></script>'],
  ['/solo-attribute-turn-watchdog.js','<script src="/solo-attribute-turn-watchdog.js?v=20260831a"></script>'],
  ['/approved-cover-loader.js','<script src="/approved-cover-loader.js?v=20260830-approved-clean-b"></script>'],
  ['/final-poster-actions.js','<script src="/final-poster-actions.js"></script>'],
  ['/multiplayer-festival-privacy.js','<script src="/multiplayer-festival-privacy.js?v=20260831b"></script>'],
  ['/multiplayer-turn-fallback.js','<script src="/multiplayer-turn-fallback.js?v=20260831a"></script>'],
  ['/multiplayer-connection-hotfix.js','<script src="/multiplayer-connection-hotfix.js?v=20260831c"></script>'],
  ['/multiplayer-invite-hotfix.js','<script src="/multiplayer-invite-hotfix.js?v=20260831d"></script>'],
  ['/solo-lineup-hard-entry.js','<script src="/solo-lineup-hard-entry.js?v=20260831a"></script>']
];

for(const [src] of runtimeScripts){
  const escaped=escapeRegExp(src);
  const re=new RegExp(`<script\\b[^>]*\\bsrc=(["'])${escaped}(?:\\?[^"']*)?\\1[^>]*>\\s*</script>\\s*`,'gi');
  html=html.replace(re,'');
}
html=html.replace('</body>',`${runtimeScripts.map(([,tag])=>tag).join('\n')}\n</body>`);

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
fs.copyFileSync(path.join(root,'solo-initial-lineup-review.js'),path.join(out,'solo-initial-lineup-review.js'));
fs.copyFileSync(path.join(root,'solo-lineup-headliner-click-fix.js'),path.join(out,'solo-lineup-headliner-click-fix.js'));
fs.copyFileSync(path.join(root,'solo-lineup-entry-guard.js'),path.join(out,'solo-lineup-entry-guard.js'));
fs.copyFileSync(path.join(root,'cpu-turn-headliner-hotfix.js'),path.join(out,'cpu-turn-headliner-hotfix.js'));
fs.copyFileSync(path.join(root,'initial-headliner-click-fix.js'),path.join(out,'initial-headliner-click-fix.js'));
fs.copyFileSync(path.join(root,'headliner-scheduled-plaque.js'),path.join(out,'headliner-scheduled-plaque.js'));
fs.copyFileSync(path.join(root,'solo-attribute-turn-watchdog.js'),path.join(out,'solo-attribute-turn-watchdog.js'));
fs.copyFileSync(path.join(root,'approved-cover-loader.js'),path.join(out,'approved-cover-loader.js'));
fs.copyFileSync(path.join(root,'final-poster-actions.js'),path.join(out,'final-poster-actions.js'));
fs.copyFileSync(path.join(root,'multiplayer-festival-privacy.js'),path.join(out,'multiplayer-festival-privacy.js'));
fs.copyFileSync(path.join(root,'multiplayer-turn-fallback.js'),path.join(out,'multiplayer-turn-fallback.js'));
fs.copyFileSync(path.join(root,'multiplayer-connection-hotfix.js'),path.join(out,'multiplayer-connection-hotfix.js'));
fs.copyFileSync(path.join(root,'multiplayer-invite-hotfix.js'),path.join(out,'multiplayer-invite-hotfix.js'));
fs.copyFileSync(path.join(root,'solo-lineup-hard-entry.js'),path.join(out,'solo-lineup-hard-entry.js'));
console.log('Headliner build pronto em dist/');
