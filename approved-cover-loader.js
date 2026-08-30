(()=>{
  const APPROVED_COVER='/assets/cover-official-desktop.png?v=20260830-clean-a';

  function applyApprovedCover(){
    document.querySelectorAll('.cover-art').forEach(img=>{
      const picture=img.closest('picture');

      /* The old mobile source is not allowed to win the picture selection.
         Use the clean approved raster directly on every viewport. */
      if(picture)picture.querySelectorAll('source').forEach(source=>source.remove());

      img.removeAttribute('srcset');
      img.removeAttribute('sizes');

      if(img.getAttribute('src')!==APPROVED_COVER){
        img.src=APPROVED_COVER;
      }

      img.alt='Headliner — Music Card Game';
      img.dataset.approvedCover='1';
      img.style.opacity='1';
    });

    document.querySelectorAll('.cover-final-caption').forEach(el=>{
      el.style.setProperty('display','none','important');
    });
  }

  function sync(){
    if(document.querySelector('.cover-art'))applyApprovedCover();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',sync,{once:true});
  }else{
    sync();
  }

  new MutationObserver(sync).observe(document.documentElement,{childList:true,subtree:true});
})();
