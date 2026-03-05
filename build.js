const fs = require('fs');
const ENEMY_B64  = fs.readFileSync('enemy.b64',  'utf8').trim();
const PLAYER_B64 = fs.readFileSync('player.b64', 'utf8').trim();

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>Space Invaders</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{
  background:#000;width:100%;height:100%;
  overflow:hidden;touch-action:none;
  user-select:none;-webkit-user-select:none;
  font-family:'Courier New',monospace;
}
#wrapper{
  display:flex;flex-direction:column;
  align-items:center;justify-content:flex-start;
  width:100%;height:100%;height:100dvh;background:#000;
}
#canvasWrap{
  flex:1 1 auto;display:flex;
  align-items:center;justify-content:center;
  width:100%;overflow:hidden;min-height:0;
}
canvas{display:block;image-rendering:pixelated;image-rendering:crisp-edges;}
#touch-controls{
  flex:0 0 auto;width:100%;
  display:none;
  flex-direction:column;
  align-items:center;
  padding:6px 16px 8px;
  background:rgba(0,0,0,.95);
  border-top:1px solid #003300;
  gap:6px;
}
@media (pointer:coarse){#touch-controls{display:flex}}
.trow{display:flex;align-items:center;justify-content:space-between;width:100%;}
.tbtn{
  background:rgba(0,255,68,.1);border:2px solid rgba(0,255,68,.5);
  border-radius:50%;color:#00ff44;font-size:28px;font-weight:bold;
  width:66px;height:66px;display:flex;align-items:center;justify-content:center;
  cursor:pointer;-webkit-tap-highlight-color:transparent;
  transition:background .08s;flex-shrink:0;
}
#btn-fire{
  background:rgba(255,238,0,.1);border-color:rgba(255,238,0,.6);
  color:#ffee00;font-size:13px;font-weight:bold;
  width:76px;height:76px;letter-spacing:1px;
}
#btn-weapon{
  background:rgba(100,100,255,.1);border-color:rgba(100,100,255,.5);
  color:#8888ff;font-size:11px;font-weight:bold;letter-spacing:0.5px;
  width:76px;height:76px;border-radius:12px;
}
.tbtn:active,.tbtn.on{background:rgba(0,255,68,.4)}
#btn-fire:active,#btn-fire.on{background:rgba(255,238,0,.4)}
#btn-weapon:active,#btn-weapon.on{background:rgba(100,100,255,.4)}
</style>
</head>
<body>
<div id="wrapper">
  <div id="canvasWrap">
    <canvas id="gameCanvas"></canvas>
  </div>
  <div id="touch-controls">
    <div class="trow">
      <button class="tbtn" id="btn-up">&#9650;</button>
      <button class="tbtn" id="btn-weapon">1&#10;STD</button>
      <button class="tbtn" id="btn-down">&#9660;</button>
    </div>
    <div class="trow">
      <button class="tbtn" id="btn-left">&#9664;</button>
      <button class="tbtn" id="btn-fire">FIRE</button>
      <button class="tbtn" id="btn-right">&#9654;</button>
    </div>
  </div>
</div>
<script>
const canvas=document.getElementById('gameCanvas');
const ctx=canvas.getContext('2d');
const BASE_W=800,BASE_H=600;
canvas.width=BASE_W; canvas.height=BASE_H;

const isMobile=window.matchMedia('(pointer:coarse)').matches;

function resizeCanvas(){
  const wrap=document.getElementById('canvasWrap');
  const s=Math.min(wrap.clientWidth/BASE_W, wrap.clientHeight/BASE_H);
  canvas.style.width=(BASE_W*s)+'px';
  canvas.style.height=(BASE_H*s)+'px';
}
window.addEventListener('resize',resizeCanvas);
resizeCanvas();setTimeout(resizeCanvas,100);setTimeout(resizeCanvas,500);

// ── AUDIO ─────────────────────────────────────────────────────────
const AC=new(window.AudioContext||window.webkitAudioContext)();
function tone(f,t,d,v,dl){
  v=v===undefined?.3:v; dl=dl||0;
  const o=AC.createOscillator(),g=AC.createGain();
  o.connect(g);g.connect(AC.destination);
  o.type=t;o.frequency.setValueAtTime(f,AC.currentTime+dl);
  g.gain.setValueAtTime(v,AC.currentTime+dl);
  g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+dl+d);
  o.start(AC.currentTime+dl);o.stop(AC.currentTime+dl+d);
}
function sndShoot(){tone(880,'square',.08,.2);tone(440,'square',.08,.1,.04);}
function sndRapid(){tone(1100,'square',.04,.12);}
function sndHomingShoot(){tone(660,'triangle',.12,.18);tone(990,'triangle',.08,.1,.06);}
function sndBoom(){
  const b=AC.createBuffer(1,AC.sampleRate*.3,AC.sampleRate),d=b.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);
  const s=AC.createBufferSource(),g=AC.createGain();
  s.buffer=b;s.connect(g);g.connect(AC.destination);
  g.gain.setValueAtTime(.4,AC.currentTime);
  g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+.3);
  s.start();
}
function sndBigBoom(){
  const b=AC.createBuffer(1,AC.sampleRate*.5,AC.sampleRate),d=b.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);
  const s=AC.createBufferSource(),g=AC.createGain();
  s.buffer=b;s.connect(g);g.connect(AC.destination);
  g.gain.setValueAtTime(.7,AC.currentTime);
  g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+.5);
  s.start();
}
function sndHit(){tone(200,'sawtooth',.4,.5);tone(100,'sawtooth',.4,.3,.2);}
function sndOver(){[440,350,280,220].forEach(function(f,i){tone(f,'sawtooth',.3,.4,i*.25);});}
function sndWin(){[261,329,392,523,659,784].forEach(function(f,i){tone(f,'square',.2,.3,i*.15);});}
function sndUfoBoom(){tone(300,'sawtooth',.15,.3);tone(150,'sawtooth',.25,.4,.08);}
function sndWeaponSwitch(){tone(880,'square',.05,.15);tone(660,'square',.05,.1,.04);}
let mt=0;
function sndMarch(){tone([110,140,110,80][mt%4],'square',.05,.15);mt++;}
function sndCombo(n){tone(440+n*80,'square',.08,.2);}

