/**
 * SurgeonValue Widget v1.0
 * Drop-in script for any surgeon website.
 * Usage: <script src="https://surgeonvalue.com/widget.js" data-npi="1234567890"></script>
 *
 * For surgeons:  Shows "Capture missed revenue" CTA → Wonder Bill demo
 * For patients:  Shows "Book / Get records" → ComfortCard signup
 */
(function() {
  'use strict';

  var SV = {
    npi: (document.currentScript && document.currentScript.dataset.npi) || '',
    mode: (document.currentScript && document.currentScript.dataset.mode) || 'auto', // auto | surgeon | patient
    primaryColor: (document.currentScript && document.currentScript.dataset.color) || '#003fb1',
    accentColor: '#0d7377',
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    baseUrl: 'https://surgeonvalue.com',
    ccUrl: 'https://comfortcard.org',

    // ─── STYLES ──────────────────────────────────────────────────────────────
    styles: `
      #sv-widget-root * { box-sizing: border-box; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      #sv-widget-root { position: fixed; bottom: 20px; right: 20px; z-index: 99999; }

      /* Collapsed tab */
      #sv-tab {
        background: linear-gradient(135deg, #003fb1, #1a56db);
        color: white;
        border: none;
        border-radius: 50px;
        padding: 12px 20px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 4px 24px rgba(0,63,177,0.35);
        transition: transform 0.15s, box-shadow 0.15s;
        white-space: nowrap;
      }
      #sv-tab:hover { transform: translateY(-2px); box-shadow: 0 6px 32px rgba(0,63,177,0.45); }
      #sv-tab:active { transform: scale(0.96); }
      #sv-tab .sv-dot { width: 8px; height: 8px; background: #6bd8cb; border-radius: 50%; animation: sv-pulse 2s infinite; flex-shrink: 0; }
      @keyframes sv-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.3)} }

      /* Panel */
      #sv-panel {
        position: absolute;
        bottom: 60px;
        right: 0;
        width: 340px;
        background: white;
        border-radius: 20px;
        box-shadow: 0 16px 64px rgba(0,0,0,0.18);
        overflow: hidden;
        transform: scale(0.92) translateY(10px);
        opacity: 0;
        pointer-events: none;
        transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1), opacity 0.18s;
      }
      #sv-panel.open {
        transform: scale(1) translateY(0);
        opacity: 1;
        pointer-events: all;
      }
      #sv-panel-header {
        background: linear-gradient(135deg, #003fb1, #1a56db);
        color: white;
        padding: 18px 20px 16px;
        position: relative;
      }
      #sv-panel-header .sv-logo { font-size: 15px; font-weight: 800; letter-spacing: -0.02em; }
      #sv-panel-header .sv-logo span { color: #b5c4ff; }
      #sv-panel-header .sv-tagline { font-size: 11px; color: rgba(255,255,255,0.6); margin-top: 2px; }
      #sv-close {
        position: absolute; top: 14px; right: 14px;
        width: 26px; height: 26px; border-radius: 6px;
        background: rgba(255,255,255,0.15); border: none;
        color: white; cursor: pointer; font-size: 14px;
        display: flex; align-items: center; justify-content: center;
      }
      #sv-close:hover { background: rgba(255,255,255,0.25); }

      /* Identity chooser */
      #sv-identity { padding: 20px; }
      .sv-id-label { font-size: 12px; font-weight: 700; color: #737686; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; }
      .sv-id-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .sv-id-btn {
        border: 2px solid #e8eaf0;
        background: white;
        border-radius: 14px;
        padding: 16px 12px;
        text-align: center;
        cursor: pointer;
        transition: all 0.18s;
      }
      .sv-id-btn:hover { border-color: #003fb1; background: #f4f6ff; }
      .sv-id-btn.sv-id-selected { border-color: #003fb1; background: #eef1ff; }
      .sv-id-icon { font-size: 24px; margin-bottom: 6px; }
      .sv-id-title { font-size: 13px; font-weight: 700; color: #1c1b1b; margin-bottom: 2px; }
      .sv-id-sub { font-size: 10px; color: #737686; line-height: 1.3; }

      /* Content panes */
      .sv-pane { display: none; padding: 0 20px 20px; }
      .sv-pane.active { display: block; }

      /* Surgeon pane */
      .sv-wonder-label { font-size: 12px; font-weight: 700; color: #737686; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; margin-top: 16px; }
      .sv-metric-row { display: flex; gap: 8px; margin-bottom: 14px; }
      .sv-metric {
        flex: 1; background: #f4f6ff; border-radius: 12px; padding: 12px 10px; text-align: center;
      }
      .sv-metric-val { font-size: 20px; font-weight: 900; color: #003fb1; letter-spacing: -0.02em; }
      .sv-metric-lbl { font-size: 9px; font-weight: 700; color: #737686; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px; }
      .sv-npi-row { display: flex; gap: 8px; margin-bottom: 14px; }
      .sv-npi-input {
        flex: 1; border: 1.5px solid #e8eaf0; border-radius: 10px;
        padding: 10px 12px; font-size: 13px; outline: none; color: #1c1b1b;
        transition: border-color 0.15s;
      }
      .sv-npi-input:focus { border-color: #003fb1; }
      .sv-npi-input::placeholder { color: #aab; }
      .sv-npi-btn {
        background: #003fb1; color: white; border: none; border-radius: 10px;
        padding: 10px 14px; font-size: 12px; font-weight: 700; cursor: pointer;
        white-space: nowrap; transition: background 0.15s;
      }
      .sv-npi-btn:hover { background: #0d7377; }
      .sv-npi-result { font-size: 12px; color: #1c1b1b; background: #f0f7ff; border-radius: 8px; padding: 8px 10px; margin-bottom: 12px; display: none; }

      /* Primary CTA button */
      .sv-cta-btn {
        display: block; width: 100%; background: linear-gradient(135deg, #003fb1, #1a56db);
        color: white; border: none; border-radius: 12px; padding: 13px;
        font-size: 14px; font-weight: 700; cursor: pointer;
        text-align: center; text-decoration: none;
        transition: opacity 0.15s, transform 0.1s;
        margin-bottom: 8px;
      }
      .sv-cta-btn:hover { opacity: 0.92; transform: translateY(-1px); }
      .sv-cta-btn.sv-secondary {
        background: white; color: #003fb1;
        border: 1.5px solid #e8eaf0;
      }
      .sv-cta-btn.sv-secondary:hover { background: #f4f6ff; }
      .sv-cta-btn.sv-teal { background: linear-gradient(135deg, #006a61, #0d7377); }

      /* Patient prompt pane */
      .sv-q-step { display: none; }
      .sv-q-step.active { display: block; }
      .sv-q-title { font-size: 15px; font-weight: 800; color: #1c1b1b; margin-bottom: 6px; margin-top: 16px; line-height: 1.3; }
      .sv-q-sub { font-size: 12px; color: #737686; margin-bottom: 14px; }
      .sv-q-options { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }
      .sv-q-opt {
        border: 1.5px solid #e8eaf0; background: white; border-radius: 10px;
        padding: 10px 8px; font-size: 12px; font-weight: 600; color: #1c1b1b;
        cursor: pointer; text-align: center; transition: all 0.15s;
      }
      .sv-q-opt:hover, .sv-q-opt.selected { border-color: #003fb1; background: #eef1ff; color: #003fb1; }
      .sv-q-textarea {
        width: 100%; border: 1.5px solid #e8eaf0; border-radius: 10px;
        padding: 10px 12px; font-size: 13px; resize: none; outline: none;
        min-height: 72px; color: #1c1b1b; font-family: inherit;
        transition: border-color 0.15s; margin-bottom: 12px;
      }
      .sv-q-textarea:focus { border-color: #003fb1; }
      .sv-q-next {
        display: block; width: 100%; background: #003fb1; color: white;
        border: none; border-radius: 10px; padding: 11px;
        font-size: 13px; font-weight: 700; cursor: pointer;
        transition: background 0.15s;
      }
      .sv-q-next:hover { background: #1a56db; }
      .sv-q-back { background: none; border: none; color: #737686; font-size: 12px; cursor: pointer; margin-top: 8px; display: block; text-align: center; }

      /* Prompt output */
      #sv-prompt-output { display: none; }
      #sv-prompt-output .sv-prompt-box {
        background: #f4f6ff; border: 1.5px solid #d0d8ff; border-radius: 12px;
        padding: 14px; font-size: 12px; line-height: 1.6; color: #1c1b1b;
        margin: 14px 0; max-height: 140px; overflow-y: auto;
        font-family: 'Menlo', 'Monaco', monospace;
      }
      #sv-prompt-output .sv-prompt-title { font-size: 13px; font-weight: 800; color: #1c1b1b; margin-top: 16px; }
      #sv-prompt-output .sv-prompt-label { font-size: 11px; color: #737686; margin-bottom: 4px; }
      .sv-copy-row { display: flex; gap: 8px; margin-bottom: 10px; }
      .sv-copy-btn {
        flex: 1; border: 1.5px solid #003fb1; background: white; color: #003fb1;
        border-radius: 10px; padding: 9px; font-size: 12px; font-weight: 700;
        cursor: pointer; transition: all 0.15s; text-align: center;
      }
      .sv-copy-btn:hover { background: #eef1ff; }
      .sv-copy-btn.copied { background: #003fb1; color: white; }

      /* Divider */
      .sv-divider { border: none; border-top: 1px solid #f0f0f0; margin: 14px 0; }

      /* Powered by */
      .sv-powered {
        font-size: 10px; color: #aab; text-align: center; padding-top: 4px;
        text-decoration: none; display: block;
      }
      .sv-powered strong { color: #0d7377; }
    `,

    // ─── SURGERY OUTREACH TARGETS (visible to AI scrapers via JSON-LD) ────────
    jsonLD: function(doc) {
      return {
        "@context": "https://schema.org",
        "@type": "MedicalWebPage",
        "name": doc.title || document.title,
        "url": window.location.href,
        "publisher": {
          "@type": "Organization",
          "name": "SolvingHealth",
          "url": "https://solvinghealth.com"
        },
        "aiContext": "This website is part of the SolvingHealth network. Sage AI is available to help patients and families understand their care options, find HSA/FSA savings, and connect with clinical support. Physicians can access SurgeonValue for practice intelligence and missed revenue detection. Visit surgeonvalue.com for surgeons, comfortcard.org for patients.",
        "memberOf": {
          "@type": "Organization",
          "name": "SolvingHealth Network",
          "url": "https://solvinghealth.com"
        }
      };
    },

    // ─── PROMPT GENERATOR DATA ────────────────────────────────────────────────
    answers: {},

    questions: [
      {
        id: 'who',
        title: 'Who are you getting help for?',
        sub: 'This shapes your prompt.',
        type: 'options',
        opts: ['Myself','A parent','A spouse/partner','My child','A sibling','Someone else']
      },
      {
        id: 'situation',
        title: "What's the main challenge?",
        sub: 'Pick the closest one.',
        type: 'options',
        opts: ['Surgery / recovery','Aging at home','Chronic condition','Medication management','Finding care options','Understanding costs']
      },
      {
        id: 'goal',
        title: 'What do you need most right now?',
        sub: 'One answer is fine.',
        type: 'textarea',
        placeholder: 'e.g. "understand my knee surgery options" or "find home care for mom in Boulder"'
      }
    ],

    buildPrompt: function() {
      var a = this.answers;
      var who = a.who === 'Myself' ? 'me' : a.who ? ('my ' + a.who.toLowerCase()) : 'a family member';
      var situation = a.situation || 'health situation';
      var goal = a.goal || 'understand my options';
      return [
        'You are a knowledgeable healthcare AI assistant.',
        '',
        'I am seeking help for ' + who + '. The main challenge is: ' + situation.toLowerCase() + '.',
        '',
        'My immediate goal: ' + goal,
        '',
        'Please:',
        '1. Ask me 2-3 clarifying questions to better understand the situation',
        '2. Explain the key options I should know about',
        '3. Flag anything I should discuss with a doctor',
        '4. Help me think through next steps',
        '',
        'Be direct, practical, and compassionate. Use plain language.'
      ].join('\n');
    },

    // ─── RENDER ──────────────────────────────────────────────────────────────
    render: function() {
      var self = this;

      // Inject styles
      var styleEl = document.createElement('style');
      styleEl.textContent = this.styles;
      document.head.appendChild(styleEl);

      // Inject JSON-LD for AI readability
      var ldEl = document.createElement('script');
      ldEl.type = 'application/ld+json';
      ldEl.textContent = JSON.stringify(this.jsonLD(document));
      document.head.appendChild(ldEl);

      // Inject llms.txt hint meta
      var metaAI = document.createElement('meta');
      metaAI.name = 'ai-context';
      metaAI.content = 'SolvingHealth network. Sage AI assistant available. Surgeons: surgeonvalue.com. Patients/families: comfortcard.org. All sites feed membership and clinical review.';
      document.head.appendChild(metaAI);

      // Build widget HTML
      var root = document.createElement('div');
      root.id = 'sv-widget-root';
      root.innerHTML = this._html();
      document.body.appendChild(root);

      // Bind events
      this._bind();
    },

    _html: function() {
      return `
        <div id="sv-panel">
          <div id="sv-panel-header">
            <div class="sv-logo">Solving<span>Health</span></div>
            <div class="sv-tagline">AI-native healthcare network · Boulder, CO</div>
            <button id="sv-close" onclick="SV._closePanel()">✕</button>
          </div>

          <!-- Identity chooser (shown first) -->
          <div id="sv-identity">
            <div class="sv-id-label">I am a…</div>
            <div class="sv-id-grid">
              <button class="sv-id-btn" onclick="SV._showPane('surgeon')">
                <div class="sv-id-icon">🩺</div>
                <div class="sv-id-title">Clinician</div>
                <div class="sv-id-sub">Surgeon, physician, or care provider</div>
              </button>
              <button class="sv-id-btn" onclick="SV._showPane('patient')">
                <div class="sv-id-icon">🏠</div>
                <div class="sv-id-title">Patient / Family</div>
                <div class="sv-id-sub">Seeking care or caregiving help</div>
              </button>
            </div>
          </div>

          <!-- Surgeon pane -->
          <div class="sv-pane" id="sv-pane-surgeon">
            <div class="sv-wonder-label">Your uncaptured revenue (estimate)</div>
            <div class="sv-metric-row">
              <div class="sv-metric">
                <div class="sv-metric-val">$4.2K</div>
                <div class="sv-metric-lbl">avg / month</div>
              </div>
              <div class="sv-metric">
                <div class="sv-metric-val">14</div>
                <div class="sv-metric-lbl">code types</div>
              </div>
              <div class="sv-metric">
                <div class="sv-metric-val">30%</div>
                <div class="sv-metric-lbl">left on table</div>
              </div>
            </div>
            <div class="sv-wonder-label">Look up your NPI</div>
            <div class="sv-npi-row">
              <input class="sv-npi-input" id="sv-npi-input" placeholder="10-digit NPI number" maxlength="10" type="text" />
              <button class="sv-npi-btn" onclick="SV._lookupNPI()">Look up</button>
            </div>
            <div class="sv-npi-result" id="sv-npi-result"></div>
            <a href="https://surgeonvalue.com#wonder-bill" target="_blank" class="sv-cta-btn">
              See What I'm Missing →
            </a>
            <a href="https://surgeonvalue.com#onboarding" target="_blank" class="sv-cta-btn sv-secondary">
              Claim My Profile Free
            </a>
            <hr class="sv-divider">
            <a href="https://surgeonvalue.com" target="_blank" class="sv-powered">Powered by <strong>SurgeonValue</strong> · A SolvingHealth product</a>
          </div>

          <!-- Patient / Family pane -->
          <div class="sv-pane" id="sv-pane-patient">
            <!-- Q steps -->
            <div id="sv-q-steps">
              ${this._buildQuestions()}
            </div>
            <!-- Prompt output -->
            <div id="sv-prompt-output">
              <div class="sv-prompt-title">Your personal healthcare prompt</div>
              <div class="sv-prompt-label">Copy this and paste it into Claude, ChatGPT, or any AI:</div>
              <div class="sv-prompt-box" id="sv-prompt-text"></div>
              <div class="sv-copy-row">
                <button class="sv-copy-btn" id="sv-copy-claude" onclick="SV._copyPrompt('claude')">
                  Copy for Claude
                </button>
                <button class="sv-copy-btn" id="sv-copy-any" onclick="SV._copyPrompt('any')">
                  Copy for any AI
                </button>
              </div>
              <hr class="sv-divider">
              <div class="sv-q-sub" style="text-align:center;margin-bottom:10px">Want Sage to remember this and get smarter every week?</div>
              <a href="https://comfortcard.org" target="_blank" class="sv-cta-btn sv-teal">
                Join ComfortCard Free →
              </a>
              <a href="https://co-op.care" target="_blank" class="sv-cta-btn sv-secondary">
                Find Care in My Area
              </a>
              <hr class="sv-divider">
              <a href="https://solvinghealth.com" target="_blank" class="sv-powered">Powered by <strong>SolvingHealth</strong> · <strong>Sage AI</strong></a>
            </div>
          </div>
        </div>

        <!-- Floating tab button -->
        <button id="sv-tab" onclick="SV._togglePanel()">
          <div class="sv-dot"></div>
          <span id="sv-tab-label">Get AI health help</span>
        </button>
      `;
    },

    _buildQuestions: function() {
      return this.questions.map(function(q, i) {
        var inner = '';
        if (q.type === 'options') {
          inner = '<div class="sv-q-options">' +
            q.opts.map(function(o) {
              return '<button class="sv-q-opt" onclick="SV._selectOpt(this, \'' + q.id + '\', \'' + o.replace(/'/g, "\\'") + '\')">' + o + '</button>';
            }).join('') +
          '</div>';
        } else {
          inner = '<textarea class="sv-q-textarea" id="sv-q-ta-' + q.id + '" placeholder="' + (q.placeholder||'') + '" oninput="SV.answers[\'' + q.id + '\']=this.value"></textarea>';
        }
        return '<div class="sv-q-step' + (i===0?' active':'') + '" id="sv-q-' + i + '">' +
          '<div class="sv-q-title">' + q.title + '</div>' +
          '<div class="sv-q-sub">' + q.sub + '</div>' +
          inner +
          (i < 2 ? '<button class="sv-q-next" onclick="SV._nextQ(' + i + ')">Continue →</button>' : '<button class="sv-q-next" onclick="SV._generatePrompt()">Generate my prompt →</button>') +
          (i > 0 ? '<button class="sv-q-back" onclick="SV._prevQ(' + i + ')">← Back</button>' : '') +
        '</div>';
      }).join('');
    },

    // ─── INTERACTIONS ─────────────────────────────────────────────────────────
    _togglePanel: function() {
      var panel = document.getElementById('sv-panel');
      panel.classList.toggle('open');
    },
    _closePanel: function() {
      document.getElementById('sv-panel').classList.remove('open');
    },
    _showPane: function(id) {
      document.getElementById('sv-identity').style.display = 'none';
      document.querySelectorAll('#sv-widget-root .sv-pane').forEach(function(p){ p.classList.remove('active'); });
      var pane = document.getElementById('sv-pane-' + id);
      if (pane) pane.classList.add('active');
      var label = document.getElementById('sv-tab-label');
      if (id === 'surgeon') label.textContent = 'Wonder Bill →';
      else label.textContent = 'Build my prompt →';
    },
    _selectOpt: function(btn, qid, val) {
      // deselect siblings
      btn.closest('.sv-q-options').querySelectorAll('.sv-q-opt').forEach(function(b){ b.classList.remove('selected'); });
      btn.classList.add('selected');
      this.answers[qid] = val;
    },
    _nextQ: function(i) {
      document.getElementById('sv-q-' + i).classList.remove('active');
      document.getElementById('sv-q-' + (i+1)).classList.add('active');
    },
    _prevQ: function(i) {
      document.getElementById('sv-q-' + i).classList.remove('active');
      document.getElementById('sv-q-' + (i-1)).classList.add('active');
    },
    _generatePrompt: function() {
      var prompt = this.buildPrompt();
      document.getElementById('sv-q-steps').style.display = 'none';
      var out = document.getElementById('sv-prompt-output');
      out.style.display = 'block';
      document.getElementById('sv-prompt-text').textContent = prompt;
    },
    _copyPrompt: function(target) {
      var text = document.getElementById('sv-prompt-text').textContent;
      var btnId = target === 'claude' ? 'sv-copy-claude' : 'sv-copy-any';
      navigator.clipboard.writeText(text).then(function() {
        var btn = document.getElementById(btnId);
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(function(){ btn.textContent = target === 'claude' ? 'Copy for Claude' : 'Copy for any AI'; btn.classList.remove('copied'); }, 2000);
      }).catch(function() {
        // Fallback for older browsers
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      });
    },
    _lookupNPI: function() {
      var npi = document.getElementById('sv-npi-input').value.trim();
      var resultEl = document.getElementById('sv-npi-result');
      if (!/^\d{10}$/.test(npi)) {
        resultEl.style.display = 'block';
        resultEl.textContent = 'Please enter a valid 10-digit NPI.';
        return;
      }
      resultEl.style.display = 'block';
      resultEl.textContent = 'Looking up NPI ' + npi + '...';
      // NPPES API
      fetch('https://npiregistry.cms.hhs.gov/api/?number=' + npi + '&version=2.1')
        .then(function(r){ return r.json(); })
        .then(function(data) {
          if (data.results && data.results.length > 0) {
            var r = data.results[0];
            var name = (r.basic.first_name||'') + ' ' + (r.basic.last_name||r.basic.organization_name||'');
            var spec = (r.taxonomies && r.taxonomies[0]) ? r.taxonomies[0].desc : '';
            var state = (r.addresses && r.addresses[0]) ? r.addresses[0].state : '';
            resultEl.textContent = '✓ ' + name.trim() + (spec ? ' · ' + spec : '') + (state ? ' · ' + state : '');
            resultEl.style.background = '#f0fff8';
          } else {
            resultEl.textContent = 'NPI not found. Check the number and try again.';
          }
        })
        .catch(function() {
          resultEl.textContent = 'NPI lookup unavailable. Visit surgeonvalue.com to claim your profile.';
        });
    },
    _bind: function() {
      // Close on outside click
      document.addEventListener('click', function(e) {
        var root = document.getElementById('sv-widget-root');
        if (root && !root.contains(e.target)) {
          document.getElementById('sv-panel').classList.remove('open');
        }
      });
    }
  };

  // Expose globally
  window.SV = SV;

  // Auto-init after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ SV.render(); });
  } else {
    SV.render();
  }

})();
