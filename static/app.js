const $=id=>document.getElementById(id);
const esc=s=>String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const show=id=>$(id)&&$(id).classList.remove("H");
const hide=id=>$(id)&&$(id).classList.add("H");
const tog=(id,v)=>v?show(id):hide(id);

let S=null,myCode="",myPid="",myPName="";
let selT="item",selG="A",selSz="1",selMw=3;
let saSelT="item",saSelG="A",saSelSz="1";
let acTmr=null,pollTmr=null,revTmr=null;
let superSecret="";

async function api(path,method="GET",body=null){
  const o={method,headers:{"Content-Type":"application/json"}};
  if(body) o.body=JSON.stringify(body);
  try{const r=await fetch(path,o);if(!r.ok){const ct=r.headers.get("content-type")||"";if(!ct.includes("json")){console.error("Server error:",r.status,path);return{error:`Serverfehler ${r.status}`};}}return r.json();}catch(e){console.error("API:",path,e);return{error:"Netzwerkfehler"};}
}

function cpText(txt){
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).catch(()=>fbCopy(txt));
  } else fbCopy(txt);
}
function fbCopy(txt){
  const ta=document.createElement("textarea");ta.value=txt;ta.style="position:fixed;opacity:0";
  document.body.appendChild(ta);ta.focus();ta.select();
  try{document.execCommand("copy");showToast(t("copy.success",{text:txt}));}catch(e){showToast(t("copy.fallback",{text:txt}));}
  document.body.removeChild(ta);
}

// ── Modal / Toast system ──────────────────────────────────────────
function _mkOv(closable){
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  if(closable) ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
  return ov;
}
function _mkBox(html){
  const b=document.createElement('div');
  b.className='card';b.style.cssText='max-width:420px;width:100%;padding:20px 22px';
  b.innerHTML=html; return b;
}
function showAlert(msg){
  const ov=_mkOv(true);
  const b=_mkBox(`<div style="font-size:14px;line-height:1.7;margin-bottom:16px;white-space:pre-wrap">${msg}</div>
    <div style="text-align:right"><button class="btn btn-acc">${t('btn.ok')||'OK'}</button></div>`);
  b.querySelector('button').onclick=()=>ov.remove();
  ov.appendChild(b);document.body.appendChild(ov);
  setTimeout(()=>b.querySelector('button').focus(),50);
}
function showConfirm(msg){
  return new Promise(res=>{
    const ov=_mkOv(false);
    const b=_mkBox(`<div style="font-size:14px;line-height:1.7;margin-bottom:16px;white-space:pre-wrap">${msg}</div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-sm" id="_mn">${t('btn.cancel')||'Abbrechen'}</button>
        <button class="btn btn-acc" id="_my">${t('btn.yes')||'Ja'}</button>
      </div>`);
    const done=v=>{ov.remove();res(v);};
    b.querySelector('#_my').onclick=()=>done(true);
    b.querySelector('#_mn').onclick=()=>done(false);
    ov.appendChild(b);document.body.appendChild(ov);
    setTimeout(()=>b.querySelector('#_my').focus(),50);
  });
}
function showPrompt(label,def=''){
  return new Promise(res=>{
    const ov=_mkOv(false);
    const b=_mkBox(`<div style="font-size:14px;margin-bottom:10px">${label}</div>
      <input id="_pi" class="w100 mb8" value="${esc(String(def))}"/>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-sm" id="_mn">${t('btn.cancel')||'Abbrechen'}</button>
        <button class="btn btn-acc" id="_my">${t('btn.ok')||'OK'}</button>
      </div>`);
    const inp=b.querySelector('#_pi');
    const done=v=>{ov.remove();res(v);};
    b.querySelector('#_my').onclick=()=>done(inp.value);
    b.querySelector('#_mn').onclick=()=>done(null);
    inp.onkeydown=e=>{if(e.key==='Enter')done(inp.value);if(e.key==='Escape')done(null);};
    ov.appendChild(b);document.body.appendChild(ov);
    setTimeout(()=>{inp.focus();inp.select();},50);
  });
}
function showPromptPassword(label){
  return new Promise(res=>{
    const ov=_mkOv(false);
    const b=_mkBox(`<div style="font-size:14px;margin-bottom:10px">${label}</div>
      <input id="_pi" class="w100 mb8" type="password"/>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-sm" id="_mn">${t('btn.cancel')||'Abbrechen'}</button>
        <button class="btn btn-acc" id="_my">${t('btn.ok')||'OK'}</button>
      </div>`);
    const inp=b.querySelector('#_pi');
    const done=v=>{ov.remove();res(v);};
    b.querySelector('#_my').onclick=()=>done(inp.value||null);
    b.querySelector('#_mn').onclick=()=>done(null);
    inp.onkeydown=e=>{if(e.key==='Enter')done(inp.value||null);if(e.key==='Escape')done(null);};
    ov.appendChild(b);document.body.appendChild(ov);
    setTimeout(()=>inp.focus(),50);
  });
}
function showToast(msg,ms=2800){
  const el=document.createElement('div');
  el.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--bg3);border:1px solid var(--bdr);color:var(--t0);padding:10px 22px;border-radius:var(--r);font-size:13px;z-index:9999;pointer-events:none;white-space:nowrap';
  el.textContent=msg;document.body.appendChild(el);
  setTimeout(()=>{el.style.transition='opacity .35s';el.style.opacity='0';setTimeout(()=>el.remove(),370);},ms);
}
// ─────────────────────────────────────────────────────────────────

function pillsHTML(l){
  let h="";
  if(l.type&&l.type!=="item"){
    const c={MIL:"mil",STE:"ste",COM:"com",CIV:"civ",IND:"ind"}[l.type]||"gray";
    h+=`<span class="pill p-${c}">${esc(l.type)}</span>`;
  }
  if(l.grade) h+=`<span class="pill p-grade">GR-${esc(l.grade)}</span>`;
  if(l.size!=null&&l.size!=="")  h+=`<span class="pill p-size">S${esc(l.size)}</span>`;
  return h;
}
function initials(n){
  const k=n.match(/\(([^)]+)\)$/);
  if(k) return k[1].slice(0,2).toUpperCase();
  return (n.replace(/^\[[^\]]*\]/,"").trim()||n).slice(0,2).toUpperCase();
}
function fmtN(n,dec=0){const loc=getLang()==="en"?"en-GB":"de-DE";return n==null?"—":Number(n).toLocaleString(loc,{maximumFractionDigits:dec});}
function totalItems(s){return(s.loot||[]).filter(l=>!l.for_sale).reduce((a,l)=>a+l.qty,0);}
function totalWishes(s){return(s.participants||[]).reduce((a,p)=>a+(p.wishes||[]).length,0);}

/** Group identical won items and render as chip spans with ×N count. */
function groupedChips(won){
  const map=new Map();
  for(const w of (won||[])){
    const k=`${w.name}||${w.type||''}||${w.grade||''}||${w.size||''}`;
    if(!map.has(k)) map.set(k,{w,n:0});
    map.get(k).n++;
  }
  return [...map.values()].map(({w,n})=>{
    let txt=`📦 ${esc(w.name)}`;
    if(w.type) txt+=` ${w.type}`;
    if(w.grade) txt+=` GR-${w.grade}`;
    if(w.size)  txt+=` S${w.size}`;
    if(n>1) txt+=` <strong style="color:var(--acc)">×${n}</strong>`;
    return`<span class="chip">${txt}</span>`;
  }).join('');
}

// ── HOME ──────────────────────────────────────────────────────────────────────
function showPage(pg){["pg-home","pg-admin","pg-part","pg-super","pg-ro","pg-org","pg-org-admin"].forEach(p=>hide(p));show(pg);}
function openAbout(){document.getElementById('about-modal').classList.remove('H');}
function closeAbout(){document.getElementById('about-modal').classList.add('H');}

async function loadHome(){
  showPage("pg-home");hide("spill");hide("btn-leave");stopPoll();
  document.body.style.backgroundImage='';
  history.replaceState(null,'','#');
  // Load aggregate stats
  api("/api/stats").then(st=>{
    if(st.error){$("home-stats").innerHTML="";return;}
    $("home-stats").innerHTML=`
      <div class="stat" style="background:var(--bg2)">
        <div class="sv">${fmtN(st.session_count)}</div>
        <div class="sl">${t("stats.events")}</div>
      </div>
      <div class="stat" style="background:var(--bg2)">
        <div class="sv">${fmtN(st.total_loot_raffled)}</div>
        <div class="sl">${t("stats.raffled")}</div>
      </div>`;
  });
  // Show org list instead of global event list
  const el=$("org-list");
  if(!el) return;
  el.innerHTML=`<div class="empty">…</div>`;
  const orgs=await api("/api/orgs");
  if(!orgs||orgs.error||!orgs.length){el.innerHTML=`<div class="empty">${t("home.orgs.empty")}</div>`;return;}
  el.innerHTML=orgs.map(o=>`
    <div class="ir" style="cursor:pointer" onclick="$('org-code-inp').value='${esc(o.code)}';document.getElementById('org-login-panel').scrollIntoView({behavior:'smooth'})">
      <div class="im f1" style="display:flex;align-items:center;gap:10px">
        ${o.logo_url?`<img src="${esc(o.logo_url)}" style="height:32px;border-radius:4px" onerror="this.style.display='none'"/>`:
          `<div style="width:32px;height:32px;border-radius:4px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:14px;color:var(--acc)">◈</div>`}
        <div>
          <div class="in">${esc(o.name)}</div>
          <div class="is" style="font-size:10px;letter-spacing:2px">${esc(o.code)}</div>
        </div>
      </div>
      <button class="btn btn-xs btn-acc" onclick="event.stopPropagation();$('org-code-inp').value='${esc(o.code)}';loginOrg()">${t("org.code.btn")}</button>
    </div>`).join('');
}

function saveCreatorCode(sid,code){try{const m=JSON.parse(localStorage.getItem("sclm_creator")||"{}");m[sid]=code;localStorage.setItem("sclm_creator",JSON.stringify(m));}catch(e){}}
function getCreatorCode(sid){try{return(JSON.parse(localStorage.getItem("sclm_creator")||"{}"))[sid]||null;}catch(e){return null;}}
function togCreatePanel(){$("create-panel").classList.toggle("H");}
function sMw(btn){$("mw-grp").querySelectorAll(".tgl").forEach(b=>b.className="tgl");btn.classList.add("st");selMw=+btn.dataset.v;}

async function createSession(){
  const name=$("new-name").value.trim();if(!name) return;
  const r=await api("/api/session/create","POST",{name,max_wishes:selMw});
  if(r.error){$("create-err").textContent=r.error;show("create-err");return;}
  hide("create-err");myCode=r.admin_code;S=await api(`/api/session/${r.admin_code}`);
  saveCreatorCode(S.id,r.admin_code);showAdminView();
}

async function importRH(inp){
  const file=inp.files[0];if(!file) return;
  let jd;try{jd=JSON.parse(await file.text());}catch(e){showAlert(t("err.invalid_json"));return;}
  const r=await api("/api/raidhelper/parse","POST",{json_data:jd});
  if(r.error){showAlert(r.error);return;}
  $("new-name").value=r.name;show("create-panel");
  const prev=r.participants.slice(0,8).join(", ")+(r.participants.length>8?"...":"");
  if(!await showConfirm(t("confirm.create_session",{name:r.name,count:r.participants.length})+`\n\n${prev}`)) return;
  const cr=await api("/api/session/create","POST",{name:r.name,max_wishes:selMw,image_url:r.image_url||null});
  if(cr.error){showAlert(cr.error);return;}
  for(const nm of r.participants) await api(`/api/session/${cr.id}/participants`,"POST",{code:cr.admin_code,name:nm,added_by:"admin"});
  myCode=cr.admin_code;S=await api(`/api/session/${cr.admin_code}`);
  saveCreatorCode(S.id,cr.admin_code);showAdminView();
}

async function loginCode(){
  const code=$("code-inp").value.trim().toUpperCase();if(!code) return;
  const r=await api(`/api/session/${code}`);
  if(r.error){$("code-err").textContent=r.error;show("code-err");return;}
  hide("code-err");S=r;myCode=code;
  if(r.is_admin){if(r.admin_code)saveCreatorCode(r.id,r.admin_code);showAdminView();}else showPartView();
}
async function quickAdminLogin(sid){
  const code=getCreatorCode(sid);if(!code)return;
  const r=await api(`/api/session/${code}`);
  if(r.error){showAlert(t("err.code_invalid"));return;}
  S=r;myCode=code;showAdminView();
}
async function openRO(jc){
  if(ORG){
    const r=await api(`/api/session/${jc}`);
    if(r.error){showAlert(r.error);return;}
    window.location.hash=`org/${ORG.code}/${r.id}/guest`;
    return;
  }
  const r=await api(`/api/session/${jc}`);
  if(r.error){showAlert(r.error);return;}
  S=r;myCode=jc;showROView();
}

function goHome(){myCode="";myPid="";myPName="";S=null;document.body.style.backgroundImage="";loadHome();}
async function goAdmin(){
  const sec=await showPromptPassword(t("adm.prompt.secret"));
  if(!sec) return;
  const r=await api("/api/admin/verify","POST",{secret:sec});
  if(r.error){showAlert(t("adm.err.wrong_pw"));return;}
  superSecret=sec;loadSuperAdmin();
}
function leaveSess(){
  stopPoll();clearInterval(adminPollTmr);
  S=null;myCode='';
  if(ORG){showOrgLobby();}else{goHome();}
}

// ── READ-ONLY VIEW ────────────────────────────────────────────────────────────
function showROView(){
  showPage("pg-ro");hide("spill");hide("btn-leave");
  applySessionBg();
  history.replaceState(null,'',(ORG&&S)?`#org/${ORG.code}/${S.id}/guest`:`#ro/${myCode}`);
  $("ro-title").textContent=S.name.toUpperCase();
  $("ro-sub").textContent=`${S.created} // ${S.locked?t("ro.status.locked"):t("ro.status.active")}`;
  // stats
  const n=S.participants.length;
  const ti=totalItems(S);
  const sum=S.commodity_summary||{};
  const roRawRev=sum.total_revenue!=null?sum.total_revenue:null;
  const roNetRev=roRawRev!=null?Math.round(roRawRev*0.995):null;
  const roPerRaw=roNetRev!=null&&n>0?Math.round(roNetRev/n):null;
  const roPerNet=roPerRaw!=null?Math.round(roPerRaw*0.995):null;
  $("ro-stats").innerHTML=`
    <div class="stat"><div class="sv">${n}</div><div class="sl">${t("ov.stat.participants")}</div></div>
    <div class="stat"><div class="sv">${ti}</div><div class="sl">${t("ov.stat.items")}</div></div>
    <div class="stat"><div class="sv">${fmtN(sum.total_scu,1)}</div><div class="sl">${t("ro.stat.scu")}</div></div>
    <div class="stat"><div class="sv">${roNetRev!=null?fmtN(roNetRev):"—"}</div><div class="sl">${t("co.sum.net")}</div></div>
    ${roPerNet!=null?`<div class="stat"><div class="sv">${fmtN(roPerNet)} aUEC</div><div class="sl">${t("co.sum.per")}</div></div>`:""}`;
  roTab("loot");
}

function showGuestView(orgCode, sessionId) {
  history.replaceState(null,'',`#org/${orgCode}/${sessionId}/guest`);
  showROView(); // renders RO content; URL already set above
  // Show login card
  const lc = $('ro-guest-login');
  if (!lc) return;
  if (S.locked) {
    lc.innerHTML = `<div class="alert a-info mb8">${t('ro.guest.locked')}</div>`;
  } else {
    lc.innerHTML = `
      <div class="card mb8">
        <div class="ct">${t('ro.guest.login.title')}</div>
        <div class="row c">
          <input id="guest-code-inp" class="f1" style="text-transform:uppercase;letter-spacing:3px" maxlength="6"
                 placeholder="${t('home.login.placeholder')}" oninput="this.value=this.value.toUpperCase()"
                 onkeydown="if(event.key==='Enter')guestLogin('${orgCode}','${sessionId}')"/>
          <button class="btn btn-acc" onclick="guestLogin('${orgCode}','${sessionId}')">${t('home.login.btn')}</button>
        </div>
        <div id="guest-login-err" class="alert a-err H mt8"></div>
      </div>`;
  }
  lc.classList.remove('H');
}

