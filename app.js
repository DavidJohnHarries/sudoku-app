'use strict';
// ===== Sudoku (killer) solving tool — plain JS, localStorage, no build step =====
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const LS=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}},SV=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const RC=i=>`r${Math.floor(i/9)+1}c${i%9+1}`;
const COLOURS=['#fca5a5','#fdba74','#fde047','#86efac','#5eead4','#93c5fd','#c4b5fd','#f9a8d4','#cbd5e1'];
const MAXCOL=3;
// Feature flags / hooks for later variants (thermometers, arrows, kropki...): add a parser section + a draw layer.
const FEATURES={calculator:true};
const SAMPLE=`SUDOKU v1
name Sample killer
givens .................................................................................
cage 19 r1c1 r2c1 r3c1
cage 15 r1c2 r1c3 r2c2 r3c2
cage 20 r1c4 r2c3 r2c4
cage 12 r1c5 r1c6 r2c6
cage 8 r1c7 r2c7
cage 12 r1c8 r1c9 r2c8
cage 5 r2c5
cage 8 r2c9
cage 11 r3c3 r3c4 r4c3
cage 10 r3c5 r4c5
cage 6 r3c6
cage 23 r3c7 r4c7 r5c7 r6c6 r6c7
cage 12 r3c8 r4c8
cage 20 r3c9 r4c9 r5c8 r5c9
cage 17 r4c1 r4c2
cage 2 r4c4
cage 14 r4c6 r5c5 r5c6
cage 15 r5c1 r6c1 r6c2
cage 4 r5c2
cage 8 r5c3 r6c3
cage 15 r5c4 r6c4
cage 4 r6c5
cage 9 r6c8 r7c8
cage 10 r6c9 r7c9
cage 20 r7c1 r7c2 r8c2
cage 23 r7c3 r7c4 r8c3 r8c4
cage 18 r7c5 r8c5 r9c4 r9c5
cage 10 r7c6 r7c7
cage 6 r8c1 r9c1 r9c2
cage 7 r8c6
cage 30 r8c7 r8c8 r9c6 r9c7 r9c8
cage 8 r8c9 r9c9
cage 4 r9c3`;

