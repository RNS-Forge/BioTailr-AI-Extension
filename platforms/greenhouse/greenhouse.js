/**
 * BioTailr AI - Greenhouse Platform Adapter
 * Fast application filler for Greenhouse job boards.
 */

class GreenhousePlatform extends BasePlatform {
  constructor() {
    super('Greenhouse');
  }

  detect(url, doc = document) {
    const target = (url || window.location.href || '').toLowerCase();
    return target.includes('greenhouse.io') || Boolean(doc.querySelector('#application_form, #grnhse_app, form[action*="greenhouse"]'));
  }

  canApply(doc = document) {
    const form = doc.querySelector('#application_form, form[id*="application"], form[action*="greenhouse"]');
    if (form) return { canApply: true, form };
    const btn = doc.querySelector('a[href*="#app"], a[href*="application"], .apply-button');
    if (btn) return { canApply: true, button: btn };
    return { canApply: false, reason: 'Greenhouse application form not detected' };
  }

  async executeFastApply(context, resumeBlob, onStatus = () => {}) {
    onStatus('⚡ [Greenhouse] Checking application form...');
    let form = document.querySelector('#application_form, form[id*="application"], form[action*="greenhouse"]');

    if (!form) {
      const applyBtn = document.querySelector('a[href*="#app"], a[href*="application"], .apply-button');
      if (applyBtn) {
        applyBtn.click();
        await this.waitForElement('#application_form, form', 2000, 50);
        form = document.querySelector('#application_form, form');
      }
    }

    if (!form) {
      onStatus('❌ [Greenhouse] Application form not found.');
      return { success: false, reason: 'Form not found' };
    }

    onStatus('⚡ [Greenhouse] Fast-filling fields & attaching resume...');
    const filled = this.fillVisibleFields(form, context, resumeBlob);
    onStatus(`⚡ [Greenhouse] Auto-filled ${filled} fields!`);

    const submitBtn = form.querySelector('#submit_app, button[type="submit"], input[type="submit"]');
    if (submitBtn) {
      onStatus('⚡ [Greenhouse] Submitting application...');
      submitBtn.click();
      onStatus('✅ [Greenhouse] Application submitted successfully!');
      return { success: true, status: 'submitted' };
    }

    onStatus('✅ [Greenhouse] Form filled! Review & click Submit.');
    return { success: true, status: 'form_filled' };
  }
}

if (typeof window !== 'undefined') {
  window.GreenhousePlatform = GreenhousePlatform;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GreenhousePlatform;
}
