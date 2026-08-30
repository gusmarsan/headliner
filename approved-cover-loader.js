(()=>{
  const VERSION='20260830-approved-a';
  const PARTS=Array.from({length:8},(_,i)=>`/approved-cover/part-${String(i+1).padStart(2,'0')}.txt?v=${VERSION}`);
  let dataUrlPromise=null;
  let applying=false;

  function getCoverDataUrl(){
    if(!dataUrlPromise){
      dataUrlPromise=Promise.all(PARTS.map(async url=>{
        const response=await fetch(url,{cache:'force-cache'});
        if(!response.ok)throw new Error(`Falha ao carregar ${url}: ${response.status}`);
        return (await response.text()).trim();
      })).then(chunks=>`data:image/webp;base64,${chunks.join('')}`);
    }
    return dataUrlPromise;
  }

  function prepareImages(images){
    images.forEach(img=>{
      const picture=img.closest('picture');
      /* Never allow the obsolete mobile artwork to win the <picture> source
         race while the approved embedded cover is loading. */
      if(picture)picture.querySelectorAll('source').forEach(source=>source.remove());
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');

      /* On phones, hide the legacy bitmap during the very short assembly
         window instead of flashing the broken/contained mobile poster. */
      if(window.matchMedia?.('(max-width:760px)').matches && img.dataset.approvedCover!=='1'){
        img.style.opacity='0';
      }
    });
  }

  async function applyApprovedCover(){
    const images=[...document.querySelectorAll('.cover-art')];
    if(!images.length)return;

    prepareImages(images);

    try{
      const src=await getCoverDataUrl();
      images.forEach(img=>{
        if(img.dataset.approvedCover==='1')return;
        img.src=src;
        img.alt='Headliner';
        img.dataset.approvedCover='1';
        img.style.opacity='1';
      });
    }catch(error){
      /* Safe visual fallback: desktop art is preferable to the obsolete,
         damaged mobile asset if the embedded cover cannot be assembled. */
      images.forEach(img=>{
        if(img.dataset.approvedCover==='1')return;
        img.src='assets/cover-official-desktop.png';
        img.style.opacity='1';
      });
      throw error;
    }

    document.querySelectorAll('.cover-final-caption').forEach(el=>{
      el.style.setProperty('display','none','important');
    });
  }

  function sync(){
    if(applying)return;
    const pending=[...document.querySelectorAll('.cover-art:not([data-approved-cover="1"])')];
    if(!pending.length)return;
    prepareImages(pending);
    applying=true;
    applyApprovedCover()
      .catch(error=>console.error('[approved-cover]',error))
      .finally(()=>{applying=false;});
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',sync,{once:true});
  }else{
    sync();
  }

  new MutationObserver(sync).observe(document.documentElement,{childList:true,subtree:true});
})();
