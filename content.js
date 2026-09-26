/**
 * BioTailr AI - Content Script Job Scanner
 * Intelligent DOM parser for job boards & corporate career sites.
 * Extracts Title, Company, Location, Compensation, Requirements, and Skills.
 */

// Listen for scan commands or job detection checks from popup/side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'CHECK_IF_JOB_PAGE') {
    try {
      const checkResult = checkIfJobPage();
      sendResponse({ success: true, ...checkResult });
    } catch (err) {
      sendResponse({ success: false, isJobPage: false, reason: err.message });
    }
    return true;
  }

  if (request.action === 'SCAN_JOB_PAGE') {
    try {
      const jobData = scanCurrentPage();
      sendResponse({ success: true, data: jobData });
    } catch (err) {
      console.error('BioTailr Job Scan Error:', err);
      sendResponse({ success: false, error: err.message });
    }
    return true;
  }
  return true;
});

/**
 * Intelligent Job Page Verification
 * Returns { isJobPage: boolean, source: string, titlePreview: string, companyPreview: string, reason: string }
 */
function checkIfJobPage() {
  const url = window.location.href.toLowerCase();
  const host = window.location.hostname.toLowerCase();

  // 1. Check for Schema.org JobPosting structured JSON-LD
  const jsonLd = extractJsonLdJob();
  if (jsonLd && jsonLd.title) {
    return {
      isJobPage: true,
      source: 'Verified Job Posting (Schema.org)',
      titlePreview: jsonLd.title,
      companyPreview: jsonLd.company || detectCompanyFromDomain()
    };
  }

  // 2. Specific Job Boards Verification
  if (host.includes('linkedin.com')) {
    if (url.includes('/messaging') || url.includes('/feed') || url.includes('/mynetwork') || url.includes('/notifications')) {
      return {
        isJobPage: false,
        source: url.includes('/messaging') ? 'LinkedIn Messaging' : 'LinkedIn Feed / Network',
        reason: 'This is not a job listing. Navigate to an active job posting on LinkedIn to scan.'
      };
    }
    const hasJobDetails = document.querySelector('.jobs-description') ||
                          document.querySelector('#job-details') ||
                          document.querySelector('.job-details-jobs-unified-top-card__job-title') ||
                          document.querySelector('.top-card-layout__title');
    if (url.includes('/jobs/') || hasJobDetails) {
      const title = getFirstText(['.job-details-jobs-unified-top-card__job-title', '.top-card-layout__title', 'h1']);
      const company = getFirstText(['.job-details-jobs-unified-top-card__company-name', '.topcard__flavor--black-link']);
      return {
        isJobPage: true,
        source: 'LinkedIn Job Posting',
        titlePreview: title || 'LinkedIn Job',
        companyPreview: company || 'Company'
      };
    }
    return {
      isJobPage: false,
      source: 'LinkedIn',
      reason: 'Open a specific job posting on LinkedIn to scan.'
    };
  }

  if (host.includes('indeed.com')) {
    const hasIndeedJob = document.querySelector('#jobDescriptionText') ||
                         document.querySelector('h1.jobsearch-JobInfoHeader-title') ||
                         document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"]');
    if (url.includes('viewjob') || url.includes('/rc/') || hasIndeedJob) {
      const title = getFirstText(['h1.jobsearch-JobInfoHeader-title', '[data-testid="jobsearch-JobInfoHeader-title"]', 'h1']);
      const company = getFirstText(['[data-testid="inlineHeader-companyName"]', '.jobsearch-CompanyInfoContainer a']);
      return {
        isJobPage: true,
        source: 'Indeed Job Posting',
        titlePreview: title || 'Indeed Job',
        companyPreview: company || 'Company'
      };
    }
  }

  if (host.includes('greenhouse.io')) {
    const hasGreenhouse = document.querySelector('.app-title') || document.querySelector('#content');
    if (hasGreenhouse || host.includes('boards.greenhouse.io')) {
      const title = getFirstText(['.app-title', 'h1']);
      return {
        isJobPage: true,
        source: 'Greenhouse Career Portal',
        titlePreview: title || 'Greenhouse Job',
        companyPreview: detectCompanyFromDomain()
      };
    }
  }

  if (host.includes('lever.co')) {
    const hasLever = document.querySelector('.posting-headline') || document.querySelector('.posting-sections');
    if (hasLever || host.includes('jobs.lever.co')) {
      const title = getFirstText(['.posting-headline h2', 'h2']);
      return {
        isJobPage: true,
        source: 'Lever Career Posting',
        titlePreview: title || 'Lever Job',
        companyPreview: detectCompanyFromDomain()
      };
    }
  }

  if (host.includes('myworkdayjobs.com') || host.includes('workday.com')) {
    const hasWorkday = document.querySelector('[data-automation-id="jobPostingHeader"]') ||
                       document.querySelector('[data-automation-id="jobPostingDescription"]');
    if (hasWorkday || url.includes('/job/')) {
      const title = getFirstText(['[data-automation-id="jobPostingHeader"]', 'h1', 'h2']);
      return {
        isJobPage: true,
        source: 'Workday Job Posting',
        titlePreview: title || 'Workday Job',
        companyPreview: detectCompanyFromDomain()
      };
    }
  }

  if (host.includes('wellfound.com') || host.includes('angel.co')) {
    if (url.includes('/jobs/') || document.querySelector('[class*="job-description"]')) {
      const title = getFirstText(['h1', '[class*="styles_title"]']);
      return {
        isJobPage: true,
        source: 'Wellfound Job Listing',
        titlePreview: title || 'Wellfound Job',
        companyPreview: detectCompanyFromDomain()
      };
    }
  }

  if (host.includes('glassdoor.com')) {
    if (url.includes('/job-listing/') || url.includes('/job/') || document.querySelector('#JobDescriptionContainer')) {
      const title = getFirstText(['[data-test="job-title"]', 'h1']);
      return {
        isJobPage: true,
        source: 'Glassdoor Job Listing',
        titlePreview: title || 'Glassdoor Job',
        companyPreview: detectCompanyFromDomain()
      };
    }
  }

  // 3. Generic Career Page Verification
  const jobUrlTokens = ['/job/', '/jobs/', '/career/', '/careers/', '/position/', '/positions/', '/opening/', '/openings/', '/apply/'];
  const hasJobUrl = jobUrlTokens.some(token => url.includes(token));

  // Check DOM markers: Heading + Description block or Apply button
  const bodyText = (document.body ? document.body.innerText : '').toLowerCase();
  const hasKeywords = (bodyText.includes('requirement') || bodyText.includes('qualification') || bodyText.includes('responsibilit')) &&
                      (bodyText.includes('apply') || bodyText.includes('job description') || bodyText.includes('role overview'));

  const hasApplyBtn = document.querySelector('a[href*="apply"], button[class*="apply"], input[value*="Apply"], [data-qa*="apply"]');

  if ((hasJobUrl && hasKeywords) || (hasApplyBtn && hasKeywords)) {
    const title = getFirstText(['h1', 'h2']);
    return {
      isJobPage: true,
      source: 'Career Opportunity',
      titlePreview: title || 'Career Opportunity',
      companyPreview: detectCompanyFromDomain()
    };
  }

  // Not a verified job page
  return {
    isJobPage: false,
    source: 'Non-Job Webpage',
    reason: 'Active tab is not a recognized job listing or career page.'
  };
}

