// ===================== FOTBAL MANAŽER – jádro =====================
const STORE=(function(){const mem={};let ls=null;try{const t='__fm_t';window.localStorage.setItem(t,'1');window.localStorage.removeItem(t);ls=window.localStorage;}catch(e){ls=null;}
 return {ok:!!ls,get(k){try{if(ls){const v=ls.getItem(k);if(v!=null)return v;}}catch(e){}return mem[k]==null?null:mem[k];},
  set(k,v){mem[k]=v;if(!ls)return false;try{ls.setItem(k,v);return true;}catch(e){try{ls.removeItem(k);ls.setItem(k,v);return true;}catch(e2){return false;}}},
  del(k){delete mem[k];try{if(ls)ls.removeItem(k);}catch(e){}}};})();
const SAVE_KEY='fotbalManazer_save_v1';
const FM_VER=1;
let S=null;
let RNG=Math.random;
const rnd=(a,b)=>a+RNG()*(b-a), rint=(a,b)=>Math.floor(rnd(a,b+1)), pick=a=>a[Math.floor(RNG()*a.length)];
const clamp=(x,a,b)=>x<a?a:x>b?b:x;
const gauss=()=>(RNG()+RNG()+RNG()+RNG()-2)*1.22;
const finite=v=>{v=Number(v);return Number.isFinite(v)?v:0;};
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(RNG()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function hashStr(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function wpick(arr,wf){let t=0;const w=arr.map(x=>{const v=Math.max(0,finite(wf(x)));t+=v;return v;});if(t<=0)return arr[Math.floor(RNG()*arr.length)];let r=RNG()*t;for(let i=0;i<arr.length;i++){r-=w[i];if(r<=0)return arr[i];}return arr[arr.length-1];}
function czPlural(n,one,few,many){n=Math.abs(Math.round(finite(n)));return n===1?one:(n>=2&&n<=4?few:many);}
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function fmtMoney(v){v=finite(v);const a=Math.abs(v),s=v<0?'−':'';
 if(a>=1e9)return s+(a/1e9).toLocaleString('cs-CZ',{maximumFractionDigits:2})+' mld. €';
 if(a>=1e6)return s+(a/1e6).toLocaleString('cs-CZ',{maximumFractionDigits:a>=1e8?0:1})+' mil. €';
 if(a>=1e4)return s+Math.round(a/1e3).toLocaleString('cs-CZ')+' tis. €';
 return s+Math.round(a).toLocaleString('cs-CZ')+' €';}
const fmtNum=v=>Math.round(finite(v)).toLocaleString('cs-CZ');
const $=s=>document.querySelector(s);
// ---------- pozice ----------
const POS=['GK','CB','LB','RB','DM','CM','AM','LM','RM','LW','RW','ST'];
const POS_CZ={GK:'B',CB:'SO',LB:'LO',RB:'PO',DM:'DZ',CM:'SZ',AM:'OZ',LM:'LZ',RM:'PZ',LW:'LK',RW:'PK',ST:'ÚT'};
const POS_FULL={GK:'brankář',CB:'stoper',LB:'levý obránce',RB:'pravý obránce',DM:'defenzivní záložník',CM:'střední záložník',AM:'ofenzivní záložník',LM:'levý záložník',RM:'pravý záložník',LW:'levé křídlo',RW:'pravé křídlo',ST:'útočník'};
const GRP=p=>p==='GK'?'G':(p==='CB'||p==='LB'||p==='RB')?'D':(p==='LW'||p==='RW'||p==='ST')?'F':'M';
const GRP_CZ={G:'Brankáři',D:'Obránci',M:'Záložníci',F:'Útočníci'};
const GRP_COL={G:'#ffb648',D:'#36d1ff',M:'#3ee68a',F:'#ff5d73'};
// pozice vhodnost (1 = ideál)
const FIT={GK:{GK:1},CB:{CB:1,DM:.88,LB:.85,RB:.85},LB:{LB:1,LM:.9,RB:.86,CB:.85,LW:.8},RB:{RB:1,RM:.9,LB:.86,CB:.85,RW:.8},
 DM:{DM:1,CM:.93,CB:.86,AM:.8},CM:{CM:1,DM:.93,AM:.92,LM:.85,RM:.85},AM:{AM:1,CM:.92,LW:.86,RW:.86,ST:.85,LM:.84,RM:.84},
 LM:{LM:1,LW:.94,RM:.88,CM:.86,LB:.82,AM:.84},RM:{RM:1,RW:.94,LM:.88,CM:.86,RB:.82,AM:.84},LW:{LW:1,LM:.94,RW:.9,AM:.87,ST:.85},RW:{RW:1,RM:.94,LW:.9,AM:.87,ST:.85},ST:{ST:1,AM:.86,LW:.85,RW:.85}};
function posFit(p,slot){if(p===slot)return 1;const f=FIT[slot]&&FIT[slot][p];if(f)return f;if(slot==='GK'||p==='GK')return .35;return GRP(p)===GRP(slot)?.8:.68;}
const FORMS={
 '4-4-2':[['GK',50,92],['LB',14,72],['CB',37,76],['CB',63,76],['RB',86,72],['LM',14,46],['CM',38,50],['CM',62,50],['RM',86,46],['ST',38,20],['ST',62,20]],
 '4-3-3':[['GK',50,92],['LB',14,72],['CB',37,76],['CB',63,76],['RB',86,72],['DM',50,56],['CM',30,46],['CM',70,46],['LW',16,22],['ST',50,16],['RW',84,22]],
 '4-2-3-1':[['GK',50,92],['LB',14,72],['CB',37,76],['CB',63,76],['RB',86,72],['DM',36,56],['DM',64,56],['LM',16,34],['AM',50,36],['RM',84,34],['ST',50,15]],
 '4-1-4-1':[['GK',50,92],['LB',14,72],['CB',37,76],['CB',63,76],['RB',86,72],['DM',50,60],['LM',14,40],['CM',37,44],['CM',63,44],['RM',86,40],['ST',50,16]],
 '3-5-2':[['GK',50,92],['CB',26,76],['CB',50,78],['CB',74,76],['LM',10,48],['DM',50,58],['CM',32,44],['CM',68,44],['RM',90,48],['ST',38,18],['ST',62,18]],
 '3-4-3':[['GK',50,92],['CB',26,76],['CB',50,78],['CB',74,76],['LM',12,50],['CM',38,52],['CM',62,52],['RM',88,50],['LW',18,22],['ST',50,16],['RW',82,22]],
 '5-3-2':[['GK',50,92],['LB',8,66],['CB',30,76],['CB',50,78],['CB',70,76],['RB',92,66],['CM',30,48],['CM',50,52],['CM',70,48],['ST',38,20],['ST',62,20]],
 '4-5-1':[['GK',50,92],['LB',14,72],['CB',37,76],['CB',63,76],['RB',86,72],['LM',12,44],['CM',32,50],['CM',50,54],['CM',68,50],['RM',88,44],['ST',50,18]]};
const MENT={def:'Defenzivní',bal:'Vyrovnaná',att:'Útočná'};
const PRESS={low:'Nízký',mid:'Střední',high:'Vysoký'};
const STYLE={short:'Krátké přihrávky',direct:'Přímočarý',counter:'Protiútoky'};
const ATTR_CZ=['Rychlost','Střelba','Přihrávky','Technika','Obrana','Fyzička'];
const ATTR_GK=['Robinsonády','Chytání','Výkop','Reflexy','Postavení','Vyběhnutí'];
// ---------- vlajky ----------
function flag(iso){if(!iso||iso==='XX')return '🏳️';
 if(iso.indexOf('GB-')===0){const sub=iso.slice(3).toLowerCase();return '\u{1F3F4}'+[...('gb'+sub)].map(c=>String.fromCodePoint(0xE0000+c.charCodeAt(0))).join('')+'\u{E007F}';}
 if(iso==='XK')return '🇽🇰';
 return [...iso.toUpperCase()].map(c=>String.fromCodePoint(0x1F1E6+c.charCodeAt(0)-65)).join('');}
function natName(iso){return (FM_CAT.nat&&FM_CAT.nat[iso])||(FM_CAT.countries[iso])||iso;}
// ---------- data (líné načítání lig) ----------
const DATA={};const _loadCb={};
function FM_DATA(o){DATA[o.code]=o;const cb=_loadCb[o.code];if(cb){delete _loadCb[o.code];cb.forEach(f=>f.ok(o));}}
function loadLeague(code){if(DATA[code])return Promise.resolve(DATA[code]);
 return new Promise((ok,fail)=>{if(_loadCb[code]){_loadCb[code].push({ok,fail});return;}_loadCb[code]=[{ok,fail}];
  const s=document.createElement('script');s.src='data/'+code+'.js?v='+(window.FM_DATA_VER||'1');s.async=true;
  s.onerror=()=>{const cb=_loadCb[code];delete _loadCb[code];s.remove();(cb||[]).forEach(f=>f.fail(new Error('Nepodařilo se načíst data soutěže. Zkontroluj připojení k internetu.')));};
  document.head.appendChild(s);});}
function leagueInfo(code){return FM_CAT.leagues.find(l=>l.code===code);}
function countryLeagues(cc){return FM_CAT.leagues.filter(l=>l.cc===cc).sort((a,b)=>a.tier-b.tier);}
function leagueLabel(code){const l=leagueInfo(code);if(!l)return code;return l.name+(l.cc!=='CZ'&&['Bundesliga','Superliga','Super League','Premier Division'].includes(l.name)?' ('+l.country+')':'');}
// ---------- hodnota hráče ----------
function ageOf(p){return S.season-p.by;}
function playerValue(p){const a=ageOf(p);let v=150000*Math.exp((p.ovr-50)*0.17);
 const af=a<=19?1.7:a<=21?1.55:a<=24?1.3:a<=28?1:a<=30?0.75:a<=32?0.48:a<=34?0.28:0.15;
 v*=af*(1+Math.max(0,p.pot-p.ovr)*(a<=24?0.045:0.02));
 if(p.inj>4)v*=0.85;
 const r=v>=1e7?5e5:v>=1e6?5e4:v>=1e5?1e4:1e3;return Math.max(10000,Math.round(v/r)*r);}
function playerWage(p){const v=playerValue(p);const w=900+v*0.0021;const r=w>=1e4?500:100;return Math.round(w/r)*r;}
function initials(n){return n;}
function shortName(n){const parts=String(n).split(' ');if(parts.length<2)return n;const last=parts.slice(1).join(' ');return parts[0][0]+'. '+last;}
function surname(n){const parts=String(n).split(' ');return parts.length>1?parts.slice(1).join(' '):n;}

// ===================== SIMULACE: hra, sezóna, kola =====================
function P(id){return S.players[id];}
function C(id){return S.clubs[id];}
function myClub(){return S.clubs[S.clubId];}
function lgOf(cid){return S.clubs[cid].lg;}
function clubPlayers(cid){return (S.clubs[cid].pl||[]).map(P).filter(Boolean);}
function pSurname(p){if(!p)return '';if(['KR','CN','KP','TW'].includes(p.nat)){return p.n;}return surname(p.n);}
function mkPlayer(arr,cid,idx){const [n,pos,by,ovr,pot,nat,a,gen]=arr;const id='p'+(S.nextId++);
 const p={id,n,pos,by,ovr,pot:Math.max(pot,ovr),nat,a:a.slice(),gen:gen?1:0,cl:cid,cond:100,mor:70,inj:0,sus:0,yc:0,st:newStats(),form:[],car:{ap:0,g:0}};
 S.players[id]=p;return p;}
function newStats(){return {ap:0,g:0,as:0,yc:0,rc:0,rt:0,cs:0,min:0};}
function clubId(name){return 'c'+hashStr(name).toString(36);}
// ----- nová hra -----
async function newGame(opts){// opts: {cc, clubName, manager}
 const lgs=countryLeagues(opts.cc);
 const datas=await Promise.all(lgs.map(l=>loadLeague(l.code)));
 S={v:FM_VER,created:Date.now(),season:2026,round:0,cc:opts.cc,manager:opts.manager||'Trenér',clubs:{},players:{},nextId:1,leagues:{},news:[],
  inbox:[],offers:[],fin:{log:[]},history:[],tac:null,training:{focus:'bal',int:2},cohesion:55,boardTrust:60,gone:{},seasonLog:[],trophies:[],achievements:{},
  bets:[],betBank:0,settings:{speed:2,sound:false}};
 lgs.forEach((l,i)=>{const d=datas[i];const ids=[];
  d.clubs.forEach(c=>{const id=clubId(c.n+'|'+l.code);const club={id,n:c.n,s:c.s,c:c.c,b:c.b,lg:l.code,pl:[],money:0,rep:0};S.clubs[id]=club;ids.push(id);
   c.p.forEach((arr,k)=>{const p=mkPlayer(arr,id,k);club.pl.push(p.id);});});
  S.leagues[l.code]={code:l.code,clubs:ids,fix:[],res:[],table:{}};});
 for(const id in S.clubs){const c=S.clubs[id];c.rep=Math.round(teamStrength(id).ovr);}
 const me=Object.values(S.clubs).find(c=>c.n===opts.clubName);S.clubId=me?me.id:Object.keys(S.clubs)[0];
 setupFinances(true);
 startSeason(true);
 S.tac=defaultTactic(S.clubId);
 addNews('🤝',`${S.manager} se stal novým trenérem klubu ${myClub().n}. Vedení od něj čeká: ${expectText(myClub().expect)}.`);
 saveGame();return S;}
function setupFinances(initial){for(const id in S.clubs){const c=S.clubs[id];const wb=clubPlayers(id).reduce((s,p)=>s+playerWage(p),0);
  c.wageBase=wb; c.tv=Math.round(wb*1.02/100)*100;
  const r=c.rep||60;c.cap=Math.round(clamp(2500+Math.exp((r-55)*0.135)*2600,2500,75000)/100)*100;
  c.ticket=Math.round(clamp(6+(r-55)*1.6,5,90));
  if(initial){const sq=clubPlayers(id).reduce((s,p)=>s+playerValue(p),0);c.money=Math.round(sq*0.12/1e4)*1e4+Math.round(wb*8/1e4)*1e4;}}}
// ----- sestava a síla týmu -----
function effRating(p,slot){if(!p)return 30;let r=p.ovr*posFit(p.pos,slot);r*=0.78+0.22*clamp(p.cond,0,100)/100;r*=0.96+0.08*clamp(p.mor,0,100)/100;return r;}
function available(p){return p&&p.inj<=0&&p.sus<=0;}
function autoLineup(cid,form){form=form||'4-4-2';const slots=FORMS[form];const ps=clubPlayers(cid).filter(available);const used=new Set();const xi=new Array(slots.length).fill(null);
 // pořadí obsazování: nejdřív brankář, pak podle vzácnosti pozice
 const order=slots.map((s,i)=>i).sort((a,b)=>(slots[a][0]==='GK'?-1:0)-(slots[b][0]==='GK'?-1:0));
 for(const i of order){const slot=slots[i][0];let best=null,bv=-1;for(const p of ps){if(used.has(p.id))continue;const v=p.ovr*posFit(p.pos,slot)*(0.85+0.15*p.cond/100);if(v>bv){bv=v;best=p;}}if(best){xi[i]=best.id;used.add(best.id);}}
 const rest=ps.filter(p=>!used.has(p.id)).sort((a,b)=>b.ovr*(0.85+0.15*b.cond/100)-a.ovr*(0.85+0.15*a.cond/100));
 const bench=[];const gk=rest.find(p=>p.pos==='GK');if(gk)bench.push(gk.id);
 for(const p of rest){if(bench.length>=9)break;if(!bench.includes(p.id))bench.push(p.id);}
 return {xi,bench};}
function bestForm(cid){const ps=clubPlayers(cid);const cnt={D:0,M:0,F:0,W:0};ps.forEach(p=>{const g=GRP(p.pos);if(g!=='G')cnt[g]++;if(['LW','RW'].includes(p.pos))cnt.W++;});
 if(cnt.W>=3&&cnt.F>=4)return '4-3-3';const h=hashStr(cid)%5;return ['4-4-2','4-2-3-1','4-3-3','4-1-4-1','3-5-2'][h];}
function defaultTactic(cid){const form=bestForm(cid);const l=autoLineup(cid,form);return {form,ment:'bal',press:'mid',style:'short',xi:l.xi,bench:l.bench,cap:null,pk:null};}
function lineStrength(xiIds,form,tac){const slots=FORMS[form];let G=0,D=[],M=[],F=[];
 slots.forEach((s,i)=>{const p=P(xiIds[i]);const r=effRating(p,s[0]);const g=GRP(s[0]);if(g==='G')G=r;else if(g==='D')D.push(r);else if(g==='M')M.push(r);else F.push(r);
  if(s[0]==='DM')D.push(r*0.96);if(s[0]==='AM')F.push(r*0.96);if(['LM','RM'].includes(s[0]))F.push(r*0.9);if(['LB','RB'].includes(s[0])&&form.startsWith('3')===false)M.push(r*0.85);});
 const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:40;
 const n=xiIds.filter(Boolean).length;const miss=Math.max(0,11-n)*4;
 let att=avg(F)*0.62+avg(M)*0.38, def=avg(D)*0.62+G*0.22+avg(M)*0.16, mid=avg(M);
 const t=tac||{};if(t.ment==='att'){att+=1.6;def-=1.6;}else if(t.ment==='def'){att-=1.8;def+=1.6;}
 if(t.press==='high'){mid+=1.2;def-=0.4;}else if(t.press==='low'){mid-=1;def+=0.6;}
 if(t.style==='counter'){att+=t.ment==='def'?1.2:0.3;mid-=0.8;}else if(t.style==='direct'){att+=0.5;mid-=0.5;}else{mid+=0.8;}
 const ovr=(G+D.reduce((a,b)=>a+b,0)+M.reduce((a,b)=>a+b,0)+F.reduce((a,b)=>a+b,0))/Math.max(1,1+D.length+M.length+F.length);
 return {att:att-miss,def:def-miss,mid:mid-miss,gk:G,ovr:ovr-miss};}
function teamStrength(cid){const c=S.clubs[cid];if(cid===S.clubId&&S.tac)return lineStrength(S.tac.xi,S.tac.form,S.tac);
 const form=c.form||bestForm(cid);const l=autoLineup(cid,form);return lineStrength(l.xi,form,c.tac||{});}
// ----- rozpis -----
function roundRobin(ids){const t=ids.slice();if(t.length%2)t.push(null);const n=t.length,rounds=[];const arr=t.slice();
 for(let r=0;r<n-1;r++){const m=[];for(let i=0;i<n/2;i++){const a=arr[i],b=arr[n-1-i];if(a&&b)m.push(r%2===0?(i===0?[a,b]:[a,b]):[b,a]);}rounds.push(m);arr.splice(1,0,arr.pop());}
 const legs=ids.length>24?1:2;let all=rounds.slice();if(legs===2)all=all.concat(rounds.map(r=>r.map(([a,b])=>[b,a])));return all;}
function startSeason(first){RNG=Math.random;
 for(const code in S.leagues){const L=S.leagues[code];L.fix=roundRobin(shuffle(L.clubs.slice()));L.res=L.fix.map(()=>null);L.table={};L.clubs.forEach(id=>L.table[id]={p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0,form:[]});}
 S.round=0;S.maxRound=Math.max(...Object.values(S.leagues).map(L=>L.fix.length));
 for(const id in S.players){const p=S.players[id];p.st=newStats();p.yc=0;}
 // očekávání vedení podle síly v lize
 for(const code in S.leagues){const L=S.leagues[code];const r=L.clubs.map(id=>[id,teamStrength(id).ovr]).sort((a,b)=>b[1]-a[1]);r.forEach(([id],i)=>{S.clubs[id].expect=i+1;S.clubs[id].rep=Math.round(teamStrength(id).ovr);});}
 S.seasonStart={money:myClub().money};S.finSeason={inc:0,exp:0,gate:0,tv:0,wages:0,tr_in:0,tr_out:0,prize:0};
}
function expectText(pos){const L=S.leagues[myClub().lg];const n=L.clubs.length;const li=leagueInfo(myClub().lg);
 if(pos<=1)return 'boj o titul';if(pos<=3)return 'umístění na stupních vítězů';if(pos<=Math.ceil(n*0.4))return 'horní polovina tabulky';
 if(pos<=Math.ceil(n*0.7))return 'klidný střed tabulky';return li.down>0||li.tier>1?'záchrana v soutěži':'vyhnout se poslednímu místu';}
// ----- tabulka -----
function sortedTable(code){const L=S.leagues[code];return L.clubs.slice().sort((a,b)=>{const x=L.table[a],y=L.table[b];return y.pts-x.pts||(y.gf-y.ga)-(x.gf-x.ga)||y.gf-x.gf||S.clubs[a].n.localeCompare(S.clubs[b].n,'cs');});}
function tablePos(cid){return sortedTable(lgOf(cid)).indexOf(cid)+1;}
function applyResult(code,h,a,gh,ga){const T=S.leagues[code].table;const x=T[h],y=T[a];x.p++;y.p++;x.gf+=gh;x.ga+=ga;y.gf+=ga;y.ga+=gh;
 if(gh>ga){x.w++;y.l++;x.pts+=3;x.form.push('V');y.form.push('P');}else if(gh<ga){y.w++;x.l++;y.pts+=3;x.form.push('P');y.form.push('V');}else{x.d++;y.d++;x.pts++;y.pts++;x.form.push('R');y.form.push('R');}
 if(x.form.length>5)x.form.shift();if(y.form.length>5)y.form.shift();}
// ----- rychlá simulace zápasu (AI) -----
function xgPair(sh,sa){const k=24;let xh=1.3*Math.exp((sh.att-sa.def)/k+(sh.mid-sa.mid)/80)*1.12;let xa=1.3*Math.exp((sa.att-sh.def)/k+(sa.mid-sh.mid)/80)*0.9;return [clamp(xh,0.15,4.2),clamp(xa,0.12,3.8)];}
function poisson(l){let L=Math.exp(-l),k=0,p=1;do{k++;p*=RNG();}while(p>L&&k<12);return k-1;}
function pickScorer(ids){const ps=ids.map(P).filter(Boolean);return wpick(ps,p=>{const g=GRP(p.pos);return (g==='F'?6:g==='M'?(p.pos==='AM'?3.6:1.8):g==='D'?0.55:0.01)*Math.pow(Math.max(20,p.a[1]||50)/60,3);});}
function pickAssist(ids,ex){const ps=ids.map(P).filter(p=>p&&p.id!==ex);return wpick(ps,p=>{const g=GRP(p.pos);return (g==='F'?2.5:g==='M'?3.2:g==='D'?1:0.05)*Math.pow(Math.max(20,p.a[2]||50)/60,2);});}
function quickMatch(h,a){const fh=S.clubs[h].form||bestForm(h),fa=S.clubs[a].form||bestForm(a);const lh=autoLineup(h,fh),la=autoLineup(a,fa);
 const sh=lineStrength(lh.xi,fh,{}),sa=lineStrength(la.xi,fa,{});const [xh,xa]=xgPair(sh,sa);const gh=poisson(xh),ga=poisson(xa);
 const ev=[];const add=(cid,xi,n)=>{for(let i=0;i<n;i++){const s=pickScorer(xi);const as=RNG()<0.72?pickAssist(xi,s&&s.id):null;if(s){s.st.g++;s.car.g++;}if(as)as.st.as++;ev.push({t:'g',c:cid,p:s&&s.id,as:as&&as.id,m:rint(2,90)});}};
 add(h,lh.xi,gh);add(a,la.xi,ga);
 [[h,lh,ga],[a,la,gh]].forEach(([cid,l,conc])=>{l.xi.forEach(id=>{const p=P(id);if(!p)return;p.st.ap++;p.st.min+=90;p.car.ap++;const r=clamp(6.4+gauss()*0.5+(conc===0&&GRP(p.pos)!=='F'?0.4:0)-conc*0.12,4.5,9.5);p.st.rt+=r;if(conc===0&&(GRP(p.pos)==='G'))p.st.cs++;
  p.cond=clamp(p.cond-rint(14,24),20,100);if(RNG()<0.012){p.inj=rint(1,6);}if(RNG()<0.09){p.yc++;p.st.yc++;if(p.yc>=5){p.sus=1;p.justSus=S.round;p.yc=0;}}if(RNG()<0.004){p.st.rc++;p.sus=rint(1,3);p.justSus=S.round;}});});
 ev.sort((x,y)=>x.m-y.m);return {h,a,gh,ga,ev};}
// ----- kolo -----
function myFixture(r){r=r==null?S.round:r;const L=S.leagues[myClub().lg];const m=(L.fix[r]||[]).find(f=>f[0]===S.clubId||f[1]===S.clubId);return m||null;}
function playRound(userResult){const r=S.round;const out=[];
 for(const code in S.leagues){const L=S.leagues[code];if(r>=L.fix.length)continue;const res=[];
  for(const [h,a] of L.fix[r]){let m;if(userResult&&((h===S.clubId)||(a===S.clubId))&&code===myClub().lg)m=userResult;else m=quickMatch(h,a);
   applyResult(code,h,a,m.gh,m.ga);res.push({h,a,gh:m.gh,ga:m.ga,ev:(m.ev||[]).filter(e=>e.t==='g').map(e=>({c:e.c,p:e.p,m:e.m}))});}
  L.res[r]=res;out.push([code,res]);}
 return out;}
function weekTick(){// po kole: regenerace, zranění, trénink, finance, nabídky
 const tr=S.training;const intensity=tr.int||2;
 for(const id in S.players){const p=S.players[id];const mine=p.cl===S.clubId;
  const rec=mine?(26-intensity*4+(tr.focus==='fit'?4:0)):20;p.cond=clamp(p.cond+rec,0,100);
  if(p.inj>0){p.inj--;if(p.inj===0&&mine)addNews('🩹',`${p.n} je po zranění znovu k dispozici.`);}
  if(p.sus>0&&p.justSus!==S.round)p.sus--;
  // progres
  const age=ageOf(p);let g=0;
  if(age<=23)g=(p.pot-p.ovr)*0.006;else if(age<=28)g=(p.pot-p.ovr)*0.004;else if(age>=31)g=-(age-30)*0.012;
  if(mine){g*=0.7+intensity*0.25;if(tr.focus!=='bal'&&tr.focus!=='fit'&&tr.focus!=='tac')g*=1.05;
   if(mine&&intensity===3&&p.inj<=0&&RNG()<0.006){p.inj=rint(1,3);addNews('🤕',`${p.n} se zranil na tréninku a bude chybět ${p.inj} ${czPlural(p.inj,'týden','týdny','týdnů')}.`);}}
  p._xp=(p._xp||0)+g+(RNG()-0.5)*0.03;
  if(p._xp>=1){p._xp-=1;p.ovr=Math.min(99,p.ovr+1);bumpAttrs(p,1,mine?tr.focus:null);if(mine&&p.ovr%2===0)addNews('📈',`${p.n} se na tréninku zlepšil (celkem ${p.ovr}).`,1);}
  else if(p._xp<=-1){p._xp+=1;p.ovr=Math.max(30,p.ovr-1);bumpAttrs(p,-1,null);}
 }
 if(tr.focus==='tac')S.cohesion=clamp(S.cohesion+2.5,0,100);else S.cohesion=clamp(S.cohesion+0.8,0,100);
 // finance
 const me=myClub();const wages=clubPlayers(S.clubId).reduce((s,p)=>s+playerWage(p),0);
 money(-wages,'wages','Mzdy hráčů');money(me.tv,'tv','Televizní práva a sponzoring');
 for(const id in S.clubs){if(id===S.clubId)continue;const c=S.clubs[id];c.money+=c.tv-c.wageBase;}
 aiTransfers();genOffers();
 if(me.money<0&&!S._debtWarn){S._debtWarn=1;addNews('⚠️','Klub je v minusu. Vedení žádá prodej hráčů nebo snížení mezd.');S.boardTrust=clamp(S.boardTrust-4,0,100);}
 if(me.money>=0)S._debtWarn=0;}
function bumpAttrs(p,d,focus){const map={att:[1,3],def:[4,5],tech:[2,3],fit:[0,5]};const idx=focus&&map[focus]?map[focus]:[rint(0,5),rint(0,5)];
 for(const i of idx)p.a[i]=clamp(p.a[i]+d,20,99);if(RNG()<0.5){const j=rint(0,5);p.a[j]=clamp(p.a[j]+d,20,99);}}
function money(v,cat,label){const me=myClub();me.money+=v;if(v>=0)S.finSeason.inc+=v;else S.finSeason.exp-=v;if(S.finSeason[cat]!=null)S.finSeason[cat]+=Math.abs(v);
 S.fin.log.unshift({s:S.season,r:S.round,v:Math.round(v),t:label});if(S.fin.log.length>60)S.fin.log.length=60;}
function gateIncome(h){const c=S.clubs[h];const pos=tablePos(h);const n=S.leagues[c.lg].clubs.length;const fill=clamp(0.62+0.3*(1-(pos-1)/n)+(RNG()-0.5)*0.12,0.35,1);const att=Math.round(c.cap*fill);return {att,inc:att*c.ticket};}
function addNews(ic,t,minor){S.news.unshift({ic,t,s:S.season,r:S.round,m:minor?1:0});if(S.news.length>90)S.news.length=90;}
// ----- přestupy AI -----
function transferWindow(){const half=Math.floor(S.maxRound/2);return S.round<=3||(S.round>=half-1&&S.round<=half+1);}
function aiTransfers(){if(!transferWindow()||RNG()>0.5)return;const ids=Object.keys(S.clubs).filter(id=>id!==S.clubId);
 for(let k=0;k<2;k++){const buyer=pick(ids);const seller=pick(ids);if(buyer===seller)continue;const b=S.clubs[buyer],s=S.clubs[seller];
  const cand=clubPlayers(seller).filter(p=>p.ovr>=b.rep-2&&p.ovr<=b.rep+6&&available(p));if(!cand.length)continue;const p=pick(cand);const fee=playerValue(p);
  if(b.money<fee*1.1||clubPlayers(buyer).length>=32||clubPlayers(seller).length<=19)continue;
  b.money-=fee;s.money+=fee;movePlayer(p,buyer);
  if(lgOf(buyer)===myClub().lg||p.ovr>=72)addNews('🔁',`Přestup: ${p.n} (${s.n} → ${b.n}) za ${fmtMoney(fee)}.`,1);}}
function movePlayer(p,to){const from=S.clubs[p.cl];if(from)from.pl=from.pl.filter(x=>x!==p.id);p.cl=to;if(to&&S.clubs[to])S.clubs[to].pl.push(p.id);p.mor=clamp(p.mor+5,0,100);
 if(from&&from.id===S.clubId&&S.tac){S.tac.xi=S.tac.xi.map(x=>x===p.id?null:x);S.tac.bench=S.tac.bench.filter(x=>x!==p.id);}
 if(to===S.clubId&&S.tac){}}
function genOffers(){if(!transferWindow()||RNG()>0.35)return;const mine=clubPlayers(S.clubId).filter(p=>p.inj<=0);if(mine.length<=16)return;
 const p=wpick(mine,x=>Math.pow(x.ovr/60,6)*(ageOf(x)<27?1.5:1));const others=Object.keys(S.clubs).filter(id=>id!==S.clubId&&S.clubs[id].rep>=p.ovr-6);
 let buyerName,buyer=null;if(others.length&&RNG()<0.6){buyer=pick(others);buyerName=S.clubs[buyer].n;}else{buyerName=foreignClubName(p);}
 if(S.offers.some(o=>o.p===p.id))return;const fee=Math.round(playerValue(p)*rnd(0.85,1.35)/1e4)*1e4;
 S.offers.push({id:'o'+Date.now()+rint(0,999),p:p.id,buyer,bn:buyerName,fee,r:S.round});
 addNews('📨',`Nabídka za hráče ${p.n}: ${fmtMoney(fee)} (klub ${buyerName}).`);}
function foreignClubName(p){const pool=FM_CAT.leagues.filter(l=>l.cc!==S.cc&&l.tier===1);const l=wpick(pool,x=>x.top?1:0);return l?pick(l.top)+' ('+l.country+')':'Zahraniční klub';}
function acceptOffer(oid){const o=S.offers.find(x=>x.id===oid);if(!o)return;const p=P(o.p);S.offers=S.offers.filter(x=>x.id!==oid);if(!p||p.cl!==S.clubId)return;
 money(o.fee,'tr_in','Prodej: '+p.n);if(o.buyer&&S.clubs[o.buyer]){S.clubs[o.buyer].money-=o.fee;movePlayer(p,o.buyer);}else{movePlayer(p,null);delete S.players[p.id];}
 addNews('✍️',`Prodej hotov: ${p.n} míří do klubu ${o.bn} za ${fmtMoney(o.fee)}.`);saveGame();}
function rejectOffer(oid){const o=S.offers.find(x=>x.id===oid);S.offers=S.offers.filter(x=>x.id!==oid);if(o){const p=P(o.p);if(p&&RNG()<0.35){p.mor=clamp(p.mor-8,0,100);addNews('😒',`${p.n} je zklamaný, že jsi odmítl nabídku klubu ${o.bn}.`,1);}}saveGame();}

// ===================== KONEC SEZÓNY =====================
const seasonLabel=s=>s+'/'+String((s+1)%100).padStart(2,'0');
function seasonOver(){return S.round>=S.maxRound;}
function endSeason(){const me=myClub();const code=me.lg;const L=S.leagues[code];const li=leagueInfo(code);const tab=sortedTable(code);const pos=tab.indexOf(S.clubId)+1;const n=tab.length;const row=L.table[S.clubId];
 const rep={season:S.season,lg:code,pos,n,pts:row.pts,w:row.w,d:row.d,l:row.l,gf:row.gf,ga:row.ga,exp:me.expect,moves:[],retired:[],youth:[],prize:0,trust0:S.boardTrust};
 // mistři
 for(const c in S.leagues){const t=sortedTable(c);const champ=S.clubs[t[0]];addNews('🏆',`${champ.n} vyhrál soutěž ${leagueLabel(c)} v sezóně ${seasonLabel(S.season)}.`);}
 if(pos===1){S.trophies.push({s:S.season,t:'Vítěz soutěže '+leagueLabel(code)});}
 // prémie
 const prize=Math.round(me.tv*10*Math.pow(1-(pos-1)/n,1.4)/1e4)*1e4+Math.round(me.tv*2/1e4)*1e4;rep.prize=prize;money(prize,'prize','Prémie za umístění v lize');
 // hodnocení vedení
 let d=(me.expect-pos)*4;if(pos===1)d+=12;
 // postupy / sestupy
 const lgs=countryLeagues(S.cc);const TB={};lgs.forEach(l=>TB[l.code]=sortedTable(l.code));const NEW={};lgs.forEach(l=>NEW[l.code]=TB[l.code].slice());
 for(let i=0;i<lgs.length-1;i++){const up=lgs[i],lo=lgs[i+1];if(!up.down)continue;const tu=TB[up.code],tl=TB[lo.code];
  const down=tu.slice(-up.down);const ups=tl.filter(id=>!S.clubs[id].b).slice(0,up.down);
  down.forEach(id=>{S.clubs[id].lg=lo.code;rep.moves.push({id,from:up.code,to:lo.code,dir:-1});});
  ups.forEach(id=>{S.clubs[id].lg=up.code;rep.moves.push({id,from:lo.code,to:up.code,dir:1});});
  NEW[up.code]=NEW[up.code].filter(id=>!down.includes(id)).concat(ups);
  NEW[lo.code]=NEW[lo.code].filter(id=>!ups.includes(id)).concat(down);}
 lgs.forEach(l=>S.leagues[l.code].clubs=NEW[l.code]);
 const myMove=rep.moves.find(m=>m.id===S.clubId);rep.myMove=myMove?myMove.dir:0;
 if(myMove&&myMove.dir>0){d+=18;S.trophies.push({s:S.season,t:'Postup do soutěže '+leagueLabel(myMove.to)});}
 if(myMove&&myMove.dir<0)d-=22;
 S.boardTrust=clamp(Math.round(S.boardTrust+d),0,100);rep.trust=S.boardTrust;rep.fired=S.boardTrust<=5;
 rep.moves.forEach(m=>addNews(m.dir>0?'⬆️':'⬇️',`${S.clubs[m.id].n} ${m.dir>0?'postupuje do soutěže':'sestupuje do soutěže'} ${leagueLabel(m.to)}.`,m.id!==S.clubId?1:0));
 // statistiky sezóny do historie hráčů
 const top=topScorers(code,1)[0];rep.topScorer=top?{n:top.p.n,g:top.g,club:S.clubs[top.p.cl]?S.clubs[top.p.cl].n:''}:null;
 // stárnutí, konce kariér, mládež
 S.season++;
 for(const id of Object.keys(S.players)){const p=S.players[id];const a=ageOf(p);
  if(a>=34){const pr=a>=39?1:(a-33)*0.22;if(RNG()<pr){if(p.cl===S.clubId)rep.retired.push(p.n);if(p.cl&&S.clubs[p.cl])S.clubs[p.cl].pl=S.clubs[p.cl].pl.filter(x=>x!==id);delete S.players[id];continue;}}
  // letní vývoj
  if(a<=21)p.ovr=Math.min(p.pot,p.ovr+rint(0,3));else if(a<=24)p.ovr=Math.min(p.pot,p.ovr+rint(0,2));else if(a>=32)p.ovr=Math.max(35,p.ovr-rint(0,2)-(a>=34?1:0));
  if(a>=30&&p.pot>p.ovr)p.pot=p.ovr;p.cond=100;p.inj=Math.max(0,p.inj-2);p.sus=0;p.mor=clamp(p.mor*0.6+28,30,90);}
 if(S.tac){S.tac.xi=S.tac.xi.map(x=>S.players[x]?x:null);S.tac.bench=S.tac.bench.filter(x=>S.players[x]);}
 for(const cid in S.clubs){const c=S.clubs[cid];const mine=cid===S.clubId;const need=mine?3:clamp(23-c.pl.length,1,4);
  for(let k=0;k<need;k++){const y=youthPlayer(cid);if(mine)rep.youth.push(y.n);}}
 // nové finance pro změnu soutěže
 for(const m of rep.moves){const c=S.clubs[m.id];const avg=S.leagues[c.lg].clubs.reduce((s,id)=>s+S.clubs[id].wageBase,0)/S.leagues[c.lg].clubs.length;c.tv=Math.round((c.wageBase*0.45+avg*0.6)/100)*100;}
 S.offers=[];S.history.unshift(rep);if(S.history.length>30)S.history.length=30;
 startSeason();
 if(S.tac){const ok=S.tac.xi.filter(Boolean).length;if(ok<11){const l=autoLineup(S.clubId,S.tac.form);S.tac.xi=l.xi;S.tac.bench=l.bench;}}
 addNews('📅',`Začíná sezóna ${seasonLabel(S.season)}. Vedení očekává: ${expectText(myClub().expect)}.`);
 S.lastSeasonRep=rep;saveGame();return rep;}
function youthPlayer(cid){const c=S.clubs[cid];const names=FM_CAT.names[S.cc]||FM_CAT.names['GB-ENG'];const nm=pick(names[0])+' '+pick(names[1]);
 const posL=['GK','CB','CB','LB','RB','DM','CM','CM','AM','LM','RM','LW','RW','ST','ST'];const pos=pick(posL);const age=rint(16,18);
 const base=clamp((c.rep||60)-rint(12,20),38,70);const ovr=clamp(Math.round(base+gauss()*3),36,72);const pot=clamp(Math.round(ovr+rint(8,26)+(cid===S.clubId&&RNG()<0.2?6:0)),ovr,94);
 const prof={GK:[0,-30,-10,-25,-30,-5],CB:[-8,-25,-12,-18,6,4],LB:[4,-20,-6,-6,0,-4],RB:[4,-20,-6,-6,0,-4],DM:[-8,-12,0,-6,2,4],CM:[-5,-6,3,1,-8,0],AM:[0,-1,4,5,-28,-8],LM:[5,-5,0,3,-22,-8],RM:[5,-5,0,3,-22,-8],LW:[7,-2,-3,4,-32,-10],RW:[7,-2,-3,4,-32,-10],ST:[3,5,-10,0,-38,2]}[pos];
 const a=prof.map(x=>clamp(Math.round(ovr+x+gauss()*4),20,99));
 const p=mkPlayer([nm,pos,S.season-age,ovr,pot,S.cc,a,1],cid);p.yth=1;c.pl.push(p.id);return p;}
function topScorers(code,n){const ids=new Set(S.leagues[code].clubs);const arr=[];for(const id in S.players){const p=S.players[id];if(p.cl&&ids.has(p.cl)&&p.st.g>0)arr.push({p,g:p.st.g,as:p.st.as});}
 return arr.sort((a,b)=>b.g-a.g||b.as-a.as).slice(0,n||15);}

// ===================== ŽIVÝ ZÁPAS – engine =====================
function sideSetup(cid,isUser){const c=S.clubs[cid];let form,xi,bench,tac;
 if(isUser){tac=Object.assign({},S.tac);form=tac.form;xi=tac.xi.slice();bench=tac.bench.slice();
  // doplň chybějící (zranění, tresty)
  const used=new Set();xi=xi.map(id=>{const p=P(id);if(p&&available(p)&&p.cl===cid&&!used.has(id)){used.add(id);return id;}return null;});
  if(xi.some(x=>!x)){const pool=clubPlayers(cid).filter(p=>available(p)&&!used.has(p.id));FORMS[form].forEach((s,i)=>{if(xi[i])return;let best=null,bv=-1;pool.forEach(p=>{if(used.has(p.id))return;const v=p.ovr*posFit(p.pos,s[0]);if(v>bv){bv=v;best=p;}});if(best){xi[i]=best.id;used.add(best.id);}});}
  bench=bench.filter(id=>{const p=P(id);return p&&available(p)&&p.cl===cid&&!used.has(id);});
  if(bench.length<7){clubPlayers(cid).filter(p=>available(p)&&!used.has(p.id)&&!bench.includes(p.id)).sort((a,b)=>b.ovr-a.ovr).forEach(p=>{if(bench.length<9)bench.push(p.id);});}
 }else{form=c.form||bestForm(cid);const l=autoLineup(cid,form);xi=l.xi;bench=l.bench;tac={ment:'bal',press:'mid',style:pick(['short','direct','counter'])};}
 const ov=xi.map(P).filter(Boolean);return {cid,form,xi,slots:FORMS[form].map(s=>s[0]),bench,tac,subs:0,maxSubs:5,user:isUser,red:0,avgOvr:ov.length?ov.reduce((s,p)=>s+p.ovr,0)/ov.length:60};}
function createMatch(h,a){const M={h:sideSetup(h,h===S.clubId),a:sideSetup(a,a===S.clubId),min:0,half:1,score:[0,0],ev:[],stats:[mkSt(),mkSt()],rt:{},played:{},cond:{},ended:false,added:[rint(1,3),rint(2,6)],poss:[50,50],ht:false};
 M.sides=[M.h,M.a];
 [M.h,M.a].forEach(sd=>{sd.xi.forEach(id=>{if(id){M.rt[id]=6.0;M.played[id]={from:0,to:null};}});});
 const g=gateIncome(h);M.att=g.att;M.gate=g.inc;recalc(M);
 M.ev.push({m:0,t:'ko',tx:`Rozhodčí zahájil utkání. ${S.clubs[h].n} – ${S.clubs[a].n}, v hledišti ${fmtNum(M.att)} diváků.`});
 return M;}
function mkSt(){return {sh:0,sot:0,cor:0,fou:0,yc:0,rc:0,off:0,xg:0,pos:0,sav:0};}
function recalc(M){M.str=[M.h,M.a].map(sd=>{const s=lineStrength(sd.xi,sd.form,sd.tac);if(sd.user){const coh=(S.cohesion-50)/50*1.2;s.att+=coh;s.def+=coh;s.mid+=coh;}return s;});
 const [xh,xa]=xgPair(M.str[0],M.str[1]);M.xg=[xh,xa];const mh=M.str[0].mid+2,ma=M.str[1].mid;M.possBase=clamp(50+(mh-ma)*1.6+(M.h.tac.style==='short'?3:0)-(M.a.tac.style==='short'?3:0)-(M.h.tac.style==='counter'?4:0)+(M.a.tac.style==='counter'?4:0),25,75);}
function onPitch(sd){return sd.xi.filter(Boolean);}
function nm(id){const p=P(id);return p?pSurname(p):'?';}
const T_GOAL=['{S} prošel až do vápna a zakončil přesně k tyči.','{S} napálil míč z hranice vápna přímo pod břevno.','{S} si naběhl za obranu a v klidu zakončil.','Dorážka! {S} byl na správném místě a míč zamířil do sítě.','{S} hlavičkou po centru nedal brankáři šanci.','{S} obhodil brankáře a poslal míč do prázdné branky.','{S} vystřelil k tyči a brankář se jen natáhl.','{S} zakončil z první a míč zapadl k tyči.'];
const T_GOAL_HEAD=['{S} hlavičkou po rohovém kopu skóroval.','{S} vyskočil nejvýš ze všech a hlavou skóroval.'];
const T_SAVE=['{S} šel sám na brankáře, ale {K} skvěle zasáhl.','{K} vytáhl střelu, kterou vyslal {S}, na roh.','{S} vystřelil z dálky, {K} si s tím poradil.','{K} chytil jedovatou střelu, kterou poslal {S}.','{S} zakončoval z úhlu, {K} byl na místě.'];
const T_MISS=['{S} pálil z dálky, ale těsně vedle.','{S} hlavičkoval nad břevno.','{S} to zkusil z přímého kopu, míč letěl nad.','Velká šance! {S} ale z malého vápna přestřelil.','{S} se uvolnil, ale trefil jen boční síť.'];
const T_POST=['{S} trefil tyč! Domácí fanoušci se chytají za hlavu.','Břevno! {S} měl gól na kopačce.'];
const T_BLOCK=['Obránce zablokoval střelu, kterou vyslal {S}.','{S} vystřelil, ale míč skončil v hradbě obránců.'];
const T_FILL=['Hra se přelévá ve středu pole.','{T} drží míč a trpělivě hledají cestu dopředu.','{T} vysoko napadají rozehrávku soupeře.','Rozhodčí přerušil hru kvůli faulu ve středu hřiště.','{T} se tlačí dopředu, ale obrana soupeře drží.','Tempo zápasu na chvíli opadlo.','{T} zkoušejí hrát po křídlech.'];
function fillT(t,o){return t.replace('{S}',o.S||'').replace('{K}',o.K||'').replace('{A}',o.A||'').replace('{T}',o.T||'');}
function sideName(i){return i===0?'Domácí':'Hosté';}
function gkOf(sd){const i=sd.slots.indexOf('GK');return i>=0?sd.xi[i]:null;}
function stepMinute(M){if(M.ended)return [];const out=[];M.min++;const m=M.min;
 const half=M.half;const limit=half===1?45+M.added[0]:90+M.added[1];
 if(m%5===0)recalc(M);
 // držení míče
 const pv=clamp(M.possBase+gauss()*6,15,85);M.stats[0].pos+=pv;M.stats[1].pos+=100-pv;
 // únava
 [M.h,M.a].forEach(sd=>{const drain=sd.tac.press==='high'?0.3:sd.tac.press==='low'?0.18:0.24;onPitch(sd).forEach(id=>{const p=P(id);if(p)p.cond=Math.max(5,p.cond-drain*(1.15-p.a[5]/250));});});
 for(let i=0;i<2;i++){const sd=M.sides[i],op=M.sides[1-i];const rate=M.xg[i]/90/0.225*(m>80&&M.score[i]<M.score[1-i]?1.25:1)*(sd.red?0.75:1)*(op.red?1.3:1);
  if(RNG()<rate){out.push(...chance(M,i));}
  else if(RNG()<0.055){const p=pick(onPitch(sd));out.push({m,t:'cor',s:i,tx:`${sideName(i)} mají rohový kop.`});M.stats[i].cor++;if(RNG()<0.12)out.push(...chance(M,i,'head'));}
  if(RNG()<0.12){M.stats[i].fou++;if(RNG()<0.16)out.push(...card(M,i));}
  if(RNG()<0.02){const p=pick(onPitch(sd).filter(id=>GRP(P(id).pos)==='F'))||pick(onPitch(sd));M.stats[i].off++;if(RNG()<0.4)out.push({m,t:'off',s:i,tx:`${nm(p)} byl v ofsajdu.`});}
  if(RNG()<0.0028*(sd.tac.press==='high'?1.3:1)){const id=pick(onPitch(sd).filter(x=>GRP(P(x).pos)!=='G'));if(id){const p=P(id);p._minj=rint(1,5)+(RNG()<0.15?rint(3,8):0);out.push({m,t:'inj',s:i,p:id,tx:`🚑 ${nm(id)} zůstal ležet na trávníku a nemůže pokračovat.`});forceSub(M,i,id,out);}}}
 if(!out.length&&RNG()<0.09){const i=RNG()<M.possBase/100?0:1;out.push({m,t:'fill',s:i,tx:fillT(pick(T_FILL),{T:sideName(i)})});}
 // AI střídání
 for(let i=0;i<2;i++){const sd=M.sides[i];if(sd.user&&!M.autoUser)continue;if(m>=58&&sd.subs<sd.maxSubs&&RNG()<0.09){aiSub(M,i,out);}}
 if(m>=limit){if(half===1){M.half=2;M.min=45;M.ht=true;out.push({m:45,t:'ht',tx:`Poločas. ${S.clubs[M.h.cid].s} ${M.score[0]}:${M.score[1]} ${S.clubs[M.a.cid].s}`});[M.h,M.a].forEach(sd=>onPitch(sd).forEach(id=>{const p=P(id);if(p)p.cond=Math.min(100,p.cond+4);}));}
  else{M.ended=true;finishMatch(M);out.push({m:90,t:'ft',tx:`Konec zápasu! ${S.clubs[M.h.cid].n} ${M.score[0]}:${M.score[1]} ${S.clubs[M.a.cid].n}`});}}
 out.forEach(e=>M.ev.push(e));return out;}
function shooterOf(sd,kind){const ids=onPitch(sd).filter(id=>GRP(P(id).pos)!=='G');return wpick(ids.map(P),p=>{const g=GRP(p.pos);let w=(g==='F'?6:g==='M'?(p.pos==='AM'?3.6:1.7):0.55)*Math.pow(Math.max(20,p.a[1])/60,3);if(kind==='head')w=(g==='D'?3:g==='F'?3:1)*Math.pow(Math.max(20,p.a[5])/60,3);return w;});}
function chance(M,i,kind){const sd=M.sides[i],op=M.sides[1-i];const m=M.min;const out=[];const sh=shooterOf(sd,kind);if(!sh)return out;const gk=P(gkOf(op));
 let q;const pen=!kind&&RNG()<0.035;if(pen)q=0.76;else{q=clamp(0.02+Math.pow(RNG(),2.4)*0.52,0.02,0.6);if(kind==='head')q*=0.8;}
 const shotQ=(sh.a[1]+(pen?sh.a[1]:sh.ovr))/2;const gkQ=gk?gk.ovr*(0.85+0.15*gk.cond/100):45;
 let pg=q*clamp(1+(shotQ-gkQ-8)/160,0.8,1.2);M.stats[i].sh++;M.stats[i].xg+=q;
 const S1=pSurname(sh),K=gk?pSurname(gk):'brankář';
 if(pen)out.push({m,t:'pen',s:i,tx:`Penalta! ${sideName(i)} kopou pokutový kop, k míči se staví ${S1}.`});
 const r=RNG();
 if(r<pg){M.stats[i].sot++;M.score[i]++;const as=pen?null:(RNG()<0.74?pickAssistM(sd,sh.id,kind):null);
  M.rt[sh.id]=(M.rt[sh.id]||6)+1.05;if(as)M.rt[as.id]=(M.rt[as.id]||6)+0.6;onPitch(op).forEach(id=>{const g=GRP(P(id).pos);if(g==='D'||g==='G')M.rt[id]=(M.rt[id]||6)-0.22;});
  const t=pen?`${S1} poslal brankáře na opačnou stranu.`:fillT(pick(kind==='head'?T_GOAL_HEAD:T_GOAL),{S:S1});
  out.push({m,t:'goal',s:i,p:sh.id,as:as&&as.id,pen,tx:`⚽ GÓL! ${t}${as?' Asistence: '+pSurname(as)+'.':''}`,sc:M.score.slice()});}
 else{const r2=RNG();if(r2<0.42){M.stats[i].sot++;M.stats[1-i].sav++;if(gk)M.rt[gk.id]=(M.rt[gk.id]||6)+0.22;out.push({m,t:'save',s:i,p:sh.id,tx:pen?`${K} penaltu chytil! ${S1} neproměnil.`:fillT(pick(T_SAVE),{S:S1,K})});}
  else if(r2<0.47){out.push({m,t:'post',s:i,p:sh.id,tx:fillT(pick(T_POST),{S:S1}).replace('Domácí fanoušci',i===0?'Domácí fanoušci':'Hostující fanoušci')});}
  else if(r2<0.66&&!pen){out.push({m,t:'block',s:i,p:sh.id,tx:fillT(pick(T_BLOCK),{S:S1})});}
  else{if(q>0.3)M.rt[sh.id]=(M.rt[sh.id]||6)-0.15;out.push({m,t:'miss',s:i,p:sh.id,tx:pen?`${S1} penaltu přestřelil!`:fillT(pick(T_MISS),{S:S1})});}}
 return out;}
function pickAssistM(sd,ex,kind){const ids=onPitch(sd).filter(id=>id!==ex);return wpick(ids.map(P),p=>{const g=GRP(p.pos);return (g==='F'?2.4:g==='M'?3.2:g==='D'?(kind==='head'?0.6:1.1):0.05)*Math.pow(Math.max(20,p.a[2])/60,2)*(['LM','RM','LW','RW','LB','RB'].includes(p.pos)&&kind==='head'?2:1);});}
function card(M,i){const sd=M.sides[i];const m=M.min;const ids=onPitch(sd).filter(id=>P(id).pos!=='GK');const id=wpick(ids,x=>GRP(P(x).pos)==='D'?2:GRP(P(x).pos)==='M'?1.5:0.8);if(!id)return [];
 const out=[];M.yc=M.yc||{};const direct=RNG()<0.04;
 if(direct||M.yc[id]){M.stats[i].rc++;M.rt[id]=(M.rt[id]||6)-1.5;out.push({m,t:'red',s:i,p:id,tx:direct?`🟥 Červená karta! ${nm(id)} zastavil soupeře v brejku a jde předčasně do kabin.`:`🟥 Druhá žlutá a červená! ${nm(id)} musí opustit hřiště.`});P(id)._mred=direct?rint(1,3):1;removeFromPitch(M,i,id);sd.red++;}
 else{M.yc[id]=1;M.stats[i].yc++;M.rt[id]=(M.rt[id]||6)-0.3;out.push({m,t:'yel',s:i,p:id,tx:`🟨 Žlutá karta: ${nm(id)} ${pick(['za zákrok zezadu.','za taktický faul.','za protesty proti rozhodnutí sudího.','za podražení v protiútoku.','za zdržování hry.'])}`});P(id)._myc=(P(id)._myc||0)+1;}
 return out;}
function removeFromPitch(M,i,id){const sd=M.sides[i];const k=sd.xi.indexOf(id);if(k>=0)sd.xi[k]=null;if(M.played[id])M.played[id].to=M.min;recalc(M);}
function doSub(M,i,outId,inId,silent){const sd=M.sides[i];if(sd.subs>=sd.maxSubs)return null;const k=sd.xi.indexOf(outId);if(k<0)return null;const bi=sd.bench.indexOf(inId);if(bi<0)return null;
 sd.xi[k]=inId;sd.bench.splice(bi,1);sd.subs++;if(M.played[outId])M.played[outId].to=M.min;M.played[inId]={from:M.min,to:null};M.rt[inId]=6.0;sd.out=(sd.out||[]).concat(outId);recalc(M);
 const e={m:M.min,t:'sub',s:i,tx:`🔄 Střídání – ${sideName(i).toLowerCase()}: přichází ${nm(inId)}, odchází ${nm(outId)}.`};if(!silent)M.ev.push(e);return e;}
function bestBenchFor(sd,slot){let best=null,bv=-1;sd.bench.forEach(id=>{const p=P(id);if(!p)return;const v=p.ovr*posFit(p.pos,slot);if(v>bv){bv=v;best=id;}});return best;}
function forceSub(M,i,id,out){const sd=M.sides[i];const k=sd.xi.indexOf(id);if(k<0)return;if(M.played[id])M.played[id].to=M.min;
 if(sd.user&&!M.autoUser){sd.xi[k]=null;M.needSub={i,slot:k};recalc(M);return;}
 const inId=bestBenchFor(sd,sd.slots[k]);if(inId&&sd.subs<sd.maxSubs){sd.xi[k]=id;const e=doSub(M,i,id,inId,true);if(e)out.push(e);}else{sd.xi[k]=null;recalc(M);}}
function aiSub(M,i,out){const sd=M.sides[i];const cands=onPitch(sd).map(P).filter(p=>p.pos!=='GK').sort((a,b)=>a.cond-b.cond||((M.rt[a.id]||6)-(M.rt[b.id]||6)));const o=cands[0];if(!o||o.cond>68&&(M.rt[o.id]||6)>5.8)return;
 const k=sd.xi.indexOf(o.id);const inId=bestBenchFor(sd,sd.slots[k]);if(!inId)return;const e=doSub(M,i,o.id,inId,true);if(e)out.push(e);}
function simToEnd(M){M.autoUser=true;let guard=0;while(!M.ended&&guard++<200)stepMinute(M);}
function finishMatch(M){const res=[M.score[0],M.score[1]];
 for(let i=0;i<2;i++){const sd=M.sides[i];const conc=res[1-i];const win=res[i]>res[1-i],draw=res[i]===res[1-i];
  for(const id in M.played){const p=P(id);if(!p||p.cl!==sd.cid)continue;const pl=M.played[id];const mins=(pl.to==null?90:pl.to)-pl.from;let r=M.rt[id]||6;
   const g=GRP(p.pos);if(conc===0&&(g==='D'||g==='G')&&mins>=60){r+=0.5;p.st.cs+=g==='G'?1:0;}r+=win?0.3:draw?0:-0.25;r=clamp(r+gauss()*0.25,3,10);M.rt[id]=Math.round(r*10)/10;
   p.st.ap++;p.car.ap++;p.st.min+=mins;p.st.rt+=M.rt[id];p.form.push(M.rt[id]);if(p.form.length>5)p.form.shift();
   if(p._myc){p.yc+=p._myc;p.st.yc+=p._myc;if(p.yc>=5){p.sus=1;p.justSus=S.round;p.yc=0;if(sd.user)addNews('⛔',`${p.n} dostal pátou žlutou kartu a jeden zápas nebude hrát.`);}delete p._myc;}
   if(p._mred){p.sus=p._mred;p.justSus=S.round;p.st.rc++;if(sd.user)addNews('🟥',`${p.n} byl vyloučen a ${p.sus===1?'jeden zápas':p.sus+' zápasy'} nebude hrát.`);delete p._mred;}
   if(p._minj){p.inj=p._minj;if(sd.user)addNews('🚑',`${p.n} se zranil a bude chybět ${p.inj} ${czPlural(p.inj,'týden','týdny','týdnů')}.`);delete p._minj;}
   if(sd.user)p.mor=clamp(p.mor+(win?6:draw?1:-6),5,100);}
  if(sd.user){clubPlayers(sd.cid).forEach(p=>{if(!M.played[p.id]&&p.ovr>=sd.avgOvr)p.mor=clamp(p.mor-1.5,5,100);});}}
 M.ev.filter(e=>e.t==='goal').forEach(e=>{const p=P(e.p);if(p){p.st.g++;p.car.g++;}if(e.as){const a=P(e.as);if(a)a.st.as++;}});
 const tot=M.stats[0].pos+M.stats[1].pos||1;M.poss=[Math.round(M.stats[0].pos/tot*100),0];M.poss[1]=100-M.poss[0];
 M.result={h:M.h.cid,a:M.a.cid,gh:res[0],ga:res[1],ev:M.ev.filter(e=>e.t==='goal').map(e=>({t:'g',c:M.sides[e.s].cid,p:e.p,m:e.m}))};}
function motm(M){let best=null,bv=-1;for(const id in M.played){const v=M.rt[id]||0;if(v>bv){bv=v;best=id;}}return best;}

// ===================== UI – společné =====================
const UI={tab:'home',sqSort:'pos',lgView:'table',lgCode:null,lgRound:null,mk:{code:'*',pos:'all',max:0,age:0,sort:'ovr'},start:{step:0},sel:null,newsAll:false};
function badge(c,cls){if(!c)return '';const [c1,c2]=c.c||['#555','#fff'];const fg=lum(c1)>0.6?'#111':'#fff';return `<span class="badge ${cls||''}" style="background:linear-gradient(135deg,${c1} 0 58%,${c2} 58% 100%);color:${fg}">${esc(c.s)}</span>`;}
function lum(hex){const h=hex.replace('#','');const r=parseInt(h.slice(0,2),16)/255,g=parseInt(h.slice(2,4),16)/255,b=parseInt(h.slice(4,6),16)/255;return 0.299*r+0.587*g+0.114*b;}
function ovrCls(o){return o>=80?'o1':o>=70?'o2':o>=60?'o3':'o4';}
function ovrB(o){return `<span class="ovr ${ovrCls(o)}">${Math.round(o)}</span>`;}
function posB(p){return `<span class="pos" style="background:${GRP_COL[GRP(p)]}">${POS_CZ[p]}</span>`;}
function condBar(v){return `<div class="bar cond"><i style="width:${clamp(Math.round(v),0,100)}%"></i></div>`;}
function formB(arr){return `<span class="frm">${(arr||[]).map(x=>`<i class="${x}">${x}</i>`).join('')}</span>`;}
function toast(t){const d=document.createElement('div');d.className='toast';d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),2700);}
function modal(html,opts){closeModal();const bg=document.createElement('div');bg.className='modal-bg';bg.id='mbg';bg.innerHTML=`<div class="modal" role="dialog">${opts&&opts.noClose?'':'<button class="mclose" aria-label="Zavřít" onclick="closeModal()">✕</button>'}${html}</div>`;
 if(!(opts&&opts.noClose))bg.addEventListener('click',e=>{if(e.target===bg)closeModal();});document.body.appendChild(bg);syncAppViewport();return bg;}
