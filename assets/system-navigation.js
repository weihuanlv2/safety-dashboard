(function() {
  var primaryNav = document.getElementById('primaryNav');
  if (!primaryNav) return;

  var tabBar = document.getElementById('tabBar');
  var uploadStatusBar = document.querySelector('.upload-status-bar');
  var dataPanel = document.getElementById('tabPanelDataOps');
  var robotPanel = document.getElementById('tabPanelRobot');
  var logsPanel = document.getElementById('tabPanelRunLogs');
  var controlListPanel = document.getElementById('tabPanelControlList');
  var healthMonitorPanel = document.getElementById('tabPanelHealthMonitor');
  var workbenchPanel = document.getElementById('tabPanelWorkbench');
  var operationalPanels = [workbenchPanel, dataPanel, robotPanel, healthMonitorPanel, controlListPanel, logsPanel];

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function activeSafetyPanel() {
    var activeTab = tabBar.querySelector('.tab-item.active');
    var key = activeTab ? activeTab.getAttribute('data-tab') : 'safe';
    var map = {
      safe:'tabPanelSafe', webmaster:'tabPanelWebmaster', escort:'tabPanelEscort',
      morning:'tabPanelMorning', exec:'tabPanelExec', rider:'tabPanelRider',
      rider_safe:'tabPanelRiderSafe', redlight:'tabPanelRedlight',
      escort_helmet:'tabPanelEscortHelmet', escort_uniform:'tabPanelEscortUniform',
      ai_diag:'tabPanelAiDiag'
    };
    return document.getElementById(map[key] || 'tabPanelSafe');
  }

  function hideAllPanels() {
    document.querySelectorAll('.tab-panel').forEach(function(panel) {
      panel.classList.remove('active');
    });
  }

  function openSection(section) {
    primaryNav.querySelectorAll('.primary-nav-item').forEach(function(item) {
      item.classList.toggle('active', item.getAttribute('data-section') === section);
    });
    hideAllPanels();
    var safety = section === 'safety';
    tabBar.style.display = safety ? '' : 'none';
    if (uploadStatusBar) uploadStatusBar.style.display = safety ? '' : 'none';

    if (section === 'workbench') {
      workbenchPanel.classList.add('active');
      window.dispatchEvent(new CustomEvent('open-workbench'));
    } else if (safety) {
      activeSafetyPanel().classList.add('active');
    } else if (section === 'data') {
      dataPanel.classList.add('active');
      loadDataStatus();
    } else if (section === 'robot') {
      robotPanel.classList.add('active');
      window.dispatchEvent(new CustomEvent('open-robot-settings'));
    } else if (section === 'control-list') {
      controlListPanel.classList.add('active');
      window.dispatchEvent(new CustomEvent('open-control-list'));
    } else if (section === 'health-monitor') {
      healthMonitorPanel.classList.add('active');
      window.dispatchEvent(new CustomEvent('open-health-monitor'));
    } else if (section === 'logs') {
      logsPanel.classList.add('active');
      loadRunLogs();
    }
  }

  primaryNav.addEventListener('click', function(event) {
    var item = event.target.closest('.primary-nav-item');
    if (item) openSection(item.getAttribute('data-section'));
  });

  tabBar.addEventListener('click', function() {
    primaryNav.querySelectorAll('.primary-nav-item').forEach(function(item) {
      item.classList.toggle('active', item.getAttribute('data-section') === 'safety');
    });
  });

  function formatTime(value) {
    return String(value || '-').replace('T', ' ').slice(0, 19);
  }

  function loadDataStatus() {
    Promise.all([
      fetch('/api/status').then(function(r) { return r.json(); }),
      fetch('/api/import-logs').then(function(r) { return r.json(); })
    ]).then(function(results) {
      var state = results[0] || {};
      var sources = state.sources || [];
      var statusBox = document.getElementById('sourceStatusList');
      if (!sources.length) {
        statusBox.innerHTML = '<div class="bot-empty">暂无数据源同步记录</div>';
      } else {
        statusBox.innerHTML = sources.map(function(item) {
          var ok = item.status === 'success';
          return '<div class="source-status-item"><i class="' + (ok ? 'ok' : 'bad') + '"></i><div><strong>' +
            esc(item.source_name || item.source_id || '数据源') + '</strong><span>' +
            esc(item.message || item.status || '-') + '</span></div><em>' +
            esc(item.row_count == null ? '-' : item.row_count + ' 行') + '</em></div>';
        }).join('');
      }
      var logs = results[1] || [];
      var logBox = document.getElementById('importLogList');
      logBox.innerHTML = logs.length ? logs.slice(0, 30).map(function(item) {
        return '<div class="system-log-row"><span>' + esc(formatTime(item.created_at)) + '</span><strong>' +
          esc(item.source_name || item.source_id || '数据源') + '</strong><span class="system-log-message">' +
          esc(item.message || item.status || '-') + '</span><em>' +
          esc(item.row_count == null ? '-' : item.row_count + ' 行') + '</em></div>';
      }).join('') : '<div class="bot-empty">暂无导入记录</div>';
      var stateEl = document.getElementById('dataOpsState');
      stateEl.textContent = state.run ? '最近任务 #' + state.run.id : '等待操作';
    }).catch(function(error) {
      document.getElementById('dataOpsState').textContent = '状态读取失败';
      document.getElementById('systemImportStatus').textContent = error.message;
    });
  }

  function loadRunLogs() {
    fetch('/api/logs').then(function(r) { return r.json(); }).then(function(items) {
      var box = document.getElementById('systemRunLogs');
      box.innerHTML = items.length ? items.map(function(item) {
        var level = String(item.level || 'info').toLowerCase();
        return '<div class="run-log-item"><span class="run-log-level ' + esc(level) + '">' +
          esc(level.toUpperCase()) + '</span><span class="run-log-time">' +
          esc(formatTime(item.created_at)) + '</span><strong>' + esc(item.event || 'system') +
          '</strong><span>' + esc(item.message || '-') + '</span></div>';
      }).join('') : '<div class="bot-empty">暂无运行日志</div>';
    }).catch(function(error) {
      document.getElementById('systemRunLogs').innerHTML =
        '<div class="bot-empty">日志读取失败：' + esc(error.message) + '</div>';
    });
  }

  document.getElementById('systemImportBtn').addEventListener('click', function() {
    document.getElementById('uploadLabel').click();
  });
  document.getElementById('systemRefreshStatus').addEventListener('click', loadDataStatus);
  document.getElementById('systemRefreshLogs').addEventListener('click', loadRunLogs);
  document.getElementById('systemSyncBtn').addEventListener('click', function() {
    var button = this;
    var status = document.getElementById('systemImportStatus');
    button.disabled = true;
    status.textContent = '正在后台同步数据源，请稍候…';
    fetch('/api/sync', {method:'POST'}).then(function(r) { return r.json(); }).then(function(result) {
      status.textContent = result.ok
        ? '同步任务 #' + result.run_id + ' 已完成；导入记录共 ' + (result.source_count || 0) + ' 项（主同步5项＋独立采集6项）'
        : '同步失败';
      loadDataStatus();
    }).catch(function(error) {
      status.textContent = '同步失败：' + error.message;
    }).finally(function() {
      button.disabled = false;
    });
  });

  var originalStatus = document.getElementById('uploadStatus');
  if (originalStatus) {
    new MutationObserver(function() {
      var text = originalStatus.textContent.trim();
      if (text) document.getElementById('systemImportStatus').textContent = text;
    }).observe(originalStatus, {subtree:true, childList:true, characterData:true});
  }

  window.dashboardOpenSection = openSection;
  openSection('workbench');
})();
