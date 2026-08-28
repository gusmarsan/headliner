(function(){
  // Global cleanup bridge. Network screen markup lives only in multiplayer.js.
  const cleanupNetworkChrome=()=>document.querySelectorAll('.network-chip,.network-turn-note').forEach(el=>el.remove());
  if(typeof window.networkBackToMenu==='function'){
    const originalBack=window.networkBackToMenu;
    window.networkBackToMenu=function(){cleanupNetworkChrome();return originalBack.apply(this,arguments)};
  }
  if(typeof window.exitToMenu==='function'){
    const originalExit=window.exitToMenu;
    window.exitToMenu=function(){cleanupNetworkChrome();return originalExit.apply(this,arguments)};
  }
})();
