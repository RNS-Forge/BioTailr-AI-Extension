/**
 * BioTailr AI - Indeed Platform Adapter
 * High-speed Indeed Apply form filler & runner.
 */

class IndeedPlatform extends BasePlatform {
  constructor() {
    super('Indeed');
  }

  detect(url, doc = document) {
    const target = (url || window.location.href || '').toLowerCase();
    return target.includes('indeed.com') || Boolean(doc.querySelector('#indeedApplyButton, .jobsearch-JobComponent, .ia-Container, #jobDescriptionText'));
  }

  canApply(doc = document) {
    const btn = doc.querySelector([
      '#indeedApplyButton',
      'button[id*="indeedApply"]',
      'button.ia-IndeedApplyButton',
      'button[data-gnav-element-name="applyButton"]',
      '.jobsearch-IndeedApplyButton-contentWrapper button'
    ].join(', '));

    if (btn) return { canApply: true, button: btn };

    const genericApply = doc.querySelector('#applyButtonLinkContainer a, .jobsearch-ApplyButtonContainer a');
    if (genericApply) {
      return { canApply: false, reason: 'External application on company website' };
    }
    return { canApply: false, reason: 'Apply button not found on this Indeed listing' };
  }

  async executeFastApply(context, resumeBlob, onStatus = () => {}) {
    onStatus('⚡ [Indeed] Checking for Indeed Apply button...');
    const check = this.canApply(document);
    if (!check.canApply) {
      onStatus(`❌ [Indeed] ${check.reason}`);
      return { success: false, reason: check.reason };
    }

    onStatus('⚡ [Indeed] Launching Indeed Apply...');
    check.button.click();

    // Fast loop to detect modal/container or iframe
    let stepCount = 0;
    const maxSteps = 12;

    while (stepCount < maxSteps) {
      stepCount++;
      await this.sleep(120);

      // Check for main application container or iframe document
      const container = document.querySelector('.ia-BasePage, .ia-Container, #indeedapply-modal') || document.body;
      const filled = this.fillVisibleFields(container, context, resumeBlob);

      onStatus(`⚡ [Indeed] Step ${stepCount}: Fast-filled ${filled} fields...`);

      // Find submit or continue button
      const submitBtn = this.findButtonByText(container, [/submit your application/i, /^submit$/i]);
      if (submitBtn) {
        onStatus('⚡ [Indeed] Submitting application...');
        submitBtn.click();
        onStatus('✅ [Indeed] Application submitted successfully!');
        return { success: true, status: 'submitted', steps: stepCount };
      }

      const continueBtn = this.findButtonByText(container, [/continue/i, /^next$/i, /review your application/i]);
      if (continueBtn) {
        continueBtn.click();
        continue;
      }

      break;
    }

    onStatus('✅ [Indeed] Step completed. Check application screen.');
    return { success: true, status: 'completed' };
  }

  findButtonByText(container, patterns) {
    const buttons = Array.from(container.querySelectorAll('button:not([disabled]), input[type="submit"]'));
    for (const btn of buttons) {
      const text = (btn.innerText || btn.value || btn.getAttribute('aria-label') || '').trim();
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
  window.IndeedPlatform = IndeedPlatform;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = IndeedPlatform;
}