// ---------- Puzzle format (see README) ----------
function blankPuzzle(name){return {id:uid(),name:name||'Untitled',givens:Array(81).fill(0),cages:[],v:Array(81).fill(0),cn:Array(81).fill(''),mn:Array(81).fill(''),col:Array.from({length:81},()=>[]),time:0,solved:false,extra:[],groups:{},updated:Date.now()}}
function parseCell(t){const m=/^r([1-9])c([1-9])$/i.exec(t);return m?(m[1]-1)*9+(m[2]-1):-1}
function parseGrid81(s){s=s.replace(/[\s|]/g,'');if(s.length!==81||/[^.0-9]/.test(s))return null;return [...s].map(ch=>ch==='.'?0:+ch)}
function parsePuzzle(text){
 const lines=text.replace(/\r/g,'').split('\n');const errs=[],p=blankPuzzle();let i=0;
 while(i<lines.length&&!lines[i].trim())i++;
 const hdr=(lines[i]||'').trim().split(/\s+/);
 if(hdr[0].toUpperCase()!=='SUDOKU'||!/^v\d+$/i.test(hdr[1]||''))return {errs:['First line must be "SUDOKU v1"']};
 const ver=+hdr[1].slice(1);if(ver>1)errs.push(`Note: format v${ver} is newer than this app (v1); unknown lines are kept but ignored.`);
 const cageByAnchor={},pend=[];
 for(i++;i<lines.length;i++){
  let raw=lines[i];const ln=i+1;const line=raw.replace(/#.*$/,'').trim();if(!line)continue;
  const sp=line.indexOf(' ');const kw=(sp<0?line:line.slice(0,sp)).toLowerCase(),rest=sp<0?'':line.slice(sp+1).trim();
  const toks=rest.split(/\s+/).filter(Boolean);
  const grabGrid=()=>{let s=rest;while(s.replace(/[\s|]/g,'').length<81&&i+1<lines.length&&/^[\s.0-9|]+$/.test(lines[i+1])&&lines[i+1].trim()){i++;s+=lines[i]}return parseGrid81(s)};
  if(kw==='name')p.name=rest||p.name;
  else if(kw==='givens'||kw==='values'){const g=grabGrid();if(!g){errs.push(`Line ${ln}: ${kw} needs 81 characters of 1-9 or . (0 also = empty)`);continue}if(kw==='givens')p.givens=g;else p.v=g}
  else if(kw==='cage'){const sum=+toks[0];const cells=toks.slice(1).map(parseCell);
   if(!Number.isInteger(sum)||sum<1||sum>45||!cells.length||cells.some(c=>c<0)){errs.push(`Line ${ln}: expected "cage SUM r1c1 r1c2 ..."`);continue}
   const cg={sum,cells:[...new Set(cells)].sort((a,b)=>a-b),elim:[]};p.cages.push(cg);cageByAnchor[cg.cells[0]]=cg}
  else if(kw==='corner'||kw==='centre'||kw==='center'||kw==='colour'||kw==='color'){const c=parseCell(toks[0]||''),d=(toks.slice(1).join('')).replace(/[^1-9]/g,'');
   if(c<0){errs.push(`Line ${ln}: expected "${kw} r1c1 DIGITS"`);continue}
   const u=[...new Set(d)];if(kw==='corner')p.cn[c]=u.sort().join('');else if(kw[0]==='c'&&kw[1]==='e')p.mn[c]=u.sort().join('');else p.col[c]=u.slice(0,MAXCOL).map(Number)}
  else if(kw==='elim'||kw==='groupsum')pend.push([ln,toks,kw]);
  else if(kw==='time'){p.time=Math.max(0,parseInt(toks[0])||0)}
  else if(kw==='solved')p.solved=true;
  else {p.extra.push(raw.trim());if(!errs.some(e=>e.includes(`"${kw}"`)))errs.push(`Note: "${kw}" lines aren't supported yet; kept and ignored.`)}
 }
 for(const [ln,toks,kw] of pend){const bm=/^box([1-9])$/i.exec(toks[0]||'');
  if(bm){const G=groupOf(p,bm[1]-1);if(!G){errs.push(`Line ${ln}: box${bm[1]} has no uncaged cells`);continue}const g=ensureGroup(p,G);
   if(kw==='groupsum'){const n=parseInt(toks[1]);if(n>=1&&n<=45&&!G.derived)g.sum=n}else g.elim=toks.slice(1).filter(t=>/^[1-9]+$/.test(t));continue}
  if(kw==='groupsum'){errs.push(`Line ${ln}: expected "groupsum boxN SUM"`);continue}
  const c=parseCell(toks[0]||'');const cg=cageByAnchor[c];if(!cg){errs.push(`Line ${ln}: elim must name a cage's top-left cell`);continue}cg.elim=toks.slice(1).filter(t=>/^[1-9]+$/.test(t))}
 for(let k=0;k<81;k++)if(p.givens[k])p.v[k]=0;
 return {p,errs};
}
function gridStr(a){let s='';for(let r=0;r<9;r++)s+=(r?' ':'')+a.slice(r*9,r*9+9).map(x=>x||'.').join('');return s}
function exportPuzzle(p,state){
 const L=['SUDOKU v1','name '+p.name,'givens '+gridStr(p.givens)];
 for(const c of p.cages)L.push(`cage ${c.sum} `+c.cells.map(RC).join(' '));
 L.push(...p.extra);
 if(state){
  if(p.v.some(x=>x))L.push('values '+gridStr(p.v));
  for(let i=0;i<81;i++){if(p.cn[i])L.push(`corner ${RC(i)} ${p.cn[i]}`);if(p.mn[i])L.push(`centre ${RC(i)} ${p.mn[i]}`);if(p.col[i].length)L.push(`colour ${RC(i)} ${p.col[i].join('')}`)}
  for(const c of p.cages)if(c.elim&&c.elim.length)L.push(`elim ${RC(c.cells[0])} ${c.elim.join(' ')}`);
  for(let b=0;b<9;b++){const G=groupOf(p,b);if(!G||!G.stored)continue;if(!G.derived&&G.sum)L.push(`groupsum ${G.key} ${G.sum}`);if(G.elim.length)L.push(`elim ${G.key} ${G.elim.join(' ')}`)}
  L.push('time '+Math.floor(p.time));if(p.solved)L.push('solved');
 }
 return L.join('\n')+'\n';
}

// ---------- Uncaged groups (uncaged cells of a 3x3 box) ----------
// Sum is 45 minus the box's cages when every cage touching the box lies inside it; otherwise typed by the user.
// Memory (typed sum, ruled-out combos) is kept per box in p.groups[boxN] and reset if the group's cells or derived sum change.
function boxCellsOf(b){const r0=Math.floor(b/3)*3,c0=(b%3)*3,o=[];for(let r=0;r<3;r++)for(let c=0;c<3;c++)o.push((r0+r)*9+c0+c);return o}
function groupOf(p,b){const bc=boxCellsOf(b),cnt=Array(81).fill(0),touch=new Set();
 p.cages.forEach((c,k)=>c.cells.forEach(i=>{cnt[i]++;if(bc.includes(i))touch.add(k)}));
 const cells=bc.filter(i=>!cnt[i]);if(!cells.length)return null;
 let derived=!bc.some(i=>cnt[i]>1),s=0;for(const k of touch){const c=p.cages[k];s+=c.sum;if(!c.cells.every(i=>bc.includes(i)))derived=false}
 const key='box'+(b+1),ck=cells.join(','),dsum=derived?45-s:null,g=p.groups&&p.groups[key];
 const stored=!!g&&g.cells===ck&&g.dsum===dsum;
 return {key,b,cells,ck,dsum,derived,stored,sum:derived?dsum:(stored?g.sum:null),elim:stored?g.elim:[]}}
function ensureGroup(p,G){p.groups=p.groups||{};let g=p.groups[G.key];if(!g||g.cells!==G.ck||g.dsum!==G.dsum)g=p.groups[G.key]={cells:G.ck,dsum:G.dsum,sum:null,elim:[]};return g}

// ---------- Storage ----------
let DB=LS('sdk_puzzles')||{};let curId=LS('sdk_cur');
if(!Object.keys(DB).length){const {p}=parsePuzzle(SAMPLE);DB[p.id]=p;curId=p.id}
for(const p of Object.values(DB)){p.extra=p.extra||[];p.groups=p.groups||{};p.cages.forEach(c=>c.elim=c.elim||[])}
if(!DB[curId])curId=Object.values(DB).sort((a,b)=>b.updated-a.updated)[0].id;
let P=DB[curId];
let saveT=null;const saveNow=()=>{clearTimeout(saveT);saveT=null;SV('sdk_puzzles',DB);SV('sdk_cur',curId)};
const save=()=>{P.updated=Date.now();saveNow()};

// ---------- Geometry / peers ----------
const ROW=i=>Math.floor(i/9),COL=i=>i%9,BOX=i=>Math.floor(ROW(i)/3)*3+Math.floor(COL(i)/3);
const HOUSES=[];for(let k=0;k<9;k++){HOUSES.push([...Array(9)].map((_,j)=>k*9+j));HOUSES.push([...Array(9)].map((_,j)=>j*9+k));HOUSES.push([...Array(9)].map((_,j)=>(Math.floor(k/3)*3+Math.floor(j/3))*9+(k%3)*3+j%3))}
let cagesOf=[];function indexCages(){cagesOf=Array.from({length:81},()=>[]);P.cages.forEach((c,k)=>c.cells.forEach(i=>cagesOf[i].push(k)))}
function peers(i){const s=new Set();for(let j=0;j<81;j++)if(j!==i&&(ROW(j)===ROW(i)||COL(j)===COL(i)||BOX(j)===BOX(i)))s.add(j);for(const k of cagesOf[i])for(const j of P.cages[k].cells)if(j!==i)s.add(j);return s}
const valAt=i=>P.givens[i]||P.v[i];

// ---------- UI state ----------
let sel=new Set(),mode='v',editing=false,etab='cage',sumBuf='',editCage=-1,paused=false,numSel=0;
let undoS=[],redoS=[];
const snap=()=>JSON.stringify({gr:P.groups,g:P.givens,c:P.cages,v:P.v,cn:P.cn,mn:P.mn,col:P.col,s:P.solved});
function restore(s){const o=JSON.parse(s);Object.assign(P,{groups:o.gr||{},givens:o.g,cages:o.c,v:o.v,cn:o.cn,mn:o.mn,col:o.col,solved:o.s})}
function act(fn){const before=snap();fn();const after=snap();if(after!==before){undoS.push(before);if(undoS.length>500)undoS.shift();redoS=[];save()}render()}
function undo(){if(!undoS.length)return;redoS.push(snap());restore(undoS.pop());save();editCage=-1;render()}
function redo(){if(!redoS.length)return;undoS.push(snap());restore(redoS.pop());save();editCage=-1;render()}

// ---------- Build static DOM (never rebuilt mid-tap) ----------
const grid=$('#grid'),cells=[];
for(let i=0;i<81;i++){const d=document.createElement('div');d.className='cell';cells.push(d);grid.appendChild(d)}
const pad=$('#pad');const padBtns=[];
for(let d=1;d<=9;d++){const b=document.createElement('button');b.dataset.d=d;b.innerHTML=`<span class="sw"></span><span class="n">${d}</span>`;pad.appendChild(b);padBtns.push(b)}
const actBtn=document.createElement('button');actBtn.className='act';actBtn.id='bAct';pad.appendChild(actBtn);
const sumPad=$('#sumPad');[1,2,3,4,5,6,7,8,9,0].forEach(d=>{const b=document.createElement('button');b.dataset.s=d;b.textContent=d;sumPad.appendChild(b)});
const sb=document.createElement('button');sb.dataset.s='bk';sb.textContent='⌫';sumPad.appendChild(sb);sumPad.style.gridTemplateColumns='repeat(6,1fr)';
const givPad=$('#givPad');for(let d=1;d<=9;d++){const b=document.createElement('button');b.dataset.g=d;b.textContent=d;givPad.appendChild(b)}
{const b=document.createElement('button');b.dataset.g=0;b.className='act';b.textContent='⌫ Clear';givPad.appendChild(b)}

// ---------- Rendering ----------
function pie(cs){if(cs.length===1)return COLOURS[cs[0]-1];const n=cs.length;return 'conic-gradient('+cs.map((c,k)=>`${COLOURS[c-1]} ${k*100/n}% ${(k+1)*100/n}%`).join(',')+')'}
let bad=new Set(),cageBad=new Set();
function computeConflicts(){bad=new Set();cageBad=new Set();
 const units=HOUSES.concat(P.cages.map(c=>c.cells));
 for(const u of units){const m={};for(const i of u){const v=valAt(i);if(v)(m[v]=m[v]||[]).push(i)}for(const k in m)if(m[k].length>1)m[k].forEach(i=>bad.add(i))}
 P.cages.forEach((c,k)=>{let s=0,f=0;for(const i of c.cells){const v=valAt(i);if(v){s+=v;f++}}if(s>c.sum||(f===c.cells.length&&s!==c.sum))cageBad.add(k)})}
function noteMark(d){return numSel&&+d===numSel?`<span class="nh">${d}</span>`:`<span>${d}</span>`}
function cellHTML(i){
 let h='';const v=valAt(i);
 if(P.col[i].length)h+=`<div class="bg" style="background:${pie(P.col[i])}"></div>`;
 const anc=cagesOf[i].find(k=>P.cages[k].cells[0]===i);
 if(anc!==undefined)h+=`<span class="sum${cageBad.has(anc)?' bad':''}">${P.cages[anc].sum}</span>`;
 if(v)h+=`<span class="val">${v}</span>`;
 else{
  if(P.cn[i]){const d=[...P.cn[i]],t=Math.ceil(d.length/2),sp=a=>a.map(noteMark).join('');
   h+=`<div class="cn${anc!==undefined?' a':''}"><div>${sp(d.slice(0,t))}</div><div>${sp(d.slice(t))}</div></div>`}
  if(P.mn[i])h+=`<span class="mn m${P.mn[i].length}">${[...P.mn[i]].map(noteMark).join('')}</span>`;
 }
 return h}
let cellCache=Array(81).fill(null);
function renderCells(){computeConflicts();for(let i=0;i<81;i++){const h=cellHTML(i);if(cellCache[i]!==h){cells[i].innerHTML=h;cellCache[i]=h}cells[i].classList.toggle('given',!!P.givens[i]);cells[i].classList.toggle('bad',bad.has(i))}}
function renderLines(){
 const S=100,d=7;let g='';
 P.cages.forEach((c,k)=>{const set=new Set(c.cells);const IN=(r,cc)=>r>=0&&r<9&&cc>=0&&cc<9&&set.has(r*9+cc);let p='';
  for(const i of c.cells){const r=ROW(i),cc=COL(i),x0=cc*S,y0=r*S;
   if(!IN(r-1,cc)){const xs=IN(r,cc-1)?(IN(r-1,cc-1)?x0-d:x0):x0+d,xe=IN(r,cc+1)?(IN(r-1,cc+1)?x0+S+d:x0+S):x0+S-d;p+=`M${xs} ${y0+d}H${xe}`}
   if(!IN(r+1,cc)){const xs=IN(r,cc-1)?(IN(r+1,cc-1)?x0-d:x0):x0+d,xe=IN(r,cc+1)?(IN(r+1,cc+1)?x0+S+d:x0+S):x0+S-d;p+=`M${xs} ${y0+S-d}H${xe}`}
   if(!IN(r,cc-1)){const ys=IN(r-1,cc)?(IN(r-1,cc-1)?y0-d:y0):y0+d,ye=IN(r+1,cc)?(IN(r+1,cc-1)?y0+S+d:y0+S):y0+S-d;p+=`M${x0+d} ${ys}V${ye}`}
   if(!IN(r,cc+1)){const ys=IN(r-1,cc)?(IN(r-1,cc+1)?y0-d:y0):y0+d,ye=IN(r+1,cc)?(IN(r+1,cc+1)?y0+S+d:y0+S):y0+S-d;p+=`M${x0+S-d} ${ys}V${ye}`}}
  const hot=editing&&k===editCage,badc=cageBad.has(k);
  g+=`<path d="${p}" fill="none" stroke="${hot?'#2563eb':badc?'#dc2626':'#374151'}" stroke-width="${hot?5:2.6}" stroke-dasharray="${hot?'':'7 6'}"/>`});
 for(let k=1;k<9;k++){const w=k%3?1.5:5,c=k%3?'#9ca3af':'#111827';g+=`<path d="M${k*S} 0V900M0 ${k*S}H900" stroke="${c}" stroke-width="${w}"/>`}
 g+='<rect x="2.5" y="2.5" width="895" height="895" fill="none" stroke="#111827" stroke-width="5"/>';
 $('#lines').innerHTML=g}
function selGroup(){if(!sel.size)return null;const b=BOX([...sel][0]);const G=groupOf(P,b);if(!G||G.cells.length!==sel.size||!G.cells.every(i=>sel.has(i)))return null;return G}
function selCage(){if(!sel.size)return -1;const ks=cagesOf[[...sel][0]];for(const k of ks)if([...sel].every(i=>cagesOf[i].includes(k)))return k;return -1}
// Number selection (digit highlight): numSel is 1–9 or 0.
// A single selected cell that has a placed digit (given or user) sets numSel to that digit.
// Multi-select or a single empty cell clears it. An empty selection leaves it alone, so
// you can deselect the cell and keep studying that digit, or set it from the pad.
function syncNumSel(){
 if(editing)numSel=0;
 else if(sel.size===1)numSel=valAt([...sel][0])||0;
 else if(sel.size>1)numSel=0}
function blockedCells(){const s=new Set();if(!numSel)return s;
 for(let i=0;i<81;i++)if(valAt(i)===numSel){
  for(let j=0;j<81;j++)if(j!==i&&(ROW(j)===ROW(i)||COL(j)===COL(i)||BOX(j)===BOX(i)))s.add(j);
  for(const k of cagesOf[i])for(const j of P.cages[k].cells)if(j!==i)s.add(j)}
 for(let i=0;i<81;i++)if(valAt(i)===numSel)s.delete(i);return s}
let paintedNum=-1;
function renderSel(){
 syncNumSel();
 if(paintedNum!==numSel){renderCells();paintedNum=numSel}
 const blocked=blockedCells();
 for(let i=0;i<81;i++){cells[i].classList.toggle('sel',sel.has(i));cells[i].classList.toggle('same',!!numSel&&valAt(i)===numSel);cells[i].classList.toggle('blocked',blocked.has(i))}
 padBtns.forEach((b,k)=>b.classList.toggle('nsel',mode!=='k'&&!editing&&numSel===k+1));
 if(editing){$('#bPick').classList.add('hidden');$('#infoTxt').textContent=sel.size?`${sel.size} cell${sel.size>1?'s':''} selected`:'Drag across cells to make a cage';$('#bCalc').classList.add('hidden');return}
 $('#bCalc').classList.toggle('hidden',!FEATURES.calculator||mode==='k');$('#bPick').classList.toggle('hidden',mode!=='k');
 const k=selCage(),G=k<0?selGroup():null;
 if(G){$('#infoTxt').textContent=`Box ${G.b+1} uncaged · ${G.cells.length} cell${G.cells.length>1?'s':''} · sum ${G.sum||'?'}`;$('#bCalc').disabled=false}
 else if(k<0){$('#infoTxt').textContent=sel.size?'No cage selected':(numSel?`Number ${numSel} — tap ${numSel} again to clear`:'Tap a cell to select');$('#bCalc').disabled=true}
 else{const c=P.cages[k];$('#infoTxt').textContent=`Cage ${c.sum} · ${c.cells.length} cell${c.cells.length>1?'s':''}`;$('#bCalc').disabled=false}
}
function renderControls(){
 $$('.modes button').forEach(b=>b.classList.toggle('on',b.dataset.m===mode));
 pad.classList.toggle('cmode',mode==='k');pad.classList.toggle('nmode',mode==='c'||mode==='m');
 padBtns.forEach((b,k)=>{b.querySelector('.sw').style.background=mode==='k'?COLOURS[k]:'transparent'});
 actBtn.textContent=mode==='k'?'Clear colours':'⌫';
 $('#play').classList.toggle('hidden',editing);$('#edit').classList.toggle('hidden',!editing);
 $('#bEdit').textContent=editing?'✓':'✎';
 $$('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===etab));
 $('#eCage').classList.toggle('hidden',etab!=='cage');$('#eGiv').classList.toggle('hidden',etab!=='giv');
 $('#sumBuf').textContent=sumBuf||'–';
 $('#bCreate').textContent=editCage>=0?'Update cage':'Create cage';$('#bDelCage').classList.toggle('hidden',editCage<0);
 $('#bUndo').disabled=$('#eUndo').disabled=!undoS.length;$('#bRedo').disabled=$('#eRedo').disabled=!redoS.length;
 $('#pname').textContent=P.name;
}
function render(){indexCages();syncNumSel();renderCells();paintedNum=numSel;renderLines();renderSel();renderControls();if(editing)renderWarn();checkSolved()}

// ---------- Cage validation ----------
const minSum=n=>n*(n+1)/2,maxSum=n=>n*(19-n)/2;
function contiguous(cs){const s=new Set(cs),seen=new Set([cs[0]]),q=[cs[0]];while(q.length){const i=q.pop();for(const j of [i-9,i+9,COL(i)?i-1:-1,COL(i)<8?i+1:-1])if(s.has(j)&&!seen.has(j)){seen.add(j);q.push(j)}}return seen.size===s.size}
function cageWarnings(){const w=[];let caged=0,total=0;
 const over=[];for(let i=0;i<81;i++){if(cagesOf[i].length)caged++;if(cagesOf[i].length>1)over.push(RC(i))}
 if(over.length)w.push(`Cells in two cages: ${over.join(' ')}`);
 P.cages.forEach(c=>{total+=c.sum;const n=c.cells.length,a=RC(c.cells[0]);
  if(!contiguous(c.cells))w.push(`Cage ${c.sum} at ${a} isn't joined up`);
  if(n>9)w.push(`Cage at ${a} has ${n} cells (max 9)`);else if(c.sum<minSum(n)||c.sum>maxSum(n))w.push(`Cage at ${a}: ${n} cells can't make ${c.sum} (range ${minSum(n)}–${maxSum(n)})`);
  const gv=c.cells.map(i=>P.givens[i]).filter(Boolean);if(new Set(gv).size<gv.length)w.push(`Cage ${c.sum} at ${a} repeats a given`)});
 if(caged===81&&!over.length&&total!==405)w.push(`Cage sums total ${total}, should be 405`);
 return {w,caged,total}}
function renderWarn(){const {w,caged,total}=cageWarnings();
 $('#warn').innerHTML=w.map(x=>`<div>⚠️ ${esc(x)}</div>`).join('')+`<div class="${caged===81&&!w.length?'ok':'muted'}">${P.cages.length} cages · ${caged}/81 cells caged · sums total ${total}${caged===81&&!w.length?' ✓':''}</div>`}

// ---------- Actions ----------
const editable=()=>[...sel].filter(i=>!P.givens[i]);
function nudge(el){el.classList.remove('nudge');void el.offsetWidth;el.classList.add('nudge')}
function toast(m){$$('.toast').forEach(x=>x.remove());const d=document.createElement('div');d.className='toast';d.textContent=m;document.body.appendChild(d);setTimeout(()=>d.remove(),1600)}
function pressDigit(d,el){
 // No cell selected (and not in Colour mode): the pad selects / toggles that number's highlight.
 if(!editing&&!sel.size&&mode!=='k'){numSel=numSel===d?0:d;render();return}
 const cs=editable();if(!cs.length){if(el)nudge(el);return}
 act(()=>{
  if(mode==='v'){const all=cs.every(i=>P.v[i]===d);
   for(const i of cs){if(all)P.v[i]=0;else{P.v[i]=d;for(const j of peers(i)){P.cn[j]=P.cn[j].replace(String(d),'');P.mn[j]=P.mn[j].replace(String(d),'')}}}}
  else if(mode==='c'||mode==='m'){const A=mode==='c'?P.cn:P.mn,t=cs.filter(i=>!P.v[i]);if(!t.length)return;const all=t.every(i=>A[i].includes(d));
   for(const i of t){const s=new Set(A[i]);all?s.delete(String(d)):s.add(String(d));A[i]=[...s].sort().join('')}}
  else if(mode==='k'){const all=[...sel].every(i=>P.col[i].includes(d));let full=0;
   for(const i of sel){const c=P.col[i];if(all)P.col[i]=c.filter(x=>x!==d);else if(!c.includes(d)){if(c.length>=MAXCOL)full++;else c.push(d)}}
   if(full)toast(`Max ${MAXCOL} colours per cell`)}
 })}
function erase(){const cs=editable();if(mode==='k'){clearColours();return}
 act(()=>{if(cs.some(i=>P.v[i]))cs.forEach(i=>P.v[i]=0);else if(cs.some(i=>P.cn[i]||P.mn[i]))cs.forEach(i=>{P.cn[i]='';P.mn[i]=''});else [...sel].forEach(i=>P.col[i]=[])})}
function clearColours(){act(()=>[...sel].forEach(i=>P.col[i]=[]))}
function checkSolved(){if(P.solved||editing)return;for(let i=0;i<81;i++)if(!valAt(i))return;if(bad.size||cageBad.size)return;P.solved=true;save();toast('Solved! 🎉 '+fmtT(P.time))}

// ---------- Grid pointer: tap / drag select, double/triple tap, multi-select ----------
// Single tap acts instantly; a 2nd tap on the same cell within 350ms upgrades to the cage (or box if no cage),
// a 3rd upgrades to the 3x3 box. In Multi mode taps toggle cells and double/triple taps ADD the group.
let gp=null,multi=false,tapSeq={cell:-1,t:0,n:0,base:null};
const BOXCELLS=i=>HOUSES[BOX(i)*3+2];
function cellAt(x,y){const r=grid.getBoundingClientRect();const c=Math.floor((x-r.left)/r.width*9),w=Math.floor((y-r.top)/r.height*9);return c<0||c>8||w<0||w>8?-1:w*9+c}
grid.addEventListener('pointerdown',e=>{const i=cellAt(e.clientX,e.clientY);if(i<0)return;e.preventDefault();
 const add=multi||e.shiftKey||e.metaKey||e.ctrlKey;const now=Date.now();
 const rep=!editing&&tapSeq.cell===i&&now-tapSeq.t<350;
 if(!rep)tapSeq={cell:i,t:now,n:0,base:new Set(sel)};
 gp={id:e.pointerId,start:i,moved:false,wasOnly:sel.size===1&&sel.has(i),wasSel:sel.has(i),add,rep};
 try{grid.setPointerCapture(e.pointerId)}catch(_){}
 if(rep)return; // upgrade happens on pointerup
 if(!add)sel=new Set();sel.add(i);renderSel()});
grid.addEventListener('pointermove',e=>{if(!gp||e.pointerId!==gp.id)return;const i=cellAt(e.clientX,e.clientY);if(i<0||i===gp.last)return;gp.last=i;if(i!==gp.start){gp.moved=true;tapSeq.cell=-1}if(!sel.has(i)){sel.add(i);renderSel()}});
function endGP(e){if(!gp||(e&&e.pointerId!=null&&e.pointerId!==gp.id))return;const g=gp;gp=null;
 if(g.moved){if(editing&&editCage>=0){editCage=-1;sumBuf='';renderLines();renderControls()}renderSel();return}
 if(g.rep){tapSeq.n++;tapSeq.t=Date.now();const i=g.start,ks=cagesOf[i];let grp,label;
  if(tapSeq.n===1&&ks.length){grp=P.cages[ks[0]].cells;label='Cage '+P.cages[ks[0]].sum}else if(tapSeq.n===1){grp=BOXCELLS(i).filter(j=>!cagesOf[j].length);label='Box '+(BOX(i)+1)+(grp.length<9?' uncaged':'')}else{grp=BOXCELLS(i);label='Box '+(BOX(i)+1)}
  sel=new Set([...(multi?tapSeq.base:[]),...grp]);renderSel();return}
 tapSeq.t=Date.now();
 if(editing&&etab==='cage'&&!g.add){const ks=cagesOf[g.start];if(ks.length){const k=ks[0];editCage=k;sel=new Set(P.cages[k].cells);sumBuf=String(P.cages[k].sum);renderLines();renderSel();renderControls();return}}
 if(g.add){if(g.wasSel)sel.delete(g.start)}else if(g.wasOnly)sel.clear();
 if(editing&&editCage>=0){editCage=-1;sumBuf='';renderLines();renderControls()}
 renderSel()}
['pointerup','pointercancel','lostpointercapture'].forEach(t=>grid.addEventListener(t,endGP));
// iOS: block pinch/double-tap zoom everywhere (Safari ignores user-scalable=no)
grid.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});
['gesturestart','gesturechange','gestureend'].forEach(t=>document.addEventListener(t,e=>e.preventDefault(),{passive:false}));
document.addEventListener('dblclick',e=>e.preventDefault(),{passive:false});
document.addEventListener('touchmove',e=>{if(e.touches.length>1)e.preventDefault()},{passive:false});
let lastTE=0;document.addEventListener('touchend',e=>{const now=Date.now();
 if(now-lastTE<400&&!e.target.closest('textarea,input')){e.preventDefault();const b=e.target.closest('button,.combo,#infoTxt');if(b&&!b.disabled&&!b.dataset.lp)b.click()}
 lastTE=now},{passive:false});