async function guestLogin(orgCode, sessionId) {
  const code = ($('guest-code-inp').value || '').trim().toUpperCase();
  if (!code) return;
  const r = await api(`/api/session/${code}`);
  if (r.error) {
    $('guest-login-err').textContent = r.error;
    show('guest-login-err'); return;
  }
  S = r; myCode = code;
  if (r.is_admin) {
    saveCreatorCode(r.id, code);
    showAdminView();
  } else {
    // Store join code for future route restores
    try {
      const jd = JSON.parse(sessionStorage.getItem('sclm_join')||'{}');
      jd[r.id] = code; sessionStorage.setItem('sclm_join', JSON.stringify(jd));
    } catch(_){}
    showPartView();
  }
}

function roTab(t){
  ["loot","comm","res"].forEach(x=>{tog(`rot-${x}-c`,x===t);$(`rot-${x}`).classList.toggle("active",x===t);});
  if(t==="loot") renderROLoot();
  if(t==="comm") renderROComm();
  if(t==="res")  renderRORes();
}

function renderROLoot(){
  const el=$("ro-loot-list");
  const loot=[...S.loot].sort((a,b)=>a.name.localeCompare(b.name,"de"));
  if(!loot.length){el.innerHTML=`<div class="empty">${t("ro.loot.empty")}</div>`;return;}
  el.innerHTML=loot.map(l=>`
    <div class="ir ${l.for_sale?"sale":""}">
      <div class="im f1">
        <div class="in">${esc(l.name)} <span style="color:var(--t2);font-size:11px">×${l.qty}</span></div>
        <div class="pills">${pillsHTML(l)}${l.for_sale?`<span class="pill p-sale">${t("adm.loot.sale_badge")}</span>`:''}</div>
        ${l.wish_count?`<div class="is">${t("adm.loot.interest",{n:l.wish_count})}</div>`:""}</div>
    </div>`).join("");
}

function renderROComm(){
  const comms=S.commodities||[];
  const el=$("ro-comm-list");
  if(!comms.length){el.innerHTML=`<div class="empty">${t("ro.comm.empty")}</div>`;$("ro-co-sum").innerHTML="";return;}
  el.innerHTML=comms.map(c=>`<div class="ir"><div class="im f1"><div class="in">${esc(c.name)}</div><div class="is">${fmtN(c.scu,1)} SCU</div></div></div>`).join("");
  const sum=S.commodity_summary||{};
  const n=S.participants.length||1;
  const roRev=sum.total_revenue!=null?sum.total_revenue:null;
  const roRevFee=roRev!=null?Math.round(roRev*(1-0.005)):null;
  const roPer=roRevFee!=null?Math.round(Math.round(roRevFee/n)*(1-0.005)):null;
  $("ro-co-sum").innerHTML=`<div class="ct">${t("ro.sum.title")}</div><div class="stats">
    <div class="stat"><div class="sv">${fmtN(sum.total_scu,1)}</div><div class="sl">${t("ro.stat.scu")}</div></div>
    <div class="stat"><div class="sv">${roRevFee!=null?fmtN(roRevFee):"—"}</div><div class="sl">${t("co.sum.net")}</div></div>
    ${roPer!=null?`<div class="stat"><div class="sv">${fmtN(roPer)} aUEC</div><div class="sl">${t("co.sum.per")}</div></div>`:""}
  </div>`;
}

function renderRORes(){
  const el=$("ro-res");
  if(!S.raffle_done||!S.results.length){el.innerHTML=`<div class="empty">${t("ro.res.empty")}</div>`;return;}
  const winners=[...S.results].filter(r=>r.won.length).sort((a,b)=>a.participant_name.localeCompare(b.participant_name,"de"));
  const empty=[...S.results].filter(r=>!r.won.length);
  let html="";
  winners.forEach(r=>{
    const cls=r.won_by_wish?"rr-won":"rr-pool";
    const badge=r.won_by_wish?`<span class="pill p-mil" style="font-size:9px">${t("ra.badge.wish")}</span>`:`<span class="pill p-civ" style="font-size:9px">${t("ra.badge.pool")}</span>`;
    const nc=r.waived?"waiv":r.collected?"coll":"";
    const suf=r.waived?t("ra.status.waived"):"";
    const cstat=r.collected?`<span class="pill p-grade" style="font-size:9px">✓ ABGEHOLT</span>`:`<span class="pill p-gray" style="font-size:9px">○ AUSSTEHEND</span>`;
    const chips=groupedChips(r.won);
    html+=`<div class="rr ${cls} ${r.waived?"rr-waived":""}"><div class="rh">
      <div class="av" style="width:24px;height:24px;font-size:10px">${esc(initials(r.participant_name))}</div>
      <div class="rn ${nc}">${esc(r.participant_name)}${esc(suf)}</div>${badge} ${cstat}</div>
      <div class="rchips">${chips}</div></div>`;
  });
  if(empty.length){
    html+='<div class="divider"></div>';
    empty.forEach(r=>{html+=`<div class="rr rr-none"><div class="rh">
      <div class="av" style="width:24px;height:24px;font-size:10px;opacity:.4">${esc(initials(r.participant_name))}</div>
      <div class="rn" style="color:var(--t2)">${esc(r.participant_name)}</div>
      <span class="pill p-gray" style="font-size:9px">${t("ra.badge.none")}</span></div></div>`;});
  }
  el.innerHTML=html;
}

// ── ADMIN VIEW ────────────────────────────────────────────────────────────────
function applySessionBg(){
  if(S&&S.image_url){
    document.body.style.backgroundImage=`linear-gradient(180deg,rgba(8,12,16,.93) 0%,rgba(8,12,16,.99) 55%),url('${S.image_url}')`;
    document.body.style.backgroundSize="cover";
    document.body.style.backgroundPosition="center top";
    document.body.style.backgroundAttachment="fixed";
  } else {
    document.body.style.backgroundImage="";
  }
}

/** True when current user is an admin of a GUEST org (not the host org). */
function isGuestOrgAdmin(){ return !!(ORG && S && S.org_id && ORG.id && S.org_id !== ORG.id); }

function showAdminView(){
  showPage("pg-admin");show("spill");show("btn-leave");
  applySessionBg();
  history.replaceState(null,'',(ORG&&S)?`#org/${ORG.code}/${S.id}/admin`:`#admin/${myCode}`);
  $("spill-name").textContent=S.name;
  $("adm-title").textContent=S.name.toUpperCase();
  $("dj").textContent=S.join_code;
  $("da").textContent=S.admin_code||'—';
  updOvStats();updLockBtn();updMwAdm();updSubLockBtns();updRevDisplay();
  renderAP();renderAL();renderAC();renderRR();
  // Guest org admin: restrict to participants tab only
  const isGuest=isGuestOrgAdmin();
  ["at-lo","at-co","at-ra"].forEach(id=>{const el=$(id);if(el)el.classList.toggle("H",isGuest);});
  ["lock-btn","raffle-lock-btn","comm-lock-btn"].forEach(id=>{const el=document.getElementById(id);if(el&&isGuest)el.classList.add("H");});
  const sc=document.getElementById('ov-settings-card');if(sc)sc.classList.toggle('H',isGuest);
  aTab(isGuest?"pa":"ov");
}

let adminPollTmr=null;
function aTab(t){
  ["ov","pa","lo","co","ra"].forEach(x=>{tog(`at-${x}-c`,x===t);$(`at-${x}`).classList.toggle("active",x===t);});
  if(t==="ov") renderOvInvitations();
  if(t==="ra") renderRS();
  // Auto-refresh participants and raffle tabs
  clearInterval(adminPollTmr);
  if(t==="pa"||t==="ra"){
    adminPollTmr=setInterval(async()=>{
      await reloadS();
      if(t==="pa") renderAP();
      if(t==="ra"){ renderRS(); renderRR(); }
    },t==="pa"?4000:6000);
  }
}

function updOvStats(){
  $("ov-p").textContent=S.participants.length;
  $("ov-i").textContent=totalItems(S);
  $("ov-w").textContent=totalWishes(S);
  $("ov-m").textContent=S.max_wishes;
}
function updLockBtn(){
  const lb=$("lock-btn");lb.textContent=S.locked?t("adm.lock.locked"):t("adm.lock.open");
  lb.className=S.locked?"btn btn-sm btn-gold":"btn btn-sm";
}
function updMwAdm(){$("mw-adm").querySelectorAll(".tgl").forEach(b=>{b.className="tgl"+(+b.dataset.v===S.max_wishes?" st":"");});}

async function toggleLock(){
  if(S.locked){
    showAlert(t("err.event_locked"));
    return;
  }
  if(!await showConfirm(t("confirm.lock"))) return;
  await api(`/api/session/${S.id}/settings`,"PATCH",{code:myCode,locked:true});
  await reloadS();showAdminView();
}
async function setMW(v){await api(`/api/session/${S.id}/settings`,"PATCH",{code:myCode,max_wishes:v});await reloadS();updOvStats();updMwAdm();}
async function reloadS(){S=await api(`/api/session/${myCode}`);}
async function regenCodes(){
  if(!await showConfirm(t("confirm.regen"))) return;
  const r=await api(`/api/session/${S.id}/regenerate_codes`,"POST",{code:myCode});
  if(r.error){showAlert(r.error);return;}
  myCode=r.admin_code;
  await reloadS();
  history.replaceState(null,'',(ORG&&S)?`#org/${ORG.code}/${S.id}/admin`:`#admin/${myCode}`);
  $("dj").textContent=S.join_code;$("da").textContent=S.admin_code;
}
function cpCode(w){cpText(w==="admin"?S.admin_code:S.join_code);}

// participants
function renderAP(){
  const el=$("adm-p-list");
  if(!S.participants.length){el.innerHTML=`<div class="empty">${t("pa.empty")}</div>`;return;}
  const isGuest=isGuestOrgAdmin();
  el.innerHTML=[...S.participants].sort((a,b)=>a.name.localeCompare(b.name,"de")).map(p=>{
    const wn=(p.wishes||[]).map(id=>{const l=S.loot.find(x=>x.id===id);return l?esc(l.name):null;}).filter(Boolean);
    const isExtPart=p.invited_org_id&&p.invited_org_id.startsWith('ext:');
    const guestBadge=p.invited_org_id
      ?(isExtPart
        ?`<span class="pill p-amb" style="font-size:9px">${t('invite.type.external')}</span> `
        :`<span class="pill p-civ" style="font-size:9px" title="${t('invite.participant.guest_org')}">${t('invite.participant.guest')}</span> `)
      :"";
    const canRemove=!S.locked&&(!isGuest||p.invited_org_id===ORG?.id);
    const canEditWishes=!S.locked&&!isGuest;
    return `<div class="ir">
      <div class="av">${esc(initials(p.name))}</div>
      <div class="im f1"><div class="in">${guestBadge}${esc(p.name)}</div>
        <div class="is">${wn.length?"🎯 "+wn.join(" · "):t("pa.no_wishes")}</div></div>
      ${canEditWishes?`<button class="btn btn-xs btn-acc" onclick="openWishEdit('${p.id}')">${t("pa.btn.wishes")}</button>`:""}
      ${canRemove?`<button class="btn btn-xs btn-red" onclick="removeP('${p.id}')">✕</button>`:""}
    </div>`;
  }).join("");
}

async function addP(){
  const names=$("p-inp").value.split(",").map(n=>n.trim()).filter(Boolean);if(!names.length) return;
  const invOrgId=isGuestOrgAdmin()?ORG.id:null;
  for(const n of names) await api(`/api/session/${S.id}/participants`,"POST",
    {code:myCode,name:n,added_by:"admin",...(invOrgId?{invited_org_id:invOrgId}:{})});
  $("p-inp").value="";acClose("p-ac");await reloadS();renderAP();updOvStats();
}
async function removeP(pid){
  if(!await showConfirm(t("pt.del_confirm"))) return;
  const callerQs=isGuestOrgAdmin()?`&caller_org_id=${ORG.id}`:"";
  await fetch(`/api/session/${S.id}/participants/${pid}?code=${myCode}${callerQs}`,{method:"DELETE"});
  await reloadS();renderAP();updOvStats();
}
async function acP(q){
  if(!q){acClose("p-ac");return;}clearTimeout(acTmr);
  acTmr=setTimeout(async()=>{
    const _acOrgId=isGuestOrgAdmin()?ORG.id:(S&&S.org_id?S.org_id:"default");
    const _orgParam3=`&org_id=${_acOrgId}`;
    const r=await api(`/api/participants/search?q=${encodeURIComponent(q)}${_orgParam3}`);acRender("p-ac",r,n=>{$("p-inp").value=n;acClose("p-ac");});},180);
}

function openWishEdit(pid){
  const p=S.participants.find(x=>x.id===pid);if(!p) return;
  const sel=new Set(p.wishes||[]);
  const modal=document.createElement("div");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:1000;display:flex;align-items:center;justify-content:center";
  const box=document.createElement("div");
  const _z=parseFloat(document.body.style.zoom||"1");
  box.style.cssText=`background:var(--bg2);border:1px solid var(--bdr2);border-radius:var(--r2);padding:20px;width:440px;max-width:96vw;max-height:${Math.floor(88/_z)}vh;overflow-y:auto;display:flex;flex-direction:column`;
  const lootAvail=[...S.loot].filter(l=>!l.for_sale).sort((a,b)=>a.name.localeCompare(b.name,"de"));
  box.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
    <div style="font-family:monospace;font-size:12px;font-weight:700;color:var(--acc)">${esc(p.name.toUpperCase())} — ${t("pa.btn.wishes").toUpperCase()}</div>
    <button class="btn btn-xs btn-red" id="close-we">✕</button></div>
  <div id="we-items">${lootAvail.length?lootAvail.map(l=>`
    <div class="wi ${sel.has(l.id)?"sel-w":""}" data-lid="${l.id}" onclick="weToggle(this,'${l.id}')">
      <input type="checkbox" class="wcb" ${sel.has(l.id)?"checked":""} onclick="event.stopPropagation();weToggle(this.closest('.wi'),'${l.id}')"/>
      <div><div style="font-weight:600;font-size:13px">${esc(l.name)} <span style="color:var(--t2);font-size:11px">×${l.qty}</span></div>
        <div class="pills">${pillsHTML(l)}</div></div></div>`).join("")
    :`<div class="empty">${t("we.no_loot")}</div>`}</div>
  <button class="btn btn-acc btn-full mt8" id="save-we">${t("pt.wish.save")}</button>`;
  modal.appendChild(box);document.body.appendChild(modal);
  let cur=new Set(sel);
  window.weToggle=(el,lid)=>{
    if(cur.has(lid)){cur.delete(lid);el.classList.remove("sel-w");el.querySelector(".wcb").checked=false;}
    else{cur.add(lid);el.classList.add("sel-w");el.querySelector(".wcb").checked=true;}
  };
  const _iEl=box.querySelector("#we-items");const _sw=document.createElement("div");_sw.style.cssText="overflow-y:auto;flex:1;min-height:60px";box.insertBefore(_sw,_iEl);_sw.appendChild(_iEl);box.querySelector("#save-we").style.flexShrink="0";
  $("close-we").onclick=()=>modal.remove();
  $("save-we").onclick=async()=>{
    await api(`/api/session/${S.id}/wishes`,"POST",{code:myCode,participant_id:pid,loot_ids:[...cur],mode:"wish"});
    modal.remove();await reloadS();renderAP();
  };
}

function openInterestEdit(lid){
  const l=S.loot.find(x=>x.id===lid); if(!l) return;
  const interested=new Set(S.participants.filter(p=>(p.wishes||[]).includes(lid)).map(p=>p.id));
  const modal=document.createElement("div");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:1000;display:flex;align-items:center;justify-content:center";
  const box=document.createElement("div");
  box.style.cssText="background:var(--bg2);border:1px solid var(--bdr2);border-radius:var(--r2);padding:20px;width:440px;max-width:96vw;max-height:82vh;overflow-y:auto";
  box.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
    <div style="font-family:monospace;font-size:12px;font-weight:700;color:var(--acc)">${esc(l.name.toUpperCase())} — INTERESSE</div>
    <button class="btn btn-xs btn-red" id="close-ie">✕</button></div>
  <div class="alert a-info mb8" style="font-size:11px">${t("lo.btn.interest")} ${t("lo.btn.interest.hint")}</div>
  <div id="ie-items">${S.participants.length?[...S.participants].sort((a,b)=>a.name.localeCompare(b.name,"de")).map(p=>`
    <div class="wi ${interested.has(p.id)?"sel-w":""}" data-pid="${p.id}" onclick="ieToggle(this,'${p.id}')">
      <input type="checkbox" class="wcb" ${interested.has(p.id)?"checked":""} onclick="event.stopPropagation();ieToggle(this.closest('.wi'),'${p.id}')"/>
      <div style="font-weight:600;font-size:13px">${esc(p.name)}</div>
    </div>`).join("")
    :`<div class="empty">${t("sa.empty.participants")}</div>`}</div>
  <button class="btn btn-acc btn-full mt8" id="save-ie">${t("pt.wish.save")}</button>`;
  modal.appendChild(box);document.body.appendChild(modal);
  let cur=new Set(interested);
  window.ieToggle=(el,pid)=>{
    if(cur.has(pid)){cur.delete(pid);el.classList.remove("sel-w");el.querySelector(".wcb").checked=false;}
    else{cur.add(pid);el.classList.add("sel-w");el.querySelector(".wcb").checked=true;}
  };
  $("close-ie").onclick=()=>modal.remove();
  $("save-ie").onclick=async()=>{
    // For each participant, update their wishes accordingly
    for(const p of S.participants){
      const wishes=new Set(p.wishes||[]);
      const hadIt=wishes.has(lid), wantsIt=cur.has(p.id);
      if(hadIt===wantsIt) continue;
      if(wantsIt) wishes.add(lid); else wishes.delete(lid);
      await api(`/api/session/${S.id}/wishes`,"POST",{code:myCode,participant_id:p.id,loot_ids:[...wishes],mode:"wish"});
    }
    modal.remove();await reloadS();renderAL();renderAP();
  };
}