function scanCurrentPage() {
  const url = window.location.href;
  const host = window.location.hostname.toLowerCase();

  // 1. Try structured Schema.org JSON-LD (often the most accurate)
  const jsonLdJob = extractJsonLdJob();

  // 2. Specialized site scrapers
  let siteData = {};
  let detectedSource = 'General Webpage';

  if (host.includes('linkedin.com')) {
    detectedSource = 'LinkedIn';
    siteData = extractLinkedIn();
  } else if (host.includes('indeed.com')) {
    detectedSource = 'Indeed';
    siteData = extractIndeed();
  } else if (host.includes('greenhouse.io')) {
    detectedSource = 'Greenhouse';
    siteData = extractGreenhouse();
  } else if (host.includes('lever.co')) {
    detectedSource = 'Lever';
    siteData = extractLever();
  } else if (host.includes('myworkdayjobs.com') || host.includes('workday.com')) {
    detectedSource = 'Workday';
    siteData = extractWorkday();
  } else if (host.includes('wellfound.com') || host.includes('angel.co')) {
    detectedSource = 'Wellfound';
    siteData = extractWellfound();
  } else if (host.includes('glassdoor.com')) {
    detectedSource = 'Glassdoor';
    siteData = extractGlassdoor();
  }

  // 3. Fallback generic extraction
  const genericData = extractGeneric();

  // Merge with priority: Site Specific > JSON-LD > Generic
  const title = cleanText(siteData.title || jsonLdJob.title || genericData.title || 'Job Listing');
  const company = cleanText(siteData.company || jsonLdJob.company || genericData.company || detectCompanyFromDomain());
  const location = cleanText(siteData.location || jsonLdJob.location || genericData.location || 'Location Not Specified');
  const rawDescription = siteData.description || jsonLdJob.description || genericData.description || '';
  const cleanDescription = cleanHtmlToPlainText(rawDescription);

  // 4. Extract bullet points (Responsibilities & Requirements)
  const bullets = extractBullets(rawDescription);

  // 5. Intelligent Keyword / Skill Extraction
  const extractedSkills = extractKeywords(cleanDescription);

  // 6. Experience level & job type detection
  const employmentType = detectEmploymentType(cleanDescription, jsonLdJob.employmentType);
  const experienceLevel = detectExperienceLevel(title, cleanDescription);
  const salary = siteData.salary || jsonLdJob.salary || detectSalary(cleanDescription);

  return {
    url,
    detectedSource,
    title,
    company,
    location,
    salary,
    employmentType,
    experienceLevel,
    extractedSkills,
    keyRequirements: bullets.requirements,
    keyResponsibilities: bullets.responsibilities,
    descriptionPreview: cleanDescription.slice(0, 450) + (cleanDescription.length > 450 ? '...' : ''),
    fullDescriptionText: cleanDescription,
    scannedAt: new Date().toISOString()
  };
}