// ---------- Multi-select + select-by-colour ----------
function setMulti(on){multi=on;const b=$('#bMulti');b.classList.toggle('on',on);b.textContent=on?'☑ Multi':'☐ Multi'}
$('#bMulti').onclick=()=>setMulti(!multi);
let pickColour=false;
function setPick(on){pickColour=on;$('#bPick').classList.toggle('on',on);$('#bPick').textContent=on?'Tap a colour…':'◎ Select colour';pad.classList.toggle('picking',on)}
$('#bPick').onclick=()=>setPick(!pickColour);
// Tap the status line to drop the cell selection (number highlight stays). A quick second tap on a cell is a double-tap (cage/box), so this is the reliable way to get to 'no cell selected' without waiting 350ms.
$('#infoTxt').addEventListener('click',()=>{if(editing||!sel.size)return;sel.clear();renderSel()});
const CNAMES=['red','orange','yellow','green','teal','blue','purple','pink','grey'];
function selectColour(d){const hit=[];for(let i=0;i<81;i++)if(P.col[i].includes(d))hit.push(i);
 sel=new Set([...(multi?sel:[]),...hit]);setPick(false);if(!hit.length)toast(`No ${CNAMES[d-1]} cells`);renderSel()}
// long-press a colour key (Colour mode) = select all cells with that colour
padBtns.forEach(b=>{let t=null;
 b.addEventListener('pointerdown',()=>{delete b.dataset.lp;if(mode!=='k')return;t=setTimeout(()=>{t=null;b.dataset.lp='1';selectColour(+b.dataset.d)},500)});
 const cancel=()=>{if(t){clearTimeout(t);t=null}};['pointerup','pointercancel','pointerleave'].forEach(x=>b.addEventListener(x,cancel));
 b.addEventListener('contextmenu',e=>e.preventDefault())});

