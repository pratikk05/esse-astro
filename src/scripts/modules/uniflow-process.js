/* Uniflow concept two: circle to the Figma gear; dotted road to solid line.
   Shares the approved card timing and offscreen entrance with concept one. */
(() => {
  'use strict';
  const outer = document.getElementById('pw_long');
  const sticky = document.getElementById('pw-sticky');
  const canvas = document.getElementById('pw-canvas');
  const ctx = canvas.getContext('2d');
  const row = outer.querySelector('.cards_wrap');
  const cards = [...row.children];
  const counter = document.getElementById('current-step');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const headingReveals=new WeakMap();
  const scrambleAlphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  cards.forEach(card=>{
    const heading=card.querySelector('h2');
    const final=document.createElement('span');final.className='process-heading-final';
    while(heading.firstChild)final.appendChild(heading.firstChild);
    heading.appendChild(final);
    const overlay=final.cloneNode(true);overlay.className='process-heading-scramble';overlay.setAttribute('aria-hidden','true');overlay.hidden=true;heading.appendChild(overlay);
    headingReveals.set(card,{final,overlay,revealed:false,raf:0});
  });
  function revealHeading(card,visible){
    const state=headingReveals.get(card);
    if(!visible){cancelAnimationFrame(state.raf);state.raf=0;state.revealed=false;state.final.style.opacity='';state.overlay.hidden=true;return;}
    if(state.revealed)return;state.revealed=true;
    if(reduced.matches)return;
    state.overlay.innerHTML=state.final.innerHTML;
    const walker=document.createTreeWalker(state.overlay,NodeFilter.SHOW_TEXT),nodes=[];
    while(walker.nextNode())nodes.push({node:walker.currentNode,text:walker.currentNode.textContent});
    const total=nodes.reduce((sum,n)=>sum+n.text.replace(/\s/g,'').length,0);
    const started=performance.now();let lastTick=-1;
    state.final.style.opacity='0';state.overlay.hidden=false;
    function scramble(now){
      const progress=Math.min(1,(now-started)/550),tick=Math.floor((now-started)/45);
      if(progress>=1||reduced.matches){state.final.style.opacity='';state.overlay.hidden=true;state.raf=0;return;}
      if(tick!==lastTick){lastTick=tick;let index=0;const resolved=Math.floor(progress*total);
        for(const item of nodes)item.node.textContent=[...item.text].map(char=>{if(/\s/.test(char))return char;return index++<resolved?char:scrambleAlphabet[Math.floor(Math.random()*scrambleAlphabet.length)];}).join('');
      }
      state.raf=requestAnimationFrame(scramble);
    }
    scramble(started);
  }

  const TAU = Math.PI * 2, SAMPLES = 768;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  let W = 0, H = 0, R = 0, baseR = 0, road = 0, dpr = 1, progress = 0;
  let frame = 0, previousScroll = NaN, previousTarget = NaN;
  let cardProgress = 0;

  function resize() {
    W = canvas.parentElement.clientWidth;
    H = canvas.parentElement.clientHeight;
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    // Reserve a separate illustration band above the card copy on short screens.
    // Use the reference object's viewport-relative radius, fixed across scroll.
    baseR = W <= 767 ? Math.min(102.5 * W / 343, Math.max(30,(H-190)/2)) : Math.min(sticky.clientWidth, sticky.clientHeight) * (107.51 / 815);
    road = W <= 767 ? Math.min(372 * W / 343, H - 190) : Math.min(H * .57, H - 245);
    road = Math.max(2.35 * baseR, road);
    measure();
    draw(progress);
  }

  // Canonical Figma gear outline, sampled radially only for the animated morph.
  const gearPath = new Path2D("M198.888 84.4014L185.843 83.0165C185.059 82.9333 184.317 82.6243 183.705 82.1271C183.094 81.6298 182.641 80.9657 182.4 80.2154C180.917 75.5922 179.023 71.1108 176.742 66.8251C176.366 66.1197 176.206 65.3195 176.282 64.5239C176.358 63.7284 176.665 62.9726 177.167 62.3505L185.485 52.0589C187.168 49.9846 188.021 47.3598 187.88 44.6923C187.739 42.0249 186.614 39.5046 184.722 37.6193L171.453 24.352C169.569 22.4596 167.049 21.3338 164.382 21.1925C161.715 21.0511 159.091 21.9043 157.017 23.5868L146.502 32.0886C145.886 32.5873 145.137 32.8952 144.348 32.9747C143.56 33.0541 142.765 32.9017 142.061 32.5361C137.855 30.3613 133.467 28.5579 128.947 27.1464C128.188 26.9095 127.514 26.456 127.009 25.8415C126.504 25.2271 126.189 24.4784 126.104 23.6875L124.663 10.1675C124.386 7.51084 123.134 5.05137 121.148 3.26538C119.162 1.4794 116.584 0.493999 113.913 0.500039H95.1478C92.4763 0.492889 89.8972 1.47779 87.9103 3.26388C85.9235 5.04997 84.6704 7.51007 84.3938 10.1675L82.9598 23.6696C82.8747 24.4609 82.5602 25.21 82.055 25.825C81.5498 26.4399 80.876 26.8937 80.1163 27.1308C75.5958 28.5426 71.207 30.346 66.9998 32.5204C66.296 32.8833 65.502 33.0342 64.7142 32.9548C63.9263 32.8754 63.1785 32.5691 62.5613 32.073L52.0354 23.5712C49.961 21.8896 47.3367 21.037 44.6701 21.1784C42.0035 21.3197 39.484 22.4449 37.599 24.3363L24.3303 37.6036C22.4384 39.4889 21.3129 42.009 21.1715 44.6763C21.0302 47.3436 21.8831 49.9685 23.5652 52.0432L31.8875 62.3348C32.3887 62.9571 32.6961 63.713 32.7712 64.5086C32.8464 65.3042 32.6861 66.1043 32.3103 66.8095C30.0293 71.1003 28.1373 75.5869 26.657 80.2154C26.417 80.9667 25.9638 81.6319 25.3525 82.13C24.7411 82.6282 23.9981 82.9378 23.214 83.021L10.169 84.4059C7.51355 84.6833 5.05518 85.9354 3.26924 87.9202C1.4833 89.9051 0.496636 92.4816 0.500009 95.1517V113.916C0.498298 116.585 1.48571 119.16 3.27149 121.143C5.05727 123.127 7.5147 124.378 10.169 124.655L22.8225 125.998C23.618 126.08 24.3713 126.396 24.9879 126.906C25.6044 127.415 26.0567 128.096 26.2878 128.861C27.738 133.666 29.6306 138.326 31.9412 142.782C32.3053 143.483 32.457 144.276 32.3775 145.062C32.298 145.849 31.9909 146.595 31.4937 147.209L23.5742 157.011C21.892 159.086 21.0391 161.711 21.1805 164.378C21.3218 167.045 22.4473 169.565 24.3393 171.451L37.6079 184.718C39.493 186.609 42.0124 187.735 44.679 187.876C47.3456 188.017 49.9699 187.165 52.0443 185.483L61.6172 177.762C62.2384 177.259 62.9939 176.95 63.7897 176.874C64.5854 176.797 65.386 176.957 66.0915 177.333C70.6244 179.75 75.3757 181.732 80.2819 183.255C81.0392 183.49 81.7108 183.943 82.2135 184.557C82.7161 185.17 83.0277 185.918 83.1096 186.707L84.3938 198.898C84.6702 201.555 85.9225 204.015 87.9083 205.802C89.8941 207.589 92.4722 208.575 95.1434 208.57H113.904C116.577 208.577 119.157 207.592 121.144 205.806C123.132 204.019 124.386 201.558 124.663 198.9L125.958 186.702C126.04 185.914 126.352 185.166 126.854 184.552C127.357 183.939 128.029 183.486 128.786 183.25C133.692 181.728 138.443 179.746 142.976 177.33C143.681 176.953 144.482 176.792 145.278 176.868C146.074 176.944 146.83 177.253 147.451 177.758L157.028 185.497C159.102 187.179 161.727 188.032 164.393 187.89C167.06 187.749 169.579 186.623 171.464 184.731L184.733 171.464C186.625 169.579 187.75 167.059 187.891 164.391C188.032 161.724 187.179 159.099 185.496 157.025L177.576 147.223C177.08 146.608 176.773 145.862 176.693 145.076C176.614 144.289 176.765 143.497 177.129 142.795C179.439 138.34 181.332 133.68 182.782 128.875C183.013 128.109 183.465 127.429 184.081 126.92C184.697 126.41 185.45 126.094 186.245 126.011L198.901 124.669C201.555 124.391 204.013 123.14 205.799 121.157C207.584 119.173 208.572 116.598 208.57 113.929V95.1517C208.574 92.4787 207.586 89.8994 205.797 87.9133C204.008 85.9272 201.546 84.6758 198.888 84.4014Z");
  const gearRadii = [0.99544726,0.99548057,0.99558053,0.99574716,0.99598052,0.99628069,0.99664776,0.99708187,0.99758316,0.99815179,0.99878796,0.99949189,0.99994139,0.99981826,0.99910468,0.99780262,0.99588319,0.99333253,0.99008849,0.98610629,0.98129946,0.97553902,0.96864921,0.96031262,0.94998079,0.9364498,0.91623831,0.8940736,0.87301298,0.85297751,0.83389559,0.81570215,0.80086271,0.793374,0.78879501,0.78595951,0.78445264,0.78408967,0.78414283,0.78419894,0.78424934,0.78430394,0.78435426,0.78440614,0.78445759,0.78450679,0.78455937,0.7846059,0.78465667,0.7847035,0.78475164,0.78479961,0.78484513,0.78489426,0.78493717,0.78498435,0.78502778,0.78507236,0.78511698,0.78515898,0.78549062,0.78692429,0.78967017,0.7941222,0.80136471,0.81569457,0.83387897,0.85295102,0.87297571,0.89402451,0.91617627,0.93641461,0.94995878,0.96029429,0.96863003,0.97552013,0.98127987,0.98609148,0.99007814,0.99332384,0.9958772,0.99779872,0.99910026,0.99981509,0.99993695,0.99948659,0.99878254,0.99814576,0.99757651,0.99707461,0.99663988,0.99627219,0.99597141,0.99573744,0.9955702,0.99546963,0.9954357,0.9954684,0.99556774,0.99573376,0.9959665,0.99626605,0.9966325,0.99706599,0.99756665,0.99813466,0.9987702,0.99947289,0.99992285,0.99980135,0.99908723,0.99778706,0.99586675,0.99331445,0.99006974,0.98608278,0.98126991,0.97551109,0.96861969,0.96028247,0.94994191,0.93638913,0.91614122,0.89398663,0.8729353,0.85290835,0.83383427,0.81564806,0.80250545,0.79580231,0.79164492,0.78911829,0.78787622,0.78768978,0.7877166,0.78773803,0.78776161,0.78778528,0.78780563,0.7878298,0.78784863,0.78786957,0.78789058,0.7879083,0.78792984,0.78794599,0.78796431,0.78798263,0.78799773,0.78801665,0.78803011,0.78804581,0.78806146,0.78807393,0.78809023,0.78810105,0.78828057,0.78948454,0.79196526,0.79606601,0.80268082,0.81557806,0.83376158,0.85283278,0.87285665,0.89390469,0.91605575,0.93632658,0.94989722,0.96024886,0.96859251,0.97549255,0.98125895,0.98607585,0.99006632,0.99331273,0.99586895,0.99779345,0.99909581,0.99981453,0.99993822,0.99949027,0.99878796,0.99815179,0.99758316,0.99708187,0.99664776,0.99628069,0.99598052,0.99574716,0.99558053,0.99548057,0.99544726,0.99548057,0.99558053,0.99574716,0.99598052,0.99628069,0.99664776,0.99708187,0.99758316,0.99815179,0.99878796,0.99949189,0.99994891,0.99983369,0.99912788,0.99783359,0.99592171,0.9933783,0.9901402,0.98616353,0.98136169,0.97561187,0.96873666,0.9604139,0.95010621,0.93660846,0.91643174,0.89421205,0.87310137,0.85302025,0.83389665,0.81566509,0.80273834,0.7961234,0.79201652,0.78953125,0.78832891,0.7881522,0.78814042,0.78812324,0.78810995,0.78809362,0.78807726,0.78806325,0.78804377,0.78802817,0.7880094,0.78799061,0.78797405,0.78795205,0.78793386,0.78791239,0.78789092,0.78787156,0.78784677,0.78782574,0.78780136,0.78777694,0.78775463,0.78772677,0.78791733,0.78916682,0.79170279,0.79587054,0.80257732,0.81569189,0.83382684,0.85284487,0.87281047,0.89379455,0.91587529,0.93614355,0.9497289,0.96008765,0.96843467,0.97533864,0.9811084,0.98592878,0.98992231,0.99317186,0.99573086,0.99765812,0.99896408,0.99968593,0.99981402,0.99937099,0.99866892,0.99803332,0.99746525,0.99696451,0.99653095,0.99616441,0.99586477,0.99563193,0.99546581,0.99536635,0.99533353,0.99536733,0.99546777,0.99563487,0.9958687,0.99616932,0.99653685,0.99697141,0.99747313,0.9980422,0.9986788,0.99938314,0.99983781,0.99972091,0.99901407,0.99771937,0.99580778,0.99326534,0.99002894,0.9860549,0.98125677,0.97551188,0.96864277,0.96032775,0.95003239,0.93655661,0.91644106,0.89428514,0.87323229,0.85320367,0.83412779,0.81593966,0.80145283,0.79414802,0.78966122,0.7868928,0.7854421,0.78510036,0.78505907,0.78501579,0.78497187,0.78492975,0.7848832,0.78484091,0.78479307,0.78474815,0.78470147,0.78465392,0.7846084,0.78455823,0.7845123,0.78446107,0.78441253,0.78436248,0.7843113,0.78426246,0.78420865,0.78415908,0.7841046,0.7840524,0.78440051,0.785886,0.78869502,0.79323532,0.80064914,0.8153554,0.83353553,0.85260325,0.87262354,0.8936679,0.91581518,0.93615111,0.94976891,0.96014485,0.96850175,0.97541289,0.98118717,0.98601328,0.99001247,0.99326787,0.99583169,0.99776318,0.99907387,0.99979883,0.99993072,0.99949109,0.99878788,0.99815171,0.99758307,0.99708179,0.99664768,0.9962806,0.99598043,0.99574707,0.99558044,0.99548049,0.99544717,0.99548049,0.99558044,0.99574707,0.99598043,0.9962806,0.99664768,0.99708179,0.99758307,0.99815171,0.99878788,0.99949135,0.99993759,0.99981217,0.99909435,0.99779019,0.99586633,0.99331074,0.99006304,0.98607388,0.98125906,0.97549493,0.96859861,0.96025682,0.94991049,0.93634891,0.91609236,0.8939403,0.87289131,0.85286654,0.83379448,0.81561016,0.79951816,0.79115313,0.78614822,0.78301325,0.78124953,0.78065516,0.78060829,0.78056656,0.78052022,0.78047744,0.78043172,0.7803879,0.78034282,0.78029797,0.78025354,0.78020767,0.78016389,0.78011703,0.78007392,0.78002606,0.77998338,0.7799348,0.77989112,0.77984326,0.77979859,0.77975148,0.77970582,0.7796769,0.7803574,0.7822096,0.78545026,0.79060564,0.7992903,0.81572232,0.83392957,0.85302656,0.87307851,0.89415715,0.91634162,0.93655081,0.95007163,0.96039603,0.96872621,0.97561103,0.98136704,0.98617456,0.99015711,0.99339955,0.99594934,0.99786768,0.99916703,0.99987952,1.0,0.99954864,0.9988445,0.99820786,0.99763876,0.99713702,0.99670245,0.99633492,0.99603431,0.99580051,0.99563344,0.99553305,0.9954993,0.99553219,0.99563172,0.99579793,0.99603087,0.99633062,0.99669729,0.99713098,0.99763186,0.99820009,0.99883586,0.99953843,0.99998442,0.9998586,0.999139,0.99783413,0.99590818,0.99335028,0.99010131,0.98610926,0.98129116,0.97552393,0.96862227,0.96027616,0.94991963,0.93633942,0.91606281,0.8939268,0.8728924,0.8528809,0.83382095,0.81564767,0.79861722,0.78904743,0.78352216,0.78002888,0.77796938,0.77709362,0.77702772,0.7770041,0.7769844,0.77696105,0.77694175,0.77691866,0.77689976,0.77687695,0.77685846,0.77683593,0.77681784,0.77679561,0.77677792,0.77675598,0.77673871,0.77671705,0.77670021,0.77667883,0.77666243,0.77664133,0.77662537,0.77667515,0.77759412,0.77970505,0.78326274,0.78889875,0.79877832,0.81595539,0.83414504,0.85322258,0.873253,0.89430781,0.91646585,0.93663034,0.95013001,0.96043844,0.96875963,0.97563382,0.9813815,0.986181,0.99015569,0.99339125,0.99593311,0.99784347,0.99913529,0.99983934,0.99995157,0.99949146,0.99878759,0.99815142,0.99758279,0.9970815,0.99664739,0.99628031,0.99598015,0.99574679,0.99558016,0.9954802,0.99544689,0.9954802,0.99558016,0.99574679,0.99598015,0.99628031,0.99664739,0.9970815,0.99758279,0.99815142,0.99878759,0.99949063,0.99994131,0.99981983,0.99910448,0.99780341,0.99588129,0.99332711,0.99008127,0.98609269,0.98127799,0.97551342,0.96861477,0.96026967,0.94991579,0.93633988,0.91607379,0.89395234,0.87293113,0.8529316,0.83388252,0.81571914,0.79856961,0.78871262,0.7830868,0.77953498,0.77742843,0.77651257,0.77646384,0.77647974,0.77650083,0.77651707,0.77653833,0.7765549,0.77657632,0.77659322,0.77661481,0.776632,0.77665375,0.77667123,0.77669314,0.77671089,0.77673296,0.77675098,0.77677318,0.77679147,0.7768138,0.77683235,0.77685479,0.77691518,0.77777508,0.77981981,0.78330092,0.78881785,0.79839473,0.81545425,0.83365177,0.8527384,0.87277928,0.8938461,0.9160179,0.93626025,0.9498046,0.96013997,0.96847471,0.97536348,0.98112147,0.9859312,0.98991565,0.99315894,0.99571013,0.99762966,0.99892918,0.99964231,0.99976227,0.99930988,0.99860718,0.99797165,0.99740364,0.99690297,0.99646946,0.99610298,0.99580338,0.99557059,0.99540451,0.99530509,0.99527231,0.99530614,0.9954066,0.99557372,0.99580756,0.9961082,0.99647574,0.99691029,0.99741202,0.99798108,0.99861767,0.99932181,0.99977366,0.99965358,0.99894172,0.99764272,0.9957251,0.99317622,0.98993443,0.98595333,0.98114782,0.97539495,0.96851517,0.96018989,0.94987433,0.93636514,0.91617849,0.89401639,0.8729582,0.852925,0.83384519,0.81565373,0.79918155,0.79044877,0.78526891,0.78201104,0.78014795,0.77945862,0.7794893,0.77953859,0.7795897,0.77963827,0.77969035,0.77973818,0.77979117,0.77983824,0.77989058,0.77993837,0.77998992,0.78003852,0.78008923,0.78013859,0.78018844,0.78023853,0.78028746,0.78033824,0.78038623,0.78043765,0.78048465,0.78053693,0.78114633,0.78292395,0.78607559,0.79111165,0.79953649,0.81569456,0.83388077,0.8529548,0.87298164,0.89403281,0.91618717,0.93641976,0.94995896,0.96029217,0.9686303,0.97551952,0.9812802,0.98609203,0.99007828,0.99332449,0.99587718,0.99779837,0.99910069,0.99981614,0.99993965,0.99949145,0.99878796,0.99815179,0.99758316,0.99708187,0.99664776,0.99628069,0.99598052,0.99574716,0.99558053,0.99548057,0.99544726];
  const gearExtent = 104.51081072935771;
  function geometry(p) {
    const departure=clamp((p-.4)/.6),morph=ease(departure);
    const entrance=ease(clamp(p/.4));
    const firstCentre=cards[0].offsetLeft+cards[0].offsetWidth/2;
    const end=W-1.18*R;
    const travel=p<=.4?mix(-R*1.15,firstCentre,entrance):mix(firstCentre,end,departure);
    const cx=W<992?mix(-R*1.15,W*.5,entrance):travel;
    const rotation=(W<992?departure*R*4:travel)/R;
    const local=[];
    for(let i=0;i<=SAMPLES;i++){
      const angle=i/SAMPLES*TAU+rotation;
      const radius=R*mix(1,gearRadii[i],morph);
      local.push({x:radius*Math.cos(angle),y:radius*Math.sin(angle)});
    }
    // Support height keeps the circle/gear tangent to the straight road.
    const support=Math.max(...local.map(q=>q.y));
    const cy=road-support;
    const points=local.map(q=>({x:cx+q.x,y:cy+q.y}));
    return {cx,cy,rotation,morph,points};
  }

  function draw(p) {
    if (!W || !H) return;
    R = baseR;
    const g = geometry(p);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,W,H);
    ctx.lineWidth=1;ctx.lineJoin='round';ctx.lineCap='round';
    ctx.strokeStyle='#fff';ctx.fillStyle='#fff';

    // Exact original Figma vector at completion; radial interpolation before it.
    if(g.morph>=1){
      ctx.save();ctx.translate(g.cx,g.cy);ctx.rotate(g.rotation);
      ctx.scale(R/gearExtent,R/gearExtent);ctx.translate(-104.535,-104.535);
      ctx.lineWidth=gearExtent/R;ctx.stroke(gearPath);ctx.restore();
    }else{
      ctx.beginPath();g.points.forEach((q,i)=>{if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y);});
      ctx.closePath();ctx.stroke();
    }
    // Fixed segment anchors: fill each gap without shifting the dash pattern.
    const connection=ease(p),period=56,segment=mix(26,period,connection);
    ctx.lineCap='butt';ctx.beginPath();
    for(let x=0;x<W;x+=period){ctx.moveTo(x,road);ctx.lineTo(Math.min(W,x+segment),road);}
    ctx.stroke();ctx.lineCap='round';
    ctx.beginPath();ctx.arc(g.cx,g.cy,R*(49.04/gearExtent),0,TAU);ctx.stroke();
    ctx.beginPath();ctx.arc(g.cx,g.cy,3,0,TAU);ctx.fill();
    ctx.globalAlpha=.32;ctx.setLineDash([4,10]);ctx.beginPath();
    const guideY=road-R;
    ctx.moveTo(0,guideY);ctx.lineTo(W,guideY);ctx.stroke();
    ctx.setLineDash([]);ctx.globalAlpha=1;
    const step=String(Math.min(4,Math.floor(p*4)+1)).padStart(2,'0');
    if(shownStep!==step)rollCounter(step);
    const desktop = innerWidth >= 992;
    // Smoothness: every size is measured once (measure(), on resize) and all reads happen before
    // any write, so a scroll frame never forces the browser to recalculate layout mid-frame.
    const inView = desktop ? null : cards.map(card=>{const b=card.getBoundingClientRect();return b.left<innerWidth*.8&&b.right>innerWidth*.2;});
    cards.forEach((card,i)=>{
      const m=metrics[i]||measureCard(card,i);
      const active=String(i===Math.min(3,Math.floor(p*4)));
      // `reveal` is the original track (0 → 1, each card finishing at .30 / .45 / .60 / .75): it still
      // drives the one-by-one copy / heading / number reveal exactly as before.
      // Only the blue bar's HEIGHT starts from a staircase (100 / 67 / 50 / 40%) instead of zero.
      const reveal = desktop ? clamp(cardProgress / [.30,.45,.60,.75][i]) : 1;
      const opening = desktop ? mix([1,.67,.5,.4][i], 1, reveal) : 1;
      const copyVisible=clamp((reveal*m.cardHeight-m.safeHeight)/24);
      const number=reveal>.98?'0.7':'0';
      const last=m.last;
      if(last.active!==active){card.setAttribute('data-active',active);last.active=active;}
      if(last.opening!==opening){card.style.setProperty('--opening',String(opening));last.opening=opening;}
      const isIn=copyVisible>.5;
      if(last.isIn!==isIn){card.classList.toggle('is-in',isIn);last.isIn=isIn;}
      if(last.number!==number){card.style.setProperty('--number-visible',number);last.number=number;}
      revealHeading(card,copyVisible>0&&(desktop||inView[i]));
    });
    const rowTransform=desktop?'none':(()=>{const mobile=innerWidth<=479,start=mobile?.35:.28,travel=mobile?2.98:1;return `translate3d(${-clamp((cardProgress-start)/(.75-start))*travel*100}%,0,0)`;})();
    if(rowTransform!==lastRowTransform){row.style.transform=rowTransform;lastRowTransform=rowTransform;}
  }
  // Step counter rolls like an odometer: the old number slides out, the new one in (direction-aware).
  let shownStep=counter.textContent.trim();
  counter.style.display='inline-block';counter.style.overflow='hidden';counter.style.verticalAlign='top';
  function rollCounter(step){
    const up=+step>+shownStep;shownStep=step;
    if(reduced.matches||!counter.animate){counter.textContent=step;return;}
    const ease='cubic-bezier(0.16, 1, 0.3, 1)';
    counter.animate([{transform:'translateY(0)',opacity:1},{transform:`translateY(${up?-100:100}%)`,opacity:0}],{duration:180,easing:'ease-in'}).onfinish=()=>{
      counter.textContent=step;
      counter.animate([{transform:`translateY(${up?100:-100}%)`,opacity:0},{transform:'translateY(0)',opacity:1}],{duration:520,easing:ease});
    };
  }
  // Card sizes used by draw(): measured on resize, never during a scroll frame.
  let metrics=[],lastRowTransform='';
  function measureCard(card,i){
    const copy=card.querySelector('.process-card-container');
    const paddingBottom=parseFloat(getComputedStyle(card).paddingBottom)||0;
    return (metrics[i]={copy,cover:card.querySelector('.process_cover'),cardHeight:card.clientHeight,safeHeight:copy.offsetHeight+paddingBottom+24,last:metrics[i]?.last||{}});
  }
  function measure(){metrics=[];cards.forEach(measureCard);}

  // Same SCROLLING_IN_VIEW mapping, start offset, and smoothing as the reference.
  function cardTarget() {
    const r=outer.getBoundingClientRect(),vh=innerHeight,u=innerWidth>=992?.15:0;
    const c=r.top+Math.min(r.height*u,vh);
    // The removed closing section must not shorten the reference timing range.
    // In the supplied page its footer keeps the document-height cap inactive.
    const den=vh+(r.top+r.height-c);
    return clamp((vh-c)/den);
  }
  function tick() {
    const target=cardTarget(),s=innerWidth>=992?.16:innerWidth<=479?.2:.18; // a touch of inertia: bars, gear and cards glide
    const old=cardProgress;
    cardProgress=reduced.matches?target:mix(cardProgress,target,s);
    if(Math.abs(target-cardProgress)<.00001)cardProgress=target;
    // One shared clock: the path reaches its final tooth depth with the last card.
    const start=innerWidth>=992?0:innerWidth<=479?.35:.28;
    progress=clamp((cardProgress-start)/(.75-start));
    if(old!==cardProgress || previousScroll!==scrollY){
      draw(progress); previousScroll=scrollY;
    }
    frame=onScreen?requestAnimationFrame(tick):0;
  }
  const observer=new ResizeObserver(resize);observer.observe(canvas.parentElement);
  // Only run the scroll loop while the section is near the viewport (saves layout reads every frame elsewhere).
  let onScreen=true;
  new IntersectionObserver(([e])=>{onScreen=e.isIntersecting;if(onScreen&&!frame)frame=requestAnimationFrame(tick);},{rootMargin:'50% 0px'}).observe(outer);
  document.fonts.ready.then(resize);
  reduced.addEventListener('change',()=>draw(progress));
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);cards.forEach(card=>cancelAnimationFrame(headingReveals.get(card).raf));observer.disconnect();},{once:true});
  // A deterministic hook for frame review and contact-geometry verification.
  window.UniflowEvolution={seek(p){progress=clamp(p);draw(progress);},geometry,resize};
  resize();frame=requestAnimationFrame(tick);
})();
