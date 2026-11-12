var e=document.querySelector(`[data-humo]`),t=e?.querySelector(`canvas`);if(e&&t&&`ResizeObserver`in window&&`IntersectionObserver`in window){let n=matchMedia(`(prefers-reduced-motion: reduce)`),r=matchMedia(`(forced-colors: active)`),i=[20+Math.random()*60,20+Math.random()*60],a=null,o=null,s,c=!1,l=!1,u=0,d=0,f=0,p=0,m=14e5,h=e=>{let t=e.getExtension(`WEBGL_debug_renderer_info`),n=`${t?e.getParameter(t.UNMASKED_RENDERER_WEBGL):``} ${e.getParameter(e.RENDERER)}`;return/swiftshader|llvmpipe|softpipe|software|basic render/i.test(n)},g=(e,t)=>{let n=a.createShader(e);return n?(a.shaderSource(n,t),a.compileShader(n),n):null},_=()=>{cancelAnimationFrame(u),u=0},v=()=>(_(),e.classList.remove(`con-humo`),c=!a?.isContextLost(),c&&a?.getExtension(`WEBGL_lose_context`)?.loseContext(),!1),y=()=>{if(c)return!1;if(o)return!0;a??=t.getContext(`webgl`,{alpha:!1,antialias:!1,depth:!1,stencil:!1,powerPreference:`low-power`,failIfMajorPerformanceCaveat:!0});let e=a?.getShaderPrecisionFormat(a.FRAGMENT_SHADER,a.HIGH_FLOAT);if(!a||h(a)||!e||e.precision<23)return v();let n=a.createProgram(),r=g(a.VERTEX_SHADER,`attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`),i=g(a.FRAGMENT_SHADER,`// Humo del título: humo denso, como el de un cigarrillo, que sube muy despacio
// por delante de las letras de "LEGIÓN".
//
// Lo pinta el navegador con WebGL (ver Portada.astro) y, congelado en el primer
// instante, es también la imagen fija src/assets/marmol.webp que se ve antes de
// que arranque la animación o cuando no puede haberla. Después de tocar este
// archivo hay que regenerarla con "npm run marmol".
//
// Cómo está hecho: una mancha de ruido suave (la masa de humo) se arrastra por
// una corriente de remolinos, que la estira en velos y hebras como hace el
// aire con el humo de verdad. La mancha sube; la corriente casi no se mueve.
precision highp float;

uniform vec2 u_origen; // dónde empieza el lienzo dentro de la caja del título, en píxeles del lienzo
uniform vec2 u_escala; // de píxeles del lienzo a unidades del dibujo (1 = alto de la caja)
uniform float u_t; // segundos de animación
uniform vec2 u_semilla; // desplazamiento al azar: da un humo distinto en cada visita
uniform float u_mezcla; // 0 = el humo de la imagen fija; 1 = el de esta visita

const vec3 MARFIL = vec3(0.957, 0.925, 0.851); // las letras: el mismo de --marfil
const vec3 HUMO = vec3(0.36, 0.36, 0.37); // gris del humo más espeso
const float FUERZA = 0.80; // cuánto llega a velar las letras el humo (0 = nada)
const float SUBIDA = 0.036; // velocidad de subida: recorre el alto del título en menos de medio minuto
const float CUBRE = 0.05; // cuánta superficie ocupa el humo (más alto = más humo)

// Números al azar a partir de una posición. Sin senos: así sale el mismo
// dibujo en todas las tarjetas gráficas.
vec2 azar2(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy);
}

// Ruido suave. x: el valor; yz: su pendiente en cada eje.
vec3 ruido(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  vec2 ga = azar2(i) * 2.0 - 1.0;
  vec2 gb = azar2(i + vec2(1.0, 0.0)) * 2.0 - 1.0;
  vec2 gc = azar2(i + vec2(0.0, 1.0)) * 2.0 - 1.0;
  vec2 gd = azar2(i + vec2(1.0, 1.0)) * 2.0 - 1.0;
  float va = dot(ga, f);
  float vb = dot(gb, f - vec2(1.0, 0.0));
  float vc = dot(gc, f - vec2(0.0, 1.0));
  float vd = dot(gd, f - vec2(1.0, 1.0));
  float k = va - vb - vc + vd;
  return vec3(
    va + u.x * (vb - va) + u.y * (vc - va) + u.x * u.y * k,
    ga + u.x * (gb - ga) + u.y * (gc - ga) + u.x * u.y * (ga - gb - gc + gd) + du * (u.yx * k + vec2(vb, vc) - va)
  );
}

// cada escala de ruido va girada respecto a la anterior, y es el doble de fina
const mat2 GIRO = mat2(1.624, 1.218, -1.218, 1.624);

// Cuánto vela el humo las letras en un punto (0 = nada, 1 = lo más espeso).
float humo(vec2 p, float t) {

  // La corriente. Unos remolinos altos y estrechos, que hacen subir el humo
  // en columnas que se mecen, y otros más pequeños que lo enroscan. Cada
  // punto se lleva hacia atrás por ella unos cuantos pasos; siempre en la
  // dirección en que el ruido no cambia, para que la corriente ni amontone ni
  // separe el humo: solo lo estira y lo dobla.
  const vec2 COLUMNAS = vec2(1.3, 0.715);
  vec2 q = p;
  for (int paso = 0; paso < 4; paso++) {
    vec3 a = ruido(q * COLUMNAS + vec2(0.0, -0.004 * t));
    vec3 b = ruido(q * 3.1 + vec2(5.2 + 0.003 * t, 1.3 - 0.009 * t));
    q -= 0.18 * (vec2(a.z * 0.66, -a.y * 1.2) + 0.22 * vec2(b.z, -b.y));
  }

  // La masa de humo: ruido de varias escalas sobre el dibujo ya arrastrado.
  // Sube entera, y lo más fino un poco más deprisa que lo grueso.
  float masa = 0.0, cuerpo = 0.0, peso = 0.5;
  vec2 s = q * 3.4;
  vec2 sube = vec2(0.0, -SUBIDA * 3.4 * t);
  for (int escala = 0; escala < 4; escala++) {
    masa += peso * ruido(s + sube * (1.0 + 0.25 * float(escala))).x;
    if (escala == 1) cuerpo = masa;
    s = GIRO * s + 11.7;
    sube = GIRO * sube;
    peso *= 0.55;
  }

  // El humo pasa por delante de las letras: donde hay, las vela de gris, más
  // cuanto más espeso; donde no, queda el marfil limpio. Las hebras salen de
  // la masa entera y, detrás, una bruma desenfocada de sus escalas gruesas.
  float espeso = max(masa + CUBRE, 0.0);
  float velo = 1.0 - exp(-5.0 * espeso * espeso / (espeso + 0.06));
  velo = 1.0 - (1.0 - velo) * (1.0 - 0.40 * smoothstep(-0.10, 0.22, cuerpo));
  return velo;
}

void main() {
  vec2 p = (gl_FragCoord.xy + u_origen) * u_escala + vec2(3.7, 1.9);
  // La página arranca con el humo de la imagen fija y en un par de segundos
  // se funde con el de esta visita, que sale de otro rincón del mismo dibujo.
  float velo = 0.0;
  if (u_mezcla < 1.0) velo += (1.0 - u_mezcla) * humo(p, u_t);
  if (u_mezcla > 0.0) velo += u_mezcla * humo(p + u_semilla, u_t);

  gl_FragColor = vec4(mix(MARFIL, HUMO, FUERZA * velo), 1.0);
}
`.replace(/\/\/.*$/gm,``));return n&&r&&i&&(a.attachShader(n,r),a.attachShader(n,i),a.bindAttribLocation(n,0,`a`),a.linkProgram(n)),!n||!a.getProgramParameter(n,a.LINK_STATUS)?v():(a.useProgram(n),a.bindBuffer(a.ARRAY_BUFFER,a.createBuffer()),a.bufferData(a.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),a.STATIC_DRAW),a.enableVertexAttribArray(0),a.vertexAttribPointer(0,2,a.FLOAT,!1,0,0),s={origen:a.getUniformLocation(n,`u_origen`),escala:a.getUniformLocation(n,`u_escala`),t:a.getUniformLocation(n,`u_t`),semilla:a.getUniformLocation(n,`u_semilla`),mezcla:a.getUniformLocation(n,`u_mezcla`)},o=n,!0)},b=()=>{if(!a||!o||!s)return;a.uniform1f(s.t,d-2*(1-Math.exp(-d/2)));let e=Math.min(d/2.5,1);a.uniform1f(s.mezcla,e*e*(3-2*e)),a.drawArrays(a.TRIANGLES,0,3)},x=()=>{if(!a||!o||!s)return;let n=getComputedStyle(e),r=parseFloat(n.width)-2,c=parseFloat(n.height)-2;if(!(r>1&&c>1))return;let l=new DOMMatrixReadOnly(n.transform).a||1,u=Math.min(window.devicePixelRatio||1,1.5,Math.sqrt(m/(r*l*c)));if(u<.5){v();return}let d=Math.max(1,Math.round(r*l*u)),f=Math.max(1,Math.round(c*u));(t.width!==d||t.height!==f)&&(t.width=d,t.height=f);let p=c+2;a.viewport(0,0,d,f),a.uniform2f(s.origen,d/r,f/c),a.uniform2f(s.semilla,i[0],i[1]),a.uniform2f(s.escala,l*r/(d*p),c/(f*p)),b()},S=()=>{if(!a||!o)return;let e=new Uint8Array(4),n=1/0;a.readPixels(0,0,1,1,a.RGBA,a.UNSIGNED_BYTE,e);for(let t=0;t<2;t++){let t=performance.now();a.drawArrays(a.TRIANGLES,0,3),a.readPixels(0,0,1,1,a.RGBA,a.UNSIGNED_BYTE,e),n=Math.min(n,performance.now()-t)}n>8&&(m=t.width*t.height*8/n,x())},C=e=>{u=requestAnimationFrame(C);let t=e-f;t<30||(f=e,d+=Math.min(t,100)/1e3,b(),++p===100&&S())},w=()=>{if(r.matches)_(),e.classList.remove(`con-humo`);else{if(!e.classList.contains(`con-humo`)){if(!l||n.matches||!y()||(x(),c))return;e.classList.add(`con-humo`)}!l||n.matches?_():u||=(f=performance.now(),requestAnimationFrame(C))}},T=new IntersectionObserver(e=>{l=e[e.length-1].isIntersecting,w()});new ResizeObserver(x).observe(e),window.addEventListener(`resize`,x),n.addEventListener?.(`change`,w),r.addEventListener?.(`change`,w),t.addEventListener(`webglcontextlost`,t=>{t.preventDefault(),o=null,_(),e.classList.remove(`con-humo`)}),t.addEventListener(`webglcontextrestored`,w);let E=()=>T.observe(e);`requestIdleCallback`in window?requestIdleCallback(E,{timeout:2e3}):setTimeout(E,200)}