/* =========================================================
   Schema.org JSON-LD Extractor
   ========================================================= */
function extractJsonLdJob() {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script.innerText);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item['@type'] === 'JobPosting') {
          return {
            title: item.title,
            company: item.hiringOrganization?.name || '',
            location: formatJsonLdLocation(item.jobLocation),
            description: item.description || '',
            employmentType: item.employmentType || '',
            salary: formatJsonLdSalary(item.baseSalary)
          };
        }
      }
    } catch (e) {
      // Ignore parse errors from unrelated JSON-LD
    }
  }
  return {};
}

function formatJsonLdLocation(loc) {
  if (!loc) return '';
  if (typeof loc === 'string') return loc;
  if (Array.isArray(loc)) return loc.map(formatJsonLdLocation).filter(Boolean).join('; ');
  const addr = loc.address;
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  const parts = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean);
  return parts.join(', ');
}

function formatJsonLdSalary(sal) {
  if (!sal) return '';
  if (typeof sal === 'string') return sal;
  const val = sal.value;
  if (!val) return '';
  if (typeof val === 'number') return `${sal.currency || '$'}${val}`;
  if (val.minValue && val.maxValue) {
    return `${sal.currency || '$'}${val.minValue} - ${sal.currency || '$'}${val.maxValue} (${val.unitText || 'YEAR'})`;
  }
  return '';
}

/* =========================================================
   Specialized Platform Extractors
   ========================================================= */
function extractLinkedIn() {
  const title = getFirstText([
    '.job-details-jobs-unified-top-card__job-title',
    '.jobs-unified-top-card__job-title',
    '.top-card-layout__title',
    'h1.t-24',
    '.jobs-details__main-content h1'
  ]);

  const company = getFirstText([
    '.job-details-jobs-unified-top-card__company-name a',
    '.job-details-jobs-unified-top-card__company-name',
    '.jobs-unified-top-card__company-name a',
    '.jobs-unified-top-card__company-name',
    '.topcard__flavor--black-link',
    '.topcard__flavor'
  ]);

  const location = getFirstText([
    '.job-details-jobs-unified-top-card__primary-description-container .tvm__text',
    '.jobs-unified-top-card__bullet',
    '.topcard__flavor--bullet',
    '.job-details-jobs-unified-top-card__workplace-type'
  ]);

  const descEl = document.querySelector('.jobs-description__content') ||
                 document.querySelector('#job-details') ||
                 document.querySelector('.jobs-box__html-content') ||
                 document.querySelector('.show-more-less-html__markup');

  const salary = getFirstText([
    '.job-details-jobs-unified-top-card__job-insight:has(svg[data-test-icon*="money"])',
    '.compensation__salary'
  ]);

  return {
    title,
    company,
    location,
    salary,
    description: descEl ? descEl.innerHTML : ''
  };
}

function extractIndeed() {
  const title = getFirstText([
    'h1.jobsearch-JobInfoHeader-title',
    '[data-testid="jobsearch-JobInfoHeader-title"]',
    'h1'
  ]);

  const company = getFirstText([
    '[data-testid="inlineHeader-companyName"]',
    '[data-company-name="true"]',
    '.jobsearch-CompanyInfoContainer a'
  ]);

  const location = getFirstText([
    '[data-testid="jobsearch-JobInfoHeader-companyLocation"]',
    '#jobLocationText',
    '.jobsearch-JobInfoHeader-companyLocation'
  ]);

  const salary = getFirstText([
    '#salaryInfoAndJobType',
    '[data-testid="attribute_snippets_section"]'
  ]);

  const descEl = document.querySelector('#jobDescriptionText');

  return {
    title,
    company,
    location,
    salary,
    description: descEl ? descEl.innerHTML : ''
  };
}