function closeModal(){const m=document.getElementById('mbg');if(m)m.remove();}
function confirmBox(title,text,okLabel,fn,cls){modal(`<h2>${title}</h2><div class="small mut" style="margin-bottom:14px">${text}</div><div class="grid2"><button class="btn ghost" onclick="closeModal()">Zrušit</button><button class="btn ${cls||'red'}" id="cfok">${okLabel}</button></div>`);$('#cfok').onclick=()=>{closeModal();fn();};}
function syncAppViewport(){try{const vv=window.visualViewport;const h=Math.max(1,Math.round((vv&&vv.height)?vv.height:window.innerHeight));const top=Math.max(0,Math.round((vv&&vv.offsetTop)?vv.offsetTop:0));const r=document.documentElement;r.style.setProperty('--app-vh',h+'px');r.style.setProperty('--app-vtop',top+'px');}catch(e){}}
function watchAppViewport(){if(window.__vvw)return;window.__vvw=1;syncAppViewport();const fn=()=>syncAppViewport();window.addEventListener('resize',fn);window.addEventListener('orientationchange',()=>setTimeout(fn,250));if(window.visualViewport){window.visualViewport.addEventListener('resize',fn);window.visualViewport.addEventListener('scroll',fn);}}
function roundLabel(){return S.round>=S.maxRound?'Konec sezóny':(S.round+1)+'. kolo z '+S.maxRound;}
// ---------- zvuk (bezpečně pro Safari) ----------
let _ac=null;function getAC(){if(_ac)return _ac;try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;_ac=new A();}catch(e){_ac=null;}return _ac;}
function beep(f,d,v){if(!S||!S.settings||!S.settings.sound)return;try{const ac=getAC();if(!ac)return;if(ac.state==='suspended'&&ac.resume)ac.resume().catch(()=>{});const o=ac.createOscillator(),g=ac.createGain();o.frequency.value=f;g.gain.value=v||0.05;o.connect(g);g.connect(ac.destination);const t=ac.currentTime;g.gain.setValueAtTime(v||0.05,t);g.gain.exponentialRampToValueAtTime(0.0001,t+(d||0.2));o.start(t);o.stop(t+(d||0.2)+0.02);}catch(e){}}
function goalSound(){beep(660,0.15,0.06);setTimeout(()=>beep(880,0.25,0.06),140);}
function whistle(){beep(2400,0.35,0.03);}
// ---------- hlavní render ----------
function render(){watchAppViewport();const app=$('#app');if(!app)return;
 if(!S){app.innerHTML=renderStart();bindStart();return;}
 const me=myClub();const nOff=S.offers.length;
 const tabs=[['home','🏟️','Přehled'],['squad','👥','Kádr'],['tac','📋','Taktika'],['league','🏆','Soutěž'],['market','💼','Přestupy'],['club','🏦','Klub']];
 app.innerHTML=`<div class="top">${badge(me,'')}<div class="wk">${esc(me.n)}<small>${esc(leagueLabel(me.lg))} · ${seasonLabel(S.season)} · ${roundLabel()}</small></div><div class="sp"></div><span class="pill ${me.money<0?'bad':'gold'}">${fmtMoney(me.money)}</span></div>
 <div class="view" id="view">${renderTab()}</div>
 <div class="nav">${tabs.map(t=>`<button class="${UI.tab===t[0]?'on':''}" onclick="go('${t[0]}')"><span class="i">${t[1]}</span>${t[2]}${t[0]==='market'&&nOff?'<span class="dot"></span>':''}</button>`).join('')}</div>`;
 afterRender();}
