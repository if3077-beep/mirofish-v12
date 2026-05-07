/**
 * MiroFish v13 - 主应用
 * 适配新叙事引擎 + 氛围音效 + 渐进揭示
 */

(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const engine = new PredictionEngine();

  const AudioFX = {
    click: () => audioSystem.play('click'),
    whoosh: () => audioSystem.play('transition'),
    success: () => audioSystem.play('success'),
    pop: () => audioSystem.play('expand'),
    tick: () => audioSystem.play('type'),
    empathy: () => audioSystem.play('empathy'),
    reveal: () => audioSystem.play('reveal'),
    sparkle: () => audioSystem.play('sparkle'),
    slide: () => audioSystem.play('slide'),
    complete: () => audioSystem.play('complete'),
  };

  let state = {
    text: '',
    mood: 'neutral',
    persona: 'brutal',
    scope: 1,
    intensity: 3,
    timeScale: 3,
    uncertainty: 3,
    factors: [],
    mbtiPrefs: {},
    result: null,
  };

  // ===== 粒子背景 =====
  function initParticles() {
    const canvas = $('#bgCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, particles = [];

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }

    function createParticles() {
      particles = [];
      const count = Math.floor((w * h) / 12000);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 2 + 0.5,
          dx: (Math.random() - 0.5) * 0.4,
          dy: (Math.random() - 0.5) * 0.4,
          pulse: Math.random() * Math.PI * 2,
          pulseSpeed: Math.random() * 0.02 + 0.005,
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.dx;
        p.y += p.dy;
        p.pulse += p.pulseSpeed;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        const alpha = 0.3 + Math.sin(p.pulse) * 0.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(120,140,255,${alpha})`;
        ctx.fill();
      }
      requestAnimationFrame(draw);
    }

    resize();
    createParticles();
    draw();
    window.addEventListener('resize', () => { resize(); createParticles(); });
  }

  // ===== 撒花效果 =====
  function spawnConfetti(x, y) {
    const emojis = ['✨', '🎉', '⭐', '💫', '🌟', '🎊'];
    for (let i = 0; i < 6; i++) {
      const el = document.createElement('div');
      el.className = 'confetti';
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      el.style.left = (x + (Math.random() - 0.5) * 60) + 'px';
      el.style.top = y + 'px';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1500);
    }
    AudioFX.sparkle();
  }

  // ===== Toast =====
  function showToast(msg) {
    let toast = $('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  // ===== 每日名言 =====
  function showDailyQuote() {
    const quote = DAILY_QUOTES[Math.floor(Math.random() * DAILY_QUOTES.length)];
    const textEl = $('#inspirationText');
    const authorEl = $('#inspirationAuthor');
    if (textEl) textEl.textContent = quote.text;
    if (authorEl) authorEl.textContent = '—— ' + quote.author;
  }

  // ===== Phase 导航 =====
  function goToPhase(id) {
    $$('.phase').forEach(p => p.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ===== Phase 1: Input =====
  function initInput() {
    $$('.scene-card').forEach(card => {
      card.addEventListener('click', () => {
        AudioFX.click();
        const text = card.dataset.text;
        const mood = card.dataset.mood;
        $('#userInput').value = text;
        state.text = text;
        state.mood = mood;
        updateMoodChips(mood);
        updateNextBtn();
        spawnConfetti(card.getBoundingClientRect().x + 65, card.getBoundingClientRect().y);
      });
    });

    $$('.mood-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        AudioFX.click();
        state.mood = chip.dataset.mood;
        updateMoodChips(chip.dataset.mood);
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        const rect = chip.getBoundingClientRect();
        ripple.style.left = (e.clientX - rect.left) + 'px';
        ripple.style.top = (e.clientY - rect.top) + 'px';
        ripple.style.width = ripple.style.height = '40px';
        chip.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
      });
    });

    $('#userInput').addEventListener('input', () => {
      state.text = $('#userInput').value.trim();
      updateNextBtn();
    });

    $('#btnNext').addEventListener('click', () => {
      if (!state.text) return;
      AudioFX.whoosh();
      goToPhase('phaseCalibrate');
      initCalibrate();
    });
  }

  function updateMoodChips(mood) {
    $$('.mood-chip').forEach(c => c.classList.toggle('selected', c.dataset.mood === mood));
  }

  function updateNextBtn() {
    const btn = $('#btnNext');
    if (btn) btn.disabled = !state.text;
  }

  // ===== Phase 2: Calibrate =====
  function initCalibrate() {
    const keywords = engine.extractKeywords(state.text);
    const cloud = $('#keywordCloud');
    if (cloud) {
      cloud.innerHTML = keywords.map(k =>
        k.words.map(w => `<span class="keyword-tag">${k.icon} ${w}</span>`).join('')
      ).join('');
    }

    initMBTIPref();

    $$('.persona-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        AudioFX.click();
        $$('.persona-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.persona = btn.dataset.persona;
      });
    });

    const sliders = [
      { id: 'slScope', valId: 'valScope', labels: SCOPE_LABELS, key: 'scope' },
      { id: 'slIntensity', valId: 'valIntensity', labels: INTENSITY_LABELS, key: 'intensity' },
      { id: 'slTime', valId: 'valTime', labels: TIME_LABELS, key: 'timeScale' },
      { id: 'slUncertainty', valId: 'valUncertainty', labels: UNCERTAINTY_LABELS, key: 'uncertainty' },
    ];
    sliders.forEach(s => {
      const el = document.getElementById(s.id);
      const valEl = document.getElementById(s.valId);
      if (!el) return;
      el.value = state[s.key];
      if (valEl) valEl.textContent = s.labels[state[s.key]] || '';
      el.addEventListener('input', () => {
        state[s.key] = parseInt(el.value);
        if (valEl) valEl.textContent = s.labels[el.value] || '';
        AudioFX.slide();
      });
    });

    $$('.factor-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        AudioFX.pop();
        const f = chip.dataset.factor;
        const wasSelected = state.factors.includes(f);
        if (wasSelected) {
          state.factors = state.factors.filter(x => x !== f);
          chip.classList.remove('selected');
        } else {
          state.factors.push(f);
          chip.classList.add('selected');
          spawnConfetti(e.clientX, e.clientY);
          showFactorFeedback(f);
        }
      });
    });

    $('#btnStart').addEventListener('click', startSimulation);
    $('#btnBack').addEventListener('click', () => {
      AudioFX.click();
      goToPhase('phaseInput');
    });
  }

  // ===== MBTI 预选 =====
  function initMBTIPref() {
    const container = $('#mbtiPref');
    if (!container) return;

    state.mbtiPrefs = {};

    container.innerHTML = `
      <div class="mbti-pref-title">先告诉我们你的性格偏好</div>
      <div class="mbti-pref-sub">这会让我们更准确地分析你（可跳过）</div>
      ${MBTI_QUESTIONS.map((q) => `
        <div class="mbti-question" data-dim="${q.dim}">
          <div class="mbti-q-text">${q.question}</div>
          <div class="mbti-q-options">
            <button class="mbti-q-btn" data-value="${q.optionA.value}" data-dim="${q.dim}">
              <span class="q-icon">${q.optionA.icon}</span>
              <span class="q-label">${q.optionA.label}</span>
              <span class="q-check">✓</span>
            </button>
            <button class="mbti-q-btn" data-value="${q.optionB.value}" data-dim="${q.dim}">
              <span class="q-icon">${q.optionB.icon}</span>
              <span class="q-label">${q.optionB.label}</span>
              <span class="q-check">✓</span>
            </button>
          </div>
        </div>
      `).join('')}
      <div class="mbti-pref-result" id="mbtiPrefResult" style="display:none">
        <div class="mbti-pref-type" id="mbtiPrefType"></div>
        <div class="mbti-pref-note">这只是初步判断，推演时会结合你的文字进一步分析</div>
      </div>
    `;

    container.querySelectorAll('.mbti-q-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        AudioFX.click();
        const dim = btn.dataset.dim;
        const value = btn.dataset.value;
        container.querySelectorAll(`.mbti-q-btn[data-dim="${dim}"]`).forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.mbtiPrefs[dim] = value;
        spawnConfetti(e.clientX, e.clientY);
        updateMBTIPrefResult();
      });
    });
  }

  function updateMBTIPrefResult() {
    const prefs = state.mbtiPrefs;
    const resultEl = $('#mbtiPrefResult');
    const typeEl = $('#mbtiPrefType');
    if (!resultEl || !typeEl) return;

    const dims = ['EI', 'SN', 'TF', 'JP'];
    const filled = dims.filter(d => prefs[d]);
    if (filled.length >= 2) {
      const type = (prefs.EI || '?') + (prefs.SN || '?') + (prefs.TF || '?') + (prefs.JP || '?');
      typeEl.textContent = type;
      resultEl.style.display = '';
    }
  }

  // ===== 因素反馈 =====
  function showFactorFeedback(factor) {
    const feedbackContainer = $('#factorFeedback');
    if (!feedbackContainer) return;

    const feedbackTexts = {
      media: '社交媒体会放大你的情绪波动',
      authority: '权威人物的意见可能会影响你的判断',
      peer: '同辈压力可能让你做出不是自己真正想要的选择',
      money: '经济因素会限制你的选择空间',
      time: '时间紧迫会让你更难理性思考',
      reputation: '面子问题可能会绑架你的决策',
      health: '身体状况是一切的基础',
      family: '家庭的期望和你的想法可能会有冲突',
    };

    const text = feedbackTexts[factor] || '这个因素会影响你的推演结果';
    feedbackContainer.innerHTML = `<span class="factor-feedback-icon">⚡</span>${text}`;
    feedbackContainer.style.display = '';

    setTimeout(() => {
      feedbackContainer.style.display = 'none';
    }, 3000);
  }

  // ===== Phase 3: Simulate =====
  async function startSimulation() {
    AudioFX.whoosh();
    goToPhase('phaseSimulate');

    // 启动氛围音效
    audioSystem.startAmbient(state.mood);

    const progressBar = $('#simProgressBar');
    const stepsEl = $('#simSteps');
    const insightsEl = $('#loadingInsights');
    const empathyEl = $('#empathyText');

    if (progressBar) progressBar.style.width = '0%';
    if (stepsEl) stepsEl.innerHTML = '';
    if (insightsEl) insightsEl.innerHTML = '';

    let insightIdx = 0;
    const insightTimer = setInterval(() => {
      if (!insightsEl) return;
      const item = LOADING_INSIGHTS[insightIdx % LOADING_INSIGHTS.length];
      insightsEl.innerHTML = `<div class="insight-item"><span class="insight-icon">${item.icon}</span><span>${item.text}</span></div>`;
      insightIdx++;
    }, 2500);

    if (insightsEl && LOADING_INSIGHTS.length) {
      const item = LOADING_INSIGHTS[0];
      insightsEl.innerHTML = `<div class="insight-item"><span class="insight-icon">${item.icon}</span><span>${item.text}</span></div>`;
    }

    try {
      const result = await engine.run(
        state.text, state.mood, state.scope, state.intensity,
        state.timeScale, state.uncertainty, state.factors, state.persona,
        state.mbtiPrefs,
        (stepType, msg, pct) => {
          if (progressBar) progressBar.style.width = pct + '%';
          if (stepsEl) {
            const div = document.createElement('div');
            div.className = 'sim-step';
            div.innerHTML = `<span class="sim-step-dot"></span><span>${msg}</span>`;
            stepsEl.appendChild(div);
          }
          if (stepType === 'empathy') AudioFX.empathy();
          if (stepType === 'complete') AudioFX.complete();
        }
      );

      clearInterval(insightTimer);
      audioSystem.stopAmbient();
      state.result = result;

      if (empathyEl) {
        empathyEl.textContent = '';
        typewriterEffect(empathyEl, result.empathy, 25);
      }

      await delay(1800);
      showResult(result);
    } catch (e) {
      clearInterval(insightTimer);
      audioSystem.stopAmbient();
      console.error('Simulation error:', e);
    }
  }

  // ===== Phase 4: Result =====
  function showResult(result) {
    AudioFX.success();
    goToPhase('phaseResult');

    const personaIcon = PERSONAS[state.persona]?.icon || '🔥';
    const personaResultIcon = $('#personaResultIcon');
    if (personaResultIcon) personaResultIcon.textContent = personaIcon;

    const empathyBubble = $('#empathyBubble');
    if (empathyBubble) {
      empathyBubble.textContent = '';
      typewriterEffect(empathyBubble, result.empathy, 25);
    }

    // MBTI 卡片
    const mbti = result.mbti;
    if (mbti) {
      const mbtiCard = $('#mbtiCard');
      if (mbtiCard) mbtiCard.style.display = '';

      const mbtiType = $('#mbtiType');
      if (mbtiType) mbtiType.textContent = mbti.type;

      const mbtiConfidence = $('#mbtiConfidence');
      if (mbtiConfidence) mbtiConfidence.textContent = `置信度 ${mbti.confidence}%`;

      const mbtiBars = $('#mbtiBars');
      if (mbtiBars) {
        const dims = [['E', 'I'], ['S', 'N'], ['T', 'F'], ['J', 'P']];
        mbtiBars.innerHTML = dims.map(([a, b]) => {
          const scoreA = mbti.scores[a] || 0;
          const scoreB = mbti.scores[b] || 0;
          const total = scoreA + scoreB || 1;
          const pctA = Math.round((scoreA / total) * 100);
          const chosen = scoreA >= scoreB ? a : b;
          const dimA = MBTI_DIMENSIONS[a];
          const dimB = MBTI_DIMENSIONS[b];
          return `<div class="mbti-bar">
            <span class="mbti-bar-label">${dimA.label}</span>
            <div class="mbti-bar-track"><div class="mbti-bar-fill" style="width:${pctA}%"></div></div>
            <span class="mbti-bar-label">${dimB.label}</span>
            <span class="mbti-bar-chosen">${chosen}</span>
          </div>`;
        }).join('');
      }

      const mbtiStyle = $('#mbtiStyle');
      if (mbtiStyle && mbti.style) {
        mbtiStyle.innerHTML = `<div class="mbti-style-item"><strong>视角：</strong>${mbti.style.approach}</div>
          <div class="mbti-style-item"><strong>语气：</strong>${mbti.style.tone}</div>
          <div class="mbti-style-item"><strong>建议方式：</strong>${mbti.style.advice}</div>`;
      }
    }

    // 概率数字
    animateNumber($('#probOptimistic'), result.optimistic.probability, 1200, '%');
    animateNumber($('#probNeutral'), result.neutral.probability, 1200, '%');
    animateNumber($('#probPessimistic'), result.pessimistic.probability, 1200, '%');

    const probOptLabel = $('#probOptLabel');
    const probNeuLabel = $('#probNeuLabel');
    const probPesLabel = $('#probPesLabel');
    if (probOptLabel) probOptLabel.textContent = result.optimistic.probability + '%';
    if (probNeuLabel) probNeuLabel.textContent = result.neutral.probability + '%';
    if (probPesLabel) probPesLabel.textContent = result.pessimistic.probability + '%';

    // 三条路径（渐进揭示）
    renderPath('pathOptimistic', result.optimistic);
    renderPath('pathNeutral', result.neutral);
    renderPath('pathPessimistic', result.pessimistic);

    // 三件烂事
    const badList = $('#badThingsList');
    if (badList) {
      badList.innerHTML = result.badThings.map(b =>
        `<div class="bad-thing-item"><span class="bad-thing-icon">${b.icon}</span><span>${b.event}</span></div>`
      ).join('');
    }

    // 统计数据
    const statsGrid = $('#statsGrid');
    if (statsGrid) {
      statsGrid.innerHTML = result.stats.map(s =>
        `<div class="stat-card">
          <div class="stat-value">${s.value}</div>
          <div class="stat-label">${s.label}</div>
          <div class="stat-desc">${s.desc}</div>
          <div class="stat-source">${s.source}</div>
        </div>`
      ).join('');
    }

    // 延伸阅读
    const readingCards = $('#readingCards');
    if (readingCards) {
      readingCards.innerHTML = result.readingCards.map(c =>
        `<div class="reading-card">
          <div class="reading-header"><span class="reading-icon">${c.icon}</span><span class="reading-title">${c.title}</span></div>
          <div class="reading-content">${c.content}</div>
          ${c.source ? `<div class="reading-source">—— ${c.source}</div>` : ''}
        </div>`
      ).join('');
    }

    // 投票
    initPoll(result.poll);

    // Emoji 合成器
    initEmojiComposer();

    // 评分
    initRating();

    // 操作按钮
    initActions();

    // 滚动动画
    setupScrollReveal();
  }

  function renderPath(containerId, pathData) {
    const el = document.getElementById(containerId);
    if (!el) return;

    let factorNoteHTML = '';
    if (pathData.factorNote) {
      factorNoteHTML = `<div class="path-factor-note">${pathData.factorNote}</div>`;
    }

    let echoHTML = '';
    if (pathData.echo) {
      echoHTML = `<div class="path-echo">💡 ${pathData.echo}</div>`;
    }

    el.innerHTML = `
      <div class="path-title">${pathData.title}</div>
      ${pathData.opening ? `<div class="path-opening">${pathData.opening}</div>` : ''}
      <div class="path-turning-points">
        ${pathData.turning_points.map(tp =>
      `<div class="tp-item"><span class="tp-period">${tp.period}</span><span class="tp-event">${tp.event}</span></div>`
    ).join('')}
      </div>
      ${pathData.closing ? `<div class="path-closing">${pathData.closing}</div>` : ''}
      <div class="path-cost"><strong>代价：</strong>${pathData.you_lose}</div>
      <div class="path-nothing"><strong>不行动：</strong>${pathData.cost_of_nothing}</div>
      ${echoHTML}
      ${factorNoteHTML}
    `;
  }

  // ===== 投票 =====
  function initPoll(pollData) {
    let voted = false;
    $$('.poll-option').forEach(opt => {
      opt.addEventListener('click', () => {
        if (voted) return;
        voted = true;
        AudioFX.pop();
        $$('.poll-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');

        const total = pollData.optimistic + pollData.neutral + pollData.pessimistic;
        const pctO = Math.round((pollData.optimistic / total) * 100);
        const pctN = Math.round((pollData.neutral / total) * 100);
        const pctP = 100 - pctO - pctN;

        setTimeout(() => {
          const pollResult = $('#pollResult');
          if (pollResult) pollResult.classList.add('show');
          $('#pollBarOpt').style.width = pctO + '%';
          $('#pollBarNeu').style.width = pctN + '%';
          $('#pollBarPes').style.width = pctP + '%';
          $('#pollPctOpt').textContent = pctO + '%';
          $('#pollPctNeu').textContent = pctN + '%';
          $('#pollPctPes').textContent = pctP + '%';
          const count = Math.floor(Math.random() * 500) + 200;
          const votedCount = $('#pollVotedCount');
          if (votedCount) votedCount.textContent = `已有 ${count} 人参与投票`;
        }, 300);
      });
    });
  }

  // ===== Emoji 合成器 =====
  function initEmojiComposer() {
    const canvas = $('#emojiCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const W = 600, H = 600;
    canvas.width = W;
    canvas.height = H;

    let items = [];
    let dragging = null;
    let dragOff = { x: 0, y: 0 };
    let selectedIdx = -1;
    let lastTapTime = 0;

    const allCategories = Object.keys(EMOJI_KEYWORDS);
    const paletteTabs = $('#emojiPaletteTabs');
    const paletteGrid = $('#emojiPaletteGrid');

    if (paletteTabs) {
      paletteTabs.innerHTML = allCategories.map((cat, i) =>
        `<button class="emoji-palette-tab ${i === 0 ? 'active' : ''}" data-cat="${cat}">${cat}</button>`
      ).join('');
    }

    function showCategory(cat) {
      if (!paletteGrid) return;
      const emojis = EMOJI_KEYWORDS[cat] || [];
      paletteGrid.innerHTML = emojis.map(e =>
        `<button class="emoji-palette-item" data-emoji="${e}">${e}</button>`
      ).join('');
      $$('.emoji-palette-item').forEach(btn => {
        btn.addEventListener('click', () => {
          AudioFX.pop();
          addEmoji(btn.dataset.emoji);
        });
      });
    }

    showCategory(allCategories[0]);

    if (paletteTabs) {
      paletteTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.emoji-palette-tab');
        if (!tab) return;
        AudioFX.click();
        $$('.emoji-palette-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        showCategory(tab.dataset.cat);
      });
    }

    function addEmoji(emoji) {
      items.push({
        emoji,
        x: W / 2 + (Math.random() - 0.5) * 200,
        y: H / 2 + (Math.random() - 0.5) * 200,
        size: 48 + Math.random() * 24,
      });
      selectedIdx = items.length - 1;
      draw();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(0, 0, W, H);

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        ctx.font = `${it.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(it.emoji, it.x, it.y);

        if (i === selectedIdx) {
          const r = it.size * 0.6;
          ctx.strokeStyle = 'rgba(100,120,255,0.6)';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(it.x - r, it.y - r, r * 2, r * 2);
          ctx.setLineDash([]);

          ctx.fillStyle = 'rgba(100,120,255,0.8)';
          ctx.font = '12px sans-serif';
          ctx.fillText(`${Math.round(it.size)}px`, it.x, it.y + r + 14);
        }
      }
    }

    function getCanvasPos(e) {
      const rect = canvas.getBoundingClientRect();
      const sx = W / rect.width;
      const sy = H / rect.height;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * sx,
        y: (clientY - rect.top) * sy,
      };
    }

    function hitTest(mx, my) {
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        const r = it.size * 0.55;
        if (Math.abs(mx - it.x) < r && Math.abs(my - it.y) < r) return i;
      }
      return -1;
    }

    canvas.addEventListener('mousedown', (e) => {
      const pos = getCanvasPos(e);
      const idx = hitTest(pos.x, pos.y);
      if (idx >= 0) {
        dragging = idx;
        selectedIdx = idx;
        dragOff = { x: pos.x - items[idx].x, y: pos.y - items[idx].y };
        draw();
      } else {
        selectedIdx = -1;
        draw();
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      if (dragging === null) return;
      const pos = getCanvasPos(e);
      items[dragging].x = pos.x - dragOff.x;
      items[dragging].y = pos.y - dragOff.y;
      draw();
    });

    canvas.addEventListener('mouseup', () => { dragging = null; });
    canvas.addEventListener('mouseleave', () => { dragging = null; });

    canvas.addEventListener('dblclick', (e) => {
      const pos = getCanvasPos(e);
      const idx = hitTest(pos.x, pos.y);
      if (idx >= 0) {
        items.splice(idx, 1);
        selectedIdx = -1;
        AudioFX.click();
        draw();
      }
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const pos = getCanvasPos(e);
      const idx = hitTest(pos.x, pos.y);
      if (idx >= 0) {
        const it = items[idx];
        const delta = e.deltaY > 0 ? -4 : 4;
        it.size = Math.max(16, Math.min(120, it.size + delta));
        selectedIdx = idx;
        AudioFX.tick();
        draw();
      }
    }, { passive: false });

    let touchStartDist = 0;
    let touchStartSize = 0;
    let touchIdx = -1;

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const now = Date.now();

      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartDist = Math.sqrt(dx * dx + dy * dy);
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const rect = canvas.getBoundingClientRect();
        const mx = (midX - rect.left) * (W / rect.width);
        const my = (midY - rect.top) * (H / rect.height);
        touchIdx = hitTest(mx, my);
        if (touchIdx >= 0) {
          touchStartSize = items[touchIdx].size;
        }
        return;
      }

      const pos = getCanvasPos(e);
      const idx = hitTest(pos.x, pos.y);

      if (now - lastTapTime < 300 && idx >= 0) {
        items.splice(idx, 1);
        selectedIdx = -1;
        lastTapTime = 0;
        AudioFX.click();
        draw();
        return;
      }
      lastTapTime = now;

      if (idx >= 0) {
        dragging = idx;
        selectedIdx = idx;
        dragOff = { x: pos.x - items[idx].x, y: pos.y - items[idx].y };
        draw();
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();

      if (e.touches.length === 2 && touchIdx >= 0) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const scale = dist / touchStartDist;
        items[touchIdx].size = Math.max(16, Math.min(120, touchStartSize * scale));
        selectedIdx = touchIdx;
        draw();
        return;
      }

      if (dragging === null || e.touches.length !== 1) return;
      const rect = canvas.getBoundingClientRect();
      const sx = W / rect.width;
      const sy = H / rect.height;
      const touch = e.touches[0];
      items[dragging].x = (touch.clientX - rect.left) * sx - dragOff.x;
      items[dragging].y = (touch.clientY - rect.top) * sy - dragOff.y;
      draw();
    }, { passive: false });

    canvas.addEventListener('touchend', () => { dragging = null; touchIdx = -1; });

    document.addEventListener('keydown', (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIdx >= 0) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        items.splice(selectedIdx, 1);
        selectedIdx = -1;
        AudioFX.click();
        draw();
      }
    });

    const btnGenerate = $('#btnEmojiGenerate');
    if (btnGenerate) {
      btnGenerate.addEventListener('click', () => {
        AudioFX.pop();
        const input = $('#emojiKeywordInput');
        const keyword = input ? input.value.trim() : '';
        if (!keyword) { showToast('请输入关键词'); return; }
        let matched = [];
        for (const [key, emojis] of Object.entries(EMOJI_KEYWORDS)) {
          if (key.includes(keyword) || keyword.includes(key)) {
            matched = matched.concat(emojis);
          }
        }
        if (matched.length === 0) {
          const cats = Object.values(EMOJI_KEYWORDS);
          matched = cats[Math.floor(Math.random() * cats.length)];
        }
        const count = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
          addEmoji(matched[Math.floor(Math.random() * matched.length)]);
        }
      });
    }

    const btnRandom = $('#btnEmojiRandom');
    if (btnRandom) {
      btnRandom.addEventListener('click', () => {
        AudioFX.pop();
        const allEmojis = Object.values(EMOJI_KEYWORDS).flat();
        const count = 4 + Math.floor(Math.random() * 4);
        for (let i = 0; i < count; i++) {
          addEmoji(allEmojis[Math.floor(Math.random() * allEmojis.length)]);
        }
      });
    }

    const btnClear = $('#btnEmojiClear');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        AudioFX.click();
        items = [];
        selectedIdx = -1;
        draw();
      });
    }

    const btnUndo = $('#btnUndo');
    if (btnUndo) {
      btnUndo.addEventListener('click', () => {
        if (items.length === 0) return;
        AudioFX.click();
        items.pop();
        selectedIdx = -1;
        draw();
      });
    }

    draw();
  }

  // ===== 评分 =====
  function initRating() {
    let rated = false;
    let currentRating = 0;
    $$('.rating-star').forEach(star => {
      star.addEventListener('click', (e) => {
        if (rated) return;
        AudioFX.pop();
        currentRating = parseInt(star.dataset.rating);
        $$('.rating-star').forEach((s, i) => {
          s.classList.toggle('active', i < currentRating);
        });
        spawnConfetti(e.clientX, e.clientY);
      });
    });

    const btnSubmit = $('#btnRatingSubmit');
    if (btnSubmit) {
      btnSubmit.addEventListener('click', () => {
        if (rated || currentRating === 0) return;
        rated = true;
        AudioFX.success();
        const thanks = $('#ratingThanks');
        if (thanks) thanks.classList.add('visible');
        btnSubmit.disabled = true;
        showToast('感谢你的反馈！');
      });
    }
  }

  // ===== 操作按钮 =====
  function initActions() {
    const btnExport = $('#btnExport');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        AudioFX.click();
        window.print();
      });
    }

    const btnShare = $('#btnShare');
    if (btnShare) {
      btnShare.addEventListener('click', () => {
        AudioFX.click();
        const r = state.result;
        if (!r) return;
        const mbti = r.mbti;
        const text = `MiroFish 推演结果\n` +
          `性格类型：${mbti.type}（${mbti.style.approach}）\n` +
          `领域：${r.domain}\n` +
          `共情：${r.empathy}\n\n` +
          `🌅 乐观路径（${r.optimistic.probability}%）：${r.optimistic.title}\n` +
          `🌊 中性路径（${r.neutral.probability}%）：${r.neutral.title}\n` +
          `🌧️ 悲观路径（${r.pessimistic.probability}%）：${r.pessimistic.title}\n\n` +
          `来自 MiroFish v13`;
        navigator.clipboard.writeText(text).then(() => {
          btnShare.querySelector('span').textContent = '✅ 已复制';
          showToast('已复制到剪贴板');
          setTimeout(() => {
            btnShare.querySelector('span').textContent = '📋 复制摘要';
          }, 2000);
        });
      });
    }

    const btnNew = $('#btnNew');
    if (btnNew) {
      btnNew.addEventListener('click', () => {
        AudioFX.whoosh();
        state.text = '';
        state.result = null;
        state.mbtiPrefs = {};
        $('#userInput').value = '';
        updateNextBtn();
        goToPhase('phaseInput');
        showDailyQuote();
      });
    }
  }

  // ===== 工具函数 =====
  function typewriterEffect(element, text, speed = 30) {
    if (!element || !text) return;
    element.textContent = '';
    let i = 0;
    function type() {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
        setTimeout(type, speed);
      }
    }
    type();
  }

  function animateNumber(element, target, duration = 1200, suffix = '') {
    if (!element) return;
    const start = performance.now();
    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = Math.round(target * eased) + suffix;
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  function setupScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    $$('.reveal, .reveal-left, .reveal-scale, .stagger').forEach(el => {
      observer.observe(el);
    });
  }

  function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ===== 初始化 =====
  function init() {
    initParticles();
    showDailyQuote();
    initInput();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
