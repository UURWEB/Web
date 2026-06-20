import { firebaseConfig, DIRECTORY_COLLECTION, FIREBASE_CONFIGURED } from "../firebase-config.js";
import { SAMPLE_SITES } from "./sample-sites.js";

const state = {
  sites: [],
  query: "",
  category: "All",
  status: "all",
  sort: "order",
  favoritesOnly: false,
  view: localStorage.getItem("uur-directory-view") || "grid",
  favorites: new Set(JSON.parse(localStorage.getItem("uur-directory-favorites") || "[]"))
};

const $ = selector => document.querySelector(selector);
const els = {
  unionClock: $("#unionClock"), unionDate: $("#unionDate"), featuredGrid: $("#featuredGrid"),
  siteGrid: $("#siteGrid"), networkMap: $("#networkMap"), categoryFilters: $("#categoryFilters"),
  searchInput: $("#searchInput"), statusFilter: $("#statusFilter"), sortSelect: $("#sortSelect"),
  resultSummary: $("#resultSummary"), emptyState: $("#emptyState"), clearFiltersButton: $("#clearFiltersButton"),
  favoritesToggle: $("#favoritesToggle"), gridViewButton: $("#gridViewButton"), listViewButton: $("#listViewButton"),
  themeButton: $("#themeButton"), heroSiteCount: $("#heroSiteCount"), heroCategoryCount: $("#heroCategoryCount"),
  heroOnlineCount: $("#heroOnlineCount"), modeNotice: $("#modeNotice"), siteDialog: $("#siteDialog"),
  dialogContent: $("#dialogContent"), closeDialogButton: $("#closeDialogButton")
};

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
}
function initials(name = "UUR") {
  return name.split(/\s+/).filter(Boolean).slice(0,3).map(w => w[0]).join("").toUpperCase();
}
function normalizeSite(site) {
  const dateValue = value => {
    if (!value) return "";
    if (typeof value.toDate === "function") return value.toDate().toISOString();
    if (value.seconds) return new Date(value.seconds * 1000).toISOString();
    return String(value);
  };
  return {
    id: site.id || crypto.randomUUID(), name: site.name || "Untitled website", url: site.url || "#",
    category: site.category || "Other", status: site.status || "Online", description: site.description || "",
    tags: Array.isArray(site.tags) ? site.tags : String(site.tags || "").split(",").map(v=>v.trim()).filter(Boolean),
    featured: Boolean(site.featured), order: Number(site.order ?? 100), buttonLabel: site.buttonLabel || "Open website",
    iconUrl: site.iconUrl || "", createdAt: dateValue(site.createdAt), updatedAt: dateValue(site.updatedAt)
  };
}
function updateClock() {
  const now = new Date();
  const past = new Date(now);
  past.setFullYear(now.getFullYear() - 100);
  els.unionClock.textContent = new Intl.DateTimeFormat("en-US", {
    timeZone:"America/Chicago",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false
  }).format(now) + " CST";
  els.unionDate.textContent = new Intl.DateTimeFormat("en-US", {
    timeZone:"America/Chicago",year:"numeric",month:"2-digit",day:"2-digit"
  }).format(past);
}
function setTheme() {
  document.body.classList.toggle("dark", localStorage.getItem("uur-directory-theme")==="dark");
}
function statusClass(status) { return "status-" + String(status).toLowerCase().replace(/\s+/g,"-"); }
function symbolMarkup(site) {
  return site.iconUrl
    ? `<div class="site-symbol"><img src="${escapeHtml(site.iconUrl)}" alt=""></div>`
    : `<div class="site-symbol">${escapeHtml(initials(site.name))}</div>`;
}
function openMarkup(site) {
  if (!site.url || site.url === "#") return `<button type="button" disabled>${escapeHtml(site.buttonLabel || "Address pending")}</button>`;
  return `<a href="${escapeHtml(site.url)}" target="_blank" rel="noopener">${escapeHtml(site.buttonLabel || "Open website")}</a>`;
}
function favoriteButton(site) {
  const saved = state.favorites.has(site.id);
  return `<button class="favorite-button ${saved?"saved":""}" data-favorite="${escapeHtml(site.id)}" type="button">${saved?"★":"☆"}</button>`;
}
function cardMarkup(site, featured=false) {
  const tags = site.tags.slice(0,4).map(t=>`<span>${escapeHtml(t)}</span>`).join("");
  return `<article class="${featured?"featured-card":"site-card"}" data-site-id="${escapeHtml(site.id)}">
    <div class="card-top">${symbolMarkup(site)}${favoriteButton(site)}</div>
    <h3>${escapeHtml(site.name)}</h3>
    <p>${escapeHtml(site.description)}</p>
    <div class="site-meta"><span class="badge">${escapeHtml(site.category)}</span><span class="badge ${statusClass(site.status)}">${escapeHtml(site.status)}</span></div>
    ${tags?`<div class="site-tags">${tags}</div>`:""}
    <div class="site-actions">${openMarkup(site)}<button type="button" data-details="${escapeHtml(site.id)}">Details</button></div>
  </article>`;
}
function filteredSites() {
  const q = state.query.trim().toLowerCase();
  let items = state.sites.filter(site => {
    const haystack = [site.name,site.category,site.status,site.description,...site.tags].join(" ").toLowerCase();
    return (!q || haystack.includes(q))
      && (state.category==="All" || site.category===state.category)
      && (state.status==="all" || site.status===state.status)
      && (!state.favoritesOnly || state.favorites.has(site.id));
  });
  return items.sort((a,b)=>{
    if(state.sort==="name") return a.name.localeCompare(b.name);
    if(state.sort==="newest") return new Date(b.createdAt||0)-new Date(a.createdAt||0);
    if(state.sort==="category") return a.category.localeCompare(b.category)||a.name.localeCompare(b.name);
    return a.order-b.order||a.name.localeCompare(b.name);
  });
}
function renderCategories() {
  const categories = ["All",...new Set(state.sites.map(s=>s.category).filter(Boolean))];
  els.categoryFilters.innerHTML = categories.map(c=>`<button type="button" class="${c===state.category?"active":""}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("");
}
function renderFeatured() {
  const items = state.sites.filter(s=>s.featured).sort((a,b)=>a.order-b.order).slice(0,6);
  els.featuredGrid.innerHTML = items.length ? items.map(s=>cardMarkup(s,true)).join("") :
    `<div class="empty-state glass"><strong>No featured websites yet.</strong><p>Mark entries as featured in the dashboard.</p></div>`;
}
function renderDirectory() {
  const items = filteredSites();
  els.siteGrid.classList.toggle("list-view",state.view==="list");
  els.gridViewButton.classList.toggle("active",state.view==="grid");
  els.listViewButton.classList.toggle("active",state.view==="list");
  els.siteGrid.innerHTML = items.map(s=>cardMarkup(s)).join("");
  els.emptyState.hidden = items.length !== 0;
  els.resultSummary.textContent = `${items.length} ${state.favoritesOnly?"saved ":""}website${items.length===1?"":"s"} displayed`;
  els.favoritesToggle.textContent = state.favoritesOnly ? "Show all sites" : "Saved sites";
}
function renderMap() {
  const grouped = {};
  state.sites.forEach(s => (grouped[s.category] ||= []).push(s));
  els.networkMap.innerHTML = Object.keys(grouped).sort().map(category=>`
    <article class="network-group"><h3>${escapeHtml(category)}</h3>
      ${grouped[category].sort((a,b)=>a.order-b.order).map(s=>{
        const active = s.url && s.url!=="#";
        return `<a href="${active?escapeHtml(s.url):"#directory"}" ${active?'target="_blank" rel="noopener"':""}>${escapeHtml(s.name)} <small>· ${escapeHtml(s.status)}</small></a>`;
      }).join("")}
    </article>`).join("");
}
function renderStats() {
  els.heroSiteCount.textContent = state.sites.length;
  els.heroCategoryCount.textContent = new Set(state.sites.map(s=>s.category)).size;
  els.heroOnlineCount.textContent = state.sites.filter(s=>s.status==="Online").length;
}
function renderAll(){renderCategories();renderFeatured();renderDirectory();renderMap();renderStats();}
function showDetails(id){
  const s = state.sites.find(x=>x.id===id); if(!s) return;
  els.dialogContent.innerHTML = `<article class="dialog-site">${symbolMarkup(s)}<span class="eyebrow">${escapeHtml(s.category)} · ${escapeHtml(s.status)}</span><h2>${escapeHtml(s.name)}</h2><p>${escapeHtml(s.description)}</p><div class="site-tags">${s.tags.map(t=>`<span>${escapeHtml(t)}</span>`).join("")}</div><div class="site-actions">${openMarkup(s)}</div></article>`;
  els.siteDialog.showModal();
}
function toggleFavorite(id){
  state.favorites.has(id)?state.favorites.delete(id):state.favorites.add(id);
  localStorage.setItem("uur-directory-favorites",JSON.stringify([...state.favorites]));
  renderFeatured();renderDirectory();
}
function bindEvents(){
  els.searchInput.addEventListener("input",e=>{state.query=e.target.value;renderDirectory()});
  els.statusFilter.addEventListener("change",e=>{state.status=e.target.value;renderDirectory()});
  els.sortSelect.addEventListener("change",e=>{state.sort=e.target.value;renderDirectory()});
  els.categoryFilters.addEventListener("click",e=>{const b=e.target.closest("[data-category]");if(!b)return;state.category=b.dataset.category;renderCategories();renderDirectory()});
  document.addEventListener("click",e=>{
    const fav=e.target.closest("[data-favorite]"); if(fav) toggleFavorite(fav.dataset.favorite);
    const details=e.target.closest("[data-details]"); if(details) showDetails(details.dataset.details);
  });
  els.gridViewButton.addEventListener("click",()=>{state.view="grid";localStorage.setItem("uur-directory-view","grid");renderDirectory()});
  els.listViewButton.addEventListener("click",()=>{state.view="list";localStorage.setItem("uur-directory-view","list");renderDirectory()});
  els.favoritesToggle.addEventListener("click",()=>{state.favoritesOnly=!state.favoritesOnly;renderDirectory();document.querySelector("#directory").scrollIntoView()});
  els.clearFiltersButton.addEventListener("click",()=>{state.query="";state.category="All";state.status="all";state.favoritesOnly=false;els.searchInput.value="";els.statusFilter.value="all";renderAll()});
  els.themeButton.addEventListener("click",()=>{const dark=!document.body.classList.contains("dark");document.body.classList.toggle("dark",dark);localStorage.setItem("uur-directory-theme",dark?"dark":"light")});
  els.closeDialogButton.addEventListener("click",()=>els.siteDialog.close());
  els.siteDialog.addEventListener("click",e=>{if(e.target===els.siteDialog)els.siteDialog.close()});
}
async function loadDirectory(){
  if(!FIREBASE_CONFIGURED){
    state.sites = SAMPLE_SITES.map(normalizeSite);
    els.modeNotice.textContent = "Preview mode. Connect Firebase to publish your own live directory.";
    renderAll(); return;
  }
  try{
    const [{initializeApp},{getFirestore,collection,onSnapshot,query,orderBy}] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
    ]);
    const app=initializeApp(firebaseConfig),db=getFirestore(app);
    onSnapshot(query(collection(db,DIRECTORY_COLLECTION),orderBy("order","asc")),snap=>{
      state.sites=snap.docs.map(d=>normalizeSite({id:d.id,...d.data()}));
      els.modeNotice.textContent="Live directory connection active.";
      renderAll();
    },err=>{
      console.error(err);state.sites=SAMPLE_SITES.map(normalizeSite);els.modeNotice.textContent="Live data unavailable. Showing preview records.";renderAll();
    });
  }catch(err){
    console.error(err);state.sites=SAMPLE_SITES.map(normalizeSite);els.modeNotice.textContent="Connection error. Showing preview records.";renderAll();
  }
}
setTheme();bindEvents();updateClock();setInterval(updateClock,1000);loadDirectory();
