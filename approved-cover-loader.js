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

  async function applyApprovedCover(){
    const images=[...document.querySelectorAll('.cover-art')];
    if(!images.length)return;

    const src=await getCoverDataUrl();
    images.forEach(img=>{
      if(img.dataset.approvedCover==='1')return;
      const picture=img.closest('picture');
      if(picture)picture.querySelectorAll('source').forEach(source=>source.remove());
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      img.src=src;
      img.alt='Headliner';
      img.dataset.approvedCover='1';
    });

    document.querySelectorAll('.cover-final-caption').forEach(el=>{
      el.style.setProperty('display','none','important');
    });
  }

  function sync(){
    if(applying)return;
    if(!document.querySelector('.cover-art:not([data-approved-cover="1"])'))return;
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
