/**
 * BioTailr AI - LinkedIn Easy Apply Platform Adapter
 * High-speed multi-step modal form filler and applicant submission engine.
 */

class LinkedInPlatform extends BasePlatform {
  constructor() {
    super('LinkedIn');
  }

  detect(url, doc = document) {
    const host = window.location.hostname.toLowerCase();
    const href = window.location.href.toLowerCase();
    return host.includes('linkedin.com') && (
      href.includes('/jobs/') ||
      Boolean(doc.querySelector('.jobs-description, #job-details, .job-details-jobs-unified-top-card'))
    );
  }

  canApply(doc = document) {
    const applyBtn = this.findEasyApplyButton(doc);
    if (!applyBtn) {
      // Check if external apply is present
      const anyApply = doc.querySelector('.jobs-apply-button, .jobs-s-apply button');
      if (anyApply) {
        return { canApply: false, reason: 'External Application (Directs to company site, not LinkedIn Easy Apply)' };
      }
      return { canApply: false, reason: 'Apply button not found on this job card' };
    }
    return { canApply: true, button: applyBtn };
  }

  findEasyApplyButton(doc = document) {
    const candidates = Array.from(doc.querySelectorAll([
      'button.jobs-apply-button',
      '.jobs-apply-button--top-card button',
      'button[aria-label*="Easy Apply"]',
      'button[data-job-id]',
      '.jobs-s-apply button',
      '.jobs-details__main-content button.artdeco-button--primary'
    ].join(', ')));

    for (const btn of candidates) {
      const text = (btn.innerText || btn.getAttribute('aria-label') || '').toLowerCase();
      // Must contain "easy apply", not just "apply"
      if (text.includes('easy apply') || btn.getAttribute('data-is-easy-apply') === 'true') {
        return btn;
      }
    }
    return null;
  }

  async executeFastApply(context, resumeBlob, onStatus = () => {}) {
    onStatus('⚡ [LinkedIn] Checking for Easy Apply button...');
    const check = this.canApply(document);
    if (!check.canApply) {
      onStatus(`❌ [LinkedIn] ${check.reason}`);
      return { success: false, reason: check.reason };
    }

    // 1. Launch Easy Apply Modal
    onStatus('⚡ [LinkedIn] Launching Easy Apply modal...');
    check.button.click();

    const modal = await this.waitForElement([
      '.jobs-easy-apply-modal',
      '[data-test-modal-id="easy-apply-modal"]',
      '.artdeco-modal[role="dialog"]',
      '.artdeco-modal'
    ].join(', '), 3000, 50);

    if (!modal) {
      onStatus('❌ [LinkedIn] Easy Apply modal failed to open.');
      return { success: false, reason: 'Modal did not appear' };
    }

    onStatus('⚡ [LinkedIn] Modal opened! Commencing Fast Apply sequence...');

    // 2. High-speed multi-step form stepper (Max 15 iterations)
    let stepCount = 0;
    const maxSteps = 15;

    while (stepCount < maxSteps) {
      stepCount++;
      onStatus(`⚡ [LinkedIn] Step ${stepCount}: Fast-filling questions & inputs...`);

      // Fill visible fields on this step
      const filled = this.fillVisibleFields(modal, context, resumeBlob);

      // Check for errors on current step
      const errorMsg = modal.querySelector('.artdeco-inline-feedback--error, [data-test-form-element-error-messages]');
      if (errorMsg && errorMsg.innerText.trim()) {
        onStatus(`⚠️ [LinkedIn] Note: Required question encountered: "${errorMsg.innerText.trim().slice(0, 50)}..."`);
      }

      // Check primary action buttons in modal footer
      const submitBtn = this.findButtonByText(modal, [/submit application/i, /^submit$/i])
        || modal.querySelector('button[aria-label="Submit application"]');

      if (submitBtn) {
        onStatus('⚡ [LinkedIn] Final Review Reached! Submitting application...');
        submitBtn.click();
        await this.waitForElement('.artdeco-modal__dismiss, [data-test-modal-close-btn]', 2000, 50);
        onStatus('✅ [LinkedIn] Application successfully submitted via Easy Apply!');
        return { success: true, status: 'submitted', steps: stepCount };
      }

      const reviewBtn = this.findButtonByText(modal, [/review your application/i, /^review$/i])
        || modal.querySelector('button[aria-label="Review your application"]');

      if (reviewBtn) {
        onStatus('⚡ [LinkedIn] Review step reached...');
        reviewBtn.click();
        await this.sleep(80);
        continue;
      }

      const nextBtn = this.findButtonByText(modal, [/continue to next step/i, /^next$/i, /^continue$/i])
        || modal.querySelector('button[aria-label="Continue to next step"], button[data-easy-apply-next-button]');

      if (nextBtn) {
        nextBtn.click();
        await this.sleep(80);
        continue;
      }

      // If no next, review, or submit button is found, check if modal closed (submitted)
      if (!document.body.contains(modal) || modal.getAttribute('aria-hidden') === 'true') {
        onStatus('✅ [LinkedIn] Easy Apply completed!');
        return { success: true, status: 'completed', steps: stepCount };
      }

      // No progress could be made
      onStatus('⚠️ [LinkedIn] Reached manual review or unknown step. Waiting for user confirmation.');
      return { success: true, status: 'manual_confirmation_needed', steps: stepCount };
    }

    return { success: false, reason: 'Exceeded maximum step threshold' };
  }

  findButtonByText(container, patterns) {
    const buttons = Array.from(container.querySelectorAll('button:not([disabled])'));
    for (const btn of buttons) {
      const text = (btn.innerText || btn.getAttribute('aria-label') || '').trim();
      for (const pat of patterns) {
        if (pat.test(text)) return btn;
      }
    }
    return null;
  }

  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}

if (typeof window !== 'undefined') {
  window.LinkedInPlatform = LinkedInPlatform;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LinkedInPlatform;
}
