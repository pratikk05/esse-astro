// Selected sculpture artwork, processed locally into fine ordered monochrome dithering.
// Reference: Dither Studio, resolution 600, pixel size 1, strong contrast, grayscale.
const sheets=['/uniflow/img/sheet-12-1dfe.png','/uniflow/img/sheet-13-69f7.png'];
export const sculptureSlots=[
 {name:'Archway',sheet:0,crop:[15,100,490,580]},
 {name:'Sculptor’s hand',sheet:0,crop:[550,85,310,590]},
 {name:'Winged Victory',sheet:1,crop:[45,0,405,405]},
 {name:'Corinthian column',sheet:1,crop:[520,4,300,397]},
 {name:'Atlas',sheet:0,crop:[1770,5,395,680]}
];
export async function createDitherArtwork(THREE){
 const images=await Promise.all(sheets.map(src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Sculpture artwork unavailable: '+src));image.src=src;})));
 const size=600,bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
 return sculptureSlots.map(slot=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,size,size);
  const [sx,sy,sw,sh]=slot.crop,scale=500/Math.max(sw,sh),w=sw*scale,h=sh*scale;
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(images[slot.sheet],sx,sy,sw,sh,(size-w)/2,(size-h)/2,w,h);
  const bitmap=ctx.getImageData(0,0,size,size),pixels=bitmap.data;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const i=(y*size+x)*4,luma=(pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722)/255;
   const adjusted=Math.max(0,Math.min(1,(luma-.5)*1.8+.54));
   const threshold=(bayer[(y%4)*4+x%4]+.5)/16;
   const ink=luma<.975&&adjusted<threshold;
   pixels[i]=ink?8:255;pixels[i+1]=ink?10:255;pixels[i+2]=ink?16:255;pixels[i+3]=ink?255:0;
  }
  ctx.putImageData(bitmap,0,0);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.NoColorSpace;texture.minFilter=texture.magFilter=THREE.NearestFilter;texture.userData.sculpture=slot.name;
  return texture;
 });
}
