(function(){
  const network=window.HeadlinerNetwork;
  if(!network)return;

  const style=document.createElement('style');
  style.id='headliner-multiplayer-private-deck-card-fixes';
  style.textContent=`
    /* Private multiplayer deck uses the same clean title treatment already
       approved for the hand/battle surfaces. The parent grid is centered, so
       title alignment must be reset explicitly inside the card. */
    .private-deck-screen .live-card-deck .card.large .artist-zone .name{
      text-align:left!important;
      text-shadow:none!important;
    }
    .private-deck-screen .live-card-deck .card.large .artist-zone .name .title-line{
      display:block;
      width:max-content;
      max-width:100%;
      margin-left:0!important;
      margin-right:auto!important;
      text-align:left!important;
      transform-origin:left top!important;
    }
    .private-deck-screen .live-card-deck .card.large.has-artist-art.art-ink-dark .artist-zone .name .title-line:before{
      content:none!important;
    }
    .private-deck-screen .live-card-deck .card.large.has-artist-art.art-title-punch .artist-zone .name .title-line{
      transform:none!important;
    }
  `;
  document.head.appendChild(style);
})();
