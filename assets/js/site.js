/* Progressive enhancement: all page content and links exist in the HTML. */
(() => {
  'use strict';
  const config = JSON.parse(document.querySelector('#site-config')?.textContent || '{"demoMode":true}');
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const store = {
    get(key) { try { return JSON.parse(sessionStorage.getItem(`samria.${key}`)); } catch { return null; } },
    set(key, value) { try { sessionStorage.setItem(`samria.${key}`, JSON.stringify(value)); } catch { /* Private browsing may disable storage. */ } },
    remove(key) { try { sessionStorage.removeItem(`samria.${key}`); } catch { /* Optional enhancement. */ } }
  };
  const currentPath = location.pathname + location.search;
  const scrollKey = `scroll:${currentPath}`;
  const rememberScroll = () => store.set(scrollKey, {x:scrollX,y:scrollY});
  addEventListener('pagehide', rememberScroll);
  $$('a[href]').forEach(a => a.addEventListener('click', () => {rememberScroll();store.set('previous',currentPath);}));
  addEventListener('pageshow', event => {
    const backForward = performance.getEntriesByType('navigation')[0]?.type === 'back_forward';
    const saved = store.get(scrollKey);
    if ((backForward || event.persisted) && saved) requestAnimationFrame(() => scrollTo({left:saved.x,top:saved.y,behavior:'instant'}));
  });
  $$('[data-back]').forEach(button => {
    const prior = store.get('previous');
    const sameOriginReferrer = (() => {try{return new URL(document.referrer).origin===location.origin;}catch{return false;}})();
    if (history.length <= 1 || (!prior && !sameOriginReferrer)) {
      button.disabled = true;button.setAttribute('aria-disabled','true');button.title='لا توجد صفحة سابقة في هذه الجلسة';
    }
    button.addEventListener('click', () => {if(!button.disabled)history.back();});
  });

  const menu = $('#main-navigation');
  const menuButton = $('[data-menu-toggle]');
  function closeMenu() {menu?.classList.remove('is-open');menuButton?.setAttribute('aria-expanded','false');}
  menuButton?.addEventListener('click', () => {
    const open=menu.classList.toggle('is-open');menuButton.setAttribute('aria-expanded',String(open));
    menuButton.setAttribute('aria-label',open?'إغلاق القائمة':'فتح القائمة');
  });
  menu?.addEventListener('click', e => {if(e.target.closest('a'))closeMenu();});
  document.addEventListener('click', e => {if(menu && !menu.contains(e.target) && !menuButton?.contains(e.target))closeMenu();});
  document.addEventListener('keydown', e => {if(e.key==='Escape'){closeMenu();}});

  const clinics={general:'الطب العام',women:'النساء والولادة',dermatology:'الجلدية والتجميل',dental:'الأسنان',pediatrics:'الأطفال',internal:'الباطنة',cardiology:'القلب',eyes:'العيون',orthopedics:'العظام',surgery:'الجراحة',ent:'الأنف والأذن والحنجرة',urology:'المسالك البولية',unsure:'لست متأكدًا'};
  const branches={naseem:'النسيم',mohamdyia:'المحمدية',samer:'السامر'};
  const doctors={sherif:'د. شريف حسين',jehan:'د. جيهان محمود',arwa:'د. أروى'};
  const offers={dental:'استشارة وتنظيف للأسنان',general:'الفحص العام',skin:'عناية البشرة',pediatrics:'عناية الأطفال',eyes:'فحص العيون',cardiology:'صحة القلب',women:'صحة المرأة',orthopedics:'العظام'};
  const query=new URLSearchParams(location.search);
  const selected={doctor:query.get('doctor')||'',clinic:query.get('clinic')||'',branch:query.get('branch')||'',offer:query.get('offer')||''};
  const request=store.get('request');
  if(request && Date.now()-request.at>30*60*1000)store.remove('request');
  const edit=query.has('edit') && request && Date.now()-request.at<30*60*1000 ? request.fields : null;
  function selectValue(control,value,map={}) {
    if(!control||!value)return;
    if(control.tagName!=='SELECT'){control.value=value;return;}
    const values=[value,map[value]];
    const option=[...control.options].find(o=>values.includes(o.value)||values.includes(o.textContent.trim()));
    if(option)control.value=option.value;
  }
  function normalizePhone(value) {
    return value.replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[\s()\-]/g,'');
  }
  function errorFor(field) {const id=field.getAttribute('aria-describedby')?.split(' ').find(id=>document.getElementById(id)?.classList.contains('field-error'));return id?document.getElementById(id):null;}
  function validate(field) {
    let valid=true,message=field.dataset.error||'راجع هذا الحقل من فضلك.';
    const value=field.value.trim();
    if(field.required && !value)valid=false;
    else if(field.name==='name' && value && value.length<2)valid=false;
    else if(field.name==='phone' && value && !/^(?:05\d{8}|\+?9665\d{8}|009665\d{8}|5\d{8})$/.test(normalizePhone(value))) {
      valid=false;message='اكتب رقم جوال صحيحًا، مثل 05X XXX XXXX.';
    } else if(field.type==='date' && value && field.min && value<field.min) {valid=false;message='اختر تاريخ اليوم أو يومًا لاحقًا.';}
    field.setAttribute('aria-invalid',String(!valid));
    const error=errorFor(field);
    if(error){error.textContent=valid?'':message;error.hidden=valid;}
    return valid;
  }
  $$('[data-booking-form]').forEach(form=>{
    if(edit && form.id==='appointment-form')Object.entries(edit).forEach(([name,value])=>selectValue(form.elements.namedItem(name),value,name==='clinic'?clinics:branches));
    else {
      selectValue(form.elements.namedItem('clinic'),selected.clinic,clinics);
      selectValue(form.elements.namedItem('branch'),selected.branch,branches);
    }
    const context=$('[data-context-summary]',form);
    const labels=[doctors[selected.doctor]||selected.doctor,offers[selected.offer]||selected.offer].filter(Boolean);
    if(context && labels.length){context.textContent=`طلب موعد: ${labels.join(' · ')}`;context.hidden=false;}
    const date=$('input[type=date]',form);
    if(date){const now=new Date();date.min=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;}
    $$('input:not([type=hidden]),select,textarea',form).forEach(field=>{
      field.addEventListener('blur',()=>{if(field.value||field.getAttribute('aria-invalid')==='true')validate(field);});
      field.addEventListener('input',()=>{if(field.getAttribute('aria-invalid')==='true')validate(field);});
      field.addEventListener('change',()=>{if(field.getAttribute('aria-invalid')==='true')validate(field);});
    });
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      const controls=$$('input:not([type=hidden]),select,textarea',form).filter(f=>!f.disabled);
      const invalid=controls.filter(field=>!validate(field));
      if(invalid.length){invalid[0].focus();return;}
      const fields=Object.fromEntries(new FormData(form));
      fields.phone=normalizePhone(fields.phone||'');
      fields.doctor=fields.doctor||selected.doctor;fields.offer=fields.offer||selected.offer;
      if(config.demoMode){
        store.set('request',{at:Date.now(),fields});rememberScroll();store.set('previous',currentPath);
        location.assign('appointment-received.html?demo=1');return;
      }
      const status=$('.form-status',form)||$('[data-context-summary]',form);
      const submitters=$$('button[type=submit]',form).concat($$(`button[form="${form.id}"]`));
      submitters.forEach(b=>b.disabled=true);
      try {
        if(!config.bookingEndpoint)throw Error('Missing booking endpoint');
        const response=await fetch(config.bookingEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(fields)});
        const result=await response.json();
        if(!response.ok||result.success!==true)throw Error('Request not accepted');
        location.assign('appointment-received.html');
      } catch {
        if(status){status.textContent='تعذّر إرسال الطلب الآن. حاول مرة أخرى أو تواصل مع فريق الحجز.';status.hidden=false;}
      } finally {submitters.forEach(b=>b.disabled=false);}
    });
  });
  $$('[data-demo-note]').forEach(note=>{note.hidden=!config.demoMode;});

  const branchTabs=$$('[data-branch-tab]');
  function activateBranch(tab,focus=false) {
    branchTabs.forEach(t=>{const active=t===tab;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;});
    $$('[data-branch-panel]').forEach(p=>p.hidden=p.dataset.branchPanel!==tab.dataset.branchTab);
    if(focus)tab.focus();
  }
  branchTabs.forEach((tab,i)=>{
    tab.addEventListener('click',()=>activateBranch(tab));
    tab.addEventListener('keydown',e=>{
      let next;
      if(e.key==='ArrowLeft')next=(i+1)%branchTabs.length;
      if(e.key==='ArrowRight')next=(i-1+branchTabs.length)%branchTabs.length;
      if(e.key==='Home')next=0;if(e.key==='End')next=branchTabs.length-1;
      if(next!==undefined){e.preventDefault();activateBranch(branchTabs[next],true);}
    });
  });
  if(selected.branch){const tab=branchTabs.find(t=>t.dataset.branchTab===selected.branch);if(tab)activateBranch(tab);}

  // Each loop travels exactly one source group. Add enough decorative copies
  // to cover the viewport at every phase, including wide screens and resize.
  $$('[data-marquee]').forEach(track=>{
    const source=$('[data-marquee-source]',track),viewport=track.parentElement;
    if(!source)return;
    const reduced=matchMedia('(prefers-reduced-motion:reduce)');
    let last='',pending=0;
    function update(){
      pending=0;
      const distance=source.getBoundingClientRect().width,width=viewport.clientWidth;
      if(!distance||!width)return;
      const signature=`${distance}:${width}:${reduced.matches}`;
      if(signature===last)return;last=signature;
      $$('[data-marquee-clone]',track).forEach(group=>group.remove());
      const copies=reduced.matches?0:Math.ceil(width/distance)+1;
      for(let i=0;i<copies;i++){
        const copy=source.cloneNode(true);copy.removeAttribute('data-marquee-source');
        copy.setAttribute('data-marquee-clone','');copy.setAttribute('aria-hidden','true');copy.inert=true;
        $$('[id]',copy).forEach(el=>el.removeAttribute('id'));
        $$('img',copy).forEach(img=>{img.alt='';img.loading='eager';img.draggable=false;});track.append(copy);
      }
      track.style.setProperty('--marquee-distance',`${distance}px`);
    }
    function schedule(){if(!pending)pending=requestAnimationFrame(update);}
    const observer=new ResizeObserver(schedule);observer.observe(viewport);observer.observe(source);
    reduced.addEventListener('change',()=>{last='';schedule();});document.fonts.ready.then(schedule);update();
    viewport.classList.add('marquee-viewport');viewport.tabIndex=0;viewport.setAttribute('role','region');
    viewport.setAttribute('aria-roledescription','عارض شرائح');
    viewport.setAttribute('aria-label',track.classList.contains('insurance-track')?'شعارات التأمين — اسحب للتصفح':'آراء المراجعين — اسحب للتصفح');
    $$('img',source).forEach(img=>img.draggable=false);
    let pointer=null,startX=0,startY=0,startOffset=0,startScroll=0,dragging=false,animation=null,resume=false,suppressClick=false;
    function currentOffset(){const transform=getComputedStyle(track).transform;return transform==='none'?0:new DOMMatrixReadOnly(transform).m41;}
    function seek(offset){
      const distance=source.getBoundingClientRect().width,a=animation||track.getAnimations()[0];
      if(!a||!distance)return;
      const wrapped=-(((-offset%distance)+distance)%distance);
      const reverse=getComputedStyle(track).animationDirection==='reverse';
      const phase=reverse?1+wrapped/distance:-wrapped/distance;
      a.currentTime=Number(a.effect.getTiming().duration)*phase;
    }
    viewport.addEventListener('pointerdown',event=>{
      if(event.button!==0||event.isPrimary===false)return;
      pointer=event.pointerId;startX=event.clientX;startY=event.clientY;startOffset=currentOffset();startScroll=viewport.scrollLeft;
      dragging=false;animation=track.getAnimations()[0]||null;resume=!!animation&&animation.playState==='running';
    });
    viewport.addEventListener('pointermove',event=>{
      if(event.pointerId!==pointer)return;
      const dx=event.clientX-startX,dy=event.clientY-startY;
      if(!dragging){
        if(Math.abs(dx)<6||Math.abs(dx)<=Math.abs(dy))return;
        dragging=true;viewport.classList.add('is-dragging');viewport.setPointerCapture(event.pointerId);animation?.pause();
      }
      if(event.cancelable)event.preventDefault();
      if(animation&&!reduced.matches)seek(startOffset+dx);else viewport.scrollLeft=startScroll-dx;
    });
    function release(event){
      if(event.pointerId!==pointer)return;
      if(dragging){
        viewport.classList.remove('is-dragging');suppressClick=true;setTimeout(()=>suppressClick=false,0);
        if(resume&&!reduced.matches&&!track.closest('.motion-section')?.classList.contains('paused'))animation?.play();
      }
      if(viewport.hasPointerCapture(event.pointerId))viewport.releasePointerCapture(event.pointerId);
      pointer=null;dragging=false;animation=null;
    }
    viewport.addEventListener('pointerup',release);viewport.addEventListener('pointercancel',release);
    viewport.addEventListener('dragstart',event=>event.preventDefault());
    viewport.addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopPropagation();}},{capture:true});
    viewport.addEventListener('keydown',event=>{
      if(event.target!==viewport||!['ArrowLeft','ArrowRight'].includes(event.key))return;
      event.preventDefault();const shift=Math.min(viewport.clientWidth*.7,source.getBoundingClientRect().width/2)*(event.key==='ArrowLeft'?-1:1);
      if(reduced.matches)viewport.scrollBy({left:-shift,behavior:'instant'});else seek(currentOffset()+shift);
    });
  });

  $$('[data-pause]').forEach(button=>{
    button.addEventListener('click',()=>{
      const section=button.closest('.motion-section');const paused=section.classList.toggle('paused');
      button.setAttribute('aria-pressed',String(paused));button.setAttribute('aria-label',paused?'تشغيل الحركة':'إيقاف الحركة');button.textContent=paused?'▶':'Ⅱ';
      $$('[data-marquee]',section).forEach(track=>track.getAnimations().forEach(a=>paused?a.pause():a.play()));
    });
  });
  $$('[data-carousel]').forEach(carousel=>{
    if(carousel.matches('[data-loop-carousel]'))return;
    carousel.addEventListener('keydown',e=>{
      if(e.target!==carousel||!['ArrowLeft','ArrowRight'].includes(e.key))return;
      e.preventDefault();carousel.scrollBy({left:(e.key==='ArrowLeft'?-1:1)*Math.min(carousel.clientWidth*.85,400),behavior:'smooth'});
    });
  });
  $$('[data-loop-carousel]').forEach(carousel=>{
    const originals=$$(':scope > [data-loop-source]',carousel),count=originals.length;
    if(count<2)return;
    const rows=Math.max(1,Number(carousel.dataset.loopRows)||1),reduced=matchMedia('(prefers-reduced-motion:reduce)');
    const mobile=carousel.hasAttribute('data-loop-mobile')?matchMedia('(max-width:767px)'):null,bufferSets=rows>1?1:2;
    // An odd collection uses two passes so two-row columns join without an empty cell.
    let passes=1;while(count*passes%rows)passes++;
    const sequence=Array.from({length:count*passes},(_,index)=>originals[index%count]),columns=sequence.length/rows;
    let step=0,cycle=0,anchor=0,busy=false,idle=0,frame=0,lastLayout='',touching=false,mounted=false;
    let pointer=null,startX=0,startY=0,startPosition=0,dragging=false,suppressClick=false;
    const mod=(value,period)=>((value%period)+period)%period,position=()=>-carousel.scrollLeft;
    const key=`${carousel.dataset.loopKey||'doctor'}-carousel:${currentPath}`;
    const backForward=performance.getEntriesByType('navigation')[0]?.type==='back_forward';
    let initial=backForward?store.get(key)||0:0;
    function copy(card){
      const clone=card.cloneNode(true);clone.removeAttribute('data-loop-source');clone.removeAttribute('aria-labelledby');
      clone.setAttribute('data-loop-clone','');clone.setAttribute('aria-hidden','true');
      $$('[id]',clone).forEach(el=>el.removeAttribute('id'));
      $$('h3',clone).forEach(heading=>{const label=document.createElement('p');label.className=heading.className;label.textContent=heading.textContent;heading.replaceWith(label);});
      if(clone.matches('a,button,[tabindex]'))clone.tabIndex=-1;
      $$('a,button,[tabindex]',clone).forEach(el=>el.tabIndex=-1);
      $$('img',clone).forEach(img=>{img.alt='';img.loading='eager';img.draggable=false;});
      return clone;
    }
    function mount(){
      if(mounted)return;
      const before=document.createDocumentFragment(),after=document.createDocumentFragment(),tail=document.createDocumentFragment();
      for(let n=0;n<bufferSets;n++)sequence.forEach(card=>{before.append(copy(card));after.append(copy(card));});
      sequence.slice(count).forEach(card=>tail.append(copy(card)));
      carousel.prepend(before);carousel.append(tail);carousel.append(after);carousel.classList.add('is-loop-ready');mounted=true;
    }
    function unmount(){
      if(!mounted)return;
      initial=step?mod(position()-anchor,cycle)/step:0;clearTimeout(idle);
      $$(':scope > [data-loop-clone]',carousel).forEach(card=>card.remove());
      carousel.classList.remove('is-loop-ready','is-recentering','is-dragging');
      mounted=false;busy=false;dragging=false;pointer=null;step=cycle=anchor=0;lastLayout='';carousel.scrollLeft=0;
    }
    function record(){
      if(!mounted||!step||!cycle)return;
      const cardPosition=mod(position()-anchor,cycle)/step;
      if(rows===1)carousel.dataset.activeDoctor=String(Math.round(cardPosition)%count);
      else carousel.dataset.activeColumn=String(Math.round(cardPosition)%columns);
      store.set(key,cardPosition);
    }
    function jump(value){
      busy=true;carousel.classList.add('is-recentering');carousel.scrollTo({left:-value,behavior:'auto'});
      requestAnimationFrame(()=>{carousel.classList.remove('is-recentering');busy=false;if(mounted)record();});
    }
    function normalize(){
      if(!mounted||busy||touching||dragging||!cycle)return;
      const x=position(),next=anchor+mod(x-anchor,cycle);
      if(Math.abs(x-next)>.5)jump(next);else record();
    }
    function settle(){clearTimeout(idle);idle=setTimeout(normalize,120);}
    function layout(){
      frame=0;if(mobile&&!mobile.matches){unmount();return;}mount();
      const width=originals[0].getBoundingClientRect().width,gap=parseFloat(getComputedStyle(carousel).columnGap)||0;
      const signature=`${carousel.clientWidth}:${width}:${gap}`;
      if(!width||signature===lastLayout)return;
      const cardPosition=step?mod(position()-anchor,cycle)/step:initial;lastLayout=signature;
      step=width+gap;cycle=step*columns;anchor=bufferSets*cycle;initial=0;jump(anchor+mod(cardPosition,columns)*step);
    }
    function scheduleLayout(){if(!frame)frame=requestAnimationFrame(layout);}
    const observer=new ResizeObserver(scheduleLayout);observer.observe(carousel);observer.observe(originals[0]);
    mobile?.addEventListener('change',scheduleLayout);document.fonts.ready.then(scheduleLayout);layout();
    carousel.addEventListener('scroll',()=>{
      if(!mounted||busy)return;record();settle();
      if(!touching&&!dragging&&cycle&&(position()<step*.35||position()>carousel.scrollWidth-carousel.clientWidth-step*.35))normalize();
    },{passive:true});
    carousel.addEventListener('scrollend',normalize);
    carousel.addEventListener('touchstart',()=>touching=true,{passive:true});
    for(const name of ['touchend','touchcancel'])carousel.addEventListener(name,()=>{touching=false;if(mounted)settle();},{passive:true});
    carousel.addEventListener('keydown',event=>{
      if(!mounted||event.target!==carousel||!['ArrowLeft','ArrowRight'].includes(event.key))return;
      event.preventDefault();const current=Math.round(position()/step)*step;
      carousel.scrollTo({left:-(current+(event.key==='ArrowLeft'?step:-step)),behavior:reduced.matches?'auto':'smooth'});
    });
    const clonedLink=event=>event.target.closest('a[href]')?.closest('[data-loop-clone]');
    carousel.addEventListener('pointerdown',event=>{
      if(!mounted||event.pointerType!=='mouse'||event.button!==0)return;
      if(clonedLink(event))event.preventDefault();
      pointer=event.pointerId;startX=event.clientX;startY=event.clientY;startPosition=position();dragging=false;
    });
    carousel.addEventListener('pointermove',event=>{
      if(event.pointerId!==pointer)return;const dx=event.clientX-startX,dy=event.clientY-startY;
      if(!dragging){if(Math.abs(dx)<6||Math.abs(dx)<=Math.abs(dy))return;dragging=true;carousel.classList.add('is-dragging');carousel.setPointerCapture(event.pointerId);}
      event.preventDefault();carousel.scrollLeft=-(startPosition+dx);
    });
    function release(event){
      if(event.pointerId!==pointer)return;
      if(dragging){
        suppressClick=true;setTimeout(()=>suppressClick=false,0);carousel.classList.remove('is-dragging');
        carousel.scrollTo({left:-Math.round(position()/step)*step,behavior:reduced.matches?'auto':'smooth'});settle();
      }
      if(carousel.hasPointerCapture(event.pointerId))carousel.releasePointerCapture(event.pointerId);pointer=null;dragging=false;
    }
    carousel.addEventListener('pointerup',release);carousel.addEventListener('pointercancel',release);
    carousel.addEventListener('dragstart',event=>{if(mounted)event.preventDefault();});
    carousel.addEventListener('click',event=>{
      if(suppressClick){event.preventDefault();event.stopPropagation();return;}
      if(clonedLink(event)){rememberScroll();store.set('previous',currentPath);record();}
    },{capture:true});
  });
  $$('[data-deck]').forEach(deck=>{
    const cards=$$('.offer-card',deck);const dots=$$('[data-deck-dot]',deck.parentElement);const mobile=matchMedia('(max-width:767px)');
    let active=0,startX=0,startY=0,pointer=null;
    function render(){
      cards.forEach((card,i)=>{const offset=(i-active+cards.length)%cards.length;card.dataset.offset=String(offset);card.classList.toggle('is-active',i===active);card.inert=mobile.matches&&i!==active;if(mobile.matches&&i!==active)card.setAttribute('aria-hidden','true');else card.removeAttribute('aria-hidden');});
      dots.forEach((dot,i)=>{dot.classList.toggle('is-active',i===active);dot.setAttribute('aria-pressed',String(i===active));});
      deck.dataset.active=String(active);
    }
    function go(index){
      const prior=cards[active],next=(index+cards.length)%cards.length;
      if(mobile.matches&&next!==active&&!matchMedia('(prefers-reduced-motion:reduce)').matches){
        const exitClass=index>active?'deck-exit-left':'deck-exit-right';prior.classList.add(exitClass);
        setTimeout(()=>prior.classList.remove(exitClass),320);
      }
      active=next;render();
    }
    dots.forEach(dot=>dot.addEventListener('click',()=>go(Number(dot.dataset.deckDot))));
    deck.addEventListener('pointerdown',e=>{if(!mobile.matches||e.button!==0)return;pointer=e.pointerId;startX=e.clientX;startY=e.clientY;});
    deck.addEventListener('pointerup',e=>{if(pointer!==e.pointerId)return;pointer=null;const dx=e.clientX-startX,dy=e.clientY-startY;if(Math.abs(dx)>35&&Math.abs(dx)>Math.abs(dy)){go(active+(dx<0?1:-1));}});
    deck.addEventListener('pointercancel',()=>pointer=null);
    deck.addEventListener('keydown',e=>{if(e.target!==deck)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();if(mobile.matches)go(active+(e.key==='ArrowLeft'?1:-1));else deck.scrollBy({left:e.key==='ArrowLeft'?-400:400,behavior:'smooth'});}});
    mobile.addEventListener('change',render);render();
  });
  $$('[data-open-all-faq]').forEach(button=>button.addEventListener('click',()=>{
    const items=$$('.faq-item',button.closest('section'));const open=items.some(d=>!d.open);items.forEach(d=>d.open=open);button.querySelector('span')?.remove();
    button.firstChild.textContent=open?'إغلاق الأسئلة':'كل الأسئلة';
  }));
  $$('[data-review-form]').forEach(form=>form.addEventListener('submit',event=>{
    event.preventDefault();const text=$('textarea',form);if(!text.value.trim()){text.focus();return;}
    const status=$('[role=status]',form);if(status)status.textContent='شكرًا لمشاركتك. هذا نموذج تجريبي، ولم يُنشر التقييم.';text.value='';
  }));
})();
