/**
 * BioTailr AI - Candidate Context Manager
 * Persistent storage and schema for candidate profile used in Fast Auto Apply.
 */

const DEFAULT_CANDIDATE_CONTEXT = {
  personal: {
    fullName: 'Sanjay N',
    firstName: 'Sanjay',
    lastName: 'N',
    email: '2005sanjaynrs@gmail.com',
    phone: '+91 9361599018',
    phoneCountryCode: '+91',
    address: 'Coimbatore, Tamil Nadu',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    postalCode: '641001',
    country: 'India',
    linkedinUrl: 'https://www.linkedin.com/in/sanjay--n',
    githubUrl: 'https://github.com/RNS-Forge',
    portfolioUrl: 'https://rns-forge.github.io/RNS_Professional_Profile/'
  },
  workAuth: {
    authorizedInCountry: 'Yes',
    needSponsorship: 'No',
    currentVisaStatus: 'Citizen',
    securityClearance: 'No'
  },
  experience: {
    totalYears: '4',
    currentTitle: 'Software Development Engineer',
    currentCompany: 'Axodian',
    noticePeriodDays: '15',
    currentSalary: '800000',
    expectedSalary: '1200000',
    currency: 'INR'
  },
  education: {
    degree: "Bachelor's Degree",
    degreeLevel: "Bachelor of Technology",
    fieldOfStudy: 'Computer Science and Engineering',
    institution: 'Anna University',
    graduationYear: '2026',
    gpa: '8.5'
  },
  eeo: {
    gender: 'Male',
    raceEthnicity: 'Asian',
    veteranStatus: 'No',
    disabilityStatus: 'No'
  },
  customAnswers: {
    whyWorkHere: 'I am passionate about building scalable, high-throughput software and AI-driven platforms. My background in microservices, full-stack engineering, and high-compliance systems directly aligns with your technical mission.',
    strengths: 'Full-stack software engineering, RESTful microservices, AI & LLM application architecture, automated test coverage, and strict performance optimization.',
    summary: 'Results-oriented Software Development Engineer with deep expertise in scalable architecture, API design, and AI-enabled workflows.'
  }
};

const STORAGE_KEY = 'biotailr_candidate_context';

/**
 * Load Candidate Context from chrome.storage.local (falls back to defaults)
 */
async function loadCandidateContext() {
  return new Promise((resolve) => {
    let resolved = false;
    const safetyTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(DEFAULT_CANDIDATE_CONTEXT);
      }
    }, 150);

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        chrome.storage.local.get([STORAGE_KEY], (res) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(safetyTimer);
          if (res && res[STORAGE_KEY]) {
            resolve(deepMerge(DEFAULT_CANDIDATE_CONTEXT, res[STORAGE_KEY]));
          } else {
            resolve(DEFAULT_CANDIDATE_CONTEXT);
          }
        });
      } catch (err) {
        if (!resolved) {
          resolved = true;
          clearTimeout(safetyTimer);
          resolve(DEFAULT_CANDIDATE_CONTEXT);
        }
      }
    } else {
      if (!resolved) {
        resolved = true;
        clearTimeout(safetyTimer);
        resolve(DEFAULT_CANDIDATE_CONTEXT);
      }
    }
  });
}

/**
 * Save Candidate Context to chrome.storage.local
 */
async function saveCandidateContext(contextData) {
  return new Promise((resolve, reject) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [STORAGE_KEY]: contextData }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(true);
        }
      });
    } else {
      resolve(true);
    }
  });
}

/**
 * Reset Candidate Context to default profile
 */
async function resetCandidateContext() {
  await saveCandidateContext(DEFAULT_CANDIDATE_CONTEXT);
  return DEFAULT_CANDIDATE_CONTEXT;
}

/**
 * Export context as formatted JSON string
 */
function exportCandidateContextJson(contextData) {
  return JSON.stringify(contextData || DEFAULT_CANDIDATE_CONTEXT, null, 2);
}

/**
 * Import and validate context from JSON string
 */
function importCandidateContextJson(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid JSON object');
    return deepMerge(DEFAULT_CANDIDATE_CONTEXT, parsed);
  } catch (err) {
    throw new Error('Failed to parse Candidate Context JSON: ' + err.message);
  }
}

function deepMerge(target, source) {
  const output = Object.assign({}, target);
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) Object.assign(output, { [key]: source[key] });
        else output[key] = deepMerge(target[key], source[key]);
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

// Make accessible to window or modules
if (typeof window !== 'undefined') {
  window.CandidateContextManager = {
    DEFAULT_CANDIDATE_CONTEXT,
    loadCandidateContext,
    saveCandidateContext,
    resetCandidateContext,
    exportCandidateContextJson,
    importCandidateContextJson
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DEFAULT_CANDIDATE_CONTEXT,
    loadCandidateContext,
    saveCandidateContext,
    resetCandidateContext,
    exportCandidateContextJson,
    importCandidateContextJson
  };
}
