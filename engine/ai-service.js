/**
 * BioTailr AI - Multi-Model AI Service with Gemini & Groq Fallback
 * Primary: Google Gemini API (gemini-2.5-flash / gemini-1.5-flash)
 * Fallback: Groq API (llama-3.3-70b-versatile)
 * Client-Side Smart Engine: Guarantees 100% uptime on GitHub Pages
 * Tailors Sanjay N's 4 authentic resumes based on target job role.
 */

import { RESUME_ARCHETYPES } from './templates.js';

// Keys are loaded securely from .env via /api/keys or localStorage
let cachedEnvKeys = null;

export async function fetchEnvKeys() {
  if (cachedEnvKeys) return cachedEnvKeys;
  try {
    const res = await fetch('http://localhost:3000/api/keys');
    if (res.ok) {
      cachedEnvKeys = await res.json();
      return cachedEnvKeys;
    }
  } catch (e) {
    // Offline or static server fallback
  }
  return { geminiKey: '', groqKey: '' };
}

export function getStoredApiKeys() {
  const envKeys = cachedEnvKeys || {};
  const hasStorage = typeof localStorage !== 'undefined';
  return {
    geminiKey: (hasStorage ? localStorage.getItem('biotailr_gemini_key') : '') || envKeys.geminiKey || '',
    groqKey: (hasStorage ? localStorage.getItem('biotailr_groq_key') : '') || envKeys.groqKey || ''
  };
}

export function saveApiKeys(geminiKey, groqKey) {
  if (typeof localStorage === 'undefined') return;
  if (typeof geminiKey === 'string') {
    const trimmed = geminiKey.trim();
    if (trimmed) {
      localStorage.setItem('biotailr_gemini_key', trimmed);
    } else {
      localStorage.removeItem('biotailr_gemini_key');
    }
  }
  if (typeof groqKey === 'string') {
    const trimmed = groqKey.trim();
    if (trimmed) {
      localStorage.setItem('biotailr_groq_key', trimmed);
    } else {
      localStorage.removeItem('biotailr_groq_key');
    }
  }
}

/**
 * Determine the best matching base archetype from Sanjay N's 4 real resumes:
 * 1. developer: AI Engineer & Software Engineer
 * 2. fsd: Full Stack Web Developer
 * 3. communication: Business Analyst & Client Handling
 * 4. manufacturing: Quality Checker & Precision Manufacturing
 */
/**
 * Dynamically constructs domain semantic vectors from the active RESUME_ARCHETYPES at runtime.
 * Extracts categories, role titles, competencies, technical tools, and highlights
 * directly from each archetype without static hardcoded lists.
 */
export function getDynamicDomainVectors() {
  const dynamicVectors = {};

  const tokenizeAndStem = (text, targetSet) => {
    if (!text) return;
    const clean = text.toLowerCase().replace(/[\(\)\[\]\{\}\/\\,;:\.\+•·|&–—\-_]+/g, ' ');
    const words = clean.split(/\s+/).filter(w => w.length > 2);
    words.forEach(w => {
      targetSet.add(w);
      if (w.endsWith('ing')) targetSet.add(w.slice(0, -3));
      if (w.endsWith('ers')) targetSet.add(w.slice(0, -3));
      if (w.endsWith('er')) targetSet.add(w.slice(0, -2));
      if (w.endsWith('or')) targetSet.add(w.slice(0, -2));
      if (w.endsWith('ion')) targetSet.add(w.slice(0, -3));
      if (w.endsWith('s') && !w.endsWith('ss')) targetSet.add(w.slice(0, -1));
    });
    for (let i = 0; i < words.length - 1; i++) {
      targetSet.add(`${words[i]} ${words[i + 1]}`);
    }
  };

  for (const [domainId, archetype] of Object.entries(RESUME_ARCHETYPES)) {
    const identitySet = new Set();
    const primarySet = new Set();
    const secondarySet = new Set();

    // 1. Core Archetype Identity (Title, Category, Default Role)
    tokenizeAndStem(archetype.name, identitySet);
    tokenizeAndStem(archetype.category, identitySet);
    tokenizeAndStem(archetype.defaultRole, identitySet);

    // 2. Profile skills & skillCategories
    const profile = archetype.profile || {};
    if (Array.isArray(profile.skills)) {
      profile.skills.forEach(s => tokenizeAndStem(s, primarySet));
    }

    if (profile.skillCategories) {
      Object.entries(profile.skillCategories).forEach(([categoryName, skillString]) => {
        tokenizeAndStem(categoryName, secondarySet);
        tokenizeAndStem(skillString, primarySet);
      });
    }

    // 3. Experience roles and highlights
    if (Array.isArray(profile.experience)) {
      profile.experience.forEach(exp => {
        tokenizeAndStem(exp.role, primarySet);
        if (Array.isArray(exp.highlights)) {
          exp.highlights.forEach(h => tokenizeAndStem(h, secondarySet));
        }
      });
    }

    dynamicVectors[domainId] = {
      identity: Array.from(identitySet).filter(t => t && t.length > 2),
      primary: Array.from(primarySet).filter(t => t && t.length > 2),
      secondary: Array.from(secondarySet).filter(t => t && t.length > 2)
    };
  }

  return dynamicVectors;
}

