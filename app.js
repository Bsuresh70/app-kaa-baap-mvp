const $ = id => document.getElementById(id);
const catalogue = window.APP_CATALOGUE || [];
let latestSearch = 0;

function filteredApps() {
  const country=$("country").value, price=$("price").value, platform=$("platform").value;
  return catalogue.filter(a=>(country==="All"||a.countries.includes(country))&&(price==="All"||a.price===price)&&(platform==="All"||a.platforms.includes(platform)));
}
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function safeHttps(value) {
  try { const url = new URL(value); return url.protocol === "https:" ? url.href : ""; } catch { return ""; }
}
function pricingNote(app) {
  const price = app.price || "Unknown";
  const evidence = app.priceEvidence ? " Pricing evidence: " + app.priceEvidence : "";
  if (price === "Free") return "Free listing; this does not guarantee every feature is free." + evidence;
  if (price === "Freemium") return "Free tier with paid features or limits." + evidence;
  if (price === "Paid") return "Paid offering; confirm current price and billing terms." + evidence;
  return "Pricing not established. Check the provider's current terms.";
}
function verificationNote(app) {
  const source = safeHttps(app.sourceUrl);
  const store = safeHttps(app.androidListingUrl) || safeHttps(app.iosListingUrl);
  if (app.verificationStatus === "official_store_link") return "Official app-store listing link supplied; listing contents and current availability have not been independently audited.";
  if (source) return "Research source supplied; details have not been independently audited.";
  if (store) return "App-store link supplied; details have not been independently audited.";
  return "Not independently verified. Treat features, pricing and availability as unconfirmed.";
}
function appLinks(app) {
  const website = safeHttps(app.url);
  const play = safeHttps(app.androidListingUrl);
  const apple = safeHttps(app.iosListingUrl);
  const source = safeHttps(app.sourceUrl);
  return [
    play ? '<a href="'+escapeHTML(play)+'" target="_blank" rel="noopener noreferrer">Google Play ↗</a>' : "",
    apple ? '<a href="'+escapeHTML(apple)+'" target="_blank" rel="noopener noreferrer">App Store ↗</a>' : "",
    website ? '<a href="'+escapeHTML(website)+'" target="_blank" rel="noopener noreferrer">Official website ↗</a>' : "",
    source ? '<a href="'+escapeHTML(source)+'" target="_blank" rel="noopener noreferrer">Research source ↗</a>' : ""
  ].filter(Boolean).join("");
}
function renderCards(items, query) {
  $("resultTitle").textContent=query.trim()?"Apps matching your goal":"Popular starting points";
  $("count").textContent=items.length+" apps";
  $("cards").innerHTML=items.length?items.map(app=>'<article class="card"><div class="card-top"><span class="appicon">'+escapeHTML(app.icon || "🌐")+'</span><span class="tag">'+escapeHTML(app.price || "Unknown")+'</span></div><h3>'+escapeHTML(app.name)+'</h3><div class="meta">'+escapeHTML(app.category || "Digital service")+' · '+escapeHTML((app.platforms || []).join(", ") || "Platform unknown")+'</div><p>'+escapeHTML(app.description || "")+'</p><p class="pricing-note">'+escapeHTML(pricingNote(app))+'</p><p class="reason">'+escapeHTML(app.reason || "Potentially relevant to your goal.")+'</p><p class="evidence">Evidence: '+escapeHTML(verificationNote(app))+'</p><div class="access-links">'+appLinks(app)+'</div></article>').join(""):'<div class="empty">No suitable matches found. Try adjusting your filters or describing the need differently.</div>';
}
function renderComparison(comparison, items) {
  const host=$("comparison");
  if (!host) return;
  const visibleIds=new Set(items.map(app=>app.id));
  const rows=(Array.isArray(comparison)?comparison:[]).filter(row=>visibleIds.has(row.appId));
  if (rows.length < 2) { host.hidden=true; host.innerHTML=""; return; }
  const labels=[["bestFor","Best for"],["freeFeatures","Free features"],["aiTools","AI tools"],["watermarks","Watermarks"],["easeOfUse","Ease of use"],["limitations","Limitations"]];
  host.hidden=false;
  host.innerHTML='<div class="comparison-heading"><div><p class="eyebrow">SIDE-BY-SIDE VIEW</p><h3>Compare these exact results</h3><p>Every column below corresponds to an app card shown above. “Not confirmed” means we could not establish that detail from the available sources.</p></div></div><div class="comparison-scroll"><table class="comparison-table"><thead><tr><th>What matters</th>'+rows.map(row=>'<th>'+escapeHTML(items.find(app=>app.id===row.appId)?.name || "")+'</th>').join("")+'</tr></thead><tbody>'+labels.map(([key,label])=>'<tr><th>'+label+'</th>'+rows.map(row=>'<td>'+escapeHTML(row[key] || "Not confirmed")+'</td>').join("")+'</tr>').join("")+'</tbody></table></div>';
}
async function render(query="") {
  const requestId=++latestSearch;
  const apps=filteredApps();
  $("comparison").hidden=true;
  $("comparison").innerHTML="";
  if (!query.trim()) {
    $("notice").textContent="Catalogue starting points. Verify current pricing, features and availability on each provider's official site.";
    renderCards(apps, query);
    return;
  }
  $("resultTitle").textContent="Understanding your goal…";
  $("count").textContent="Searching";
  $("cards").innerHTML='<div class="empty">Searching the live web and checking your selected filters…</div>';
  $("notice").textContent="Recommendations are evidence-led suggestions, not endorsements. Check linked provider and store pages before installing or paying.";
  try {
    const response=await fetch("/.netlify/functions/discover",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({query:query.trim(),country:$("country").value,price:$("price").value,platform:$("platform").value,apps:apps.map(({id,name,category,description,keywords,price,countries,platforms})=>({id,name,category,description,keywords,price,countries,platforms}))})
    });
    const data=await response.json();
    if(requestId!==latestSearch)return;
    if(!response.ok)throw new Error(data.error || "AI search unavailable");
    const items=(Array.isArray(data.matches)?data.matches:[]).filter(app=>app && typeof app.id==="string" && typeof app.name==="string").map(app=>({...app,icon:"🌐"}));
    renderCards(items,query);
    renderComparison(data.comparison,items);
    const names=items.map(app=>app.name);
    const generatedSummary=names.length ? "Results shown: "+names.join(", ")+". The summary and comparison are limited to these displayed results." : "No matching apps met the selected requirements with enough supporting evidence. We have not filled the list with weak or invented matches.";
    $("notice").textContent=generatedSummary+" Pricing and feature details are source-linked where available, but have not been independently audited.";
  } catch(error) {
    if(requestId!==latestSearch)return;
    renderCards([],query);
    $("resultTitle").textContent="Unable to make a reliable recommendation";
    $("notice").textContent="Live discovery is temporarily unavailable, so keyword-only recommendations have been withheld. Please try again later. "+(error.message || "");
  }
}
$("searchForm").addEventListener("submit",event=>{event.preventDefault();render($("query").value);});
document.querySelectorAll("[data-query]").forEach(button=>button.addEventListener("click",()=>{$("query").value=button.dataset.query;render(button.dataset.query);}));
["country","price","platform"].forEach(id=>$(id).addEventListener("change",()=>render($("query").value)));
$("devForm").addEventListener("submit",event=>{event.preventDefault();$("devMsg").textContent="Demo only: submissions are not sent or saved yet. A secure review workflow is required before accepting real submissions.";});
render();
