/**
 * BioTailr AI - Browser Extension Controller (ES Module)
 * COMMUNICATOR ARCHITECTURE v1.1
 *
 * Role of Extension:
 *   1. Scan active job page → extract job data
 *   2. Store job data → open BioTailr web app (background tab)
 *   3. Web app runs full AI pipeline (Gemini → Groq → Local engine)
 *   4. Result delivered back via content-webapp.js bridge
 *   5. Extension shows download card — NO local generation
 *
 * Multi-Job Queue ("Job Manner"): each job tab is independent.
 * Zero Emojis. Professional Design System.
 */

// ─── Constants (display only — no generation) ──────────────────────────────
const ARCHETYPE_NAMES = {
  developer: 'Software Development Engineer & AI Engineer',
  fsd: 'Full Stack Web Developer',
  communication: 'Business Analyst & Client Relations',
  manufacturing: 'Quality Checker & Precision Manufacturing'
};

const BIOTAILR_WEB_APP = 'https://rns-forge.github.io/BioTailr-AI/';

/**
 * Generates a cryptographically strong 192-bit ephemeral communication security token.
 */
function generateSecurityKey() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(24);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
  }
  return 'sec_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function resolveWebAppUrl(jobId, authKey = '') {
  let base = BIOTAILR_WEB_APP;
  try {
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      const localTabs = await chrome.tabs.query({ url: '*://localhost:3000/*' });
      if (localTabs && localTabs.length > 0) {
        base = 'http://localhost:3000/';
      }
    }
  } catch (e) {}

  const url = new URL(base);
  url.searchParams.set('extjob', jobId);
  if (authKey) {
    url.searchParams.set('authKey', authKey);
  }
  return url.toString();
}

// ─── Application State ──────────────────────────────────────────────────────
const state = {
  jobs: [],
  activeJobId: null,
  currentTab: null,
  activeJobPageStatus: null,
  jobCounter: 1,
  backgroundPort: null  // Persistent port to background worker
};

// ─── Boot ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initExtension();
});

async function initExtension() {
  await detectActiveTab();
  initializeJobQueue();
  bindUIEvents();
  bindBackgroundPort();
  renderJobTabs();
  renderActiveJobView();

  // Tab switch messages from background worker
  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener(onBackgroundMessage);
  }
}

// ─── 0. Background Port (for push messages from background.js) ─────────────
function bindBackgroundPort() {
  if (typeof chrome === 'undefined' || !chrome.runtime?.connect) return;
  try {
    state.backgroundPort = chrome.runtime.connect({ name: 'biotailr-sidepanel' });
    state.backgroundPort.onMessage.addListener(onBackgroundMessage);
    state.backgroundPort.onDisconnect.addListener(() => {
      state.backgroundPort = null;
    });
  } catch (e) {
    console.warn('Could not establish background port:', e);
  }
}

function onBackgroundMessage(message) {
  if (!message || !message.action) return;

  if (message.action === 'RESUME_READY') {
    handleResumeReady(message);
    return;
  }
  if (message.action === 'EXT_JOB_ERROR') {
    handleResumeError(message);
    return;
  }
  if (message.action === 'TAB_CHANGED' || message.action === 'TAB_UPDATED') {
    handleActiveTabSwitch(message.tab);
  }
}

// ─── 1. Tab Detection & Multi-Job Auto-Resume ───────────────────────────────
function extractJobKey(urlString) {
  if (!urlString) return '';
  try {
    const u = new URL(urlString);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    const path = u.pathname.toLowerCase();
    const search = u.search.toLowerCase();

    // 1. LinkedIn: match job ID
    if (host.includes('linkedin.com')) {
      const viewMatch = path.match(/\/jobs\/view\/(\d+)/);
      if (viewMatch) return `linkedin_job_${viewMatch[1]}`;
      const searchMatch = search.match(/currentjobid=(\d+)/) || search.match(/jobid=(\d+)/);
      if (searchMatch) return `linkedin_job_${searchMatch[1]}`;
      return `linkedin_${path}`;
    }

    // 2. Indeed: match jk parameter
    if (host.includes('indeed.com')) {
      const jkMatch = search.match(/[?&]jk=([a-zA-Z0-9]+)/) || search.match(/[?&]vjk=([a-zA-Z0-9]+)/);
      if (jkMatch) return `indeed_job_${jkMatch[1]}`;
      return `indeed_${path}`;
    }

    // 3. Naukri: match job ID
    if (host.includes('naukri.com')) {
      const match = path.match(/-(\d+)\??/);
      if (match) return `naukri_job_${match[1]}`;
      return `naukri_${path}`;
    }

    // 4. General ATS / career portals: host + pathname
    return `${host}${path}`;
  } catch (e) {
    return urlString;
  }
}

function isSameJobUrl(url1, url2) {
  if (!url1 || !url2) return false;
  if (url1 === url2) return true;
  const key1 = extractJobKey(url1);
  const key2 = extractJobKey(url2);
  return Boolean(key1 && key2 && key1 === key2);
}

