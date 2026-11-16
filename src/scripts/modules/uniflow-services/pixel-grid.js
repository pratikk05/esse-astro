// Dgrees capture: app.min.js 7062-7076, 7287-7338.
// Content boundary: five Uniflow service pixel maps replace the source icon maps.
export const GRID_SIZE=32, FLIP_EXPANSE=.02;
export const clamp=v=>Math.max(0,Math.min(1,v));
export function gridLimits(width,height,count=5){
  const r=.5*(height-width)/height,s=1/(count-1);
  return Array.from({length:count-1},(_,i)=>[i*s+r*s,i*s+(1-r)*s]);
}
export function tileState(progress,row,limits,gridRows=GRID_SIZE){
  const last=limits.length;
  if(progress>=1)return {from:last,to:last,progress:1};
  const section=Math.min(last-1,Math.floor(clamp(progress)*last));
  const [a,b]=limits[section];
  const centre=a+(b-a)*(gridRows-row)/gridRows;
  return {from:section,to:section+1,progress:clamp((progress-(centre-FLIP_EXPANSE))/(2*FLIP_EXPANSE))};
}
export const vertexShader=`varying vec2 vUv;
void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
// The local-UV wipe is the source shader's verticalColorWipe, unchanged.
// Each texture cell is a single pixel color; white stays transparent as in the source.
export const pixelFragment=`precision highp float;
uniform sampler2D u_from;uniform sampler2D u_to;
uniform float u_shimmerTick;uniform float u_progress;uniform vec2 u_gridSize;uniform vec2 u_tile;uniform vec2 u_cropFrom;uniform vec2 u_cropTo;
varying vec2 vUv;
vec3 verticalColorWipe(vec3 _color1,vec3 _color2,vec2 _uv,float _progress){
 float threshold=0.1;float filtredProgress=(_progress*(1.0+threshold))-(threshold*0.5);
 if(_uv.y<filtredProgress){return _color2;}else{return _color1;}
}
void main(){
 vec2 uv=(u_tile+vUv)/u_gridSize;
 vec4 sampleA=texture2D(u_from,uv);
 vec4 sampleB=texture2D(u_to,uv);
 vec3 a=sampleA.a<.5?vec3(1.0):sampleA.rgb;
 vec3 b=sampleB.a<.5?vec3(1.0):sampleB.rgb;
 vec3 color=verticalColorWipe(a,b,vUv,u_progress);
 float alpha=all(equal(color,vec3(1.0)))?0.0:1.0;
 // Sparse temporal dropout in the original 600px dot coordinates. No UV motion.
 vec2 dotCell=floor(uv*600.0);
 float sparkle=fract(sin(dot(dotCell,vec2(12.9898,78.233))+u_shimmerTick*37.719)*43758.5453);
 if(sparkle>.976)alpha=0.0;
 gl_FragColor=vec4(color,alpha);
}`;