// ---------- Controls ----------
$$('.modes button').forEach(b=>b.onclick=()=>{mode=b.dataset.m;if(mode!=='k')setPick(false);renderControls();renderSel()});
padBtns.forEach(b=>b.onclick=()=>{if(b.dataset.lp){delete b.dataset.lp;return}if(mode==='k'&&pickColour){selectColour(+b.dataset.d);return}pressDigit(+b.dataset.d,b)});
actBtn.onclick=()=>mode==='k'?clearColours():erase();
$('#bErase').onclick=erase;$('#bUndo').onclick=$('#eUndo').onclick=undo;$('#bRedo').onclick=$('#eRedo').onclick=redo;
$('#bEdit').onclick=()=>setEditing(!editing);$('#bDone').onclick=()=>setEditing(false);
function setEditing(on){editing=on;editCage=-1;sumBuf='';if(on)sel.clear();render()}
$$('.tabs button').forEach(b=>b.onclick=()=>{etab=b.dataset.t;editCage=-1;sumBuf='';render()});
sumPad.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const s=b.dataset.s;
 if(s==='bk')sumBuf=sumBuf.slice(0,-1);else if(sumBuf.length<2&&!(sumBuf===''&&s==='0'))sumBuf+=s;else nudge(b);renderControls()});
$('#bCreate').onclick=()=>{const n=+sumBuf;if(!sel.size||!n||n>45){nudge($('#bCreate'));toast(!sel.size?'Select cells first':'Enter a sum (1–45)');return}
 const cellsSel=[...sel].sort((a,b)=>a-b);
 act(()=>{if(editCage>=0){const c=P.cages[editCage];c.sum=n;if(c.cells.join()!==cellsSel.join()){c.cells=cellsSel;c.elim=[]}}else P.cages.push({sum:n,cells:cellsSel,elim:[]});P.cages.sort((a,b)=>a.cells[0]-b.cells[0])});
 sel.clear();sumBuf='';editCage=-1;render()};
