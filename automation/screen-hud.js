/**
 * BioTailr AI - Autonomous Screen Agent HUD (Heads-Up Display)
 * Floating on-screen agent interface for live visual monitoring & control.
 * Observes the browser screen in real-time, displays agent reasoning, and allows 1-click control.
 */

(function() {
  if (typeof window === 'undefined') return;
  if (window.__biotailr_hud_loaded) return;
  window.__biotailr_hud_loaded = true;

  class BioTailrScreenHUD {
    constructor() {
      this.container = null;
      this.isExpanded = false;
      this.isRunning = false;
      this.init();
    }

    init() {
      if (document.getElementById('biotailr-agent-hud')) return;

      const host = document.createElement('div');
      host.id = 'biotailr-agent-hud';
      host.innerHTML = `
        <style>
          #biotailr-agent-hud {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 9999999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            user-select: none;
          }
          .bt-hud-pill {
            display: flex;
            align-items: center;
            gap: 10px;
            background: rgba(15, 23, 42, 0.92);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(13, 148, 136, 0.4);
            border-radius: 9999px;
            padding: 8px 16px;
            color: #ffffff;
            font-size: 13px;
            font-weight: 600;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(13, 148, 136, 0.3);
            cursor: pointer;
            transition: all 0.25s ease;
          }
          .bt-hud-pill:hover {
            transform: translateY(-2px);
            border-color: rgba(13, 148, 136, 0.8);
            box-shadow: 0 14px 28px -5px rgba(0, 0, 0, 0.6), 0 0 20px rgba(13, 148, 136, 0.5);
          }
          .bt-pulse-dot {
            width: 9px;
            height: 9px;
            background: #10b981;
            border-radius: 50%;
            box-shadow: 0 0 8px #10b981;
            animation: bt-pulse 1.8s infinite;
          }
          .bt-pulse-dot.working {
            background: #38bdf8;
            box-shadow: 0 0 8px #38bdf8;
          }
          @keyframes bt-pulse {
            0% { transform: scale(0.95); opacity: 0.8; }
            50% { transform: scale(1.25); opacity: 1; }
            100% { transform: scale(0.95); opacity: 0.8; }
          }
          .bt-hud-panel {
            display: none;
            flex-direction: column;
            width: 360px;
            background: rgba(15, 23, 42, 0.96);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(13, 148, 136, 0.35);
            border-radius: 16px;
            box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.7), 0 0 25px rgba(13, 148, 136, 0.2);
            overflow: hidden;
            margin-bottom: 12px;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .bt-hud-panel.open {
            display: flex;
          }
          .bt-hud-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: rgba(30, 41, 59, 0.6);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          }
          .bt-hud-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            font-weight: 700;
            color: #f8fafc;
            letter-spacing: 0.3px;
          }
          .bt-hud-badge {
            font-size: 10px;
            font-weight: 700;
            padding: 2px 6px;
            background: rgba(13, 148, 136, 0.25);
            color: #2dd4bf;
            border: 1px solid rgba(13, 148, 136, 0.4);
            border-radius: 4px;
            text-transform: uppercase;
          }
          .bt-hud-close {
            background: transparent;
            border: none;
            color: #94a3b8;
            font-size: 16px;
            cursor: pointer;
            padding: 2px 6px;
            border-radius: 4px;
          }
          .bt-hud-close:hover {
            color: #ffffff;
            background: rgba(255, 255, 255, 0.1);
          }
          .bt-hud-body {
            padding: 14px 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .bt-hud-info {
            display: flex;
            flex-direction: column;
            gap: 4px;
            background: rgba(30, 41, 59, 0.4);
            padding: 10px 12px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.05);
          }
          .bt-hud-job-title {
            font-size: 13px;
            font-weight: 600;
            color: #e2e8f0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .bt-hud-model {
            font-size: 11px;
            color: #2dd4bf;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .bt-hud-feed {
            height: 120px;
            background: rgba(10, 15, 30, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 8px;
            padding: 8px 10px;
            overflow-y: auto;
            font-family: "JetBrains Mono", Consolas, monospace;
            font-size: 11px;
            color: #cbd5e1;
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .bt-feed-line {
            line-height: 1.4;
            word-break: break-word;
          }
          .bt-feed-time {
            color: #64748b;
          }
          .bt-feed-agent {
            color: #38bdf8;
            font-weight: 600;
          }
          .bt-feed-plan {
            color: #34d399;
          }
          .bt-feed-warn {
            color: #fbbf24;
          }
          .bt-hud-actions {
            display: flex;
            gap: 8px;
          }
          .bt-btn-primary {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
            border: none;
            color: #ffffff;
            font-size: 12px;
            font-weight: 700;
            padding: 10px;
            border-radius: 8px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);
            transition: all 0.2s ease;
          }
          .bt-btn-primary:hover {
            filter: brightness(1.1);
            transform: translateY(-1px);
          }
          .bt-btn-secondary {
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(30, 41, 59, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #cbd5e1;
            font-size: 12px;
            font-weight: 600;
            padding: 10px 14px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .bt-btn-secondary:hover {
            background: rgba(51, 65, 85, 0.9);
            color: #ffffff;
          }
        </style>
        <div class="bt-hud-panel" id="bt-hud-panel">
          <div class="bt-hud-header">
            <div class="bt-hud-title">
              <span class="bt-pulse-dot" id="bt-panel-dot"></span>
              <span>BioTailr Autonomous Agent</span>
            </div>
            <span class="bt-hud-badge" id="bt-hud-badge">STANDBY</span>
            <button class="bt-hud-close" id="bt-hud-close-btn">&times;</button>
          </div>
          <div class="bt-hud-body">
            <div class="bt-hud-info">
              <div class="bt-hud-job-title" id="bt-hud-job-title">Scanning active job page...</div>
              <div class="bt-hud-model">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14"/></svg>
                <span>Google Gemini Engine (Project Key)</span>
              </div>
            </div>
            <div class="bt-hud-feed" id="bt-hud-feed">
              <div class="bt-feed-line"><span class="bt-feed-time">[INIT]</span> Screen Agent initialized on LinkedIn.</div>
              <div class="bt-feed-line"><span class="bt-feed-time">[READY]</span> Autonomous perception engine ready.</div>
            </div>
            <div class="bt-hud-actions">
              <button class="bt-btn-primary" id="bt-btn-auto-apply">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                <span id="bt-btn-text">AUTO-APPLY NOW</span>
              </button>
              <button class="bt-btn-secondary" id="bt-btn-next-job" title="Skip to next job in feed">Next Job</button>
            </div>
          </div>
        </div>
        <div class="bt-hud-pill" id="bt-hud-pill">
          <span class="bt-pulse-dot" id="bt-pill-dot"></span>
          <span id="bt-pill-text">BioTailr AI Agent</span>
        </div>
      `;

      document.body.appendChild(host);
      this.container = host;
      this.bindEvents();
      this.updateJobInfo();
    }

    bindEvents() {
      const pill = this.container.querySelector('#bt-hud-pill');
      const panel = this.container.querySelector('#bt-hud-panel');
      const closeBtn = this.container.querySelector('#bt-hud-close-btn');
      const autoBtn = this.container.querySelector('#bt-btn-auto-apply');
      const nextBtn = this.container.querySelector('#bt-btn-next-job');

      pill.addEventListener('click', () => {
        this.isExpanded = !this.isExpanded;
        panel.classList.toggle('open', this.isExpanded);
        this.updateJobInfo();
      });

      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isExpanded = false;
        panel.classList.remove('open');
      });

      autoBtn.addEventListener('click', async () => {
        if (this.isRunning) return;
        this.startAgentWorkflow();
      });

      nextBtn.addEventListener('click', () => {
        this.log('Advancing to next job in search feed...', 'AGENT');
        const OrchestratorClass = window.AutoApplyOrchestrator || (typeof AutoApplyOrchestrator !== 'undefined' ? AutoApplyOrchestrator : null);
        if (OrchestratorClass) {
          const orchestrator = new OrchestratorClass();
          orchestrator.platforms.linkedin.navigateToNextJob((msg) => this.log(msg, 'AGENT'));
        }
      });
    }

    updateJobInfo() {
      const titleEl = this.container.querySelector('#bt-hud-job-title');
      if (!titleEl) return;
      const jobHeader = document.querySelector('.job-details-jobs-unified-top-card__job-title, h1');
      if (jobHeader && jobHeader.innerText.trim()) {
        titleEl.innerText = jobHeader.innerText.trim();
      } else {
        titleEl.innerText = 'LinkedIn Job Search Feed';
      }
    }

    log(message, type = 'AGENT') {
      const feed = this.container.querySelector('#bt-hud-feed');
      if (!feed) return;
      const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const line = document.createElement('div');
      line.className = 'bt-feed-line';
      let tagClass = 'bt-feed-agent';
      if (type === 'PLAN') tagClass = 'bt-feed-plan';
      if (type === 'WARN' || type === 'ERROR') tagClass = 'bt-feed-warn';
      line.innerHTML = `<span class="bt-feed-time">[${time}]</span> <span class="${tagClass}">[${type}]</span> ${message}`;
      feed.appendChild(line);
      feed.scrollTop = feed.scrollHeight;
    }

    setStatus(status, badge = 'RUNNING') {
      const badgeEl = this.container.querySelector('#bt-hud-badge');
      const pillText = this.container.querySelector('#bt-pill-text');
      const pillDot = this.container.querySelector('#bt-pill-dot');
      const panelDot = this.container.querySelector('#bt-panel-dot');
      if (badgeEl) badgeEl.innerText = badge;
      if (pillText) pillText.innerText = status;
      if (badge === 'RUNNING') {
        pillDot?.classList.add('working');
        panelDot?.classList.add('working');
      } else {
        pillDot?.classList.remove('working');
        panelDot?.classList.remove('working');
      }
    }

    async startAgentWorkflow() {
      this.isRunning = true;
      const btnText = this.container.querySelector('#bt-btn-text');
      if (btnText) btnText.innerText = 'AGENT WORKING...';
      this.setStatus('Agent Running', 'ACTIVE');
      this.log('Triggering Autonomous Application Workflow...', 'AGENT');

      try {
        const OrchestratorClass = window.AutoApplyOrchestrator || (typeof AutoApplyOrchestrator !== 'undefined' ? AutoApplyOrchestrator : null);
        if (!OrchestratorClass) {
          throw new Error('AutoApplyOrchestrator not found in page context.');
        }

        const orchestrator = new OrchestratorClass();
        const candidateContext = {
          personal: {
            firstName: 'Sanjay',
            lastName: 'N',
            fullName: 'Sanjay N',
            email: '2005sanjaynrs@gmail.com',
            phone: '9361599018',
            city: 'Coimbatore',
            country: 'India',
            linkedinUrl: 'https://www.linkedin.com/in/sanjay--n',
            githubUrl: 'https://github.com/RNS-Forge',
            portfolioUrl: 'https://rns-forge.github.io/RNS_Professional_Profile/'
          },
          workAuth: {
            authorizedInCountry: 'Yes',
            needSponsorship: 'No',
            currentVisaStatus: 'Citizen'
          },
          experience: {
            totalYears: 2,
            noticePeriodDays: 15,
            currentTitle: 'Software Development Engineer',
            currentCompany: 'Axodian',
            expectedSalary: '1200000',
            currentSalary: '800000'
          },
          education: {
            degree: "Bachelor's Degree",
            fieldOfStudy: 'Computer Science and Engineering',
            institution: 'Anna University / SNS College of Technology',
            gradYear: '2026'
          }
        };

        const result = await orchestrator.runFastApply(candidateContext, null, (msg) => {
          this.log(msg, 'AGENT');
        });

        this.log(`Workflow complete: ${result?.status || 'Done'}`, 'PLAN');
        this.setStatus('BioTailr AI Ready', 'STANDBY');
      } catch (err) {
        this.log(`Agent error: ${err.message}`, 'WARN');
        this.setStatus('Error Encountered', 'WARN');
      } finally {
        this.isRunning = false;
        if (btnText) btnText.innerText = 'AUTO-APPLY NOW';
      }
    }
  }

  // Instantiate HUD on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { window.bioTailrScreenHUD = new BioTailrScreenHUD(); });
  } else {
    window.bioTailrScreenHUD = new BioTailrScreenHUD();
  }
})();