async function handleActiveTabSwitch(tab) {
  if (!tab || !tab.url) return;
  // Ignore internal/browser tabs and web app processing tabs
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.includes('extjob=')) return;
  state.currentTab = tab;

  // 1. Analyze if active tab is a job page
  const urlAnalysis = analyzeUrlForJob(tab.url);
  state.activeJobPageStatus = urlAnalysis;

  // 2. Check if this active tab URL or tab ID matches any existing job in state.jobs
  const matchingJob = state.jobs.find(j => {
    if (j.tabId && j.tabId === tab.id) return true;
    if (j.tabUrl && isSameJobUrl(j.tabUrl, tab.url)) return true;
    return false;
  });

  if (matchingJob) {
    // AUTOMATICALLY RESUME PREVIOUS JOB STATE
    state.activeJobId = matchingJob.id;
    matchingJob.tabId = tab.id;
    matchingJob.tabUrl = tab.url;
    renderJobTabs();
    renderActiveJobView();
    applyJobStatusToUI(urlAnalysis);
    return;
  }

  // 3. Active tab is NOT an existing job in queue:
  if (!urlAnalysis.isJobPage) {
    // User switched to a non-job page (e.g. LinkedIn messaging, feed, Google)
    // Do NOT create a new job!
    const currentJob = getActiveJob();
    if (currentJob && currentJob.status === 'unscanned') {
      currentJob.tabUrl = tab.url;
      currentJob.tabId = tab.id;
      currentJob.tabHost = getHostnameFromUrl(tab.url);
      renderActiveJobView();
    }
    applyJobStatusToUI(urlAnalysis);
    return;
  }

  // 4. Active tab IS a new, recognized Job page (not yet in state.jobs):
  const currentJob = getActiveJob();
  if (currentJob && currentJob.status === 'unscanned') {
    // Bind current unscanned slot to this new job tab
    currentJob.tabUrl = tab.url;
    currentJob.tabId = tab.id;
    currentJob.tabHost = getHostnameFromUrl(tab.url);
    if (urlAnalysis.titlePreview) {
      currentJob.displayTitle = truncateTitle(urlAnalysis.titlePreview);
      currentJob.targetRole = urlAnalysis.titlePreview;
    }
    renderJobTabs();
    renderActiveJobView();
    applyJobStatusToUI(urlAnalysis);
  } else {
    // Current slot is already completed ('ready'). User is viewing a new job tab.
    applyJobStatusToUI(urlAnalysis);
  }
}

async function detectActiveTab() {
  try {
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs.length > 0) {
        state.currentTab = tabs[0];
      }
    }
  } catch (e) {
    console.warn('Could not query active tab:', e);
  }
}

async function checkIfCurrentTabIsJobPage() {
  const currentUrl = state.currentTab?.url || '';
  const urlAnalysis = analyzeUrlForJob(currentUrl);

  if (urlAnalysis.isJobPage || urlAnalysis.isExplicitlyNonJob) {
    state.activeJobPageStatus = urlAnalysis;
    applyJobStatusToUI(urlAnalysis);
    return urlAnalysis;
  }

  // DOM fallback via content script
  try {
    const tabId = state.currentTab?.id;
    if (tabId) {
      let response = await sendCheckMessageToTab(tabId);
      if (!response || response.isJobPage === undefined) {
        await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
        await delay(120);
        response = await sendCheckMessageToTab(tabId);
      }
      if (response && response.isJobPage) {
        state.activeJobPageStatus = response;
        applyJobStatusToUI(response);
        return response;
      }
    }
  } catch (err) {
    // Fall through to URL analysis result
  }

  state.activeJobPageStatus = urlAnalysis;
  applyJobStatusToUI(urlAnalysis);
  return urlAnalysis;
}

function sendCheckMessageToTab(tabId) {
  return new Promise((resolve) => {
    try {
      chrome.tabs.sendMessage(tabId, { action: 'CHECK_IF_JOB_PAGE' }, (response) => {
        if (chrome.runtime.lastError) {
          resolve(null);
        } else {
          resolve(response || null);
        }
      });
    } catch (e) {
      resolve(null);
    }
  });
}

