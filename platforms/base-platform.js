/**
 * BioTailr AI - Base Platform Adapter
 * Abstract foundation for high-speed automated job application runners.
 */

class BasePlatform {
  constructor(name) {
    this.name = name;
  }

  /**
   * Check if current page belongs to this platform
   */
  detect(url, doc) {
    throw new Error('detect() must be implemented by subclass');
  }

  /**
   * Check if Fast / Easy Apply is available on current page
   */
  canApply(doc) {
    throw new Error('canApply() must be implemented by subclass');
  }

  /**
   * Fast element waiter with polling (no long delays)
   */
  async waitForElement(selector, timeoutMs = 3000, intervalMs = 60, root = document) {
    const startTime = Date.now();
    return new Promise((resolve) => {
      const check = () => {
        const el = root.querySelector(selector);
        if (el) return resolve(el);
        if (Date.now() - startTime >= timeoutMs) return resolve(null);
        setTimeout(check, intervalMs);
      };
      check();
    });
  }

  /**
   * Fast wait for any of multiple selectors
   */
  async waitForAnyElement(selectors, timeoutMs = 3000, intervalMs = 60, root = document) {
    const startTime = Date.now();
    return new Promise((resolve) => {
      const check = () => {
        for (const sel of selectors) {
          const el = root.querySelector(sel);
          if (el) return resolve({ el, selector: sel });
        }
        if (Date.now() - startTime >= timeoutMs) return resolve({ el: null, selector: null });
        setTimeout(check, intervalMs);
      };
      check();
    });
  }

  /**
   * Check if an element is currently visible on the page
   */
  isElementVisible(el) {
    if (!el) return false;
    const style = (typeof window !== 'undefined' && window.getComputedStyle) ? window.getComputedStyle(el) : el.style;
    if (style && (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0')) return false;
    return (el.offsetWidth > 0 || el.offsetHeight > 0 || (el.getClientRects && el.getClientRects().length > 0));
  }

  /**
   * Fill all visible interactive fields in a container using FastFormSolver
   */
  fillVisibleFields(container, context, resumeBlob) {
    const solver = window.FastFormSolver || (typeof FastFormSolver !== 'undefined' ? FastFormSolver : null);
    if (!solver) return 0;

    let filledCount = 0;
    const inputs = container.querySelectorAll('input:not([type="hidden"]), select, textarea');

    inputs.forEach((input) => {
      const type = (input.getAttribute('type') || '').toLowerCase();
      const isFile = type === 'file';
      if (!isFile && !this.isElementVisible(input)) return;

      if (isFile && resumeBlob) {
        const attached = solver.attachPdfBlob(input, resumeBlob, `${context.personal?.fullName || 'Candidate'}_Resume_ATS100.pdf`);
        if (attached) filledCount++;
      } else {
        const filled = solver.fillElement(input, context);
        if (filled) filledCount++;
      }
    });

    return filledCount;
  }

  /**
   * Fast sleep utility (no long humanized throttling)
   */
  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  /**
   * Search container for visible interactive button matching regex patterns
   */
  findButtonByText(container, patterns) {
    if (!container) return null;
    const buttons = Array.from(container.querySelectorAll('button:not([disabled]), input[type="submit"]:not([disabled]), a[role="button"]:not([disabled])'));
    for (const btn of buttons) {
      if (!this.isElementVisible(btn)) continue;
      const text = (btn.innerText || btn.value || btn.getAttribute('aria-label') || '').trim();
      for (const pat of patterns) {
        if (pat.test(text)) return btn;
      }
    }
    return null;
  }

  async executeFastApply(context, resumeBlob, onStatus) {
    throw new Error('executeFastApply() must be implemented by subclass');
  }
}

if (typeof window !== 'undefined') {
  window.BasePlatform = BasePlatform;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BasePlatform;
}