function extractGreenhouse() {
  const title = getFirstText(['.app-title', 'h1.heading', 'h1']);
  const company = getFirstText(['.company-name', '.company', 'meta[property="og:site_name"]']);
  const location = getFirstText(['.location', '.body--metadata']);
  const descEl = document.querySelector('#content') || document.querySelector('.content');

  return {
    title,
    company,
    location,
    description: descEl ? descEl.innerHTML : ''
  };
}

function extractLever() {
  const title = getFirstText(['.posting-headline h2', 'h2.posting-title', 'h2']);
  const location = getFirstText(['.posting-categories .location', '.sort-by-time']);
  const company = document.querySelector('.main-header-logo img')?.getAttribute('alt') || '';
  const descEl = document.querySelector('.posting-sections') || document.querySelector('[data-qa="job-description"]');

  return {
    title,
    company,
    location,
    description: descEl ? descEl.innerHTML : ''
  };
}

function extractWorkday() {
  const title = getFirstText(['[data-automation-id="jobPostingHeader"]', 'h2.css-1q2dra3', 'h1']);
  const company = getFirstText(['[data-automation-id="organization"]']);
  const location = getFirstText(['[data-automation-id="locations"]', '[data-automation-id="jobPostingLocation"]']);
  const descEl = document.querySelector('[data-automation-id="jobPostingDescription"]');

  return {
    title,
    company,
    location,
    description: descEl ? descEl.innerHTML : ''
  };
}

function extractWellfound() {
  const title = getFirstText(['h1', '[class*="styles_title"]']);
  const company = getFirstText(['[class*="styles_companyName"]', '[class*="companyName"]']);
  const location = getFirstText(['[class*="styles_location"]', '[class*="location"]']);
  const descEl = document.querySelector('[class*="styles_description"]') || document.querySelector('[class*="job-description"]');

  return {
    title,
    company,
    location,
    description: descEl ? descEl.innerHTML : ''
  };
}

function extractGlassdoor() {
  const title = getFirstText(['[data-test="job-title"]', 'h1']);
  const company = getFirstText(['[data-test="employer-name"]']);
  const location = getFirstText(['[data-test="job-location"]']);
  const descEl = document.querySelector('#JobDescriptionContainer') || document.querySelector('.jobDescriptionContent');

  return {
    title,
    company,
    location,
    description: descEl ? descEl.innerHTML : ''
  };
}

/* =========================================================
   Generic / Fallback Page Extractor
   ========================================================= */
function extractGeneric() {
  // Title
  let title = '';
  const h1 = document.querySelector('h1');
  if (h1 && h1.innerText.trim().length > 3 && h1.innerText.trim().length < 90) {
    title = h1.innerText.trim();
  } else {
    title = document.title.split(/[-–—|•]/)[0].trim();
  }

  // Company
  let company = '';
  const ogSite = document.querySelector('meta[property="og:site_name"]')?.getAttribute('content');
  if (ogSite) {
    company = ogSite;
  }

  // Main Text / Description Container
  const candidates = [
    'main',
    'article',
    '[role="main"]',
    '#content',
    '.job-description',
    '.job-details',
    '.description'
  ];

  let bestEl = null;
  let maxLen = 0;

  for (const selector of candidates) {
    const el = document.querySelector(selector);
    if (el) {
      const len = el.innerText.length;
      if (len > maxLen && len > 200) {
        maxLen = len;
        bestEl = el;
      }
    }
  }

  if (!bestEl) {
    bestEl = document.body;
  }

  return {
    title,
    company,
    location: '',
    description: bestEl ? bestEl.innerHTML : ''
  };
}

/* =========================================================
   Helper Extractors: Bullets, Keywords, Attributes
   ========================================================= */