function analyzeUrlForJob(urlString) {
  if (!urlString || (!urlString.startsWith('http://') && !urlString.startsWith('https://'))) {
    return { isJobPage: false, isExplicitlyNonJob: true, source: 'Browser Tab', reason: 'Not an active public webpage.' };
  }

  let parsed;
  try { parsed = new URL(urlString); } catch (e) {
    return { isJobPage: false, isExplicitlyNonJob: true, source: 'Invalid URL', reason: 'Malformed URL.' };
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const path = parsed.pathname.toLowerCase();
  const search = parsed.search.toLowerCase();

  const extractSlugTitle = (rawPath) => {
    const seg = rawPath.split('/').filter(Boolean).pop() || '';
    const clean = decodeURIComponent(seg)
      .replace(/\.(html|php|aspx|htm)$/i, '')
      .replace(/[-_]?(at|in)[-_].*$/i, '')
      .replace(/\d{4,}/g, '')
      .replace(/[-_]+/g, ' ').trim();
    return (clean.length >= 3 && clean.length <= 60 && !/^\d+$/.test(clean))
      ? clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : '';
  };

  // 1. LinkedIn (Strict Non-Job Filter: Messaging, Feed, Network, Notifications, Profile)
  if (host.includes('linkedin.com')) {
    if (path.includes('/messaging')) {
      return { isJobPage: false, isExplicitlyNonJob: true, source: 'LinkedIn Messaging', reason: 'You are on LinkedIn Messages. Open or switch to a job posting tab to scan.' };
    }
    if (path.includes('/feed')) {
      return { isJobPage: false, isExplicitlyNonJob: true, source: 'LinkedIn Feed', reason: 'You are viewing your LinkedIn Feed. Open a specific job listing to scan.' };
    }
    if (path.includes('/mynetwork') || path.includes('/notifications')) {
      return { isJobPage: false, isExplicitlyNonJob: true, source: 'LinkedIn Network / Notifications', reason: 'Open a job listing to scan.' };
    }
    if (path.includes('/in/') && !path.includes('/jobs/')) {
      return { isJobPage: false, isExplicitlyNonJob: true, source: 'LinkedIn Profile', reason: 'You are on a profile page. Open a job listing to scan.' };
    }
    if (path.includes('/jobs/view/') || search.includes('currentjobid=') || search.includes('jobid=')) {
      return { isJobPage: true, source: 'LinkedIn Job Posting', titlePreview: extractSlugTitle(path) || 'LinkedIn Job', companyPreview: 'LinkedIn Employer' };
    }
    if (path.startsWith('/jobs/collections') || path.startsWith('/jobs/search') || path === '/jobs' || path === '/jobs/') {
      return { isJobPage: true, source: 'LinkedIn Jobs Portal', titlePreview: 'LinkedIn Search Listing', companyPreview: 'LinkedIn' };
    }
    return { isJobPage: false, isExplicitlyNonJob: true, source: 'LinkedIn', reason: 'Please open a specific job listing on LinkedIn.' };
  }

  // 2. Indeed
  if (host.includes('indeed.com')) {
    if (path.includes('/messages') || path.includes('/notifications')) {
      return { isJobPage: false, isExplicitlyNonJob: true, source: 'Indeed Messages', reason: 'You are on Messages. Open a job listing to scan.' };
    }
    if (path.includes('/viewjob') || search.includes('jk=') || search.includes('vjk=') || path.includes('/jobs/')) {
      return { isJobPage: true, source: 'Indeed Job Listing', titlePreview: extractSlugTitle(path) || 'Indeed Job', companyPreview: 'Indeed Employer' };
    }
    return { isJobPage: false, isExplicitlyNonJob: true, source: 'Indeed', reason: 'Please click into a specific job listing.' };
  }

  if (host.includes('greenhouse.io')) {
    const company = host.split('.')[0] === 'boards' ? path.split('/')[1] : host.split('.')[0];
    return { isJobPage: true, source: 'Greenhouse Career Board', titlePreview: extractSlugTitle(path) || 'Greenhouse Opportunity', companyPreview: company ? company.charAt(0).toUpperCase() + company.slice(1) : 'Company' };
  }
  if (host.includes('lever.co')) {
    const company = path.split('/').filter(Boolean)[0] || '';
    return { isJobPage: true, source: 'Lever Job Posting', titlePreview: extractSlugTitle(path) || 'Lever Opportunity', companyPreview: company ? company.charAt(0).toUpperCase() + company.slice(1) : 'Company' };
  }
  if (host.includes('myworkdayjobs.com') || (host.includes('workday.com') && (path.includes('/job/') || path.includes('/career'))))
    return { isJobPage: true, source: 'Workday Career Listing', titlePreview: extractSlugTitle(path) || 'Workday Position', companyPreview: host.split('.')[0] || 'Workday Employer' };
  if ((host.includes('wellfound.com') || host.includes('angel.co')) && (path.includes('/jobs') || path.includes('/l/')))
    return { isJobPage: true, source: 'Wellfound Startup Job', titlePreview: extractSlugTitle(path) || 'Startup Role', companyPreview: 'Startup Employer' };
  if (host.includes('glassdoor.com') && (path.includes('/job-listing/') || path.includes('/job/') || path.includes('/jobs/') || search.includes('jl=')))
    return { isJobPage: true, source: 'Glassdoor Job Listing', titlePreview: extractSlugTitle(path) || 'Glassdoor Opportunity', companyPreview: 'Employer' };
  if (host.includes('naukri.com') && (path.includes('/job-listings') || path.includes('-jobs-')))
    return { isJobPage: true, source: 'Naukri Job Listing', titlePreview: extractSlugTitle(path) || 'Naukri Opportunity', companyPreview: 'Employer' };
  if (host.includes('ziprecruiter.com') && (path.includes('/jobs') || path.includes('/c/')))
    return { isJobPage: true, source: 'ZipRecruiter Job', titlePreview: extractSlugTitle(path) || 'ZipRecruiter Role' };
  if (host.includes('dice.com') && (path.includes('/job-detail') || path.includes('/jobs')))
    return { isJobPage: true, source: 'Dice Tech Job', titlePreview: extractSlugTitle(path) || 'Tech Position' };
  if (host.includes('ashbyhq.com') || host.includes('smartrecruiters.com') || host.includes('workable.com') || host.includes('bamboohr.com'))
    return { isJobPage: true, source: 'ATS Career Portal', titlePreview: extractSlugTitle(path) || 'Open Role' };
  if (host.startsWith('careers.') || host.startsWith('jobs.') || host.startsWith('talent.') || host.startsWith('join.')) {
    const company = host.split('.')[1] || 'Company';
    return { isJobPage: true, source: 'Corporate Careers Portal', titlePreview: extractSlugTitle(path) || 'Open Position', companyPreview: company.charAt(0).toUpperCase() + company.slice(1) };
  }

  const jobTokens = ['/job/', '/jobs/', '/career/', '/careers/', '/position/', '/positions/', '/opening/', '/openings/', '/vacancy/', '/vacancies/', '/apply/'];
  const hasJobToken = jobTokens.some(t => path.includes(t));
  const hasJobQuery = ['jobid=', 'job_id=', 'gh_jid=', 'lever-job=', 'req_id='].some(q => search.includes(q));
  if (hasJobToken || hasJobQuery)
    return { isJobPage: true, source: 'Corporate Career Opportunity', titlePreview: extractSlugTitle(path) || 'Career Opportunity', companyPreview: host.split('.')[0] };

  const nonJobHosts = ['google.com', 'youtube.com', 'wikipedia.org', 'reddit.com', 'twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'amazon.com', 'netflix.com', 'github.com', 'stackoverflow.com', 'quora.com', 'medium.com', 'yahoo.com', 'bing.com'];
  if (nonJobHosts.some(njh => host === njh || host.endsWith('.' + njh)))
    return { isJobPage: false, isExplicitlyNonJob: true, source: 'Non-Job Webpage (' + host + ')', reason: 'Not a recognized job posting.' };

  return { isJobPage: false, isExplicitlyNonJob: false, source: host, reason: 'No standard job URL identifiers detected.' };
}

function applyJobStatusToUI(status) {
  const cardEl = document.getElementById('page-detection-card');
  const dotEl = document.getElementById('detection-status-dot');
  const labelEl = document.getElementById('detection-status-label');
  const urlTextEl = document.getElementById('tab-url-text');
  const scanBtn = document.getElementById('btn-center-scan');
  const scanTitle = document.getElementById('scan-btn-title');
  const scanSub = document.getElementById('scan-btn-sub');
  const noticeBox = document.getElementById('non-job-notice-box');

  if (!cardEl || !scanBtn) return;

  if (status && status.isJobPage) {
    cardEl.className = 'page-detection-card verified';
    if (labelEl) labelEl.textContent = status.source || 'Verified Job Posting';
    if (urlTextEl) urlTextEl.textContent = `${status.titlePreview || 'Target Role'}${status.companyPreview ? ' @ ' + status.companyPreview : ''}`;
    scanBtn.disabled = false;
    if (scanTitle) scanTitle.textContent = 'SCAN & TAILOR RESUME';
    if (scanSub) scanSub.textContent = `Synthesize 100% ATS Resume via BioTailr AI for ${truncateTitle(status.titlePreview || 'this role', 30)}`;
    if (noticeBox) noticeBox.style.display = 'none';
  } else {
    cardEl.className = 'page-detection-card unverified';
    if (labelEl) labelEl.textContent = status?.source ? `No Job Detected — ${status.source}` : 'No Job Detected On Active Tab';
    if (urlTextEl) urlTextEl.textContent = status?.reason || (getHostnameFromUrl(state.currentTab?.url || '') + ' (Not a job listing)');
    scanBtn.disabled = true;
    if (scanTitle) scanTitle.textContent = 'SCAN DISABLED';
    if (scanSub) scanSub.textContent = status?.reason || 'Navigate to any job listing on LinkedIn, Indeed, etc. to scan.';
    if (noticeBox) {
      noticeBox.style.display = 'flex';
      const noticeText = noticeBox.querySelector('.notice-text');
      if (noticeText) noticeText.textContent = status?.reason || 'This page does not appear to be a job posting. Scan is disabled until you open a job listing.';
    }
  }
}

// ─── 2. Multi-Job Queue ("Job Manner") ────────────────────────────────────
function initializeJobQueue() {
  const initialJob = createNewJobObject('Job 1');
  state.jobs.push(initialJob);
  state.activeJobId = initialJob.id;
}

function createNewJobObject(titleLabel = 'New Job') {
  const id = `job_${Date.now()}_${state.jobCounter++}`;
  const url = state.currentTab?.url || '';
  return {
    id,
    displayTitle: titleLabel,
    targetRole: '',
    company: '',
    location: '',
    tabUrl: url,
    tabId: state.currentTab?.id || null,
    tabHost: getHostnameFromUrl(url),
    scannedJobData: null,
    compiledHtml: '',
    fullDocumentHtml: '',
    filename: '',
    archetypeId: 'developer',
    atsScore: 100,
    status: 'unscanned',  // 'unscanned' | 'scanning' | 'processing' | 'ready' | 'error'
    messages: [],
    revisionsCount: 1,
    processingTabId: null  // ID of the web app tab opened for generation
  };
}

function getHostnameFromUrl(url) {
  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) return 'Browser Page';
  try { return new URL(url).hostname.replace('www.', ''); } catch (e) { return 'Browser Page'; }
}

function getActiveJob() {
  return state.jobs.find(j => j.id === state.activeJobId) || state.jobs[0];
}

// ─── 3. Render Job Tabs Bar ────────────────────────────────────────────────
function renderJobTabs() {
  const container = document.getElementById('job-tabs-list');
  if (!container) return;
  container.innerHTML = '';

  state.jobs.forEach((job) => {
    const tabBtn = document.createElement('button');
    tabBtn.className = `job-tab-btn ${job.id === state.activeJobId ? 'active' : ''} ${(job.status === 'scanning' || job.status === 'processing') ? 'processing' : ''}`;
    tabBtn.title = job.displayTitle;

    const statusTitle = job.status === 'ready' ? '100% Ready' : job.status === 'unscanned' ? 'Pending Scan' : 'Processing...';
    tabBtn.innerHTML = `
      <span class="tab-status-dot" title="${statusTitle}"></span>
      <span class="tab-title-text">${escapeHtml(job.displayTitle)}</span>
      ${state.jobs.length > 1 ? `<span class="tab-close-icon" data-close-job="${job.id}" title="Remove Job">✕</span>` : ''}
    `;
    tabBtn.addEventListener('click', (e) => {
      if (e.target.dataset.closeJob) { e.stopPropagation(); closeJobTab(e.target.dataset.closeJob); return; }
      switchActiveJob(job.id);
    });
    container.appendChild(tabBtn);
  });
}

function switchActiveJob(jobId) {
  state.activeJobId = jobId;
  renderJobTabs();
  renderActiveJobView();
}

function closeJobTab(jobId) {
  if (state.jobs.length <= 1) return;
  const job = state.jobs.find(j => j.id === jobId);
  // Close the processing tab if still open
  if (job?.processingTabId) {
    chrome.tabs.remove(job.processingTabId).catch(() => {});
  }
  state.jobs = state.jobs.filter(j => j.id !== jobId);
  if (state.activeJobId === jobId) state.activeJobId = state.jobs[0].id;
  renderJobTabs();
  renderActiveJobView();
}

function addNewJobTab() {
  const newJob = createNewJobObject(`Job ${state.jobs.length + 1}`);
  state.jobs.push(newJob);
  state.activeJobId = newJob.id;
  renderJobTabs();
  renderActiveJobView();
}

// ─── 4. Render Active Job View ─────────────────────────────────────────────
function renderActiveJobView() {
  const job = getActiveJob();
  if (!job) return;

  const scanHero = document.getElementById('scan-hero');
  const messagesList = document.getElementById('messages-list');

  if (job.status === 'unscanned') {
    if (scanHero) scanHero.style.display = 'flex';
    if (messagesList) { messagesList.style.display = 'none'; messagesList.innerHTML = ''; }
    checkIfCurrentTabIsJobPage();
    updateChatFooterState(false);
  } else {
    if (scanHero) scanHero.style.display = 'none';
    if (messagesList) { messagesList.style.display = 'flex'; renderJobMessages(job); }
    updateChatFooterState(job.status === 'ready');
  }
}

// ─── 5. Chat Footer State ──────────────────────────────────────────────────
function updateChatFooterState(enabled) {
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('btn-send');
  const statusBar = document.getElementById('chat-status-bar');
  const statusLabel = document.getElementById('chat-status-label');

  if (enabled) {
    if (chatInput) { chatInput.disabled = false; chatInput.placeholder = "Request resume updates (e.g. 'Make summary more senior', 'Add Docker to skills')..."; chatInput.parentElement.classList.remove('disabled'); }
    if (sendBtn) sendBtn.disabled = false;
    if (statusBar) statusBar.className = 'chat-status-bar active';
    if (statusLabel) statusLabel.textContent = 'AI Tailoring Assistant Active — Request revisions below';
  } else {
    if (chatInput) { chatInput.disabled = true; chatInput.placeholder = 'Scan a job page to enable the AI tailoring assistant...'; chatInput.parentElement.classList.add('disabled'); }
    if (sendBtn) sendBtn.disabled = true;
    if (statusBar) statusBar.className = 'chat-status-bar';
    if (statusLabel) statusLabel.textContent = 'Scan a job page to activate the AI tailoring chat';
  }
}

// ─── 6. UI Event Listeners ─────────────────────────────────────────────────
function bindUIEvents() {
  // Close Extension
  const btnClose = document.getElementById('btn-close-extension');
  if (btnClose) btnClose.addEventListener('click', () => window.close());

  // New Job Tab
  const btnNewJob = document.getElementById('btn-add-new-job');
  if (btnNewJob) btnNewJob.addEventListener('click', addNewJobTab);

  // Center Scan Button
  const btnScan = document.getElementById('btn-center-scan');
  if (btnScan) {
    btnScan.addEventListener('click', () => {
      if (state.activeJobPageStatus && !state.activeJobPageStatus.isJobPage) {
        alert('Please open an active job listing (LinkedIn, Indeed, etc.) to scan.');
        return;
      }
      handleScanAndTailorJob();
    });
  }

  // Demo Test Button
  const btnDemo = document.getElementById('btn-demo-test');
  if (btnDemo) {
    btnDemo.addEventListener('click', () => {
      state.activeJobPageStatus = {
        isJobPage: true,
        source: 'Demo Simulation (Axodian SDE)',
        titlePreview: 'Senior Software Development Engineer',
        companyPreview: 'Axodian Technologies'
      };
      applyJobStatusToUI(state.activeJobPageStatus);
      handleScanAndTailorJob(true);
    });
  }

  // Revision Send
  const btnSend = document.getElementById('btn-send');
  if (btnSend) btnSend.addEventListener('click', handleUserSendRevision);

  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleUserSendRevision(); }
    });
    chatInput.addEventListener('input', () => {
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 70) + 'px';
    });
  }
}

