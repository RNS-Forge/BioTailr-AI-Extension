/**
 * BioTailr AI - Y Combinator (Work at a Startup) Platform Adapter
 * Automated founder intro notes & application runner.
 */

class YCPlatform extends BasePlatform {
  constructor() {
    super('YCombinator');
  }

  detect(url, doc = document) {
    const target = (url || window.location.href || '').toLowerCase();
    return target.includes('workatastartup.com') || target.includes('ycombinator.com/jobs') || Boolean(doc.querySelector('.startup-header, .company-name-header, [data-testid="startup-apply"]'));
  }

  canApply(doc = document) {
    const btn = doc.querySelector([
      'button[data-testid="apply-button"]',
      'button:not([disabled])',
      'a.apply-button',
      '.btn-apply'
    ].join(', '));

    const applyBtns = Array.from(doc.querySelectorAll('button, a'));
    const matched = applyBtns.find(b => {
      const txt = (b.textContent || '').toLowerCase();
      return (txt.includes('apply to') || txt.includes('apply for') || txt.includes('apply now') || txt === 'apply') && !txt.includes('applied');
    });

    if (matched) return { canApply: true, button: matched };
    return { canApply: false, reason: 'Work at a Startup apply button not found' };
  }

  async executeFastApply(context, resumeBlob, onStatus = () => {}) {
    onStatus('⚡ [YC] Searching for founder application action...');
    const check = this.canApply(document);
    if (!check.canApply) {
      onStatus(`❌ [YC] ${check.reason}`);
      return { success: false, reason: check.reason };
    }

    onStatus('⚡ [YC] Opening application modal...');
    check.button.click();
    await this.sleep(200);

    const modal = document.querySelector('.modal-content, [role="dialog"], .application-form') || document.body;

    // Fill intro note to founders
    const noteArea = modal.querySelector('textarea');
    if (noteArea && !noteArea.value) {
      onStatus('⚡ [YC] Generating personalized founder pitch...');
      const role = context.targetRole || 'Engineer';
      noteArea.value = `Hi there! I am very excited about your mission and role as a ${role}. With my background in high-velocity product delivery and modern tech stacks, I'd love to contribute immediately.`;
      noteArea.dispatchEvent(new Event('input', { bubbles: true }));
      noteArea.dispatchEvent(new Event('change', { bubbles: true }));
    }

    this.fillVisibleFields(modal, context, resumeBlob);

    const submitBtn = this.findButtonByText(modal, [/send application/i, /submit application/i, /^apply$/i]);
    if (submitBtn) {
      onStatus('⚡ [YC] Sending application to founders...');
      submitBtn.click();
      onStatus('✅ [YC] Founder application submitted successfully!');
      return { success: true, status: 'submitted' };
    }

    onStatus('✅ [YC] Ready for review.');
    return { success: true, status: 'ready' };
  }
}

if (typeof window !== 'undefined') {
  window.YCPlatform = YCPlatform;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = YCPlatform;
}
