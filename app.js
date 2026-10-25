const $ = id => document.getElementById(id);
const catalogue = window.APP_CATALOGUE || [];
let latestSearch = 0;

function score(app, query) {
 const q = query.toLowerCase().trim();
 if (!q) return 0;
 const words = q.split(/[^a-z0-9]+/).filter(w => w.length > 2);
 const hay = `${app.name} ${app.category} ${app.description} ${app.keywords}`.toLowerCase();
 return words.reduce((s,w)=>s+(hay.includes(w)?2:0),0);
}
function filteredApps() {
 const country=$("country").value, price=$("price").value, platform=$("platform").value;
 return catalogue.filter(a=>(country==="All"||a.countries.includes(country))&&(price==="All"||a.price===price)&&(platform==="All"||a.platforms.includes(platform)));
}
function linkLabel(app) {
 if (app.linkType === "google_play_listing") return "Open Google Play listing";
 if (app.linkType === "apple_app_store_listing") return "Open Apple App Store listing";
 return "Visit listed website";
}
function verificationNote(app) {
 if (app.verificationStatus === "verified" && app.lastVerifiedAt) return `Verified on ${app.lastVerifiedAt}.`;
 return "Not independently verified. Listing URLs, availability and details should be checked before relying on them.";
}
function pricingNote(price) {
 if (price === "Free") return "Catalogue pricing: Free. Check the official site for any in-app purchases or exceptions.";
 if (price === "Freemium") return "Catalogue pricing: Free tier with possible paid features. Check current plan limits and subscription terms.";
 if (price === "Paid") return "Catalogue pricing: Paid. Confirm the current price, billing period and cancellation terms before paying.";
 return "Pricing details are not available in the catalogue; check the official site.";
}
function renderCards(items, query, reasons = {}) {
 $("resultTitle").textContent=query.trim()?"Apps matching your goal":"Popular starting points";
 $("count").textContent=`${items.length} apps`;
 $("cards").innerHTML=items.length?items.map(a=>`<article class="card"><div class="card-top"><span class="appicon">${escapeHTML(a.icon)}</span><span class="tag">${escapeHTML(a.price)}</span></div><h3>${escapeHTML(a.name)}</h3><div class="meta">${escapeHTML(a.category)} · ${a.platforms.map(escapeHTML).join(", ")}</div><p>${escapeHTML(a.description)}</p><p class="pricing-note">${escapeHTML(pricingNote(a.price))}</p><p class="reason">${escapeHTML(reasons[a.id] || (query.trim()?"Why it may fit: matches your search terms.":"A catalogue starting point for common tasks."))}</p><p class="evidence">Evidence status: ${escapeHTML(verificationNote(a))}</p><div class="access-links">${a.url?`<a href="${escapeHTML(a.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(linkLabel(a))} ↗</a>`:""}${a.androidListingUrl?`<a href="${escapeHTML(a.androidListingUrl)}" target="_blank" rel="noopener noreferrer">Google Play ↗</a>`:""}${a.iosListingUrl?`<a href="${escapeHTML(a.iosListingUrl)}" target="_blank" rel="noopener noreferrer">Apple App Store ↗</a>`:""}</div></article>`).join(""):`<div class="empty">No catalogue matches yet. Try broader words or change the filters.</div>`;
}
function fallbackSearch(apps, query) {
 return apps.map(a=>({...a,score:score(a,query)})).filter(a=>a.score>0).sort((a,b)=>b.score-a.score).slice(0,8);
}
async function render(query="") {
 const requestId = ++latestSearch;
 const apps = filteredApps();
 if (!query.trim()) {
   $("notice").textContent="Demo catalogue — verify current pricing, features and availability on each official site.";
   renderCards(apps, query);
   return;
 }

 $("resultTitle").textContent="Understanding your goal…";
 $("count").textContent="Searching";
 $("cards").innerHTML='<div class="empty">AI is matching your request against the current app catalogue…</div>';
 $("notice").textContent="Searching the live web and the current catalogue. Results are suggestions; verify details on official sites.";

 try {
   const response = await fetch("/.netlify/functions/discover", {
     method:"POST",
     headers:{"Content-Type":"application/json"},
     body:JSON.stringify({
       query:query.trim(),
       country:$("country").value,
       price:$("price").value,
       platform:$("platform").value,
       apps:apps.map(({id,name,category,description,keywords,price,countries,platforms})=>({id,name,category,description,keywords,price,countries,platforms}))
     })
   });
   const data = await response.json();
   if (requestId !== latestSearch) return;
   if (!response.ok) throw new Error(data.error || "AI search unavailable");
   const reasons = {};
   const items = (Array.isArray(data.matches)?data.matches:[]).map(m=>{ if(m && typeof m.name==="string" && typeof m.url==="string"){reasons[m.id]=m.reason||"";return {...m,icon:m.icon||"🌐"};} const found=apps.find(a=>a.id===m.id); if(found) reasons[m.id]=m.reason||""; return found; }).filter(Boolean);
   renderCards(items, query, reasons);
   $("notice").textContent=(data.summary ? data.summary+" " : "")+"Live web results are not independently verified; confirm features, pricing and availability on official sites.";
 } catch (error) {
   if (requestId !== latestSearch) return;
   renderCards([], query);
   $("resultTitle").textContent="Unable to make a reliable recommendation";
   $("notice").textContent="AI search is temporarily unavailable, so we have not shown keyword-based recommendations that may be irrelevant. Please try again later. Technical detail: "+(error.message || "AI service unavailable.");
 }
}
function escapeHTML(s){return String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
$("searchForm").addEventListener("submit",e=>{e.preventDefault();render($("query").value)});
document.querySelectorAll("[data-query]").forEach(b=>b.addEventListener("click",()=>{$("query").value=b.dataset.query;render(b.dataset.query)}));
["country","price","platform"].forEach(id=>$(id).addEventListener("change",()=>render($("query").value)));
$("devForm").addEventListener("submit",e=>{e.preventDefault();$("devMsg").textContent="Demo only: this form does not send or save your submission yet. Connect a secure backend before accepting real submissions.";});
render();