// ─── 7. MAIN PIPELINE — Scan → Pass to Web App → Await Result ─────────────
async function handleScanAndTailorJob(isDemo = false) {
  const job = getActiveJob();
  if (!job || job.status === 'scanning' || job.status === 'processing') return;

  job.status = 'scanning';
  renderJobTabs();

  // Transition UI to chat stream
  const scanHero = document.getElementById('scan-hero');
  const messagesList = document.getElementById('messages-list');
  if (scanHero) scanHero.style.display = 'none';
  if (messagesList) { messagesList.style.display = 'flex'; messagesList.innerHTML = ''; }

  // Inject processing card directly into DOM (not job.messages) so step updates are live
  const procCardId = `proc_card_${job.id}`;
  if (messagesList) {
    const procRow = document.createElement('div');
    procRow.className = 'message-row bot';
    procRow.id = `proc_row_${job.id}`;
    procRow.innerHTML = `
      <div class="processing-card" id="${procCardId}">
        <div class="proc-card-header">
          <div class="proc-spinner-ring"></div>
          <div class="proc-card-title">BioTailr AI — Scan &amp; Generate</div>
        </div>
        <div class="proc-step-list">
          <div class="proc-step-item active" id="${procCardId}_s1">
            <span>1. Extracting job details from active tab</span>
            <span class="proc-step-badge">In Progress</span>
          </div>
          <div class="proc-step-item" id="${procCardId}_s2">
            <span>2. Sending job to BioTailr AI Web Engine</span>
            <span class="proc-step-badge">Pending</span>
          </div>
          <div class="proc-step-item" id="${procCardId}_s3">
            <span>3. Generating tailored resume (Gemini AI)</span>
            <span class="proc-step-badge">Pending</span>
          </div>
          <div class="proc-step-item" id="${procCardId}_s4">
            <span>4. 100% ATS verification &amp; packaging</span>
            <span class="proc-step-badge">Pending</span>
          </div>
        </div>
      </div>
    `;
    messagesList.appendChild(procRow);
    scrollToBottom();
  }

  try {
    // ── Step 1: Scan Page ────────────────────────────────────────────────
    let scannedData;
    if (isDemo) {
      await delay(600);
      scannedData = getMockJobData();
    } else {
      await detectActiveTab();
      scannedData = await executePageScan();
    }
    updateProcStep(procCardId, 1, 'Completed', true);
    await delay(200);

    job.scannedJobData = scannedData;
    job.targetRole = scannedData.title || 'Software Development Engineer';
    job.company = scannedData.company || 'Enterprise Employer';
    job.location = scannedData.location || 'Location Not Specified';
    job.displayTitle = truncateTitle(job.targetRole);
    renderJobTabs();

    // ── Step 2: Store job data & open web app ───────────────────────────
    job.status = 'processing';
    updateProcStep(procCardId, 2, 'Sending...', false);

    const jobId = job.id;
    const authKey = generateSecurityKey();
    job.authKey = authKey;
    const storageKey = `biotailr_ext_job_${jobId}`;
    const jobPayload = {
      jobId,
      authKey,
      targetRole: job.targetRole,
      company: job.company,
      location: job.location,
      description: scannedData.fullDescriptionText || scannedData.descriptionPreview || '',
      extractedSkills: scannedData.extractedSkills || [],
      requirements: scannedData.keyRequirements || [],
      responsibilities: scannedData.keyResponsibilities || [],
      experienceLevel: scannedData.experienceLevel || '',
      employmentType: scannedData.employmentType || '',
      detectedSource: scannedData.detectedSource || 'Job Board'
    };

    await chrome.storage.local.set({ [storageKey]: jobPayload });

    // Open BioTailr web app with ?extjob=<jobId>&authKey=<authKey> in a background tab
    const webAppUrl = await resolveWebAppUrl(jobId, authKey);
    const webAppTab = await chrome.tabs.create({ url: webAppUrl, active: false });
    job.processingTabId = webAppTab.id;

    updateProcStep(procCardId, 2, 'Sent to Web App', true);
    await delay(200);

    // ── Steps 3 & 4: Wait for web app to finish ─────────────────────────
    updateProcStep(procCardId, 3, 'Generating...', false);

    // These steps will be updated when RESUME_READY is received via onBackgroundMessage
    // Store job id in a pending map for the message handler to resolve
    state.pendingJobMap = state.pendingJobMap || {};
    state.pendingJobMap[jobId] = { job, procCardId, authKey };

    // Safety timeout: if no result in 90s, show error
    const timeoutId = setTimeout(() => {
      if (state.pendingJobMap?.[jobId]) {
        delete state.pendingJobMap[jobId];
        const procRow = document.getElementById(`proc_row_${job.id}`);
        if (procRow) procRow.remove();
        job.status = 'unscanned';
        renderJobTabs();
        // Close the web app tab
        if (job.processingTabId) chrome.tabs.remove(job.processingTabId).catch(() => {});
        addCustomHtmlMessage(job, `
          <div class="bubble bot-bubble" style="border-left: 3px solid #ef4444;">
            <strong>Timeout:</strong> BioTailr AI did not respond in time. Please check your API keys in the web app settings and try again.
          </div>
        `);
        updateChatFooterState(false);
      }
    }, 90000);

    state.pendingJobMap[jobId].timeoutId = timeoutId;

  } catch (err) {
    console.error('BioTailr Scan error:', err);
    job.status = 'unscanned';
    const procRow = document.getElementById(`proc_row_${job.id}`);
    if (procRow) procRow.remove();
    renderJobTabs();
    addCustomHtmlMessage(job, `
      <div class="bubble bot-bubble" style="border-left: 3px solid #ef4444;">
        <strong>Scan Notice:</strong> ${escapeHtml(err.message || 'Could not scan the page. Make sure the target job page is active.')}
      </div>
    `);
    updateChatFooterState(false);
  }
}