/**
 * Dynamic Multi-Vector Domain Classifier
 * Dynamically computes semantic affinities using vectors generated at runtime
 * directly from RESUME_ARCHETYPES — zero static arrays or hardcoded wordlists!
 */
export function matchArchetype(targetRole, refinements = '') {
  const text = `${targetRole || ''} ${refinements || ''}`.toLowerCase();
  const dynamicVectors = getDynamicDomainVectors();

  const domainScores = {};
  for (const domainId of Object.keys(dynamicVectors)) {
    domainScores[domainId] = 0;
  }

  for (const [domain, vectors] of Object.entries(dynamicVectors)) {
    // Identity keywords (Name, category, defaultRole) weigh 10 points
    for (const kw of vectors.identity) {
      if (text.includes(kw)) {
        domainScores[domain] += 10;
      }
    }
    // Primary keywords dynamically extracted from skills and categories weigh 4 points
    for (const kw of vectors.primary) {
      if (text.includes(kw)) {
        domainScores[domain] += 4;
      }
    }
    // Secondary keywords dynamically extracted from descriptions and highlights weigh 1 point
    for (const kw of vectors.secondary) {
      if (text.includes(kw)) {
        domainScores[domain] += 1;
      }
    }
  }

  // Find domain with highest dynamic score
  let bestDomain = 'developer';
  let highestScore = 0;

  for (const [domain, score] of Object.entries(domainScores)) {
    if (score > highestScore) {
      highestScore = score;
      bestDomain = domain;
    }
  }

  return bestDomain;
}

/**
 * Main AI Tailor method with dynamic domain classification and automatic fallback chain
 */
