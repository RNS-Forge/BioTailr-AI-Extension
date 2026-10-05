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
    const opts = { bubbles: true, cancelable: true, view: window };
    el.dispatchEvent(new MouseEvent('pointerdown', opts));
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new MouseEvent('pointerup', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.click();
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
                              Boolean(detailPane.querySelector('[data-test-icon="link-external-small"], [data-test-icon="arrow-diagonal"], svg[type="external-link"]'));

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
      await this.sleep(40);
      onStatus(`[LinkedIn] Step ${stepCount}: Processing application questions & fields...`);

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
        onStatus('[LinkedIn] Final Review step reached. Submitting application...');
        this.simulateClick(submitBtn);
        await this.waitForElement('.artdeco-modal__dismiss, [data-test-modal-close-btn], .modal-close-btn', 600, 50);
        onStatus('[LinkedIn] Application successfully submitted via Easy Apply.');
        return { success: true, status: 'submitted', steps: stepCount };
      }

      const reviewBtn = this.findButtonByText(modal, [/review your application/i, /^review$/i])
        || (this.isElementVisible(modal.querySelector('button[aria-label="Review your application"]')) ? modal.querySelector('button[aria-label="Review your application"]') : null);

      if (reviewBtn) {
        onStatus('[LinkedIn] Review step reached. Advancing to final submission...');
        this.simulateClick(reviewBtn);
        await this.sleep(80);
        continue;
      }

      const nextBtn = this.findButtonByText(modal, [/continue to next step/i, /^next$/i, /^continue$/i])
        || (this.isElementVisible(modal.querySelector('button[aria-label="Continue to next step"], button[data-easy-apply-next-button]')) ? modal.querySelector('button[aria-label="Continue to next step"], button[data-easy-apply-next-button]') : null);

      if (nextBtn) {
        this.simulateClick(nextBtn);
        await this.sleep(80);
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
}

if (typeof window !== 'undefined') {
  window.LinkedInPlatform = LinkedInPlatform;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LinkedInPlatform;
}
