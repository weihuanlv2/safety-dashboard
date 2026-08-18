(function() {
  function esc(value) {
    return String(value == null ? '' : value).replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function formatTime(value) { return String(value || '—').replace('T',' ').slice(0,19); }
  function renderImage(id, url, alt) {
    document.getElementById(id).innerHTML = url
      ? '<img src="' + esc(url) + '?t=' + Date.now() + '" alt="' + esc(alt) + '">'
      : '暂无结果图';
  }
  function load() {
    return fetch('/api/control-list/status', {cache:'no-store'}).then(function(response) {
      if (!response.ok) throw new Error('状态接口 ' + response.status);
      return response.json();
    }).then(function(data) {
      var run = data.run;
      document.getElementById('controlListState').textContent = run
        ? ({success:'处理成功',failed:'处理失败',processing:'处理中'}[run.status] || run.status) : '等待首个文件';
      document.getElementById('controlLastFile').textContent = run ? run.source_file : '—';
      document.getElementById('controlRows').textContent = run ? run.total_rows : 0;
      document.getElementById('controlMatched').textContent = run ? run.matched_rows : 0;
      document.getElementById('controlUnmatched').textContent = run ? run.unmatched_ids : 0;
      if (run && run.unmatched_id_list && run.unmatched_id_list.length) {
        document.getElementById('controlUnmatched').title = run.unmatched_id_list.join('、');
      }
      renderImage('controlDetailWrap', run && run.detail_image_url, '西安站管控名单明细');
      renderImage('controlRankingWrap', run && run.ranking_image_url, '西安加盟商人数排名');
      var logs = data.logs || [];
      document.getElementById('controlLogs').innerHTML = logs.length ? logs.map(function(item) {
        return '<div class="run-log-item"><span class="run-log-level ' + esc(item.level) + '">' +
          esc(String(item.level || 'info').toUpperCase()) + '</span><span class="run-log-time">' +
          esc(formatTime(item.created_at)) + '</span><strong>' + esc(item.event) + '</strong><span>' +
          esc(item.message) + '</span></div>';
      }).join('') : '<div class="bot-empty">暂无运行日志</div>';
    }).catch(function(error) {
      document.getElementById('controlListState').textContent = '读取失败';
      document.getElementById('controlLogs').innerHTML = '<div class="bot-empty">' + esc(error.message) + '</div>';
    });
  }
  function fetchLatest() {
    var button = document.getElementById('controlFetchLatest');
    var message = document.getElementById('controlActionMessage');
    var state = document.getElementById('controlListState');
    button.disabled = true;
    button.textContent = '正在获取与解析…';
    state.textContent = '本次处理中';
    message.className = 'control-action-message';
    message.textContent = '正在检查系统下载目录和机器人收件箱中的最新管控附件…';
    fetch('/api/control-list/fetch-latest', {method:'POST'}).then(function(response) {
      return response.json().then(function(data) {
        if (!response.ok) throw new Error(data.detail || '抓取失败');
        return data;
      });
    }).then(function(data) {
      message.className = 'control-action-message ' + (data.push && data.push.ok ? 'ok' : 'bad');
      message.textContent = (data.message || '处理完成') + '：' + (data.source_file || '');
      return load();
    }).catch(function(error) {
      state.textContent = '本次处理失败';
      message.className = 'control-action-message bad';
      message.textContent = error.message;
    }).finally(function() {
      button.disabled = false;
      button.textContent = '更新数据并发送企业微信';
    });
  }
  window.addEventListener('open-control-list', load);
  document.getElementById('controlRefresh').addEventListener('click', load);
  document.getElementById('controlFetchLatest').addEventListener('click', fetchLatest);
})();
