/**
 * BioTailr AI - Autonomous Screen Agent HUD (Heads-Up Display)
 * Floating on-screen agent interface for live visual monitoring & control.
 * Observes the browser screen in real-time, displays agent reasoning, and allows 1-click control.
 * Executive Professional Design: Clean White & Emerald Green palette, strictly 6px max radius, zero emojis.
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

    createSvg(width, height, viewBox, innerHtml, fill = 'none', stroke = 'currentColor', strokeWidth = '2') {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', String(width));
      svg.setAttribute('height', String(height));
      svg.setAttribute('viewBox', viewBox);
      svg.setAttribute('fill', fill);
      if (stroke !== 'none') {
        svg.setAttribute('stroke', stroke);
        svg.setAttribute('stroke-width', strokeWidth);
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
      }
      svg.innerHTML = innerHtml;
      return svg;
    }

    init() {
      const existing = document.getElementById('biotailr-agent-hud');
      if (existing) existing.remove();

      const host = document.createElement('div');
      host.id = 'biotailr-agent-hud';

      // 1. Executive Professional Stylesheet
      const style = document.createElement('style');
      style.textContent = `
        #biotailr-agent-hud {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999999;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          user-select: none;
          color: #0f172a;
        }
        .bt-hud-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 8px 14px;
          color: #0f172a;
          font-size: 13px;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .bt-hud-pill:hover {
          border-color: #059669;
          color: #059669;
          box-shadow: 0 6px 16px rgba(5, 150, 105, 0.15);
          transform: translateY(-1px);
        }
        .bt-pulse-dot {
          width: 8px;
          height: 8px;
          background: #059669;
          border-radius: 50%;
          box-shadow: 0 0 0 2px #d1fae5;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }
        .bt-pulse-dot.working {
          background: #2563eb;
          box-shadow: 0 0 0 2px #dbeafe;
          animation: bt-pulse 1.4s infinite;
        }
        @keyframes bt-pulse {
          0% { transform: scale(0.9); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0.8; }
        }
        .bt-hud-panel {
          display: none;
          flex-direction: column;
          width: 360px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          box-shadow: 0 12px 32px -4px rgba(15, 23, 42, 0.12), 0 4px 12px rgba(15, 23, 42, 0.06);
          overflow: hidden;
          margin-bottom: 10px;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .bt-hud-panel.open {
          display: flex;
        }
        .bt-hud-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          border-radius: 6px 6px 0 0;
        }
        .bt-hud-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.2px;
        }
        .bt-hud-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 3px 6px;
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          transition: all 0.2s ease;
        }
        .bt-hud-badge.active {
          background: #ecfdf5;
          color: #047857;
          border-color: #a7f3d0;
        }
        .bt-hud-close {
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          transition: all 0.15s ease;
        }
        .bt-hud-close:hover {
          color: #0f172a;
          background: #e2e8f0;
        }
        .bt-hud-body {
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: #ffffff;
        }
        .bt-hud-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          background: #f8fafc;
          padding: 10px 12px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }
        .bt-hud-job-title {
          font-size: 13px;
          font-weight: 600;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .bt-hud-model {
          font-size: 11px;
          color: #059669;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .bt-hud-feed {
          height: 120px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px 10px;
          overflow-y: auto;
          font-family: "JetBrains Mono", Consolas, monospace;
          font-size: 11px;
          color: #334155;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .bt-feed-line {
          line-height: 1.4;
          word-break: break-word;
        }
        .bt-feed-time {
          color: #94a3b8;
        }
        .bt-feed-agent {
          color: #059669;
          font-weight: 600;
        }
        .bt-feed-plan {
          color: #0284c7;
          font-weight: 600;
        }
        .bt-feed-warn {
          color: #d97706;
          font-weight: 600;
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
          background: #059669;
          border: 1px solid #047857;
          color: #ffffff;
          font-size: 12px;
          font-weight: 600;
          padding: 9px 14px;
          border-radius: 6px;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          transition: all 0.15s ease;
        }
        .bt-btn-primary:hover {
          background: #047857;
          box-shadow: 0 2px 6px rgba(5, 150, 105, 0.25);
        }
        .bt-btn-primary:active {
          transform: translateY(1px);
        }
        .bt-btn-secondary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #334155;
          font-size: 12px;
          font-weight: 600;
          padding: 9px 14px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .bt-btn-secondary:hover {
          background: #f8fafc;
          border-color: #94a3b8;
          color: #0f172a;
        }
        .bt-btn-secondary:active {
          transform: translateY(1px);
        }
      `;
      host.appendChild(style);

      // 2. Build Panel via Pure DOM Nodes (100% Reliable across all CSP environments)
      const panel = document.createElement('div');
      panel.className = 'bt-hud-panel';
      panel.id = 'bt-hud-panel';

      // Header
      const header = document.createElement('div');
      header.className = 'bt-hud-header';

      const titleBox = document.createElement('div');
      titleBox.className = 'bt-hud-title';
      const panelDot = document.createElement('span');
      panelDot.className = 'bt-pulse-dot';
      panelDot.id = 'bt-panel-dot';
      const titleText = document.createElement('span');
      titleText.textContent = 'BioTailr Autonomous Agent';
      titleBox.appendChild(panelDot);
      titleBox.appendChild(titleText);

      const badge = document.createElement('span');
      badge.className = 'bt-hud-badge';
      badge.id = 'bt-hud-badge';
      badge.textContent = 'STANDBY';

      const closeBtn = document.createElement('button');
      closeBtn.className = 'bt-hud-close';
      closeBtn.id = 'bt-hud-close-btn';
      closeBtn.setAttribute('aria-label', 'Close panel');
      closeBtn.appendChild(this.createSvg(14, 14, '0 0 24 24', '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>'));

      header.appendChild(titleBox);
      header.appendChild(badge);
      header.appendChild(closeBtn);

      // Body
      const body = document.createElement('div');
      body.className = 'bt-hud-body';

      const info = document.createElement('div');
      info.className = 'bt-hud-info';
      const jobTitle = document.createElement('div');
      jobTitle.className = 'bt-hud-job-title';
      jobTitle.id = 'bt-hud-job-title';
      jobTitle.textContent = 'Scanning active job page...';
      const model = document.createElement('div');
      model.className = 'bt-hud-model';
      model.appendChild(this.createSvg(12, 12, '0 0 24 24', '<path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14"/>'));
      const modelText = document.createElement('span');
      modelText.textContent = 'Google Gemini Engine (Project Key)';
      model.appendChild(modelText);
      info.appendChild(jobTitle);
      info.appendChild(model);

      const feed = document.createElement('div');
      feed.className = 'bt-hud-feed';
      feed.id = 'bt-hud-feed';

      const initLine = document.createElement('div');
      initLine.className = 'bt-feed-line';
      initLine.innerHTML = '<span class="bt-feed-time">[INIT]</span> Screen Agent initialized on LinkedIn.';
      const readyLine = document.createElement('div');
      readyLine.className = 'bt-feed-line';
      readyLine.innerHTML = '<span class="bt-feed-time">[READY]</span> Autonomous perception engine ready.';
      feed.appendChild(initLine);
      feed.appendChild(readyLine);

      const actions = document.createElement('div');
      actions.className = 'bt-hud-actions';

      const primaryBtn = document.createElement('button');
      primaryBtn.className = 'bt-btn-primary';
      primaryBtn.id = 'bt-btn-auto-apply';
      primaryBtn.appendChild(this.createSvg(12, 12, '0 0 24 24', '<polygon points="6 4 20 12 6 20 6 4"/>', 'currentColor', 'none'));
      const primaryText = document.createElement('span');
      primaryText.id = 'bt-btn-text';
      primaryText.textContent = 'AUTO-APPLY NOW';
      primaryBtn.appendChild(primaryText);

      const secondaryBtn = document.createElement('button');
      secondaryBtn.className = 'bt-btn-secondary';
      secondaryBtn.id = 'bt-btn-next-job';
      secondaryBtn.setAttribute('title', 'Skip to next job in feed');
      const secText = document.createElement('span');
      secText.textContent = 'Next Job';
      secondaryBtn.appendChild(secText);
      secondaryBtn.appendChild(this.createSvg(12, 12, '0 0 24 24', '<path d="M5 12h14M12 5l7 7-7 7"/>'));

      actions.appendChild(primaryBtn);
      actions.appendChild(secondaryBtn);

      body.appendChild(info);
      body.appendChild(feed);
      body.appendChild(actions);

      panel.appendChild(header);
      panel.appendChild(body);

      // 3. Floating Pill Element (Max 6px radius, Clean White & Emerald)
      const pill = document.createElement('div');
      pill.className = 'bt-hud-pill';
      pill.id = 'bt-hud-pill';
      const pillDot = document.createElement('span');
      pillDot.className = 'bt-pulse-dot';
      pillDot.id = 'bt-pill-dot';
      const pillText = document.createElement('span');
      pillText.id = 'bt-pill-text';
      pillText.textContent = 'BioTailr AI Agent';
      pill.appendChild(pillDot);
      pill.appendChild(pillText);

      host.appendChild(panel);
      host.appendChild(pill);

      document.body.appendChild(host);
      this.container = host;
      this.bindEvents();
      this.updateJobInfo();
    }

    bindEvents() {
      if (!this.container) return;
      const pill = this.container.querySelector('#bt-hud-pill');
      const panel = this.container.querySelector('#bt-hud-panel');
      const closeBtn = this.container.querySelector('#bt-hud-close-btn');
      const autoBtn = this.container.querySelector('#bt-btn-auto-apply');
      const nextBtn = this.container.querySelector('#bt-btn-next-job');

      if (!pill || !panel) return;

      pill.addEventListener('click', () => {
        this.isExpanded = !this.isExpanded;
        panel.classList.toggle('open', this.isExpanded);
        this.updateJobInfo();
      });

      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.isExpanded = false;
          panel.classList.remove('open');
        });
      }

      if (autoBtn) {
        autoBtn.addEventListener('click', async () => {
          if (this.isRunning) return;
          this.startAgentWorkflow();
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          this.log('Advancing to next job in search feed...', 'AGENT');
          const OrchestratorClass = window.AutoApplyOrchestrator || (typeof AutoApplyOrchestrator !== 'undefined' ? AutoApplyOrchestrator : null);
          if (OrchestratorClass) {
            const orchestrator = new OrchestratorClass();
            orchestrator.platforms.linkedin.navigateToNextJob((msg) => this.log(msg, 'AGENT'));
          }
        });
      }
    }

    updateJobInfo() {
      const titleEl = this.container?.querySelector('#bt-hud-job-title');
      if (!titleEl) return;
      const jobHeader = document.querySelector('.job-details-jobs-unified-top-card__job-title, h1');
      if (jobHeader && jobHeader.innerText.trim()) {
        titleEl.innerText = jobHeader.innerText.trim();
      } else {
        titleEl.innerText = 'LinkedIn Job Search Feed';
      }
    }

    log(message, type = 'AGENT') {
      const feed = this.container?.querySelector('#bt-hud-feed');
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
      const badgeEl = this.container?.querySelector('#bt-hud-badge');
      const pillText = this.container?.querySelector('#bt-pill-text');
      const pillDot = this.container?.querySelector('#bt-pill-dot');
      const panelDot = this.container?.querySelector('#bt-panel-dot');
      if (badgeEl) {
        badgeEl.innerText = badge;
        if (badge === 'RUNNING' || badge === 'ACTIVE') {
          badgeEl.className = 'bt-hud-badge active';
        } else {
          badgeEl.className = 'bt-hud-badge';
        }
      }
      if (pillText) pillText.innerText = status;
      if (badge === 'RUNNING' || badge === 'ACTIVE') {
        pillDot?.classList.add('working');
        panelDot?.classList.add('working');
      } else {
        pillDot?.classList.remove('working');
        panelDot?.classList.remove('working');
      }
    }

    async startAgentWorkflow() {
      this.isRunning = true;
      const btnText = this.container?.querySelector('#bt-btn-text');
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
