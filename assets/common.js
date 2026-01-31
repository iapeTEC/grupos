/**
 * SIM/NÃO Voting - Front-end helper
 * Works from GitHub Pages using JSONP to avoid CORS headaches.
 *
 * CONFIG: change BACKEND_URL and ADMIN_KEY below.
 */
const CONFIG = {
  BACKEND_URL: "https://script.google.com/macros/s/AKfycbw4OaifPqaN2GGRTX5e9L8DjtNJtc2fWbCr3AF_ar6u30jEK13nx6WjVikNLfon_FUM/exec",   // e.g. https://script.google.com/macros/s/XXXX/exec
  ADMIN_KEY: "MzAk9do3@.@",                // choose a strong key (used only for reset)
  POLL_MS: 900
};

function $(sel){ return document.querySelector(sel); }
function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

function getDeviceId(){
  const key = "vote_device_id_v1";
  let id = localStorage.getItem(key);
  if(!id){
    id = "d_" + cryptoRandom(20);
    localStorage.setItem(key, id);
  }
  return id;
}

function cryptoRandom(n){
  // Prefer crypto if available
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  try{
    const arr = new Uint8Array(n);
    crypto.getRandomValues(arr);
    for(const b of arr) out += chars[b % chars.length];
    return out;
  }catch(e){
    for(let i=0;i<n;i++) out += chars[Math.floor(Math.random()*chars.length)];
    return out;
  }
}

function lastVotedRound(){
  return Number(localStorage.getItem("vote_last_round_v1") || "0");
}
function setLastVotedRound(round){
  localStorage.setItem("vote_last_round_v1", String(round));
}

function showToast(msg, kind="ok"){
  const t = $("#toast");
  if(!t) return;
  t.querySelector(".msg").textContent = msg;
  t.querySelector(".tag").textContent = kind==="ok" ? "OK" : "ERRO";
  t.querySelector(".tag").className = "tag " + (kind==="ok" ? "ok" : "err");
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"), 2200);
}

/**
 * JSONP call: injects <script src="...&callback=cb_xxx"></script>
 */
function jsonp(params){
  return new Promise((resolve, reject)=>{
    if(!CONFIG.BACKEND_URL || CONFIG.BACKEND_URL.includes("PASTE_YOUR")){
      reject(new Error("BACKEND_URL não configurada."));
      return;
    }
    const cb = "cb_" + cryptoRandom(18);
    const url = new URL(CONFIG.BACKEND_URL);
    Object.entries(params).forEach(([k,v])=>url.searchParams.set(k, String(v)));
    url.searchParams.set("callback", cb);

    const s = document.createElement("script");
    s.src = url.toString();
    s.async = true;

    const timeout = setTimeout(()=>{
      cleanup();
      reject(new Error("Timeout ao chamar o backend."));
    }, 7000);

    function cleanup(){
      clearTimeout(timeout);
      delete window[cb];
      if(s.parentNode) s.parentNode.removeChild(s);
    }

    window[cb] = (data)=>{
      cleanup();
      if(data && data.ok) resolve(data);
      else reject(new Error((data && data.error) || "Resposta inválida do backend."));
    };

    s.onerror = ()=>{
      cleanup();
      reject(new Error("Falha ao carregar script JSONP (verifique a URL do backend)."));
    };

    document.body.appendChild(s);
  });
}

async function apiStatus(){
  return await jsonp({ action:"status" });
}

async function apiVote(choice, round){
  return await jsonp({
    action:"vote",
    choice,
    round,
    device: getDeviceId()
  });
}

async function apiReset(){
  return await jsonp({
    action:"reset",
    key: CONFIG.ADMIN_KEY
  });
}
