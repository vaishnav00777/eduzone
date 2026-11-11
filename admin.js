// EduZone Admin Dashboard — browser-local prototype.
// Do not use this as production authentication or shared storage.
(function(){
  const STORAGE_KEY="eduzone-admin-catalog-v1";
  const $=id=>document.getElementById(id);
  const grid=$("resourceGrid");
  const form=$("resourceForm");
  if(!grid||!form)return;
  const safeText=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const safeUrl=value=>{try{const u=new URL(value);return ["https:","http:"].includes(u.protocol)?u.href:null}catch(e){return null}};
  function loadSaved(){
    try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");if(Array.isArray(saved)&&saved.length){resourceCatalog.splice(0,resourceCatalog.length,...saved)}}catch(e){}
  }
  function saveAll(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(resourceCatalog));return true}catch(e){$("adminStatus").textContent="Could not save. Browser storage may be full or disabled.";return false}}
  function render(){
    const lang=select.value||"en", labels=catalogTranslations[lang]||catalogTranslations.en;
    const query=($("resourceSearch").value||"").trim().toLocaleLowerCase();
    const level=$("levelFilter").value,subject=$("subjectFilter").value;
    const matches=resourceCatalog.filter(item=>{
      const haystack=[item.title,item.type,item.tags,item.subject,item.level,item.description].join(" ").toLocaleLowerCase();
      return (!query||haystack.includes(query))&&(level==="all"||item.level===level)&&(subject==="all"||item.subject===subject);
    });
    grid.innerHTML=matches.map(item=>{
      const description=item.description||((translations[lang]||translations.en)[item.descriptionKey]||translations.en[item.descriptionKey]||"");
      const url=safeUrl(item.url);
      return '<article class="resource-card"><div class="resource-symbol" aria-hidden="true">'+safeText(item.icon||"📘")+'</div><div><span class="resource-type">'+safeText(item.type||"Learning resource")+'</span><h3>'+safeText(item.title)+'</h3><p>'+safeText(description)+'</p>'+(url?'<a href="'+safeText(url)+'" target="_blank" rel="noopener noreferrer">'+labels.official+'</a>':'<span class="resource-type">Invalid resource link</span>')+'</div></article>';
    }).join("");
    $("resultsCount").textContent=matches.length+" "+labels.resultCount;
    $("emptyState").hidden=matches.length!==0;
    $("emptyState").textContent=labels.noResults;
    renderAdminList();
  }
  function renderAdminList(){
    $("adminResourceCount").textContent=resourceCatalog.length+" resources";
    $("adminResourceList").innerHTML=resourceCatalog.map(item=>'<div class="admin-resource-row"><div><strong>'+safeText(item.title)+'</strong><span>'+safeText(item.level)+' · '+safeText(item.subject)+'</span></div><div class="admin-row-actions"><button type="button" data-edit="'+safeText(item.id)+'">Edit</button><button type="button" class="delete-action" data-delete="'+safeText(item.id)+'">Delete</button></div></div>').join("");
  }
  function resetForm(){
    form.reset();$("editResourceId").value="";$("adminIcon").value="📘";$("formHeading").textContent="Add a learning resource";$("saveResource").textContent="Save resource";$("cancelEdit").hidden=true;
  }
  function fillForm(item){
    $("editResourceId").value=item.id;$("adminTitle").value=item.title;$("adminLevel").value=item.level;$("adminSubject").value=item.subject;
    $("adminDescription").value=item.description||((translations.en[item.descriptionKey])||"");$("adminUrl").value=item.url;$("adminType").value=item.type||"";$("adminIcon").value=item.icon||"📘";
    $("formHeading").textContent="Edit learning resource";$("saveResource").textContent="Update resource";$("cancelEdit").hidden=false;
    $("resourceForm").scrollIntoView({behavior:"smooth",block:"start"});
  }
  $("adminToggle").addEventListener("click",()=>{
    const panel=$("adminPanel"),open=panel.hidden;panel.hidden=!open;$("adminToggle").setAttribute("aria-expanded",String(open));$("adminToggle").textContent=open?"Close admin panel":"Open admin panel";
    if(open)renderAdminList();
  });
  form.addEventListener("submit",event=>{
    event.preventDefault();
    const title=$("adminTitle").value.trim(),description=$("adminDescription").value.trim(),url=safeUrl($("adminUrl").value.trim());
    if(!url){$("adminStatus").textContent="Please enter a valid http:// or https:// link.";return}
    const id=$("editResourceId").value;
    const item={id:id||("custom-"+Date.now()),title,level:$("adminLevel").value,subject:$("adminSubject").value,tags:(title+" "+description).toLowerCase(),type:$("adminType").value.trim()||"Learning resource",description,url,icon:$("adminIcon").value.trim()||"📘"};
    if(!title||!description){$("adminStatus").textContent="Please complete the title and description.";return}
    if(id){const index=resourceCatalog.findIndex(x=>x.id===id);if(index>=0)resourceCatalog[index]=item}
    else resourceCatalog.unshift(item);
    if(saveAll()){$("adminStatus").textContent=id?"Resource updated.":"Resource added.";resetForm();render()}
  });
  $("adminResourceList").addEventListener("click",event=>{
    const edit=event.target.closest("[data-edit]"),del=event.target.closest("[data-delete]");
    if(edit){const item=resourceCatalog.find(x=>x.id===edit.dataset.edit);if(item)fillForm(item)}
    if(del){const item=resourceCatalog.find(x=>x.id===del.dataset.delete);if(!item)return;if(!confirm('Delete "'+item.title+'"? This only changes this browser.'))return;
      const index=resourceCatalog.findIndex(x=>x.id===item.id);resourceCatalog.splice(index,1);if(saveAll()){$("adminStatus").textContent="Resource deleted from this browser.";render()}
    }
  });
  $("cancelEdit").addEventListener("click",resetForm);
  $("resourceSearch").addEventListener("input",render);
  $("levelFilter").addEventListener("change",render);
  $("subjectFilter").addEventListener("change",render);
  const oldSetLanguage=setLanguage;
  setLanguage=function(lang){oldSetLanguage(lang);render()};
  loadSaved();
  render();
})();