const ICONS = {
  loading: `<svg viewBox="0 0 24 24"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="2s" repeatCount="indefinite"/></path></svg>`,
  zap: `<svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  spam: `<svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  ham: `<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  error: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
};

/* ── Email data from Flask (injected via data attributes) ── */
var EMAIL_DATA = (function () {
  var cards = document.querySelectorAll('.email-card');
  var data = [];
  cards.forEach(function (card, i) {
    data.push({
      index: i,
      sender: card.querySelector('.card-sender') ? card.querySelector('.card-sender').textContent : '',
      time: card.querySelector('.card-time') ? card.querySelector('.card-time').textContent : '',
      subject: card.querySelector('.card-subject') ? card.querySelector('.card-subject').textContent : '',
      preview: card.querySelector('.card-preview') ? card.querySelector('.card-preview').textContent : '',
      isSpam: card.getAttribute('data-spam') === '1',
      text: card.getAttribute('data-text') || '',
    });
  });
  return data;
})();

var activeCardIndex = -1;

var analyzeInput = document.getElementById('analyzeInput');
var analyzeResult = document.getElementById('analyzeResult');
var analyzeBtn = document.getElementById('analyzeBtn');
var charCountEl = document.getElementById('charCount');

if (analyzeInput) {
  analyzeInput.addEventListener('input', function () {
    var n = analyzeInput.value.length;
    charCountEl.textContent = n + ' character' + (n !== 1 ? 's' : '');
  });
}

document.addEventListener('keydown', function (e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    if (document.activeElement === analyzeInput) {
      e.preventDefault();
      runAnalysis();
    }
  }
});

function runAnalysis() {
  if (!analyzeInput) return;
  var text = analyzeInput.value.trim();
  if (!text) {
    analyzeInput.focus();
    pulseInput();
    return;
  }

  analyzeBtn.disabled = true;
  analyzeBtn.innerHTML = '<span class="btn-analyze-icon">' + ICONS.loading + '</span><span>Analyzing…</span>';

  showResult('loading', ICONS.loading, 'Analyzing… — Running TF-IDF + Logistic Regression', 0);

  var fd = new FormData();
  fd.append('message', text);

  fetch('/check', { method: 'POST', body: fd })
    .then(function (r) {
      if (!r.ok) throw new Error('Server error ' + r.status);
      return r.json();
    })
    .then(function (j) {
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = '<span class="btn-analyze-icon">' + ICONS.zap + '</span><span>Evaluate Text</span>';

      var type = j.is_spam ? 'spam' : 'ham';
      var icon = j.is_spam ? ICONS.spam : ICONS.ham;
      var sub = j.is_spam
        ? 'This message shows characteristics of spam.'
        : 'This message appears to be legitimate.';

      showResult(type, icon, j.label + ' — ' + sub, j.confidence);
    })
    .catch(function (err) {
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = '<span class="btn-analyze-icon">' + ICONS.zap + '</span><span>Evaluate Text</span>';
      showResult('error', ICONS.error, 'Error — Could not reach the server.', 0);
      console.error(err);
    });
}

function showResult(type, icon, labelText, confidence) {
  analyzeResult.style.display = 'flex';
  analyzeResult.className = 'analyzer-result';

  var resultIcon = document.getElementById('resultIcon');
  var resultLabel = document.getElementById('resultLabel');
  var resultSub = document.getElementById('resultSub');
  var resultConf = document.getElementById('resultConf');
  var resultBar = document.getElementById('resultBar');

  if (type === 'loading') {
    analyzeResult.classList.add('result-loading-style');
  } else if (type === 'error') {
    analyzeResult.classList.add('result-loading-style');
  } else if (type === 'spam') {
    analyzeResult.classList.add('result-spam-style');
  } else {
    analyzeResult.classList.add('result-ham-style');
  }

  resultBar.style.width = '0%';
  setTimeout(function () {
    resultBar.style.width = confidence + '%';
  }, 30);

  var parts = labelText.split(' — ');
  resultIcon.innerHTML = icon;
  resultLabel.textContent = parts[0] || labelText;
  resultSub.textContent = parts[1] || '';
  resultConf.textContent = type === 'loading' || type === 'error' ? '—' : confidence + '%';
}

function clearAnalyzer() {
  if (analyzeInput) {
    analyzeInput.value = '';
    charCountEl.textContent = '0 characters';
    analyzeInput.focus();
  }
  if (analyzeResult) {
    analyzeResult.style.display = 'none';
    analyzeResult.className = 'analyzer-result';
  }
}

function pulseInput() {
  analyzeInput.style.borderColor = 'var(--spam)';
  setTimeout(function () {
    analyzeInput.style.borderColor = '';
  }, 800);
}

function showDetail(index) {
  document.querySelectorAll('.email-card').forEach(function (c) {
    c.classList.remove('active-card');
  });
  var card = document.getElementById('card-' + index);
  if (card) card.classList.add('active-card');
  activeCardIndex = index;

  var d = EMAIL_DATA[index];
  if (!d) return;

  var isSpam = d.isSpam;
  var vClass = isSpam ? 'vs-spam' : 'vs-ham';
  var vIcon = isSpam ? ICONS.spam : ICONS.ham;
  var vLabel = isSpam ? 'Spam Detected' : 'Legitimate (Ham)';
  var vDesc = isSpam ? 'Flagged as spam by the ML model.'
    : 'Looks legitimate according to the model.';
  var fillCls = isSpam ? 'fill-spam' : 'fill-ham';

  document.getElementById('detailEmpty').style.display = 'none';
  var dc = document.getElementById('detailContent');
  dc.style.display = 'flex';

  dc.innerHTML =
    '<div class="detail-top">' +
    '<div class="detail-subject">' + esc(d.subject) + '</div>' +
    '<div class="detail-meta">' +
    '<div class="detail-meta-row"><span class="detail-meta-key">From</span><span class="detail-meta-val">' + esc(d.sender) + '</span></div>' +
    '<div class="detail-meta-row"><span class="detail-meta-key">Date</span><span class="detail-meta-val">' + esc(d.time) + '</span></div>' +
    '</div>' +
    '</div>' +

    '<div class="verdict-strip ' + vClass + '">' +
    '<div class="vs-left">' +
    '<div class="vs-icon">' + vIcon + '</div>' +
    '<div>' +
    '<div class="vs-label">' + vLabel + '</div>' +
    '<div class="vs-desc">' + vDesc + '</div>' +
    '</div>' +
    '</div>' +
    '<div class="vs-right">' +
    '<div class="vs-conf-num">100%</div>' +
    '</div>' +
    '</div>' +

    '<div class="detail-conf-bar">' +
    '<div class="dcb-label">CONFIDENCE SCORE</div>' +
    '<div class="dcb-track"><div class="dcb-fill ' + fillCls + '" id="dcbFill" style="width:0%"></div></div>' +
    '</div>' +

    '<div class="detail-body">' +
    '<div class="detail-msg-label">MESSAGE</div>' +
    '<div class="detail-msg-body">' + esc(d.text.replace(/^.*? /, '')) + '</div>' +
    '</div>';

  setTimeout(function () {
    var fill = document.getElementById('dcbFill');
    if (fill) fill.style.width = '100%';
  }, 50);
}

function searchEmails(query) {
  var q = query.toLowerCase().trim();
  document.querySelectorAll('.email-card').forEach(function (card) {
    var hay = (card.getAttribute('data-text') || '').toLowerCase();
    card.style.display = (hay.indexOf(q) !== -1 || q === '') ? '' : 'none';
  });
}

function filterEmails(type) {
  document.querySelectorAll('.email-card').forEach(function (card) {
    var isSpam = card.getAttribute('data-spam') === '1';
    if (type === 'all') card.style.display = '';
    else if (type === 'spam') card.style.display = isSpam ? '' : 'none';
    else if (type === 'ham') card.style.display = isSpam ? 'none' : '';
  });

  document.querySelectorAll('.sidebar-link').forEach(function (el) {
    el.classList.remove('active');
  });
  if (event && event.currentTarget) {
    event.currentTarget.classList.add('active');
  }

  document.getElementById('detailEmpty').style.display = 'flex';
  document.getElementById('detailContent').style.display = 'none';
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