function go(t){UI.tab=t;UI.sel=null;render();window.scrollTo(0,0);}
function renderTab(){switch(UI.tab){case 'squad':return renderSquad();case 'tac':return renderTactics();case 'league':return renderLeague();case 'market':return renderMarket();case 'club':return renderClub();default:return renderHome();}}
function afterRender(){if(UI.tab==='market')marketLoadResults();}
// ===================== START =====================
const REGIONS=[['Evropa',['CZ','SK','GB-ENG','ES','DE','IT','FR','NL','PT','BE','TR','GB-SCT','AT','CH','PL','DK','SE','NO','IE','RO','GR','HR','HU','RS','UA']],['Jižní Amerika',['BR','AR']],['Asie a Austrálie',['JP','KR','SA','CN','AU']]];
function renderStart(){const st=UI.start;
 if(st.step===0)return `<div class="view" style="padding-top:calc(30px + env(safe-area-inset-top,0px))"><div class="c" style="margin-bottom:18px"><div style="font-size:64px">⚽</div><h1 style="margin:6px 0 2px;font-size:28px;letter-spacing:.04em">FOTBAL MANAŽER</h1><div class="mut small">Skutečné kluby a hráči · ${FM_CAT.leagues.length} soutěží · ${Object.keys(FM_CAT.countries).length} zemí</div></div>
  <div class="card"><h3>Nová kariéra</h3><label class="small mut">Jméno trenéra</label><input id="mgr" maxlength="30" placeholder="Např. Robert Zechovský" value="${esc(st.name||'')}"><div style="height:12px"></div><button class="btn big" id="st1">Vybrat zemi a klub</button></div>
  <div class="card small mut">Hra se ukládá automaticky do prohlížeče. Soupisky vycházejí ze skutečných kádrů pro sezónu 2026/27, hodnocení hráčů jsou orientační.</div></div>`;
 if(st.step===1)return `<div class="view" style="padding-top:calc(14px + env(safe-area-inset-top,0px))"><div class="row" style="margin-bottom:10px"><button class="btn ghost sm" onclick="UI.start.step=0;render()">‹ Zpět</button><b>Vyber zemi</b></div>
  ${REGIONS.map(([r,ccs])=>`<div class="card"><h3>${r}</h3>${ccs.filter(cc=>FM_CAT.countries[cc]).map(cc=>{const ls=countryLeagues(cc);return `<button class="lgpick" onclick="startPickCountry('${cc}')"><span class="f">${flag(cc)}</span><span class="t"><b>${esc(FM_CAT.countries[cc])}</b><small>${ls.map(l=>esc(l.name)).join(' · ')}</small></span><span class="mut">›</span></button>`;}).join('')}</div>`).join('')}</div>`;
 if(st.step===2){const ls=countryLeagues(st.cc);return `<div class="view" style="padding-top:calc(14px + env(safe-area-inset-top,0px))"><div class="row" style="margin-bottom:10px"><button class="btn ghost sm" onclick="UI.start.step=1;render()">‹ Zpět</button><b>${flag(st.cc)} ${esc(FM_CAT.countries[st.cc])}</b></div>
  <div class="card"><h3>Soutěž</h3><div class="seg">${ls.map(l=>`<button class="${st.lg===l.code?'on':''}" onclick="startPickLeague('${l.code}')">${esc(l.name)}</button>`).join('')}</div></div>
  <div id="clublist">${st.lg&&DATA[st.lg]?clubPickList(st.lg):'<div class="empty"><div class="sp2" style="margin:0 auto 10px"></div>Načítám kluby…</div>'}</div></div>`;}
 return '';}
