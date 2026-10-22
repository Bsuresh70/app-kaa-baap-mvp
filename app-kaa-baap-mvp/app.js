const $ = id => document.getElementById(id);
const catalogue = window.APP_CATALOGUE || [];
function score(app, query) {
 const q = query.toLowerCase().trim();
 if (!q) return 0;
 const words = q.split(/[^a-z0-9]+/).filter(w => w.length > 2);
 const hay = `${app.name} ${app.category} ${app.description} ${app.keywords}`.toLowerCase();
 return words.reduce((s,w)=>s+(hay.includes(w)?2:0),0);
}
function render(query="") {
 const country=$("country").value, price=$("price").value, platform=$("platform").value;
 let items=catalogue.filter(a=>(country==="All"||a.countries.includes(country))&&(price==="All"||a.price===price)&&(platform==="All"||a.platforms.includes(platform)));
 items=items.map(a=>({...a,score:score(a,query)}));
 if(query.trim()) items=items.filter(a=>a.score>0).sort((a,b)=>b.score-a.score);
 $("resultTitle").textContent=query.trim()?"Apps matching your goal":"Popular starting points";
 $("count").textContent=`${items.length} apps`;
 $("cards").innerHTML=items.length?items.map(a=>`<article class="card"><div class="card-top"><span class="appicon">${a.icon}</span><span class="tag">${a.price}</span></div><h3>${escapeHTML(a.name)}</h3><div class="meta">${escapeHTML(a.category)} · ${a.platforms.join(", ")}</div><p>${escapeHTML(a.description)}</p><p class="reason">${query.trim()?"Why it may fit: matches your search terms.":"A catalogue starting point for common tasks."}</p><a href="${a.url}" target="_blank" rel="noopener noreferrer">Visit official website ↗</a></article>`).join(""):`<div class="empty">No catalogue matches yet. Try broader words or change the filters.</div>`;
}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
$("searchForm").addEventListener("submit",e=>{e.preventDefault();render($("query").value)});
document.querySelectorAll("[data-query]").forEach(b=>b.addEventListener("click",()=>{$("query").value=b.dataset.query;render(b.dataset.query)}));
["country","price","platform"].forEach(id=>$(id).addEventListener("change",()=>render($("query").value)));
$("devForm").addEventListener("submit",e=>{e.preventDefault();$("devMsg").textContent="Demo only: this form does not send or save your submission yet. Connect a secure backend before accepting real submissions.";});
render();
