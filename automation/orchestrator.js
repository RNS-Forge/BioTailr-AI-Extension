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
   * Extract high-level job title, company, and location from page DOM
   * Supports Single-Page-Apps (LinkedIn, Indeed, etc.) where details update asynchronously.
   */
    extractJobInfo(doc = document) {
    let jobTitle = '';
    let companyName = '';
    let location = '';

    // 1. Target the active detail pane first (avoids selecting other cards in the list)
    const detailPane = doc.querySelector([
      '.jobs-search__job-details',
      '.jobs-details__main-content',
      '.job-view-layout',
      '.scaffold-layout__detail',
      '.job-details-jobs-unified-top-card',
      '#job-details'
    ].join(', ')) || doc;

    // 2. Extract Title from active detail container
    const titleCandidates = [
      '.job-details-jobs-unified-top-card__job-title',
      'h1.job-details-jobs-unified-top-card__job-title',
      'h2.job-details-jobs-unified-top-card__job-title',
      '.jobs-unified-top-card__job-title',
      'h1.t-24',
      'h2.t-24',
      '.jobs-details__main-content h1',
      '.jobs-details__main-content h2',
      '.job-view-layout h1',
      '.job-view-layout h2',
      'h1.top-card-layout__title',
      '.jobsearch-JobInfoHeader-title',
      '.app-title',
      'h1.posting-headline',
      '.posting-headline h2'
    ];

    for (const sel of titleCandidates) {
      const el = detailPane.querySelector(sel);
      if (el && el.innerText && el.innerText.trim().length > 1) {
        const text = el.innerText.trim();
        if (!text.toLowerCase().includes('search') && !text.toLowerCase().includes('jobs based on')) {
          jobTitle = text;
          break;
        }
      }
    }

    // Fallback A: Selected/active job card in the search results list (crucial for SPAs)
    if (!jobTitle) {
      const activeCardTitle = doc.querySelector([
        '.jobs-search-results-list__list-item--active .job-card-list__title',
        '.jobs-search-results-list__list-item--active [class*="job-card-list__title"]',
        '.jobs-search-results-list__list-item--active strong',
        'li.selected .job-card-list__title',
        'li.selected [class*="job-card-list__title"]',
        'li.selected strong',
        '[class*="job-card-container--clickable"][class*="active"] [class*="job-title"]',
        '[class*="job-card-container"][class*="active"] strong',
        '.jobs-search-results-list__list-item--active a[class*="job-card"]'
      ].join(', '));
      if (activeCardTitle && activeCardTitle.innerText.trim()) {
        jobTitle = activeCardTitle.innerText.trim();
      }
    }

    // Fallback B: Document title only if NOT on search/collections page
    const curUrl = (typeof window !== 'undefined' ? window.location.href : '').toLowerCase();
    const isSearchPage = curUrl.includes('/search') || curUrl.includes('/collections');
    if (!jobTitle && !isSearchPage && doc.title && doc.title.includes(' at ')) {
      const clean = doc.title.split(' at ')[0].replace(/^[\(\d\)\s]+/, '').trim();
      if (clean && !clean.toLowerCase().includes('feed') && !clean.toLowerCase().includes('search')) {
        jobTitle = clean;
      }
    }

    // 3. Extract Company from active detail container
    const companyCandidates = [
      '.job-details-jobs-unified-top-card__company-name a',
      '.job-details-jobs-unified-top-card__company-name',
      '.job-details-jobs-unified-top-card__primary-description-container a',
      '.jobs-unified-top-card__company-name a',
      '.jobs-unified-top-card__company-name',
      '.jobs-details__main-content a[href*="/company/"]',
      '.job-view-layout a[href*="/company/"]',
      'a.topcard__org-name-link',
      '[data-company-name="true"]',
      '.jobsearch-InlineCompanyRating-companyHeader',
      '.company-name',
      '.main-header .org-name'
    ];

    for (const sel of companyCandidates) {
      const el = detailPane.querySelector(sel);
      if (el && el.innerText && el.innerText.trim().length > 1) {
        companyName = el.innerText.trim();
        break;
      }
    }

    // Fallback A: Selected/active job card in search results list
    if (!companyName) {
      const activeCardComp = doc.querySelector([
        '.jobs-search-results-list__list-item--active .job-card-container__primary-description',
        '.jobs-search-results-list__list-item--active [class*="company"]',
        'li.selected .job-card-container__primary-description',
        'li.selected [class*="company"]',
        '[class*="job-card-container--active"] .job-card-container__primary-description'
      ].join(', '));
      if (activeCardComp && activeCardComp.innerText.trim()) {
        companyName = activeCardComp.innerText.trim();
      }
    }

    // Fallback B: Document title only if NOT on search/collections page
    if (!companyName && !isSearchPage && doc.title && doc.title.includes(' at ')) {
      const compPart = doc.title.split(' at ')[1].split('|')[0].split('-')[0].trim();
      if (compPart) companyName = compPart;
    }

    // 4. Extract Location
    const locCandidates = [
      '.job-details-jobs-unified-top-card__primary-description-container',
      '.jobs-unified-top-card__bullet',
      '.jobsearch-JobInfoHeader-companyLocation',
      '.location'
    ];

    for (const sel of locCandidates) {
      const el = detailPane.querySelector(sel);
      if (el && el.innerText) {
        location = el.innerText.replace(/\n/g, ' ').trim();
        break;
      }
    }

    return { jobTitle, companyName, location };
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
        location: info.location,
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
      location: info.location,
      reason: check.reason || ''
    };
  }

  /**
   * Run the high-speed Fast Apply flow
   */
  async runFastApply(context, resumeBlob, onProgress = () => {}) {
    const platform = this.getActivePlatform();
    if (!platform) {
      onProgress('No supported platform detected on this page.');
      return { success: false, reason: 'Unsupported platform' };
    }

    onProgress(`Starting Fast Auto Apply sequence on ${platform.name}...`);
    return await platform.executeFastApply(context, resumeBlob, onProgress);
  }
}

if (typeof window !== 'undefined') {
  window.AutoApplyOrchestrator = AutoApplyOrchestrator;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AutoApplyOrchestrator;
}
