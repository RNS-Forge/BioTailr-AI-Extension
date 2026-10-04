/**
 * BioTailr AI - Auto Apply Orchestrator
 * Detects the active job platform and executes the fast application pipeline.
 */

class AutoApplyOrchestrator {
  constructor() {
    this.platforms = [
      new (window.LinkedInPlatform || LinkedInPlatform)(),
      new (window.IndeedPlatform || IndeedPlatform)(),
      new (window.GreenhousePlatform || GreenhousePlatform)(),
      new (window.LeverPlatform || LeverPlatform)()
    ];
  }

  /**
   * Find platform adapter matching current URL and DOM
   */
  getActivePlatform(url = window.location.href, doc = document) {
    for (const p of this.platforms) {
      if (p.detect(url, doc)) {
        return p;
      }
    }
    return null;
  }

  /**
   * Extract high-level job title and company from page DOM
   */
  extractJobInfo(doc = document) {
    let jobTitle = '';
    let companyName = '';

    const titleEl = doc.querySelector([
      '.job-details-jobs-unified-top-card__job-title',
      'h1.top-card-layout__title',
      '.jobs-unified-top-card__job-title',
      '.jobsearch-JobInfoHeader-title',
      '.app-title',
      'h1.posting-headline',
      '.posting-headline h2',
      'h1'
    ].join(', '));
    if (titleEl) jobTitle = titleEl.innerText.trim();

    const companyEl = doc.querySelector([
      '.job-details-jobs-unified-top-card__company-name',
      'a.topcard__org-name-link',
      '.jobs-unified-top-card__company-name',
      '[data-company-name="true"]',
      '.jobsearch-InlineCompanyRating-companyHeader',
      '.company-name',
      '.main-header .org-name'
    ].join(', '));
    if (companyEl) companyName = companyEl.innerText.trim();

    return { jobTitle, companyName };
  }

  /**
   * Get current platform apply capability
   */
  checkPlatformStatus(doc = document) {
    const platform = this.getActivePlatform(window.location.href, doc);
    const info = this.extractJobInfo(doc);

    if (!platform) {
      return {
        detected: false,
        platformName: 'Unsupported Platform',
        canApply: false,
        jobTitle: info.jobTitle,
        companyName: info.companyName,
        reason: 'Navigate to an active job listing on LinkedIn, Indeed, Greenhouse, or Lever.'
      };
    }

    const check = platform.canApply(doc);
    return {
      detected: true,
      platformName: platform.name,
      canApply: check.canApply,
      jobTitle: info.jobTitle,
      companyName: info.companyName,
      reason: check.reason || ''
    };
  }

  /**
   * Run the high-speed Fast Apply flow
   */
  async runFastApply(context, resumeBlob, onProgress = () => {}) {
    const platform = this.getActivePlatform();
    if (!platform) {
      onProgress('? No supported platform detected on this page.');
      return { success: false, reason: 'Unsupported platform' };
    }

    onProgress(`? Starting Fast Auto Apply on ${platform.name}...`);
    return await platform.executeFastApply(context, resumeBlob, onProgress);
  }
}

if (typeof window !== 'undefined') {
  window.AutoApplyOrchestrator = AutoApplyOrchestrator;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AutoApplyOrchestrator;
}
