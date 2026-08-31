(()=>{
  const APPROVED_COVER='/assets/cover-official-desktop.png?v=20260831-single-cover-a';

  function applyApprovedCover(){
    document.querySelectorAll('.cover-art').forEach(img=>{
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');

      if(img.getAttribute('src')!==APPROVED_COVER){
        img.src=APPROVED_COVER;
      }

      img.alt='Headliner — Music Card Game';
      img.dataset.approvedCover='1';
      img.style.opacity='1';
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