// ── IMAGES ────────────────────────────────────────────────────────
const EI=new Image(),PI=new Image();
let EL=false,PL=false;
EI.onload=EI.onerror=function(){EL=true;};
PI.onload=PI.onerror=function(){PL=true;};
EI.src='data:image/png;base64,${ENEMY_B64}';
PI.src='data:image/png;base64,${PLAYER_B64}';

// ── CONSTANTS ─────────────────────────────────────────────────────
const COLS=10,ROWS=5,EW=42,EH=36,EPX=12,EPY=12,PW=52,PH=40;
const RPTS=[30,20,20,10,10];
const PS=260,PVS=180,EBS=220,MEB=6;
const PY_MIN=Math.round(BASE_H*.42);
const PY_MAX=BASE_H-PH-20;

// ── WEAPONS ───────────────────────────────────────────────────────
// w,h = bullet dimensions; spd = upward speed; cd = fire cooldown
// max = max bullets on screen; aoe = explosion radius (0=none); home = homing
const WEAPONS=[
  {name:'STD',   col:'#ffee00', sw:'#ffee00', w:3,  h:14, spd:480, cd:0.38, max:3, aoe:0,  home:false},
  {name:'RAPID', col:'#44aaff', sw:'#44aaff', w:2,  h:9,  spd:660, cd:0.10, max:7, aoe:0,  home:false},
  {name:'BOOM',  col:'#ff8800', sw:'#ff6600', w:8,  h:18, spd:350, cd:0.80, max:1, aoe:72, home:false},
  {name:'LOCK',  col:'#cc44ff', sw:'#aa00ff', w:4,  h:14, spd:300, cd:0.50, max:2, aoe:0,  home:true },
];
let wt=0,sTimer=0;

// ── SHIELDS ───────────────────────────────────────────────────────
const SH_COLS=6,SH_ROWS=4,SH_CW=9,SH_CH=7;
const SH_W=SH_COLS*SH_CW,SH_H=SH_ROWS*SH_CH;

function initShields(){
  var shields=[];
  var positions=[130,310,490,670];
  for(var si=0;si<positions.length;si++){
    var cells=[];
    for(var r=0;r<SH_ROWS;r++)
      for(var c=0;c<SH_COLS;c++)
        cells.push({r:r,c:c,hp:3});
    shields.push({x:positions[si],y:BASE_H-105,w:SH_W,h:SH_H,cells:cells});
  }
  return shields;
}

// ── STATE ─────────────────────────────────────────────────────────
var state='start',score=0,hi=parseInt(localStorage.getItem('siHS')||'0'),lives=3,wave=1;
var emTimer=0,emInt=.8,esTimer=0,esInt=1.2,eDir=1;
var enemies=[],pb=[],eb=[],parts=[],floatTexts=[];
var pl={},inv=false,invT=0,shake=0,flash=0,keys={},lt=0;
var ufo=null,ufoTimer=0;
var combo=0,comboT=0;
var shields=[];
var waveMsg='',waveMsgT=0;

function initGame(keepScore){
  if(!keepScore){wave=1;score=0;lives=3;}
  pb=[];eb=[];parts=[];floatTexts=[];
  sTimer=0;emTimer=0;emInt=.8;esTimer=0;esInt=1.2;
  inv=false;invT=0;shake=0;flash=0;mt=0;eDir=1;
  pl={x:BASE_W/2-PW/2,y:PY_MAX,w:PW,h:PH,dead:false,rt:0};
  wt=0;combo=0;comboT=0;
  ufo=null;ufoTimer=10+Math.random()*12;
  waveMsg='WAVE '+wave;waveMsgT=1.8;
  enemies=[];
  var gW=COLS*(EW+EPX)-EPX,sx=(BASE_W-gW)/2;
  // Each wave enemies start slightly lower (closer to player)
  var sy=Math.min(70+wave*10,160);
  // Base enemy interval gets faster each wave
  var baseInt=Math.max(.12,.8-wave*.1);
  emInt=baseInt;
  for(var r=0;r<ROWS;r++){
    for(var c=0;c<COLS;c++){
      // Wave 3+: top row enemies take 2 hits
      var hp=(wave>=3&&r===0)?2:1;
      enemies.push({r:r,c:c,x:sx+c*(EW+EPX),y:sy+r*(EH+EPY),w:EW,h:EH,alive:true,pts:RPTS[r],hp:hp,maxHp:hp});
    }
  }
  shields=initShields();
}