// loot
let acItemsRaw=[], selCat="item", selWSz="1";
function sCat(btn){
  $("cat-grp").querySelectorAll(".tgl").forEach(b=>b.className="tgl");
  selCat=btn.dataset.v;
  btn.classList.add(selCat==="item"?"si":"st");
  tog("cat-weapon-f",selCat==="weapon"); tog("cat-comp-f",selCat==="comp");
}
function sWSz(btn){$("sw-sz-grp").querySelectorAll(".tgl").forEach(b=>b.className="tgl");selWSz=btn.dataset.v;btn.classList.add("ss");}
function sT(btn){$("ty-grp").querySelectorAll(".tgl").forEach(b=>b.className="tgl");selT=btn.dataset.v;btn.classList.add("st");}
function sG(btn){$("gr-grp").querySelectorAll(".tgl").forEach(b=>b.className="tgl");selG=btn.dataset.v;btn.classList.add("sg");}
function sS(btn){$("sz-grp").querySelectorAll(".tgl").forEach(b=>b.className="tgl");selSz=btn.dataset.v;btn.classList.add("ss");}

function renderAL(){
  const el=$("adm-l-list");
  if(!S.loot.length){el.innerHTML=`<div class="empty">${t("lo.empty")}</div>`;return;}
  el.innerHTML=[...S.loot].sort((a,b)=>a.name.localeCompare(b.name,"de")).map(l=>`
    <div class="ir ${l.for_sale?"sale":""}">
      <div class="im f1">
        <div class="in">${esc(l.name)} <span style="color:var(--t2);font-size:11px">×${l.qty}</span></div>
        <div class="pills">${pillsHTML(l)}${l.for_sale?`<span class="pill p-sale">${t("adm.loot.sale_badge")}</span>`:''}</div>
        ${l.wish_count&&!l.for_sale?`<div class="is">${t("adm.loot.interest",{n:l.wish_count})}</div>`:""}</div>
      <div style="display:flex;gap:3px;align-items:center;flex-wrap:wrap">
        ${!S.raffle_locked?
          `<button class="btn btn-xs" onclick="chQty('${l.id}',-1)">−</button>
           <button class="btn btn-xs" onclick="chQty('${l.id}',1)">+</button>
           ${!l.for_sale?`<button class="btn btn-xs btn-acc" onclick="openInterestEdit('${l.id}')">${t("lo.btn.interest")}</button>`:""}
           <button class="btn btn-xs ${l.for_sale?"btn-grn":"btn-amb"}" onclick="togSale('${l.id}',${!l.for_sale})">${l.for_sale?t("lo.btn.unsale"):t("lo.btn.sale")}</button>
           <button class="btn btn-xs btn-red" onclick="removeL('${l.id}')">✕</button>`
          :""}
        ${l.for_sale?(S.commodities_locked
          ? `<span style="color:var(--t1);font-size:13px">${l.sale_revenue!=null ? fmtN(l.sale_revenue)+' aUEC' : '—'}</span>`
          : `<input type="number" placeholder="${t('co.rev.total.unit')}" value="${l.sale_revenue!=null?l.sale_revenue:""}" style="width:120px" onchange="updSaleRev('${l.id}',this.value)"/>`)
          :""}
      </div>
    </div>`).join("");
}

async function addL(){
  const name=$("l-nm").value.trim();if(!name) return;
  const qty=Math.max(1,+$("l-qty").value||1);
  // Use stored DB properties if item is known; otherwise use form selection
  const dbItem=acItemsRaw.find(x=>x.name.toLowerCase()===name.toLowerCase());
  let typ,grade,size;
  if(dbItem){
    typ=dbItem.type||null;
    grade=dbItem.grade||null;
    size=dbItem.size!=null?String(dbItem.size):null;
  } else {
    if(selCat==="weapon"){typ=null;grade=null;size=selWSz;}
    else if(selCat==="comp"){typ=selT;grade=selG;size=selSz;}
    else{typ=null;grade=null;size=null;}
  }
  await api(`/api/session/${S.id}/loot`,"POST",{code:myCode,name,qty,type:typ,grade,size});
  $("l-nm").value="";$("l-qty").value="1";acClose("l-ac");
  await reloadS();renderAL();updOvStats();
}
async function chQty(lid,d){await api(`/api/session/${S.id}/loot/${lid}/qty`,"PATCH",{code:myCode,delta:d});await reloadS();renderAL();updOvStats();}
async function removeL(lid){await fetch(`/api/session/${S.id}/loot/${lid}?code=${myCode}`,{method:"DELETE"});await reloadS();renderAL();updOvStats();}
async function togSale(lid,fs){
  if(fs&&!await showConfirm(t("confirm.sale"))) return;
  await api(`/api/session/${S.id}/loot/${lid}/sale`,"PATCH",{code:myCode,for_sale:fs});
  await reloadS();renderAL();updOvStats();renderAC();
}
async function updSaleRev(lid,val){
  await api(`/api/session/${S.id}/loot/${lid}/sale`,"PATCH",{code:myCode,sale_revenue:val===""?null:parseFloat(val)});
  await reloadS();renderCoSum();
}
async function acL(q){
  if(!q){acClose("l-ac");return;}clearTimeout(acTmr);
  acTmr=setTimeout(async()=>{
    const _orgParam=S&&S.org_id?`&org_id=${S.org_id}`:"&org_id=default";
    acItemsRaw=await api(`/api/items/search?q=${encodeURIComponent(q)}${_orgParam}`);
    acRender("l-ac",acItemsRaw.map(x=>x.name),async nm=>{
      // Just set name and submit — properties come from DB via addL()
      $("l-nm").value=nm;
      acClose("l-ac");
      await addL();
    });
  },180);
}

// commodities
function renderAC(){
  const el=$("adm-c-list");
  if(!S.commodities||!S.commodities.length){el.innerHTML=`<div class="empty">${t("co.empty")}</div>`;renderCoSum();return;}
  el.innerHTML='<div class="list">'+S.commodities.map(c=>`
    <div class="ir">
      <div class="im f1"><div class="in">${esc(c.name)}</div>
        <div class="is">${fmtN(c.scu,1)} SCU</div></div>
      ${S.locked?"":
        `<button class="btn btn-xs" onclick="chCom('${c.id}',-1)">−</button>
         <button class="btn btn-xs" onclick="chCom('${c.id}',1)">+</button>
         <input type="number" value="${c.scu}" step="0.1" min="0" style="width:80px" onchange="setCom('${c.id}',this.value)"/>
         <button class="btn btn-xs btn-red" onclick="delCom('${c.id}')">✕</button>`}
    </div>`).join("")+'</div>';
  // set revenue input
  const rv=S.total_revenue;
  // revenue display updated by updRevDisplay()
  renderCoSum();
}

function applyFee(v){ return Math.round(v*(1-0.005)); }
function renderCoSum(){
  const comms=S.commodities||[];
  const n=S.participants.length||1;
  const totalScu=comms.reduce((a,c)=>a+c.scu,0);
  const saleRev=(S.loot||[]).filter(l=>l.for_sale&&l.sale_revenue!=null).reduce((a,l)=>a+(l.sale_revenue||0),0);
  const baseRev=S.total_revenue||0;
  const totalRevBefore=baseRev+saleRev;
  const hasRev=baseRev>0||saleRev>0;
  const totalRevAfterFee=hasRev?applyFee(totalRevBefore):0;
  const saleRevAfterFee=saleRev>0?applyFee(saleRev):0;
  const perPerson=hasRev?applyFee(Math.round(totalRevAfterFee/n)):0;
  $("co-summary").innerHTML=`<div class="stats">
    <div class="stat"><div class="sv">${fmtN(totalScu,1)}</div><div class="sl">${t("ro.stat.scu")}</div></div>
    <div class="stat">
      <div class="sv">${hasRev?fmtN(totalRevAfterFee):"—"}</div>
      <div class="sl">${t("co.sum.net")}</div>
      ${hasRev?`<div style="font-family:monospace;font-size:9px;color:var(--t2);margin-top:2px">${t("co.rev.before_fee")}: ${fmtN(totalRevBefore)} · ${t("co.rev.fee")} = ${fmtN(totalRevBefore-totalRevAfterFee)}</div>`:""}
    </div>
    ${saleRev>0?`<div class="stat"><div class="sv">${fmtN(saleRevAfterFee)}</div><div class="sl">${t("co.sum.sale")}</div></div>`:""}
    <div class="stat">
      <div class="sv">${hasRev?fmtN(perPerson)+" aUEC":"—"}</div>
      <div class="sl">${t("co.sum.per")}</div>
    </div>
  </div>`;
}

let revDebTimer=null;
function saveRevDebounce(){
  clearTimeout(revDebTimer);
  revDebTimer=setTimeout(async()=>{
    const v=$("rev-inp").value;
    await api(`/api/session/${S.id}/settings`,"PATCH",{code:myCode,total_revenue:v===""?null:parseFloat(v)});
    await reloadS();renderCoSum();
  },600);
}

async function addCom(){
  const name=$("co-nm").value.trim();if(!name) return;
  const scu=parseFloat($("co-scu").value)||0;
  await api(`/api/session/${S.id}/commodities`,"POST",{code:myCode,name,scu});
  $("co-nm").value="";$("co-scu").value="";acClose("co-ac");
  await reloadS();renderAC();
}
async function chCom(cid,d){await api(`/api/session/${S.id}/commodities/${cid}/qty`,"PATCH",{code:myCode,delta:d});await reloadS();renderAC();}
async function setCom(cid,val){await api(`/api/session/${S.id}/commodities/${cid}`,"PATCH",{code:myCode,scu:parseFloat(val)||0});await reloadS();renderAC();}
async function delCom(cid){await fetch(`/api/session/${S.id}/commodities/${cid}?code=${myCode}`,{method:"DELETE"});await reloadS();renderAC();}
async function acCo(q){
  if(!q){acClose("co-ac");return;}clearTimeout(acTmr);
  acTmr=setTimeout(async()=>{
    const _orgParam2=S&&S.org_id?`&org_id=${S.org_id}`:"&org_id=default";
    const r=await api(`/api/commodities/search?q=${encodeURIComponent(q)}${_orgParam2}`);
    acRender("co-ac",r,async n=>{$("co-nm").value=n;acClose("co-ac");await addCom();});
  },180);
}

// raffle
function renderRS(){
  $("r-p").textContent=S.participants.length;
  $("r-i").textContent=totalItems(S);
  $("r-w").textContent=totalWishes(S);
  const ti=totalItems(S),np=S.participants.length;
  const modeWarn=$("raffle-mode-info");
  if(ti>0&&np>0&&ti<np){
    modeWarn.textContent=t("pt.ni.inline",{items:ti,participants:np});
    show("raffle-mode-info");
  } else hide("raffle-mode-info");
}

async function runRaffle(){
  if(!await showConfirm(t("confirm.raffle"))) return;
  const r=await api(`/api/session/${S.id}/raffle`,"POST",{code:myCode});
  if(r.error){showAlert(r.error);return;}
  await reloadS();renderRR();$("raffle-btn").textContent=t("ra.btn.restart");
}

function renderRR(){
  const el=$("raffle-res");
  if(!S.raffle_done||!S.results.length){el.innerHTML=`<div class="empty">${t("ra.empty")}</div>`;$("raffle-btn").textContent=t("ra.btn.start");return;}
  $("raffle-btn").textContent=t("ra.btn.restart");
  const winners=[...S.results].filter(r=>r.won.length).sort((a,b)=>a.participant_name.localeCompare(b.participant_name,"de"));
  const empty=[...S.results].filter(r=>!r.won.length).sort((a,b)=>a.participant_name.localeCompare(b.participant_name,"de"));
  let html="";
  winners.forEach(r=>{
    const cls=r.won_by_wish?"rr-won":"rr-pool";
    const badge=r.won_by_wish?`<span class="pill p-mil" style="font-size:9px">${t("ra.badge.wish")}</span>`:`<span class="pill p-civ" style="font-size:9px">${t("ra.badge.pool")}</span>`;
    const nc=r.waived?"waiv":r.collected?"coll":"";
    const suf=r.waived?t("ra.status.waived_short"):"";
    const chips=groupedChips(r.won);
    html+=`<div class="rr ${cls} ${r.waived?"rr-waived":""}"><div class="rh">
      <div class="av" style="width:24px;height:24px;font-size:10px">${esc(initials(r.participant_name))}</div>
      <div class="rn ${nc}">${esc(r.participant_name)}${esc(suf)}</div>${badge}
      ${S.locked?"":r.waived
        ?`<button class="btn btn-xs btn-acc" onclick="togWaive('${r.id}',false)">${t("ra.btn.unwaive")}</button>`
        :`<button class="btn btn-xs btn-red" onclick="togWaive('${r.id}',true)">${t("ra.btn.waive")}</button>`}
      ${S.locked||r.waived?"":r.collected
        ?`<button class="btn btn-xs btn-grn" onclick="togColl('${r.id}',false)">${t("ra.btn.collected")}</button>`
        :`<button class="btn btn-xs" onclick="togColl('${r.id}',true)">${t("ra.btn.uncollected")}</button>`}
    </div><div class="rchips">${chips}</div></div>`;
  });
  if(empty.length){
    html+='<div class="divider"></div>';
    empty.forEach(r=>{html+=`<div class="rr rr-none"><div class="rh">
      <div class="av" style="width:24px;height:24px;font-size:10px;opacity:.4">${esc(initials(r.participant_name))}</div>
      <div class="rn" style="color:var(--t2)">${esc(r.participant_name)}</div>
      <span class="pill p-gray" style="font-size:9px">${t("ra.badge.none")}</span></div></div>`;});
  }
  el.innerHTML=html;
}

