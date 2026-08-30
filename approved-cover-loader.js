(()=>{
  const DESKTOP_COVER='/assets/cover-official-desktop.png?v=20260830-clean-b';
  const MOBILE_COVER='/assets/cover-official-mobile.png?v=20260830-clean-b';

  function coverForViewport(){
    return window.matchMedia('(max-width:760px)').matches ? MOBILE_COVER : DESKTOP_COVER;
  }

  function applyApprovedCover(){
    const approvedCover=coverForViewport();

    document.querySelectorAll('.cover-art').forEach(img=>{
      const picture=img.closest('picture');

      /* Keep selection deterministic: desktop gets the landscape master and
         phones get the dedicated portrait master. */
      if(picture)picture.querySelectorAll('source').forEach(source=>source.remove());

      img.removeAttribute('srcset');
      img.removeAttribute('sizes');

      if(img.getAttribute('src')!==approvedCover){
        img.src=approvedCover;
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

  window.addEventListener('resize',sync,{passive:true});
  new MutationObserver(sync).observe(document.documentElement,{childList:true,subtree:true});
})();
