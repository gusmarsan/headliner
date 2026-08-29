(function(){
  if(typeof resultPosterHTML!=='function')return;

  const style=document.createElement('style');
  style.textContent=`
    .festival-poster .poster-actions{
      display:flex!important;
      flex-direction:column!important;
      align-items:center!important;
      justify-content:center!important;
      gap:0!important;
      width:100%;
    }
    .festival-poster .poster-actions > .primary{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      flex:none!important;
    }
    .festival-poster .final-exit-link{
      display:block!important;
      appearance:none;
      -webkit-appearance:none;
      flex:none!important;
      border:0!important;
      background:transparent!important;
      box-shadow:none!important;
      padding:0!important;
      margin:9px auto 0!important;
      width:auto!important;
      min-width:0!important;
      min-height:0!important;
      color:inherit;
      font:inherit;
      font-size:13px;
      font-weight:700;
      line-height:1.2;
      text-decoration:underline;
      text-underline-offset:3px;
      cursor:pointer;
    }
  `;
  document.head.appendChild(style);

  const baseResultPosterHTML=resultPosterHTML;
  resultPosterHTML=function(options){
    if(!options||typeof options!=='object')return baseResultPosterHTML(options);
    let actions=String(options.actions||'');
    const isStandardReplay=/onclick=["']playAgain\(\)["']/.test(actions);
    const alreadyHasExit=/onclick=["']exitToMenu\(\)["']/.test(actions);

    if(isStandardReplay&&!alreadyHasExit){
      actions+=`<button type="button" class="final-exit-link" onclick="exitToMenu()">Sair</button>`;
    }

    return baseResultPosterHTML({...options,actions});
  };
})();