async function togWaive(rid,v){await api(`/api/session/${S.id}/raffle/${rid}`,"PATCH",{code:myCode,waived:v});await reloadS();renderRR();}
async function togColl(rid,v){await api(`/api/session/${S.id}/raffle/${rid}`,"PATCH",{code:myCode,collected:v});await reloadS();renderRR();}

function exportTxt(){
  if(!S.results||!S.results.length){showAlert(t("ra.empty2"));return;}
  let txt=`SCLM — Star Citizen Loot Manager\n${S.name}\n${"-".repeat(40)}\n\n`;
  S.results.filter(r=>r.won.length).sort((a,b)=>a.participant_name.localeCompare(b.participant_name,"de")).forEach(r=>{
    txt+=`${r.participant_name}${r.waived?t("ra.export.waived"):""}:\n`;
    const _expMap=new Map();
    r.won.forEach(w=>{const k=`${w.name}||${w.type||''}||${w.grade||''}||${w.size||''}`;if(!_expMap.has(k))_expMap.set(k,{w,n:0});_expMap.get(k).n++;});
    _expMap.forEach(({w,n})=>{let d=w.name;if(w.type)d+=` | ${w.type}`;if(w.grade)d+=` GR-${w.grade}`;if(w.size)d+=` S${w.size}`;if(n>1)d+=` ×${n}`;txt+=`  • ${d}\n`;});
    txt+="\n";
  });
  const a=document.createElement("a");a.href="data:text/plain;charset=utf-8,"+encodeURIComponent(txt);a.download=`raffle_${S.name.replace(/\s+/g,"_")}.txt`;a.click();
}

// ── PARTICIPANT VIEW ──────────────────────────────────────────────────────────
// ── UI Scale ──────────────────────────────────────────────────────────────────
function setScale(v){
  v=Math.round(parseFloat(v)*100)/100;
  document.body.style.zoom=v;
  try{localStorage.setItem('scr_scale',v);}catch(e){}
}
// Restore saved scale on load
(function(){
  try{
    const s=localStorage.getItem('scr_scale');
    if(s){
      const v=parseFloat(s);
      document.body.style.zoom=v;
      // Slider may not exist yet at this point — set after DOM ready
      window.addEventListener('DOMContentLoaded',()=>{
        const sl=document.getElementById('scale-slider');
        if(sl) sl.value=v;
      });
    }
  }catch(e){}
})();

const SK=()=>`scr_pid_${S&&S.id}`;

function showPartView(){
  showPage("pg-part");show("spill");show("btn-leave");
  applySessionBg();
  if(myPid) sessionStorage.setItem('sclm_part',JSON.stringify({code:myCode,pid:myPid,name:myPName}));
  if(S&&myCode){try{const jd=JSON.parse(sessionStorage.getItem('sclm_join')||'{}');jd[S.id]=myCode;sessionStorage.setItem('sclm_join',JSON.stringify(jd));}catch(_){}}
  {const _eg=S&&myCode&&myCode!==S.join_code&&myCode!==S.admin_code;
  history.replaceState(null,'',(ORG&&S&&S.org_id!==ORG.id)?`#org/${ORG.code}/${S.id}/join`:(_eg?`#guest/${myCode}`:`#join/${myCode}`));}
  $("spill-name").textContent=S.name;$("pt-title").textContent=S.name.toUpperCase();
  hide("pt-wish");hide("pt-wait");hide("pt-result");show("pt-sel");renderPtList();
  const saved=localStorage.getItem(SK());
  if(saved){try{const{pid,name}=JSON.parse(saved);const f=S.participants.find(p=>p.id===pid);if(f){selectParticipant(pid,name);return;}}catch(e){}}
}

function renderPtList(){
  const el=$("pt-nm-list");
  if(!S.participants.length){el.innerHTML=`<div class="empty">${t("pt.sel.empty")}</div>`;return;}
  el.innerHTML=[...S.participants].sort((a,b)=>a.name.localeCompare(b.name,"de")).map(p=>`
    <div class="ir" style="cursor:pointer" onclick="selectParticipant('${p.id}','${esc(p.name)}')">
      <div class="av">${esc(initials(p.name))}</div>
      <div class="in f1">${esc(p.name)}</div>
      <span style="color:var(--t2);font-size:11px">→</span>
    </div>`).join("");
}

async function selfReg(){
  const name=$("pt-nm-inp").value.trim();if(!name) return;
  const _extGuest=S&&myCode&&myCode!==S.join_code&&myCode!==S.admin_code;
  const invOrgId=_extGuest?`ext:${myCode}`:(ORG&&S&&S.org_id&&ORG.id&&S.org_id!==ORG.id)?ORG.id:null;
  const r=await api(`/api/session/${S.id}/participants`,"POST",
    {code:myCode,name,added_by:"self",...(invOrgId?{invited_org_id:invOrgId}:{})});
  if(r.error&&r.id){selectParticipant(r.id,name);return;}
  if(r.error){const f=S.participants.find(p=>p.name.toLowerCase()===name.toLowerCase());if(f){selectParticipant(f.id,f.name);return;}showAlert(r.error);return;}
  await reloadS();selectParticipant(r.id,name);
}

function selectParticipant(pid,name){
  myPid=pid;myPName=name;
  localStorage.setItem(SK(),JSON.stringify({pid,name}));
  sessionStorage.setItem('sclm_part',JSON.stringify({code:myCode,pid,name}));
  {const _eg=S&&myCode&&myCode!==S.join_code&&myCode!==S.admin_code;
  history.replaceState(null,'',(ORG&&S&&S.org_id!==ORG.id)?`#org/${ORG.code}/${S.id}/join`:(_eg?`#guest/${myCode}`:`#join/${myCode}`));}
  hide("pt-sel");$("pt-id-bar").textContent=t("pt.logged_in_as",{name:name});
  if(S.raffle_done) showPtResult();
  else if(S.locked) showPtWaiting();
  else {
    // If participant already has wishes saved, go to waiting page
    const p=S.participants.find(x=>x.id===myPid);
    const hasWishes=p&&((p.wishes||[]).length>0||(p.no_interest||[]).length>0);
    if(hasWishes) showPtWaiting();
    else showPtWishes();
  }
}

function showPtWishes(){
  hide("pt-wait");hide("pt-result");show("pt-wish");renderPtWishes();
}

function renderPtWishes(){
  const p=S.participants.find(x=>x.id===myPid);
  const ti=totalItems(S),np=S.participants.length;
  const niMode=ti>0&&np>0&&ti<np;
  // In no-interest mode: selection = items you DON'T want
  const selIds=new Set(niMode?(p?p.no_interest||[]:[]):(p?p.wishes||[]:[]) );
  const maxW=S.max_wishes,used=selIds.size;

  tog("pt-lock-warn",S.locked);$("save-w-btn").disabled=!!S.locked;

  // mode info
  const mi=$("pt-mode-info");
  if(niMode){
    // Clear any wishes saved in wish-mode when switching to no-interest
    const _p2=S.participants.find(x=>x.id===myPid);
    if(_p2&&(_p2.wishes||[]).length>0){_p2.wishes=[];}
    mi.innerHTML=`<strong>${t("ni.warning.title")}</strong><br>${t("ni.warning.body",{items:totalItems(S),participants:S.participants.length})}`;
    mi.style.cssText="background:rgba(231,76,60,.15);border-color:rgba(231,76,60,.5);color:var(--red);padding:10px 13px;border-radius:4px;border:1px solid;font-size:12px;margin-bottom:10px;line-height:1.6";
    show("pt-mode-info");
  } else { hide("pt-mode-info"); mi.removeAttribute("style"); }

  // quota bar (only in wish mode)
  if(!niMode){
    let qhtml="";for(let i=0;i<maxW;i++) qhtml+='<div class="qpip '+(i<used?"used":"")+'" ></div>';
    qhtml+=`<span class="qtxt">${used}/${maxW} ${t("ra.stat.wishes")}</span>`;
    $("qbar").innerHTML=qhtml;show("qbar");
  } else {
    $("qbar").innerHTML=`<span class="qtxt">${t("pt.ni.inline",{items:used,participants:S.participants.length})}</span>`;
  }

  const el=$("pt-w-list");
  const lootAvail=[...S.loot].filter(l=>!l.for_sale).sort((a,b)=>a.name.localeCompare(b.name,"de"));
  if(!lootAvail.length){el.innerHTML=`<div class="empty">${t("pt.wish.empty")}</div>`;return;}
  el.innerHTML=lootAvail.map(l=>{
    const s=selIds.has(l.id);
    const cls=niMode?(s?"sel-ni":""):(s?"sel-w":"");
    const cbCls=niMode?"ni wcb":"wcb";
    const lbl=niMode?(s?t("pt.ni.no"):t("pt.ni.yes")):"";
    return `<div class="wi ${cls}" onclick="ptTogW('${l.id}',${maxW},${niMode})">
      <input type="checkbox" class="${cbCls}" ${s?"checked":""} onclick="event.stopPropagation();ptTogW('${l.id}',${maxW},${niMode})"/>
      <div style="flex:1"><div style="font-weight:600;font-size:13px">${esc(l.name)} <span style="color:var(--t2);font-size:11px">×${l.qty}</span></div>
        <div class="pills">${pillsHTML(l)}</div></div>
      ${niMode?`<span style="font-size:10px;color:${s?"var(--red)":"var(--grn)"};font-family:monospace">${lbl}</span>`:""}</div>`;
  }).join("");
}

function ptTogW(lid,maxW,niMode){
  const p=S.participants.find(x=>x.id===myPid);if(!p) return;
  if(niMode){
    if(!p.no_interest) p.no_interest=[];
    const idx=p.no_interest.indexOf(lid);
    if(idx>=0) p.no_interest.splice(idx,1);else p.no_interest.push(lid);
  } else {
    if(!p.wishes) p.wishes=[];
    const idx=p.wishes.indexOf(lid);
    if(idx>=0) p.wishes.splice(idx,1);
    else{if(p.wishes.length>=maxW){showAlert(`${t("pt.wish.save")} — max ${maxW}`);return;}p.wishes.push(lid);}
  }
  renderPtWishes();
}

async function saveWishes(){
  const p=S.participants.find(x=>x.id===myPid);
  const ti=totalItems(S),np=S.participants.length;
  const niMode=ti>0&&np>0&&ti<np;
  const lids=p?(niMode?(p.no_interest||[]):(p.wishes||[])):[];
  const r=await api(`/api/session/${S.id}/wishes`,"POST",{code:myCode,participant_id:myPid,loot_ids:lids,mode:niMode?"no_interest":"wish"});
  if(r.error){showAlert(r.error);return;}
  await reloadS();showPtWaiting();
}

function showPtWaiting(){hide("pt-wish");hide("pt-result");show("pt-wait");renderWaitSelection();startPoll();}

function showPtResult(){
  hide("pt-wish");hide("pt-wait");show("pt-result");
  stopPoll();
  renderPtResult();
  startResultPoll();
}

async function renderPtResult(){
  const r=await api(`/api/session/${S.id}/raffle/result_for/${myPid}?code=${myCode}`);
  if(!r.result){$("pt-res-content").innerHTML=`<div class="empty">${t("pt.result.empty2")}</div>`;return;}
  const res=r.result,won=res.won||[];
  if(!won.length){$("pt-res-content").innerHTML=`<div class="empty">${t("pt.result.empty")}</div>`;return;}
  const chips=groupedChips(won);
  const badge=res.won_by_wish?`<span class="pill p-mil">${t("pt.result.wish_badge")}</span>`:`<span class="pill p-civ">${t("pt.result.pool_badge")}</span>`;
  const coll=res.collected?`<span class="pill p-grade">${t("pt.result.collected_badge")}</span>`:`<span class="pill p-gray">${t("pt.result.pending_badge")}</span>`;
  const waiv=res.waived?`<span class="pill" style="background:var(--rdim);color:var(--red);border:1px solid rgba(231,76,60,.3)">${t("ra.status.waived_short").trim()}</span>`:"";
  // Self-action buttons (one-way — only set, not unset)
  const collBtn=(!res.collected&&!res.waived)?`<button class="btn btn-xs btn-grn mt8" onclick="ptSelfMark('${res.id}','collected')">${t("pt.result.btn.collect")}</button>`:"";
  const waivBtn=(!res.waived&&!res.collected)?`<button class="btn btn-xs btn-red mt8" style="margin-left:6px" onclick="ptSelfMarkWaive('${res.id}')">${t("pt.result.btn.waive")}</button>`:"";
  $("pt-res-content").innerHTML=`<div class="rr rr-won">
    <div class="rh">${badge} ${coll} ${waiv}</div>
    <div class="rchips mt8">${chips}</div>
    <div class="mt8">${collBtn}${waivBtn}</div>
  </div>`;
}

async function ptSelfMark(rid,field){
  const r=await api(`/api/session/${S.id}/raffle/${rid}`,"PATCH",{code:myCode,[field]:true});
  if(r.error){showAlert(r.error);return;}
  await reloadS();renderPtResult();
}
async function ptSelfMarkWaive(rid){
  if(!await showConfirm(t("confirm.waive"))) return;
  ptSelfMark(rid,"waived");
}
function ptReload(){reloadS().then(()=>{if(S.raffle_done)showPtResult();else renderPtWishes();});}
function startPoll(){stopPoll();pollTmr=setInterval(async()=>{await reloadS();if(S.raffle_done)showPtResult();else{renderPtWishes();renderWaitSelection();}},8000);}
function stopPoll(){clearInterval(pollTmr);pollTmr=null;stopResultPoll();}
let _resPollTmr=null;
function startResultPoll(){
  stopResultPoll();
  _resPollTmr=setInterval(async()=>{await reloadS();renderPtResult();},5000);
}
function stopResultPoll(){clearInterval(_resPollTmr);_resPollTmr=null;}

async function acPt(q){
  if(!q){acClose("pt-nm-ac");return;}clearTimeout(acTmr);
  // External guests have no org DB — skip autocomplete
  const _isExtGuest=S&&myCode&&myCode!==S.join_code&&myCode!==S.admin_code;
  if(_isExtGuest){acClose("pt-nm-ac");return;}
  // Use own org DB if in org context, otherwise session's org
  const _ptOrgId=ORG?ORG.id:(S&&S.org_id?S.org_id:"default");
  acTmr=setTimeout(async()=>{
    const r=await api(`/api/participants/search?q=${encodeURIComponent(q)}&org_id=${encodeURIComponent(_ptOrgId)}`);
    acRender("pt-nm-ac",r,n=>{$("pt-nm-inp").value=n;acClose("pt-nm-ac");});
  },180);
}

// ── SUPER ADMIN ───────────────────────────────────────────────────────────────
async function loadSuperAdmin(){
  // Always verify before showing — prevents direct URL hash access
  const r=await api("/api/admin/verify","POST",{secret:superSecret});
  if(r.error){
    superSecret="";
    showAlert(t("adm.err.access_denied"));
    loadHome();return;
  }
  showPage("pg-super");stopPoll();history.replaceState(null,'','#admin?secret='+superSecret);saTab("orgs");
}

function saTab(t){
  ["orgs","set"].forEach(x=>{
    const c=document.getElementById(`st-${x}-c`); if(c) c.classList.toggle("H",x!==t);
    const b=document.getElementById(`st-${x}`); if(b) b.classList.toggle("active",x===t);
  });
  if(t==="orgs") loadSaOrgs();
}

