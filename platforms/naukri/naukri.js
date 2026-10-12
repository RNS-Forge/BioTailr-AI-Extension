/**
 * BioTailr AI - Naukri Platform Adapter
 * High-speed Naukri Fast Apply form filler & runner.
 */

class NaukriPlatform extends BasePlatform {
  constructor() {
    super('Naukri');
  }

  detect(url, doc = document) {
    const target = (url || window.location.href || '').toLowerCase();
    return target.includes('naukri.com') || Boolean(doc.querySelector('#apply-button, .apply-button-container, .job-header-apply-button'));
  }

  canApply(doc = document) {
    const btn = doc.querySelector([
      '#apply-button',
      '.apply-button',
      'button.apply-button',
      'button[id*="apply"]',
      '.apply-btn'
    ].join(', '));

    if (btn) {
      const txt = (btn.textContent || '').toLowerCase();
      if (txt.includes('applied')) {
        return { canApply: false, reason: 'Already applied on Naukri' };
      }
      return { canApply: true, button: btn };
    }

    return { canApply: false, reason: 'Naukri Apply button not found' };
  }

  async executeFastApply(context, resumeBlob, onStatus = () => {}) {
    onStatus('⚡ [Naukri] Checking for Fast Apply button...');
    const check = this.canApply(document);
    if (!check.canApply) {
      onStatus(`❌ [Naukri] ${check.reason}`);
      return { success: false, reason: check.reason };
    }

    onStatus('⚡ [Naukri] Executing Fast Apply...');
    check.button.click();

    let stepCount = 0;
    const maxSteps = 10;

    while (stepCount < maxSteps) {
      stepCount++;
      await this.sleep(150);

      // Check for questionnaire / chatbot modal if present
      const modal = document.querySelector('.apply-message, .bot-container, .apply-modal, .chatbot') || document.body;
      const filled = this.fillVisibleFields(modal, context, resumeBlob);

      onStatus(`⚡ [Naukri] Step ${stepCount}: Fast-filled ${filled} fields...`);

      // Fill common Naukri questions (CTC, Notice Period)
      this.fillNaukriSpecifics(modal, context);

      const submitBtn = this.findButtonByText(modal, [/apply/i, /submit/i, /send/i, /confirm/i]);
      if (submitBtn && submitBtn !== check.button) {
        onStatus('⚡ [Naukri] Submitting final response...');
        submitBtn.click();
        onStatus('✅ [Naukri] Application completed successfully!');
        return { success: true, status: 'submitted', steps: stepCount };
      }

      const nextBtn = this.findButtonByText(modal, [/next/i, /continue/i, /proceed/i]);
      if (nextBtn) {
        nextBtn.click();
        continue;
      }

      break;
    }

    onStatus('✅ [Naukri] 1-Click Fast Apply registered.');
    return { success: true, status: 'applied', steps: stepCount };
  }

  fillNaukriSpecifics(root, context) {
    const inputs = root.querySelectorAll('input, select');
    inputs.forEach(el => {
      const label = (el.name || el.placeholder || el.id || '').toLowerCase();
      if (label.includes('ctc') || label.includes('salary')) {
        if (!el.value) {
          el.value = 'Competitive';
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      } else if (label.includes('notice')) {
        if (!el.value) {
          el.value = '15 Days / Immediate';
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    });
  }
}

if (typeof window !== 'undefined') {
  window.NaukriPlatform = NaukriPlatform;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NaukriPlatform;
}