function extractBullets(htmlString) {
  if (!htmlString) return { requirements: [], responsibilities: [] };

  const div = document.createElement('div');
  div.innerHTML = htmlString;

  const requirements = [];
  const responsibilities = [];

  const headers = div.querySelectorAll('h2, h3, h4, h5, strong, b, p');

  headers.forEach(h => {
    const text = h.innerText.toLowerCase();
    const isReq = text.includes('requirement') || text.includes('qualification') || text.includes('skills') || text.includes('who you are') || text.includes('what you bring') || text.includes('must have');
    const isResp = text.includes('responsibilit') || text.includes('what you will do') || text.includes('what you’ll do') || text.includes('the role') || text.includes('duties');

    if (isReq || isResp) {
      // Find following UL or OL
      let next = h.nextElementSibling;
      while (next && !['H2', 'H3', 'H4', 'H5'].includes(next.tagName)) {
        if (next.tagName === 'UL' || next.tagName === 'OL') {
          const items = Array.from(next.querySelectorAll('li')).map(li => cleanText(li.innerText)).filter(t => t.length > 10);
          if (isReq) requirements.push(...items);
          if (isResp) responsibilities.push(...items);
          break;
        }
        next = next.nextElementSibling;
      }
    }
  });

  // Fallback: If no categorized headers found, extract general list items
  if (requirements.length === 0 && responsibilities.length === 0) {
    const allLis = Array.from(div.querySelectorAll('li'))
      .map(li => cleanText(li.innerText))
      .filter(t => t.length > 20 && t.length < 280)
      .slice(0, 8);

    requirements.push(...allLis.slice(0, 4));
    responsibilities.push(...allLis.slice(4));
  }

  return {
    requirements: requirements.slice(0, 6),
    responsibilities: responsibilities.slice(0, 6)
  };
}

function extractKeywords(text) {
  if (!text) return [];

  const knownTech = [
    'Python', 'JavaScript', 'TypeScript', 'React', 'React.js', 'Node.js', 'Express',
    'C#', '.NET', 'ASP.NET', 'Java', 'C++', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB',
    'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'REST APIs', 'GraphQL',
    'LangChain', 'LangGraph', 'Agentic AI', 'PyTorch', 'TensorFlow', 'LLMs', 'RAG',
    'Git', 'CI/CD', 'Linux', 'Microservices', 'FastAPI', 'Django', 'Next.js',
    'Tailwind CSS', 'Redux', 'Kafka', 'Redis', 'JMeter', 'Lighthouse',
    'ISO 9001', 'Cpk', 'PPAP', 'Quality Control', 'Vernier Calipers', 'Micrometers',
    'Business Analysis', 'BRD', 'FRD', 'CRM', 'Salesforce', 'Jira', 'Agile', 'Scrum'
  ];

  const found = new Set();
  const lower = text.toLowerCase();

  knownTech.forEach(tech => {
    const pattern = new RegExp(`\\b${escapeRegExp(tech.toLowerCase())}\\b`, 'i');
    if (pattern.test(lower)) {
      found.add(tech);
    }
  });

  return Array.from(found).slice(0, 15);
}

function detectEmploymentType(text, ldType) {
  if (ldType) {
    if (typeof ldType === 'string') return ldType.replace('_', ' ');
    if (Array.isArray(ldType)) return ldType.join(', ');
  }
  const t = text.toLowerCase();
  if (t.includes('full-time') || t.includes('full time')) return 'Full-Time';
  if (t.includes('part-time') || t.includes('part time')) return 'Part-Time';
  if (t.includes('contract') || t.includes('contractor')) return 'Contract';
  if (t.includes('intern') || t.includes('internship')) return 'Internship';
  return 'Full-Time';
}

function detectExperienceLevel(title, text) {
  const t = (title + ' ' + text).toLowerCase();
  if (t.includes('principal') || t.includes('director') || t.includes('staff')) return 'Staff / Principal';
  if (t.includes('senior') || t.includes('sr.') || t.includes('lead')) return 'Senior Level';
  if (t.includes('mid') || t.includes('intermediate') || t.includes('2-4 years') || t.includes('3+ years')) return 'Mid Level';
  if (t.includes('junior') || t.includes('entry') || t.includes('associate') || t.includes('intern')) return 'Entry / Junior';
  return 'Mid-Senior Level';
}

function detectSalary(text) {
  const match = text.match(/\$[\d,]+(?:\s*-\s*\$[\d,]+)?(?:\s*(?:k|per year|yearly|\/yr|hr|\/hour))?/i);
  return match ? match[0] : '';
}

function detectCompanyFromDomain() {
  try {
    const host = window.location.hostname.replace('www.', '');
    const parts = host.split('.');
    if (parts.length >= 2) {
      const name = parts[0];
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  } catch (e) {}
  return '';
}

function cleanText(str) {
  if (!str) return '';
  return str.replace(/\s+/g, ' ').trim();
}

function cleanHtmlToPlainText(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.innerText.replace(/\s+/g, ' ').trim();
}

function getFirstText(selectors) {
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      if (el && el.innerText && el.innerText.trim().length > 0) {
        return el.innerText.trim();
      }
    } catch (e) {}
  }
  return '';
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
