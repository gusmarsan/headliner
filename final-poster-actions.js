(function(){
  if(typeof resultPosterHTML!=='function')return;

  const baseResultPosterHTML=resultPosterHTML;
  resultPosterHTML=function(options){
    if(!options||typeof options!=='object')return baseResultPosterHTML(options);
    let actions=String(options.actions||'');
    const isStandardReplay=/onclick=["']playAgain\(\)["']/.test(actions);
    const alreadyHasExit=/onclick=["']exitToMenu\(\)["']/.test(actions);

    if(isStandardReplay&&!alreadyHasExit){
      actions+=`<button class="secondary" onclick="exitToMenu()">Sair</button>`;
    }

    return baseResultPosterHTML({...options,actions});
  };
})();