// ── KEYBOARD ──────────────────────────────────────────────────────
document.addEventListener('keydown',function(e){
  keys[e.code]=true;
  if((e.code==='Space'||e.code==='Enter')&&state==='start'){AC.resume();state='playing';initGame(false);return;}
  if((e.code==='Space'||e.code==='Enter')&&(state==='gameover'||state==='victory')){state='start';return;}
  if(e.code==='KeyP'&&state==='playing'){state='paused';return;}
  if(e.code==='KeyP'&&state==='paused'){state='playing';return;}
  if(state==='playing'){
    if(e.code==='Digit1'){setWeapon(0);}
    if(e.code==='Digit2'){setWeapon(1);}
    if(e.code==='Digit3'){setWeapon(2);}
    if(e.code==='Digit4'){setWeapon(3);}
  }
});
document.addEventListener('keyup',function(e){keys[e.code]=false;});

function setWeapon(n){
  if(wt===n)return;
  wt=n;sndWeaponSwitch();
  updateWeaponBtn();
}
function updateWeaponBtn(){
  var el=document.getElementById('btn-weapon');
  if(el)el.textContent=(wt+1)+' '+WEAPONS[wt].name;
}

// ── TOUCH BUTTONS ─────────────────────────────────────────────────
function bindBtn(id,code){
  var el=document.getElementById(id);if(!el)return;
  var on=function(e){e.preventDefault();keys[code]=true;el.classList.add('on');};
  var off=function(e){e.preventDefault();keys[code]=false;el.classList.remove('on');};
  el.addEventListener('touchstart',on,{passive:false});
  el.addEventListener('touchend',off,{passive:false});
  el.addEventListener('touchcancel',off,{passive:false});
  el.addEventListener('mousedown',on);
  el.addEventListener('mouseup',off);
  el.addEventListener('mouseleave',off);
}
bindBtn('btn-left','ArrowLeft');
bindBtn('btn-right','ArrowRight');
bindBtn('btn-up','ArrowUp');
bindBtn('btn-down','ArrowDown');
bindBtn('btn-fire','Space');

var btnW=document.getElementById('btn-weapon');
if(btnW){
  var cycleW=function(e){
    e.preventDefault();
    setWeapon((wt+1)%WEAPONS.length);
  };
  btnW.addEventListener('touchstart',cycleW,{passive:false});
  btnW.addEventListener('mousedown',cycleW);
}

canvas.addEventListener('touchstart',function(e){
  e.preventDefault();AC.resume();
  if(state==='start'){state='playing';initGame(false);}
  else if(state==='gameover'||state==='victory')state='start';
},{passive:false});

