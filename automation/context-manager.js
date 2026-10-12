/**
 * BioTailr AI - Candidate Context Manager
 * Persistent storage and schema for candidate profile used in Fast Auto Apply.
 */

const DEFAULT_CANDIDATE_CONTEXT = {
  personal: {
    fullName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    phoneCountryCode: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: ''
  },
  workAuth: {
    authorizedInCountry: 'Yes',
    needSponsorship: 'No',
    currentVisaStatus: 'Citizen',
    securityClearance: 'No'
  },
  experience: {
    totalYears: '1',
    currentTitle: '',
    currentCompany: '',
    noticePeriodDays: '15',
    currentSalary: '',
    expectedSalary: '',
    currency: 'USD'
  },
  education: {
    degree: "Bachelor's Degree",
    degreeLevel: "Bachelor",
    fieldOfStudy: '',
    institution: '',
    graduationYear: '',
    gpa: ''
  },
  eeo: {
    gender: 'Decline to self-identify',
    raceEthnicity: 'Decline to self-identify',
    veteranStatus: 'No',
    disabilityStatus: 'No'
  },
  customAnswers: {
    whyWorkHere: 'I am passionate about building scalable, high-quality software and AI-driven systems. My background and problem-solving skills align with your engineering mission.',
    strengths: 'Software development, problem solving, system design, test automation, and rapid execution.',
    summary: 'Dedicated and results-driven software engineer specializing in scalable system development and modern engineering practices.'
  }
};

const STORAGE_KEY = 'biotailr_candidate_context';

function mapProfileToContext(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const personal = raw.personal || {};
  const exp = raw.experience || {};
  const edu = raw.education || {};
  const fullName = personal.fullName || raw.fullName || '';
  const parts = fullName.split(/\s+/).filter(Boolean);

  return {
    personal: {
      fullName: fullName,
      firstName: personal.firstName || parts[0] || '',
      lastName: personal.lastName || parts.slice(1).join(' ') || '',
      email: personal.email || raw.email || '',
      phone: personal.phone || raw.phone || '',
      city: personal.city || personal.location || raw.location || '',
      linkedinUrl: personal.linkedinUrl || raw.linkedinUrl || '',
      githubUrl: personal.githubUrl || raw.githubUrl || '',
      portfolioUrl: personal.portfolioUrl || raw.portfolioUrl || raw.website || ''
    },
    experience: {
      totalYears: String(exp.totalYears || '1'),
      currentTitle: exp.currentTitle || exp.title || '',
      currentCompany: exp.currentCompany || exp.company || '',
      noticePeriodDays: String(exp.noticePeriodDays || '15')
    },
    education: {
      degree: edu.degree || '',
      fieldOfStudy: edu.fieldOfStudy || '',
      institution: edu.institution || edu.school || '',
      graduationYear: String(edu.graduationYear || edu.gradYear || '')
    }
  };
}

/**
 * Load Candidate Context from chrome.storage.local (falls back to defaults or dynamic profile)
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
        chrome.storage.local.get([STORAGE_KEY, 'candidateProfile', 'biotailr_candidate_profile', 'biotailr_dynamic_user_profile'], (res) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(safetyTimer);
          if (res && res[STORAGE_KEY]) {
            resolve(deepMerge(DEFAULT_CANDIDATE_CONTEXT, res[STORAGE_KEY]));
          } else if (res && (res.candidateProfile || res.biotailr_candidate_profile || res.biotailr_dynamic_user_profile)) {
            const raw = res.candidateProfile || res.biotailr_candidate_profile || res.biotailr_dynamic_user_profile;
            const mapped = mapProfileToContext(raw);
            resolve(deepMerge(DEFAULT_CANDIDATE_CONTEXT, mapped));
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
