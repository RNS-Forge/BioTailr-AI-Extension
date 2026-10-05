/**
 * BioTailr AI - LinkedIn Easy Apply Platform Adapter
 * High-speed multi-step modal form filler and applicant submission engine.
 */

class LinkedInPlatform extends BasePlatform {
  constructor() {
    super('LinkedIn');
  }

  detect(url, doc = document) {
    const target = (url || window.location.href || '').toLowerCase();
    const isLiUrl = target.includes('linkedin.com');
    const hasLiDom = Boolean(doc.querySelector('.jobs-apply-button, .jobs-easy-apply-modal, .job-details-jobs-unified-top-card, .jobs-description, #job-details'));
    return (isLiUrl || hasLiDom) && (
      target.includes('/jobs/') || hasLiDom
    );
  }

  /**
   * Helper to dispatch full synthetic mouse/pointer event sequence for React 18 reliability
   */
  simulateClick(el) {
    if (!el) return;
    try {
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
    } catch(e) {}
    try { el.click(); } catch(e) {}
    const opts = { bubbles: true, cancelable: true, view: window };
    el.dispatchEvent(new MouseEvent('pointerdown', opts));
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new MouseEvent('pointerup', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    try { el.click(); } catch(e) {}
  }

  /**
   * Identifies if active job supports LinkedIn 1-Click Easy Apply
   */
  canApply(doc = document) {
    const applyBtn = this.findEasyApplyButton(doc);
    if (!applyBtn) {
      // Check if external apply is present in the active job detail pane
      const detailPane = this.getJobDetailPane(doc);
      const anyApply = detailPane.querySelector('.jobs-apply-button, .jobs-s-apply button, a.jobs-apply-button, button[class*="apply"]');
      const detailText = (detailPane.innerText || '').toLowerCase();
      const hasExternalNote = detailText.includes('responses managed off linkedin') ||
                              detailText.includes('application will be submitted on company website') ||
                              Boolean(detailPane.querySelector('[data-test-icon="link-external-small"], [data-test-icon="arrow-diagonal"], svg[type="external-link"], [data-svg-class-name*="offsite"], [class*="offsite"]'));

      if (anyApply || hasExternalNote) {
        return { 
          canApply: false, 
          isExternal: true,
          reason: 'External Application (Directs off LinkedIn to company portal). Select an "Easy Apply" job in LinkedIn to use 1-Click Fast Apply.' 
        };
      }
      return { canApply: false, reason: 'Apply button not found on this job card' };
    }
    return { canApply: true, button: applyBtn };
  }

  getJobDetailPane(doc = document) {
    return doc.querySelector([
      '.jobs-search__job-details',
      '.jobs-details__main-content',
      '.job-view-layout',
      '.scaffold-layout__detail',
      '.job-details-jobs-unified-top-card',
      '#job-details'
    ].join(', ')) || doc;
  }

  findEasyApplyButton(doc = document) {
    // Search the active detail pane first to avoid false-matching other items in the job search list
    const detailPane = this.getJobDetailPane(doc);

    const candidates = Array.from(detailPane.querySelectorAll([
      'button.jobs-apply-button',
      '.jobs-apply-button--top-card button',
      'button[aria-label*="Easy Apply"]',
      'button[aria-label*="easy apply"]',
      'button[data-job-id]',
      '.jobs-s-apply button',
      '.jobs-details__main-content button.artdeco-button--primary'
    ].join(', '))).filter(btn => {
      // Strict guard: NEVER select an apply button from the background search results list!
      return !btn.closest('.jobs-search-results-list, .scaffold-layout__list, .jobs-search-results');
    });

    for (const btn of candidates) {
      if (!this.isElementVisible(btn)) continue;
      const text = (btn.innerText || btn.getAttribute('aria-label') || '').toLowerCase();
      const hasEasyApplyAttr = btn.getAttribute('data-is-easy-apply') === 'true';
      const hasLinkedInIcon = Boolean(btn.querySelector('svg[type="linkedin-bug"], [data-test-icon="linkedin-bug"]'));

      // Must be Easy Apply, not an external link ("Apply" with diagonal arrow)
      const isExternal = Boolean(btn.querySelector('[data-test-icon="link-external-small"], [data-test-icon="arrow-diagonal"]')) ||
                         (text === 'apply' && !text.includes('easy'));

      if (!isExternal && (text.includes('easy apply') || hasEasyApplyAttr || (text.includes('apply') && hasLinkedInIcon))) {
        return btn;
      }
    }
    return null;
  }

  async executeFastApply(context, resumeBlob, onStatus = () => {}) {
    onStatus('[LinkedIn] Checking for Easy Apply button on active listing...');
    const check = this.canApply(document);
    if (!check.canApply) {
      onStatus(`[LinkedIn] Note: ${check.reason}`);
      return { success: false, reason: check.reason };
    }

    // 1. Launch Easy Apply Modal
    onStatus('[LinkedIn] Launching Easy Apply modal dialog...');
    this.simulateClick(check.button);

    const modal = await this.waitForElement([
      'dialog[open]',
      'dialog',
      '[role="dialog"]',
      '.jobs-easy-apply-modal',
      '[data-test-modal-id="easy-apply-modal"]',
      '.artdeco-modal[role="dialog"]',
      '.artdeco-modal'
    ].join(', '), 3000, 50);

    if (!modal) {
      onStatus('[LinkedIn] Easy Apply modal dialog did not appear.');
      return { success: false, reason: 'Modal did not appear' };
    }

    onStatus('[LinkedIn] Modal opened. Commencing automated application sequence...');

    // 2. High-speed multi-step form stepper (Max 15 iterations)
    let stepCount = 0;
    const maxSteps = 15;

    while (stepCount < maxSteps) {
      stepCount++;
      await this.sleep(20);
      onStatus(`[LinkedIn] Step ${stepCount}: Processing application questions & fields...`);

      // Enforce user constraints: strictly 1 College & 1 School in Education, max 3 in Work Experience
      await this.pruneEducationAndExperience(modal, onStatus);

      // Fill visible fields on this step
      const filled = this.fillVisibleFields(modal, context, resumeBlob);
      if (filled > 0) {
        onStatus(`[LinkedIn] Form values populated: ${filled} fields updated.`);
      }

      // Check for errors on current step
      const errorMsg = modal.querySelector('.artdeco-inline-feedback--error, [data-test-form-element-error-messages]');
      if (errorMsg && errorMsg.innerText.trim()) {
        onStatus(`[LinkedIn] Note: Prompt encountered: "${errorMsg.innerText.trim().slice(0, 50)}..."`);
      }

      // Check primary action buttons in modal footer (ONLY VISIBLE ONES)
      const submitBtn = this.findButtonByText(modal, [/submit application/i, /^submit$/i])
        || (this.isElementVisible(modal.querySelector('button[aria-label="Submit application"]')) ? modal.querySelector('button[aria-label="Submit application"]') : null);

      if (submitBtn) {
        onStatus('[LinkedIn] Final Review step reached. Scrolling content into view & submitting application...');
        try {
          const scrollContainers = [
            modal.querySelector('.jobs-easy-apply-modal__content'),
            modal.querySelector('.artdeco-modal__content'),
            modal.querySelector('div[class*="content"]'),
            modal
          ];
          scrollContainers.forEach(sc => { if (sc) sc.scrollTop = sc.scrollHeight; });
        } catch(e) {}
        try {
          submitBtn.scrollIntoView({ behavior: 'instant', block: 'center' });
        } catch(e) {}
        await this.sleep(150);
        this.simulateClick(submitBtn);
        await this.sleep(900);

        // Dismiss confirmation modal if present
        const dismissBtn = await this.waitForElement('.artdeco-modal__dismiss, [data-test-modal-close-btn], .modal-close-btn, button[aria-label="Dismiss"], button[data-control-name="overlay.close_conversation_window"], button[aria-label="Done"]', 2000, 80);
        if (dismissBtn) {
          try { this.simulateClick(dismissBtn); } catch(e) {}
        }
        onStatus('[LinkedIn] Application successfully submitted via Easy Apply.');

        // Auto-navigate to next Easy Apply job in search results and continue continuous apply
        await this.sleep(600);
        const nextFound = this.navigateToNextJob(onStatus);
        if (nextFound) {
          onStatus('[LinkedIn] Transitioning to next job. Stand by for auto-apply on next listing...');
          await this.sleep(1200);
          return await this.executeFastApply(context, resumeBlob, onStatus);
        }

        return { success: true, status: 'submitted', steps: stepCount };
      }

      const saveBtn = this.findButtonByText(modal, [/^save$/i]);
      if (saveBtn) {
        onStatus('[LinkedIn] Saving section details...');
        this.simulateClick(saveBtn);
        await this.sleep(180);
        continue;
      }

      const reviewBtn = this.findButtonByText(modal, [/review your application/i, /^review$/i])
        || (this.isElementVisible(modal.querySelector('button[aria-label="Review your application"]')) ? modal.querySelector('button[aria-label="Review your application"]') : null);

      if (reviewBtn) {
        onStatus('[LinkedIn] Review step reached. Advancing to final submission...');
        this.simulateClick(reviewBtn);
        await this.sleep(180);
        continue;
      }

      const nextBtn = this.findButtonByText(modal, [/continue to next step/i, /^next$/i, /^continue$/i])
        || (this.isElementVisible(modal.querySelector('button[aria-label="Continue to next step"], button[data-easy-apply-next-button]')) ? modal.querySelector('button[aria-label="Continue to next step"], button[data-easy-apply-next-button]') : null);

      if (nextBtn) {
        this.simulateClick(nextBtn);
        await this.sleep(180);
        continue;
      }

      // If no next, review, or submit button is found, check if modal closed (submitted)
      if (!document.body.contains(modal) || modal.getAttribute('aria-hidden') === 'true' || modal.closest('[style*="display: none"]')) {
        onStatus('[LinkedIn] Application completed.');
        return { success: true, status: 'completed', steps: stepCount };
      }

      // No progress could be made
      onStatus('[LinkedIn] Manual review or custom verification required. Standing by for candidate.');
      return { success: true, status: 'manual_confirmation_needed', steps: stepCount };
    }

    return { success: false, reason: 'Exceeded maximum step threshold' };
  }

  /**
   * Enforces user constraints:
   * 1. Education: strictly 1 College and 1 School (removes extra or duplicate entries)
   * 2. Work Experience: strictly max 3 experiences (removes any entry beyond 3)
   */
  async pruneEducationAndExperience(modal, onStatus = () => {}) {
    if (!modal) return;
    const modalText = (modal.innerText || '').toLowerCase();

    // 1. EDUCATION: Keep strictly 1 College and 1 School
    if (modalText.includes('education') && !modalText.includes('work experience')) {
      const removeButtons = Array.from(modal.querySelectorAll('button, a[role="button"]')).filter(b => {
        const txt = (b.innerText || b.getAttribute('aria-label') || '').toLowerCase().trim();
        return txt === 'remove' || txt.includes('remove education') || txt.includes('delete');
      });

      if (removeButtons.length > 2) {
        onStatus(`[LinkedIn] Pruning Education entries (keeping strictly 1 College and 1 School)...`);
        let keptCollege = false;
        let keptSchool = false;

        for (const btn of removeButtons) {
          const card = btn.closest('li, .jobs-easy-apply-form-section__grouping, .fb-dash-form-element, div[class*="entry"], div[class*="group"]') || btn.parentElement?.parentElement;
          const cardText = (card ? card.innerText : '').toLowerCase();

          const isSchool = /school|metric|matriculation|secondary|12th|10th|high\s*school/i.test(cardText);
          const isCollege = !isSchool && (/college|university|institute|institution|btech|b\.tech|bachelor|degree|engineering/i.test(cardText) || cardText.includes('sns') || cardText.includes('anna'));

          if (isCollege && !keptCollege) {
            keptCollege = true;
            continue;
          }
          if (isSchool && !keptSchool) {
            keptSchool = true;
            continue;
          }

          // Duplicate college or duplicate school or extra entry: remove it
          try {
            onStatus(`[LinkedIn] Removing extra education entry: "${cardText.slice(0, 35).replace(/\n/g, ' ')}..."`);
            this.simulateClick(btn);
            await this.sleep(300);

            // Confirm removal dialog if prompted
            const confirmBtn = document.querySelector('.artdeco-modal__confirm-dialog-btn, button[data-control-name="confirm_delete"], button.artdeco-button--primary');
            if (confirmBtn && confirmBtn !== btn && this.isElementVisible(confirmBtn)) {
              this.simulateClick(confirmBtn);
              await this.sleep(300);
            }
          } catch(e) {}
        }
      }
    }

    // 2. WORK EXPERIENCE: Keep strictly max 3 experiences
    if (modalText.includes('work experience')) {
      const expRemoveButtons = Array.from(modal.querySelectorAll('button, a[role="button"]')).filter(b => {
        const txt = (b.innerText || b.getAttribute('aria-label') || '').toLowerCase().trim();
        return txt === 'remove' || txt.includes('remove experience') || txt.includes('delete');
      });

      if (expRemoveButtons.length > 3) {
        onStatus(`[LinkedIn] Pruning Work Experience entries (keeping max 3 experiences)...`);
        for (let i = 3; i < expRemoveButtons.length; i++) {
          try {
            const btn = expRemoveButtons[i];
            onStatus(`[LinkedIn] Removing extra experience entry #${i + 1}...`);
            this.simulateClick(btn);
            await this.sleep(300);

            const confirmBtn = document.querySelector('.artdeco-modal__confirm-dialog-btn, button[data-control-name="confirm_delete"], button.artdeco-button--primary');
            if (confirmBtn && confirmBtn !== btn && this.isElementVisible(confirmBtn)) {
              this.simulateClick(confirmBtn);
              await this.sleep(300);
            }
          } catch(e) {}
        }
      }
    }
  }

  /**
   * Automatically locate and transition to the next unapplied Easy Apply job in search list
   */
  navigateToNextJob(onStatus = () => {}) {
    onStatus('[LinkedIn] Locating next available Easy Apply job card in search feed...');
    const cards = Array.from(document.querySelectorAll([
      '.jobs-search-results-list__list-item',
      '.job-card-container',
      '[data-occludable-job-id]',
      'li.jobs-search-results__list-item'
    ].join(', ')));

    for (const card of cards) {
      const text = (card.innerText || '').toLowerCase();
      const isApplied = text.includes('applied') || text.includes('application submitted');
      const isEasyApply = text.includes('easy apply');
      const isActive = card.classList.contains('jobs-search-results-list__list-item--active') || card.classList.contains('selected') || Boolean(card.querySelector('.job-card-container--active'));

      if (isEasyApply && !isApplied && !isActive) {
        const link = card.querySelector('a.job-card-container__link, a[href*="/jobs/view/"], a');
        if (link) {
          onStatus(`[LinkedIn] Next job found: "${link.innerText.trim().slice(0, 45)}". Transitioning...`);
          try { link.scrollIntoView({ behavior: 'instant', block: 'center' }); } catch(e) {}
          this.simulateClick(link);
          return true;
        }
      }
    }
    onStatus('[LinkedIn] Batch finished or no more unapplied Easy Apply jobs found in search list.');
    return false;
  }
}

if (typeof window !== 'undefined') {
  window.LinkedInPlatform = LinkedInPlatform;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LinkedInPlatform;
}