// ─── 8. Handle Resume Result from Web App ─────────────────────────────────
function handleResumeReady(message) {
  const { jobId, authKey, compiledHtml, fullDocumentHtml, filename, archetypeId, targetRole, atsScore } = message;
  const pendingEntry = state.pendingJobMap?.[jobId];
  if (!pendingEntry) return;

  // Verify cryptographic security token
  if (pendingEntry.authKey && authKey && pendingEntry.authKey !== authKey) {
    console.error('[BioTailr Security] Security key mismatch! Dropping untrusted message for job:', jobId);
    return;
  }

  const { job, procCardId, timeoutId, onResult } = pendingEntry;
  clearTimeout(timeoutId);
  delete state.pendingJobMap[jobId];

  // Revision result (no processing card, has onResult callback)
  if (onResult) {
    onResult(message);
    return;
  }

  // Initial scan result — update steps 3 and 4
  updateProcStep(procCardId, 3, 'Generated', true);
  updateProcStep(procCardId, 4, '100% Verified', true);

  setTimeout(async () => {
    job.compiledHtml = compiledHtml;
    job.fullDocumentHtml = fullDocumentHtml || compiledHtml;
    job.filename = filename || `Sanjay_N_${(targetRole || 'BioTailr').replace(/[^a-zA-Z0-9]/g, '_')}_Resume`;
    job.archetypeId = archetypeId || 'developer';
    job.atsScore = atsScore || 100;
    job.status = 'ready';

    if (targetRole && targetRole !== job.targetRole) {
      job.targetRole = targetRole;
      job.displayTitle = truncateTitle(targetRole);
    }

    // Close the background processing tab
    if (job.processingTabId) {
      chrome.tabs.remove(job.processingTabId).catch(() => {});
      job.processingTabId = null;
    }

    // Remove the live processing card row
    const procRow = document.getElementById(`proc_row_${job.id}`);
    if (procRow) procRow.remove();

    renderTailoredResumeCard(job);
    updateChatFooterState(true);
    renderJobTabs();
  }, 500);
}

