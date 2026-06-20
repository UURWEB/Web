import { firebaseConfig, DIRECTORY_COLLECTION, FIREBASE_CONFIGURED } from "../firebase-config.js";

const $ = s => document.querySelector(s);
const els = {
  setupPanel:$("#setupPanel"), loginPanel:$("#loginPanel"), dashboard:$("#dashboard"), loginForm:$("#loginForm"),
  loginEmail:$("#loginEmail"), loginPassword:$("#loginPassword"), loginMessage:$("#loginMessage"), logoutButton:$("#logoutButton"),
  adminClock:$("#adminClock"), signedInUser:$("#signedInUser"), siteForm:$("#siteForm"), recordId:$("#recordId"),
  siteName:$("#siteName"), siteUrl:$("#siteUrl"), siteCategory:$("#siteCategory"), siteStatus:$("#siteStatus"),
  siteDescription:$("#siteDescription"), siteTags:$("#siteTags"), siteIconUrl:$("#siteIconUrl"), siteOrder:$("#siteOrder"),
  siteButtonLabel:$("#siteButtonLabel"), siteFeatured:$("#siteFeatured"), cardPreview:$("#cardPreview"),
  editorTitle:$("#editorTitle"), resetFormButton:$("#resetFormButton"), duplicateButton:$("#duplicateButton"),
  newSiteButton:$("#newSiteButton"), formMessage:$("#formMessage"), recordsList:$("#recordsList"), adminSearch:$("#adminSearch"),
  adminTotal:$("#adminTotal"), adminOnline:$("#adminOnline"), adminFeatured:$("#adminFeatured"),
  adminCategories:$("#adminCategories"), exportButton:$("#exportButton"), importInput:$("#importInput"),
  confirmDialog:$("#confirmDialog"), confirmText:$("#confirmText"), cancelDeleteButton:$("#cancelDeleteButton"),
  confirmDeleteButton:$("#confirmDeleteButton")
};

let auth, db, firestoreApi, authApi;
let records = [];
let pendingDelete = null;

