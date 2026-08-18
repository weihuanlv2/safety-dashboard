(function(){
  var panel=document.getElementById('tabPanelHealthMonitor'); if(!panel)return;
  var state={items:[],filtered:[],loaded:false};
  var $=function(id){return document.getElementById(id)};
  function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
  function fmtTime(v){return v?String(v).replace('T',' ').slice(0,19):'尚未同步'}
  function className(v){return {'有效':'valid','即将到期':'expiring','已过期':'expired','未上传':'missing'}[v]||'missing'}
  function typeClass(v){return v==='健康证'?'certificate':v==='回执单'?'receipt':'missing'}
  function photoSrc(url,rider){return '/api/health-monitor/photo-proxy?url='+encodeURIComponent(url)+(rider?'&rider_id='+encodeURIComponent(rider):'')}
  function setOptions(id,values,label){var el=$(id),old=el.value;el.innerHTML='<option value="">'+label+'</option>'+Array.from(new Set(values.filter(Boolean))).sort().map(function(v){return '<option value="'+esc(v)+'">'+esc(v)+'</option>'}).join('');el.value=old}
  function updateMetrics(summary){$('healthActive').textContent=summary.active||0;$('healthExpiring').textContent=summary.expiring||0;$('healthExpired').textContent=summary.expired||0;$('healthReceipts').textContent=summary.receipts||0}
  function updateRoleMetrics(){
    var counts={};state.items.forEach(function(r){var role=r.role||'其他岗位';counts[role]=(counts[role]||0)+1});
    $('healthRoleMetrics').innerHTML=Object.keys(counts).sort(function(a,b){return counts[b]-counts[a]}).map(function(role){return '<section class="health-role-card"><span>'+esc(role)+'</span><strong>'+counts[role]+'</strong><em>人</em></section>'}).join('');
  }
  function compareText(a,b){return String(a||'').localeCompare(String(b||''),'zh-CN',{numeric:true})}
  function remainingValue(r,fallback){var n=Number(r.remaining_days);return Number.isFinite(n)?n:fallback}
  function stableTie(a,b){return compareText(a.site,b.site)||compareText(a.name,b.name)||compareText(a.rider_id,b.rider_id)}
  function sortRows(rows,mode){
    var riskOrder={'已过期':0,'即将到期':1,'未上传':2,'有效':3};
    return rows.sort(function(a,b){
      if(mode==='remaining-asc')return remainingValue(a,999999)-remainingValue(b,999999)||stableTie(a,b);
      if(mode==='remaining-desc')return remainingValue(b,-999999)-remainingValue(a,-999999)||stableTie(a,b);
      if(mode==='expiry-asc')return compareText(a.expiry_date||'9999-12-31',b.expiry_date||'9999-12-31')||stableTie(a,b);
      if(mode==='expiry-desc')return compareText(b.expiry_date||'',a.expiry_date||'')||stableTie(a,b);
      if(mode==='site')return stableTie(a,b);
      if(mode==='name')return compareText(a.name,b.name)||compareText(a.site,b.site)||compareText(a.rider_id,b.rider_id);
      return (riskOrder[a.status]??9)-(riskOrder[b.status]??9)||remainingValue(a,999999)-remainingValue(b,999999)||stableTie(a,b);
    });
  }
  function ensureScreenshotPhotos(){
    var rows=Array.from($('healthTableBody').querySelectorAll('tr'));
    return Promise.all(rows.map(function(row){
      var images=Array.from(row.querySelectorAll('.health-thumb'));
      if(!images.length||images.every(function(image){return image.complete&&image.naturalWidth>0}))return Promise.resolve();
      var rider=images[0].dataset.rider,box=row.querySelector('.health-photos');
      if(!rider||!box)return Promise.resolve();
      return fetch('/api/health-monitor/photos/'+encodeURIComponent(rider),{cache:'no-store'}).then(function(response){if(!response.ok)throw new Error('照片刷新失败');return response.json()}).then(function(data){box.innerHTML=(data.photos||[]).slice(0,4).map(function(url){return '<img class="health-thumb" loading="eager" src="'+esc(photoSrc(url,rider))+'" data-photo="'+esc(url)+'" data-rider="'+esc(rider)+'" alt="身份证及健康证照片">'}).join('')||'<span class="health-no-photo">—</span>'}).catch(function(){box.innerHTML='<span class="health-no-photo">照片加载失败</span>'})
    }));
  }
  function render(){
    var q=$('healthSearch').value.trim().toLowerCase(),site=$('healthSite').value,role=$('healthRole').value,type=$('healthType').value,status=$('healthStatus').value,sort=$('healthSort').value;
    state.filtered=sortRows(state.items.filter(function(r){return(!q||[r.name,r.phone,r.rider_id,r.site].join(' ').toLowerCase().indexOf(q)>-1)&&(!site||r.site===site)&&(!role||r.role===role)&&(!type||r.type===type)&&(!status||r.status===status)}),sort);
    $('healthTableBody').innerHTML=state.filtered.length?state.filtered.map(function(r){
      var photos=(r.photos||[]).slice(0,4).map(function(url){return '<img class="health-thumb" loading="lazy" src="'+esc(photoSrc(url,r.rider_id))+'" data-photo="'+esc(url)+'" data-rider="'+esc(r.rider_id)+'" alt="'+esc(r.name)+'照片">'}).join('')||'<span class="health-no-photo">—</span>';
      var remaining=r.remaining_days==null?'—':(r.remaining_days<0?r.remaining_days+'天':'剩'+r.remaining_days+'天');
      return '<tr><td class="health-site">'+esc(r.site)+'</td><td class="health-rider-id">'+esc(r.rider_id)+'</td><td>'+esc(r.name)+'</td><td>'+esc(r.phone)+'</td><td>'+esc(r.role)+'</td><td><span class="health-type '+typeClass(r.type)+'">'+esc(r.type)+'</span></td><td><span class="health-status '+className(r.status)+'">'+esc(r.status)+'</span></td><td>'+esc(r.issue_date||'—')+'</td><td>'+esc(r.expiry_date||'—')+'</td><td><span class="health-days '+className(r.status)+'">'+esc(remaining)+'</span></td><td><div class="health-photos">'+photos+'</div></td><td><button class="health-detail-btn" data-detail="'+esc(r.detail_url)+'">详情</button></td></tr>';
    }).join(''):'<tr><td colspan="12" class="health-empty">没有符合条件的在职骑手</td></tr>';
    $('healthCount').textContent=state.filtered.length;$('healthTotal').textContent=state.items.length;
  }
  function load(){
    return fetch('/api/health-monitor',{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('读取失败');return r.json()}).then(function(data){state.items=data.items||[];state.loaded=true;updateMetrics(data.summary||{});updateRoleMetrics();$('healthUpdatedAt').textContent=fmtTime(data.updated_at);setOptions('healthSite',state.items.map(function(x){return x.site}),'全部站点');setOptions('healthRole',state.items.map(function(x){return x.role}),'全部岗位');var initialStatus=new URLSearchParams(location.search).get('healthStatus');if(initialStatus)$('healthStatus').value=initialStatus;$('healthSort').value='site';render()}).catch(function(err){$('healthTableBody').innerHTML='<tr><td colspan="12" class="health-empty">'+esc(err.message)+'</td></tr>'})
  }
  function sync(){var btn=$('healthSyncBtn'),msg=$('healthSyncMessage');btn.disabled=true;btn.classList.add('syncing');msg.textContent='正在核对全部在职骑手与详情资料…';fetch('/api/health-monitor/sync',{method:'POST'}).then(async function(r){var data=await r.json();if(!r.ok)throw new Error(data.detail||'更新失败');state.items=data.items||[];updateMetrics(data.summary||{});updateRoleMetrics();$('healthUpdatedAt').textContent=fmtTime(data.updated_at);setOptions('healthSite',state.items.map(function(x){return x.site}),'全部站点');setOptions('healthRole',state.items.map(function(x){return x.role}),'全部岗位');render();msg.textContent='更新完成，已核对 '+data.total+' 名在职骑手'}).catch(function(err){msg.textContent='更新未覆盖旧数据：'+err.message}).finally(function(){btn.disabled=false;btn.classList.remove('syncing')})}
  function copyScreenshot(){
    var btn=$('healthCopyBtn'),msg=$('healthSyncMessage'),rowCount=state.filtered.length;
    if(!window.html2canvas||!navigator.clipboard||!window.ClipboardItem){msg.textContent='当前浏览器不支持截图复制';return}
    if(!rowCount){msg.textContent='当前没有可截图的数据';return}
    if(rowCount>300){msg.textContent='当前筛选结果 '+rowCount+' 条，图片过长；请先筛选至300条以内再截图';return}
    btn.disabled=true;msg.textContent='正在加载照片并截取全部 '+rowCount+' 条数据…';
    ensureScreenshotPhotos().then(function(){var images=Array.from($('healthTableBody').querySelectorAll('.health-thumb'));images.forEach(function(image){image.loading='eager'});return Promise.all(images.map(function(image){return image.complete?Promise.resolve():new Promise(function(resolve){var timer=setTimeout(resolve,10000);image.addEventListener('load',function(){clearTimeout(timer);resolve()},{once:true});image.addEventListener('error',function(){clearTimeout(timer);resolve()},{once:true})})}))}).then(function(){return window.html2canvas(panel.querySelector('.health-page'),{backgroundColor:getComputedStyle(document.body).backgroundColor,scale:1,useCORS:false,allowTaint:false,logging:false,scrollX:0,scrollY:0,onclone:function(doc){var page=doc.querySelector('#tabPanelHealthMonitor .health-page'),shell=doc.querySelector('#tabPanelHealthMonitor .health-table-shell'),scroll=doc.querySelector('#tabPanelHealthMonitor .health-table-scroll');if(page){page.style.height='auto';page.style.maxHeight='none';page.style.overflow='visible'}if(shell){shell.style.height='auto';shell.style.maxHeight='none';shell.style.overflow='visible'}if(scroll){scroll.style.height='auto';scroll.style.maxHeight='none';scroll.style.minHeight='0';scroll.style.overflow='visible'}doc.querySelectorAll('#healthTableBody tr').forEach(function(row){row.style.display='table-row'})}})}).then(function(canvas){return new Promise(function(resolve,reject){canvas.toBlob(function(blob){blob?resolve(blob):reject(new Error('截图生成失败'))},'image/png')})}).then(function(blob){return navigator.clipboard.write([new ClipboardItem({'image/png':blob})])}).then(function(){msg.textContent='截图已复制，已包含全部 '+rowCount+' 条数据及证件照片'}).catch(function(err){msg.textContent='截图复制失败：'+err.message}).finally(function(){btn.disabled=false})
  }
  function refreshBrokenPhotos(image){
    var rider=image.dataset.rider,row=image.closest('tr');if(!rider||!row||row.dataset.photoRefreshing)return;
    row.dataset.photoRefreshing='1';
    fetch('/api/health-monitor/photos/'+encodeURIComponent(rider),{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('照片刷新失败');return r.json()}).then(function(data){var box=row.querySelector('.health-photos');box.innerHTML=(data.photos||[]).slice(0,4).map(function(url){return '<img class="health-thumb" loading="lazy" src="'+esc(photoSrc(url,rider))+'" data-photo="'+esc(url)+'" data-rider="'+esc(rider)+'" alt="身份证及健康证照片">'}).join('')||'<span class="health-no-photo">—</span>'}).catch(function(){image.style.display='none'}).finally(function(){delete row.dataset.photoRefreshing})
  }
  panel.addEventListener('click',function(e){var photo=e.target.closest('[data-photo]'),detail=e.target.closest('[data-detail]');if(photo){$('healthPhotoImage').src=photo.currentSrc||photo.src;$('healthPhotoDialog').classList.add('open')}if(detail)window.open(detail.dataset.detail,'_blank')});
  panel.addEventListener('error',function(e){if(e.target.classList&&e.target.classList.contains('health-thumb'))refreshBrokenPhotos(e.target)},true);
  $('healthPhotoClose').onclick=function(){$('healthPhotoDialog').classList.remove('open');$('healthPhotoImage').src=''};$('healthPhotoDialog').addEventListener('click',function(e){if(e.target===this)$('healthPhotoClose').click()});
  $('healthSyncBtn').onclick=sync;$('healthCopyBtn').onclick=copyScreenshot;$('healthQueryBtn').onclick=render;$('healthResetBtn').onclick=function(){$('healthSearch').value='';$('healthSite').value='';$('healthRole').value='';$('healthType').value='';$('healthStatus').value='';$('healthSort').value='risk';render()};['healthSearch','healthSite','healthRole','healthType','healthStatus','healthSort'].forEach(function(id){$(id).addEventListener(id==='healthSearch'?'input':'change',render)});
  window.addEventListener('open-health-monitor',function(){if(!state.loaded)load()});
})();