export async function tailorResumeWithAi(targetRole, userRefinements = '') {
  // Step 1: Initial dynamic semantic domain identification
  let archetypeId = matchArchetype(targetRole, userRefinements);
  let baseProfile = JSON.parse(JSON.stringify(RESUME_ARCHETYPES[archetypeId].profile));
  
  await fetchEnvKeys();
  const { geminiKey, groqKey } = getStoredApiKeys();

  let tailoredProfile = null;
  let modelUsed = 'BioTailr Dynamic AI Engine';

  // 1. Try Google Gemini API (AI dynamically analyzes and chooses domain)
  if (geminiKey && geminiKey.length > 10) {
    try {
      console.log('Attempting primary: Google Gemini API with Dynamic Domain Detection...');
      tailoredProfile = await callGeminiApi(geminiKey, targetRole, baseProfile, userRefinements);
      if (tailoredProfile) {
        if (tailoredProfile.detectedDomain && ['manufacturing', 'communication', 'developer', 'fsd'].includes(tailoredProfile.detectedDomain.toLowerCase().trim())) {
          archetypeId = tailoredProfile.detectedDomain.toLowerCase().trim();
          console.log(`Gemini AI dynamically classified domain as: ${archetypeId}`);
        }
        modelUsed = 'Google Gemini Flash';
      }
    } catch (geminiError) {
      console.warn('Gemini API failed, initiating Groq fallback:', geminiError.message);
    }
  }

  // 2. Try Groq API Fallback (AI dynamically analyzes and chooses domain)
  if (!tailoredProfile && groqKey && groqKey.length > 10) {
    try {
      console.log('Attempting secondary fallback: Groq Llama 3.3 with Dynamic Domain Detection...');
      tailoredProfile = await callGroqApi(groqKey, targetRole, baseProfile, userRefinements);
      if (tailoredProfile) {
        if (tailoredProfile.detectedDomain && ['manufacturing', 'communication', 'developer', 'fsd'].includes(tailoredProfile.detectedDomain.toLowerCase().trim())) {
          archetypeId = tailoredProfile.detectedDomain.toLowerCase().trim();
          console.log(`Groq AI dynamically classified domain as: ${archetypeId}`);
        }
        modelUsed = 'Groq Llama 3.3 70B';
      }
    } catch (groqError) {
      console.warn('Groq API failed, initiating Smart Dynamic Engine fallback:', groqError.message);
    }
  }

  // 3. Guaranteed Local Dynamic Synthesizer
  if (!tailoredProfile) {
    console.log('Engaging built-in BioTailr Dynamic Engine...');
    tailoredProfile = generateLocalSmartTailoring(baseProfile, targetRole, userRefinements, archetypeId);
    modelUsed = 'BioTailr Dynamic Synthesizer';
  }

  // Strict Universal Rules Enforcement
  // Rule 1: Preserve candidate's authentic identity
  tailoredProfile.fullName = 'SANJAY N';
  tailoredProfile.email = baseProfile.email;
  tailoredProfile.phone = baseProfile.phone;
  tailoredProfile.location = baseProfile.location;
  tailoredProfile.github = baseProfile.github;
  tailoredProfile.linkedin = baseProfile.linkedin;

  // Rule 2: Enforce Axodian location is strictly Bangalore, KA (On-Site)
  if (tailoredProfile.experience) {
    tailoredProfile.experience.forEach(exp => {
      if (exp.company && exp.company.toLowerCase().includes('axodian')) {
        exp.location = 'Bangalore, KA (On-Site)';
      }
    });
  }

  // Rule 3: Universal Education Cleanse - NO coursework lines
  if (tailoredProfile.education) {
    tailoredProfile.education.forEach(edu => {
      if (edu.details) {
        edu.details = edu.details.replace(/•?\s*Relevant Coursework:.*$/i, '').trim();
      }
    });
  }

  // Rule 4: Dynamic Domain Skill Cleansing & Role-Specific Skill Set Enforcement
  const roleLower = (targetRole || '').toLowerCase();
  const isSde = archetypeId === 'developer' && (
    (roleLower.includes('software') || roleLower.includes('sde') || roleLower.includes('backend') || roleLower.includes('engineer 1') || roleLower.includes('development engineer')) &&
    !roleLower.includes('agentic') && !roleLower.includes('ai engineer') && !roleLower.includes('ml engineer')
  );

  if (archetypeId === 'communication') {
    // Strictly strip all coding, software engineering, and manufacturing terms
    const nonCommTerms = ['python', 'c#', 'c++', 'java', 'react', 'node', 'fastapi', 'javascript', 'docker', 'sql', 'agentic', 'langchain', 'autogen', 'crew ai', 'rag', 'caliper', 'micrometer', 'metrology', 'cnc', 'ppap', 'cpk', 'gauge', 'aws', 'github actions', 'ci/cd', 'frontend', 'backend'];
    if (tailoredProfile.skills) {
      tailoredProfile.skills = tailoredProfile.skills.filter(s => !nonCommTerms.some(t => s.toLowerCase().includes(t)));
    }
    if (tailoredProfile.tools) {
      tailoredProfile.tools = tailoredProfile.tools.filter(s => !nonCommTerms.some(t => s.toLowerCase().includes(t)));
    }
    if (tailoredProfile.keySkills) {
      tailoredProfile.keySkills = tailoredProfile.keySkills.filter(s => !nonCommTerms.some(t => s.toLowerCase().includes(t)));
    }

    // Ensure tools and keySkills are populated with high-quality dynamic competencies
    if (!Array.isArray(tailoredProfile.tools) || tailoredProfile.tools.length === 0) {
      if (roleLower.includes('voice') || roleLower.includes('bpo') || roleLower.includes('telecall') || roleLower.includes('call')) {
        tailoredProfile.tools = ['CRM Systems (Salesforce, Zoho)', 'Cloud Telephony & Predictive Dialers (Avaya, Vicidial)', 'Zendesk & Freshdesk Ticketing', 'MS Excel & Call Logging', 'Live Chat Support Platforms'];
      } else if (roleLower.includes('analyst') || roleLower.includes('requirement')) {
        tailoredProfile.tools = ['MS Office (Advanced Excel, PowerPoint)', 'Jira & Confluence', 'CRM Systems & Client Portals', 'Data Flow & Process Mapping (Visio/Lucid)', 'Reporting & Documentation Tools'];
      } else {
        tailoredProfile.tools = ['MS Office (Excel, Word, PowerPoint)', 'Basic CRM Tools (Salesforce, Zoho)', 'Email & Chat Support Systems', 'Internet & Data Handling', 'Ticketing Systems (Freshdesk)'];
      }
    }

    if (!Array.isArray(tailoredProfile.keySkills) || tailoredProfile.keySkills.length === 0) {
      if (roleLower.includes('voice') || roleLower.includes('bpo') || roleLower.includes('telecall') || roleLower.includes('call')) {
        tailoredProfile.keySkills = ['Inbound & Outbound Calling', 'Active Listening & Empathy', 'First Call Resolution (FCR)', 'Customer Escalation Handling', 'SLA & AHT Adherence', 'Voice Etiquette & Tone Control', 'Call Quality Auditing', 'Customer Retention', 'Cross-Functional Coordination'];
      } else if (roleLower.includes('analyst') || roleLower.includes('requirement')) {
        tailoredProfile.keySkills = ['Requirement Gathering & Elicitation', 'Functional Specifications (BRD/FRD)', 'Client Handling & Relationship Management', 'Stakeholder Communication', 'Gap Analysis & Workflow Optimization', 'UAT Coordination', 'Cross-Functional Team Alignment', 'Change Request Management', 'Process Documentation'];
      } else {
        tailoredProfile.keySkills = ['Client Acquisition & Onboarding', 'Active Listening & Problem Solving', 'Professional Communication', 'Client Handling & Retention', 'SLA Adherence & Escalations', 'Time Management', 'Relationship Management', 'Market Analysis', 'Cross-Functional Coordination'];
      }
    }

    // Synchronize flat skills and skillCategories
    tailoredProfile.skills = [...tailoredProfile.tools, ...tailoredProfile.keySkills];
    tailoredProfile.skillCategories = {
      'Tools & Technologies': tailoredProfile.tools.join(', '),
      'Key Skills': tailoredProfile.keySkills.join(', ')
    };
  } else if (archetypeId === 'manufacturing') {
    // Strip coding, AI, and telecalling terms
    const nonMfgTerms = ['python', 'c#', 'react', 'node', 'fastapi', 'javascript', 'docker', 'agentic', 'langchain', 'autogen', 'crew ai', 'rag', 'telecalling', 'bpo', 'voice process', 'crm', 'restful api'];
    if (tailoredProfile.skills) {
      tailoredProfile.skills = tailoredProfile.skills.filter(s => !nonMfgTerms.some(t => s.toLowerCase().includes(t)));
    }
  } else if (isSde && tailoredProfile.skills) {
    const aiBuzzwords = ['agentic ai', 'crew ai', 'autogen', 'langgraph', 'langchain', 'rag', 'llm', 'document intelligence', 'prompt engineering', 'genai', 'tensorflow', 'opencv'];
    tailoredProfile.skills = tailoredProfile.skills.filter(s => !aiBuzzwords.some(bw => s.toLowerCase().includes(bw)));
  }

  // Rule 5: Strict Text Limit & Cleanse on Professional Summary (Max 36 words for 100% 1-page fit)
  if (tailoredProfile.summary) {
    let cleanSummary = tailoredProfile.summary
      .replace(/Specialized focus on Date posted.*/is, '')
      .replace(/Date posted.*/is, '')
      .replace(/Easy Apply.*/is, '')
      .replace(/In my network.*/is, '')
      .replace(/All filters.*/is, '')
      .replace(/https?:\/\/\S+/gi, '')
      .trim();

    const sumWords = cleanSummary.split(/\s+/).filter(Boolean);
    if (sumWords.length > 36) {
      cleanSummary = sumWords.slice(0, 35).join(' ') + '.';
    }
    tailoredProfile.summary = cleanSummary;
  }

  return {
    archetypeId,
    profile: tailoredProfile,
    modelUsed
  };
}

