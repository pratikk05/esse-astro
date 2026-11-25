import gsap from "gsap";
import {createSectionReveal} from './section-reveal.js';
import * as THREE from "three";
import {createServiceModels} from './service-models.js';
import {clamp,gridLimits,transition,vertexShader,wipeFragment} from './pixel-grid.js';

import {services,MOBILE_OPEN} from './data.js';
export {services};
const LAST=services.length-1,MODEL_ORDER=services.map(s=>s.model);
// true: when the highlighted service changes, the artwork wipe plays once on its own (~0.7s), so it is
// never left half-way between two models. false: the previous behaviour, the wipe is scrubbed by scroll.
const TIMED_SWAP=true,SWAP_MS=700;

export async function initializeServices(root){
 if(!root?.matches('.services'))throw new Error('Services root missing');
 const artwork=root.querySelector('.artwork'),canvas=root.querySelector('canvas'),fallback=root.querySelector('#fallback');
 const rows=[...root.querySelectorAll('.service-row:not([data-carousel-copy])')],sticky=root.querySelector('.artwork-sticky');
 const description=root.querySelector('#description'),descriptions=[...root.querySelectorAll('[data-desc]')],cameraFrame=root.querySelector('.services-camera'),list=root.querySelector('.service-list');
 if(!artwork||!canvas||!fallback||!sticky||!description||descriptions.length!==services.length||!cameraFrame||!list||rows.length!==services.length)throw new Error('Required services targets missing');
 rows.forEach((row,i)=>{if(row.dataset.key!==services[i].key)throw new Error('Incorrect service target assignment');});
 const reduce=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width:767px)');
 const sectionReveal=createSectionReveal(root,cameraFrame);
 let renderer,scene,camera,quad,models,limits=[],frame=0,active=-1,destroyed=false,viewportHeight=0,start=0,travel=1,columns=0,gridRows=0,loop=0,inView=false,drawCount=0,visualProgress=null,scrollProgress=null,shownProgress=null,lastScrollAt=0,lastTickAt=0,releaseHold=0,anchors=[],listY=0;
 const listeners=[];
 const listen=(target,name,fn,options)=>{target.addEventListener(name,fn,options);listeners.push(()=>target.removeEventListener(name,fn,options));};
 // Reuse a host's existing Lenis owner. Create only the standalone preview's owner.
 // The site's smooth-scroll.js is the single Lenis owner; this section never creates a second one.
 let ownsLenis=false;
 let lenis=window.lenis||null;
 function select(index){
  if(index===active)return;active=index;
  rows.forEach((row,i)=>{if(i===index)row.setAttribute('aria-current','step');else row.removeAttribute('aria-current');row.querySelector('button').setAttribute('aria-pressed',String(i===index));});
  fallback.src=services[index].image;fallback.alt=services[index].alt;fallback.dataset.service=services[index].key;artwork.setAttribute('aria-label',services[index].alt);
  descriptions.forEach((d,i)=>{d.toggleAttribute('data-active',i===index);if(i===index)d.removeAttribute('aria-hidden');else d.setAttribute('aria-hidden','true');});
 }
 function resize(){
  if(destroyed)return;
  viewportHeight=window.innerHeight;
  sectionReveal.resize(0,false);
  rows.forEach(row=>{
   if(mobile.matches){row.style.minHeight='0px';return;}
   const titleHeight=row.querySelector('h2').getBoundingClientRect().height;
   const originalMin=Number(getComputedStyle(row).getPropertyValue('--original-row-height'));
   const originalHeight=Math.max(originalMin,titleHeight+60);
   row.style.minHeight=(titleHeight+(originalHeight-titleHeight)*.75)+'px';
  });
  const listBounds=list.getBoundingClientRect();
  anchors=rows.map(row=>{const rect=row.querySelector('h2').getBoundingClientRect();return rect.top+rect.height/2-listBounds.top;});

  const w=artwork.clientWidth,h=artwork.clientHeight;
  // Source artwork-width / camera-height relationship, mapped to Figma's stage.
  limits=gridLimits(w,viewportHeight,services.length);
  if(!mobile.matches&&!reduce.matches){
   travel=anchors[LAST]-anchors[0];
   releaseHold=Math.max(240,viewportHeight*.35);
   root.style.removeProperty('--sequence-height');
   const listHeight=list.offsetHeight;
   root.querySelector('.list-window').style.paddingTop=Math.max(0,viewportHeight/2-anchors[0])+'px';
   root.querySelector('.list-window').style.paddingBottom='0px';
   root.querySelector('.list-window').style.minHeight=(viewportHeight+travel+releaseHold)+'px';
   list.style.top=(viewportHeight/2-anchors[LAST-1])+'px';
  }else{root.style.removeProperty('--sequence-height');travel=1;releaseHold=0;list.style.removeProperty('--list-y');list.style.removeProperty('position');list.style.removeProperty('transform');root.querySelector('.list-window').style.removeProperty('padding-top');root.querySelector('.list-window').style.removeProperty('padding-bottom');root.querySelector('.list-window').style.removeProperty('min-height');list.style.removeProperty('top');}
  start=Math.max(0,root.getBoundingClientRect().top+window.scrollY);
  sectionReveal.resize(travel+releaseHold,!mobile.matches&&!reduce.matches);
  if(renderer){const dpr=Math.min(window.devicePixelRatio||1,2);renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);
   models.setSize(Math.round(w*dpr),Math.round(h*dpr));
   columns=Math.ceil(w/10);gridRows=Math.ceil(h/10);quad.material.uniforms.u_grid.value.set(columns,gridRows);
  }
  schedule();
 }
 function draw(progress){
  if(!renderer||!limits.length)return;
  const {from,to,limit,done}=transition(progress,limits),u=quad.material.uniforms;
  models.render([from,to],reduce.matches?0:performance.now()/1000);
  u.u_from.value=models.textures[from];u.u_to.value=models.textures[to];
  u.u_progress.value=progress;u.u_limit.value.set(limit[0],limit[1]);u.u_done.value=done?1:0;
  renderer.render(scene,camera);drawCount++;
 }
 function update(){
  frame=0;if(destroyed)return;
  const distance=Math.max(0,Math.min(travel,window.scrollY-start));
  let segment=0;
  while(segment<LAST-1&&distance>anchors[segment+1]-anchors[0])segment++;
  const fraction=clamp((distance-(anchors[segment]-anchors[0]))/(anchors[segment+1]-anchors[segment]));
  const progress=(segment+fraction)/LAST;
  visualProgress=progress;
  if(!mobile.matches&&!reduce.matches){
   // Headings stay in document flow. The same measured scroll drives artwork.
   const freezeAt=anchors[LAST-1]-anchors[0],scrollDistance=Math.max(0,window.scrollY-start);
   if(scrollDistance>=freezeAt){
    // Preserve the final viewport coordinates through the blur/fade exit.
    list.style.position='relative';list.style.top='0px';
    listY=scrollDistance-freezeAt;
    list.style.transform=`translateY(${listY}px)`;
   }else{
    list.style.removeProperty('position');list.style.removeProperty('transform');
    list.style.top=(viewportHeight/2-anchors[LAST-1])+'px';listY=0;
   }
   const [a,b]=limits[segment];
   const wipeStart=a+(b-a)/Math.max(1,gridRows)-.02,wipeEnd=b+.02;
   const t=clamp((progress-wipeStart)/(wipeEnd-wipeStart));
   const before=active;
   select(segment+(t>=.5?1:0));
   if(TIMED_SWAP&&active!==before)startSwap(before,active);
   scrollProgress=progress;lastScrollAt=performance.now();
   if(!loop)draw(TIMED_SWAP?swapProgress(performance.now()):progress);
  }else if(!reduce.matches){visualProgress=active/LAST;draw(visualProgress);}
  root.dataset.progress=progress.toFixed(5);
  sectionReveal.update();
 }
 // Wipe window [start, end] of transition s, in list progress (same bounds as the row highlight above).
 function wipeWindow(s){const [a,b]=limits[s];return [a+(b-a)/Math.max(1,gridRows)-.02,b+.02];}
 // No half-wiped artwork at rest: a progress inside a wipe settles to whichever end it is nearer —
 // the same >=50% rule that picks the highlighted row, so artwork and list always agree.
 function settle(p){
  for(let s=0;s<limits.length;s++){const [ws,we]=wipeWindow(s);if(p>ws&&p<we)return (p-ws)/(we-ws)>=.5?we:ws;}
  return p;
 }
 // Timed swap: the artwork rests fully on one service; a change plays that one wipe from start to end.
 let swap=null;
 function rest(i){if(i<=0)return 0;if(i>=LAST)return 1;return Math.min(wipeWindow(i-1)[1],i/LAST-1e-4);}
 function startSwap(prev,next){
  if(prev<0||!limits.length){swap=null;return;}
  const forward=next>prev,s=forward?next-1:next,[ws,we]=wipeWindow(s);
  swap={from:forward?ws:we,to:forward?we:ws,at:performance.now()};
 }
 function swapProgress(now){
  if(!swap)return rest(active);
  const k=clamp((now-swap.at)/SWAP_MS);
  if(k>=1){swap=null;return rest(active);}
  const e=1-Math.pow(1-k,3); // ease-out: the wipe starts the instant the service changes
  return swap.from+(swap.to-swap.from)*e;
 }
 function onScroll(){schedule();}
 function schedule(){if(!frame&&!destroyed)frame=requestAnimationFrame(update);}
 function onMode(){
  if(reduce.matches){if(ownsLenis)lenis?.stop();}
  else if(ownsLenis)lenis?.start();
  
  artwork.classList.toggle('ready',!!renderer&&!reduce.matches);
  resize();
 }
 select(0);
 try{
  renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:false,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  models=createServiceModels(THREE,renderer,MODEL_ORDER);
  scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({vertexShader,fragmentShader:wipeFragment,transparent:true,
   uniforms:{u_from:{value:null},u_to:{value:null},u_progress:{value:0},u_limit:{value:new THREE.Vector2()},u_grid:{value:new THREE.Vector2(1,1)},u_done:{value:0}}}));
  scene.add(quad);
  artwork.classList.toggle('ready',!reduce.matches);
 }catch(error){console.error('3D artwork unavailable; still render remains visible.',error);root.dataset.renderError=error.message;}
 document.fonts?.ready.then(()=>{if(!destroyed)resize();});
 const observer=new ResizeObserver(resize);observer.observe(artwork);observer.observe(root);observer.observe(document.body);
 listen(window,'scroll',onScroll,{passive:true});listen(window,'resize',resize);listen(mobile,'change',onMode);listen(reduce,'change',onMode);
 rows.forEach((row,i)=>listen(row.querySelector('button'),'click',()=>{
  if(mobile.matches||reduce.matches){select(i);schedule();artwork.scrollIntoView({behavior:'auto',block:'start'});return;}
  const target=start+anchors[i]-anchors[0];
  if(lenis){lenis.scrollTo(target,{duration:1.5});}else window.scrollTo({top:target,behavior:'smooth'});
 }));

 resize();
 // Models keep turning while the artwork is on screen (reduced motion: a still frame on scroll only)
 const io=new IntersectionObserver(([e])=>{inView=e.isIntersecting;if(inView&&!loop)tick();});io.observe(artwork);
 function tick(){
  loop=0;if(destroyed||!inView||!renderer)return;
  const now=performance.now(),dt=Math.min(.05,(now-(lastTickAt||now))/1000);lastTickAt=now;
  if(!reduce.matches&&!document.hidden){
   if(TIMED_SWAP&&!mobile.matches){visualProgress=swapProgress(now);draw(visualProgress);}
   else if(mobile.matches||scrollProgress===null)draw(mobile.matches?active/LAST:(visualProgress??clamp((window.scrollY-start)/travel)));
   else{
    // Follow the scroll exactly while it moves; ~160ms after it stops, glide to the settled state.
    const idle=now-lastScrollAt>160,target=idle?settle(scrollProgress):scrollProgress;
    shownProgress=(!idle||shownProgress===null)?target:shownProgress+(target-shownProgress)*(1-Math.exp(-dt*9));
    visualProgress=shownProgress;draw(shownProgress);
   }
  }
  loop=requestAnimationFrame(tick);
 }
 return {get state(){return {active,columns,gridRows,pixelSize:10,drawCount,visualProgress,anchors,listY,keys:rows.map(r=>r.dataset.key),progress:Number(root.dataset.progress||0),limits,travel,releaseHold,canvas:[canvas.width,canvas.height],renderer:!!renderer};},destroy(){destroyed=true;sectionReveal.destroy();cancelAnimationFrame(loop);io.disconnect();list.style.removeProperty('--list-y');list.style.removeProperty('position');list.style.removeProperty('transform');root.querySelector('.list-window').style.removeProperty('padding-top');root.querySelector('.list-window').style.removeProperty('padding-bottom');root.querySelector('.list-window').style.removeProperty('min-height');list.style.removeProperty('top');root.style.removeProperty('--sequence-height');cancelAnimationFrame(frame);observer.disconnect();listeners.forEach(fn=>fn());quad?.geometry.dispose();quad?.material.dispose();models?.dispose();renderer?.dispose();artwork.classList.remove('ready');rows.forEach(r=>{r.removeAttribute('aria-current');r.querySelector('button').removeAttribute('aria-pressed');});}};
}
const root=document.querySelector('.services');
const mobileMode=matchMedia('(max-width:767px)');
let servicesController=null,modeGeneration=0;
// Mobile accordion: GSAP height/margin/opacity animation for open + close, then the opened row
// scrolls to just under the fixed nav buttons so its copy and artwork can be read in full.
// One shared WebGL canvas plays the open row's 3D model on a loop (moved between rows on open).
function createMobileModel(){
 const canvas=document.createElement('canvas');canvas.className='ms-canvas';canvas.setAttribute('aria-hidden','true');
 let renderer;
 try{renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});}catch{return null;}
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0x000000,0);
 const models=createServiceModels(THREE,renderer,MODEL_ORDER);
 const blit=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial({transparent:true}));
 const scene=new THREE.Scene();scene.add(blit);const cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
 let index=-1,art=null,raf=0,inView=false;
 const io=new IntersectionObserver(([e])=>{inView=e.isIntersecting;if(inView&&!raf)loop();});
 function size(){if(!art)return;const w=art.clientWidth,h=art.clientHeight,dpr=Math.min(devicePixelRatio||1,2);if(!w||!h)return;renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);models.setSize(Math.round(w*dpr),Math.round(h*dpr));}
 function loop(){
  raf=0;if(index<0||!inView||document.hidden)return;
  models.render([index],performance.now()/1000);
  blit.material.map=models.textures[index];blit.material.needsUpdate=true;
  renderer.clear();renderer.render(scene,cam);
  art.classList.add('is-live');
  raf=requestAnimationFrame(loop);
 }
 const ro=new ResizeObserver(size);
 return {
  canvas,
  attach(row,i){
   art?.classList.remove('is-live');io.disconnect();ro.disconnect();
   art=row.querySelector('.ms-art');index=i;art.append(canvas);
   ro.observe(art);io.observe(art);size();
  },
  detach(){index=-1;art?.classList.remove('is-live');cancelAnimationFrame(raf);raf=0;},
  dispose(){this.detach();io.disconnect();ro.disconnect();canvas.remove();blit.geometry.dispose();blit.material.dispose();models.dispose();renderer.dispose();},
 };
}
function initializeMobileServices(){
 const rows=[...document.querySelectorAll('.ms-row')];let active=MOBILE_OPEN;
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const live=reduce?null:createMobileModel(); // reduced motion keeps the still render
 const ICON_OPEN="/uniflow/img/svg-5-a9a4.svg",ICON_CLOSED="/uniflow/img/svg-4-ce2f.svg";
 const MARGIN={copy:16,art:32};
 const parts=row=>({copy:row.querySelector('.ms-copy'),art:row.querySelector('.ms-art'),img:row.querySelector('.ms-art img'),icon:row.querySelector('.ms-icon'),button:row.querySelector('button')});
 const scroller=()=>window.__bodyScroller?document.body:document.scrollingElement;
 function setIcon(icon,open){
  if(reduce){icon.src=open?ICON_OPEN:ICON_CLOSED;return;}
  gsap.timeline().to(icon,{rotate:open?90:-90,scale:.6,duration:.18,ease:'power2.in',onComplete:()=>{icon.src=open?ICON_OPEN:ICON_CLOSED;}})
   .fromTo(icon,{rotate:open?-90:90},{rotate:0,scale:1,duration:.35,ease:'back.out(2)'});
 }
 function close(row){
  const {copy,art,icon,button}=parts(row);
  row.removeAttribute('data-open');button.setAttribute('aria-expanded','false');setIcon(icon,false);
  if(row.contains(live?.canvas??null))live.detach();
  gsap.killTweensOf([copy,art]);
  if(reduce){copy.hidden=art.hidden=true;return 0;}
  const h=copy.offsetHeight+MARGIN.copy+art.offsetHeight+MARGIN.art;
  gsap.to(copy,{height:0,marginTop:0,opacity:0,duration:.55,ease:'power3.inOut',onComplete:()=>{copy.hidden=true;gsap.set(copy,{clearProps:'height,marginTop,opacity'});}});
  gsap.to(art,{height:0,marginTop:0,opacity:0,duration:.65,ease:'power3.inOut',onComplete:()=>{art.hidden=true;gsap.set(art,{clearProps:'height,marginTop,opacity'});}});
  return h;
 }
 function open(row){
  const {copy,art,img,icon,button}=parts(row);
  row.setAttribute('data-open','');button.setAttribute('aria-expanded','true');setIcon(icon,true);
  live?.attach(row,rows.indexOf(row));
  gsap.killTweensOf([copy,art,img]);
  copy.hidden=art.hidden=false;
  if(reduce)return;
  gsap.fromTo(copy,{height:0,marginTop:0,opacity:0,y:-6},{height:'auto',marginTop:MARGIN.copy,opacity:1,y:0,duration:.6,ease:'power3.out',clearProps:'height,marginTop,opacity,transform'});
  gsap.fromTo(art,{height:0,marginTop:0,opacity:0},{height:'auto',marginTop:MARGIN.art,opacity:1,duration:.75,ease:'power3.inOut',delay:.05,clearProps:'height,marginTop,opacity'});
  gsap.fromTo(img,{scale:1.12,clipPath:'inset(18% 0% 18% 0%)'},{scale:1,clipPath:'inset(0% 0% 0% 0%)',duration:1.1,ease:'expo.out',delay:.15,clearProps:'transform,clipPath'});
 }
 // Scroll so the opened row's title sits just below the fixed nav buttons. Accounts for the row
 // above that is collapsing at the same time (its height disappears from the final layout).
 function scrollToRow(row,collapsingAbove){
  const navGap=88;
  const el=scroller();
  const target=el.scrollTop+row.getBoundingClientRect().top-collapsingAbove-navGap;
  if(window.lenis)window.lenis.scrollTo(target,{duration:reduce?0:1.1,easing:t=>1-Math.pow(1-t,4)});
  else el.scrollTo({top:target,behavior:reduce?'auto':'smooth'});
 }
 function select(index){
  const prev=active;active=index;
  let collapsingAbove=0;
  rows.forEach((row,i)=>{if(i!==index&&row.hasAttribute('data-open')){const h=close(row);if(i<index)collapsingAbove+=h;}});
  if(index<0)return;
  open(rows[index]);
  if(prev!==index)scrollToRow(rows[index],collapsingAbove);
 }
 // Initial state without animation
 rows.forEach((row,i)=>{const {copy,art,icon,button}=parts(row);const o=i===active;row.toggleAttribute('data-open',o);button.setAttribute('aria-expanded',String(o));copy.hidden=art.hidden=!o;icon.src=o?ICON_OPEN:ICON_CLOSED;});
 if(active>=0)live?.attach(rows[active],active);
 const handlers=rows.map((row,i)=>{const fn=()=>select(active===i?-1:i);row.querySelector('button').addEventListener('click',fn);return fn});
 return {get state(){return {active,mobile:true,live:!!live}},destroy(){rows.forEach((row,i)=>row.querySelector('button').removeEventListener('click',handlers[i]));live?.dispose();}};
}
async function initializeResponsive(){
 const generation=++modeGeneration;servicesController?.destroy();servicesController=null;
 const next=mobileMode.matches?initializeMobileServices():await initializeServices(root);
 if(generation!==modeGeneration){next?.destroy();return;}
 servicesController=next;window.servicesPreview=next;document.documentElement.dataset.servicesReady='true';
}
mobileMode.addEventListener('change',initializeResponsive);
if(root)initializeResponsive();