async function loadSaOrgs(){
  const list = await api(`/api/admin/orgs?secret=${superSecret}`);
  const el = $('sa-org-list');
  if (!list.length||list.error) { el.innerHTML=`<div class="empty">${t('sa.empty.events')}</div>`; return; }
  el.innerHTML = list.map(o => `
    <div class="ir" style="flex-wrap:wrap">
      <div class="im f1">
        <div class="in" style="display:flex;align-items:center;gap:8px">
          ${o.logo_url?`<img src="${esc(o.logo_url)}" style="height:24px;border-radius:3px" onerror="this.style.display='none'"/>`:'' }
          <span>${esc(o.name)}</span>
          <span class="pill p-mil" style="font-size:9px">${esc(o.code)}</span>
        </div>
        <div class="is">${o.session_count} Events</div>
        <div class="is" style="font-size:10px">
          ${t('org.member_code.label')} <code style="color:var(--acc)">${esc(o.member_secret||'—')}</code>
          &nbsp;·&nbsp;${t('org.admin_secret.label')} <code style="color:var(--gold)">${esc(o.secret)}</code>
        </div>
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap">
        <button class="btn btn-xs btn-acc" onclick="saEditOrg('${esc(o.id)}','${esc(o.name)}','${esc(o.code)}','${esc(o.logo_url||'')}')">${t('btn.edit')}</button>
        ${o.id!=='default'?`<button class="btn btn-xs btn-red" onclick="saDeleteOrg('${esc(o.id)}','${esc(o.name)}')">✕</button>`:''}
      </div>
    </div>`).join('');
}

async function saCreateOrg(){
  const name=($('sa-org-name').value||'').trim();
  const code=($('sa-org-code').value||'').trim().toUpperCase();
  const sec=($('sa-org-secret-inp').value||'').trim();
  if(!name||!code){show('sa-org-err');$('sa-org-err').textContent='Name und Code erforderlich.';return;}
  const r=await api('/api/admin/orgs','POST',{secret:superSecret,name,code,...(sec?{org_secret:sec}:{})});
  if(r.error){show('sa-org-err');$('sa-org-err').textContent=r.error;return;}
  hide('sa-org-err');
  $('sa-org-name').value='';$('sa-org-code').value='';$('sa-org-secret-inp').value='';
  await loadSaOrgs();
}

async function saEditOrg(id,name,code,logo){
  const newName=await showPrompt(t('org.admin.name.label'),name); if(newName===null) return;
  const newCode=await showPrompt(t('org.admin.code.label'),code); if(newCode===null) return;
  const newLogo=await showPrompt(t('org.admin.logo.label'),logo); if(newLogo===null) return;
  const newSec=await showPromptPassword(t('org.admin.admin_secret.placeholder'));
  const data={secret:superSecret,name:newName,code:newCode.toUpperCase(),logo_url:newLogo};
  if(newSec) data.new_secret=newSec;
  const r=await api(`/api/admin/orgs/${id}`,'PATCH',data);
  if(r.error){showAlert(r.error);return;}
  loadSaOrgs();
}

async function saDeleteOrg(id,name){
  if(!await showConfirm(t('confirm.delete_org',{name}))) return;
  const r=await api(`/api/admin/orgs/${id}`,'DELETE',{secret:superSecret});
  if(r.error){showAlert(r.error);return;}
  await loadSaOrgs();
}

async function loadSaEvents(){
  const list=await api(`/api/sessions?secret=${superSecret}`);
  const el=$("sa-ev-list");
  if(!list.length){el.innerHTML=`<div class="empty">${t("sa.empty.events")}</div>`;return;}
  el.innerHTML=list.map(s=>`<div class="ir" style="flex-wrap:wrap">
    <div class="im f1">
      <div class="in">${esc(s.name)} ${s.locked?'<span class="pill p-grade">🔒</span>':''} ${s.raffle_done?'<span class="pill p-civ">✓</span>':''}</div>
      <div class="is">${s.created} · 👥${s.participant_count} · 📦${s.loot_count}</div>
      <div class="is" style="margin-top:2px">${t("sa.ev.join_label")} <b style="color:var(--acc)">${s.join_code}</b> · Admin: <b style="color:var(--gold)">${s.admin_code||"—"}</b></div>
    </div>
    <div style="display:flex;gap:4px;flex-wrap:wrap">
      <button class="btn btn-xs btn-acc" onclick="saOpenAdmin('${s.admin_code}')">${t('btn.open')}</button>
      <button class="btn btn-xs btn-gold" onclick="saTogLock('${s.id}','${s.admin_code}',${s.locked})">${s.locked?t("adm.btn.unlock"):t("adm.btn.lock_ev")}</button>
      <button class="btn btn-xs" onclick="openRO('${s.join_code}')">${t("home.ec.view")}</button>
      <button class="btn btn-xs btn-red" onclick="saDelEv('${s.id}')">✕</button>
    </div>
  </div>`).join("");
}

async function saOpenAdmin(ac){myCode=ac;S=await api(`/api/session/${ac}`);showAdminView();}
async function saTogLock(sid,ac,locked){await api(`/api/session/${sid}/settings`,"PATCH",{code:ac,locked:!locked,secret:superSecret});loadSaEvents();}
async function saDelEv(sid){if(!await showConfirm(t("confirm.del_event"))) return; await api(`/api/session/${sid}?secret=${superSecret}`,'DELETE'); loadSaEvents();}

let saItemsRaw=[];
let saSelCat="item", saSelWSz="1";
function saSCat(btn){
  $("sa-cat-grp").querySelectorAll(".tgl").forEach(b=>b.className="tgl");
  saSelCat=btn.dataset.v;
  const isIt=saSelCat==="item",isW=saSelCat==="weapon",isC=saSelCat==="comp";
  btn.classList.add(isIt?"si":"st");
  tog("sa-weapon-f",isW); tog("sa-comp-f",isC);
}
function saST(btn){$("sa-ty-grp").querySelectorAll(".tgl").forEach(b=>b.className="tgl");saSelT=btn.dataset.v;btn.classList.add("st");}
function saSG(btn){$("sa-gr-grp").querySelectorAll(".tgl").forEach(b=>b.className="tgl");saSelG=btn.dataset.v;btn.classList.add("sg");}
function saSS(btn){$("sa-sz-grp").querySelectorAll(".tgl").forEach(b=>b.className="tgl");saSelSz=btn.dataset.v;btn.classList.add("ss");}
function saSWSz(btn){$("sa-sw-sz-grp").querySelectorAll(".tgl").forEach(b=>b.className="tgl");saSelWSz=btn.dataset.v;btn.classList.add("ss");}

async function loadSaItems(){
  const r=await api(`/api/admin/data?secret=${superSecret}`);saItemsRaw=r.items||[];
  const el=$("sa-it-list");
  if(!saItemsRaw.length){el.innerHTML=`<div class="empty">${t("sa.empty.items")}</div>`;return;}
  el.innerHTML=saItemsRaw.sort((a,b)=>a.name.localeCompare(b.name,"de")).map((i,idx)=>`
    <div class="ir">
      <div class="im f1"><div class="in">${esc(i.name)}</div><div class="pills">${pillsHTML(i)}</div></div>
      <button class="btn btn-xs btn-acc" onclick="saEditItem(${idx})">✎</button>
      <button class="btn btn-xs btn-red" onclick="saDelItem(${idx})">✕</button>
    </div>`).join("");
}
async function saAddItem(){
  const name=$("sa-l-nm").value.trim();if(!name) return;
  let typ=null,grade=null,size=null;
  if(saSelCat==="weapon"){ size=saSelWSz; }
  else if(saSelCat==="comp"){ typ=saSelT; grade=saSelG; size=saSelSz; }
  const pending=saItemsRaw.find(x=>x._pendingDelete);
  if(pending){
    await fetch(`/api/admin/items/${encodeURIComponent(pending._pendingDelete)}?secret=${superSecret}`,{method:"DELETE"});
    delete pending._pendingDelete;
  }
  await api("/api/admin/items","POST",{secret:superSecret,name,type:typ,grade,size});
  $("sa-l-nm").value="";loadSaItems();
}
async function saDelItem(idx){
  const item=saItemsRaw[idx]; if(!item) return;
  if(!await showConfirm(t("confirm.del_db_item",{name:item.name}))) return;
  const key=encodeURIComponent(item.loot_key);
  await fetch(`/api/admin/items/${key}?secret=${superSecret}`,{method:"DELETE"});
  loadSaItems();
}

function saEditItem(idx){
  const item=saItemsRaw[idx]; if(!item) return;
  $("sa-l-nm").value=item.name;
  const isW=!item.type&&!item.grade&&item.size!=null;
  const isC=!!(item.type||item.grade);
  const catVal=isW?"weapon":isC?"comp":"item";
  const catBtn=[...$("sa-cat-grp").querySelectorAll(".tgl")].find(x=>x.dataset.v===catVal);
  if(catBtn) saSCat(catBtn);
  if(catVal==="weapon"){
    const sz=String(item.size??1);
    const b=[...$("sa-sw-sz-grp").querySelectorAll(".tgl")].find(x=>x.dataset.v===sz);if(b)saSWSz(b);
  } else if(catVal==="comp"){
    if(item.type){const b=[...$("sa-ty-grp").querySelectorAll(".tgl")].find(x=>x.dataset.v===item.type);if(b)saST(b);}
    if(item.grade){const b=[...$("sa-gr-grp").querySelectorAll(".tgl")].find(x=>x.dataset.v===item.grade);if(b)saSG(b);}
    if(item.size!=null){const b=[...$("sa-sz-grp").querySelectorAll(".tgl")].find(x=>x.dataset.v===String(item.size));if(b)saSS(b);}
  }
  saItemsRaw[idx]._pendingDelete=item.loot_key;
  $("sa-l-nm").focus();
  $("sa-l-nm").scrollIntoView({behavior:"smooth"});
}

async function loadSaPn(){
  const r=await api(`/api/admin/data?secret=${superSecret}`);const names=r.participant_names||[];
  const el=$("sa-pn-list");
  if(!names.length){el.innerHTML=`<div class="empty">${t("sa.empty.names")}</div>`;return;}
  el.innerHTML=names.map(n=>`<div class="ir"><div class="in f1">${esc(n)}</div><button class="btn btn-xs btn-red" onclick="saDelPN('${encodeURIComponent(n)}')">✕</button></div>`).join("");
}
async function saAddPN(){const name=$("sa-pn-inp").value.trim();if(!name) return;await api("/api/admin/participants","POST",{secret:superSecret,name});$("sa-pn-inp").value="";loadSaPn();}
async function saDelPN(n){await fetch(`/api/admin/participants/${n}?secret=${superSecret}`,{method:"DELETE"});loadSaPn();}

async function loadSaCo(){
  const r=await api(`/api/admin/data?secret=${superSecret}`);const names=r.commodity_names||[];
  const el=$("sa-co-list");
  if(!names.length){el.innerHTML=`<div class="empty">${t("sa.empty.commodities")}</div>`;return;}
  el.innerHTML=names.map(n=>`<div class="ir"><div class="in f1">${esc(n)}</div><button class="btn btn-xs btn-red" onclick="saDelCo('${encodeURIComponent(n)}')">✕</button></div>`).join("");
}
async function saAddCo(){const name=$("sa-co-inp").value.trim();if(!name) return;await fetch("/api/admin/commodities",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({secret:superSecret,name})});loadSaCo();}
async function saDelCo(n){await fetch(`/api/admin/commodities/${n}?secret=${superSecret}`,{method:"DELETE"});loadSaCo();}

async function runUex(){
  const btn=$("uex-btn"),res=$("uex-result");
  btn.disabled=true; btn.textContent=t("uex.running");

  // Category IDs relevant for ship components (79 removed - too much irrelevant data)
  // Cat 32 = ship weapons: size only, no Class/Grade, read size directly from items response
  const CAT_IDS=[19,21,22,23,32,83,86];  // 79=irrelevant, 82=not relevant
  const CAT_SIZE_ONLY=new Set([32]);  // categories where we skip attribute API calls
  const BASE="https://api.uexcorp.uk/2.0";

  // Map UEX attribute values to our internal format
  const TYPE_MAP={"military":"MIL","stealth":"STE","competition":"COM","civilian":"CIV","industrial":"IND"};
  const GRADE_MAP={"a":"A","b":"B","c":"C","d":"D","1":"A","2":"B","3":"C","4":"D"};

  function setStatus(msg,progress){
    res.innerHTML=`<div class="alert a-info" style="font-family:monospace;font-size:11px">
      ${esc(msg)}
      ${progress!=null?`<div style="background:var(--bg4);border-radius:3px;height:4px;margin-top:8px;overflow:hidden">
        <div style="background:var(--acc);height:100%;width:${progress}%;transition:width .3s"></div></div>`:""}
    </div>`;
  }

  try{
    // Step 1: fetch all items per category
    setStatus(t("uex.loading_categories",{n:9}), 0);
    let allItems=[];
    for(let i=0;i<CAT_IDS.length;i++){
      const catId=CAT_IDS[i];
      setStatus(t("uex.loading_category",{i:i+1,n:CAT_IDS.length,id:catId}), Math.round((i/CAT_IDS.length)*40));
      const r=await fetch(`${BASE}/items?id_category=${catId}`);
      if(!r.ok) throw new Error(`Kategorie ${catId}: HTTP ${r.status}`);
      const d=await r.json();
      const items=(d.data||[]).filter(x=>x.id&&x.name);
      allItems=allItems.concat(items.map(x=>({...x,catId})));
      // Small delay to be polite to the API
      await new Promise(r=>setTimeout(r,120));
    }
    setStatus(`${allItems.length} Komponenten gefunden. Lade Details...`, 40);

    // Step 2: fetch attributes for each item
    const results=[];
    for(let i=0;i<allItems.length;i++){
      const item=allItems[i];
      if(i%10===0) setStatus(`Detail ${i+1}/${allItems.length}: ${item.name}`, 40+Math.round((i/allItems.length)*55));
      try{
        // Size is available directly on item object for all categories
        const rawSize=String(item.size||"").trim();
        const itemSize=rawSize.match(/^\d+$/)?rawSize:null;  // "0" is valid

        // For size-only categories (e.g. weapons), skip attribute API calls
        if(CAT_SIZE_ONLY.has(item.catId)){
          results.push({name:item.name,type:null,grade:null,size:itemSize});
          continue;
        }

        const r=await fetch(`${BASE}/items_attributes?id_item=${item.id}`);
        if(!r.ok){ results.push({name:item.name,size:itemSize}); continue; }
        const d=await r.json();
        const attrs=d.data||[];

        // attribute_name variants: t("lo.comp.grade.label")/"Grade Letter", "Class", "Size"
        let type=null, grade=null, size=itemSize;
        for(const a of attrs){
          const attrName=(a.attribute_name||"").trim();
          const val=String(a.value||"").trim();
          if(!val) continue;  // skip empty values

          // Class / type
          if(attrName==="Class"){
            type=TYPE_MAP[val.toLowerCase()]||null;
          }
          // Grade — accept "Grade", "Grade Letter" (not "Grade Numeric")
          if((attrName==="Grade"||attrName==="Grade Letter")&&!attrName.includes("Numeric")){
            if(["A","B","C","D"].includes(val.toUpperCase()))
              grade=val.toUpperCase();
          }
          // Size from attributes (overrides item-level size if present)
          // "0" is a valid SC component size
          if(attrName==="Size"){
            if(/^\d+$/.test(val)) size=val;
          }
        }
        results.push({name:item.name,type,grade,size});
      }catch(e){
        results.push({name:item.name,size:itemSize||null});
      }
      await new Promise(r=>setTimeout(r,80));
    }

    setStatus(t("uex.saving"), 97);
    const r=await api("/api/admin/uex_import","POST",{secret:superSecret,items:results});
    if(r.error) throw new Error(r.error);
    res.innerHTML=`<div class="alert a-ok">${t("uex.done")}<br>
      <span style="font-family:monospace;font-size:11px">
      ${r.added} neu/aktualisiert · ${r.skipped} unverändert · ${r.total} gesamt verarbeitet
      </span></div>`;
  }catch(e){
    res.innerHTML=`<div class="alert a-err">${t("uex.error")}: ${esc(e.message)}<br>
      <span style="font-family:monospace;font-size:10px;color:var(--t2)">
      ${t("sa.uex.network_hint")}
      </span></div>`;
  }
  btn.disabled=false; btn.textContent=t("sa.uex.btn");
}

