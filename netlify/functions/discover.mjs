const MODEL = "gpt-6-luna";
const MAX_QUERY_LENGTH = 500;
const MAX_APPS = 100;
const clean = (value, max = 500) => String(value ?? "").replace(/[\u0000-\u001f\u007f<>]/g, " ").trim().slice(0, max);
const httpsUrl = value => { try { const u = new URL(value); return u.protocol === "https:" ? u.href : ""; } catch { return ""; } };
const json = (statusCode, body) => ({statusCode,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"},body:JSON.stringify(body)});

export async function handler(event) {
  if (event.httpMethod !== "POST") return json(405,{error:"Method not allowed."});
  const apiKey=process.env.OPENAI_API_KEY;
  if (!apiKey) return json(503,{error:"OpenAI live discovery is not configured. Add OPENAI_API_KEY to Netlify and redeploy."});
  let body;
  try { body=JSON.parse(event.body || "{}"); } catch { return json(400,{error:"Please send a valid search request."}); }
  const query=typeof body.query==="string"?body.query.trim():"";
  if(!query || query.length>MAX_QUERY_LENGTH)return json(400,{error:"Enter a search of 1–500 characters."});
  const apps=(Array.isArray(body.apps)?body.apps:[]).slice(0,MAX_APPS).filter(a=>a&&typeof a.id==="string"&&typeof a.name==="string").map(a=>({id:clean(a.id,100),name:clean(a.name,120),category:clean(a.category,100),description:clean(a.description,300),keywords:clean(a.keywords,300),price:clean(a.price,40),countries:Array.isArray(a.countries)?a.countries.map(x=>clean(x,30)).slice(0,10):[],platforms:Array.isArray(a.platforms)?a.platforms.map(x=>clean(x,20)).slice(0,10):[]}));
  const filters={country:body.country||"All",price:body.price||"All",platform:body.platform||"All"};
  const compareIntent=/\b(compare|comparison|versus|vs\.?|side[- ]by[- ]side|which is better)\b/i.test(query);
  const queryCountry=/\b(in india|indian|for india)\b/i.test(query)?"India":/\b(in the usa|in usa|in the united states|for us users)\b/i.test(query)?"USA":"All";
  const queryPrice=/\b(completely free|totally free|100% free|entirely free|free only|free apps?|free options?|no paid apps?|without paying)\b/i.test(query)?"Free":"All";
  const queryPlatform=/\bandroid\b/i.test(query)?"Android":/\b(ios|iphone|ipad)\b/i.test(query)?"iOS":/\b(web app|web only|browser-based)\b/i.test(query)?"Web":"All";
  const effectiveFilters={country:filters.country!=="All"?filters.country:queryCountry,price:filters.price!=="All"?filters.price:queryPrice,platform:filters.platform!=="All"?filters.platform:queryPlatform};
  const prompt=[
    "You are App Kaa Baap, an independent app discovery researcher. Search the live web; do not invent apps, links, features, prices or availability.",
    "Return only useful products that genuinely address the user's need. Prefer official provider pages, Google Play and Apple App Store listings. Return fewer results rather than padding. Do not call any item independently verified merely because you found a URL.",
    "Pricing must be one of Free, Freemium, Paid, Unknown. Free means the relevant core use is available at no charge; if only a limited free tier exists use Freemium. If uncertain use Unknown. Country and platform must be evidence-supported.",
    "For every app return: id, name, category, price, priceEvidence (short source-grounded note or Not confirmed), countries (India and/or USA only when supported), platforms (Web, Android, iOS only when supported), description, official website URL, Google Play URL if an exact listing was found, Apple App Store URL if an exact listing was found, sourceUrl (best evidence URL), reason (specific fit and any qualification). Use HTTPS URLs only. Never fabricate store URLs.",
    compareIntent ? "This is a comparison request. Return a comparison array with one row per returned app and exact appId matching that app's id. Each row must contain bestFor, freeFeatures, aiTools, watermarks, easeOfUse, limitations. Compare only the apps in matches. If a feature cannot be established, write Not confirmed. Do not mention apps outside matches in any field or in summary." : "This is not necessarily a comparison request. Return comparison as an empty array.",
    "Use only valid JSON in this shape: "+JSON.stringify({matches:[{id:"stable-id",name:"App",category:"Design",price:"Unknown",priceEvidence:"Not confirmed",countries:["India"],platforms:["Android"],description:"Factual description",url:"https://official.example",androidListingUrl:"https://play.google.com/store/apps/details?id=...",iosListingUrl:"",sourceUrl:"https://source.example",reason:"Why it fits"}],comparison:[{appId:"stable-id",bestFor:"...",freeFeatures:"...",aiTools:"...",watermarks:"...",easeOfUse:"...",limitations:"..."}]}),
    "User's exact request: "+JSON.stringify(query),
    "Effective hard constraints (selected filters plus explicit query requirements): "+JSON.stringify(effectiveFilters),
    "Catalogue candidates (starting points only; discover beyond these): "+JSON.stringify(apps)
  ].join("\n\n");
  try {
    const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+apiKey},body:JSON.stringify({model:MODEL,tools:[{type:"web_search",search_context_size:"medium"}],tool_choice:"required",input:prompt,max_output_tokens:3200,reasoning:{effort:"low"}})});
    if(!response.ok){const detail=await response.text().catch(()=>"");console.error("OpenAI discovery error",response.status,detail.slice(0,1000));return json(response.status===429?429:502,{error:response.status===429?"Live search limit or API credits may have been reached. Check API usage and billing.":"Live web discovery could not complete. Please try again."});}
    const payload=await response.json();
    const output=payload.output_text||(Array.isArray(payload.output)?payload.output.filter(x=>x.type==="message").flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text||"").join("\n"):"");
    let parsed;try{parsed=JSON.parse(output);}catch{console.error("Unparseable discovery response",String(output).slice(0,900));return json(502,{error:"Live discovery returned an unreadable result. Please try again."});}
    let matches=(Array.isArray(parsed.matches)?parsed.matches:[]).filter(m=>m&&typeof m.name==="string").map((m,index)=>{
      const price=["Free","Freemium","Paid","Unknown"].includes(m.price)?m.price:"Unknown";
      const platforms=Array.isArray(m.platforms)?m.platforms.filter(x=>["Web","Android","iOS"].includes(x)):[];
      const countries=Array.isArray(m.countries)?m.countries.filter(x=>["India","USA"].includes(x)):[];
      return {id:clean(m.id,100)||"live-"+index,name:clean(m.name,120),category:clean(m.category,80)||"Digital service",price,priceEvidence:clean(m.priceEvidence,220),countries,platforms,description:clean(m.description,450),url:httpsUrl(m.url),androidListingUrl:httpsUrl(m.androidListingUrl),iosListingUrl:httpsUrl(m.iosListingUrl),sourceUrl:httpsUrl(m.sourceUrl),reason:clean(m.reason,260),evidenceStatus: m.androidListingUrl && httpsUrl(m.androidListingUrl) ? "Google Play listing link supplied; listing contents and availability have not been independently audited." : m.iosListingUrl && httpsUrl(m.iosListingUrl) ? "Apple App Store listing link supplied; listing contents and availability have not been independently audited." : m.sourceUrl && httpsUrl(m.sourceUrl) ? "Research source supplied; details have not been independently audited." : "No independently audited source available."};
    }).filter(m=>m.url||m.androidListingUrl||m.iosListingUrl);
    if(effectiveFilters.price!=="All")matches=matches.filter(m=>m.price===effectiveFilters.price);
    if(effectiveFilters.country!=="All")matches=matches.filter(m=>m.countries.includes(effectiveFilters.country));
    if(effectiveFilters.platform!=="All")matches=matches.filter(m=>m.platforms.includes(effectiveFilters.platform));
    matches=matches.slice(0,8);
    const ids=new Set(matches.map(m=>m.id));
    const comparison=compareIntent&&matches.length>=2?(Array.isArray(parsed.comparison)?parsed.comparison:[]).filter(row=>row&&ids.has(row.appId)).map(row=>({appId:row.appId,bestFor:clean(row.bestFor,180),freeFeatures:clean(row.freeFeatures,220),aiTools:clean(row.aiTools,180),watermarks:clean(row.watermarks,180),easeOfUse:clean(row.easeOfUse,160),limitations:clean(row.limitations,220)})):[];
    return json(200,{searchMode:"live_web",matches,comparison});
  } catch(error){console.error("Live discovery failed",error&&error.message?error.message:"Unknown error");return json(502,{error:"Live web discovery failed temporarily. Please try again."});}
}