$('#bDelCage').onclick=()=>{if(editCage<0)return;const k=editCage;act(()=>P.cages.splice(k,1));editCage=-1;sel.clear();sumBuf='';render()};
givPad.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=+b.dataset.g;if(!sel.size){nudge(b);return}
 act(()=>{const all=d&&[...sel].every(i=>P.givens[i]===d);for(const i of sel){P.givens[i]=all?0:d;P.v[i]=0}P.solved=false})});

// ---------- Cage-sum calculator ----------
function combos(n,sum){const out=[];(function rec(start,left,acc,s){if(left===0){if(s===sum)out.push(acc.join(''));return}for(let d=start;d<=9;d++){if(s+d>sum)break;rec(d+1,left-1,[...acc,d],s+d)}})(1,n,[],0);return out}
// spec: {cells, sum (null = unknown), editable, elim(), toggle(x), setSum(n)}
function openCalc(spec){
 const placed=[...new Set(spec.cells.map(valAt).filter(Boolean))],n=spec.cells.length;
 const ok=x=>placed.every(d=>x.includes(String(d)));
 $('#mbox').innerHTML=`<h2 class="ch">SUM: ${spec.editable?`<input id="cSum" inputmode="numeric" pattern="[0-9]*" maxlength="2" value="${spec.sum||''}" placeholder="?">`:spec.sum}</h2><div class="muted" id="cMeta"></div><div id="cList"></div>
 <p class="muted cnote">Tap to rule out (tap again to restore). Grey = can't contain the digits already placed.${spec.editable?' Type the sum above — a cage crosses this box, so it can\'t be worked out.':''}</p><div class="r"><button class="btn" id="mClose">Close</button></div>`;
 const draw=()=>{const sum=spec.sum,list=sum?combos(n,sum):[],el=spec.elim();
  const live=list.filter(x=>!el.includes(x)&&ok(x)).length;
  $('#cMeta').textContent=`${n} cell${n>1?'s':''}`+(sum?` · ${list.length} combination${list.length===1?'':'s'}${list.length?` · ${live} still possible`:''}`:'');
  const cols=list.length<=5||n>=7?1:list.length<=10||n>=6?2:3;
  $('#cList').className='clist c'+cols;
  $('#cList').innerHTML=!sum?'<p class="muted">Enter the sum to see combinations.</p>':list.length?list.map(x=>`<button class="combo${el.includes(x)?' off':''}${ok(x)?'':' imp'}" data-x="${x}">${[...x].map(d=>`<span>${d}</span>`).join('')}</button>`).join(''):'<p class="err">No combination of different digits makes this sum.</p>'};
 draw();showModal();$('#mClose').onclick=closeModal;
 const inp=$('#cSum');if(inp)inp.addEventListener('input',()=>{const v=parseInt(inp.value);const nv=v>=1&&v<=45?v:null;if(nv===spec.sum)return;const before=snap();spec.setSum(nv);undoS.push(before);redoS=[];save();draw();renderSel();renderControls()});
 $('#cList').onclick=e=>{const b=e.target.closest('.combo');if(!b)return;const before=snap();spec.toggle(b.dataset.x);undoS.push(before);redoS=[];save();draw();renderControls()}}