// ── PARTICLES ─────────────────────────────────────────────────────
function boom(cx,cy,col,n){
  col=col||'#ff9900';n=n||18;
  for(var i=0;i<n;i++){
    var a=Math.random()*Math.PI*2,sp=40+Math.random()*120;
    parts.push({x:cx,y:cy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:1,dec:.9+Math.random()*.8,sz:2+Math.random()*3,col:col});
  }
}
function bigBoom(cx,cy){
  var cols=['#ffffff','#ff8800','#ffee00','#ff4400'];
  for(var i=0;i<40;i++){
    var a=Math.random()*Math.PI*2,sp=60+Math.random()*200;
    parts.push({x:cx,y:cy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:1.3,dec:.65+Math.random()*.5,sz:3+Math.random()*5,col:cols[i%4]});
  }
}
function updParts(dt){
  for(var i=parts.length-1;i>=0;i--){
    var p=parts[i];
    p.x+=p.vx*dt;p.y+=p.vy*dt;
    p.vx*=1-dt*2;p.vy*=1-dt*2;p.life-=p.dec*dt;
    if(p.life<=0)parts.splice(i,1);
  }
  for(var j=floatTexts.length-1;j>=0;j--){
    var t=floatTexts[j];
    t.y-=50*dt;t.life-=dt;
    if(t.life<=0)floatTexts.splice(j,1);
  }
}
function drawParts(){
  for(var i=0;i<parts.length;i++){
    var p=parts[i];
    ctx.globalAlpha=Math.max(0,p.life);
    ctx.fillStyle=p.col;
    ctx.beginPath();ctx.arc(p.x,p.y,p.sz,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
}
function hit(ax,ay,aw,ah,bx,by,bw,bh){return ax<bx+bw&&ax+aw>bx&&ay<by+bh&&ay+ah>by;}

// ── UFO ───────────────────────────────────────────────────────────
function spawnUfo(){
  var dir=Math.random()<.5?1:-1;
  var ptsList=[100,150,200,250,300];
  var pts=ptsList[Math.floor(Math.random()*ptsList.length)];
  ufo={x:dir===1?-60:BASE_W+60,y:38,w:52,h:24,spd:130*dir,pts:pts};
}
function updateUfo(dt){
  if(!ufo)return;
  ufo.x+=ufo.spd*dt;
  if(ufo.x>BASE_W+90||ufo.x<-90){ufo=null;}
}
function drawUfo(){
  if(!ufo)return;
  var x=ufo.x,y=ufo.y,w=ufo.w,h=ufo.h;
  var blink=Math.floor(Date.now()/80)%2===0;
  ctx.shadowColor='#ff4488';ctx.shadowBlur=14;
  ctx.fillStyle=blink?'#ff66aa':'#ff2266';
  ctx.beginPath();ctx.ellipse(x+w/2,y+h*.7,w/2,h*.32,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=blink?'#ffaacc':'#ff4488';
  ctx.beginPath();ctx.ellipse(x+w/2,y+h*.38,w*.3,h*.42,0,0,Math.PI*2);ctx.fill();
  // Running lights
  for(var i=0;i<5;i++){
    ctx.fillStyle=(Math.floor(Date.now()/100+i)%2===0)?'#ffffff':'#ff88cc';
    ctx.beginPath();ctx.arc(x+8+i*9,y+h*.68,2.5,0,Math.PI*2);ctx.fill();
  }
  ctx.shadowBlur=0;
  ctx.fillStyle='#ff88cc';ctx.font='bold 10px Courier New';ctx.textAlign='center';
  ctx.fillText('?? '+ufo.pts,x+w/2,y-5);
}

// ── SHIELDS ───────────────────────────────────────────────────────
function drawShields(){
  for(var si=0;si<shields.length;si++){
    var sh=shields[si];
    for(var ci=0;ci<sh.cells.length;ci++){
      var c=sh.cells[ci];
      if(c.hp<=0)continue;
      var cx=sh.x+c.c*SH_CW,cy=sh.y+c.r*SH_CH;
      var ratio=c.hp/3;
      var g=Math.floor(60+100*ratio);
      ctx.fillStyle='rgb(0,'+g+',0)';
      ctx.fillRect(cx,cy,SH_CW-1,SH_CH-1);
    }
  }
}
function hitShield(bx,by,bw,bh){
  for(var si=0;si<shields.length;si++){
    var sh=shields[si];
    for(var ci=0;ci<sh.cells.length;ci++){
      var c=sh.cells[ci];
      if(c.hp<=0)continue;
      var cx=sh.x+c.c*SH_CW,cy=sh.y+c.r*SH_CH;
      if(hit(bx,by,bw,bh,cx,cy,SH_CW,SH_CH)){
        c.hp--;return true;
      }
    }
  }
  return false;
}

// ── SCORE / COMBO ─────────────────────────────────────────────────
function addScore(pts,ex,ey){
  var mult=combo>=8?4:combo>=4?3:combo>=2?2:1;
  var actual=Math.round(pts*mult);
  score+=actual;
  if(score>hi){hi=score;localStorage.setItem('siHS',hi);}
  var label=(mult>1?'x'+mult+' ':'')+actual;
  floatTexts.push({x:ex,y:ey,life:1.1,txt:label,col:mult>1?'#ff8800':'#ffee00',big:mult>1});
  combo++;comboT=2.2;
  if(mult>1)sndCombo(mult);
}

// ── UPDATE ────────────────────────────────────────────────────────
function update(dt){
  if(state!=='playing')return;
  if(shake>0)shake=Math.max(0,shake-dt*8);
  if(flash>0)flash=Math.max(0,flash-dt*4);
  if(waveMsgT>0)waveMsgT-=dt;
  if(comboT>0){comboT-=dt;if(comboT<=0)combo=0;}

  // Player movement (horizontal + vertical forward/back)
  if(!pl.dead){
    if(keys['ArrowLeft']||keys['KeyA'])  pl.x=Math.max(0,pl.x-PS*dt);
    if(keys['ArrowRight']||keys['KeyD']) pl.x=Math.min(BASE_W-pl.w,pl.x+PS*dt);
    if(keys['ArrowUp']||keys['KeyW'])    pl.y=Math.max(PY_MIN,pl.y-PVS*dt);
    if(keys['ArrowDown']||keys['KeyS'])  pl.y=Math.min(PY_MAX,pl.y+PVS*dt);
  }
  if(pl.dead){
    pl.rt-=dt;
    if(pl.rt<=0){pl.dead=false;pl.x=BASE_W/2-pl.w/2;pl.y=PY_MAX;inv=true;invT=3;}
  }
  if(inv){invT-=dt;if(invT<=0)inv=false;}

  // UFO
  ufoTimer-=dt;
  if(ufoTimer<=0&&!ufo){spawnUfo();ufoTimer=12+Math.random()*18;}
  updateUfo(dt);

  // Player firing
  var wp=WEAPONS[wt];
  sTimer-=dt;
  if(!pl.dead&&keys['Space']&&sTimer<=0&&pb.length<wp.max){
    var bx=pl.x+pl.w/2-wp.w/2,by=pl.y;
    pb.push({x:bx,y:by,vx:0,vy:-wp.spd,w:wp.w,h:wp.h,spd:wp.spd,col:wp.col,aoe:wp.aoe,home:wp.home,wt:wt});
    sTimer=wp.cd;
    if(wt===1)sndRapid();
    else if(wt===3)sndHomingShoot();
    else sndShoot();
  }

  // Move player bullets
  for(var bi=pb.length-1;bi>=0;bi--){
    var b=pb[bi];
    if(b.home){
      // Steer toward nearest alive enemy
      var alive=[];
      for(var ei=0;ei<enemies.length;ei++){if(enemies[ei].alive)alive.push(enemies[ei]);}
      if(alive.length){
        var near=alive[0],nd=Infinity;
        for(var ni=0;ni<alive.length;ni++){
          var e=alive[ni];
          var dd=Math.sqrt((e.x+e.w/2-(b.x+b.w/2))*(e.x+e.w/2-(b.x+b.w/2))+(e.y+e.h/2-(b.y+b.h/2))*(e.y+e.h/2-(b.y+b.h/2)));
          if(dd<nd){nd=dd;near=e;}
        }
        var tx=near.x+near.w/2,ty=near.y+near.h/2;
        var dx=tx-(b.x+b.w/2),dy=ty-(b.y+b.h/2);
        var dist=Math.sqrt(dx*dx+dy*dy)||1;
        b.vx+=(dx/dist*b.spd-b.vx)*dt*4.5;
        b.vy+=(dy/dist*b.spd-b.vy)*dt*4.5;
        var bspd=Math.sqrt(b.vx*b.vx+b.vy*b.vy)||1;
        b.vx=b.vx/bspd*b.spd;b.vy=b.vy/bspd*b.spd;
      }
      b.x+=b.vx*dt;b.y+=b.vy*dt;
    }else{
      b.y-=b.spd*dt;
    }
    if(b.y+b.h<0||b.x<-60||b.x>BASE_W+60)pb.splice(bi,1);
  }

  // Enemy movement
  emTimer-=dt;
  if(emTimer<=0){
    var aliveE=[];
    for(var ei=0;ei<enemies.length;ei++){if(enemies[ei].alive)aliveE.push(enemies[ei]);}
    if(!aliveE.length){nextWave();return;}
    var mnX=Infinity,mxX=-Infinity;
    for(var ai=0;ai<aliveE.length;ai++){mnX=Math.min(mnX,aliveE[ai].x);mxX=Math.max(mxX,aliveE[ai].x+aliveE[ai].w);}
    var mv=12+wave*2;
    if((eDir===1&&mxX+mv>BASE_W-10)||(eDir===-1&&mnX-mv<10)){
      for(var ei2=0;ei2<enemies.length;ei2++)enemies[ei2].y+=20;
      eDir*=-1;
    }else{
      for(var ei3=0;ei3<enemies.length;ei3++)enemies[ei3].x+=mv*eDir;
    }
    var ratio=aliveE.length/(COLS*ROWS);
    var baseInt=Math.max(.06,.8-wave*.1);
    emInt=baseInt*(.08+.92*ratio);emTimer=emInt;sndMarch();
    for(var ai2=0;ai2<aliveE.length;ai2++){
      if(aliveE[ai2].y+aliveE[ai2].h>=pl.y-10){end('gameover');return;}
    }
  }

  // Enemy shooting
  esTimer-=dt;
  if(esTimer<=0){
    var aliveF=[];
    for(var ei=0;ei<enemies.length;ei++){if(enemies[ei].alive)aliveF.push(enemies[ei]);}
    var maxEb=MEB+wave;
    if(aliveF.length&&eb.length<maxEb){
      var shooter=aliveF[Math.floor(Math.random()*aliveF.length)];
      eb.push({x:shooter.x+shooter.w/2-1.5,y:shooter.y+shooter.h,w:3,h:14});
    }
    var aliveRatio=aliveF.length/(COLS*ROWS);
    esInt=Math.max(.18,.4+.8*aliveRatio-.08*wave);
    esTimer=esInt;
  }

  // Move enemy bullets + shield collision
  for(var bi=eb.length-1;bi>=0;bi--){
    eb[bi].y+=EBS*dt;
    if(hitShield(eb[bi].x,eb[bi].y,eb[bi].w,eb[bi].h)){eb.splice(bi,1);continue;}
    if(eb[bi].y>BASE_H)eb.splice(bi,1);
  }

  // Player bullets vs shields
  for(var bi=pb.length-1;bi>=0;bi--){
    var b=pb[bi];
    if(b.aoe===0&&hitShield(b.x,b.y,b.w,b.h)){pb.splice(bi,1);continue;}
  }

  // Player bullets vs enemies + UFO
  for(var bi=pb.length-1;bi>=0;bi--){
    var b=pb[bi];
    var hitSomething=false;

    // Check enemies
    for(var ei=0;ei<enemies.length;ei++){
      var e=enemies[ei];
      if(!e.alive)continue;
      if(hit(b.x,b.y,b.w,b.h,e.x,e.y,e.w,e.h)){
        if(b.aoe>0){
          // Explosive: damage all enemies within radius
          var cx=e.x+e.w/2,cy=e.y+e.h/2;
          for(var ai=0;ai<enemies.length;ai++){
            var ae=enemies[ai];
            if(!ae.alive)continue;
            var ddx=ae.x+ae.w/2-cx,ddy=ae.y+ae.h/2-cy;
            var dist2=Math.sqrt(ddx*ddx+ddy*ddy);
            if(dist2<=b.aoe){
              ae.hp--;
              if(ae.hp<=0){
                ae.alive=false;
                addScore(ae.pts,ae.x+ae.w/2,ae.y);
                boom(ae.x+ae.w/2,ae.y+ae.h/2,'#ff8800');
              }
            }
          }
          bigBoom(cx,cy);sndBigBoom();shake=.65;
        }else{
          e.hp--;
          if(e.hp<=0){
            e.alive=false;
            addScore(e.pts,e.x+e.w/2,e.y);
            boom(e.x+e.w/2,e.y+e.h/2,'#ff9900');
            sndBoom();
          }else{
            // Damaged but still alive (armored enemy)
            boom(e.x+e.w/2,e.y+e.h/2,'#ffffff',6);
          }
        }
        hitSomething=true;break;
      }
    }

    // Check UFO
    if(!hitSomething&&ufo&&hit(b.x,b.y,b.w,b.h,ufo.x,ufo.y,ufo.w,ufo.h)){
      addScore(ufo.pts,ufo.x+ufo.w/2,ufo.y);
      boom(ufo.x+ufo.w/2,ufo.y+ufo.h/2,'#ff4488',28);
      sndUfoBoom();ufo=null;hitSomething=true;
    }

    if(hitSomething)pb.splice(bi,1);
  }

  // Enemy bullets vs player
  if(!pl.dead&&!inv){
    for(var bi=eb.length-1;bi>=0;bi--){
      var b=eb[bi];
      if(hit(b.x,b.y,b.w,b.h,pl.x,pl.y,pl.w,pl.h)){
        eb.splice(bi,1);lives--;sndHit();
        boom(pl.x+pl.w/2,pl.y+pl.h/2,'#00ffff');
        shake=1;flash=.5;combo=0;comboT=0;
        if(lives<=0){end('gameover');return;}
        pl.dead=true;pl.rt=2;break;
      }
    }
  }

  if(enemies.every(function(e){return !e.alive;})){nextWave();return;}
  updParts(dt);
}

function nextWave(){
  wave++;
  if(wave>5){end('victory');return;}
  initGame(true);
}
function end(r){state=r;if(r==='gameover')sndOver();else sndWin();}

// ── DRAW ──────────────────────────────────────────────────────────
function fbE(x,y,w,h,dim){
  ctx.fillStyle=dim?'#004422':'#00ff88';
  ctx.fillRect(x+6,y+4,w-12,h-8);
  ctx.fillRect(x+2,y+8,6,10);ctx.fillRect(x+w-8,y+8,6,10);
  ctx.fillRect(x+10,y+2,6,6);ctx.fillRect(x+w-16,y+2,6,6);
}
function fbP(x,y,w,h){
  ctx.fillStyle='#00cfff';
  ctx.beginPath();ctx.moveTo(x+w/2,y);ctx.lineTo(x+w,y+h);ctx.lineTo(x,y+h);ctx.closePath();ctx.fill();
}

var STARS=[[34,22],[190,88],[420,45],[600,130],[750,60],[80,200],[310,180],[530,220],
           [700,170],[150,300],[400,310],[620,290],[760,350],[50,420],[280,400],
           [490,430],[710,410],[90,510],[360,490],[580,520]];

function drawWeaponHUD(){
  var startX=10,y=48;
  for(var i=0;i<WEAPONS.length;i++){
    var wp=WEAPONS[i];
    var x=startX+i*98;
    var active=(i===wt);
    ctx.fillStyle=active?wp.col:'#333';
    ctx.fillRect(x,y,86,22);
    ctx.fillStyle=active?'#000':'#888';
    ctx.font='bold 12px Courier New';ctx.textAlign='center';
    ctx.fillText((i+1)+' '+wp.name,x+43,y+15);
  }
}

function drawCombo(){
  if(combo<2||comboT<=0)return;
  var mult=combo>=8?4:combo>=4?3:combo>=2?2:1;
  ctx.globalAlpha=Math.min(1,comboT*.9);
  var col=mult>=4?'#ff4400':mult>=3?'#ff8800':'#ffee00';
  ctx.fillStyle=col;ctx.font='bold 20px Courier New';ctx.textAlign='right';
  ctx.shadowColor=col;ctx.shadowBlur=14;
  ctx.fillText('x'+mult+' COMBO!',BASE_W-10,74);
  ctx.shadowBlur=0;ctx.globalAlpha=1;
}

function drawFloatTexts(){
  for(var i=0;i<floatTexts.length;i++){
    var t=floatTexts[i];
    ctx.globalAlpha=Math.max(0,t.life);
    ctx.fillStyle=t.col;
    ctx.shadowColor=t.col;ctx.shadowBlur=8;
    ctx.font=(t.big?'bold 17px':'bold 13px')+' Courier New';
    ctx.textAlign='center';
    ctx.fillText(t.txt,t.x,t.y);
    ctx.shadowBlur=0;
  }
  ctx.globalAlpha=1;
}

function drawGame(){
  var sx=shake?(Math.random()-.5)*shake*14:0,sy=shake?(Math.random()-.5)*shake*14:0;
  ctx.save();ctx.translate(sx,sy);
  ctx.fillStyle='#000010';ctx.fillRect(-20,-20,BASE_W+40,BASE_H+40);
  ctx.fillStyle='#fff';
  for(var i=0;i<STARS.length;i++)ctx.fillRect(STARS[i][0],STARS[i][1],1,1);
  ctx.strokeStyle='#00ff44';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(0,BASE_H-15);ctx.lineTo(BASE_W,BASE_H-15);ctx.stroke();

  drawShields();
  drawUfo();

  // Draw enemies (armored ones flash)
  for(var i=0;i<enemies.length;i++){
    var e=enemies[i];
    if(!e.alive)continue;
    var armored=(e.hp>1);
    // Armored enemies get a white tint/outline
    if(EL&&EI.naturalWidth>0){
      ctx.drawImage(EI,e.x,e.y,e.w,e.h);
      if(armored){
        ctx.globalAlpha=0.35;
        ctx.fillStyle='#ffffff';
        ctx.fillRect(e.x,e.y,e.w,e.h);
        ctx.globalAlpha=1;
      }
    }else{
      fbE(e.x,e.y,e.w,e.h,false);
      if(armored){
        ctx.strokeStyle='#ffffff';ctx.lineWidth=2;
        ctx.strokeRect(e.x+1,e.y+1,e.w-2,e.h-2);
      }
    }
  }

  if(!pl.dead){
    var vis=!inv||(Math.floor(Date.now()/120)%2===0);
    if(vis){
      if(PL&&PI.naturalWidth>0)ctx.drawImage(PI,pl.x,pl.y,pl.w,pl.h);
      else fbP(pl.x,pl.y,pl.w,pl.h);
    }
  }

  // Draw player bullets
  ctx.shadowBlur=8;
  for(var bi=0;bi<pb.length;bi++){
    var b=pb[bi];
    ctx.fillStyle=b.col;ctx.shadowColor=b.col;
    if(b.aoe>0){
      // Explosive: fat oval with inner glow
      ctx.beginPath();ctx.ellipse(b.x+b.w/2,b.y+b.h/2,b.w/2,b.h/2,0,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=16;
      ctx.beginPath();ctx.ellipse(b.x+b.w/2,b.y+b.h/2,b.w/4,b.h/4,0,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=8;
    }else if(b.home){
      // Homing: draw rotated toward velocity
      ctx.save();
      var angle=Math.atan2(b.vy,b.vx);
      ctx.translate(b.x+b.w/2,b.y+b.h/2);
      ctx.rotate(angle+Math.PI/2);
      // Diamond shape
      ctx.beginPath();
      ctx.moveTo(0,-b.h/2);ctx.lineTo(b.w/2,0);
      ctx.lineTo(0,b.h/2);ctx.lineTo(-b.w/2,0);
      ctx.closePath();ctx.fill();
      ctx.restore();
    }else{
      ctx.fillRect(b.x,b.y,b.w,b.h);
    }
  }

  // Enemy bullets
  ctx.fillStyle='#ff4444';ctx.shadowColor='#ff4444';
  for(var bi=0;bi<eb.length;bi++)ctx.fillRect(eb[bi].x,eb[bi].y,eb[bi].w,eb[bi].h);
  ctx.shadowBlur=0;

  drawParts();
  drawFloatTexts();

  // HUD
  ctx.fillStyle='#00ff44';ctx.font='bold 16px Courier New';
  ctx.textAlign='left';ctx.fillText('SCORE: '+score,10,24);
  ctx.textAlign='center';ctx.fillText('HI: '+hi,BASE_W/2,24);
  ctx.textAlign='right';ctx.fillText('WAVE '+wave+'/5',BASE_W-10,24);
  ctx.fillText('LIVES:',BASE_W-84,44);
  for(var li=0;li<lives;li++){
    if(PL&&PI.naturalWidth>0)ctx.drawImage(PI,BASE_W-72+li*20,30,14,12);
    else{ctx.fillStyle='#00cfff';ctx.fillRect(BASE_W-72+li*20,32,10,10);}
  }

  drawWeaponHUD();
  drawCombo();

  // Wave announcement
  if(waveMsgT>0){
    var alpha=Math.min(1,waveMsgT);
    ctx.globalAlpha=alpha;
    ctx.fillStyle='#ffee00';ctx.font='bold 52px Courier New';ctx.textAlign='center';
    ctx.shadowColor='#ffee00';ctx.shadowBlur=24;
    ctx.fillText(waveMsg,BASE_W/2,BASE_H/2);
    ctx.shadowBlur=0;ctx.globalAlpha=1;
  }

  if(flash>0){ctx.fillStyle='rgba(255,80,80,'+flash+')';ctx.fillRect(-20,-20,BASE_W+40,BASE_H+40);}
  ctx.restore();
}

var BLINK=function(){return Math.floor(Date.now()/500)%2===0;};

function drawStart(){
  ctx.fillStyle='#000010';ctx.fillRect(0,0,BASE_W,BASE_H);
  ctx.fillStyle='#00ff44';ctx.font='bold 52px Courier New';ctx.textAlign='center';
  ctx.shadowColor='#00ff44';ctx.shadowBlur=20;
  ctx.fillText('SPACE INVADERS',BASE_W/2,125);ctx.shadowBlur=0;
  if(EL&&EI.naturalWidth>0)ctx.drawImage(EI,BASE_W/2-30,148,60,50);
  else fbE(BASE_W/2-30,148,60,50,false);
  ctx.fillStyle='#fff';ctx.font='14px Courier New';
  ctx.fillText('= 10-30 POINTS',BASE_W/2+20,184);
  ctx.fillStyle='#aaa';ctx.font='15px Courier New';ctx.fillText('CONTROLS',BASE_W/2,235);
  ctx.font='13px Courier New';
  if(isMobile){
    ctx.fillText('Buttons below to move & fire',BASE_W/2,258);
    ctx.fillText('Tap WEAPON button to switch missiles',BASE_W/2,280);
    ctx.fillText('Tap canvas to start',BASE_W/2,302);
  }else{
    ctx.fillText('A/D or Arrow Keys  Move (+ W/S to advance)',BASE_W/2,258);
    ctx.fillText('SPACE              Fire',BASE_W/2,280);
    ctx.fillText('1 2 3 4            Switch weapon',BASE_W/2,302);
    ctx.fillText('P                  Pause',BASE_W/2,324);
  }
  ctx.fillStyle='#ffee00';ctx.font='bold 12px Courier New';
  ctx.fillText('WEAPONS:  1-STD (yellow)  2-RAPID (blue)  3-BOOM (orange AOE)  4-LOCK (purple homing)',BASE_W/2,358);
  ctx.fillStyle='#888';ctx.font='12px Courier New';
  ctx.fillText('5 WAVES  |  UFO BONUS SHIPS  |  SHIELDS  |  COMBO MULTIPLIER',BASE_W/2,382);
  ctx.fillStyle='#ffee00';ctx.font='bold 20px Courier New';
  if(BLINK())ctx.fillText(isMobile?'TAP TO BEGIN':'PRESS ENTER OR SPACE',BASE_W/2,432);
  ctx.fillStyle='#555';ctx.font='13px Courier New';
  ctx.fillText('HIGH SCORE: '+hi,BASE_W/2,470);
}
function drawPause(){
  drawGame();
  ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(0,0,BASE_W,BASE_H);
  ctx.fillStyle='#ffee00';ctx.font='bold 48px Courier New';ctx.textAlign='center';
  ctx.fillText('PAUSED',BASE_W/2,BASE_H/2);
  ctx.font='18px Courier New';ctx.fillText('P to Resume',BASE_W/2,BASE_H/2+50);
}
function drawOver(){
  ctx.fillStyle='#000010';ctx.fillRect(0,0,BASE_W,BASE_H);
  ctx.fillStyle='#ff4444';ctx.font='bold 56px Courier New';ctx.textAlign='center';
  ctx.shadowColor='#ff4444';ctx.shadowBlur=24;
  ctx.fillText('GAME OVER',BASE_W/2,200);ctx.shadowBlur=0;
  ctx.fillStyle='#fff';ctx.font='24px Courier New';
  ctx.fillText('SCORE: '+score,BASE_W/2,275);
  ctx.fillText('HIGH SCORE: '+hi,BASE_W/2,315);
  ctx.fillStyle='#aaa';ctx.font='18px Courier New';
  ctx.fillText('Reached Wave '+wave+' of 5',BASE_W/2,355);
  ctx.fillStyle='#ffee00';ctx.font='bold 20px Courier New';
  if(BLINK())ctx.fillText(isMobile?'TAP TO RESTART':'PRESS ENTER OR SPACE',BASE_W/2,425);
}
function drawWin(){
  ctx.fillStyle='#000010';ctx.fillRect(0,0,BASE_W,BASE_H);
  var h=(Date.now()/20)%360;
  ctx.fillStyle='hsl('+h+',100%,60%)';ctx.font='bold 56px Courier New';ctx.textAlign='center';
  ctx.shadowColor='hsl('+h+',100%,60%)';ctx.shadowBlur=24;
  ctx.fillText('YOU WIN!',BASE_W/2,175);ctx.shadowBlur=0;
  ctx.fillStyle='#aaa';ctx.font='18px Courier New';
  ctx.fillText('All 5 waves cleared!',BASE_W/2,230);
  ctx.fillStyle='#fff';ctx.font='24px Courier New';
  ctx.fillText('SCORE: '+score,BASE_W/2,275);
  ctx.fillText('HIGH SCORE: '+hi,BASE_W/2,315);
  ctx.fillStyle='#00ff44';ctx.font='18px Courier New';
  ctx.fillText('Earth is saved!',BASE_W/2,360);
  ctx.fillStyle='#ffee00';ctx.font='bold 20px Courier New';
  if(BLINK())ctx.fillText(isMobile?'TAP TO PLAY AGAIN':'PRESS ENTER OR SPACE',BASE_W/2,430);
}

function loop(ts){
  var dt=Math.min((ts-lt)/1000,.05);lt=ts;
  ctx.clearRect(0,0,BASE_W,BASE_H);
  if(state==='start')drawStart();
  else if(state==='playing'){update(dt);drawGame();}
  else if(state==='paused')drawPause();
  else if(state==='gameover'){updParts(dt);drawOver();drawParts();drawFloatTexts();}
  else if(state==='victory'){updParts(dt);drawWin();drawParts();}
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
<\/script>
</body>
</html>`;

fs.writeFileSync('index.html', html);
console.log('written:', (html.length/1024/1024).toFixed(2), 'MB');