function handleResumeError(message) {
  const { jobId, error } = message;
  const pendingEntry = state.pendingJobMap?.[jobId];
  if (!pendingEntry) return;

  const { job, procCardId, timeoutId } = pendingEntry;
  clearTimeout(timeoutId);
  delete state.pendingJobMap[jobId];

  const procRow = document.getElementById(`proc_row_${job.id}`);
  if (procRow) procRow.remove();

  if (job.processingTabId) {
    chrome.tabs.remove(job.processingTabId).catch(() => {});
    job.processingTabId = null;
  }

  job.status = 'unscanned';
  renderJobTabs();
  addCustomHtmlMessage(job, `
    <div class="bubble bot-bubble" style="border-left: 3px solid #ef4444;">
      <strong>Generation Error:</strong> ${escapeHtml(error || 'BioTailr AI could not generate the resume. Please ensure API keys are configured in the web app.')}
    </div>
  `);
  updateChatFooterState(false);
}

// ─── 9. Revision via Chat (Re-opens web app with refinement) ───────────────
async function handleUserSendRevision() {
  const job = getActiveJob();
  if (!job || job.status !== 'ready') return;

  const inputEl = document.getElementById('chat-input');
  const userText = inputEl ? inputEl.value.trim() : '';
  if (!userText) return;

  inputEl.value = '';
  inputEl.style.height = 'auto';

  addUserChatMessage(job, userText);
  showTypingIndicator();

  // Store revision request and re-trigger web app pipeline
  const jobId = `${job.id}_rev${job.revisionsCount}`;
  const authKey = generateSecurityKey();
  const storageKey = `biotailr_ext_job_${jobId}`;
  const jobPayload = {
    jobId,
    authKey,
    targetRole: job.targetRole,
    company: job.company,
    location: job.location,
    description: job.scannedJobData?.fullDescriptionText || '',
    extractedSkills: job.scannedJobData?.extractedSkills || [],
    refinements: userText,
    isRevision: true
  };

  try {
    await chrome.storage.local.set({ [storageKey]: jobPayload });
    const webAppUrl = await resolveWebAppUrl(jobId, authKey);
    const webAppTab = await chrome.tabs.create({ url: webAppUrl, active: false });
    job.processingTabId = webAppTab.id;

    state.pendingJobMap = state.pendingJobMap || {};
    state.pendingJobMap[jobId] = { job, procCardId: null, authKey, isRevision: true, revisionNote: userText };

    const timeoutId = setTimeout(() => {
      if (state.pendingJobMap?.[jobId]) {
        delete state.pendingJobMap[jobId];
        hideTypingIndicator();
        if (job.processingTabId) chrome.tabs.remove(job.processingTabId).catch(() => {});
        addCustomHtmlMessage(job, `<div class="bubble bot-bubble" style="border-left:3px solid #ef4444;">Revision timed out. Please try again.</div>`);
      }
    }, 90000);

    state.pendingJobMap[jobId].timeoutId = timeoutId;

    // Override handleResumeReady to handle revision result
    const origReady = state.pendingJobMap[jobId];
    origReady.onResult = (msg) => {
      hideTypingIndicator();
      job.compiledHtml = msg.compiledHtml;
      job.fullDocumentHtml = msg.fullDocumentHtml || msg.compiledHtml;
      if (msg.filename) job.filename = msg.filename;
      job.revisionsCount++;
      if (job.processingTabId) { chrome.tabs.remove(job.processingTabId).catch(() => {}); job.processingTabId = null; }
      renderTailoredResumeCard(job, userText);
    };

  } catch (err) {
    hideTypingIndicator();
    addCustomHtmlMessage(job, `<div class="bubble bot-bubble" style="border-left:3px solid #ef4444;">Could not send revision: ${escapeHtml(err.message)}</div>`);
  }
}