function openCalculator(k){const c=P.cages[k];if(!c)return;
 openCalc({cells:c.cells,sum:c.sum,editable:false,elim:()=>c.elim,toggle:x=>{c.elim.includes(x)?c.elim.splice(c.elim.indexOf(x),1):c.elim.push(x)}})}
function openGroupCalc(G){const spec={cells:G.cells,sum:G.sum,editable:!G.derived,
 elim:()=>{const g=P.groups[G.key];return g&&g.cells===G.ck&&g.dsum===G.dsum?g.elim:[]},
 toggle:x=>{const g=ensureGroup(P,G);g.elim.includes(x)?g.elim.splice(g.elim.indexOf(x),1):g.elim.push(x)},
 setSum:nv=>{const g=ensureGroup(P,G);if(g.sum!==nv){g.sum=nv;g.elim=[]}spec.sum=nv}};openCalc(spec)}
$('#bCalc').onclick=()=>{const k=selCage();if(k>=0)return openCalculator(k);const G=selGroup();if(G)openGroupCalc(G)};
function showModal(){$('#modal').classList.remove('hidden')}
function closeModal(){if(document.activeElement)document.activeElement.blur();$('#modal').classList.add('hidden');$('#mbox').onclick=null;$('#mbox').innerHTML=''}
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});

