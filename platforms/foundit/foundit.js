/**
 * BioTailr AI - Foundit (Monster) Platform Adapter
 * Quick Apply automation and form solver.
 */

class FounditPlatform extends BasePlatform {
  constructor() {
    super('Foundit');
  }

  detect(url, doc = document) {
    const target = (url || window.location.href || '').toLowerCase();
    return target.includes('foundit.in') || target.includes('foundit.sg') || target.includes('monsterindia.com') || Boolean(doc.querySelector('.applyBtn, .cardContainer, [data-testid="quick-apply-btn"]'));
  }

  canApply(doc = document) {
    const btns = Array.from(doc.querySelectorAll('button, a'));
    const matched = btns.find(b => {
      const txt = (b.textContent || '').toLowerCase();
      return (txt.includes('quick apply') || txt.includes('apply now') || txt === 'apply') && !txt.includes('applied');
    });

    if (matched) return { canApply: true, button: matched };
    return { canApply: false, reason: 'Foundit Quick Apply button not found' };
  }

  async executeFastApply(context, resumeBlob, onStatus = () => {}) {
    onStatus('⚡ [Foundit] Checking for Quick Apply action...');
    const check = this.canApply(document);
    if (!check.canApply) {
      onStatus(`❌ [Foundit] ${check.reason}`);
      return { success: false, reason: check.reason };
    }

    onStatus('⚡ [Foundit] Launching Quick Apply modal...');
    check.button.click();

    let stepCount = 0;
    const maxSteps = 8;

    while (stepCount < maxSteps) {
      stepCount++;
      await this.sleep(150);

      const modal = document.querySelector('.modal-content, [role="dialog"], .quick-apply-modal') || document.body;
      const filled = this.fillVisibleFields(modal, context, resumeBlob);

      onStatus(`⚡ [Foundit] Step ${stepCount}: Fast-filled ${filled} fields...`);

      const submitBtn = this.findButtonByText(modal, [/submit/i, /complete application/i, /send application/i]);
      if (submitBtn && submitBtn !== check.button) {
        onStatus('⚡ [Foundit] Submitting application...');
        submitBtn.click();
        onStatus('✅ [Foundit] Application submitted successfully!');
        return { success: true, status: 'submitted', steps: stepCount };
      }

      const nextBtn = this.findButtonByText(modal, [/next/i, /continue/i]);
      if (nextBtn) {
        nextBtn.click();
        continue;
      }

      break;
    }

    onStatus('✅ [Foundit] Quick Apply processed.');
    return { success: true, status: 'applied', steps: stepCount };
  }
}

if (typeof window !== 'undefined') {
  window.FounditPlatform = FounditPlatform;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FounditPlatform;
}