function escapeHtml(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function initials(name="UUR"){return name.split(/\s+/).filter(Boolean).slice(0,3).map(w=>w[0]).join("").toUpperCase()}
function updateClock(){
  const now=new Date(),past=new Date(now);past.setFullYear(now.getFullYear()-100);
  els.adminClock.textContent=new Intl.DateTimeFormat("en-US",{timeZone:"America/Chicago",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(past)+" CST";
}
function formData(){
  return {
    name:els.siteName.value.trim(),url:els.siteUrl.value.trim(),category:els.siteCategory.value.trim(),
    status:els.siteStatus.value,description:els.siteDescription.value.trim(),
    tags:els.siteTags.value.split(",").map(t=>t.trim()).filter(Boolean),
    iconUrl:els.siteIconUrl.value.trim(),order:Number(els.siteOrder.value||100),
    buttonLabel:els.siteButtonLabel.value.trim()||"Open website",featured:els.siteFeatured.checked
  };
}
function symbolMarkup(s){
  return s.iconUrl?`<div class="site-symbol"><img src="${escapeHtml(s.iconUrl)}" alt=""></div>`:`<div class="site-symbol">${escapeHtml(initials(s.name))}</div>`;
}
function preview(){
  const s=formData();
  els.cardPreview.innerHTML=`<article class="site-card"><div class="card-top">${symbolMarkup(s)}<button class="favorite-button" type="button">☆</button></div><h3>${escapeHtml(s.name||"Website name")}</h3><p>${escapeHtml(s.description||"Website description will appear here.")}</p><div class="site-meta"><span class="badge">${escapeHtml(s.category||"Category")}</span><span class="badge">${escapeHtml(s.status)}</span></div></article>`;
}
function resetForm(){
  els.siteForm.reset();els.recordId.value="";els.siteStatus.value="Online";els.siteOrder.value="100";els.siteButtonLabel.value="Open website";els.editorTitle.textContent="Add website";els.formMessage.textContent="";preview();
}
function editRecord(id){
  const s=records.find(r=>r.id===id);if(!s)return;
  els.recordId.value=s.id;els.siteName.value=s.name||"";els.siteUrl.value=s.url||"";els.siteCategory.value=s.category||"";
  els.siteStatus.value=s.status||"Online";els.siteDescription.value=s.description||"";els.siteTags.value=(s.tags||[]).join(", ");
  els.siteIconUrl.value=s.iconUrl||"";els.siteOrder.value=s.order??100;els.siteButtonLabel.value=s.buttonLabel||"Open website";
  els.siteFeatured.checked=Boolean(s.featured);els.editorTitle.textContent="Edit website";preview();window.scrollTo({top:0,behavior:"smooth"});
}
function renderRecords(){
  const q=els.adminSearch.value.trim().toLowerCase();
  const list=records.filter(s=>[s.name,s.category,s.status,s.description,...(s.tags||[])].join(" ").toLowerCase().includes(q));
  els.recordsList.innerHTML=list.length?list.sort((a,b)=>(a.order??100)-(b.order??100)).map(s=>`
    <article class="record-row">
      ${symbolMarkup(s)}
      <div class="record-main"><h3>${escapeHtml(s.name)}</h3><p>${escapeHtml(s.category)} · ${escapeHtml(s.status)} · Order ${s.order??100}${s.featured?" · Featured":""}</p></div>
      <div class="record-actions"><button data-edit="${escapeHtml(s.id)}">Edit</button><button class="delete" data-delete="${escapeHtml(s.id)}">Delete</button></div>
    </article>`).join(""):`<div class="empty-state"><strong>No matching records.</strong></div>`;
  els.adminTotal.textContent=records.length;
  els.adminOnline.textContent=records.filter(s=>s.status==="Online").length;
  els.adminFeatured.textContent=records.filter(s=>s.featured).length;
  els.adminCategories.textContent=new Set(records.map(s=>s.category)).size;
}
async function initFirebase(){
  const [{initializeApp},{getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut},{getFirestore,collection,onSnapshot,query,orderBy,doc,setDoc,addDoc,deleteDoc,serverTimestamp,writeBatch}] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
  ]);
  const app=initializeApp(firebaseConfig);
  auth=getAuth(app);db=getFirestore(app);
  authApi={onAuthStateChanged,signInWithEmailAndPassword,signOut};
  firestoreApi={collection,onSnapshot,query,orderBy,doc,setDoc,addDoc,deleteDoc,serverTimestamp,writeBatch};

  onAuthStateChanged(auth,user=>{
    if(user){
      els.loginPanel.hidden=true;els.dashboard.hidden=false;els.logoutButton.hidden=false;els.signedInUser.textContent=user.email||"Administrator";
      subscribeRecords();
    }else{
      els.loginPanel.hidden=false;els.dashboard.hidden=true;els.logoutButton.hidden=true;
    }
  });
}
function subscribeRecords(){
  const {collection,onSnapshot,query,orderBy}=firestoreApi;
  onSnapshot(query(collection(db,DIRECTORY_COLLECTION),orderBy("order","asc")),snap=>{
    records=snap.docs.map(d=>({id:d.id,...d.data()}));renderRecords();
  },err=>{els.formMessage.textContent=err.message});
}
async function saveSite(e){
  e.preventDefault();
  const data=formData();
  els.formMessage.textContent="Saving…";
  try{
    const {collection,doc,setDoc,addDoc,serverTimestamp}=firestoreApi;
    const id=els.recordId.value;
    if(id){
      await setDoc(doc(db,DIRECTORY_COLLECTION,id),{...data,updatedAt:serverTimestamp()},{merge:true});
    }else{
      await addDoc(collection(db,DIRECTORY_COLLECTION),{...data,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
    }
    els.formMessage.textContent="Website saved.";resetForm();
  }catch(err){els.formMessage.textContent=err.message}
}
async function removeRecord(){
  if(!pendingDelete)return;
  try{
    await firestoreApi.deleteDoc(firestoreApi.doc(db,DIRECTORY_COLLECTION,pendingDelete));
    pendingDelete=null;els.confirmDialog.close();
  }catch(err){els.confirmText.textContent=err.message}
}
function exportBackup(){
  const blob=new Blob([JSON.stringify(records,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=`uur-directory-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);
}
async function importBackup(file){
  try{
    const parsed=JSON.parse(await file.text());
    if(!Array.isArray(parsed))throw new Error("Backup must contain a JSON array.");
    const {writeBatch,doc,serverTimestamp}=firestoreApi;
    const batch=writeBatch(db);
    parsed.forEach(item=>{
      const id=item.id||crypto.randomUUID();const clean={...item};delete clean.id;
      batch.set(doc(db,DIRECTORY_COLLECTION,id),{...clean,updatedAt:serverTimestamp()},{merge:true});
    });
    await batch.commit();els.formMessage.textContent=`Imported ${parsed.length} records.`;
  }catch(err){els.formMessage.textContent=err.message}
}
function bind(){
  els.loginForm.addEventListener("submit",async e=>{
    e.preventDefault();els.loginMessage.textContent="Signing in…";
    try{await authApi.signInWithEmailAndPassword(auth,els.loginEmail.value,els.loginPassword.value);els.loginMessage.textContent=""}
    catch(err){els.loginMessage.textContent="Login failed: "+err.message}
  });
  els.logoutButton.addEventListener("click",()=>authApi.signOut(auth));
  els.siteForm.addEventListener("submit",saveSite);
  els.siteForm.addEventListener("input",preview);
  els.resetFormButton.addEventListener("click",resetForm);
  els.newSiteButton.addEventListener("click",()=>{resetForm();window.scrollTo({top:0,behavior:"smooth"})});
  els.duplicateButton.addEventListener("click",()=>{els.recordId.value="";els.editorTitle.textContent="Duplicate website";els.siteName.value+=" Copy";preview()});
  els.adminSearch.addEventListener("input",renderRecords);
  els.recordsList.addEventListener("click",e=>{
    const edit=e.target.closest("[data-edit]");if(edit)editRecord(edit.dataset.edit);
    const del=e.target.closest("[data-delete]");if(del){pendingDelete=del.dataset.delete;const s=records.find(x=>x.id===pendingDelete);els.confirmText.textContent=`Delete ${s?.name||"this website"} from the public directory?`;els.confirmDialog.showModal()}
  });
  els.cancelDeleteButton.addEventListener("click",()=>{pendingDelete=null;els.confirmDialog.close()});
  els.confirmDeleteButton.addEventListener("click",removeRecord);
  els.exportButton.addEventListener("click",exportBackup);
  els.importInput.addEventListener("change",e=>{const f=e.target.files?.[0];if(f)importBackup(f);e.target.value=""});
}
updateClock();setInterval(updateClock,1000);preview();bind();
if(!FIREBASE_CONFIGURED){els.setupPanel.hidden=false;els.loginPanel.hidden=true}
else initFirebase().catch(err=>{els.setupPanel.hidden=false;els.loginPanel.hidden=true;els.setupPanel.querySelector("p").textContent="Firebase could not start: "+err.message});