// ---------- Timer ----------
const fmtT=s=>{s=Math.floor(s);const h=Math.floor(s/3600),m=Math.floor(s/60)%60,x=s%60;return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(x).padStart(2,'0')};
let lastTick=Date.now();
setInterval(()=>{const now=Date.now(),dt=(now-lastTick)/1000;lastTick=now;
 if(!document.hidden&&!paused&&!P.solved&&!editing&&$('#list').classList.contains('hidden')&&dt<5){P.time+=dt;if(!saveT)saveT=setTimeout(saveNow,5000)}
 $('#timer').textContent=paused?'⏸ '+fmtT(P.time):fmtT(P.time);$('#timer').classList.toggle('paused',paused)},1000);
$('#timer').onclick=()=>{paused=!paused;$('#timer').classList.toggle('paused',paused);$('#timer').textContent=paused?'⏸ '+fmtT(P.time):fmtT(P.time)};
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveNow();lastTick=Date.now()});

// ---------- Puzzle list, import / export ----------
function openPuzzle(id){saveNow();curId=id;P=DB[id];undoS=[];redoS=[];sel.clear();numSel=0;editing=false;editCage=-1;paused=false;cellCache=Array(81).fill(null);SV('sdk_cur',curId);showGame();render()}
function showGame(){$('#list').classList.add('hidden');$('#game').classList.remove('hidden')}
function progress(p){let f=0,g=0;for(let i=0;i<81;i++){if(p.givens[i])g++;else if(p.v[i])f++}return Math.round(100*(f+g)/81)}
function showList(){saveNow();$('#game').classList.add('hidden');$('#list').classList.remove('hidden');
 const ps=Object.values(DB).sort((a,b)=>b.updated-a.updated);
 $('#items').innerHTML=ps.map(p=>`<div class="item${p.id===curId?' cur':''}" data-id="${p.id}"><div class="t">${esc(p.name)}</div><div class="s">${p.solved?'Solved ✓':progress(p)+'% filled'} · ${fmtT(p.time)} · ${p.cages.length} cages · ${new Date(p.updated).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
 <div class="r"><button class="open" data-a="open">Open</button><button data-a="copy">Copy</button><button data-a="ren">Rename</button><button data-a="restart">Restart</button><button class="del" data-a="del">Delete</button></div></div>`).join('')}