function clubPickList(code){const d=DATA[code];const arr=d.clubs.map(c=>{const top=c.p.map(p=>p[3]).sort((a,b)=>b-a).slice(0,16);return {c,str:top.reduce((s,x)=>s+x,0)/top.length};}).sort((a,b)=>b.str-a.str);
 return `<div class="card"><h3>Vyber klub<span class="sp"></span><span class="tiny">${arr.length} klubů</span></h3>${arr.map((x,i)=>`<button class="lgpick" onclick="startConfirm('${code}',${d.clubs.indexOf(x.c)})">${badge(x.c)}<span class="t"><b>${esc(x.c.n)}</b><small>Síla kádru ${Math.round(x.str)} · ${i<2?'favorit soutěže':i<arr.length*0.35?'ambice na horní příčky':i<arr.length*0.7?'střed tabulky':'boj o záchranu'}${x.c.b?' · rezervní tým (nemůže postoupit)':''}</small></span><span>${ovrB(x.str)}</span></button>`).join('')}</div>`;}
function bindStart(){const b=$('#st1');if(b)b.onclick=()=>{const n=($('#mgr').value||'').trim();UI.start.name=n||'Trenér';UI.start.step=1;render();window.scrollTo(0,0);};}
function startPickCountry(cc){UI.start.cc=cc;UI.start.step=2;const ls=countryLeagues(cc);UI.start.lg=ls[0].code;render();window.scrollTo(0,0);startLoad(ls[0].code);}
function startPickLeague(code){UI.start.lg=code;render();startLoad(code);}
function startLoad(code){loadLeague(code).then(()=>{if(UI.start.lg===code&&!S){const el=$('#clublist');if(el)el.innerHTML=clubPickList(code);}}).catch(e=>{const el=$('#clublist');if(el)el.innerHTML=`<div class="empty bad">${esc(e.message)}</div><button class="btn w100" onclick="startLoad('${code}')">Zkusit znovu</button>`;});}
function startConfirm(code,ci){const c=DATA[code].clubs[ci];const ps=c.p.slice().sort((a,b)=>b[3]-a[3]).slice(0,5);
 modal(`<div class="hero" style="margin-bottom:10px">${badge(c,'lg')}<div><h2 style="margin:0">${esc(c.n)}</h2><div class="small mut">${esc(leagueLabel(code))} · ${flag(UI.start.cc)} ${esc(FM_CAT.countries[UI.start.cc])}</div></div></div>
 <div class="card"><h3>Opory kádru</h3>${ps.map(p=>`<div class="row small" style="padding:4px 0">${posB(p[1])}<span style="flex:1">${flag(p[5])} ${esc(p[0])}</span><span class="mut">${2026-p[2]} let</span>${ovrB(p[3])}</div>`).join('')}</div>
 <button class="btn big gold" id="cgo">Převzít klub</button>`);
 $('#cgo').onclick=async()=>{const b=$('#cgo');b.disabled=true;b.textContent='Připravuji sezónu…';try{await newGame({cc:UI.start.cc,clubName:c.n,manager:UI.start.name});closeModal();UI.tab='home';render();window.scrollTo(0,0);setTimeout(()=>welcomeModal(),200);}catch(e){console.error(e);b.disabled=false;b.textContent='Převzít klub';toast('⚠️ '+(e.message||'Chyba při načítání'));}};}