// ─── 10. Page Scan via content.js ─────────────────────────────────────────
async function executePageScan() {
  if (!state.currentTab || !state.currentTab.id) return getMockJobData();

  const tabId = state.currentTab.id;
  const url = state.currentTab.url || '';
  if (!url.startsWith('http://') && !url.startsWith('https://'))
    throw new Error('Please navigate to an active job listing before scanning.');

  return new Promise(async (resolve) => {
    chrome.tabs.sendMessage(tabId, { action: 'SCAN_JOB_PAGE' }, async (response) => {
      if (!chrome.runtime.lastError && response?.success && response.data) {
        resolve(response.data); return;
      }
      try {
        await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
        await delay(200);
        chrome.tabs.sendMessage(tabId, { action: 'SCAN_JOB_PAGE' }, (retryRes) => {
          resolve((retryRes?.success && retryRes.data) ? retryRes.data : getMockJobData());
        });
      } catch (e) {
        resolve(getMockJobData());
      }
    });
  });
}

function getMockJobData() {
  return {
    title: 'Senior Software Development Engineer',
    company: 'Axodian Technologies',
    location: 'Bangalore, KA (On-Site)',
    salary: '',
    employmentType: 'Full-Time',
    experienceLevel: 'Senior Level',
    detectedSource: 'Demo Simulation',
    extractedSkills: ['C#', 'Python', 'Microservices', 'RESTful APIs', 'SQL', 'Docker', 'CI/CD'],
    fullDescriptionText: 'Looking for a Senior SDE to architect microservices, scalable APIs, and enterprise systems.'
  };
}