$('#items').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const id=b.closest('.item').dataset.id,p=DB[id],a=b.dataset.a;
 if(a==='open')openPuzzle(id);
 else if(a==='copy')exportDialog(p);
 else if(a==='ren'){const n=prompt('Puzzle name',p.name);if(n&&n.trim()){p.name=n.trim();saveNow();showList()}}
 else if(a==='restart'){if(confirm(`Restart "${p.name}"? Your digits, notes, colours, ruled-out combos and time will be cleared.`)){Object.assign(p,{v:Array(81).fill(0),cn:Array(81).fill(''),mn:Array(81).fill(''),col:Array.from({length:81},()=>[]),time:0,solved:false});p.cages.forEach(c=>c.elim=[]);p.groups={};if(id===curId){undoS=[];redoS=[];cellCache=Array(81).fill(null)}saveNow();showList()}}
 else if(a==='del'){if(confirm(`Delete "${p.name}"? This can't be undone.`)){delete DB[id];if(!Object.keys(DB).length){const n=blankPuzzle('Untitled');DB[n.id]=n}if(id===curId){curId=Object.values(DB).sort((a,b)=>b.updated-a.updated)[0].id;P=DB[curId];undoS=[];redoS=[];cellCache=Array(81).fill(null)}saveNow();showList()}}});
$('#bList').onclick=showList;$('#bBack').onclick=()=>{showGame();render()};
$('#bNew').onclick=()=>{const n=prompt('Name for the new puzzle','Puzzle '+(Object.keys(DB).length+1));if(n===null)return;const p=blankPuzzle(n.trim()||'Untitled');DB[p.id]=p;openPuzzle(p.id);setEditing(true)};
$('#bPaste').onclick=()=>{
 $('#mbox').innerHTML=`<h2>Paste puzzle</h2><p class="muted" style="font-size:14px;margin:4px 0 8px">Paste the code Dev gave you (starts with <b>SUDOKU v1</b>).</p><textarea id="pIn" placeholder="SUDOKU v1\nname ...\ngivens ...\ncage 21 r1c1 r1c2 ..."></textarea><div id="pErr" class="err"></div>
 <div class="r"><button class="btn sec" id="pClip">Paste from clipboard</button><button class="btn" id="pGo">Import</button></div><div class="r"><button class="btn sec" id="pX">Cancel</button></div>`;
 showModal();$('#pX').onclick=closeModal;
 $('#pClip').onclick=async()=>{try{$('#pIn').value=await navigator.clipboard.readText()}catch(e){$('#pErr').textContent='Clipboard not available — long-press in the box and choose Paste.'}};
 $('#pGo').onclick=()=>{const r=parsePuzzle($('#pIn').value);if(!r.p){$('#pErr').textContent=r.errs.join('\n');return}
  const hard=r.errs.filter(x=>!x.startsWith('Note:'));if(hard.length&&!confirm('Some lines had problems:\n\n'+hard.join('\n')+'\n\nImport anyway?'))return;
  DB[r.p.id]=r.p;closeModal();openPuzzle(r.p.id);const notes=r.errs.filter(x=>x.startsWith('Note:'));if(notes.length)toast(notes[0].slice(6))}};
function exportDialog(p){
 $('#mbox').innerHTML=`<h2>Copy “${esc(p.name)}”</h2><div class="r"><button class="btn" id="xP">Copy puzzle</button><button class="btn" id="xS">Copy with progress</button></div><textarea id="xOut" readonly></textarea><div class="r"><button class="btn sec" id="xX">Close</button></div>`;
 showModal();$('#xX').onclick=closeModal;
 const go=async st=>{const t=exportPuzzle(p,st);$('#xOut').value=t;try{await navigator.clipboard.writeText(t);toast('Copied')}catch(e){$('#xOut').select();toast('Select all and copy')}};
 $('#xP').onclick=()=>go(false);$('#xS').onclick=()=>go(true);$('#xOut').value=exportPuzzle(p,false)}

// ---------- Keyboard (handy on a Mac/iPad keyboard) ----------
document.addEventListener('keydown',e=>{if(!$('#modal').classList.contains('hidden')||!$('#list').classList.contains('hidden'))return;
 if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return}
 if(e.key==='Escape'&&!editing){e.preventDefault();sel.clear();numSel=0;render();return}
 if(/^[1-9]$/.test(e.key)&&!editing){pressDigit(+e.key);return}
 if((e.key==='Backspace'||e.key==='Delete')&&!editing){erase();return}
 const m={z:'v',x:'c',c:'m',v:'k'}[e.key];if(m&&!editing){mode=m;if(m!=='k')setPick(false);renderControls();renderSel();return}
 const mv={ArrowUp:-9,ArrowDown:9,ArrowLeft:-1,ArrowRight:1}[e.key];if(mv&&sel.size){e.preventDefault();let i=[...sel].pop()+mv;if(i<0||i>80)return;sel=new Set([i]);renderSel()}});

if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{scope:'./'});
render();