function welcomeModal(){const me=myClub();modal(`<div class="c"><div style="font-size:44px">🤝</div><h2>Vítej v klubu ${esc(me.n)}</h2></div><div class="small" style="line-height:1.5">Vedení od tebe v sezóně ${seasonLabel(S.season)} očekává: <b class="gold">${expectText(me.expect)}</b>.<br><br>Na rozpočet máš <b>${fmtMoney(me.money)}</b>. Sestavu a rozestavení nastavíš v záložce <b>Taktika</b>, posily najdeš v záložce <b>Přestupy</b>. Přestupové okno je otevřené na začátku sezóny a v její polovině.</div><div style="height:14px"></div><button class="btn big" onclick="closeModal()">Jdeme na to</button>`);}
// ===================== PŘEHLED =====================
function renderHome(){const me=myClub();let h='';
 if(seasonOver()){h+=`<div class="card c"><div style="font-size:40px">🏁</div><h2 style="margin:4px 0">Sezóna je u konce</h2><div class="small mut" style="margin-bottom:12px">Konečné umístění: <b>${tablePos(S.clubId)}. místo</b> v soutěži ${esc(leagueLabel(me.lg))}.</div><button class="btn big gold" onclick="uiEndSeason()">Vyhodnotit sezónu</button></div>`;}
 else{const f=myFixture();
  if(f){const home=f[0]===S.clubId;const opp=S.clubs[home?f[1]:f[0]];const ot=S.leagues[opp.lg].table[opp.id];
   h+=`<div class="card"><h3>${S.round+1}. kolo · ${home?'doma':'venku'}<span class="sp"></span>${transferWindow()?'<span class="tag g">přestupy otevřené</span>':''}</h3>
   <div class="vs"><div class="tm">${badge(S.clubs[f[0]],'lg')}<span>${esc(S.clubs[f[0]].n)}</span><small class="mut">${tablePos(f[0])}. místo</small></div><div class="mid">VS</div><div class="tm">${badge(S.clubs[f[1]],'lg')}<span>${esc(S.clubs[f[1]].n)}</span><small class="mut">${tablePos(f[1])}. místo</small></div></div>
   <div class="row small mut" style="justify-content:center;margin:8px 0 12px">Forma soupeře: ${formB(ot.form)||'—'}</div>
   ${lineupIssues()}
   <button class="btn big gold" onclick="preMatch()">⚽ Na zápas</button></div>`;}
  else h+=`<div class="card c"><h3>${S.round+1}. kolo</h3><div class="small mut" style="margin-bottom:10px">Tvůj tým má v tomto kole volno.</div><button class="btn big" onclick="advanceRound(null)">Odehrát kolo</button></div>`;}
 if(S.offers.length)h+=`<div class="card"><h3>📨 Nabídky za hráče</h3>${S.offers.map(offerRow).join('')}</div>`;
 const tab=sortedTable(me.lg);const pos=tab.indexOf(S.clubId);const from=clamp(pos-2,0,Math.max(0,tab.length-5));
 h+=`<div class="card"><h3>Tabulka<span class="sp"></span><button class="tiny cy" style="min-height:44px" onclick="UI.lgCode=myClub().lg;UI.lgView='table';go('league')">Celá tabulka ›</button></h3>${tableHtml(me.lg,tab.slice(from,from+5),from)}</div>`;
 h+=`<div class="grid2" style="margin-bottom:12px"><div class="tile"><div class="k">Důvěra vedení</div><div class="v ${S.boardTrust<30?'bad':S.boardTrust>65?'good':''}">${S.boardTrust} %</div><div class="bar" style="margin-top:5px"><i style="width:${S.boardTrust}%"></i></div></div><div class="tile"><div class="k">Cíl sezóny</div><div class="v" style="font-size:13.5px;white-space:normal">${expectText(me.expect)}</div></div></div>`;
 const nws=S.news.filter(n=>UI.newsAll||!n.m).slice(0,UI.newsAll?60:8);
 h+=`<div class="card"><h3>📰 Zprávy<span class="sp"></span><button class="tiny cy" style="min-height:44px" onclick="UI.newsAll=!UI.newsAll;render()">${UI.newsAll?'Jen důležité':'Všechny'}</button></h3>${nws.length?nws.map(n=>`<div class="news"><span>${n.ic}</span><div class="t">${esc(n.t)}<small>${seasonLabel(n.s)} · ${n.r+1>S.maxRound?'po sezóně':(n.r+1)+'. kolo'}</small></div></div>`).join(''):'<div class="empty">Zatím žádné zprávy.</div>'}</div>`;
 return h;}
function lineupIssues(){const bad=S.tac.xi.filter(id=>{const p=P(id);return !p||!available(p)||p.cl!==S.clubId;}).length;const tired=S.tac.xi.map(P).filter(p=>p&&p.cond<60).length;let t='';
 if(bad)t+=`<div class="small warn" style="margin-bottom:8px">⚠️ V základní sestavě ${bad===1?'je 1 nedostupný hráč':'jsou nedostupní hráči ('+bad+')'} – před zápasem ho nahradí náhradník.</div>`;
 if(tired)t+=`<div class="small mut" style="margin-bottom:8px">😮‍💨 Unavení hráči v sestavě: ${tired}.</div>`;return t;}
function offerRow(o){const p=P(o.p);if(!p)return '';return `<div class="pl-row" style="cursor:default">${posB(p.pos)}<div class="nm"><b>${esc(p.n)}</b><small>${esc(o.bn)} · hodnota ${fmtMoney(playerValue(p))}</small></div><div class="r"><div class="b gold small">${fmtMoney(o.fee)}</div><div class="row" style="gap:4px;margin-top:3px"><button class="btn ghost sm" onclick="rejectOffer('${o.id}');render()">Odmítnout</button><button class="btn sm" onclick="confirmBox('Prodat hráče?','${esc(p.n).replace(/'/g,'’')} odejde za ${fmtMoney(o.fee)}.','Prodat',()=>{acceptOffer('${o.id}');render();},'gold')">Prodat</button></div></div></div>`;}
function tableHtml(code,ids,offset){const L=S.leagues[code];const li=leagueInfo(code);const n=L.clubs.length;const lgs=countryLeagues(S.cc);const idx=lgs.findIndex(l=>l.code===code);const upN=idx>0?lgs[idx-1].down:0;const dnN=li.down||0;
 return `<table class="tbl"><tr><th>#</th><th class="l">Klub</th><th>Z</th><th>V</th><th>R</th><th>P</th><th>Skóre</th><th>B</th></tr>${ids.map((id,i)=>{const t=L.table[id];const pos=offset+i+1;const c=S.clubs[id];
  return `<tr class="${id===S.clubId?'me':''} ${pos<=upN?'up':''} ${pos>n-dnN?'dn':''}" onclick="clubSheet('${id}')"><td>${pos}</td><td class="nm"><span class="row" style="gap:6px">${badge(c,'sm')}<span style="overflow:hidden;text-overflow:ellipsis;max-width:118px">${esc(c.n)}</span></span></td><td>${t.p}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td><td>${t.gf}:${t.ga}</td><td class="b">${t.pts}</td></tr>`;}).join('')}</table>`;}
// ===================== KÁDR =====================
function statusIc(p){let s='';if(p.inj>0)s+=` <span title="zraněn">🚑${p.inj}</span>`;if(p.sus>0)s+=' ⛔';if(S.tac.xi.includes(p.id))s+=' <span class="tag g">ZS</span>';else if(S.tac.bench.includes(p.id))s+=' <span class="tag">LAV</span>';if(p.yth)s+=' <span class="tag y">odchovanec</span>';return s;}
function renderSquad(){const ps=clubPlayers(S.clubId);const so=UI.sqSort;const ord={G:0,D:1,M:2,F:3};
 const sorted=ps.slice().sort((a,b)=>so==='ovr'?b.ovr-a.ovr:so==='age'?ageOf(a)-ageOf(b):so==='cond'?a.cond-b.cond:so==='val'?playerValue(b)-playerValue(a):(ord[GRP(a.pos)]-ord[GRP(b.pos)])||POS.indexOf(a.pos)-POS.indexOf(b.pos)||b.ovr-a.ovr);
 const wages=ps.reduce((s,p)=>s+playerWage(p),0);const val=ps.reduce((s,p)=>s+playerValue(p),0);
 let h=`<div class="grid3" style="margin-bottom:12px"><div class="tile"><div class="k">Hráčů</div><div class="v">${ps.length}</div></div><div class="tile"><div class="k">Hodnota kádru</div><div class="v" style="font-size:14px">${fmtMoney(val)}</div></div><div class="tile"><div class="k">Mzdy / týden</div><div class="v" style="font-size:14px">${fmtMoney(wages)}</div></div></div>
 <div class="chips" style="margin-bottom:10px">${[['pos','Pozice'],['ovr','Hodnocení'],['age','Věk'],['cond','Kondice'],['val','Hodnota']].map(([k,l])=>`<button class="chip ${so===k?'on':''}" onclick="UI.sqSort='${k}';render()">${l}</button>`).join('')}</div><div class="card" style="padding:6px 10px">`;
 let lastG=null;
 sorted.forEach(p=>{if(so==='pos'&&GRP(p.pos)!==lastG){lastG=GRP(p.pos);h+=`<div class="tiny mut b" style="padding:8px 4px 2px;letter-spacing:.08em;text-transform:uppercase">${GRP_CZ[lastG]}</div>`;}
  h+=`<div class="pl-row" onclick="playerSheet('${p.id}')">${posB(p.pos)}<div class="nm"><b>${flag(p.nat)} ${esc(p.n)}</b><small>${ageOf(p)} let · ${fmtMoney(playerValue(p))}${statusIc(p)}</small></div><div class="cb">${condBar(p.cond)}<div class="tiny mut c">${Math.round(p.cond)} %</div></div>${ovrB(p.ovr)}</div>`;});
 return h+'</div>';}
function potLabel(p){const d=p.pot-p.ovr;const a=ageOf(p);if(a>=29||d<=1)return 'na vrcholu';if(d<=4)return 'mírný';if(d<=9)return 'dobrý';if(d<=15)return 'vysoký';return 'obrovský';}
function attrBars(p){const L=p.pos==='GK'?ATTR_GK:ATTR_CZ;return p.a.map((v,i)=>`<div class="attr"><span class="mut">${L[i]}</span><div class="bar"><i style="width:${v}%;${v>=80?'background:linear-gradient(90deg,#f2a514,#ffe27a)':''}"></i></div><b class="r">${v}</b></div>`).join('');}
function playerSheet(id){const p=P(id);if(!p)return;const mine=p.cl===S.clubId;const c=S.clubs[p.cl];const st=p.st;
 const avgR=st.ap?(st.rt/st.ap).toFixed(2).replace('.',','):'—';
 let act='';
 if(mine){act=`<div class="grid2" style="margin-top:12px"><button class="btn ghost" onclick="sellPlayer('${p.id}')">💰 Nabídnout k prodeji</button><button class="btn ghost" onclick="releasePlayer('${p.id}')">✂️ Uvolnit</button></div>`;}
 else act=`<button class="btn big gold" style="margin-top:12px" onclick="bidSheet('${p.id}')">✍️ Podat nabídku</button>`;
 modal(`<div class="hero">${posB(p.pos)}<div style="flex:1;min-width:0"><h2 style="margin:0;font-size:18px">${esc(p.n)}</h2><div class="small mut">${flag(p.nat)} ${esc(natName(p.nat))} · ${ageOf(p)} let · ${POS_FULL[p.pos]}</div></div>${ovrB(p.ovr)}</div>
 <div class="row small" style="margin:10px 0">${c?badge(c,'sm')+' '+esc(c.n):'bez klubu'}<span class="sp"></span>${p.yth?'<span class="tag y">odchovanec</span>':''}${p.gen?'<span class="tag" title="Doplněný hráč">doplněný</span>':''}</div>
 <div class="grid3" style="margin-bottom:10px"><div class="tile"><div class="k">Hodnota</div><div class="v" style="font-size:13.5px">${fmtMoney(playerValue(p))}</div></div><div class="tile"><div class="k">Mzda/týden</div><div class="v" style="font-size:13.5px">${fmtMoney(playerWage(p))}</div></div><div class="tile"><div class="k">Potenciál</div><div class="v" style="font-size:13.5px">${potLabel(p)}</div></div></div>
 <div class="card" style="padding:10px 12px">${attrBars(p)}</div>
 <div class="grid2" style="margin-bottom:6px"><div class="tile"><div class="k">Kondice</div>${condBar(p.cond)}<div class="small b">${Math.round(p.cond)} %</div></div><div class="tile"><div class="k">Morálka</div><div class="bar"><i style="width:${p.mor}%"></i></div><div class="small b">${moraleText(p.mor)}</div></div></div>
 <div class="card" style="padding:10px 12px"><h3>Sezóna ${seasonLabel(S.season)}</h3><div class="grid3"><div class="tile"><div class="k">Zápasy</div><div class="v">${st.ap}</div></div><div class="tile"><div class="k">Góly</div><div class="v">${st.g}</div></div><div class="tile"><div class="k">Asistence</div><div class="v">${st.as}</div></div><div class="tile"><div class="k">Prům. známka</div><div class="v">${avgR}</div></div><div class="tile"><div class="k">Žluté</div><div class="v">${st.yc}</div></div><div class="tile"><div class="k">${p.pos==='GK'?'Čistá konta':'Červené'}</div><div class="v">${p.pos==='GK'?st.cs:st.rc}</div></div></div>
 ${p.inj>0?`<div class="small bad" style="margin-top:8px">🚑 Zraněn ještě ${p.inj} ${czPlural(p.inj,'týden','týdny','týdnů')}.</div>`:''}${p.sus>0?`<div class="small warn" style="margin-top:8px">⛔ Trest na ${p.sus} ${czPlural(p.sus,'zápas','zápasy','zápasů')}.</div>`:''}</div>${act}`);}
function moraleText(m){return m>=85?'výborná':m>=68?'dobrá':m>=50?'průměrná':m>=32?'špatná':'velmi špatná';}
function sellPlayer(id){const p=P(id);if(!transferWindow()){toast('Přestupové okno je zavřené.');return;}if(clubPlayers(S.clubId).length<=16){toast('Kádr musí mít aspoň 16 hráčů.');return;}
 const fee=Math.round(playerValue(p)*rnd(0.78,0.98)/1e4)*1e4;const others=Object.keys(S.clubs).filter(x=>x!==S.clubId&&S.clubs[x].rep>=p.ovr-8&&S.clubs[x].money>fee);const buyer=others.length?pick(others):null;const bn=buyer?S.clubs[buyer].n:foreignClubName(p);
 confirmBox('Nabídka za hráče',`O hráče ${esc(p.n)} má zájem klub <b>${esc(bn)}</b>. Nabízí <b class="gold">${fmtMoney(fee)}</b> (tržní hodnota ${fmtMoney(playerValue(p))}).`,'Prodat',()=>{S.offers.push({id:'q'+Date.now(),p:id,buyer,bn,fee,r:S.round});acceptOffer(S.offers[S.offers.length-1].id);render();toast('Hráč prodán ✓');},'gold');}
function releasePlayer(id){const p=P(id);if(clubPlayers(S.clubId).length<=16){toast('Kádr musí mít aspoň 16 hráčů.');return;}const cost=playerWage(p)*12;
 confirmBox('Uvolnit hráče?',`Smlouvu s hráčem ${esc(p.n)} ukončíš dohodou. Odstupné činí ${fmtMoney(cost)}.`,'Uvolnit',()=>{money(-cost,'exp','Odstupné: '+p.n);movePlayer(p,null);delete S.players[id];addNews('✂️',`Klub ukončil smlouvu s hráčem ${p.n}.`);saveGame();render();});}
// ===================== TAKTIKA =====================
function renderTactics(){const t=S.tac;const slots=FORMS[t.form];const str=lineStrength(t.xi,t.form,t);
 let h=`<div class="chips" style="margin-bottom:10px">${Object.keys(FORMS).map(f=>`<button class="chip ${t.form===f?'on':''}" onclick="setForm('${f}')">${f}</button>`).join('')}</div>
 <div class="pitch" id="pitch"><div class="box t"></div><div class="box b"></div>${slots.map((s,i)=>{const p=P(t.xi[i]);const fit=p?posFit(p.pos,s[0]):0;const c=myClub();
  return `<div class="slot ${UI.sel===i?'sel':''} ${p?'':'empty'} ${p&&(!available(p)||fit<0.85)?'bad':''}" style="left:${s[1]}%;top:${s[2]}%" onclick="slotTap(${i})"><div class="sh" style="background:${s[0]==='GK'?'#ffb648':c.c[0]};color:${lum(s[0]==='GK'?'#ffb648':c.c[0])>0.6?'#111':'#fff'}">${p?p.ovr:POS_CZ[s[0]]}</div><div class="sn">${p?esc(pSurname(p)):POS_CZ[s[0]]}</div>${p?`<div class="cbar"><i style="width:${p.cond}%;background:${p.cond<60?'#ff5d73':p.cond<80?'#ffb648':'#3ee68a'}"></i></div>`:''}</div>`;}).join('')}</div>
 <div class="small mut c" style="margin:6px 0 10px">${UI.sel!=null?'Vyber hráče pro pozici '+POS_FULL[slots[UI.sel][0]]+'.':'Klepni na pozici a vyber hráče.'}</div>
 <div class="grid3" style="margin-bottom:12px"><div class="tile"><div class="k">Útok</div><div class="v">${Math.round(str.att)}</div></div><div class="tile"><div class="k">Záloha</div><div class="v">${Math.round(str.mid)}</div></div><div class="tile"><div class="k">Obrana</div><div class="v">${Math.round(str.def)}</div></div></div>
 <div class="grid2" style="margin-bottom:12px"><button class="btn ghost" onclick="autoPick()">🪄 Nejlepší sestava</button><button class="btn ghost" onclick="benchSheet()">🪑 Lavička (${t.bench.length})</button></div>
 <div class="card"><h3>Mentalita</h3><div class="seg">${Object.entries(MENT).map(([k,v])=>`<button class="${t.ment===k?'on':''}" onclick="S.tac.ment='${k}';saveGame();render()">${v}</button>`).join('')}</div>
 <h3 style="margin-top:12px">Presink</h3><div class="seg">${Object.entries(PRESS).map(([k,v])=>`<button class="${t.press===k?'on':''}" onclick="S.tac.press='${k}';saveGame();render()">${v}</button>`).join('')}</div>
 <h3 style="margin-top:12px">Styl hry</h3><div class="seg">${Object.entries(STYLE).map(([k,v])=>`<button class="${t.style===k?'on':''}" onclick="S.tac.style='${k}';saveGame();render()">${v}</button>`).join('')}</div>
 <div class="tiny mut" style="margin-top:10px">Vysoký presink zvyšuje tlak, ale hráči se víc unaví. Protiútoky fungují nejlépe s defenzivní mentalitou. Sehranost týmu: <b>${Math.round(S.cohesion)} %</b>.</div></div>`;
 return h;}