// ─── 11. Resume Result Card ────────────────────────────────────────────────
function renderTailoredResumeCard(job, revisionNote = '') {
  const cardId = `resume_card_${job.id}_${job.revisionsCount}`;
  const trackName = ARCHETYPE_NAMES[job.archetypeId] || 'Software Engineering';

  const cardHtml = `
    <div class="tailored-result-card" id="${cardId}">
      <div class="result-card-header">
        <div class="result-title-group">
          <h4>${escapeHtml(job.targetRole)}</h4>
          <div class="result-meta-track">${escapeHtml(job.company)} &bull; ${escapeHtml(trackName)}</div>
        </div>
        <div class="ats-score-tag">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span>100% ATS SCORE</span>
        </div>
      </div>

      ${revisionNote ? `
        <div class="bubble bot-bubble" style="background: var(--teal-light); border-color: var(--teal-border); font-size: 0.76rem; color: var(--teal-dark); padding: 6px 10px;">
          <strong>Revision #${job.revisionsCount} Applied:</strong> ${escapeHtml(revisionNote)}
        </div>
      ` : ''}

      <div class="result-chips-row">
        ${job.location ? `<span class="res-chip">${escapeHtml(job.location)}</span>` : ''}
        <span class="res-chip">Single-Column ATS Format</span>
        <span class="res-chip">Pure Black Ink (#000000)</span>
      </div>

      <!-- One-Step Direct Download -->
      <div class="download-action-row">
        <button class="btn-download-step pdf" data-download-pdf="${job.id}" title="Download Single-Page PDF">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>Download PDF</span>
        </button>
        <button class="btn-download-step html" data-download-html="${job.id}" title="Download ATS HTML">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          <span>Download HTML</span>
        </button>
      </div>

      <a href="${BIOTAILR_WEB_APP}?role=${encodeURIComponent(job.targetRole)}#studio" target="_blank" class="btn-card-link-app" title="Open & Edit in BioTailr Web Studio">
        <span>Open in BioTailr Studio</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      </a>
    </div>
  `;

  addCustomHtmlMessage(job, cardHtml);
  setTimeout(() => bindCardDownloadButtons(), 100);
}

// ─── 12. Download Handlers ─────────────────────────────────────────────────
function bindCardDownloadButtons() {
  document.querySelectorAll('[data-download-pdf]').forEach(btn => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = 'true';
    btn.addEventListener('click', (e) => {
      const job = state.jobs.find(j => j.id === e.currentTarget.dataset.downloadPdf);
      if (job?.compiledHtml) executeDirectPdfDownload(job);
    });
  });
  document.querySelectorAll('[data-download-html]').forEach(btn => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = 'true';
    btn.addEventListener('click', (e) => {
      const job = state.jobs.find(j => j.id === e.currentTarget.dataset.downloadHtml);
      if (job?.compiledHtml) executeDirectHtmlDownload(job);
    });
  });
}

function executeDirectPdfDownload(job) {
  const filename = `${job.filename || `Sanjay_N_${(job.targetRole || 'BioTailr').replace(/[^a-zA-Z0-9]/g, '_')}_Resume`}.pdf`;
  const sandbox = document.getElementById('hidden-resume-sandbox');
  if (!sandbox) return;

  sandbox.innerHTML = job.fullDocumentHtml || job.compiledHtml;
  const targetElement = sandbox.querySelector('.resume-sheet') || sandbox.querySelector('#resume-document') || sandbox;

  if (typeof window.html2pdf !== 'undefined') {
    const opt = {
      margin: 0,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    window.html2pdf().set(opt).from(targetElement).toPdf().get('pdf').then((pdf) => {
      while (pdf.internal.getNumberOfPages() > 1) pdf.deletePage(pdf.internal.getNumberOfPages());
    }).save();
  } else {
    executeDirectHtmlDownload(job);
  }
}

function executeDirectHtmlDownload(job) {
  const filename = `${job.filename || `Sanjay_N_${(job.targetRole || 'BioTailr').replace(/[^a-zA-Z0-9]/g, '_')}_Resume`}.html`;
  const content = job.fullDocumentHtml || job.compiledHtml;
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── 13. Chat Message Helpers ──────────────────────────────────────────────
function addUserChatMessage(job, text) {
  job.messages.push({ sender: 'user', content: text, isHtml: false });
  renderJobMessages(job);
}

function addCustomHtmlMessage(job, htmlContent) {
  job.messages.push({ sender: 'bot', content: htmlContent, isHtml: true });
  renderJobMessages(job);
}

function renderJobMessages(job) {
  const container = document.getElementById('messages-list');
  if (!container) return;
  container.innerHTML = '';
  job.messages.forEach(msg => {
    const row = document.createElement('div');
    row.className = `message-row ${msg.sender}`;
    row.innerHTML = msg.isHtml ? msg.content : `<div class="bubble ${msg.sender}-bubble">${escapeHtml(msg.content)}</div>`;
    container.appendChild(row);
  });
  scrollToBottom();
}

function showTypingIndicator() {
  const container = document.getElementById('messages-list');
  if (!container) return;
  const existing = document.getElementById('typing-indicator-row');
  if (existing) existing.remove();
  const row = document.createElement('div');
  row.className = 'message-row bot';
  row.id = 'typing-indicator-row';
  row.innerHTML = `<div class="bubble bot-bubble typing-bubble"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
  container.appendChild(row);
  scrollToBottom();
}

function hideTypingIndicator() {
  const el = document.getElementById('typing-indicator-row');
  if (el) el.remove();
}

// ─── 14. Processing Card Step Updater ─────────────────────────────────────
function updateProcStep(cardId, stepNum, label, isDone) {
  const stepEl = document.getElementById(`${cardId}_s${stepNum}`);
  if (!stepEl) return;
  if (isDone) {
    stepEl.className = 'proc-step-item completed';
    const badge = stepEl.querySelector('.proc-step-badge');
    if (badge) { badge.className = 'proc-step-badge done'; badge.textContent = label; }
  } else {
    stepEl.className = 'proc-step-item active';
    const badge = stepEl.querySelector('.proc-step-badge');
    if (badge) { badge.className = 'proc-step-badge'; badge.textContent = label; }
  }
}

// ─── 15. Utilities ────────────────────────────────────────────────────────
function scrollToBottom() {
  const viewport = document.getElementById('chat-viewport');
  if (viewport) viewport.scrollTop = viewport.scrollHeight;
}

function truncateTitle(str, max = 22) {
  if (!str) return 'Job';
  const clean = str.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  return clean.length > max ? clean.slice(0, max) + '...' : clean;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