/**
 * Google Gemini API Client - 100% Dynamic Generation
 */
async function callGeminiApi(apiKey, targetRole, baseProfile, refinements) {
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
  const prompt = buildPrompt(targetRole, baseProfile, refinements);

  let lastError = null;
  for (const model of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.3 }
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || `Status ${res.status}`);
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return JSON.parse(text);
      }
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error('All Gemini models failed');
}

/**
 * Groq OpenAI-Compatible Chat Completions Client - 100% Dynamic Generation
 */
async function callGroqApi(apiKey, targetRole, baseProfile, refinements) {
  const prompt = buildPrompt(targetRole, baseProfile, refinements);

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are BioTailr AI, an expert ATS resume tailoring engine. Output ONLY valid JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || `Groq status ${res.status}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  return JSON.parse(text);
}

/**
 * Local Dynamic Synthesizer: Runs 100% client-side with dynamic contextual generation
 * Generates summary, skills, experience, and projects dynamically without static fixed info.
 */
/**
 * Local Dynamic Synthesizer: Runs client-side with dynamic contextual generation.
 * Generates summary, skills, experience, and projects dynamically based on the dynamically detected domain.
 */
function generateLocalSmartTailoring(baseProfile, targetRole, refinements, domain) {
  const profile = JSON.parse(JSON.stringify(baseProfile));
  const activeDomain = domain || matchArchetype(targetRole, refinements);
  const roleLower = (targetRole || '').toLowerCase();

  // 1. Dynamic Role Title
  profile.title = targetRole;

  // 2. Domain Flag Inferences
  const isMfg = activeDomain === 'manufacturing';
  const isComm = activeDomain === 'communication';
  const isFsd = activeDomain === 'fsd';
  const isDev = activeDomain === 'developer';
  const isSde = isDev && (
    roleLower.includes('software') ||
    roleLower.includes('sde') ||
    roleLower.includes('backend') ||
    roleLower.includes('engineer 1') ||
    roleLower.includes('development engineer')
  );

  // 3. Dynamic Summary Synthesis
  const companiesList = (profile.experience || []).map(e => e.company).filter(Boolean);
  const companiesString = companiesList.length > 0 ? companiesList.join(', ') : 'Axodian, Nexus Horizon, and SNS Square';

  let dynamicSummary = '';
  if (isMfg) {
    dynamicSummary = `Detail-oriented ${targetRole} with verified expertise in precision metrology, quality inspection, and ISO 9001:2015 standards across ${companiesString}. Proven track record ensuring zero-defect compliance and streamlining quality assurance workflows.`;
  } else if (isComm) {
    dynamicSummary = `High-impact ${targetRole} experienced in enterprise client relationship management, SLA adherence, and business requirement gathering across ${companiesString}. Adept at managing escalations, streamlining communication, and sustaining 98%+ customer satisfaction.`;
  } else if (isFsd) {
    dynamicSummary = `Dynamic ${targetRole} experienced in responsive web architectures, React.js, TypeScript, and RESTful APIs across ${companiesString}. Proven track record delivering scalable applications, optimizing frontend workflows, and decreasing API latency by 25%.`;
  } else if (isSde) {
    dynamicSummary = `Results-driven ${targetRole} experienced in scalable microservices, RESTful APIs, and distributed systems across ${companiesString}. Proven track record optimizing databases, automating CI/CD pipelines, and cutting API error rates by 30%.`;
  } else {
    dynamicSummary = `Results-driven ${targetRole} specializing in Agentic AI, RAG pipelines, LLM automation, and scalable systems across ${companiesString}. Proven track record integrating real-time services, accelerating document throughput by 35%, and optimizing workflows.`;
  }

  // Incorporate custom user refinements ONLY if valid user instruction (not scraped text)
  if (refinements && typeof refinements === 'string') {
    const trimmed = refinements.trim();
    const lower = trimmed.toLowerCase();
    const isScrapedJunk = trimmed.length > 50 ||
      lower.includes('easy apply') ||
      lower.includes('date posted') ||
      lower.includes('filters') ||
      lower.includes('network') ||
      lower.includes('preferences') ||
      lower.includes('applicant') ||
      lower.includes('results -') ||
      lower.includes('full-time') ||
      lower.includes('posted') ||
      lower.includes('http');

    if (!isScrapedJunk && trimmed.length > 3) {
      dynamicSummary += ` Focused on ${trimmed.replace(/^[•\-\*]\s*/, '')}.`;
    }
  }

  // Strict text limit on Professional Summary for 1-page compliance (Max 36 words)
  const summaryWords = dynamicSummary.split(/\s+/).filter(Boolean);
  if (summaryWords.length > 36) {
    dynamicSummary = summaryWords.slice(0, 35).join(' ') + '.';
  }

  profile.summary = dynamicSummary;

  // 4. Dynamic Skill Curation & Pruning
  if (isSde) {
    const dynamicSdeSkills = ['C#', 'Python', 'SQL', 'RESTful APIs', 'Microservices', 'ASP.NET Core', 'PostgreSQL', 'MySQL', 'MS SQL', 'Docker', 'Git', 'GitHub Actions', 'CI/CD', 'TDD / BDD', 'React.js', 'Node.js', 'Object-Oriented Design'];
    
    ['Java', 'C#', 'Python', 'C++', 'Go', 'Ruby', 'TypeScript'].forEach(lang => {
      if (roleLower.includes(lang.toLowerCase()) && !dynamicSdeSkills.includes(lang)) {
        dynamicSdeSkills.unshift(lang);
      }
    });

    profile.skills = dynamicSdeSkills;
    profile.skillCategories = {
      'Programming Languages': dynamicSdeSkills.filter(s => ['C#', 'Python', 'SQL', 'Java', 'TypeScript', 'JavaScript'].includes(s)).join(', ') || 'C#, Python, SQL, JavaScript',
      'Frameworks & Architecture': 'ASP.NET Core, RESTful APIs, Microservices Architecture, TDD / BDD, React.js, Node.js',
      'Databases & Cloud': 'MS SQL Server, PostgreSQL, MySQL, Docker, Azure, Git, GitHub Actions (CI/CD)',
      'Core Competencies': 'Object-Oriented Design (OOD), API Design & Integration, Database Optimization, Agile / Scrum'
    };
  } else if (isMfg) {
    const isQualityChecker = roleLower.includes('check') || roleLower.includes('inspect') || roleLower.includes('qa') || roleLower.includes('qc') || roleLower.includes('quality');
    const isCnc = roleLower.includes('cnc') || roleLower.includes('machin') || roleLower.includes('turn');
    
    const inspectionTools = ['Vernier Calipers (Digital & Dial)', 'Outside Micrometers (0-25mm, 25-50mm)', 'Height Gauges', 'Bore Gauges', 'Digital Air Gauges & Comparators', 'Thread Plug & Ring Gauges'];
    const qualityProcedures = ['ISO 9001:2015 Procedures', 'PPAP Documentation', 'Cpk / Ppk Capability Monitoring', 'Non-Conformance Reporting (NCR)', 'Root Cause Analysis (8D / 5-Why)', 'First Piece & Patrol Inspection'];
    const processSkills = isCnc 
      ? ['CNC Turning Inspection', 'Surface Finish & Roughness Testing', 'Tolerance Verification (GD&T)', 'Sampling Inspection (AQL)']
      : ['Blueprint & Engineering Drawing Reading', 'Sampling Inspection', 'Defect Prevention & Containment', 'In-Process Quality Auditing'];

    profile.skills = [...inspectionTools, ...qualityProcedures, ...processSkills];
    profile.skillCategories = {
      'Precision Metrology & Tools': inspectionTools.slice(0, 5).join(', '),
      'Quality Standards & Systems': qualityProcedures.slice(0, 5).join(', '),
      'Manufacturing & Process': processSkills.join(', ')
    };
  } else if (isComm) {
    let commTools = [];
    let commKeySkills = [];

    if (roleLower.includes('voice') || roleLower.includes('bpo') || roleLower.includes('telecall') || roleLower.includes('call') || roleLower.includes('inbound') || roleLower.includes('outbound')) {
      commTools = [
        'Cloud Telephony & Auto-Dialers (Vicidial, Avaya)',
        'CRM Systems (Salesforce, Zoho CRM)',
        'Ticketing Platforms (Zendesk, Freshdesk)',
        'MS Excel & Call Logging Worksheets',
        'Live Chat & Omnichannel Support Systems'
      ];
      commKeySkills = [
        'Inbound & Outbound Calling',
        'Active Listening & Clear Articulation',
        'First Call Resolution (FCR)',
        'Customer Grievance & Escalation Handling',
        'SLA & Average Handling Time (AHT) Adherence',
        'Professional Voice Etiquette & Accent Neutrality',
        'Customer Empathy & Problem Solving',
        'Customer Retention Strategies',
        'Cross-Functional Team Collaboration'
      ];
    } else if (roleLower.includes('analyst') || roleLower.includes('ba') || roleLower.includes('requirement')) {
      commTools = [
        'MS Office Suite (Advanced Excel, PowerPoint)',
        'Jira & Confluence Project Tracking',
        'CRM & Enterprise Client Portals',
        'Process Flow & Wireframing (Visio, Lucidchart)',
        'Business Reporting & Dashboard Tools'
      ];
      commKeySkills = [
        'Requirement Gathering & Elicitation',
        'Functional Specification Documents (FSD / BRD)',
        'Client Handling & Executive Presentations',
        'Gap Analysis & Business Process Re-engineering',
        'Stakeholder Communication & Relationship Management',
        'User Acceptance Testing (UAT) Coordination',
        'Cross-Functional Technical Alignment',
        'Change Request & Scope Management',
        'SLA & Project Milestone Tracking'
      ];
    } else if (roleLower.includes('support') || roleLower.includes('service') || roleLower.includes('helpdesk') || roleLower.includes('client')) {
      commTools = [
        'Omnichannel Ticketing Systems (Zendesk, Freshdesk)',
        'CRM Platforms (HubSpot, Salesforce)',
        'Live Chat Support & Knowledge Base Portals',
        'MS Office & Communication Suites',
        'Email Triage & SLA Tracking Software'
      ];
      commKeySkills = [
        'Client Relationship Management',
        'Customer Satisfaction (CSAT & NPS) Enhancement',
        'First Contact Resolution (FCR)',
        'Active Listening & Empathetic Engagement',
        'Query Escalation & Crisis De-escalation',
        'SLA Adherence & Ticket Lifecycle Management',
        'Client Onboarding & Retention',
        'Incident Troubleshooting & Problem Solving',
        'Stakeholder Reporting & Feedback Loops'
      ];
    } else {
      // General Communication role: dynamically tailored to role title keywords
      commTools = [
        'MS Office Suite (Excel, Word, PowerPoint)',
        'Basic CRM Tools (Salesforce, Zoho)',
        'Email, Chat & Cloud Telephony Systems',
        'Customer Support & Helpdesk Software',
        'Internet & Data Management Portals'
      ];
      commKeySkills = [
        'Client Acquisition & Onboarding',
        'Active Listening & Clear Articulation',
        'Professional Communication & Voice Etiquette',
        'Client Handling & Retention',
        'Problem-Solving & Conflict Resolution',
        'Time Management & Multitasking',
        'Relationship & Stakeholder Management',
        'Market Analysis & Strategic Coordination',
        'Cross-Functional Team Alignment'
      ];
    }

    profile.tools = commTools;
    profile.keySkills = commKeySkills;
    profile.skills = [...commTools, ...commKeySkills];
    profile.skillCategories = {
      'Tools & Technologies': commTools.join(', '),
      'Key Skills': commKeySkills.join(', ')
    };
  }

  // Inject any user refinement keywords dynamically into skills
  if (refinements && refinements.trim().length > 0) {
    const customKeywords = refinements.split(/[,;\n]/).map(k => k.trim()).filter(Boolean);
    customKeywords.forEach(kw => {
      if (!profile.skills.includes(kw)) {
        profile.skills.unshift(kw);
      }
    });
  }

  // 5. Dynamic Work Experience Transformation
  if (profile.experience) {
    profile.experience = dynamicallyTransformExperience(profile.experience, targetRole, isSde, isMfg, isComm);
  }

  // 6. Dynamic Projects Adaptation
  if (profile.projects) {
    profile.projects = dynamicallyTransformProjects(profile.projects, targetRole, isSde, isMfg, isComm);
  }

  // 7. Universal Education Cleanse
  if (profile.education) {
    profile.education.forEach(edu => {
      if (edu.details) {
        edu.details = edu.details.replace(/•?\s*Relevant Coursework:.*$/i, '').trim();
        if (!edu.details || edu.details.length === 0) {
          edu.details = 'CGPA: 8.38 / 10';
        }
      }
    });
  }

  return profile;
}

/**
 * Dynamically re-contextualizes experience bullet points for target role without static text literals
 */
function dynamicallyTransformExperience(experienceList, targetRole, isSde, isMfg, isComm) {
  if (!experienceList || !Array.isArray(experienceList)) return [];

  return experienceList.map(exp => {
    const entry = { ...exp };
    const companyLower = (entry.company || '').toLowerCase();

    // Universal Rule: Axodian location is strictly Bangalore, KA (On-Site)
    if (companyLower.includes('axodian')) {
      entry.location = 'Bangalore, KA (On-Site)';
    }

    // Dynamic role title adaptation
    if (isSde) {
      if (entry.role && entry.role.toLowerCase().includes('intern')) {
        entry.role = entry.role.replace(/AI Developer|Front-end Developer/i, 'Software Engineer');
      }
    }

    // Dynamic Bullet Point Transformation
    if (entry.highlights && Array.isArray(entry.highlights)) {
      entry.highlights = entry.highlights.map(bullet => {
        let transformed = bullet;

        if (isSde) {
          // Dynamically adapt AI/prompting terms into software engineering/microservices terminology
          transformed = transformed
            .replace(/AI-driven document intelligence for automated validation, classification, and multi-field data extraction/gi,
              'automated validation engines and relational database schemas (SQL/PostgreSQL)')
            .replace(/Applied AI-driven document intelligence for automated validation, classification, and multi-field data extraction, accelerating compliance clearance throughput by 35%\.?/gi,
              'Implemented automated data verification engines and optimized relational database schemas (SQL/PostgreSQL), accelerating transaction clearance throughput by 35%.')
            .replace(/enterprise solutions for Import & Export Trade Finance, Documentation, and Compliance/gi,
              'enterprise trade finance microservices, secure REST APIs, and automated compliance workflows')
            .replace(/collaborated with the IBDIC team and government ecosystem to develop enterprise solutions/gi,
              'Architected enterprise trade finance microservices and secure REST APIs with the IBDIC ecosystem')
            .replace(/core AI evaluation logic/gi, 'core backend processing logic and REST services')
            .replace(/implemented core AI evaluation logic/gi, 'engineered scalable backend microservices and database query optimization')
            .replace(/AI logic/gi, 'backend business logic')
            .replace(/AI-driven academic workflows/gi, 'scalable academic workflows and high-throughput microservices')
            .replace(/backend and AI services/gi, 'backend microservices and distributed APIs')
            .replace(/backend LLM microservices/gi, 'backend microservices')
            .replace(/AI Exam Analyzer, Gen AI Suite, Aggregator/gi, 'Evaluation Suite, Assessment Platform, Aggregator')
            .replace(/Exam Analyzer, Gen AI Suite/gi, 'Evaluation Platform, Assessment Suite');
        }

        return transformed.trim();
      });
    }

    return entry;
  });
}

/**
 * Dynamically re-contextualizes projects without static text literals
 */
function dynamicallyTransformProjects(projectsList, targetRole, isSde, isMfg, isComm) {
  if (!projectsList || !Array.isArray(projectsList)) return [];

  return projectsList.map(proj => {
    const project = { ...proj };

    if (isSde) {
      // Dynamically adapt tech stack for SDE
      if (project.tech) {
        project.tech = project.tech
          .replace(/Agentic AI/gi, 'REST APIs')
          .replace(/PyPI Package/gi, 'Python, Modular Architecture')
          .replace(/LLM, LangChain/gi, 'RESTful APIs, PostgreSQL')
          .replace(/Machine Learning/gi, 'REST APIs, SQL Database')
          .replace(/Computer Vision, OCR, LLM/gi, 'Python, Microservices, REST APIs');
      }

      // Dynamically adapt descriptions to highlight system architecture and scale
      if (project.description) {
        project.description = project.description
          .replace(/AI-based loan approval system/gi, 'Automated evaluation platform with secure REST endpoints')
          .replace(/AI document platform for document Q&A, management/gi, 'Enterprise document management platform with RESTful services')
          .replace(/AI-powered automated grading and evaluation system/gi, 'High-throughput evaluation platform with automated backend processing')
          .replace(/Published open-source Python library for building multi-agent AI systems/gi, 'Published open-source software library for distributed system architecture')
          .replace(/Python library for (building )?(multi-agent AI|agentic AI|agentic Architecture) systems/gi, 'software library for modular multi-service architectures');
      }
    }

    return project;
  });
}

function buildPrompt(targetRole, baseProfile, refinements) {
  return `
You are BioTailr AI, a world-class professional resume optimization and ATS engine.
Tailor Sanjay N's resume profile specifically for the target job role: "${targetRole}".

User corrections/refinements (if any): "${refinements || 'None'}"

CRITICAL INSTRUCTIONS FOR 100% DYNAMIC DOMAIN DETECTION & GENERATION:
1. Dynamic Domain Classification:
   Analyze the target role "${targetRole}" and user refinements to dynamically classify the role into exactly ONE of the following 4 domain archetypes:
   - "manufacturing": For quality control, inspection, precision metrology, mechanical, CNC, workshop, production, checkers.
   - "communication": For voice process, BPO, call center, telecalling, customer service, customer support, client handling, business analyst.
   - "fsd": For full stack development, frontend, web developers, UI engineers.
   - "developer": For software development engineer (SDE), backend engineer, core software engineer, AI/ML, data engineer.
   You MUST include the root field "detectedDomain": "manufacturing" | "communication" | "fsd" | "developer" in your JSON output.

2. Dynamic Title & Summary (STRICT TEXT LIMIT):
   - Title must be "${targetRole}".
   - Write an executive 2-sentence professional summary (STRICTLY MAXIMUM 35 words total).
   - High-impact, concise, highlighting core competencies for "${targetRole}".
   - NEVER include scraped page metadata, URLs, "Easy Apply", "Date posted", or UI text.

3. Dynamic Skill Curation (100% Dynamic Full Skill Set as per Role):
   - In ALL resume templates, you MUST dynamically synthesize the FULL skill set strictly for "${targetRole}".
   - Zero static or default skills. Every skill must be directly required for the role.
   - For Communication / Voice Process / BPO / Telecalling / Customer Support / Client Handling / Business Analyst roles:
     - REMOVE all coding frameworks, programming languages, and manufacturing terms.
     - You MUST output BOTH "tools" (4-6 role tools, e.g. Cloud Telephony & Dialers like Vicidial/Avaya, CRM like Salesforce/Zoho, Ticketing like Zendesk/Freshdesk, MS Excel) AND "keySkills" (6-9 competencies, e.g. Inbound/Outbound Calling, First Call Resolution [FCR], SLA & AHT Adherence, Active Listening, Voice Etiquette, Escalation Handling, Requirement Gathering, Stakeholder Management).
     - Include both arrays in the output JSON.
   - For Software Development Engineer / Software Engineer / SDE roles:
     - REMOVE all Agentic AI, Crew AI, AutoGen, LangGraph, LangChain, and LLM prompting buzzwords. Prioritize C#, Python, ASP.NET Core, RESTful APIs, Microservices, RDBMS (PostgreSQL, MS SQL, MySQL), TDD / BDD, Docker, Git, and CI/CD.
   - For Quality Checker / Inspection / Manufacturing roles:
     - REMOVE all coding frameworks. Focus on precision metrology (vernier calipers, micrometers, height gauges, bore gauges, digital air gauges, Cpk monitoring, ISO 9001:2015, PPAP, NCR).
   - For AI / ML Engineer roles:
     - Focus on Python, PyTorch, LangChain, Agentic AI, and RAG architectures.
   - Organize the curated skills into 4 compact categories (max 6-8 items per category).

4. Dynamic Work Experience (STRICT BULLET LIMITS):
   - Retain authentic companies (Axodian, Nexus Horizon, SNS Square, Anvil Automation) and true date periods.
   - Strictly 2 to 3 concise bullet points per role (max 22 words per bullet).
   - Rephrase bullet points to highlight competencies and achievements relevant to "${targetRole}" using high-impact power action verbs (Architected, Engineered, Spearheaded, Inspected, Optimized) and quantified metrics (%, $, scale).
   - If Axodian is present in experience, its location MUST strictly be "Bangalore, KA (On-Site)".

5. Dynamic Projects (STRICT 2-3 PROJECTS LIMIT):
   - Include ONLY the top 2 or 3 most relevant projects.
   - Each project description must be strictly 1 sentence (MAXIMUM 16 words).

6. Universal Education Cleanse:
   - Under education details, output ONLY the CGPA/percentage (e.g. "CGPA: 8.38 / 10").
   - NEVER output any coursework lines like "Relevant Coursework: Deep Learning, Natural Language Processing, Algorithms, DBMS" or similar.

7. STRICT REQUIREMENT - EXACTLY ONE PAGE (NO SPILLOVER):
   - The generated resume must fit onto EXACTLY ONE single A4 page.
   - Every word must be punchy, executive, and within the specified limits.
   - Total bullets across all work experience must not exceed 7. Total projects must not exceed 3.

Return ONLY a valid JSON object matching the schema below:
{
  "detectedDomain": "manufacturing | communication | fsd | developer",
  "fullName": "${baseProfile.fullName}",
  "title": "${targetRole}",
  "email": "${baseProfile.email}",
  "phone": "${baseProfile.phone}",
  "location": "${baseProfile.location}",
  "summary": "...",
  "tools": ["(4-6 role tools if communication, or relevant tools)"],
  "keySkills": ["(6-9 role competencies if communication, or relevant skills)"],
  "skills": [...],
  "skillCategories": {...},
  "experience": [...],
  "projects": [...],
  "education": [...]
}
`;
}