function setForm(f){const t=S.tac;const old=t.xi.slice();t.form=f;const slots=FORMS[f];const used=new Set();const xi=new Array(11).fill(null);
 // přeřadit stávající hráče co nejlépe
 const pool=old.map(P).filter(p=>p&&p.cl===S.clubId);slots.forEach((s,i)=>{let best=null,bv=-1;pool.forEach(p=>{if(used.has(p.id))return;const v=p.ovr*posFit(p.pos,s[0]);if(v>bv){bv=v;best=p;}});if(best){xi[i]=best.id;used.add(best.id);}});
 t.xi=xi;UI.sel=null;saveGame();render();}
function autoPick(){const l=autoLineup(S.clubId,S.tac.form);S.tac.xi=l.xi;S.tac.bench=l.bench.slice(0,9);UI.sel=null;saveGame();render();toast('Sestava sestavena podle formy a kondice ✓');}
function slotTap(i){UI.sel=i;const slot=FORMS[S.tac.form][i][0];const ps=clubPlayers(S.clubId).sort((a,b)=>b.ovr*posFit(b.pos,slot)-a.ovr*posFit(a.pos,slot));
 modal(`<h2>${POS_FULL[slot]}</h2><div class="small mut" style="margin-bottom:8px">Číslo vpravo je síla hráče na této pozici.</div>${ps.map(p=>{const where=S.tac.xi.indexOf(p.id);const r=Math.round(p.ovr*posFit(p.pos,slot));return `<div class="pl-row" onclick="assignSlot(${i},'${p.id}')" style="${!available(p)?'opacity:.5':''}">${posB(p.pos)}<div class="nm"><b>${esc(p.n)}${where===i?' ✓':''}</b><small>${ageOf(p)} let · kondice ${Math.round(p.cond)} %${statusIc(p)}</small></div>${ovrB(r)}</div>`;}).join('')}`);}
function assignSlot(i,id){const t=S.tac;const p=P(id);if(!available(p)){toast(p.inj>0?'Hráč je zraněný.':'Hráč má trest.');return;}const prev=t.xi[i];const k=t.xi.indexOf(id);
 if(k>=0)t.xi[k]=prev;else{const b=t.bench.indexOf(id);if(b>=0){if(prev)t.bench[b]=prev;else t.bench.splice(b,1);}}
 t.xi[i]=id;UI.sel=null;closeModal();saveGame();render();}
function benchSheet(){const t=S.tac;const ps=clubPlayers(S.clubId).filter(p=>!t.xi.includes(p.id)).sort((a,b)=>(t.bench.includes(b.id)-t.bench.includes(a.id))||b.ovr-a.ovr);
 modal(`<h2>Lavička náhradníků</h2><div class="small mut" style="margin-bottom:8px">Vyber až 9 náhradníků (${t.bench.length}/9). Během zápasu můžeš 5× střídat.</div>${ps.map(p=>`<div class="pl-row" onclick="toggleBench('${p.id}')" style="${!available(p)?'opacity:.5':''}"><span style="width:26px;font-size:18px">${t.bench.includes(p.id)?'✅':'⬜'}</span>${posB(p.pos)}<div class="nm"><b>${esc(p.n)}</b><small>${ageOf(p)} let · kondice ${Math.round(p.cond)} %${p.inj>0?' · zraněn':''}</small></div>${ovrB(p.ovr)}</div>`).join('')}`);}
function toggleBench(id){const t=S.tac;const k=t.bench.indexOf(id);if(k>=0)t.bench.splice(k,1);else{if(t.bench.length>=9){toast('Na lavičce může být nejvýše 9 hráčů.');return;}if(!available(P(id))){toast('Hráč není k dispozici.');return;}t.bench.push(id);}saveGame();benchSheet();}

