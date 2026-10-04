/**
 * BioTailr AI - Lever Platform Adapter
 * Fast application filler for Lever job postings.
 */

class LeverPlatform extends BasePlatform {
  constructor() {
    super('Lever');
  }

  detect(url, doc = document) {
    const host = window.location.hostname.toLowerCase();
    return host.includes('lever.co') || Boolean(doc.querySelector('.application-form, .postings-btn-wrapper, form[action*="lever"]'));
  }

  canApply(doc = document) {
    const form = doc.querySelector('.application-form, form[id*="application"], form[action*="lever"]');
    if (form) return { canApply: true, form };
    const btn = doc.querySelector('.postings-btn[href*="apply"], a.template-btn-submit');
    if (btn) return { canApply: true, button: btn };
    return { canApply: false, reason: 'Lever application form not detected' };
  }

  async executeFastApply(context, resumeBlob, onStatus = () => {}) {
    onStatus('⚡ [Lever] Checking application form...');
    let form = document.querySelector('.application-form, form[id*="application"], form[action*="lever"]');

    if (!form) {
      const applyBtn = document.querySelector('.postings-btn[href*="apply"], a.template-btn-submit');
      if (applyBtn) {
        applyBtn.click();
        await this.waitForElement('.application-form, form', 2000, 50);
        form = document.querySelector('.application-form, form');
      }
    }

    if (!form) {
      onStatus('❌ [Lever] Application form not found.');
      return { success: false, reason: 'Form not found' };
    }

    onStatus('⚡ [Lever] Fast-filling candidate details & attaching resume...');
    const filled = this.fillVisibleFields(form, context, resumeBlob);
    onStatus(`⚡ [Lever] Auto-filled ${filled} fields!`);

    const submitBtn = form.querySelector('.template-btn-submit, button[type="submit"], input[type="submit"]');
    if (submitBtn) {
      onStatus('⚡ [Lever] Submitting application...');
      submitBtn.click();
      onStatus('✅ [Lever] Application submitted successfully!');
      return { success: true, status: 'submitted' };
    }

    onStatus('✅ [Lever] Form filled! Review & click Submit.');
    return { success: true, status: 'form_filled' };
  }
}

if (typeof window !== 'undefined') {
  window.LeverPlatform = LeverPlatform;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LeverPlatform;
}