// ── autocomplete ──────────────────────────────────────────────────────────────
function acRender(dropId,items,onSel){
  const d=$(dropId);if(!d) return;
  if(!items.length){d.classList.remove("open");return;}
  d.innerHTML=items.map(n=>`<div class="aci">${esc(n)}</div>`).join("");
  d.classList.add("open");
  d.querySelectorAll(".aci").forEach((el,i)=>el.addEventListener("mousedown",e=>{e.preventDefault();onSel(items[i]);}));
}
function acClose(id){const d=$(id);if(d)d.classList.remove("open");}
document.addEventListener("click",e=>{if(!e.target.closest(".acw"))["p-ac","l-ac","pt-nm-ac","co-ac"].forEach(acClose);});

// ── session persistence ──────────────────────────────────────────────────────
// ── Hash Router ────────────────────────────────────────────────────────────────
async function handleRoute() {
  const raw = (window.location.hash || '').replace(/^#/, '');
  const qi = raw.indexOf('?');
  const path = qi >= 0 ? raw.slice(0, qi) : raw;
  const qs   = qi >= 0 ? raw.slice(qi + 1) : '';
  const qp = {};
  qs.split('&').filter(Boolean).forEach(p => {
    const eq = p.indexOf('=');
    if (eq >= 0) qp[decodeURIComponent(p.slice(0, eq))] = decodeURIComponent(p.slice(eq + 1));
  });
  const parts = path.split('/').filter(Boolean);
  const page = parts[0] || '';

  // ── External guest join (#guest/GUESTCODE) ──
  if (page === 'guest') {
    const guestCode = parts[1] || '';
    if (!guestCode) { loadHome(); return; }
    const r = await api(`/api/session/${guestCode}`);
    if (r.error) { showAlert(r.error); loadHome(); return; }
    S = r; myCode = guestCode;
    // Restore participant identity if returning to session
    try {
      const ps = JSON.parse(sessionStorage.getItem('sclm_part') || 'null');
      if (ps && ps.code === myCode) { myPid = ps.pid; myPName = ps.name || ''; }
    } catch(_) {}
    showPartView(); return;
  }

  // ── Site admin (legacy URL: #admin?secret=XXX) ──
  if (page === 'admin' && qp.secret) {
    superSecret = qp.secret;
    await loadSuperAdmin();
    return;
  }

  // ── About ──
  if (page === 'about') { loadHome(); openAbout(); return; }

  // ── Org routes (#org/CODE/...) ──
  if (page === 'org') {
    const orgCode = parts[1] || '';
    const sub     = parts[2] || '';   // '' | 'admin' | {session-id}
    const subsub  = parts[3] || '';   // '' | 'guest' | 'admin' | 'join'

    if (!orgCode) { loadHome(); return; }

    // All org sub-routes require being logged into this org
    const ok = await restoreOrgSession(orgCode);
    if (!ok) { try { $('org-code-inp').value = orgCode; } catch(_){} loadHome(); return; }

    // #org/CODE → lobby
    if (!sub) { showOrgLobby(); return; }

    // #org/CODE/admin → org admin page
    if (sub === 'admin') { ORG_LEVEL==='admin' ? showOrgAdminDirect() : showOrgLobby(); return; }

    // #org/CODE/{session-id}/... → event routes
    const sessionId = sub;

    // Try admin credentials first (from localStorage creator codes)
    if (subsub === 'admin' || subsub === '') {
      const ac = getCreatorCode(sessionId);
      if (ac) {
        const r = await api(`/api/session/${ac}`);
        if (!r.error) { S = r; myCode = ac; showAdminView(); return; }
      }
    }

    // Try join/participant credentials (from sessionStorage)
    if (subsub === 'join' || subsub === '') {
      try {
        const jd = JSON.parse(sessionStorage.getItem('sclm_join') || '{}');
        const jc = jd[sessionId];
        if (jc) {
          const r = await api(`/api/session/${jc}`);
          if (!r.error) {
            S = r; myCode = jc;
            const ps = JSON.parse(sessionStorage.getItem('sclm_part') || 'null');
            if (ps && ps.code === jc) { myPid = ps.pid; myPName = ps.name || ''; }
            showPartView(); return;
          }
        }
      } catch(_) {}
    }

    // Guest/RO view — load session via org secret
    const gd = await api(`/api/orgs/${orgCode}/sessions/${sessionId}/view?secret=${encodeURIComponent(_ORG_AUTH)}`);
    if (gd.error) { showOrgLobby(); return; }
    S = gd; myCode = '';
    showGuestView(orgCode, sessionId);
    return;
  }

  // ── Fallback ──
  loadHome();
}

// ── Change admin password ────────────────────────────────────────────────────
async function changePw(){
  const cur=$("pw-current").value.trim();
  const nw=$("pw-new").value.trim();
  const rep=$("pw-repeat").value.trim();
  const res=$("pw-result");
  if(!cur||!nw||!rep){res.innerHTML='<div class="alert a-err">Alle Felder ausfüllen.</div>';return;}
  if(nw!==rep){res.innerHTML='<div class="alert a-err">Kennwörter stimmen nicht überein.</div>';return;}
  if(nw.length<6){res.innerHTML='<div class="alert a-err">Mindestens 6 Zeichen.</div>';return;}
  const r=await api("/api/admin/change_secret","POST",{secret:cur,new_secret:nw});
  if(r.error){res.innerHTML=`<div class="alert a-err">${esc(r.error)}</div>`;return;}
  superSecret=nw;
  // Update URL hash with new secret
  history.replaceState(null,"",`#admin?secret=${encodeURIComponent(nw)}`);
  $("pw-current").value="";$("pw-new").value="";$("pw-repeat").value="";
  res.innerHTML='<div class="alert a-ok">✓ Kennwort erfolgreich geändert. Neue Admin-URL wurde aktualisiert.</div>';
}

// ── About ────────────────────────────────────────────────────────────────────
function showAbout(){ openAbout(); }

// ── Revenue add/reset ─────────────────────────────────────────────────────────
async function addRevenue(){
  const v=parseFloat(document.getElementById("rev-add-inp").value);
  if(!v||v<=0) return;
  const current=S.total_revenue||0;
  const r=await api(`/api/session/${S.id}/settings`,"PATCH",{code:myCode,total_revenue:current+v});
  if(r.error){showAlert(r.error);return;}
  document.getElementById("rev-add-inp").value="";
  await reloadS();renderAC();
}
async function resetRevenue(){
  if(!await showConfirm(t("co.rev.btn.reset") + "?")) return;
  await api(`/api/session/${S.id}/settings`,"PATCH",{code:myCode,total_revenue:null});
  await reloadS();renderAC();
}
function updRevDisplay(){
  const el=document.getElementById("rev-total-display");
  if(el) el.textContent=S.total_revenue!=null?fmtN(S.total_revenue):"—";
}

// ── Raffle/Comm lock ──────────────────────────────────────────────────────────
async function toggleRaffleLock(){
  const locked=S.raffle_locked;
  if(!locked&&!await showConfirm(t("confirm.raffle_lock"))) return;
  if(locked&&!await showConfirm(t("confirm.raffle_unlock"))) return;
  await api(`/api/session/${S.id}/settings`,"PATCH",{code:myCode,raffle_locked:!locked});
  await reloadS();showAdminView();
}
async function toggleCommLock(){
  const locked=S.commodities_locked;
  if(!locked&&!await showConfirm(t("confirm.comm_lock"))) return;
  if(locked&&!await showConfirm(t("confirm.comm_unlock"))) return;
  await api(`/api/session/${S.id}/settings`,"PATCH",{code:myCode,commodities_locked:!locked});
  await reloadS();showAdminView();
}
// ── Invitations (v6.1) ────────────────────────────────────────────
let _invOrgSelected = null;  // {id, name, code} from org search autocomplete

async function renderOvInvitations() {
  const card = document.getElementById('ov-invitations-card');
  const el   = document.getElementById('ov-invitations');
  if (!card || !el) return;
  if (isGuestOrgAdmin()) { card.classList.add('H'); return; }
  card.classList.remove('H');
  const invs = await api(`/api/session/${S.id}/invitations?code=${myCode}`);
  if (invs.error) { el.innerHTML=''; return; }
  const invList = invs.length ? invs.map(inv => {
    const isOrg = !!inv.invited_org_id;
    const label = isOrg
      ? `<span class="pill p-civ" style="font-size:9px">${t('invite.type.org')}</span> ${esc(inv.org_name||'?')} <span style="color:var(--t2)">[${esc(inv.org_code||'?')}]</span>`
      : `<span class="pill p-amb" style="font-size:9px">${t('invite.type.external')}</span> ${esc(inv.guest_label||t('invite.external.no_label'))} · <code style="color:var(--acc);letter-spacing:2px">${esc(inv.guest_join_code)}</code>`;
    const guestUrl = inv.guest_join_code
      ? `${window.location.origin}${window.location.pathname}#guest/${inv.guest_join_code}` : null;
    const copyBtn = guestUrl
      ? `<button class="btn btn-xs" onclick="cpText('${esc(guestUrl)}')" title="${t('invite.external.copy_code')}">🔗 ${t('ov.btn.copy')}</button>` : '';
    return `<div class="ir">
      <div class="im f1"><div class="is" style="font-size:12px">${label}</div></div>
      ${copyBtn}
      <button class="btn btn-xs btn-red" onclick="deleteInvitation('${inv.id}')">${t('btn.delete')}</button>
    </div>`;
  }).join('') : `<div class="empty" style="font-size:12px">${t('invite.empty')}</div>`;

  el.innerHTML = `
    <div class="ct">${t('invite.title')}</div>
    <div class="list mb8">${invList}</div>
    <div class="mb8">
      <div class="row c mb8">
        <div class="f1 acw">
          <input id="inv-org-inp" class="w100" placeholder="${t('invite.org.placeholder')}" oninput="acInvOrg(this.value)"/>
          <div class="acd" id="inv-org-ac"></div>
        </div>
        <button class="btn btn-acc btn-sm" onclick="inviteOrg()" data-i18n="invite.org.btn">${t('invite.org.btn')}</button>
      </div>
    </div>
    <div>
      <div class="row c">
        <input id="inv-ext-label" class="f1" placeholder="${t('invite.external.label.placeholder')}"/>
        <button class="btn btn-sm" onclick="createExternalInvite()">${t('invite.external.create')}</button>
      </div>
      <div id="inv-ext-result" class="H mt8"></div>
    </div>`;
}

async function acInvOrg(q) {
  if (!q || q.length < 2) { acClose('inv-org-ac'); _invOrgSelected=null; return; }
  clearTimeout(acTmr);
  acTmr = setTimeout(async () => {
    const excludeId = S && S.org_id ? S.org_id : '';
    const r = await api(`/api/orgs/search?q=${encodeURIComponent(q)}&exclude_org_id=${encodeURIComponent(excludeId)}`);
    if (!Array.isArray(r) || !r.length) { acClose('inv-org-ac'); return; }
    const ac = document.getElementById('inv-org-ac');
    if (!ac) return;
    ac.innerHTML = r.map((o,i) => `<div class="aci" onmousedown="selInvOrg(${i})">${esc(o.name)} <span style="color:var(--t2);font-size:10px">[${esc(o.code)}]</span></div>`).join('');
    ac.classList.add('open');
    window._invOrgResults = r;
  }, 180);
}

function selInvOrg(idx) {
  const r = window._invOrgResults;
  if (!r || !r[idx]) return;
  _invOrgSelected = r[idx];
  const inp = document.getElementById('inv-org-inp');
  if (inp) inp.value = `${r[idx].name} [${r[idx].code}]`;
  acClose('inv-org-ac');
}

async function inviteOrg() {
  if (!_invOrgSelected) { showAlert(t('invite.org.select_first')); return; }
  const r = await api(`/api/session/${S.id}/invitations`, 'POST',
    { code: myCode, type: 'org', invited_org_id: _invOrgSelected.id });
  if (r.error) { showAlert(r.error); return; }
  _invOrgSelected = null;
  const inp = document.getElementById('inv-org-inp');
  if (inp) inp.value = '';
  await renderOvInvitations();
}

async function createExternalInvite() {
  const label = (document.getElementById('inv-ext-label')?.value||'').trim();
  const r = await api(`/api/session/${S.id}/invitations`, 'POST',
    { code: myCode, type: 'external', guest_label: label||null });
  if (r.error) { showAlert(r.error); return; }
  const inp = document.getElementById('inv-ext-label');
  if (inp) inp.value = '';
  const url = `${window.location.origin}/#guest/${r.guest_join_code}`;
  const res = document.getElementById('inv-ext-result');
  if (res) {
    res.innerHTML = `<div class="alert a-ok" style="font-size:12px">
      ${t('invite.external.link')}: <code style="color:var(--acc);letter-spacing:2px">${esc(r.guest_join_code)}</code>
      <button class="btn btn-xs" onclick="cpText('${esc(url)}')" style="margin-left:6px">${t('ov.btn.copy')}</button>
    </div>`;
    res.classList.remove('H');
  }
  await renderOvInvitations();
}

async function deleteInvitation(invId) {
  if (!await showConfirm(t('invite.delete.confirm'))) return;
  const r = await api(`/api/session/${S.id}/invitations/${invId}?code=${myCode}`, 'DELETE');
  if (r.error) { showAlert(r.error); return; }
  await renderOvInvitations();
}

// ─────────────────────────────────────────────────────────────────
function updSubLockBtns(){
  const rb=document.getElementById("raffle-lock-btn");
  const cb=document.getElementById("comm-lock-btn");
  if(rb){
    // Hide when event is fully locked (can't toggle sub-locks independently)
    rb.classList.toggle("H", !S.raffle_done || S.locked);
    if(S.raffle_done && !S.locked){
      rb.textContent=S.raffle_locked?t("adm.raffle.locked"):t("adm.raffle.open");
      rb.className=S.raffle_locked?"btn btn-sm btn-gold":"btn btn-sm btn-grn";
    }
  }
  if(cb){
    const hasComm=(S.commodities||[]).length>0||(S.total_revenue!=null);
    cb.classList.toggle("H", !hasComm || S.locked);
    if(hasComm && !S.locked){
      cb.textContent=S.commodities_locked?t("adm.comm.locked"):t("adm.comm.open");
      cb.className=S.commodities_locked?"btn btn-sm btn-gold":"btn btn-sm btn-grn";
    }
  }
  // Hide add-forms and raffle button based on lock state
  const tog=(id,hidden)=>{const e=document.getElementById(id);if(e)e.classList.toggle("H",hidden);};
  tog("adm-pa-add", S.locked);
  tog("adm-lo-add", S.raffle_locked);
  tog("adm-co-add", S.commodities_locked);
  // Revenue card stays visible when locked — only hide the input row
  tog("rev-add-row", S.commodities_locked);
  tog("raffle-btn", S.raffle_locked);
}

// ── Waiting page selection display ────────────────────────────────────────────
function renderWaitSelection(){
  const identEl=document.getElementById("pt-wait-identity");
  if(identEl) identEl.textContent=t("pt.wait.identity",{name:myPName});
  const el=document.getElementById("pt-wait-sel-content");
  if(!el) return;
  const p=S.participants.find(x=>x.id===myPid);
  const ti=totalItems(S),np=S.participants.length;
  const niMode=ti>0&&np>0&&ti<np;
  const selIds=new Set(niMode?(p?p.no_interest||[]:[]):(p?p.wishes||[]:[]) );
  if(!selIds.size){el.innerHTML=`<div class="empty" style="padding:12px">${t("pt.wait.sel.empty")}</div>`;return;}
  const lootItems=S.loot.filter(l=>selIds.has(l.id)&&!l.for_sale).sort((a,b)=>a.name.localeCompare(b.name,"de"));
  if(!lootItems.length){el.innerHTML=`<div class="empty" style="padding:12px">${t("pt.wait.sel.empty")}</div>`;return;}
  el.innerHTML=lootItems.map(l=>`
    <div class="ir">
      <div class="im f1">
        <div class="in">${esc(l.name)}</div>
        <div class="pills">${pillsHTML(l)}</div>
      </div>
      <span class="pill ${niMode?"p-noint":"p-civ"}" style="font-size:9px">${niMode?t("ni.badge.no"):t("ra.badge.wish")}</span>
    </div>`).join("");
}

// ── i18n integration ──────────────────────────────────────────────────────────

// Called by i18n.js when user switches language — re-renders active page.
function onLangChange(lang) {
  const pages = {
    'pg-home':  () => { if (typeof loadHome === 'function') loadHome(); },
    'pg-admin': () => {
      if (!S) return;
      // Update dynamic sub-header
      const sub = document.getElementById('adm-sub');
      if (sub) sub.textContent = t('adm.sub');
      updOvStats && updOvStats();
      updLockBtn && updLockBtn();
      updSubLockBtns && updSubLockBtns();
      updMwAdm && updMwAdm();
      renderAP && renderAP();
      renderAL && renderAL();
      renderAC && renderAC();
      renderCoSum && renderCoSum();
      renderRS && renderRS();
      renderRR && renderRR();
    },
    'pg-part':  () => {
      if (!S) return;
      renderPtList && renderPtList();
      renderPtWishes && renderPtWishes();
      renderWaitSelection && renderWaitSelection();
      // Update identity bar
      const bar = document.getElementById('pt-id-bar');
      if (bar && myPName) bar.textContent = t('pt.logged_in_as', {name: myPName});
      // Re-render result if visible
      if (!document.getElementById('pt-result').classList.contains('H')) {
        renderPtResult && renderPtResult();
      }
    },
    'pg-ro':    () => { showROView && showROView(); },
    'pg-super': () => { loadSuperAdmin && loadSuperAdmin(); },
  };
  for (const [id, fn] of Object.entries(pages)) {
    const el = document.getElementById(id);
    if (el && !el.classList.contains('H')) { fn(); break; }
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────────
// i18n.js must be loaded before app.js. initLang() returns a Promise.
initLang().then(async () => {
  window.addEventListener('hashchange', handleRoute);
  await handleRoute();
});

// ═══════════════════════════════════════════════════════════════
//  ORG SYSTEM  (v6)
// ═══════════════════════════════════════════════════════════════

let ORG = null;          // current org object {id, name, code, logo_url}
let ORG_SECRET = '';     // org admin secret (empty for members)
let ORG_LEVEL  = '';     // 'admin' | 'member'
let _ORG_AUTH  = '';     // actual secret used to auth (admin or member — for read endpoints)
let orgSelMw = 3;     // selected max_wishes for new org event

// ── Persistence ──────────────────────────────────────────────────
function saveOrgSession(code, secret, level) {
  try {
    const d = { code, secret, level: level || ORG_LEVEL || 'member', ts: Date.now() };
    localStorage.setItem('sclm_org', JSON.stringify(d));
  } catch(_) {}
}
function loadOrgSession() {
  try {
    const d = JSON.parse(localStorage.getItem('sclm_org') || 'null');
    if (!d) return null;
    // Expire after 7 days
    if (Date.now() - d.ts > 7 * 86400000) { localStorage.removeItem('sclm_org'); return null; }
    return d;
  } catch(_) { return null; }
}
function clearOrgSession() {
  try { localStorage.removeItem('sclm_org'); } catch(_) {}
}

// ── Navigation ────────────────────────────────────────────────────
function showPage6(id) {
  ['pg-home','pg-admin','pg-part','pg-super','pg-ro','pg-org','pg-org-admin']
    .forEach(p => { const e = document.getElementById(p); if(e) e.classList.add('H'); });
  const el = document.getElementById(id);
  if (el) el.classList.remove('H');
}
function leaveOrg() {
  clearOrgSession();
  ORG = null; ORG_SECRET = ''; ORG_LEVEL = ''; _ORG_AUTH = '';
  goHome();
}
function showOrgLobby() {
  showPage6('pg-org'); hide('spill'); hide('btn-leave');
  document.body.style.backgroundImage='';
  history.replaceState(null,'','#org/'+(ORG?ORG.code:''));
  const adminBtn = document.getElementById('org-admin-btn');
  if (adminBtn) adminBtn.classList.toggle('H', ORG_LEVEL !== 'admin');
  renderOrgLobby();
}
async function showOrgAdmin() {
  if (ORG_LEVEL === 'admin') { showOrgAdminDirect(); return; }
  const sec = await showPromptPassword(t('org.secret.prompt'));
  if (!sec) return;
  const r = await api(`/api/orgs/${ORG.code}/verify`, 'POST', { secret: sec });
  if (r.error || r.level !== 'admin') { showAlert(t('org.err.wrong_secret')); return; }
  ORG_SECRET = sec; ORG_LEVEL = 'admin'; _ORG_AUTH = sec;
  saveOrgSession(ORG.code, sec, 'admin');
  showPage6('pg-org-admin');
  history.replaceState(null,'',`#org/${ORG.code}/admin`);
  renderOrgAdmin();
}
// If already have secret (restored from storage), skip prompt
function showOrgAdminDirect() {
  showPage6('pg-org-admin');
  history.replaceState(null,'',ORG?`#org/${ORG.code}/admin`:'#');
  renderOrgAdmin();
}

// ── Login / Create ────────────────────────────────────────────────
async function loginOrg() {
  const code = ($('org-code-inp').value || '').trim().toUpperCase();
  if (!code) return;
  // We need the secret to access events
  const sec = await showPromptPassword(t('org.secret.prompt'));
  if (!sec) return;
  const r = await api(`/api/orgs/${code}/verify`, 'POST', { secret: sec });
  if (r.error) { show('org-login-err'); $('org-login-err').textContent = t('org.err.wrong_secret'); return; }
  hide('org-login-err');
  // Load public org info
  const info = await api(`/api/orgs/${code}`);
  if (info.error) { show('org-login-err'); $('org-login-err').textContent = t('org.err.not_found'); return; }
  ORG = info;
  ORG_LEVEL = r.level || 'member';
  ORG_SECRET = ORG_LEVEL === 'admin' ? sec : '';
  _ORG_AUTH = sec;
  saveOrgSession(code, sec, ORG_LEVEL);
  showOrgLobby();
}

async function orgLoginCode() {
  const code = ($('org-code-inp2').value || '').trim().toUpperCase();
  if (!code || !ORG) return;
  hide('org-code-err');
  const r = await api(`/api/session/${code}`);
  if (r.error) { $('org-code-err').textContent = r.error; show('org-code-err'); return; }
  // Verify session belongs to this org
  if (r.org_id && r.org_id !== ORG.id) {
    $('org-code-err').textContent = t('org.err.not_found'); show('org-code-err'); return;
  }
  $('org-code-inp2').value = '';
  S = r; myCode = code;
  if (r.is_admin) { saveCreatorCode(r.id, code); showAdminView(); }
  else showPartView();
}

function togOrgCreate() {
  $('org-create-panel').classList.toggle('H');
}

let _newOrgData = null;

async function createOrg() {
  const name = ($('org-new-name').value || '').trim();
  const code = ($('org-new-code').value || '').trim().toUpperCase();
  if (!name || !code) return;
  const r = await api('/api/orgs', 'POST', { name, code });
  if (r.error) {
    show('org-create-err'); $('org-create-err').textContent = r.error;
    return;
  }
  hide('org-create-err');
  $('org-new-name').value = ''; $('org-new-code').value = '';
  $('org-create-panel').classList.add('H');
  // Pre-login so goToNewOrg() can navigate straight to lobby
  const info = await api(`/api/orgs/${code}`);
  ORG = info; ORG_SECRET = r.secret; ORG_LEVEL = 'admin'; _ORG_AUTH = r.secret;
  saveOrgSession(code, r.secret, 'admin');
  _newOrgData = r;
  // Show info modal
  $('org-created-info').innerHTML = `
    <div style="margin-bottom:8px"><b>${t('org.created.name')}</b> ${esc(name)}</div>
    <div style="margin-bottom:8px"><b>${t('org.created.code')}</b> <code style="color:var(--acc);font-size:14px">${esc(code)}</code></div>
    <hr style="border-color:var(--bdr);margin:10px 0"/>
    <div style="margin-bottom:8px">
      <b>${t('org.created.member_code')}</b><br/>
      <code style="color:var(--acc);font-size:16px;letter-spacing:2px">${esc(r.member_secret || '—')}</code>
      <div style="font-size:11px;color:var(--t2)">${t('org.created.member_code.hint')}</div>
    </div>
    <div style="margin-bottom:4px">
      <b>${t('org.created.admin_secret')}</b><br/>
      <code style="color:var(--gold);font-size:13px;word-break:break-all">${esc(r.secret)}</code>
      <div style="font-size:11px;color:var(--t2)">${t('org.created.admin_secret.hint')}</div>
    </div>`;
  document.getElementById('org-created-modal').classList.remove('H');
}

function goToNewOrg() {
  document.getElementById('org-created-modal').classList.add('H');
  _newOrgData = null;
  showOrgLobby();
}

// ── Render Org Lobby ──────────────────────────────────────────────
async function renderOrgLobby() {
  if (!ORG) return;
  // Header
  $('org-title').textContent = ORG.name.toUpperCase();
  $('org-sub-text').textContent = `${ORG.code} // SCLM`;
  const logoEl = $('org-logo-img');
  if (ORG.logo_url) { logoEl.src = ORG.logo_url; logoEl.style.display = ''; }
  else { logoEl.style.display = 'none'; }

  // Stats + events
  const r = await api(`/api/orgs/${ORG.code}/sessions?secret=${encodeURIComponent(_ORG_AUTH)}`);
  if (r.error) { leaveOrg(); return; }

  // Stats
  const stats = r.stats;
  $('org-stats').innerHTML = `
    <div class="stat" style="background:var(--bg2)">
      <div class="sv">${fmtN(stats.event_count)}</div>
      <div class="sl">${t('stats.events')}</div>
    </div>
    <div class="stat" style="background:var(--bg2)">
      <div class="sv">${fmtN(stats.total_raffled)}</div>
      <div class="sl">${t('org.stat.raffled')}</div>
    </div>
    <div class="stat" style="background:var(--bg2)">
      <div class="sv">${stats.total_scu > 0 ? fmtN(stats.total_scu, 1) + ' SCU' : '—'}</div>
      <div class="sl">${t('stats.scu')}</div>
    </div>
    <div class="stat" style="background:var(--bg2)">
      <div class="sv">${stats.total_revenue > 0 ? fmtN(stats.total_revenue) + ' aUEC' : '—'}</div>
      <div class="sl">${t('org.stat.revenue')}</div>
    </div>`;

  // Event list
  const el = $('org-event-list');
  if (!r.sessions.length) {
    el.innerHTML = `<div class="empty">${t('org.lobby.empty')}</div>`; return;
  }
  el.innerHTML = r.sessions.map(s => {
    const locked = s.locked ? `<span class="pill p-grade">${t('home.ec.locked')}</span>` : '';
    const done   = s.raffle_done ? `<span class="pill p-civ">${t('home.ec.raffled')}</span>` : '';
    const guestBadge = s.is_guest
      ? `<span class="pill p-amb" style="font-size:9px">${t('event.guest.badge')} ${t('event.guest.hosted_by')} ${esc(s.host_org_name||'?')}</span>`
      : '';
    const img = s.image_url
      ? `background:linear-gradient(to right,var(--bg1) 40%,transparent),url(${s.image_url}) center/cover;`
      : '';
    const cc = getCreatorCode(s.id);
    const declineBtn = s.is_guest && ORG_LEVEL === 'admin' && s.invitation_id
      ? `<button class="btn btn-xs btn-red" onclick="declineInvitation('${s.id}','${s.invitation_id}')">${t('event.guest.decline')}</button>`
      : '';
    return `<div class="ec" style="${img}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap">
        <div>
          <div class="ec-name">${esc(s.name)}</div>
          <div class="ec-meta">${locked}${done}${guestBadge}<span style="font-size:10px;color:var(--t2)">${s.created.slice(0,10)}</span></div>
        </div>
        <div class="ec-actions" style="flex-shrink:0">
          <button class="btn btn-xs" onclick="openRO('${s.join_code}')">${t('home.ec.view')}</button>
          ${cc ? `<button class="btn btn-xs btn-gold" onclick="quickAdminLogin('${s.id}')">${t('home.ec.creator')}</button>` : ''}
          ${declineBtn}
        </div>
      </div>
    </div>`;
  }).join('');
}

async function declineInvitation(sessionId, invId) {
  if (!await showConfirm(t('event.guest.decline.confirm'))) return;
  const r = await api(
    `/api/session/${sessionId}/invitations/${invId}?secret=${encodeURIComponent(_ORG_AUTH)}`,
    'DELETE'
  );
  if (r.error) { showAlert(r.error); return; }
  await renderOrgLobby();
}

// ── New Event in Org ───────────────────────────────────────────────
async function orgImportRH(inp) {
  const file = inp.files[0]; if (!file) return;
  let jd; try { jd = JSON.parse(await file.text()); } catch(e) { showAlert(t('err.invalid_json')); return; }
  const r = await api('/api/raidhelper/parse', 'POST', { json_data: jd, org_id: ORG ? ORG.id : 'default' });
  if (r.error) { showAlert(r.error); return; }
  $('org-ev-name').value = r.name;
  show('org-create-event-panel');
  const prev = r.participants.slice(0,8).join(', ') + (r.participants.length > 8 ? '...' : '');
  if (!await showConfirm(t('confirm.create_session', {name: r.name, count: r.participants.length}) + `\n\n${prev}`)) return;
  const cr = await api(`/api/orgs/${ORG.code}/create_session`, 'POST',
    { org_secret: ORG_SECRET, name: r.name, max_wishes: orgSelMw });
  if (cr.error) { show('org-ev-err'); $('org-ev-err').textContent = cr.error; return; }
  for (const nm of r.participants)
    await api(`/api/session/${cr.id}/participants`, 'POST', { code: cr.admin_code, name: nm, added_by: 'admin' });
  if (r.image_url) await api(`/api/session/${cr.id}/settings`, 'PATCH', { code: cr.admin_code, image_url: r.image_url });
  saveCreatorCode(cr.id, cr.admin_code);
  S = await api(`/api/session/${cr.admin_code}`);
  myCode = cr.admin_code;
  inp.value = '';
  showAdminView();
}

function orgNewEvent() {
  $('org-create-event-panel').classList.toggle('H');
}
function sOrgMw(btn) {
  $('org-mw-grp').querySelectorAll('.tgl').forEach(b => b.className = 'tgl');
  orgSelMw = +btn.dataset.v; btn.classList.add('st');
}
async function orgCreateEvent() {
  if (!ORG_SECRET) { showOrgAdmin(); return; }
  const name = ($('org-ev-name').value || '').trim();
  if (!name) return;
  const r = await api(`/api/orgs/${ORG.code}/create_session`, 'POST',
    { org_secret: ORG_SECRET, name, max_wishes: orgSelMw });
  if (r.error) { show('org-ev-err'); $('org-ev-err').textContent = r.error; return; }
  hide('org-ev-err');
  $('org-ev-name').value = '';
  $('org-create-event-panel').classList.add('H');
  saveCreatorCode(r.id, r.admin_code);
  // Directly enter admin view for the new event
  S = await api(`/api/session/${r.admin_code}`);
  myCode = r.admin_code;
  saveCreatorCode(S.id, r.admin_code);
  showAdminView();
}

// ── Org Admin ────────────────────────────────────────────────────
async function renderOrgAdmin() {
  if (!ORG) return;
  $('oa-name').value = ORG.name;
  $('oa-code').value = ORG.code;
  $('oa-logo').value = ORG.logo_url || '';
  $('oa-secret').value = '';
  $('oa-member-secret').value = '';
  // Load current codes for display
  if (ORG_SECRET) {
    const info = await api(`/api/orgs/${ORG.code}/admin-info?secret=${encodeURIComponent(ORG_SECRET)}`);
    if (!info.error) {
      const ms = document.getElementById('oa-member-secret-current');
      if (ms) ms.textContent = info.member_secret || t('misc.n_a');
    }
  }
  oaTab('events');
  loadOaPN(); loadOaCo();
  applyLangToDOM();
}

async function saveOrgSettings() {
  if (!ORG_SECRET) return;
  const data = {
    secret: ORG_SECRET,
    name: $('oa-name').value.trim(),
    logo_url: $('oa-logo').value.trim(),
  };
  const newCode = $('oa-code').value.trim().toUpperCase();
  if (newCode && newCode !== ORG.code) data.new_code = newCode;
  const newSec = $('oa-secret').value.trim();
  if (newSec) {
    if (newSec.length < 6) { show('oa-err'); $('oa-err').textContent = t('sa.set.new.label'); return; }
    data.new_secret = newSec;
  }
  const newMemberSec = $('oa-member-secret').value.trim();
  if (newMemberSec) {
    if (newMemberSec.length < 4) { show('oa-err'); $('oa-err').textContent = t('org.err.member_secret_length'); return; }
    data.new_member_secret = newMemberSec;
  }
  const r = await api(`/api/orgs/${ORG.code}/settings`, 'PATCH', data);
  if (r.error) { show('oa-err'); $('oa-err').textContent = r.error; return; }
  hide('oa-err');
  if (newSec) { ORG_SECRET = newSec; _ORG_AUTH = newSec; }
  $('oa-secret').value = ''; $('oa-member-secret').value = '';
  const info = await api(`/api/orgs/${newCode || ORG.code}`);
  ORG = info;
  if (data.new_code || newSec) saveOrgSession(ORG.code, ORG_SECRET || _ORG_AUTH, ORG_LEVEL);
  show('oa-ok'); $('oa-ok').textContent = t('status.saved');
  setTimeout(() => hide('oa-ok'), 3000);
}

function oaTab(tab) {
  ['events','items','participants','commodities','uex'].forEach(t2 => {
    const btn = document.getElementById(`ot-${t2}`);
    if (btn) btn.className = 'tab' + (t2 === tab ? ' active' : '');
    const el = document.getElementById(`ot-${t2}-c`);
    if (el) el.classList.toggle('H', t2 !== tab);
  });
  if (tab === 'events')      loadOaEvents();
  if (tab === 'items')       loadOaItems();
  if (tab === 'participants') loadOaPN();
  if (tab === 'commodities') loadOaCo();
}

async function loadOaEvents() {
  if (!ORG) return;
  const r = await api(`/api/orgs/${ORG.code}/sessions?secret=${encodeURIComponent(_ORG_AUTH)}`);
  const el = $('oa-ev-list');
  if (!r || r.error || !r.sessions.length) {
    el.innerHTML = `<div class="empty">${t('org.lobby.empty')}</div>`; return;
  }
  el.innerHTML = r.sessions.map(s => {
    const locked = s.locked ? `<span class="pill p-grade">${t('home.ec.locked')}</span>` : '';
    const rlocked = s.raffle_locked && !s.locked ? `<span class="pill p-amb" style="font-size:9px">${t('adm.raffle.locked')}</span>` : '';
    const clocked = s.commodities_locked && !s.locked ? `<span class="pill p-amb" style="font-size:9px">${t('adm.comm.locked')}</span>` : '';
    const done   = s.raffle_done ? `<span class="pill p-civ">${t('home.ec.raffled')}</span>` : '';
    return `<div class="ir" style="flex-wrap:wrap;gap:6px">
      <div class="im f1">
        <div class="in">${esc(s.name)}</div>
        <div class="pills">${locked}${rlocked}${clocked}${done}<span class="pill p-gray" style="font-size:9px">${s.created.slice(0,10)}</span></div>
        <div style="font-size:10px;color:var(--t2);margin-top:2px">
          Admin: <code style="color:var(--gold)">${s.admin_code}</code>
          &nbsp;Join: <code style="color:var(--acc)">${s.join_code}</code>
        </div>
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap">
        <button class="btn btn-xs btn-acc" onclick="oaEvAdmin('${s.admin_code}')">${t('btn.edit')}</button>
        <button class="btn btn-xs" onclick="openRO('${s.join_code}')">${t('home.ec.view')}</button>
        <button class="btn btn-xs ${s.locked?'btn-gold':'btn-grn'}" onclick="oaEvToggleLock('${s.id}','${s.admin_code}',${s.locked})">${s.locked?t('adm.lock.locked'):t('adm.lock.open')}</button>
        <button class="btn btn-xs btn-red" onclick="oaEvDelete('${s.id}','${s.admin_code}',${JSON.stringify(s.name).replace(/"/g,'&quot;')})">✕</button>
      </div>
    </div>`;
  }).join('');
}

async function oaEvAdmin(adminCode) {
  const r = await api(`/api/session/${adminCode}`);
  if (r.error) { showAlert(r.error); return; }
  S = r; myCode = adminCode;
  saveCreatorCode(S.id, adminCode);
  showAdminView();
}

async function oaEvToggleLock(sid, adminCode, isLocked) {
  if (isLocked) {
    if (!await showConfirm(t('confirm.unlock'))) return;
    await api(`/api/session/${sid}/settings`, 'PATCH', { secret: ORG_SECRET, locked: false });
  } else {
    if (!await showConfirm(t('confirm.lock'))) return;
    await api(`/api/session/${sid}/settings`, 'PATCH', { code: adminCode, locked: true });
  }
  await loadOaEvents();
}

async function oaEvDelete(sid, adminCode, name) {
  if (!await showConfirm(t('org.event.delete.confirm',{name}))) return;
  const r = await api(`/api/session/${sid}?code=${encodeURIComponent(adminCode)}`, 'DELETE');
  if (r.error) { showAlert(r.error); return; }
  await loadOaEvents();
}

// ── Org DB management ────────────────────────────────────────────
async function loadOaItems() {
  if (!ORG) return;
  const items = await api(`/api/orgs/${ORG.code}/items?secret=${encodeURIComponent(ORG_SECRET)}`);
  const el = $('oa-it-list');
  if (!Array.isArray(items) || !items.length) { el.innerHTML = `<div class="empty">${t('sa.empty.items')}</div>`; return; }
  el.innerHTML = items.map(i => `
    <div class="ir">
      <div class="im f1"><div class="in">${esc(i.name)}</div><div class="pills">${pillsHTML(i)}</div></div>
      <button class="btn btn-xs btn-red" onclick="oaDelItem(${JSON.stringify(i.loot_key).replace(/"/g,'&quot;')})">✕</button>
    </div>`).join('');
}

async function oaAcL(q) {
  if (!q || !ORG) { acClose('oa-l-ac'); return; }
  clearTimeout(acTmr);
  acTmr = setTimeout(async () => {
    const r = await api(`/api/items/search?q=${encodeURIComponent(q)}&org_id=${ORG.id}`);
    acRender('oa-l-ac', r.map(x => x.name), nm => { $('oa-l-nm').value = nm; acClose('oa-l-ac'); });
  }, 180);
}

let oaCat='item', oaSwSz='1', oaTyp='MIL', oaGrd='A', oaSz='1';
function oaSCat(btn){
  $('oa-cat-grp').querySelectorAll('.tgl').forEach(b=>b.classList.remove('st')); btn.classList.add('st');
  oaCat=btn.dataset.v;
  $('oa-weapon-f').classList.toggle('H', oaCat!=='weapon');
  $('oa-comp-f').classList.toggle('H', oaCat!=='comp');
}
function oaSWSz(btn){$('oa-sw-sz-grp').querySelectorAll('.tgl').forEach(b=>b.classList.remove('st'));btn.classList.add('st');oaSwSz=btn.dataset.v;}
function oaST(btn){$('oa-ty-grp').querySelectorAll('.tgl').forEach(b=>b.classList.remove('st'));btn.classList.add('st');oaTyp=btn.dataset.v;}
function oaSG(btn){$('oa-gr-grp').querySelectorAll('.tgl').forEach(b=>b.classList.remove('st'));btn.classList.add('st');oaGrd=btn.dataset.v;}
function oaSS(btn){$('oa-sz-grp').querySelectorAll('.tgl').forEach(b=>b.classList.remove('st'));btn.classList.add('st');oaSz=btn.dataset.v;}
async function oaAddItem() {
  const nm = ($('oa-l-nm').value||'').trim(); if(!nm||!ORG_SECRET) return;
  const typ   = oaCat==='comp'   ? oaTyp  : null;
  const grade = oaCat==='comp'   ? oaGrd  : null;
  const size  = oaCat==='weapon' ? oaSwSz : oaCat==='comp' ? oaSz : null;
  await api(`/api/admin/items`, 'POST', { secret: ORG_SECRET, name: nm, type: typ, grade, size, org_id: ORG.id });
  $('oa-l-nm').value=''; acClose('oa-l-ac'); await loadOaItems();
}
async function oaDelItem(key) {
  if (!await showConfirm(t('confirm.del_db_item',{name:key}))) return;
  await api(`/api/admin/items/${encodeURIComponent(key)}?secret=${encodeURIComponent(ORG_SECRET)}&org_id=${encodeURIComponent(ORG.id)}`, 'DELETE');
  await loadOaItems();
}

async function loadOaPN() {
  if (!ORG) return;
  const r = await api(`/api/orgs/${ORG.code}/participants?secret=${encodeURIComponent(ORG_SECRET)}`);
  const el = $('oa-pn-list');
  if (!Array.isArray(r) || !r.length) { el.innerHTML = `<div class="empty">${t('sa.empty.participants')}</div>`; return; }
  el.innerHTML = r.map(nm => `<div class="ir">
    <div class="im f1"><div class="in">${esc(nm)}</div></div>
    <button class="btn btn-xs btn-red" onclick="oaDelPN(${JSON.stringify(nm).replace(/"/g,'&quot;')})">✕</button>
  </div>`).join('');
}
async function oaAddPN() {
  const nm = ($('oa-pn-inp').value||'').trim(); if(!nm) return;
  await fetch(`/api/admin/participants`, {method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({secret: ORG_SECRET, name: nm, org_id: ORG.id})});
  $('oa-pn-inp').value=''; await loadOaPN();
}
async function oaDelPN(nm) {
  await api(`/api/admin/participants/${encodeURIComponent(nm)}?secret=${encodeURIComponent(ORG_SECRET)}&org_id=${encodeURIComponent(ORG.id)}`, 'DELETE');
  await loadOaPN();
}

async function loadOaCo() {
  if (!ORG) return;
  const r = await api(`/api/orgs/${ORG.code}/commodities?secret=${encodeURIComponent(ORG_SECRET)}`);
  const el = $('oa-co-list');
  if (!Array.isArray(r) || !r.length) { el.innerHTML = `<div class="empty">${t('sa.empty.commodities')}</div>`; return; }
  el.innerHTML = r.map(nm => `<div class="ir">
    <div class="im f1"><div class="in">${esc(nm)}</div></div>
    <button class="btn btn-xs btn-red" onclick="oaDelCo(${JSON.stringify(nm).replace(/"/g,'&quot;')})">✕</button>
  </div>`).join('');
}
async function oaAddCo() {
  const nm = ($('oa-co-inp').value||'').trim(); if(!nm) return;
  await fetch(`/api/admin/commodities`, {method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({secret: ORG_SECRET, name: nm, org_id: ORG.id})});
  $('oa-co-inp').value=''; await loadOaCo();
}
async function oaDelCo(nm) {
  await api(`/api/admin/commodities/${encodeURIComponent(nm)}?secret=${encodeURIComponent(ORG_SECRET)}&org_id=${encodeURIComponent(ORG.id)}`, 'DELETE');
  await loadOaCo();
}

// ── UEX Import for org ──────────────────────────────────────────
async function oaRunUex() {
  if (!ORG_SECRET) return;
  // Reuse the existing UEX import but write to org scope
  // Pass org_id via a custom mechanism - store temporarily
  window._uexOrgId = ORG.id;
  window._uexSecret = ORG_SECRET;
  // Call the existing runUex logic adapted for org
  const btn = $('oa-uex-btn'); btn.disabled = true; btn.textContent = t('uex.running');
  const res = $('oa-uex-result'); res.innerHTML = '';
  const uexProxy = async (path, qs='') => {
    const url = `/api/uex_proxy?secret=${encodeURIComponent(ORG_SECRET)}&org_id=${encodeURIComponent(ORG.id)}&path=${encodeURIComponent(path)}${qs?'&qs='+encodeURIComponent(qs):''}`;
    const r = await fetch(url); return r.ok ? r.json() : null;
  };
  try {
    const CAT_IDS=[19,21,22,23,32,83,86];
    const setStatus=(msg)=>{res.innerHTML=`<div class="alert a-info" style="font-size:11px">${msg}</div>`;};
    let added=0,updated=0;
    for(let i=0;i<CAT_IDS.length;i++){
      const catId=CAT_IDS[i];
      setStatus(t('uex.loading_category',{i:i+1,n:CAT_IDS.length,id:catId}));
      const catData=await uexProxy('items',`id_category=${catId}`);
      if(!catData) continue;
      const items=catData.data||[];
      for(const item of items){
        const name=item.name;if(!name) continue;
        let typ=null,grade=null,size=null;
        if(catId===32){size=String(item.size??0);}
        else{
          try{
            const attrData=await uexProxy('items_attributes',`id_item=${item.id}`);
            if(attrData){const attrs=attrData.data||[];
              for(const a of attrs){
                const an=a.attribute_name||'';
                if(an==="Size") size=String(a.value||0);
                else if(an==="Class") typ=({'Military':'MIL','Stealth':'STE','Competition':'COM','Civilian':'CIV','Industrial':'IND'}[a.value]||null);
                else if((an==="Grade"||an==="Grade Letter")&&!an.includes("Numeric")) grade=a.value||null;
              }
            }
          }catch(_){}
        }
        const r=await fetch('/api/admin/uex_item',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({secret:ORG_SECRET,name,type:typ,grade,size,org_id:ORG.id})});
        const rd=await r.json();
        if(rd.added) added++; else if(rd.updated) updated++;
      }
    }
    setStatus(t('uex.saving'));
    res.innerHTML=`<div class="alert a-ok">${t('uex.done')}<br>${t('uex.result',{added,updated})}</div>`;
    await loadOaItems();
  } catch(e) {
    res.innerHTML=`<div class="alert a-err">${t('uex.error')}: ${esc(e.message)}<br><span style="font-size:10px">${t('sa.uex.network_hint')}</span></div>`;
  }
  btn.disabled=false; btn.textContent=t('sa.uex.btn');
}

// ── Restore org session on page load ────────────────────────────
async function restoreOrgSession(code) {
  const saved = loadOrgSession();
  if (!saved) return false;
  if (code && saved.code.toUpperCase() !== code.toUpperCase()) return false;
  const info = await api(`/api/orgs/${saved.code}`);
  if (info.error) { clearOrgSession(); return false; }
  const vr = await api(`/api/orgs/${saved.code}/verify`, 'POST', { secret: saved.secret });
  if (vr.error) { clearOrgSession(); return false; }
  ORG = info;
  ORG_LEVEL = vr.level || saved.level || 'member';
  ORG_SECRET = ORG_LEVEL === 'admin' ? saved.secret : '';
  _ORG_AUTH = saved.secret;
  return true;
}