// ===================== SOUTĚŽ =====================
function renderLeague(){const lgs=countryLeagues(S.cc);if(!UI.lgCode||!S.leagues[UI.lgCode])UI.lgCode=myClub().lg;const code=UI.lgCode;const L=S.leagues[code];const v=UI.lgView;
 let h=lgs.length>1?`<div class="chips" style="margin-bottom:8px">${lgs.map(l=>`<button class="chip ${code===l.code?'on':''}" onclick="UI.lgCode='${l.code}';UI.lgRound=null;render()">${esc(l.name)}</button>`).join('')}</div>`:'';
 h+=`<div class="seg" style="margin-bottom:10px">${[['table','Tabulka'],['fix','Zápasy'],['sc','Střelci'],['hist','Historie']].map(([k,l])=>`<button class="${v===k?'on':''}" onclick="UI.lgView='${k}';render()">${l}</button>`).join('')}</div>`;
 if(v==='table'){const li=leagueInfo(code);const idx=lgs.findIndex(l=>l.code===code);h+=`<div class="card" style="padding:8px 8px">${tableHtml(code,sortedTable(code),0)}<div class="tiny mut" style="margin-top:8px;line-height:1.5">${idx>0&&lgs[idx-1].down?`<span class="good">▌</span> postup (${lgs[idx-1].down}) `:''}${li.down?`<span class="bad">▌</span> sestup (${li.down})`:''}${!li.down&&idx===0&&lgs.length===1?'Soutěž se hraje dvoukolově bez nadstavby.':''}</div></div>`;}
 else if(v==='fix'){let r=UI.lgRound==null?Math.min(S.round,L.fix.length-1):UI.lgRound;r=clamp(r,0,L.fix.length-1);
  h+=`<div class="row" style="margin-bottom:8px"><button class="btn ghost sm" ${r<=0?'disabled':''} onclick="UI.lgRound=${r-1};render()">‹</button><div class="sp c b">${r+1}. kolo</div><button class="btn ghost sm" ${r>=L.fix.length-1?'disabled':''} onclick="UI.lgRound=${r+1};render()">›</button></div><div class="card" style="padding:6px 10px">`;
  const res=L.res[r];
  L.fix[r].forEach(([a,b],k)=>{const rr=res&&res.find(x=>x.h===a&&x.a===b);const me=a===S.clubId||b===S.clubId;
   h+=`<div class="fx ${me?'me':''}" ${rr?`onclick="resSheet('${code}',${r},'${a}')"`:''}><span class="t r">${esc(S.clubs[a].n)}</span>${badge(S.clubs[a],'sm')}<span class="sc">${rr?rr.gh+':'+rr.ga:'–:–'}</span>${badge(S.clubs[b],'sm')}<span class="t">${esc(S.clubs[b].n)}</span></div>`;});
  h+='</div>';}
 else if(v==='sc'){const ts=topScorers(code,20);h+=`<div class="card" style="padding:6px 10px">${ts.length?`<table class="tbl"><tr><th>#</th><th class="l">Hráč</th><th>G</th><th>A</th></tr>${ts.map((x,i)=>`<tr class="${x.p.cl===S.clubId?'me':''}" onclick="playerSheet('${x.p.id}')"><td>${i+1}</td><td class="nm"><b>${esc(x.p.n)}</b><div class="tiny mut">${esc(S.clubs[x.p.cl].n)}</div></td><td class="b">${x.g}</td><td>${x.as}</td></tr>`).join('')}</table>`:'<div class="empty">Zatím nepadl žádný gól.</div>'}</div>`;}
 else{h+=`<div class="card">${S.history.length?S.history.map(r=>`<div class="news"><span>${r.pos===1?'🏆':r.myMove>0?'⬆️':r.myMove<0?'⬇️':'📅'}</span><div class="t"><b>${seasonLabel(r.season)}</b> – ${esc(leagueLabel(r.lg))}: ${r.pos}. místo, ${r.pts} b. (${r.w}–${r.d}–${r.l}, skóre ${r.gf}:${r.ga})${r.topScorer?`<small>Nejlepší střelec soutěže: ${esc(r.topScorer.n)} (${r.topScorer.g} ${czPlural(r.topScorer.g,'gól','góly','gólů')})</small>`:''}</div></div>`).join(''):'<div class="empty">Historie se začne psát po první sezóně.</div>'}</div>`;
  if(S.trophies.length)h+=`<div class="card"><h3>🏆 Úspěchy</h3>${S.trophies.map(t=>`<div class="news"><span>🏅</span><div class="t">${esc(t.t)}<small>${seasonLabel(t.s)}</small></div></div>`).join('')}</div>`;}
 return h;}
function resSheet(code,r,h){const res=S.leagues[code].res[r].find(x=>x.h===h);if(!res)return;const H=S.clubs[res.h],A=S.clubs[res.a];
 modal(`<div class="vs" style="margin-bottom:10px"><div class="tm">${badge(H,'lg')}<span>${esc(H.n)}</span></div><div class="mid" style="font-size:28px;color:#fff">${res.gh}:${res.ga}</div><div class="tm">${badge(A,'lg')}<span>${esc(A.n)}</span></div></div>
 <div class="card">${(res.ev||[]).length?res.ev.sort((a,b)=>a.m-b.m).map(e=>{const p=P(e.p);return `<div class="row small" style="padding:4px 0;${e.c===res.a?'flex-direction:row-reverse;text-align:right':''}"><span class="mut b">${e.m}'</span><span>⚽ ${p?esc(p.n):'—'}</span></div>`;}).join(''):'<div class="empty">Bez branek.</div>'}</div>`);}
function clubSheet(id){const c=S.clubs[id];const ps=clubPlayers(id).sort((a,b)=>b.ovr-a.ovr);const st=teamStrength(id);const t=S.leagues[c.lg].table[id];
 modal(`<div class="hero" style="margin-bottom:10px">${badge(c,'lg')}<div><h2 style="margin:0">${esc(c.n)}</h2><div class="small mut">${esc(leagueLabel(c.lg))} · ${tablePos(id)}. místo · ${t.pts} b.</div></div></div>
 <div class="grid3" style="margin-bottom:10px"><div class="tile"><div class="k">Útok</div><div class="v">${Math.round(st.att)}</div></div><div class="tile"><div class="k">Záloha</div><div class="v">${Math.round(st.mid)}</div></div><div class="tile"><div class="k">Obrana</div><div class="v">${Math.round(st.def)}</div></div></div>
 <div class="row small mut" style="margin-bottom:8px">Forma: ${formB(t.form)||'—'}<span class="sp"></span>Stadion: ${fmtNum(c.cap)} míst</div>
 <div class="card" style="padding:6px 10px">${ps.map(p=>`<div class="pl-row" onclick="playerSheet('${p.id}')">${posB(p.pos)}<div class="nm"><b>${flag(p.nat)} ${esc(p.n)}</b><small>${ageOf(p)} let · ${fmtMoney(playerValue(p))}${p.inj>0?' · 🚑':''}</small></div>${ovrB(p.ovr)}</div>`).join('')}</div>`);}
// ===================== PŘESTUPY =====================
function allLeagueOptions(){const groups={};FM_CAT.leagues.forEach(l=>{(groups[l.country]=groups[l.country]||[]).push(l);});return groups;}
function renderMarket(){const mk=UI.mk;const me=myClub();const win=transferWindow();
 let h=`<div class="card" style="padding:12px"><div class="row"><span style="font-size:22px">${win?'🟢':'🔴'}</span><div style="flex:1"><b>${win?'Přestupové okno je otevřené':'Přestupové okno je zavřené'}</b><div class="tiny mut">${win?'Můžeš kupovat i prodávat hráče.':'Otevře se v polovině sezóny a znovu v létě. Hráče si můžeš prohlížet.'}</div></div></div></div>`;
 if(S.offers.length)h+=`<div class="card"><h3>📨 Nabídky za tvé hráče</h3>${S.offers.map(offerRow).join('')}</div>`;
 const groups=allLeagueOptions();
 h+=`<div class="card"><h3>Hledat hráče</h3><select id="mkcode" onchange="UI.mk.code=this.value;render()"><option value="*" ${mk.code==='*'?'selected':''}>${flag(S.cc)} Všechny soutěže v zemi ${esc(FM_CAT.countries[S.cc])}</option>${Object.entries(groups).map(([cn,ls])=>`<optgroup label="${esc(cn)}">${ls.map(l=>`<option value="${l.code}" ${mk.code===l.code?'selected':''}>${esc(cn)} – ${esc(l.name)}</option>`).join('')}</optgroup>`).join('')}</select>
 <div class="chips" style="margin-top:8px">${[['all','Vše'],['G','Brankáři'],['D','Obránci'],['M','Záložníci'],['F','Útočníci']].map(([k,l])=>`<button class="chip ${mk.pos===k?'on':''}" onclick="UI.mk.pos='${k}';render()">${l}</button>`).join('')}</div>
 <div class="grid2" style="margin-top:8px"><select onchange="UI.mk.max=+this.value;render()"><option value="0">Cena: bez limitu</option>${[2e5,5e5,1e6,2e6,5e6,1e7,2e7,5e7].map(v=>`<option value="${v}" ${mk.max===v?'selected':''}>do ${fmtMoney(v)}</option>`).join('')}<option value="-1" ${mk.max===-1?'selected':''}>do mého rozpočtu</option></select>
 <select onchange="UI.mk.age=+this.value;render()"><option value="0">Věk: jakýkoli</option>${[21,23,25,28,31].map(v=>`<option value="${v}" ${mk.age===v?'selected':''}>do ${v} let</option>`).join('')}</select></div>
 <div class="chips" style="margin-top:8px">${[['ovr','Nejlepší'],['val','Nejlevnější'],['pot','Talenty']].map(([k,l])=>`<button class="chip ${mk.sort===k?'on':''}" onclick="UI.mk.sort='${k}';render()">${l}</button>`).join('')}</div></div>
 <div id="mkres"><div class="empty"><div class="sp2" style="margin:0 auto 10px"></div>Hledám hráče…</div></div>`;
 return h;}
const MK={tmp:{}};
function foreignPlayers(code){const d=DATA[code];const out=[];if(!d)return out;d.clubs.forEach((c,ci)=>{c.p.forEach((a,pi)=>{const key=code+':'+ci+':'+pi;if(S.gone[key])return;
 out.push({tmp:1,key,code,ci,id:'t_'+key,n:a[0],pos:a[1],by:a[2],ovr:a[3],pot:a[4],nat:a[5],a:a[6],gen:a[7],club:c,cond:100,mor:70,inj:0,sus:0,st:newStats()});});});return out;}
function marketLoadResults(){const mk=UI.mk;const el=$('#mkres');if(!el)return;
 const draw=list=>{const me=myClub();const max=mk.max===-1?me.money:mk.max;let arr=list.filter(p=>p.cl!==S.clubId&&(mk.pos==='all'||GRP(p.pos)===mk.pos)&&(!mk.age||ageOf(p)<=mk.age)&&(!max||playerValue(p)<=max));
  arr.sort((a,b)=>mk.sort==='val'?playerValue(a)-playerValue(b):mk.sort==='pot'?(b.pot-b.ovr)-(a.pot-a.ovr)||b.pot-a.pot:b.ovr-a.ovr);arr=arr.slice(0,60);MK.tmp={};arr.forEach(p=>{if(p.tmp)MK.tmp[p.id]=p;});
  el.innerHTML=arr.length?`<div class="card" style="padding:6px 10px">${arr.map(p=>{const c=p.tmp?p.club:S.clubs[p.cl];return `<div class="pl-row" onclick="${p.tmp?`tmpSheet('${p.id}')`:`playerSheet('${p.id}')`}">${posB(p.pos)}<div class="nm"><b>${flag(p.nat)} ${esc(p.n)}</b><small>${ageOf(p)} let · ${c?esc(c.n):''} · ${fmtMoney(playerValue(p))}</small></div>${ovrB(p.ovr)}</div>`;}).join('')}</div>`:'<div class="empty">Filtru neodpovídá žádný hráč.</div>';};
 if(mk.code==='*'){draw(Object.values(S.players));return;}
 if(S.leagues[mk.code]){draw(Object.values(S.players).filter(p=>p.cl&&S.clubs[p.cl]&&S.clubs[p.cl].lg===mk.code));return;}
 loadLeague(mk.code).then(()=>{if(UI.tab==='market'&&UI.mk.code===mk.code)draw(foreignPlayers(mk.code));}).catch(e=>{el.innerHTML=`<div class="empty bad">${esc(e.message)}</div>`;});}
function tmpSheet(id){const p=MK.tmp[id];if(!p)return;const top=p.club.p.map(x=>x[3]).sort((a,b)=>b-a).slice(0,16);p.clubRep=top.reduce((s,x)=>s+x,0)/top.length;
 modal(`<div class="hero">${posB(p.pos)}<div style="flex:1;min-width:0"><h2 style="margin:0;font-size:18px">${esc(p.n)}</h2><div class="small mut">${flag(p.nat)} ${esc(natName(p.nat))} · ${ageOf(p)} let · ${POS_FULL[p.pos]}</div></div>${ovrB(p.ovr)}</div>
 <div class="row small" style="margin:10px 0">${badge(p.club,'sm')} ${esc(p.club.n)} <span class="mut">· ${esc(leagueLabel(p.code))}</span></div>
 <div class="grid3" style="margin-bottom:10px"><div class="tile"><div class="k">Hodnota</div><div class="v" style="font-size:13.5px">${fmtMoney(playerValue(p))}</div></div><div class="tile"><div class="k">Mzda/týden</div><div class="v" style="font-size:13.5px">${fmtMoney(playerWage(p))}</div></div><div class="tile"><div class="k">Potenciál</div><div class="v" style="font-size:13.5px">${potLabel(p)}</div></div></div>
 <div class="card" style="padding:10px 12px">${attrBars(p)}</div><button class="btn big gold" onclick="bidSheet('${p.id}')">✍️ Podat nabídku</button>`);}
function bidSheet(id){const p=id.startsWith('t_')?MK.tmp[id]:P(id);if(!p)return;if(!transferWindow()){toast('Přestupové okno je zavřené.');return;}
 const val=playerValue(p);const steps=[0.8,0.9,1,1.1,1.2,1.35,1.5].map(f=>Math.round(val*f/1e4)*1e4||Math.round(val*f));
 modal(`<h2>Nabídka: ${esc(p.n)}</h2><div class="small mut" style="margin-bottom:10px">Tržní hodnota ${fmtMoney(val)} · hráč bude chtít mzdu ${fmtMoney(playerWage(p))} týdně. Rozpočet: <b>${fmtMoney(myClub().money)}</b>.</div>
 <div class="col">${steps.map(v=>`<button class="btn ${v>myClub().money?'ghost':''}" ${v>myClub().money?'disabled':''} onclick="makeBid('${id}',${v})">${fmtMoney(v)}${v<val?' (pod hodnotou)':v>val?' (nad hodnotou)':' (tržní hodnota)'}</button>`).join('')}</div>`);}
function makeBid(id,fee){const tmp=id.startsWith('t_');const p=tmp?MK.tmp[id]:P(id);if(!p)return;const me=myClub();if(fee>me.money){toast('Na tuto nabídku nemáš peníze.');return;}
 if(clubPlayers(S.clubId).length>=36){toast('Kádr je plný (max. 36 hráčů).');return;}
 const val=playerValue(p);const sellerRep=tmp?p.clubRep:S.clubs[p.cl].rep;const sellerSize=tmp?p.club.p.length:S.clubs[p.cl].pl.length;
 // ochota klubu
 let ok=0.15+(fee/val-0.8)*1.3;if(p.ovr>=sellerRep+2)ok-=0.2;if(sellerSize<=19)ok-=0.4;ok=clamp(ok,0,0.97);
 // ochota hráče
 const myRep=me.rep||teamStrength(S.clubId).ovr;let will=0.85-Math.max(0,(p.ovr-myRep)-3)*0.09-Math.max(0,sellerRep-myRep-2)*0.05;if(ageOf(p)>=31)will+=0.1;will=clamp(will,0.03,0.97);
 closeModal();
 if(RNG()>ok){modal(`<div class="c"><div style="font-size:42px">🙅</div><h2>Nabídka odmítnuta</h2><div class="small mut">Klub ${esc(tmp?p.club.n:S.clubs[p.cl].n)} tvou nabídku ${fmtMoney(fee)} za hráče ${esc(p.n)} odmítl.${fee<val?' Zkus nabídnout víc.':''}</div></div><div style="height:12px"></div><button class="btn big" onclick="closeModal()">Rozumím</button>`);return;}
 if(RNG()>will){modal(`<div class="c"><div style="font-size:42px">🤷</div><h2>Hráč nemá zájem</h2><div class="small mut">Klub nabídku přijal, ale ${esc(p.n)} o přestup do tvého týmu nestojí. Láká ho silnější klub.</div></div><div style="height:12px"></div><button class="btn big" onclick="closeModal()">Škoda</button>`);return;}
 money(-fee,'tr_out','Nákup: '+p.n);let np;
 if(tmp){np=mkPlayer([p.n,p.pos,p.by,p.ovr,p.pot,p.nat,p.a,p.gen],S.clubId);me.pl.push(np.id);S.gone[p.key]=1;}else{S.clubs[p.cl].money+=fee;movePlayer(p,S.clubId);np=p;}
 np.mor=80;addNews('✍️',`Posila! ${np.n} podepsal smlouvu, přestupová částka ${fmtMoney(fee)}.`);saveGame();render();
 modal(`<div class="c"><div style="font-size:46px">✍️</div><h2>Přestup dokončen</h2><div class="small">${esc(np.n)} je novou posilou týmu. Mzda ${fmtMoney(playerWage(np))} týdně.</div></div><div style="height:12px"></div><div class="grid2"><button class="btn ghost" onclick="closeModal()">Zavřít</button><button class="btn" onclick="closeModal();go('tac')">Do sestavy</button></div>`);}
// ===================== KLUB =====================
function renderClub(){const me=myClub();const ps=clubPlayers(S.clubId);const wages=ps.reduce((s,p)=>s+playerWage(p),0);const f=S.finSeason;const tr=S.training;
 let h=`<div class="card"><h3>💶 Finance</h3><div class="grid2"><div class="tile"><div class="k">Zůstatek</div><div class="v ${me.money<0?'bad':'gold'}">${fmtMoney(me.money)}</div></div><div class="tile"><div class="k">Bilance týdne</div><div class="v ${me.tv-wages<0?'bad':'good'}">${fmtMoney(me.tv-wages)}</div></div><div class="tile"><div class="k">Mzdy / týden</div><div class="v" style="font-size:14px">${fmtMoney(wages)}</div></div><div class="tile"><div class="k">TV a sponzoři / týden</div><div class="v" style="font-size:14px">${fmtMoney(me.tv)}</div></div></div>
 <div class="small mut" style="margin-top:10px;line-height:1.6">Tato sezóna: vstupné ${fmtMoney(f.gate)} · prodeje ${fmtMoney(f.tr_in)} · nákupy ${fmtMoney(f.tr_out)} · mzdy ${fmtMoney(f.wages)}<br>Stadion: ${fmtNum(me.cap)} míst · vstupenka ${fmtMoney(me.ticket)}</div>
 <details style="margin-top:8px"><summary class="small cy" style="min-height:40px;display:flex;align-items:center">Pohyby na účtu</summary>${S.fin.log.slice(0,25).map(l=>`<div class="row small" style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05)"><span class="mut" style="width:52px">${l.r+1>S.maxRound?'léto':(l.r+1)+'. k.'}</span><span style="flex:1">${esc(l.t)}</span><b class="${l.v<0?'bad':'good'}">${fmtMoney(l.v)}</b></div>`).join('')}</details></div>
 <div class="card"><h3>🏃 Trénink</h3><div class="chips">${[['bal','Vyvážený'],['fit','Kondice'],['att','Útok'],['def','Obrana'],['tech','Technika'],['tac','Taktika']].map(([k,l])=>`<button class="chip ${tr.focus===k?'on':''}" onclick="S.training.focus='${k}';saveGame();render()">${l}</button>`).join('')}</div>
 <h3 style="margin-top:12px">Intenzita</h3><div class="seg">${[[1,'Lehká'],[2,'Normální'],[3,'Tvrdá']].map(([k,l])=>`<button class="${tr.int===k?'on':''}" onclick="S.training.int=${k};saveGame();render()">${l}</button>`).join('')}</div>
 <div class="tiny mut" style="margin-top:8px">${{bal:'Rovnoměrný rozvoj všech dovedností.',fit:'Rychlejší regenerace mezi zápasy a rozvoj rychlosti a fyzičky.',att:'Důraz na střelbu a zakončení.',def:'Důraz na bránění a souboje.',tech:'Přihrávky a práce s míčem.',tac:'Rychleji roste sehranost týmu, individuální rozvoj je pomalejší.'}[tr.focus]} ${tr.int===3?'Tvrdý trénink zrychluje rozvoj, ale zvyšuje riziko zranění a únavu.':tr.int===1?'Lehký trénink šetří síly, hráči se ale zlepšují pomaleji.':''}</div></div>
 <div class="card"><h3>👔 Vedení klubu</h3><div class="small">Cíl sezóny: <b class="gold">${expectText(me.expect)}</b></div><div class="small" style="margin-top:6px">Důvěra vedení: <b>${S.boardTrust} %</b></div><div class="bar" style="margin-top:6px"><i style="width:${S.boardTrust}%"></i></div><div class="tiny mut" style="margin-top:6px">Trenér: ${esc(S.manager)}</div></div>
 <div class="card"><h3>⚙️ Nastavení a uložení · v${FM_VER}</h3>
 <div class="small mut" style="margin-bottom:6px">Rychlost zápasu</div><div class="seg" style="margin-bottom:10px">${[[1,'Pomalu'],[2,'Normálně'],[3,'Rychle']].map(([k,l])=>`<button class="${S.settings.speed===k?'on':''}" onclick="S.settings.speed=${k};saveGame();render()">${l}</button>`).join('')}</div>
 <div class="small mut" style="margin-bottom:6px">Zvuky</div><div class="seg" style="margin-bottom:12px"><button class="${!S.settings.sound?'on':''}" onclick="S.settings.sound=false;saveGame();render()">Vypnuté</button><button class="${S.settings.sound?'on':''}" onclick="S.settings.sound=true;getAC();saveGame();render();beep(880,.15)">Zapnuté</button></div>
 <div class="grid2"><button class="btn ghost" onclick="saveGame(true);toast('Uloženo ✓')">💾 Uložit</button><button class="btn ghost" onclick="exportSave()">📤 Export</button><label class="btn ghost" style="cursor:pointer">📥 Import<input type="file" accept=".json,application/json" style="display:none" onchange="importSave(this)"></label><button class="btn red" onclick="confirmBox('Nová hra?','Současná kariéra bude smazána.','Smazat',()=>{resetGame();UI.tab='home';UI.start={step:0};render();})">🗑️ Nová hra</button></div>
 <div class="tiny mut" style="margin-top:8px">Hra se ukládá automaticky po každém kole i změně. Soupisky: skutečné kádry 2026/27, hodnocení hráčů je orientační.</div></div>`;
 return h;}

// ===================== PŘED ZÁPASEM / ŽIVÝ ZÁPAS =====================
let MS=null;
function preMatch(){const f=myFixture();if(!f)return;const [h,a]=f;const H=S.clubs[h],A=S.clubs[a];const sh=teamStrength(h),sa=teamStrength(a);const [xh,xa]=xgPair(sh,sa);
 const pw=winProb(xh,xa);const opp=h===S.clubId?a:h;const op=clubPlayers(opp).filter(available).sort((x,y)=>y.ovr-x.ovr).slice(0,3);
 const row=(k,x,y)=>`<div class="stt"><b>${Math.round(x)}</b><span class="k">${k}</span><b class="r">${Math.round(y)}</b><div class="dbar"><i style="width:${x/(x+y)*100}%"></i><i style="width:${y/(x+y)*100}%"></i></div></div>`;
 modal(`<div class="small mut c">${esc(leagueLabel(H.lg))} · ${S.round+1}. kolo</div><div class="vs" style="margin:8px 0"><div class="tm">${badge(H,'lg')}<span>${esc(H.n)}</span></div><div class="mid">VS</div><div class="tm">${badge(A,'lg')}<span>${esc(A.n)}</span></div></div>
 <div class="card" style="padding:10px 12px">${row('Útok',sh.att,sa.att)}${row('Záloha',sh.mid,sa.mid)}${row('Obrana',sh.def,sa.def)}<div class="row small" style="justify-content:space-between;margin-top:6px"><span>Výhra domácích ${Math.round(pw[0]*100)} %</span><span class="mut">remíza ${Math.round(pw[1]*100)} %</span><span>hostů ${Math.round(pw[2]*100)} %</span></div></div>
 <div class="card" style="padding:10px 12px"><h3>Hlídat u soupeře</h3>${op.map(p=>`<div class="row small" style="padding:3px 0">${posB(p.pos)}<span style="flex:1">${esc(p.n)}</span>${ovrB(p.ovr)}</div>`).join('')}</div>
 ${lineupIssues()}
 <div class="mstick"><div class="grid2"><button class="btn ghost" onclick="closeModal();go('tac')">📋 Sestava</button><button class="btn ghost" onclick="quickPlay()">⏩ Jen výsledek</button></div><div style="height:8px"></div><button class="btn big gold" id="pmgo" onclick="startLive()">▶ Hrát zápas</button></div>`);}
function winProb(xh,xa){let ph=0,pd=0,pa=0;const pf=(l,k)=>{let f=1;for(let i=2;i<=k;i++)f*=i;return Math.exp(-l)*Math.pow(l,k)/f;};for(let i=0;i<9;i++)for(let j=0;j<9;j++){const p=pf(xh,i)*pf(xa,j);if(i>j)ph+=p;else if(i===j)pd+=p;else pa+=p;}const t=ph+pd+pa;return [ph/t,pd/t,pa/t];}
function quickPlay(){closeModal();const f=myFixture();const M=createMatch(f[0],f[1]);simToEnd(M);endLive(M,true);}
function startLive(){closeModal();const f=myFixture();const M=createMatch(f[0],f[1]);MS={M,tab:'kom',paused:false,timer:null,shown:0};
 const w=document.createElement('div');w.className='mv-wrap';w.id='mv';document.body.appendChild(w);document.body.style.overflow='hidden';drawLive(true);whistle();schedule();}
function speedMs(){return [0,650,300,110][S.settings.speed||2];}
function schedule(){clearTimeout(MS&&MS.timer);if(!MS||MS.paused||MS.M.ended)return;MS.timer=setTimeout(tick,speedMs());}
function tick(){if(!MS||!document.getElementById('mv'))return;const M=MS.M;const ev=stepMinute(M);
 if(ev.some(e=>e.t==='goal')){goalSound();const sc=$('#mvscore');if(sc){sc.classList.remove('pop');void sc.offsetWidth;sc.classList.add('pop');}}
 if(ev.some(e=>e.t==='ht')){MS.paused=true;whistle();updLive();toast('Poločas – uprav taktiku nebo pokračuj.');return;}
 if(M.ended){whistle();updLive();setTimeout(()=>endLive(M),600);return;}
 if(M.needSub){updLive();toast('Zranění! Musíš vystřídat.');subSheet(M.needSub.slot,true);return;}
 updLive();schedule();}
function drawLive(){const M=MS.M;const H=S.clubs[M.h.cid],A=S.clubs[M.a.cid];const w=$('#mv');
 w.innerHTML=`<div class="mview"><div class="mtop"><div class="sbd"><div class="tm">${badge(H)}<span>${esc(H.n)}</span></div><div class="score" id="mvscore">0:0</div><div class="tm a">${badge(A)}<span>${esc(A.n)}</span></div></div><div class="mmin" id="mvmin">0'</div><div class="mprog"><i id="mvprog" style="width:0"></i></div></div>
 <div class="mtabs"><div class="seg">${[['kom','Komentář'],['stat','Statistiky'],['sest','Sestavy']].map(([k,l])=>`<button data-t="${k}" class="${MS.tab===k?'on':''}" onclick="MS.tab='${k}';updLive(true)">${l}</button>`).join('')}</div></div>
 <div class="mbody" id="mvbody"></div><div class="mfoot" id="mvfoot"></div></div>`;updLive(true);}
function evHtml(e,M){const cls=e.t==='goal'?'goal':e.t==='red'?'red':(e.t==='ht'||e.t==='ft'||e.t==='ko')?'big':'';const col=e.s==null?'transparent':(e.s===0?S.clubs[M.h.cid].c[0]:S.clubs[M.a.cid].c[0]);
 return `<div class="ev ${cls}"><span class="sd" style="background:${col}"></span><span class="m">${e.t==='ko'?'':e.m+"'"}</span><span class="tx">${esc(e.tx)}${e.t==='goal'?` <b class="gold">${e.sc[0]}:${e.sc[1]}</b>`:''}</span></div>`;}
function updLive(full){if(!MS)return;const M=MS.M;const b=$('#mvbody');if(!b)return;
 $('#mvscore').textContent=M.score[0]+':'+M.score[1];$('#mvmin').textContent=M.ended?'Konec':M.ht&&MS.paused&&M.min===45?'Poločas':(M.min>90?'90+'+(M.min-90):M.min>45&&M.half===1?'45+'+(M.min-45):M.min)+"'";$('#mvprog').style.width=Math.min(100,M.min/90*100)+'%';
 document.querySelectorAll('#mv .mtabs button').forEach(x=>x.classList.toggle('on',x.dataset.t===MS.tab));
 if(MS.tab==='kom'){const evs=M.ev.slice().reverse();b.innerHTML=evs.map(e=>evHtml(e,M)).join('');}
 else if(MS.tab==='stat')b.innerHTML=statsHtml(M);else b.innerHTML=lineupsHtml(M);
 const f=$('#mvfoot');const us=M.h.user?M.h:M.a;
 f.innerHTML=M.ended?`<button class="btn gold" onclick="endLive(MS.M)">Pokračovat</button>`:`<button class="btn ${MS.paused?'gold':'ghost'}" onclick="togglePause()">${MS.paused?'▶ Hrát':'⏸ Pauza'}</button><button class="btn ghost spd" onclick="cycleSpeed()">${['','1×','2×','4×'][S.settings.speed||2]}</button><button class="btn ghost" onclick="subSheet()">🔄 ${us.subs}/${us.maxSubs}</button><button class="btn ghost" onclick="liveTac()">📋</button><button class="btn ghost" onclick="finishNow()">⏩ Dohrát</button>`;}
function statsHtml(M){const s=M.stats;const tot=s[0].pos+s[1].pos||1;const ph=Math.round(s[0].pos/tot*100);
 const row=(k,x,y,fmt)=>{const a=finite(x),c=finite(y);return `<div class="stt"><b>${fmt?fmt(a):a}</b><span class="k">${k}</span><b class="r">${fmt?fmt(c):c}</b><div class="dbar"><i style="width:${a+c?a/(a+c)*100:50}%"></i><i style="width:${a+c?c/(a+c)*100:50}%"></i></div></div>`;};
 const gs=M.ev.filter(e=>e.t==='goal');
 return `<div class="card" style="padding:10px 12px">${row('Držení míče (%)',ph,100-ph)}${row('Střely',s[0].sh,s[1].sh)}${row('Na branku',s[0].sot,s[1].sot)}${row('Očekávané góly',s[0].xg,s[1].xg,v=>v.toFixed(1).replace('.',','))}${row('Rohy',s[0].cor,s[1].cor)}${row('Fauly',s[0].fou,s[1].fou)}${row('Žluté karty',s[0].yc,s[1].yc)}${row('Červené karty',s[0].rc,s[1].rc)}${row('Ofsajdy',s[0].off,s[1].off)}${row('Zákroky brankáře',s[0].sav,s[1].sav)}</div>
 ${gs.length?`<div class="card" style="padding:10px 12px"><h3>Branky</h3>${gs.map(e=>`<div class="row small" style="padding:3px 0;${e.s===1?'flex-direction:row-reverse;text-align:right':''}"><b class="mut">${e.m}'</b><span>⚽ ${esc(nm(e.p))}${e.pen?' (pen.)':''}</span></div>`).join('')}</div>`:''}`;}
function rtB(v){v=finite(v);return `<span class="rt ${v>=7.5?'hi':v<5.8?'lo':''}">${v.toFixed(1).replace('.',',')}</span>`;}
function lineupsHtml(M){const side=(sd)=>{const c=S.clubs[sd.cid];const on=sd.xi.map((id,i)=>[id,sd.slots[i]]).filter(x=>x[0]);const off=Object.keys(M.played).filter(id=>P(id)&&P(id).cl===sd.cid&&!sd.xi.includes(id));
 return `<div class="card lineup" style="padding:8px 10px"><h3>${badge(c,'sm')} ${esc(c.n)} <span class="sp"></span><span class="tiny">${sd.form}</span></h3>${on.map(([id,sl])=>{const p=P(id);return `<div class="lr">${posB(sl)}<span class="n">${esc(p.n)}${M.yc&&M.yc[id]?' 🟨':''}</span><span class="tiny mut">${Math.round(p.cond)} %</span>${rtB(M.rt[id])}</div>`;}).join('')}
 ${off.length?`<div class="tiny mut" style="margin-top:6px">Mimo hřiště: ${off.map(id=>esc(nm(id))).join(', ')}</div>`:''}<div class="tiny mut" style="margin-top:4px">Lavička: ${sd.bench.map(id=>esc(nm(id))).join(', ')||'—'}</div></div>`;};
 const us=M.h.user?M.h:M.a,th=M.h.user?M.a:M.h;return side(us)+side(th);}
function togglePause(){if(!MS)return;MS.paused=!MS.paused;if(!MS.paused){MS.M.ht=false;}updLive();schedule();getAC();}
function cycleSpeed(){S.settings.speed=(S.settings.speed%3)+1;updLive();if(!MS.paused){schedule();}}
function finishNow(){if(!MS)return;const M=MS.M;clearTimeout(MS.timer);if(M.needSub){M.needSub=null;}M.autoUser=true;simToEnd(M);updLive();setTimeout(()=>endLive(M),200);}
function userSide(M){return M.h.user?0:1;}
function subSheet(slot,auto){if(!MS)return;const M=MS.M;const i=userSide(M);const sd=M.sides[i];if(M.ended)return;
 if(!document.getElementById('mbg')){MS.resumeAfter=auto?true:!MS.paused;}
 MS.paused=true;clearTimeout(MS.timer);
 if(sd.subs>=sd.maxSubs&&!M.needSub){toast('Už jsi vystřídal pětkrát.');MS.paused=!MS.resumeAfter;schedule();return;}
 if(slot!=null)MS.subOut=slot;else if(MS.subOut==null&&M.needSub)MS.subOut=M.needSub.slot;
 const html=`<h2>Střídání (${sd.subs}/${sd.maxSubs})</h2>${M.needSub?'<div class="small warn" style="margin-bottom:8px">🚑 Zraněného hráče musíš nahradit.</div>':''}<div class="small mut" style="margin-bottom:6px">1. Kdo jde ze hřiště</div>${sd.xi.map((id,k)=>{const p=P(id);return `<div class="pl-row" onclick="subSheet(${k})" style="${MS.subOut===k?'background:rgba(255,211,77,.15);border-radius:10px':''}">${posB(sd.slots[k])}<div class="nm"><b>${p?esc(p.n):'— volné místo —'}</b><small>${p?'kondice '+Math.round(p.cond)+' % · známka '+finite(M.rt[id]).toFixed(1).replace('.',','):'hráč musel odstoupit'}</small></div>${MS.subOut===k?'<span class="gold b">✓</span>':''}</div>`;}).join('')}
 <div class="small mut" style="margin:10px 0 6px">2. Kdo přichází</div>${sd.bench.map(id=>{const p=P(id);const sl=MS.subOut!=null?sd.slots[MS.subOut]:null;return `<div class="pl-row" onclick="confirmSub('${id}')">${posB(p.pos)}<div class="nm"><b>${esc(p.n)}</b><small>${ageOf(p)} let${sl?' · na této pozici '+Math.round(p.ovr*posFit(p.pos,sl)):''}</small></div>${ovrB(p.ovr)}</div>`;}).join('')||'<div class="empty">Na lavičce nikdo není.</div>'}
 <div style="height:8px"></div><button class="btn big ghost" onclick="closeSub()">${M.needSub?'Hrát v oslabení':'Hotovo'}</button>`;
 const bg=modal(html,{noClose:true});bg.style.zIndex=120;}
function confirmSub(inId){const M=MS.M;const i=userSide(M);const sd=M.sides[i];if(MS.subOut==null){toast('Nejdřív vyber, kdo půjde ze hřiště.');return;}const k=MS.subOut;const outId=sd.xi[k];
 if(sd.subs>=sd.maxSubs){toast('Už nemůžeš střídat.');return;}
 if(!outId){const bi=sd.bench.indexOf(inId);if(bi<0)return;sd.xi[k]=inId;sd.bench.splice(bi,1);sd.subs++;M.played[inId]={from:M.min,to:null};M.rt[inId]=6;recalc(M);M.ev.push({m:M.min,t:'sub',s:i,tx:`🔄 Střídání – ${sideName(i).toLowerCase()}: na hřiště přichází ${nm(inId)}.`});}
 else{if(!doSub(M,i,outId,inId,false))return;}
 M.needSub=null;closeSub();}
function closeSub(){const M=MS.M;M.needSub=null;closeModal();MS.subOut=null;MS.paused=!MS.resumeAfter;updLive();schedule();}
function liveTac(){if(!MS)return;const M=MS.M;const sd=M.sides[userSide(M)];const wp=MS.paused;MS.paused=true;clearTimeout(MS.timer);
 const seg=(title,obj,key)=>`<h3 style="margin-top:10px">${title}</h3><div class="seg">${Object.entries(obj).map(([k,v])=>`<button class="${sd.tac[key]===k?'on':''}" onclick="MS.M.sides[userSide(MS.M)].tac.${key}='${k}';recalc(MS.M);liveTacRefresh()">${v}</button>`).join('')}</div>`;
 const bg=modal(`<h2>Pokyny z lavičky</h2><div id="ltac">${seg('Mentalita',MENT,'ment')}${seg('Presink',PRESS,'press')}${seg('Styl hry',STYLE,'style')}</div><div style="height:12px"></div><button class="btn big" id="ltok">Hotovo</button>`,{noClose:true});bg.style.zIndex=120;
 MS._ltwp=wp;$('#ltok').onclick=()=>{closeModal();MS.paused=MS._ltwp;updLive();schedule();};}
function liveTacRefresh(){const M=MS.M;const sd=M.sides[userSide(M)];const seg=(title,obj,key)=>`<h3 style="margin-top:10px">${title}</h3><div class="seg">${Object.entries(obj).map(([k,v])=>`<button class="${sd.tac[key]===k?'on':''}" onclick="MS.M.sides[userSide(MS.M)].tac.${key}='${k}';recalc(MS.M);liveTacRefresh()">${v}</button>`).join('')}</div>`;$('#ltac').innerHTML=seg('Mentalita',MENT,'ment')+seg('Presink',PRESS,'press')+seg('Styl hry',STYLE,'style');}
function endLive(M,quick){if(MS&&MS.done)return;if(MS)MS.done=true;if(MS)clearTimeout(MS.timer);
 const ui=userSide(M);const my=M.score[ui],th=M.score[1-ui];const won=my>th,draw=my===th;const opp=S.clubs[M.sides[1-ui].cid];
 const best=motm(M);const bp=P(best);const gs=M.ev.filter(e=>e.t==='goal');
 const mine=Object.keys(M.played).filter(id=>P(id)&&P(id).cl===S.clubId).sort((a,b)=>finite(M.rt[b])-finite(M.rt[a]));
 const bg=modal(`<div class="c"><div style="font-size:42px">${won?'🎉':draw?'🤝':'😞'}</div><h2 style="margin:2px 0;color:${won?'#3ee68a':draw?'#fff':'#ff5d73'}">${won?'VÍTĚZSTVÍ':draw?'REMÍZA':'PROHRA'}</h2>
 <div class="b" style="font-size:22px">${esc(S.clubs[M.h.cid].n)} ${M.score[0]}:${M.score[1]} ${esc(S.clubs[M.a.cid].n)}</div></div>
 ${gs.length?`<div class="card" style="padding:8px 12px;margin-top:10px">${gs.map(e=>`<div class="row small" style="padding:2px 0;${e.s===1?'flex-direction:row-reverse;text-align:right':''}"><b class="mut">${e.m}'</b><span>⚽ ${esc(P(e.p)?P(e.p).n:'')}${e.pen?' (pen.)':''}</span></div>`).join('')}</div>`:''}
 ${bp?`<div class="small c" style="margin:8px 0">⭐ Hráč zápasu: <b>${esc(bp.n)}</b> (${finite(M.rt[best]).toFixed(1).replace('.',',')})</div>`:''}
 <div class="card lineup" style="padding:8px 10px"><h3>Známky tvých hráčů</h3>${mine.map(id=>`<div class="lr">${posB(P(id).pos)}<span class="n">${esc(P(id).n)}</span>${rtB(M.rt[id])}</div>`).join('')}</div>
 ${M.h.user?`<div class="small mut c" style="margin-bottom:8px">Návštěva ${fmtNum(M.att)} diváků · vstupné ${fmtMoney(M.gate)}</div>`:''}
 <button class="btn big gold" id="endc">Pokračovat</button>`,{noClose:true});bg.style.zIndex=130;
 $('#endc').onclick=()=>{closeModal();const w=$('#mv');if(w)w.remove();document.body.style.overflow='';MS=null;
  if(M.h.user)money(M.gate,'gate','Vstupné: '+opp.n);
  const tr=won?'výhrou':draw?'remízou':'porážkou';addNews(won?'✅':draw?'➖':'❌',`${S.clubs[M.h.cid].n} – ${S.clubs[M.a.cid].n} ${M.score[0]}:${M.score[1]}. Zápas skončil ${tr} tvého týmu.${bp&&bp.cl===S.clubId?' Hráčem zápasu byl '+bp.n+'.':''}`);
  advanceRound(M.result);};}
function advanceRound(result){playRound(result);weekTick();S.round++;
 if(S.round<S.maxRound){const pos=tablePos(S.clubId);if(S.round%5===0)addNews('📊',`Po ${S.round}. kole je tvůj tým na ${pos}. místě tabulky.`,1);}
 if(S.round===Math.floor(S.maxRound/2)-1)addNews('🔔','Otevírá se zimní přestupové okno.');
 if(S.round===4)addNews('🔒','Letní přestupové okno se zavřelo.',1);
 saveGame();render();window.scrollTo(0,0);
 if(seasonOver())setTimeout(()=>toast('Odehráno poslední kolo sezóny!'),300);}
function uiEndSeason(){const rep=endSeason();const me=myClub();
 const moveTxt=rep.myMove>0?`<div class="b good" style="font-size:16px;margin:6px 0">⬆️ Postup do soutěže ${esc(leagueLabel(me.lg))}!</div>`:rep.myMove<0?`<div class="b bad" style="font-size:16px;margin:6px 0">⬇️ Sestup do soutěže ${esc(leagueLabel(me.lg))}</div>`:'';
 const verdict=rep.pos<=rep.exp-2?'Vedení je nadšené, výrazně jsi překonal očekávání.':rep.pos<=rep.exp?'Vedení je spokojené, cíl sezóny jsi splnil.':rep.pos<=rep.exp+2?'Vedení je mírně zklamané, cíl jsi těsně nesplnil.':'Vedení je nespokojené, výsledky byly hluboko pod očekáváním.';
 modal(`<div class="c"><div style="font-size:46px">${rep.pos===1?'🏆':rep.myMove>0?'🎉':rep.myMove<0?'😢':'📋'}</div><h2>Sezóna ${seasonLabel(rep.season)}</h2><div class="b" style="font-size:18px">${rep.pos}. místo z ${rep.n}</div><div class="small mut">${rep.pts} bodů · ${rep.w} výher, ${rep.d} remíz, ${rep.l} proher · skóre ${rep.gf}:${rep.ga}</div>${moveTxt}</div>
 <div class="card" style="margin-top:10px;padding:10px 12px"><div class="small">${verdict}</div><div class="small" style="margin-top:6px">Důvěra vedení: <b>${rep.trust} %</b></div><div class="small" style="margin-top:6px">Prémie za umístění: <b class="gold">${fmtMoney(rep.prize)}</b></div>
 ${rep.topScorer?`<div class="small" style="margin-top:6px">Král střelců: <b>${esc(rep.topScorer.n)}</b> (${esc(rep.topScorer.club)}, ${rep.topScorer.g} ${czPlural(rep.topScorer.g,'gól','góly','gólů')})</div>`:''}
 ${rep.retired.length?`<div class="small" style="margin-top:6px">Konec kariéry: ${rep.retired.map(esc).join(', ')}</div>`:''}
 ${rep.youth.length?`<div class="small" style="margin-top:6px">Z akademie přicházejí: <b>${rep.youth.map(esc).join(', ')}</b></div>`:''}</div>
 ${rep.fired?`<div class="card" style="border-color:var(--bad)"><b class="bad">Vedení s tebou ukončilo spolupráci.</b><div class="small mut" style="margin-top:4px">Můžeš převzít jiný klub ve stejné zemi.</div></div><button class="btn big red" onclick="closeModal();firedPick()">Vybrat nový klub</button>`:`<button class="btn big gold" onclick="closeModal();render();window.scrollTo(0,0)">Začít sezónu ${seasonLabel(S.season)}</button>`}`,{noClose:true});}
function firedPick(){const ids=Object.keys(S.clubs).filter(id=>id!==S.clubId).sort((a,b)=>S.clubs[a].rep-S.clubs[b].rep);const low=ids.filter(id=>S.clubs[id].rep<=myClub().rep).slice(-8);const opts=(low.length?low:ids.slice(0,8));
 modal(`<h2>Nabídky práce</h2><div class="small mut" style="margin-bottom:8px">O tvé služby mají zájem tyto kluby:</div>${opts.map(id=>{const c=S.clubs[id];return `<button class="lgpick" onclick="takeClub('${id}')">${badge(c)}<span class="t"><b>${esc(c.n)}</b><small>${esc(leagueLabel(c.lg))} · síla ${c.rep}</small></span></button>`;}).join('')}`,{noClose:true});}
function takeClub(id){S.clubId=id;S.tac=defaultTactic(id);S.boardTrust=50;S.offers=[];addNews('🤝',`${S.manager} převzal klub ${myClub().n}.`);saveGame();closeModal();render();}
// ===================== ULOŽENÍ =====================
function migrateSave(s){if(!s||typeof s!=='object')return s;s.v=s.v||1;
 const D={news:[],inbox:[],offers:[],fin:{log:[]},history:[],training:{focus:'bal',int:2},cohesion:55,boardTrust:60,gone:{},trophies:[],settings:{speed:2,sound:false},nextId:1,seasonLog:[],bets:[],betBank:0,achievements:{}};
 for(const k in D)if(s[k]==null)s[k]=JSON.parse(JSON.stringify(D[k]));
 if(!s.settings.speed)s.settings.speed=2;if(!s.finSeason)s.finSeason={inc:0,exp:0,gate:0,tv:0,wages:0,tr_in:0,tr_out:0,prize:0};
 for(const id in s.players||{}){const p=s.players[id];if(!p.st)p.st={ap:0,g:0,as:0,yc:0,rc:0,rt:0,cs:0,min:0};if(!p.form)p.form=[];if(!p.car)p.car={ap:0,g:0};if(p.cond==null)p.cond=100;if(p.mor==null)p.mor=70;if(p.inj==null)p.inj=0;if(p.sus==null)p.sus=0;if(p.yc==null)p.yc=0;if(!p.a)p.a=[50,50,50,50,50,50];}
 for(const id in s.clubs||{}){const c=s.clubs[id];if(!c.pl)c.pl=[];if(c.money==null)c.money=0;if(!c.cap)c.cap=5000;if(!c.ticket)c.ticket=10;if(c.tv==null)c.tv=0;if(c.wageBase==null)c.wageBase=c.tv;}
 if(s.tac){const t=s.tac;if(!t.ment)t.ment='bal';if(!t.press)t.press='mid';if(!t.style)t.style='short';if(!t.bench)t.bench=[];if(!FORMS[t.form])t.form='4-4-2';}
 s.v=FM_VER;return s;}
function saveGame(){if(!S)return;try{S.v=FM_VER;if(S.news.length>90)S.news.length=90;const js=JSON.stringify(S,(k,v)=>typeof v==='number'&&v%1!==0?Math.round(v*100)/100:v);
 if(!STORE.set(SAVE_KEY,js)&&!S._warned){S._warned=1;toast('⚠️ Hru nelze uložit do prohlížeče (soukromý režim?). Použij Export.');}}catch(e){console.warn('save',e);}}
function loadGame(){try{const raw=STORE.get(SAVE_KEY);if(!raw)return false;S=migrateSave(JSON.parse(raw));if(!S||!S.clubs||!S.players||!S.clubId||!S.clubs[S.clubId])throw new Error('poškozené uložení');if(!S.tac)S.tac=defaultTactic(S.clubId);return true;}catch(e){console.warn(e);S=null;return false;}}
function resetGame(){STORE.del(SAVE_KEY);S=null;}
function exportSave(){try{const blob=new Blob([JSON.stringify(S)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='fotbal-manazer-'+seasonLabel(S.season).replace('/','-')+'.json';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);}catch(e){toast('Export se nepovedl.');}}
function importSave(inp){const f=inp.files&&inp.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const s=migrateSave(JSON.parse(r.result));if(!s.clubs||!s.players||!s.clubId)throw 0;S=s;saveGame();UI.tab='home';render();toast('Hra načtena ✓');}catch(e){toast('Soubor není platné uložení hry.');}};r.readAsText(f);}


// ---------- boot ----------
window.FM_DATA_VER='a815a5fa';
(function(){try{if(!loadGame())S=null;render();var sp=document.getElementById('splash');if(sp){sp.classList.add('gone');setTimeout(function(){sp.remove();},450);}}catch(e){window.__bootErr(e);}})();
