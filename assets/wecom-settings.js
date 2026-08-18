(function() {
  var panel = document.getElementById('tabPanelRobot');
  if (!panel) return;
  var loaded = false;
  var config = null;
  var aibotConfig = null;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function toast(message, error) {
    var el = document.getElementById('botToast');
    el.textContent = message || '';
    el.classList.toggle('error', !!error);
  }

  function renderTargets(items) {
    var box = document.getElementById('botTargets');
    if (!items.length) {
      box.innerHTML = '<div class="bot-empty">尚未配置群机器人，请添加第一个目标群</div>';
      return;
    }
    box.innerHTML = items.map(function(item) {
      return '<div class="bot-target" data-id="' + esc(item.id || '') + '">' +
        '<input class="bot-input bot-target-name" value="' + esc(item.name || '') + '" placeholder="群名称">' +
        '<input class="bot-input bot-target-url" type="password" value="" placeholder="' +
          esc(item.configured ? '已保存 ' + item.webhook_masked + '；留空则保持不变' : '粘贴完整 Webhook 地址') + '">' +
        '<button class="bot-icon-btn bot-remove-target" title="删除">×</button>' +
        '<div class="bot-target-meta">' +
          (item.configured ? 'Webhook 已安全保存，页面不会回显完整密钥' : '地址应以 https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key= 开头') +
        '</div></div>';
    }).join('');
  }

  function renderTimes(times) {
    document.getElementById('botTimes').innerHTML = times.map(function(value) {
      return '<span class="bot-time"><input type="time" value="' + esc(value) + '"><button class="bot-remove-time">×</button></span>';
    }).join('');
  }

  function renderStatus() {
    var count = config.targets.length;
    var ready = config.enabled && count > 0;
    var status = document.getElementById('botConnectionStatus');
    status.classList.toggle('ready', ready);
    status.innerHTML = '<i class="bot-status-dot"></i>' + (ready ? '已启用 · ' + count + ' 个群' : count ? '已配置 · 未启用' : '等待配置');
    document.getElementById('botEnabled').checked = !!config.enabled;
    document.getElementById('botDashboardUrl').value = config.dashboard_url || '';
    document.getElementById('botPreview').textContent =
      '【安全数据看板每日推送】\n时间：每天 ' + config.times.join('、') +
      '\n最近任务：同步完成后自动汇总\n看板地址：' + (config.dashboard_url || '未配置');
  }

  function loadLogs() {
    return fetch('/api/wecom/logs').then(function(r) { return r.json(); }).then(function(items) {
      var box = document.getElementById('botLogs');
      if (!items.length) {
        box.innerHTML = '<div class="bot-empty">暂无机器人推送记录</div>';
        return;
      }
      box.innerHTML = items.map(function(item) {
        return '<div class="bot-log"><div class="bot-log-top"><span>' + esc(item.event) + '</span><span>' +
          esc((item.created_at || '').replace('T', ' ')) + '</span></div><div class="bot-log-message">' +
          esc(item.message || '') + '</div></div>';
      }).join('');
    });
  }

  function loadConfig(force) {
    if (loaded && !force) return;
    loaded = true;
    Promise.all([
      fetch('/api/wecom/config').then(function(r) { return r.json(); }),
      fetch('/api/aibot/config').then(function(r) { return r.json(); }),
      fetch('/api/aibot/status').then(function(r) { return r.json(); })
    ]).then(function(results) {
      var data = results[0];
      config = data;
      renderTargets(data.targets || []);
      renderTimes(data.times || ['08:10']);
      renderStatus();
      aibotConfig = results[1];
      renderAibot(results[2]);
      return loadLogs();
    }).catch(function(err) {
      toast('读取机器人配置失败：' + err.message, true);
    });
  }

  function renderAibot(status) {
    status = status || aibotConfig || {};
    var connected = !!status.authenticated;
    var bound = !!status.chat_id_configured;
    var state = document.getElementById('aibotConnection');
    state.classList.toggle('ready', connected);
    state.textContent = connected ? (bound ? '已连接 · 目标群已绑定' : '已连接 · 等待群绑定') : '尚未连接';
    document.getElementById('aibotLastEvent').textContent =
      status.last_error ? '异常：' + status.last_error : (status.last_event || '');
    document.getElementById('aibotGroupName').value =
      status.target_group_name || aibotConfig.target_group_name || '安全数据执行追踪群';
    document.getElementById('controlListGroupName').value =
      status.control_list_group_name || aibotConfig.control_list_group_name || '【中西】重要项目数据播报群';
    document.getElementById('aibotBotIdHint').textContent =
      status.bot_id_configured ? '已配置：' + status.bot_id_masked : '机器人后台的 Bot ID';
    document.getElementById('aibotBindGuide').innerHTML = bound
      ? '已记录目标群标识，定时任务可以主动推送到「' + esc(status.target_group_name) + '」。'
      : '连接成功后，请在目标群里向机器人发送：<strong>绑定安全数据执行追踪群</strong>';
    document.getElementById('controlListBindGuide').innerHTML = status.control_list_chat_id_configured
      ? '管控名单来源群已绑定，文件和【西安】文字消息监听已启用。'
      : '请在来源群向机器人发送：<strong>绑定管控名单群</strong>';
    var topStatus = document.getElementById('botConnectionStatus');
    if (connected) {
      topStatus.classList.add('ready');
      topStatus.innerHTML = '<i class="bot-status-dot"></i>' + (bound ? '智能机器人已就绪' : '等待群绑定');
    }
  }

  function loadAibotStatus() {
    return fetch('/api/aibot/status').then(function(r) { return r.json(); }).then(renderAibot);
  }

  function collectPayload() {
    var targets = [];
    panel.querySelectorAll('.bot-target').forEach(function(row) {
      targets.push({
        id: row.getAttribute('data-id') || '',
        name: row.querySelector('.bot-target-name').value.trim(),
        url: row.querySelector('.bot-target-url').value.trim()
      });
    });
    var times = [];
    panel.querySelectorAll('.bot-time input').forEach(function(input) {
      if (input.value) times.push(input.value);
    });
    return {
      enabled: document.getElementById('botEnabled').checked,
      dashboard_url: document.getElementById('botDashboardUrl').value.trim(),
      targets: targets,
      times: times
    };
  }

  panel.addEventListener('click', function(e) {
    if (e.target.closest('#botAddTarget')) {
      var current = collectPayload().targets.map(function(item) {
        return {id:item.id, name:item.name, configured:!!item.id, webhook_masked:'', url:item.url};
      });
      current.push({id:'', name:'新群', configured:false, webhook_masked:''});
      renderTargets(current);
      return;
    }
    var removeTarget = e.target.closest('.bot-remove-target');
    if (removeTarget) {
      removeTarget.closest('.bot-target').remove();
      if (!panel.querySelector('.bot-target')) renderTargets([]);
      return;
    }
    if (e.target.closest('#botAddTime')) {
      var times = collectPayload().times;
      times.push('08:10');
      renderTimes(times);
      return;
    }
    var removeTime = e.target.closest('.bot-remove-time');
    if (removeTime) {
      removeTime.closest('.bot-time').remove();
      return;
    }
    if (e.target.closest('#botSave')) {
      toast('正在保存…');
      fetch('/api/wecom/config', {
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(collectPayload())
      }).then(function(r) { return r.json(); }).then(function(result) {
        config = result.config;
        renderTargets(config.targets || []);
        renderTimes(config.times || []);
        renderStatus();
        toast(result.ok ? '设置已保存' : result.errors.join('；'), !result.ok);
        loadLogs();
      }).catch(function(err) { toast('保存失败：' + err.message, true); });
      return;
    }
    if (e.target.closest('#botTest')) {
      toast('正在发送测试消息…');
      fetch('/api/push', {method:'POST'}).then(function(r) { return r.json(); }).then(function(result) {
        if (result.skipped) throw new Error(result.reason);
        toast(result.ok ? '测试消息发送成功' : '发送失败，请查看日志', !result.ok);
        loadLogs();
      }).catch(function(err) { toast('测试失败：' + err.message, true); });
      return;
    }
    if (e.target.closest('#botRefreshLogs')) {
      loadLogs();
    }
    if (e.target.closest('#aibotSave')) {
      var aibotToast = document.getElementById('aibotToast');
      aibotToast.textContent = '正在连接企业微信…';
      aibotToast.classList.remove('error');
      fetch('/api/aibot/config', {
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          enabled:true,
          bot_id:document.getElementById('aibotBotId').value.trim(),
          secret:document.getElementById('aibotSecret').value.trim(),
          target_group_name:document.getElementById('aibotGroupName').value.trim(),
          control_list_group_name:document.getElementById('controlListGroupName').value.trim()
        })
      }).then(function(r) { return r.json(); }).then(function(result) {
        aibotConfig = result.config;
        document.getElementById('aibotBotId').value = '';
        document.getElementById('aibotSecret').value = '';
        aibotToast.textContent = result.started ? '配置已保存，正在建立长连接…' : '配置不完整';
        aibotToast.classList.toggle('error', !result.started);
        setTimeout(loadAibotStatus, 1500);
      }).catch(function(err) {
        aibotToast.textContent = '连接失败：' + err.message;
        aibotToast.classList.add('error');
      });
      return;
    }
    if (e.target.closest('#aibotTest')) {
      var testToast = document.getElementById('aibotToast');
      testToast.textContent = '正在发送测试消息…';
      testToast.classList.remove('error');
      fetch('/api/aibot/test', {method:'POST'}).then(function(r) { return r.json(); }).then(function(result) {
        testToast.textContent = result.ok ? '测试消息已发送到目标群' : (result.reason || '发送失败');
        testToast.classList.toggle('error', !result.ok);
        loadAibotStatus();
        loadLogs();
      }).catch(function(err) {
        testToast.textContent = '发送失败：' + err.message;
        testToast.classList.add('error');
      });
      return;
    }
  });

  document.getElementById('tabBar').addEventListener('click', function(e) {
    var tab = e.target.closest('.tab-item[data-tab="robot"]');
    if (tab) setTimeout(function() { loadConfig(true); }, 0);
  });
  window.addEventListener('open-robot-settings', function() {
    setTimeout(function() { loadConfig(true); }, 0);
  });
  setInterval(function() {
    if (panel.classList.contains('active')) loadAibotStatus();
  }, 5000);
})();
