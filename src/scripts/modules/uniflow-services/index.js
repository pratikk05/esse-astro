import {createSectionReveal} from './section-reveal.js';
import {createDitherArtwork} from './dither-artwork.js';
import * as THREE from '../../vendor/three-r17x.js';
import {GRID_SIZE,clamp,gridLimits,tileState,vertexShader,pixelFragment} from './pixel-grid.js';

export const services=[
 {key:'website',image:'/uniflow/img/svc-7-e60a.png',alt:'Dithered marble archway sculpture',description:'Thoughtful design and custom development, brought together in a website built for your business.'},
 {key:'design',image:'/uniflow/img/svc-8-6881.png',alt:'Dithered sculptor’s hand holding a chisel',description:'Your design, developed with care. We turn approved layouts into responsive, accurate and maintainable websites.'},
 {key:'immersive',image:'/uniflow/img/svc-9-64cd.png',alt:'Dithered Winged Victory sculpture',description:'Bring another dimension to your digital presence with interactive 3D, expressive motion and immersive experiences.'},
 {key:'search',image:'/uniflow/img/svc-10-c3d4.png',alt:'Dithered Corinthian column sculpture',description:'Build a stronger foundation for discovery, with clear content, technical SEO and readiness for AI-powered search.'},
 {key:'support',image:'/uniflow/img/svc-11-2630.png',alt:'Dithered Atlas supporting a celestial sphere',description:'Keep your website moving forward with ongoing improvements, performance optimisation and dependable support.'}
];

