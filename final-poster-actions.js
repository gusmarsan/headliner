(function(){
  if(typeof resultPosterHTML!=='function')return;

  const style=document.createElement('style');
  style.textContent=`
    .festival-poster .poster-actions{
      flex-direction:column;
      align-items:center;
    }
    .festival-poster .final-exit-link{
      appearance:none;
      -webkit-appearance:none;
      border:0;
      background:transparent;
      box-shadow:none;
      padding:0;
      margin:8px auto 0;
      width:auto;
      min-width:0;
      min-height:0;
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
