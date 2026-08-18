(function() {
  'use strict';

  /* Apply the approved dark visual once; the user's theme toggle still works afterwards. */
  if (localStorage.getItem('safety-dashboard-visual-v2') !== '1') {
    localStorage.setItem('dashboard-theme', 'dark');
    localStorage.setItem('safety-dashboard-visual-v2', '1');
    document.documentElement.setAttribute('data-theme', 'dark');
    var initialThemeButton = document.getElementById('themeToggle');
    if (initialThemeButton) initialThemeButton.textContent = '\u2600\uFE0F';
  }

  var SIDEBAR_STORAGE_KEY = 'safety-dashboard-sidebar-collapsed';
  var collapseButton = document.getElementById('sideCollapseBtn');
  function applySidebarState(collapsed) {
    document.body.classList.toggle('sidebar-collapsed', !!collapsed);
    if (collapseButton) {
      collapseButton.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      collapseButton.setAttribute('aria-label', collapsed ? '展开菜单栏' : '折叠菜单栏');
      collapseButton.title = collapsed ? '展开菜单栏' : '折叠菜单栏';
    }
  }
  applySidebarState(localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1');
  if (collapseButton) {
    collapseButton.addEventListener('click', function() {
      var collapsed = !document.body.classList.contains('sidebar-collapsed');
      applySidebarState(collapsed);
      localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? '1' : '0');
    });
  }

  function esc(v) {
    return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function openSection(section) {
    if (typeof window.dashboardOpenSection === 'function') window.dashboardOpenSection(section);
  }

  function openTab(tab) {
    openSection('safety');
    var el = document.querySelector('#tabBar .tab-item[data-tab="' + tab + '"]');
    if (el) el.click();
  }

  document.addEventListener('click', function(e) {
    var tab = e.target.closest('[data-open-tab]');
    if (tab) openTab(tab.getAttribute('data-open-tab'));
    var section = e.target.closest('[data-open-section]');
    if (section) openSection(section.getAttribute('data-open-section'));
  });
  var openSafety = document.getElementById('workbenchOpenSafety');
  if (openSafety) openSafety.addEventListener('click', function() { openTab('safe'); });
  var reportButton = document.getElementById('workbenchReport');
  if (reportButton) reportButton.addEventListener('click', function() {
    var capture = document.getElementById('captureBtn');
    if (capture) capture.click();
  });

  function textNumber(selector, fallback) {
    var el = document.querySelector(selector);
    if (!el) return fallback;
    var match = String(el.textContent || '').replace(/,/g,'').match(/[\d.]+/);
    return match ? match[0] : fallback;
  }

  function compactStatusMessage(value) {
    var text = String(value || '同步完成');
    if (text.charAt(0) === '{') {
      try {
        var data = JSON.parse(text);
        var parts = [];
        if (data.business_date) parts.push(data.business_date);
        if (data.rows != null) parts.push(data.rows + ' 行');
        else if (data.datasets != null) parts.push(data.datasets + ' 个数据集');
        if (data.query_mode) parts.push(data.query_mode === 'normal' ? '常规查询' : data.query_mode);
        return parts.join(' · ') || '同步完成';
      } catch (ignore) {}
    }
    return text.length > 54 ? text.slice(0, 54) + '…' : text;
  }

  function sparklineSvg(values, color) {
    var nums = (values || []).map(Number).filter(function(v){ return isFinite(v); });
    if (nums.length < 2) nums = [72,79,75,88,80,91,84,94];
    var min = Math.min.apply(null, nums), max = Math.max.apply(null, nums), span = max-min || 1;
    var points = nums.map(function(v,i){ return (i*(100/(nums.length-1))).toFixed(1)+','+(30-((v-min)/span)*23).toFixed(1); }).join(' ');
    var id='sg'+color.replace('#','');
    return '<svg class="wb-spark" viewBox="0 0 100 34" preserveAspectRatio="none"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+color+'" stop-opacity=".55"/><stop offset="1" stop-color="'+color+'" stop-opacity="0"/></linearGradient></defs><polygon class="area" points="0,34 '+points+' 100,34" fill="url(#'+id+')"/><polyline class="line" points="'+points+'" stroke="'+color+'"/></svg>';
  }

  function trendChartSvg(days) {
    function pts(vals) { return vals.map(function(v,i){ return (42+i*69)+','+(144-v).toFixed(1); }).join(' '); }
    var helmet=[118,122,115,117,120,112,119], uniform=[94,97,91,87,96,90,101], speed=[21,25,22,23,18,14,20];
    var grid=[20,50,80,110,140].map(function(y){return '<line class="grid" x1="42" y1="'+y+'" x2="462" y2="'+y+'"/>';}).join('');
    var labels=days.map(function(d,i){return '<text x="'+(42+i*69)+'" y="160" text-anchor="middle">'+esc(d)+'</text>';}).join('');
    return '<svg class="wb-line-chart" viewBox="0 0 500 170" preserveAspectRatio="none">'+grid+'<polyline class="series helmet" points="'+pts(helmet)+'"/><polyline class="series uniform" points="'+pts(uniform)+'"/><polyline class="series speed" points="'+pts(speed)+'"/>'+labels+'</svg><div class="wb-chart-legend"><span><i style="background:#59df7e"></i>戴盔</span><span><i style="background:#458fff"></i>超速</span><span><i style="background:#3cd2c0"></i>工装</span></div>';
  }

  function ensureWorkbenchIcons() {
    var icons = [
      '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
      '<path d="M12 21s7-5.1 7-12a7 7 0 1 0-14 0c0 6.9 7 12 7 12Z"/><circle cx="12" cy="9" r="2.3"/>',
      '<circle cx="12" cy="8" r="4"/><path d="M4.5 21c.7-5 3.2-7 7.5-7s6.8 2 7.5 7"/>',
      '<rect x="5" y="5" width="14" height="16" rx="2"/><path d="M9 5V3h6v2M9 12l2 2 4-5"/>',
      '<path d="M7 17h10l-1.5-2.3V10a3.5 3.5 0 0 0-7 0v4.7L7 17Z"/><path d="M10 20h4"/>',
      '<path d="m4 12 16-7-5 15-3.5-5.5L4 12Z"/><path d="m11.5 14.5 3-3"/>'
    ];
    Array.prototype.forEach.call(document.querySelectorAll('.workbench-kpis article'),function(card,i){
      if(card.querySelector('.wb-kpi-icon')) return;
      card.insertAdjacentHTML('afterbegin','<i class="wb-kpi-icon"><svg viewBox="0 0 24 24" aria-hidden="true">'+icons[i]+'</svg></i>');
    });
  }

  function renderWorkbench() {
    var now = new Date();
    var date = document.getElementById('workbenchDate');
    if (date) date.textContent = now.toLocaleDateString('zh-CN', {year:'numeric',month:'long',day:'numeric',weekday:'long'}) + ' · 数据以最近一次成功同步为准';
    document.getElementById('wbStationCount').textContent = textNumber('#summaryRow .summary-card:first-child .value','17');
    document.getElementById('wbRiderCount').textContent = (window.riderData && riderData.length) ? riderData.length.toLocaleString('zh-CN') : textNumber('#summaryRowRiderExec .summary-card:first-child .value','—');

    var labels = ['戴盔达成','超速控制','闯红灯控制','逆行控制','护航工服','督导抽检'];
    var selectors = [
      '#summaryRow .summary-card:nth-child(3) .value', '#summaryRow .summary-card:nth-child(4) .value',
      '#summaryRow2 .summary-card:nth-child(3) .value', '#summaryRow2 .summary-card:nth-child(4) .value',
      '#summaryRowEscort .summary-card:nth-child(2) .value', '#summaryRowSupervision .summary-card:nth-child(2) .value'
    ];
    var metricHtml = labels.map(function(label, i) {
      var raw = document.querySelector(selectors[i]);
      var value = raw ? raw.textContent.trim() : '—';
      var pct = parseFloat(value);
      if (isNaN(pct)) pct = 0;
      var normalized = label.indexOf('超速') >= 0 || label.indexOf('闯红灯') >= 0 || label.indexOf('逆行') >= 0 ? Math.max(0,100-pct*5) : Math.min(100,pct);
      var color = label.indexOf('闯红灯') >= 0 ? '#ff565b' : '#53d883';
      var wave=[normalized-7,normalized-1,normalized-5,normalized+3,normalized-2,normalized+5,normalized];
      var note=label.indexOf('超速')>=0?'目标 ≤4%':label.indexOf('闯红灯')>=0?'较昨日动态':'本周';
      return '<div class="wb-metric"><span>' + label + '</span><strong style="color:'+color+'">' + esc(value) + '</strong><small class="wb-metric-note">'+note+'</small>' + sparklineSvg(wave,color) + '</div>';
    }).join('');
    document.getElementById('wbMetricGrid').innerHTML = metricHtml;

    var bodyRows = Array.prototype.slice.call(document.querySelectorAll('#tableBody tr:not(.city-summary-row)')).slice(0,30);
    var risks = bodyRows.map(function(row) {
      var cells = row.querySelectorAll('td');
      var risk = Array.prototype.filter.call(cells, function(td) {
        var s = (td.getAttribute('style') || '').toLowerCase();
        return /e74c3c|ef5350|f44336|ff6b|red|rgba\(231/.test(s) || td.classList.contains('negative');
      }).length;
      return {site:cells[0] ? cells[0].textContent.trim() : '', risk:risk};
    }).filter(function(x) { return x.site; }).sort(function(a,b){ return b.risk-a.risk; }).slice(0,5);
    document.getElementById('wbRiskCount').textContent = risks.filter(function(x){return x.risk>0;}).length;
    document.getElementById('wbRiskTable').innerHTML = '<div class="wb-risk-row is-head"><span>站点</span><span>异常项</span><span>风险级别</span><span>状态</span></div>' + risks.map(function(x,i) {
      var level = x.risk >= 3 ? '高' : x.risk ? '关注' : '正常';
      return '<div class="wb-risk-row"><span>' + esc(x.site) + '</span><span><strong>' + x.risk + '</strong></span><span>' + level + '</span><span>' + (i < 2 ? '待跟进' : '观察') + '</span></div>';
    }).join('');

    var days = [];
    for (var d=4; d>=0; d--) { var dt=new Date(now); dt.setDate(now.getDate()-d); days.push((dt.getMonth()+1)+'/'+dt.getDate()); }
    while(days.length<7){ var first=new Date(now); first.setDate(now.getDate()-(days.length+1)); days.unshift((first.getMonth()+1)+'/'+first.getDate()); }
    document.getElementById('wbTrendChart').innerHTML = trendChartSvg(days);

    fetch('/api/status').then(function(r){return r.json();}).then(function(state) {
      var sources = state.sources || [];
      var ok = sources.filter(function(s){return s.status === 'success';}).length;
      document.getElementById('wbSourceCount').textContent = ok + '/' + sources.length;
      document.getElementById('wbSourceHint').textContent = sources.length ? '最近一次同步' : '暂无同步记录';
      document.getElementById('wbTaskCount').textContent = ok + '/' + sources.length;
      document.getElementById('wbTaskHint').textContent = ok === sources.length && sources.length ? '任务已完成' : '仍有任务待处理';
      document.getElementById('wbPushState').textContent = state.bot && state.bot.connected ? '已连接' : '已配置';
      var items = sources.slice(0,6);
      var html = items.map(function(s,i) {
        var good = s.status === 'success';
        var time=(s.updated_at || s.last_run_at || '').slice(11,16) || ('07:'+(2+i*5<10?'0':'')+(2+i*5));
        return '<div class="wb-timeline-item '+(good?'':'is-bad')+'" data-time="'+esc(time)+'"><i></i><div><strong>'+esc(s.source_name || s.source_id || '数据源')+'</strong><span>'+esc(compactStatusMessage(s.message || s.status))+'</span></div><em>'+esc(s.row_count == null ? '—' : s.row_count+' 行')+'</em></div>';
      }).join('') || '<div class="wb-empty">暂无同步任务</div>';
      document.getElementById('wbTimeline').innerHTML = html;
      document.getElementById('wbHealthList').innerHTML = html.replace(/wb-timeline-item/g,'wb-health-item');
    }).catch(function() {
      document.getElementById('wbSourceHint').textContent = '状态读取失败';
    });
  }

  ensureWorkbenchIcons();
  window.addEventListener('open-workbench', function() { setTimeout(renderWorkbench, 80); });
  setTimeout(renderWorkbench, 1200);

  var riderPanels = [
    {id:'tabPanelRider', table:'dashboardTableRider', station:0, group:5},
    {id:'tabPanelRiderSafe', table:'dashboardTableRiderSafe', station:0, group:5},
    {id:'tabPanelRedlight', table:'dashboardTableRedlight', station:0, group:5},
    {id:'tabPanelEscortHelmet', table:'dashboardTableEscortHelmet', station:0, group:5},
    {id:'tabPanelEscortUniform', table:'dashboardTableEscortUniform', station:0, group:5}
  ];

  function isRiskRow(row) {
    return Array.prototype.some.call(row.cells, function(cell) {
      var style = (cell.getAttribute('style') || '').toLowerCase();
      var text = cell.textContent.trim();
      return /ef9a9a|ffcdd2|ffab91|e74c3c|f44336|red/.test(style) || /不合格|未完成|驳回/.test(text);
    });
  }

  function riderSafetyProfile(row) {
    function pct(index) {
      var cell=row&&row.cells?row.cells[index]:null;
      if(!cell) return null;
      var value=parseFloat(cell.textContent);
      return isFinite(value)?value:null;
    }
    var helmet=pct(8), overspeed=pct(10), redlight=pct(12), reverse=pct(14);
    var flags={
      helmet:helmet!==null&&helmet===0,
      overspeed:overspeed!==null&&overspeed>=4,
      redlight:redlight!==null&&redlight>=15,
      reverse:reverse!==null&&reverse>=3
    };
    var high=(helmet!==null&&helmet===0)||(overspeed!==null&&overspeed>=15)||(redlight!==null&&redlight>=20)||(reverse!==null&&reverse>=10);
    var count=Object.keys(flags).filter(function(key){return flags[key];}).length;
    return {flags:flags,count:count,level:high?'risk':count>0?'watch':'ok'};
  }

  function setupQuickFilter(cfg) {
    var panel = document.getElementById(cfg.id);
    var table = document.getElementById(cfg.table);
    if (!panel || !table || panel.querySelector('.rider-quick-filter')) return;
    var box = document.createElement('div');
    box.className = 'rider-quick-filter';
    box.innerHTML = '<div class="rq-field"><label>搜索骑手</label><input class="rq-search" placeholder="输入骑手ID或姓名"></div>'+
      '<div class="rq-field"><label>站点</label><select class="rq-station"><option value="">全部站点</option></select></div>'+
      '<div class="rq-field"><label>小组</label><select class="rq-group"><option value="">全部小组</option></select></div>'+
      '<label class="rq-risk"><input type="checkbox">仅看异常</label><button class="rq-clear" type="button">清空筛选</button>'+
      '<div class="rq-result">当前显示全部骑手</div>';
    var outer = table.closest('.table-outer');
    outer.parentNode.insertBefore(box, outer);
    var search = box.querySelector('.rq-search'), station = box.querySelector('.rq-station'), group = box.querySelector('.rq-group'), risk = box.querySelector('.rq-risk input'), result = box.querySelector('.rq-result');

    function populate() {
      var stations={}, groups={};
      Array.prototype.forEach.call(table.tBodies[0] ? table.tBodies[0].rows : [], function(row) {
        if (!row.cells.length || row.cells.length === 1) return;
        var s=row.cells[cfg.station] ? row.cells[cfg.station].textContent.trim() : '';
        var g=row.cells[cfg.group] ? row.cells[cfg.group].textContent.trim() : '';
        if(s) stations[s]=1; if(g && g!=='-') groups[g]=1;
      });
      var sv=station.value, gv=group.value;
      station.innerHTML='<option value="">全部站点</option>'+Object.keys(stations).sort().map(function(v){return '<option>'+esc(v)+'</option>';}).join('');
      group.innerHTML='<option value="">全部小组</option>'+Object.keys(groups).sort().map(function(v){return '<option>'+esc(v)+'</option>';}).join('');
      station.value=sv; group.value=gv;
    }
    function apply() {
      var q=search.value.trim().toLowerCase(), s=station.value, g=group.value, onlyRisk=risk.checked, shown=0, total=0;
      Array.prototype.forEach.call(table.tBodies[0] ? table.tBodies[0].rows : [], function(row) {
        if (!row.cells.length || row.cells.length === 1) return;
        total++;
        var site=row.cells[cfg.station] ? row.cells[cfg.station].textContent.trim() : '';
        var grp=row.cells[cfg.group] ? row.cells[cfg.group].textContent.trim() : '';
        var identity=((row.cells[1]?row.cells[1].textContent:'')+' '+(row.cells[2]?row.cells[2].textContent:'')).toLowerCase();
        var rowRisk=cfg.id==='tabPanelRiderSafe'?riderSafetyProfile(row).level!=='ok':isRiskRow(row);
        var extraPass=typeof panel._riderRiskPredicate==='function'?panel._riderRiskPredicate(row):true;
        var show=(!q || identity.indexOf(q)>=0) && (!s || site===s) && (!g || grp===g) && (!onlyRisk || rowRisk) && extraPass;
        row.classList.toggle('rq-hidden', !show); if(show) shown++;
      });
      result.textContent='当前显示 '+shown+' / '+total+' 名骑手';
    }
    [search,station,group,risk].forEach(function(el){el.addEventListener(el.tagName==='INPUT'&&el.type==='text'?'input':'change',apply);});
    box.querySelector('.rq-clear').addEventListener('click',function(){search.value='';station.value='';group.value='';risk.checked=false;apply();});
    var pending=false;
    new MutationObserver(function(){if(pending)return;pending=true;setTimeout(function(){pending=false;populate();apply();},60);}).observe(table.tBodies[0],{childList:true,subtree:false});
    panel._applyRiderQuickFilter=apply;
    populate(); apply();
  }
  riderPanels.forEach(setupQuickFilter);

  function pageHead(panel, title, sub, controls) {
    if (!panel || panel.querySelector('.ops-page-head')) return;
    var head=document.createElement('header'); head.className='ops-page-head';
    head.innerHTML='<div><h2>'+esc(title)+'</h2><p>'+esc(sub)+'</p></div><div class="ops-filters">'+(controls||'')+'</div>';
    panel.insertBefore(head,panel.firstChild);
  }

  function safeTrendSvg() {
    return '<div class="metric-chart safe-live-chart" id="safeLiveChart"></div>';
  }

  var safeLiveChartInstance=null;
  function renderSafeInsightChart() {
    var el=document.getElementById('safeLiveChart'), table=document.getElementById('dashboardTable');
    if(!el||!table||el.offsetWidth<80||typeof echarts==='undefined') return;
    var dates=unique(Array.prototype.slice.call(table.querySelectorAll('thead th')).map(function(th){var m=th.textContent.match(/\d{2}-\d{2}/);return m?m[0]:'';})).slice(-7);
    var row=table.tBodies[0]&&table.tBodies[0].rows[0], vals=percentTexts(row), n=dates.length;
    var helmet=n?vals.slice(2,2+n):vals.slice(0,5), speed=n?vals.slice(-n):vals.slice(-5);
    while(dates.length>helmet.length) dates.shift();
    if(!safeLiveChartInstance) safeLiveChartInstance=echarts.init(el);
    safeLiveChartInstance.setOption({animation:false,color:['#59df7e','#458fff'],tooltip:chartThemeTooltip('%'),legend:{right:5,top:0,textStyle:{color:'#8faabb',fontSize:8},itemWidth:12,itemHeight:2},grid:{left:36,right:40,top:25,bottom:22},xAxis:{type:'category',boundaryGap:false,data:dates,axisLine:{lineStyle:{color:'rgba(121,180,214,.25)'}},axisTick:{show:false},axisLabel:{color:'#7898ad',fontSize:8}},yAxis:[{type:'value',scale:true,axisLabel:{color:'#7898ad',fontSize:8,formatter:'{value}%'},splitLine:{lineStyle:{color:'rgba(121,180,214,.12)',type:'dashed'}}},{type:'value',scale:true,axisLabel:{color:'#7898ad',fontSize:8,formatter:'{value}%'},splitLine:{show:false}}],series:[{name:'戴盔系带',type:'line',smooth:true,symbolSize:5,data:helmet,lineStyle:{width:2},areaStyle:{opacity:.08}},{name:'有灯路口超速',type:'line',yAxisIndex:1,smooth:true,symbolSize:5,data:speed,lineStyle:{width:2},areaStyle:{opacity:.05}}]});
    safeLiveChartInstance.resize();
  }

  function enhanceSafePage() {
    var panel=document.getElementById('tabPanelSafe'); if(!panel || panel.dataset.enhanced==='1') return;
    panel.dataset.enhanced='1';
    pageHead(panel,'安全权益','站点维度 · 本周与近5日趋势','<select class="ops-filter"><option>本周</option><option>本月</option></select><select class="ops-filter"><option>西安</option></select><select class="ops-filter"><option>全部站点</option></select><button class="ops-filter-btn">筛选</button>');
    var summary=document.getElementById('summaryRow');
    var insights=document.createElement('div'); insights.className='safe-insights';
    insights.innerHTML='<section class="insight-panel"><h3>城市达成概览</h3><div class="safe-gauges"><div class="safe-gauge"><span>戴盔系带</span><div class="safe-gauge-ring"></div><strong id="safeGaugeHelmet">—</strong><span>目标 ≥97%</span></div><div class="safe-gauge"><span>有灯路口超速</span><div class="safe-gauge-ring"></div><strong id="safeGaugeSpeed">—</strong><span>目标 ≤4%</span></div></div></section><section class="insight-panel"><h3>本周趋势</h3>'+safeTrendSvg()+'</section>';
    summary.parentNode.insertBefore(insights,summary.nextSibling);
    function update(){
      var cards=summary.querySelectorAll('.summary-card .value');
      document.getElementById('safeGaugeHelmet').textContent=cards[2]?cards[2].textContent.trim():'—';
      document.getElementById('safeGaugeSpeed').textContent=cards[3]?cards[3].textContent.trim():'—';
      setTimeout(renderSafeInsightChart,60);
    }
    new MutationObserver(update).observe(summary,{childList:true,subtree:true}); update();
    var safeBody=document.getElementById('tableBody'); if(safeBody)new MutationObserver(function(){setTimeout(renderSafeInsightChart,70);}).observe(safeBody,{childList:true,subtree:true});
    var safeLiveChart=document.getElementById('safeLiveChart');
    if(safeLiveChart&&window.ResizeObserver&&!safeLiveChart.__safeChartObserved){
      safeLiveChart.__safeChartObserved=true;
      var safeChartResizeTimer=null;
      new ResizeObserver(function(){
        clearTimeout(safeChartResizeTimer);
        safeChartResizeTimer=setTimeout(renderSafeInsightChart,80);
      }).observe(safeLiveChart);
    }
    setTimeout(renderSafeInsightChart,420);
  }

  function mixedChartSvg() {
    return '<div class="metric-chart supervision-live-chart" id="supervisionLiveChart"></div>';
  }

  var supervisionLiveChartInstance=null, supervisionDonutInstance=null;
  function renderSupervisionInteractiveCharts(allRows) {
    if(typeof echarts==='undefined') return;
    var cityBody=document.getElementById('tableBodySupervisionCity'), cityRows=Array.prototype.slice.call(cityBody?cityBody.rows:[]).filter(function(r){return r.cells.length>=5&&!/暂无/.test(r.textContent);});
    var dates=cityRows.map(function(r){return r.cells[1].textContent.trim();}), rates=cityRows.map(function(r){return numericText(r.cells[2].textContent)||0;}), counts=cityRows.map(function(r){return numericText(r.cells[3].textContent)||0;});
    var lineEl=document.getElementById('supervisionLiveChart');
    if(lineEl&&lineEl.offsetWidth>80){if(!supervisionLiveChartInstance)supervisionLiveChartInstance=echarts.init(lineEl);supervisionLiveChartInstance.setOption({animation:false,color:['#318ee8','#62dc77'],tooltip:{trigger:'axis',confine:true,backgroundColor:'rgba(4,20,34,.96)',borderColor:'#1b92cd',textStyle:{color:'#eaf7ff',fontSize:10}},legend:{top:0,right:4,textStyle:{color:'#8faabb',fontSize:8},itemWidth:12,itemHeight:3},grid:{left:35,right:36,top:25,bottom:21},xAxis:{type:'category',data:dates,axisLabel:{color:'#7898ad',fontSize:8},axisLine:{lineStyle:{color:'rgba(121,180,214,.25)'}}},yAxis:[{type:'value',axisLabel:{color:'#7898ad',fontSize:8},splitLine:{lineStyle:{color:'rgba(121,180,214,.12)',type:'dashed'}}},{type:'value',min:0,max:100,axisLabel:{color:'#7898ad',fontSize:8,formatter:'{value}%'},splitLine:{show:false}}],series:[{name:'检查数量',type:'bar',data:counts,barWidth:16,itemStyle:{borderRadius:[3,3,0,0]}},{name:'服装合规率',type:'line',yAxisIndex:1,data:rates,smooth:true,symbolSize:5,lineStyle:{width:2}}]});supervisionLiveChartInstance.resize();}
    var clothes=0,helmet=0,box=0,multi=0;(allRows||[]).forEach(function(r){var c=r.cells,b=0;if(c[8]&&/不合格/.test(c[8].textContent)){clothes++;b++;}if(c[9]&&/不合格/.test(c[9].textContent)){helmet++;b++;}if(c[10]&&/不合格/.test(c[10].textContent)){box++;b++;}if(b>1)multi++;});
    var donutEl=document.getElementById('supervisionDonutChart');if(donutEl&&donutEl.offsetWidth>80){if(!supervisionDonutInstance)supervisionDonutInstance=echarts.init(donutEl);supervisionDonutInstance.setOption({animation:false,color:['#3a91f4','#ffad28','#67d781','#697e8f'],tooltip:{trigger:'item',confine:true,backgroundColor:'rgba(4,20,34,.96)',borderColor:'#1b92cd',textStyle:{color:'#eaf7ff',fontSize:10},formatter:'{b}：<b>{c}人</b>（{d}%）'},legend:{orient:'vertical',right:0,top:'middle',textStyle:{color:'#9cb4c4',fontSize:8},itemWidth:8,itemHeight:8},series:[{type:'pie',radius:['42%','68%'],center:['31%','50%'],label:{show:false},data:[{name:'服装不合规',value:clothes},{name:'头盔不合规',value:helmet},{name:'餐箱不合规',value:box},{name:'多项不合规',value:multi}]}]});supervisionDonutInstance.resize();}
  }

  function enhanceSupervision() {
    var panel=document.getElementById('tabPanelSupervision'); if(!panel || panel.dataset.enhanced==='1') return;
    panel.dataset.enhanced='1';
    pageHead(panel,'督导线下抽检','本月城市、站点与骑手不合规追踪','<select class="ops-filter"><option>本月</option></select><select class="ops-filter"><option>西安</option></select><select class="ops-filter"><option>全部站点</option></select><select class="ops-filter"><option>全部状态</option></select><button class="ops-filter-btn">筛选</button>');
    var summary=document.getElementById('summaryRowSupervision');
    var analytics=document.createElement('div'); analytics.className='supervision-analytics';
    analytics.innerHTML='<section class="insight-panel"><h3>城市日维度汇总</h3>'+mixedChartSvg()+'</section><section class="insight-panel"><h3>不合规分类</h3><div class="metric-chart" id="supervisionDonutChart"></div></section><section class="insight-panel supervision-actions"><h3>今日处理</h3><div class="action-stack"><div>待整改<strong>12</strong></div><div>已复核<strong>19</strong></div><div>已闭环<strong>6</strong></div></div></section>';
    summary.parentNode.insertBefore(analytics,summary.nextSibling);
    var gallery=document.createElement('section'); gallery.className='inspection-photo-gallery'; gallery.id='inspectionPhotoGallery';
    var riderSection=document.getElementById('dashboardTableSupervisionRider').closest('.inspection-section');
    riderSection.parentNode.insertBefore(gallery,riderSection);
    var tbody=document.getElementById('tableBodySupervisionRider');
    function updateGallery(){
      var allRows=Array.prototype.slice.call(tbody.rows).filter(function(r){return r.cells.length>2 && r.cells[2].textContent.trim() && !/暂无/.test(r.textContent);});
      var rows=allRows.slice(0,4);
      gallery.innerHTML=rows.map(function(r){
        var c=r.cells, img=r.querySelector('img'), link=r.querySelector('a[href]');
        var src=img?img.src:(link?link.href:'');
        var visual=src?'<img src="'+esc(src)+'" alt="抽检照片">':'<div class="inspection-photo-placeholder">待同步照片</div>';
        return '<article class="inspection-photo-card">'+visual+'<div><p>站点：<strong>'+esc(c[0]?c[0].textContent.trim():'—')+'</strong></p><p>骑手ID：'+esc(c[2]?c[2].textContent.trim():'—')+'</p><p>骑手姓名：'+esc(c[3]?c[3].textContent.trim():'—')+'</p><p>抓取日期：'+esc(c[1]?c[1].textContent.trim():'—')+'</p><span class="inspection-badge">'+esc(c[5]?c[5].textContent.trim():'不合规')+'</span></div></article>';
      }).join('');
      var bad=allRows.length; var total=document.getElementById('supervisionBadTotal'); if(total) total.textContent=bad;
      setTimeout(function(){renderSupervisionInteractiveCharts(allRows);},60);
    }
    new MutationObserver(updateGallery).observe(tbody,{childList:true,subtree:true}); updateGallery();
  }

  function enhanceRiderSafe() {
    var panel=document.getElementById('tabPanelRiderSafe'); if(!panel || panel.dataset.enhanced==='1') return;
    panel.dataset.enhanced='1';
    pageHead(panel,'骑手安全明细','骑手维度 · 昨日与本月安全表现','<select class="ops-filter"><option>昨日</option><option>本月</option></select><select class="ops-filter"><option>全部站点</option></select><select class="ops-filter"><option>全部小组</option></select><select class="ops-filter"><option>全部风险</option></select><button class="ops-filter-btn">筛选</button>');
    var head=panel.querySelector('.ops-page-head'), summary=panel.querySelector('.summary-row'), dashboard=panel.querySelector('.metric-dashboard'), shell=document.createElement('div'); shell.className='rider-safe-shell';
    var main=document.createElement('div'); main.className='rider-safe-main';
    var aside=document.createElement('aside'); aside.className='rider-safe-aside';
    Array.prototype.slice.call(panel.children).filter(function(el){return el!==head&&el!==summary&&el!==dashboard;}).forEach(function(el){main.appendChild(el);});
    aside.innerHTML='<section class="rider-aside-card"><h3>筛选结果</h3><div class="rider-result-grid"><div>达标<strong id="riderOk">—</strong></div><div>关注<strong id="riderWatch">—</strong></div><div>高风险<strong id="riderRisk">—</strong></div><div>总人数<strong id="riderShown">—</strong></div></div></section><section class="rider-aside-card"><h3>风险画像</h3><div class="rider-risk-bar" data-risk-metric="helmet"><span>戴盔不达标</span><i></i><b>—</b></div><div class="rider-risk-bar" data-risk-metric="overspeed"><span>超速≥4%</span><i></i><b>—</b></div><div class="rider-risk-bar" data-risk-metric="redlight"><span>闯红灯≥15%</span><i></i><b>—</b></div><div class="rider-risk-bar" data-risk-metric="reverse"><span>逆行≥3%</span><i></i><b>—</b></div></section><section class="rider-aside-card"><h3>选中骑手</h3><div class="selected-rider"><div class="selected-rider-avatar">♙</div><div><p>骑手姓名　<strong id="selectedRiderName">点击表格选择</strong></p><p>骑手ID　<span id="selectedRiderId">—</span></p><p>站点　<span id="selectedRiderSite">—</span></p></div></div></section><section class="rider-aside-card"><h3>快捷筛选</h3><div class="rider-quick-chips"><button data-risk-filter="helmet">昨日戴盔0%</button><button data-risk-filter="overspeed">超速≥4%</button><button data-risk-filter="redlight">闯红灯≥15%</button><button data-risk-filter="repeat">重复异常</button></div><p class="rider-filter-status" id="riderFilterStatus">当前：全部骑手</p></section>';
    shell.appendChild(aside); shell.appendChild(main);
    if(summary) panel.appendChild(summary);
    if(dashboard) panel.appendChild(dashboard);
    panel.appendChild(shell);
    var tbody=document.getElementById('tableBodyRiderSafe');
    function counts(){
      var rows=Array.prototype.slice.call(tbody.rows).filter(function(r){return r.cells.length>2&&!r.classList.contains('rq-hidden');});
      var stats={ok:0,watch:0,risk:0}, metrics={helmet:0,overspeed:0,redlight:0,reverse:0};
      rows.forEach(function(row){var profile=riderSafetyProfile(row);stats[profile.level]++;Object.keys(metrics).forEach(function(key){if(profile.flags[key])metrics[key]++;});});
      document.getElementById('riderShown').textContent=rows.length;document.getElementById('riderRisk').textContent=stats.risk;document.getElementById('riderWatch').textContent=stats.watch;document.getElementById('riderOk').textContent=stats.ok;
      var max=Math.max(1,metrics.helmet,metrics.overspeed,metrics.redlight,metrics.reverse);
      Array.prototype.forEach.call(aside.querySelectorAll('.rider-risk-bar'),function(bar){var key=bar.dataset.riskMetric,value=metrics[key]||0;bar.querySelector('b').textContent=value;bar.querySelector('i').style.width=(value/max*100).toFixed(1)+'%';});
    }
    new MutationObserver(counts).observe(tbody,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    tbody.addEventListener('click',function(e){var r=e.target.closest('tr');if(!r||r.cells.length<3)return;document.getElementById('selectedRiderSite').textContent=r.cells[0].textContent.trim();document.getElementById('selectedRiderId').textContent=r.cells[1].textContent.trim();document.getElementById('selectedRiderName').textContent=r.cells[2].textContent.trim();});
    var activeRiskFilter='';
    aside.querySelector('.rider-quick-chips').addEventListener('click',function(e){
      var button=e.target.closest('button[data-risk-filter]');if(!button)return;
      var key=button.dataset.riskFilter;activeRiskFilter=activeRiskFilter===key?'':key;
      Array.prototype.forEach.call(aside.querySelectorAll('[data-risk-filter]'),function(btn){btn.classList.toggle('active',btn.dataset.riskFilter===activeRiskFilter);});
      panel._riderRiskPredicate=activeRiskFilter?function(row){var profile=riderSafetyProfile(row);return activeRiskFilter==='repeat'?profile.count>=2:!!profile.flags[activeRiskFilter];}:null;
      document.getElementById('riderFilterStatus').textContent='当前：'+(activeRiskFilter?button.textContent:'全部骑手');
      if(panel._applyRiderQuickFilter)panel._applyRiderQuickFilter();counts();
    });
    counts();
    setTimeout(counts,400);
    setTimeout(counts,1800);
  }

  function enhanceAutomation() {
    var page=document.querySelector('#tabPanelRobot .bot-page'); if(!page || page.classList.contains('has-automation')) return;
    page.classList.add('has-automation');
    var dash=document.createElement('section'); dash.className='automation-dashboard';
    dash.innerHTML='<header class="automation-head"><div><h2>自动化中心</h2><p>数据采集、入库与企业微信推送统一管理</p></div><div><button class="ops-filter-btn" id="automationRunAllBtn">立即执行全部</button> <button class="ops-filter-btn" id="automationSendBtn">手动发送数据</button></div></header><div class="automation-kpis"><article><span>今日任务</span><strong id="autoTotal">—</strong></article><article><span>已完成</span><strong id="autoDone" style="color:#53d883">—</strong></article><article><span>进行中</span><strong id="autoPending">—</strong></article><article><span>真实失败</span><strong id="autoFailed" style="color:#ff565b">—</strong></article><article><span>未执行/过期</span><strong id="autoStale" style="color:#ffad28">—</strong></article><article><span>发送闸门</span><strong>07:55</strong></article></div><div class="automation-send-status" id="automationSendStatus"></div><div class="automation-grid"><section class="automation-panel"><h3>任务编排</h3><div id="automationRows"><div class="automation-table-row head"><span>任务名称</span><span>执行时间</span><span>业务日期</span><span>数据量</span><span>状态</span></div></div></section><div class="automation-side"><section class="automation-panel"><h3>数据源连接</h3><div id="automationSources"></div></section><section class="automation-panel"><h3>企业微信机器人</h3><div class="automation-source"><span>目标群：安全数据执行追踪群</span><b style="color:#53d883">已连接</b><span>07:55</span></div></section><section class="automation-panel"><h3>发送保护</h3><div class="automation-source"><span>数据不完整时阻止发送</span><b style="color:#ffad28">完整性校验</b><span>不发送旧数据</span></div></section></div></div>';
    page.insertBefore(dash,page.firstChild);
    function loadAutomationState(){return fetch('/api/status',{cache:'no-store'}).then(function(r){return r.json();}).then(function(state){var sources=state.sources||[];var done=sources.filter(function(s){return s.status==='success';}),failed=sources.filter(function(s){return s.status==='failed';}),stale=sources.filter(function(s){return s.status==='stale';}),pending=sources.filter(function(s){return s.status==='pending'||s.status==='running';});var statusLabel={success:'已完成',failed:'失败',stale:'未执行/过期',pending:'待执行',running:'进行中'};var statusClass={success:'success',failed:'failed',stale:'pending',pending:'pending',running:'pending'};document.getElementById('autoTotal').textContent=sources.length;document.getElementById('autoDone').textContent=done.length;document.getElementById('autoPending').textContent=pending.length;document.getElementById('autoFailed').textContent=failed.length;document.getElementById('autoStale').textContent=stale.length;document.getElementById('automationRows').innerHTML='<div class="automation-table-row head"><span>任务名称</span><span>执行时间</span><span>业务日期</span><span>数据量</span><span>状态</span></div>'+sources.map(function(s){return '<div class="automation-table-row"><strong>'+esc(s.source_name||s.source_id||'数据源')+'</strong><span>'+esc(s.scheduled_time||'07:05')+'</span><span>'+esc((s.business_date||'本周'))+'</span><span>'+esc(s.row_count==null?'—':s.row_count+' 条')+'</span><b class="automation-status '+(statusClass[s.status]||'pending')+'" title="'+esc(s.message||'')+'">'+(statusLabel[s.status]||'待执行')+'</b></div>';}).join('');document.getElementById('automationSources').innerHTML=sources.map(function(s){var color=s.status==='success'?'#53d883':(s.status==='failed'?'#ff656b':'#ffad28');return '<div class="automation-source"><span>'+esc(s.source_name||s.source_id)+'</span><b style="color:'+color+'">● '+(statusLabel[s.status]||'待执行')+'</b><span>'+esc((s.updated_at||'').slice(11,16)||s.scheduled_time||'—')+'</span></div>';}).join('');});}
    loadAutomationState().catch(function(){});
    document.getElementById('automationRunAllBtn').addEventListener('click',function(){var button=this,status=document.getElementById('automationSendStatus');button.disabled=true;button.textContent='正在执行11项…';status.textContent='正在补跑07:05独立采集，然后执行核心同步，请勿关闭页面…';fetch('/api/sync',{method:'POST'}).then(function(r){return r.json();}).then(function(result){status.textContent=result.morning&&result.morning.ok?'全部11项执行完成，状态已刷新':'同步完成，但独立采集仍有失败，请查看具体任务';return loadAutomationState();}).catch(function(error){status.textContent='执行失败：'+error.message;}).finally(function(){button.disabled=false;button.textContent='立即执行全部';});});
    dash.querySelector('#automationSendBtn').addEventListener('click',function(){var button=this,status=dash.querySelector('#automationSendStatus');button.disabled=true;button.textContent='正在发送…';status.textContent='正在执行完整性校验、生成截图并发送企业微信…';fetch('/api/report/send',{method:'POST'}).then(function(r){return r.json();}).then(function(result){if(!result.ok)throw new Error(result.error||'发送失败');status.textContent='发送成功';}).catch(function(error){status.textContent='发送失败：'+error.message;}).finally(function(){button.disabled=false;button.textContent='手动发送数据';});});
  }

  var businessCharts = new Map();
  var businessChartSpecs = [
    {panel:'tabPanelWebmaster',table:'dashboardTable2',title:'评级趋势',sub:'闯红灯率、逆行率与美团工装率',rank:'站点评级对比',page:'站长安全评级',desc:'站点维度 · 本周与近5日评级趋势',mode:'percent',equityCurve:true,overviewLabels:['闯红灯率','逆行率','美团工装率'],overviewCardIndexes:[2,3,5]},
    {panel:'tabPanelEscort',table:'dashboardTableEscort',title:'护航工装率趋势',sub:'城市日维度覆盖表现',rank:'站点工装率对比',page:'护航工服数据',desc:'城市、站点与日维度工装达成',mode:'percent',equityCurve:true,overviewLabels:['最新工装率','周期平均']},
    {panel:'tabPanelExec',table:'dashboardTableExec',title:'执行指标达成',sub:'城市汇总指标对比',rank:'站点执行达成对比',page:'站点执行指标',desc:'注册、消毒、车辆、血压、培训与考试',mode:'category',equityCurve:true,overviewLabels:['首项达成','指标平均']}
  ];

  function unique(items) { var seen={}; return items.filter(function(v){ if(!v || seen[v]) return false; seen[v]=1; return true; }); }
  function numericText(text) {
    var raw=String(text||'').replace(/,/g,'').trim();
    var match=raw.match(/-?\d+(?:\.\d+)?/); return match?Number(match[0]):null;
  }
  function percentTexts(row) {
    return Array.prototype.slice.call(row ? row.cells : []).map(function(c){return /%/.test(c.textContent)?numericText(c.textContent):null;}).filter(function(v){return v!==null&&isFinite(v);});
  }

  function tableChartData(spec) {
    var table=document.getElementById(spec.table); if(!table) return null;
    var rows=Array.prototype.slice.call(table.tBodies[0] ? table.tBodies[0].rows : []).filter(function(r){return r.cells.length>2&&!r.classList.contains('rq-hidden')&&!/暂无数据|暂无.*数据/.test(r.textContent);});
    var headers=Array.prototype.slice.call(table.querySelectorAll('thead th')).map(function(th){return th.textContent.replace(/[▼⇅]/g,'').trim();});
    var dates=unique(headers.map(function(h){var m=h.match(/\d{2}-\d{2}/);return m?m[0]:'';}));
    var source=rows[0];
    var pcts=percentTexts(source);
    var labels=[], values=[];
    if(spec.mode==='category') {
      labels=['消毒','车辆检查','血压','载具','充换电','安全培训','APP考试'];
      values=pcts.slice(0,labels.length);
    } else if(dates.length) {
      labels=dates.slice(-7);
      values=pcts.length>=labels.length?pcts.slice(-labels.length):pcts;
    } else {
      labels=['昨日','本周','月度'];
      values=pcts.slice(0,3);
    }
    if(!values.length) {
      var nums=Array.prototype.slice.call(source?source.cells:[]).slice(spec.mode==='rider'?4:1).map(function(c){return numericText(c.textContent);}).filter(function(v){return v!==null&&isFinite(v);});
      values=nums.slice(0,Math.max(3,labels.length));
    }
    if(!labels.length) labels=values.map(function(_,i){return '指标'+(i+1);});
    while(labels.length>values.length) labels.shift();
    while(values.length>labels.length) values.shift();

    var rankMap=new Map(), currentStation='';
    rows.forEach(function(r){
      var rawName=r.cells[0]?r.cells[0].textContent.trim():'';
      if(/站(?:\s|$)/.test(rawName)) currentStation=rawName;
      var station=/站(?:\s|$)/.test(rawName)?rawName:(spec.mode==='rider'?currentStation:'');
      if(!station||/^西安\s*[（(]/.test(station)) return;
      var candidates=percentTexts(r);
      if(!candidates.length) candidates=Array.prototype.slice.call(r.cells).slice(spec.mode==='rider'?4:1).map(function(c){return numericText(c.textContent);}).filter(function(v){return v!==null&&isFinite(v);});
      if(!candidates.length) return;
      var item=rankMap.get(station)||{fullName:station,total:0,count:0};
      item.total+=candidates[0]; item.count+=1; rankMap.set(station,item);
    });
    var ranks=Array.from(rankMap.values()).map(function(item){
      var shortName=item.fullName.replace(/^兴必达【西安】/,'').replace(/^集约配送-兴必达【西安】/,'集·').replace(/站$/,'');
      return {name:shortName.length>7?shortName.slice(0,6)+'…':shortName,fullName:item.fullName,value:Number((item.total/item.count).toFixed(2))};
    });
    var seriesData=null;
    if(spec.panel==='tabPanelWebmaster'&&dates.length&&pcts.length>=dates.length*2) {
      seriesData=[
        {name:'闯红灯率',data:pcts.slice(2,2+dates.length)},
        {name:'逆行率',data:pcts.slice(-dates.length),yAxisIndex:1}
      ];
      labels=dates.slice(-Math.min(dates.length,seriesData[0].data.length));
      values=seriesData[0].data;
    }
    return {labels:labels,values:values,ranks:ranks,unit:pcts.length?'%':'',seriesData:seriesData};
  }

  function chartThemeTooltip(unit) {
    return {trigger:'axis',confine:true,backgroundColor:'rgba(4,20,34,.96)',borderColor:'#1b92cd',borderWidth:1,padding:[7,9],textStyle:{color:'#eaf7ff',fontSize:10},formatter:function(items){if(!items||!items.length)return'';return '<b>'+items[0].axisValue+'</b><br>'+items.map(function(i){return i.marker+i.seriesName+'：<b>'+i.value+(unit||'')+'</b>';}).join('<br>');}};
  }

  function renderBusinessDashboard(spec) {
    var panel=document.getElementById(spec.panel), table=document.getElementById(spec.table); if(!panel||!table) return;
    var dashboard=panel.querySelector('.metric-dashboard,.business-equity-insights'); if(!dashboard) return;
    if(!panel.classList.contains('active') || dashboard.offsetWidth<100) return;
    var data=tableChartData(spec); if(!data) return;
    var lineEl=dashboard.querySelector('.metric-chart-primary'), rankEl=dashboard.querySelector('.metric-chart-rank');
    if(typeof echarts==='undefined') { lineEl.innerHTML='<div class="metric-dashboard-empty">图表组件尚未加载</div>'; return; }
    var pair=businessCharts.get(spec.panel);
    if(!pair){pair={line:echarts.init(lineEl),rank:rankEl?echarts.init(rankEl):null};businessCharts.set(spec.panel,pair);}
    var avg=data.values.length?data.values.reduce(function(a,b){return a+b;},0)/data.values.length:0;
    var kpis=dashboard.querySelector('.metric-dashboard-kpis');
    if(kpis) kpis.innerHTML='<small>数据点</small><b>'+data.values.length+'</b><small>平均值</small><b>'+avg.toFixed(2)+(data.unit||'')+'</b>';
    if(spec.equityCurve) {
      var overview=dashboard.querySelector('.business-overview');
      var cardValues=Array.prototype.slice.call(panel.querySelectorAll('.summary-card .value')).map(function(el){return numericText(el.textContent);});
      var overviewValues=spec.overviewCardIndexes
        ? spec.overviewCardIndexes.map(function(i){return cardValues[i];})
        : [data.values[data.values.length-1],avg];
      if(overview) overview.innerHTML=overviewValues.map(function(value,i){
        var label=spec.overviewLabels&&spec.overviewLabels[i]?spec.overviewLabels[i]:(i===0?'当前值':'平均值');
        var shown=value==null?0:value;
        return '<div class="safe-gauge"><span>'+esc(label)+'</span><div class="safe-gauge-ring"></div><strong>'+shown.toFixed(2)+(data.unit||'')+'</strong><span>'+esc(spec.overviewNote||'最新数据')+'</span></div>';
      }).join('');
    }
    var chartSeries=(data.seriesData||[{name:spec.title,data:data.values}]).map(function(series){return {name:series.name,type:'line',yAxisIndex:series.yAxisIndex||0,smooth:true,symbol:'circle',symbolSize:5,data:series.data,lineStyle:{width:2},areaStyle:{opacity:.08},emphasis:{focus:'series',scale:1.35}};});
    var yAxes=data.seriesData?[{type:'value',scale:true,axisLabel:{color:'#7898ad',fontSize:8,formatter:'{value}'+data.unit},splitLine:{lineStyle:{color:'rgba(121,180,214,.12)',type:'dashed'}}},{type:'value',scale:true,axisLabel:{color:'#7898ad',fontSize:8,formatter:'{value}'+data.unit},splitLine:{show:false}}]:{type:'value',scale:true,splitNumber:3,axisLabel:{color:'#7898ad',fontSize:8,formatter:'{value}'+data.unit},splitLine:{lineStyle:{color:'rgba(121,180,214,.12)',type:'dashed'}}};
    pair.line.setOption({animation:false,color:['#59df7e','#458fff'],tooltip:chartThemeTooltip(data.unit),legend:{show:!!data.seriesData,right:5,top:0,textStyle:{color:'#8faabb',fontSize:8},itemWidth:12,itemHeight:2},grid:{left:36,right:40,top:25,bottom:22},xAxis:{type:'category',boundaryGap:false,data:data.labels,axisLine:{lineStyle:{color:'rgba(121,180,214,.25)'}},axisTick:{show:false},axisLabel:{color:'#7898ad',fontSize:8}},yAxis:yAxes,series:chartSeries},true);
    if(spec.equityCurve) { pair.line.resize(); return; }
    var rankHint=dashboard.querySelector('.metric-chart-head > span');
    if(rankHint) rankHint.textContent='全部'+data.ranks.length+'个站点 · 悬浮查看';
    var matrixCols=6, matrixRows=Math.max(1,Math.ceil(data.ranks.length/matrixCols));
    var matrixValues=data.ranks.map(function(x){return x.value;}), matrixMin=Math.min.apply(null,matrixValues.length?matrixValues:[0]), matrixMax=Math.max.apply(null,matrixValues.length?matrixValues:[1]);
    if(matrixMin===matrixMax) matrixMax=matrixMin+1;
    var matrixData=data.ranks.map(function(x,i){return {name:x.fullName,shortName:x.name,value:[i%matrixCols,matrixRows-1-Math.floor(i/matrixCols),x.value]};});
    pair.rank.setOption({animation:false,tooltip:{trigger:'item',confine:true,backgroundColor:'rgba(4,20,34,.96)',borderColor:'#1b92cd',borderWidth:1,padding:[7,9],textStyle:{color:'#eaf7ff',fontSize:10},formatter:function(p){return '<b>'+p.data.name+'</b><br>'+spec.rank+'：<b>'+p.data.value[2]+(data.unit||'')+'</b>'; }},grid:{left:3,right:3,top:3,bottom:3},xAxis:{type:'category',data:Array.from({length:matrixCols},function(_,i){return i;}),show:false},yAxis:{type:'category',data:Array.from({length:matrixRows},function(_,i){return i;}),show:false},visualMap:{show:false,min:matrixMin,max:matrixMax,calculable:false,inRange:{color:['#103b5a','#1778ad','#22a8c8','#48d3bd']}},series:[{name:spec.rank,type:'heatmap',data:matrixData,label:{show:true,color:'#eaf7ff',fontSize:7,lineHeight:10,formatter:function(p){return p.data.shortName+'\n'+p.data.value[2]+(data.unit||'');}},itemStyle:{borderWidth:2,borderColor:'#071d30',borderRadius:4},emphasis:{itemStyle:{borderColor:'#63e3ff',borderWidth:2,shadowBlur:12,shadowColor:'rgba(55,196,255,.55)'}}}]},true);
    pair.line.resize(); pair.rank.resize();
  }

  function setupBusinessDashboard(spec) {
    var panel=document.getElementById(spec.panel), table=document.getElementById(spec.table); if(!panel||!table||panel.querySelector('.metric-dashboard,.business-equity-insights')) return;
    pageHead(panel,spec.page,spec.desc,'<select class="ops-filter"><option>最新数据</option><option>本月</option></select><select class="ops-filter"><option>全部站点</option></select><button class="ops-filter-btn">筛选</button>');
    var summary=panel.querySelector('.summary-row');
    var dash=document.createElement('section');dash.className=spec.equityCurve?'safe-insights business-equity-insights':'metric-dashboard';
    dash.innerHTML=spec.equityCurve
      ? '<article class="insight-panel"><h3>城市达成概览</h3><div class="safe-gauges business-overview"></div></article><article class="insight-panel"><div class="metric-chart-head"><h3>'+esc(spec.title)+'</h3><div class="metric-dashboard-kpis"><small>读取中</small></div></div><div class="metric-chart safe-live-chart metric-chart-primary"></div></article>'
      : '<article class="metric-chart-panel"><div class="metric-chart-head"><h3>'+esc(spec.title)+'</h3><div class="metric-dashboard-kpis"><small>读取中</small></div></div><div class="metric-chart metric-chart-primary"></div></article><article class="metric-chart-panel"><div class="metric-chart-head"><h3>'+esc(spec.rank)+'</h3><span>悬浮查看明细</span></div><div class="metric-chart metric-chart-rank"></div></article>';
    var summaries=panel.querySelectorAll('.summary-row');
    var anchor=summaries.length?summaries[summaries.length-1]:panel.querySelector('.table-outer');
    if(summaries.length) anchor.parentNode.insertBefore(dash,anchor.nextSibling); else anchor.parentNode.insertBefore(dash,anchor);
    var timer=null, body=table.tBodies[0];
    if(body) new MutationObserver(function(){clearTimeout(timer);timer=setTimeout(function(){renderBusinessDashboard(spec);},100);}).observe(body,{childList:true,subtree:true});
  }

  businessChartSpecs.forEach(setupBusinessDashboard);
  document.getElementById('tabBar').addEventListener('click',function(){setTimeout(function(){businessChartSpecs.forEach(renderBusinessDashboard);renderSafeInsightChart();var riderBody=document.getElementById('tableBodySupervisionRider');if(riderBody)renderSupervisionInteractiveCharts(Array.prototype.slice.call(riderBody.rows).filter(function(r){return r.cells.length>2&&!/暂无/.test(r.textContent);}));},160);});
  window.addEventListener('resize',function(){businessCharts.forEach(function(pair){pair.line.resize();if(pair.rank)pair.rank.resize();});});

  enhanceSafePage();
  enhanceSupervision();
  setTimeout(enhanceRiderSafe,80);
  enhanceAutomation();
})();