export async function initializeServices(root){
 if(!root?.matches('.services'))throw new Error('Services root missing');
 const artwork=root.querySelector('.artwork'),canvas=root.querySelector('canvas'),fallback=root.querySelector('#fallback');
 const rows=[...root.querySelectorAll('.service-row:not([data-carousel-copy])')],sticky=root.querySelector('.artwork-sticky');
 const description=root.querySelector('#description'),cameraFrame=root.querySelector('.services-camera'),list=root.querySelector('.service-list');
 if(!artwork||!canvas||!fallback||!sticky||!description||!cameraFrame||!list||rows.length!==services.length)throw new Error('Required services targets missing');
 rows.forEach((row,i)=>{if(row.dataset.key!==services[i].key)throw new Error('Incorrect service target assignment');});
 const reduce=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width:767px)');
 const sectionReveal=createSectionReveal(root,cameraFrame);
 let renderer,scene,camera,geometry,tiles=[],textures=[],limits=[],frame=0,active=-1,destroyed=false,viewportHeight=0,start=0,travel=1,columns=0,gridRows=0,shimmerTimer=0,shimmerTick=0,drawCount=0,visualProgress=null,releaseHold=0,anchors=[],listY=0;
 const listeners=[];
 const listen=(target,name,fn,options)=>{target.addEventListener(name,fn,options);listeners.push(()=>target.removeEventListener(name,fn,options));};
 // Reuse a host's existing Lenis owner. Create only the standalone preview's owner.
 // The site's smooth-scroll.js is the single Lenis owner; this section never creates a second one.
 let ownsLenis=false;
 let lenis=window.lenis||null;
 function select(index){
  if(index===active)return;active=index;
  rows.forEach((row,i)=>{if(i===index)row.setAttribute('aria-current','step');else row.removeAttribute('aria-current');row.querySelector('button').setAttribute('aria-pressed',String(i===index));});
  fallback.removeAttribute('src');fallback.alt=services[index].alt;fallback.dataset.service=services[index].key;artwork.setAttribute('aria-label',services[index].alt);
  description.textContent=services[index].description;
  refreshFallback();
 }
 function refreshFallback(){
  if(!textures[active]||!columns||!gridRows)return;
  const bitmap=document.createElement('canvas');bitmap.width=bitmap.height=640;
  const context=bitmap.getContext('2d');context.imageSmoothingEnabled=true;
  context.drawImage(textures[active].image,0,0,640,640);
  fallback.src=bitmap.toDataURL();fallback.style.width=artwork.clientWidth+'px';fallback.style.height=artwork.clientHeight+'px';fallback.style.objectFit='fill';
 }
 function rebuildTiles(w,h){
  const cols=Math.ceil(w/10),rows=Math.ceil(h/10);
  if(cols===columns&&rows===gridRows)return;
  tiles.forEach(tile=>{scene.remove(tile.mesh);tile.material.dispose();});tiles=[];
  columns=cols;gridRows=rows;
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
   const material=new THREE.ShaderMaterial({vertexShader,fragmentShader:pixelFragment,transparent:true,
    uniforms:{u_from:{value:textures[0]},u_to:{value:textures[1]},u_shimmerTick:{value:0},u_progress:{value:0},u_gridSize:{value:new THREE.Vector2(cols,rows)},u_tile:{value:new THREE.Vector2(col,rows-row-1)},u_cropFrom:{value:new THREE.Vector2(1,1)},u_cropTo:{value:new THREE.Vector2(1,1)}}});
   const mesh=new THREE.Mesh(geometry,material);scene.add(mesh);tiles.push({row,col,mesh,material});
  }
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
   travel=anchors[4]-anchors[0];
   releaseHold=Math.max(240,viewportHeight*.35);
   root.style.removeProperty('--sequence-height');
   const listHeight=list.offsetHeight;
   root.querySelector('.list-window').style.paddingTop=Math.max(0,viewportHeight/2-anchors[0])+'px';
   root.querySelector('.list-window').style.paddingBottom='0px';
   root.querySelector('.list-window').style.minHeight=(viewportHeight+travel+releaseHold)+'px';
   list.style.top=(viewportHeight/2-anchors[3])+'px';
  }else{root.style.removeProperty('--sequence-height');travel=1;releaseHold=0;list.style.removeProperty('--list-y');list.style.removeProperty('position');list.style.removeProperty('transform');root.querySelector('.list-window').style.removeProperty('padding-top');root.querySelector('.list-window').style.removeProperty('padding-bottom');root.querySelector('.list-window').style.removeProperty('min-height');list.style.removeProperty('top');}
  start=Math.max(0,root.getBoundingClientRect().top+window.scrollY);
  sectionReveal.resize(travel+releaseHold,!mobile.matches&&!reduce.matches);
  if(renderer){renderer.setSize(w,h,false);renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
   camera.left=-w/2;camera.right=w/2;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();
   rebuildTiles(w,h);
   tiles.forEach(tile=>{tile.mesh.scale.set(10,10,1);tile.mesh.position.set((tile.col+.5)*10-w/2,h/2-(tile.row+.5)*10,0);});
   refreshFallback();
  }
  schedule();
 }
 function draw(progress){
  if(!renderer)return;
  shimmerTick=Math.floor(performance.now()/180);
  tiles.forEach(tile=>{const state=tileState(progress,tile.row,limits,gridRows),u=tile.material.uniforms;
   u.u_shimmerTick.value=shimmerTick;u.u_from.value=textures[state.from];u.u_to.value=textures[state.to];u.u_progress.value=state.progress;

  });renderer.render(scene,camera);drawCount++;
 }
 function update(){
  frame=0;if(destroyed)return;
  const distance=Math.max(0,Math.min(travel,window.scrollY-start));
  let segment=0;
  while(segment<3&&distance>anchors[segment+1]-anchors[0])segment++;
  const fraction=clamp((distance-(anchors[segment]-anchors[0]))/(anchors[segment+1]-anchors[segment]));
  const progress=(segment+fraction)/4;
  visualProgress=progress;
  if(!mobile.matches&&!reduce.matches){
   // Headings stay in document flow. The same measured scroll drives artwork.
   const freezeAt=anchors[3]-anchors[0],scrollDistance=Math.max(0,window.scrollY-start);
   if(scrollDistance>=freezeAt){
    // Preserve the final viewport coordinates through the blur/fade exit.
    list.style.position='relative';list.style.top='0px';
    listY=scrollDistance-freezeAt;
    list.style.transform=`translateY(${listY}px)`;
   }else{
    list.style.removeProperty('position');list.style.removeProperty('transform');
    list.style.top=(viewportHeight/2-anchors[3])+'px';listY=0;
   }
   const [a,b]=limits[segment];
   const wipeStart=a+(b-a)/Math.max(1,gridRows)-.02,wipeEnd=b+.02;
   const t=clamp((progress-wipeStart)/(wipeEnd-wipeStart));
   select(segment+(t>=.5?1:0));draw(progress);
  }else if(!reduce.matches){visualProgress=active/4;draw(visualProgress);}
  root.dataset.progress=progress.toFixed(5);
  sectionReveal.update();
 }
 function onScroll(){schedule();}
 function schedule(){if(!frame&&!destroyed)frame=requestAnimationFrame(update);}
 function onMode(){
  if(reduce.matches){if(ownsLenis)lenis?.stop();}
  else if(ownsLenis)lenis?.start();
  
  artwork.classList.toggle('ready',!!renderer&&!reduce.matches);
  resize();
 }
 const loader=new THREE.TextureLoader();
 select(0);
 try{
  textures=await createDitherArtwork(THREE);
  textures.forEach(t=>{t.colorSpace=THREE.NoColorSpace;t.minFilter=THREE.NearestFilter;t.magFilter=THREE.NearestFilter;});
  if(destroyed){textures.forEach(t=>t.dispose());return;}
  renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:false,powerPreference:'low-power'});
  renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
  scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,10);camera.position.z=1;
  geometry=new THREE.PlaneGeometry(1,1,2,2);
  artwork.classList.toggle('ready',!reduce.matches);
 }catch(error){console.error('Pixel artwork unavailable; image fallback remains visible.',error);root.dataset.renderError=error.message;}
 document.fonts?.ready.then(()=>{if(!destroyed)resize();});
 const observer=new ResizeObserver(resize);observer.observe(artwork);observer.observe(root);observer.observe(document.body);
 listen(window,'scroll',onScroll,{passive:true});listen(window,'resize',resize);listen(mobile,'change',onMode);listen(reduce,'change',onMode);
 rows.forEach((row,i)=>listen(row.querySelector('button'),'click',()=>{
  if(mobile.matches||reduce.matches){select(i);schedule();artwork.scrollIntoView({behavior:'auto',block:'start'});return;}
  const target=start+anchors[i]-anchors[0];
  if(lenis){lenis.scrollTo(target,{duration:1.5});}else window.scrollTo({top:target,behavior:'smooth'});
 }));

 resize();
 shimmerTimer=setInterval(()=>{
  if(destroyed||reduce.matches||document.hidden||!renderer)return;
  const bounds=artwork.getBoundingClientRect();
  if(bounds.bottom<=0||bounds.top>=window.innerHeight)return;
  draw(mobile.matches?active/4:(visualProgress??clamp((window.scrollY-start)/travel)));
 },180);
 return {get state(){return {active,tiles:tiles.length,columns,gridRows,pixelSize:10,shimmerTick,drawCount,visualProgress,anchors,listY,keys:rows.map(r=>r.dataset.key),progress:Number(root.dataset.progress||0),limits,travel,releaseHold,canvas:[canvas.width,canvas.height],renderer:!!renderer,uniforms:tiles.filter(t=>t.col===0).map(t=>({row:t.row,progress:t.material.uniforms.u_progress.value,from:textures.indexOf(t.material.uniforms.u_from.value),to:textures.indexOf(t.material.uniforms.u_to.value)}))};},destroy(){destroyed=true;sectionReveal.destroy();clearInterval(shimmerTimer);list.style.removeProperty('--list-y');list.style.removeProperty('position');list.style.removeProperty('transform');root.querySelector('.list-window').style.removeProperty('padding-top');root.querySelector('.list-window').style.removeProperty('padding-bottom');root.querySelector('.list-window').style.removeProperty('min-height');list.style.removeProperty('top');root.style.removeProperty('--sequence-height');cancelAnimationFrame(frame);observer.disconnect();listeners.forEach(fn=>fn());tiles.forEach(t=>t.material.dispose());geometry?.dispose();textures.forEach(t=>t.dispose());renderer?.dispose();artwork.classList.remove('ready');rows.forEach(r=>{r.removeAttribute('aria-current');r.querySelector('button').removeAttribute('aria-pressed');});}};
}
const root=document.querySelector('.services');
const mobileMode=matchMedia('(max-width:767px)');
let servicesController=null,modeGeneration=0;
function initializeMobileServices(){
 const rows=[...document.querySelectorAll('.ms-row')];let active=2;
 function select(index){active=index;rows.forEach((row,i)=>{const open=i===index;row.toggleAttribute('data-open',open);row.querySelector('button').setAttribute('aria-expanded',String(open));row.querySelector('.ms-copy').hidden=!open;row.querySelector('.ms-art').hidden=!open;row.querySelector('.ms-icon').src=open?"/uniflow/img/svg-5-a9a4.svg":"/uniflow/img/svg-4-ce2f.svg";});}
 const handlers=rows.map((row,i)=>{const fn=()=>select(active===i?-1:i);row.querySelector('button').addEventListener('click',fn);return fn});select(2);
 return {get state(){return {active,mobile:true}},destroy(){rows.forEach((row,i)=>row.querySelector('button').removeEventListener('click',handlers[i]));}};
}
async function initializeResponsive(){
 const generation=++modeGeneration;servicesController?.destroy();servicesController=null;
 const next=mobileMode.matches?initializeMobileServices():await initializeServices(root);
 if(generation!==modeGeneration){next?.destroy();return;}
 servicesController=next;window.servicesPreview=next;document.documentElement.dataset.servicesReady='true';
}
mobileMode.addEventListener('change',initializeResponsive);
if(root)initializeResponsive();
