/**
 * BioTailr AI - Authentic Resumes of Sanjay N
 * 4 Real Archetypes: AI Engineer, Full Stack Developer, Business Analyst, Quality Control Inspector.
 * Standard ATS Single-Column Layout, 100% Semantic HTML, Pure Black Ink (#000000), Zero Emojis.
 */

export const RESUME_ARCHETYPES = {
  // 1. AI Engineer & Software Engineer Archetype (from Developer Resume.html)
  developer: {
    id: 'developer',
    name: 'Software Development Engineer & AI Engineer',
    category: 'Software Engineering / SDE / Backend Engineering / Microservices / Systems / AI / Machine Learning',
    description: 'Specialized in Software Development Engineering (SDE), backend architecture, scalable microservices, RESTful APIs, distributed software systems, database optimization, C#, Python, SQL, CI/CD, and enterprise architecture.',
    defaultRole: 'Software Development Engineer | AI Engineer',
    baseFile: 'Developer Resume.html',
    profile: {
      fullName: 'SANJAY N',
      title: 'AI Engineer | Software Engineer',
      email: '2005sanjaynrs@gmail.com',
      phone: '+91 93615 99018',
      location: 'Coimbatore, Tamil Nadu',
      portfolio: 'https://rns-forge.github.io/RNS_Professional_Profile/',
      github: 'https://github.com/RNS-Forge',
      linkedin: 'www.linkedin.com/in/sanjay--n',
      summary: 'Results-driven AI Engineer & Software Engineer specializing in Agentic AI, RAG architectures, LLM automation, document intelligence, and scalable enterprise systems. Proven track record across Axodian, Nexus Horizon, and SNS Square in developing high-throughput microservices, real-time banking integrations, and cutting API error rates by 30%.',
      skills: [
        'Python', 'LangChain', 'LangGraph', 'Crew AI', 'AutoGen',
        'TensorFlow', 'PyTorch', 'C#', 'JavaScript', 'TypeScript',
        'Node.js', 'React.js', 'MySQL', 'MongoDB', 'RESTful APIs',
        'Git', 'CI/CD', 'GenAI', 'Agentic AI', 'DBMS'
      ],
      skillCategories: {
        'Programming Languages': 'Python, C#, JavaScript, HTML/CSS, SQL, Java',
        'Frameworks & Libraries': 'LangChain, LangGraph, Crew AI, AutoGen, NumPy, Pandas, OpenCV, Scikit-learn, TensorFlow, PyTorch, Matplotlib, Node.js, React.js, TypeScript',
        'Tools & Technologies': 'MySQL, Git, RESTful APIs, MongoDB, Postman API, JMeter, ZAP, Lighthouse',
        'Core Competencies': 'Agentic AI, RAG Pipelines, Document Intelligence, CI/CD, DBMS, Microservices'
      },
      experience: [
        {
          id: 'dev_exp_1',
          role: 'Software Engineer Intern',
          company: 'Axodian',
          project: 'OneDoc, OneCompliance',
          companyUrl: 'https://axodian.com/',
          period: 'June 2026 - Present',
          location: 'Bangalore, KA (On-Site)',
          relevant: true,
          highlights: [
            'Collaborated with the IBDIC team and government ecosystem to engineer enterprise trade finance solutions, processing 10,000+ import/export transactions with 99.8% compliance accuracy.',
            'Architected multi-service architecture integrating EDPMS, IDPMS, real-time banking connectivity, SAP, and Tally, reducing manual document reconciliation cycle times by 40%.',
            'Deployed AI-driven document intelligence for automated validation, classification, and multi-field data extraction, accelerating compliance clearance throughput by 35%.'
          ]
        },
        {
          id: 'dev_exp_2',
          role: 'Front-end Developer Intern',
          company: 'Nexus Horizon',
          project: 'Faculties.ai',
          companyUrl: 'https://nexushorizon.ltd/#about',
          period: 'Sep 2025 - Apr 2026',
          location: 'Remote',
          relevant: true,
          highlights: [
            'Architected scalable, responsive frontend interfaces for AI-driven academic workflows at Faculties.ai, serving 5,000+ active faculty members and students.',
            'Integrated frontend client components with backend LLM microservices via REST APIs, reducing API response handling errors by 30% and decreasing latency by 25%.',
            'Engineered responsive, accessible UI modules using React and TypeScript, achieving 95+ Google Lighthouse performance scores across all device viewports.'
          ]
        },
        {
          id: 'dev_exp_3',
          role: 'AI Developer Intern',
          company: 'SNS Square',
          project: 'AI Exam Analyzer, Gen AI Suite, Aggregator',
          companyUrl: 'https://www.snssquare.com/',
          period: 'Aug 2024 - Sep 2025',
          location: 'Coimbatore, TN (On-Site)',
          relevant: true,
          highlights: [
            'Engineered full-stack modules and implemented core AI evaluation logic across 3 enterprise assessment platforms (AI Exam Analyzer, Gen AI Suite, Aggregator).',
            'Designed, tested, and analyzed requirements for automated assessment and document processing platforms, evaluating over 15,000+ exam submissions.',
            'Increased assessment scoring accuracy by 15% and improved project delivery milestone velocity by 10% through end-to-end automated testing.'
          ]
        }
      ],
      projects: [
        {
          name: 'Loan Eligibility Checker',
          url: 'https://github.com/RNSsanjay/Loan-Eligible-Domestic.git',
          tech: 'Python, ML, Scikit-learn, REST API',
          description: 'AI-based loan approval system that reduced manual verification by 12% and improved screening accuracy by 15% across 2,000+ applicants.'
        },
        {
          name: 'DocuMirror',
          url: 'https://github.com/RNSsanjay/Loan-Eligible-Domestic.git',
          tech: 'LLM, LangChain, Python, PDF Extraction',
          description: 'AI document platform for document Q&A, management, image-to-HTML conversion, and editable PDF generation with 99.2% extraction precision.'
        },
        {
          name: 'Exam Paper Analyzer',
          url: 'https://github.com/RNSsanjay/Loan-Eligible-Domestic.git',
          tech: 'Computer Vision, OCR, LLM, Python',
          description: 'AI-powered automated grading and evaluation system that reduced educator grading turnaround times by 30%.'
        },
        {
          name: 'AgriBridge',
          url: 'https://github.com/RNSsanjay/Loan-Eligible-Domestic.git',
          tech: 'Full-Stack Web, Node.js, Express, MongoDB',
          description: 'Global agricultural marketplace platform connecting 500+ farmers, suppliers, exporters, and international importers.'
        },
        {
          name: 'Agentium',
          url: 'https://pypi.org/project/agentium/',
          tech: 'Python, Agentic AI, PyPI Package',
          description: 'Published open-source Python library for building multi-agent AI systems, reducing agent orchestration development time by 55%.'
        }
      ],
      education: [
        {
          degree: 'B.Tech in Artificial Intelligence & Machine Learning',
          institution: 'SNS College of Technology',
          year: 'Nov 2022 - Apr 2026',
          location: 'Coimbatore, Tamil Nadu',
          details: 'CGPA: 8.38 / 10'
        }
      ],
      certifications: [
        'Salesforce AI Associate and Agentforce Specialist, completed with scores above 80%.',
        'Oracle AI Foundations Associate completed with 92% and Postman AI Student Expert certified.',
        'NPTEL IoT 4.0 Certification, NASSCOM Digital Edge completed with a score of 81%.'
      ]
    }
  },

  // 2. Full Stack Developer Archetype (from FSD Resume.html)
  fsd: {
    id: 'fsd',
    name: 'Full Stack Web Developer',
    category: 'Full Stack / React / Node.js / TypeScript',
    description: 'Specialized in modern responsive UI, React.js, TypeScript, Node.js, Express, Django, databases, and RESTful API integrations.',
    defaultRole: 'Full Stack Web Developer',
    baseFile: 'FSD Resume.html',
    profile: {
      fullName: 'SANJAY N',
      title: 'Full Stack Developer',
      email: '2005sanjaynrs@gmail.com',
      phone: '+91 93615 99018',
      location: 'Coimbatore, Tamil Nadu',
      portfolio: 'https://rns-forge.github.io/RNS_Professional_Profile/',
      github: 'https://github.com/RNS-Forge',
      linkedin: 'www.linkedin.com/in/sanjay--n',
      summary: 'Dynamic Full Stack Developer skilled in React.js, TypeScript, Node.js, Express, and Django, building high-performance web applications with seamless AI integrations. Experienced in architecting enterprise platforms at Axodian and Nexus Horizon, integrating robust RESTful APIs, optimizing front-end performance by 40%, and cutting error rates by 30%.',
      skills: [
        'React.js', 'TypeScript', 'JavaScript (ES6+)', 'HTML5', 'CSS3', 'Tailwind CSS', 'Shadcn/UI',
        'Node.js', 'Express.js', 'Python', 'Django', 'RESTful APIs',
        'MongoDB', 'PostgreSQL', 'MySQL', 'SQL',
        'Responsive Web Design', 'API Integration', 'Performance Optimization', 'Agile Development'
      ],
      skillCategories: {
        'Frontend': 'React.js, TypeScript, JavaScript (ES6+), HTML5, CSS3, Tailwind CSS, Shadcn/UI',
        'Backend': 'Node.js, Express.js, Python, Django, RESTful APIs, Microservices',
        'Databases': 'MongoDB, PostgreSQL, MySQL, SQL, Redis',
        'Core Strengths': 'Responsive Web Design, API Integration, Performance Optimization, Agile/Scrum'
      },
      experience: [
        {
          id: 'fsd_exp_1',
          role: 'Software Engineer Intern (On-Site)',
          company: 'Axodian',
          project: 'OneCompliance, LeDoc',
          companyUrl: 'https://www.axodian.com/',
          period: 'June 2026 - Present',
          location: 'Bangalore, KA (On-Site)',
          relevant: true,
          highlights: [
            'Engineered responsive frontend features integrated with backend REST APIs for OneCompliance, managing compliance tracking across 1,200+ corporate entities.',
            'Developed core web application modules for OneDoc document and remittance workflows, cutting user transaction friction and manual inputs by 35%.',
            'Optimized data exchange pipelines between client-facing React interfaces and enterprise microservices, boosting page load speeds by 40%.'
          ]
        },
        {
          id: 'fsd_exp_2',
          role: 'Front-end Developer Intern (Remote)',
          company: 'Nexus Horizon',
          project: 'Faculties.ai',
          companyUrl: 'https://nexushorizon.ltd/#about',
          period: 'Sep 2025 - Apr 2026',
          location: 'Remote',
          relevant: true,
          highlights: [
            'Architected scalable and responsive AI-driven academic workflow interfaces at Faculties.ai, serving 5,000+ active faculty members.',
            'Engineered intuitive user interfaces and integrated frontend components with backend AI services, reducing API response handling errors by 30%.',
            'Developed feature-driven web applications utilizing Python and Node.js microservices, collaborating with cross-functional design and engineering teams.'
          ]
        },
        {
          id: 'fsd_exp_3',
          role: 'AI Developer Intern (On-Site)',
          company: 'SNS Square',
          project: 'Exam Analyzer, Gen AI Suite, Aggregator',
          companyUrl: 'https://www.snssquare.com/',
          period: 'Aug 2024 - Sep 2025',
          location: 'Coimbatore, TN',
          relevant: true,
          highlights: [
            'Spearheaded full-stack module engineering and automated requirement analysis across 3 enterprise platforms (Exam Analyzer, Gen AI Suite, Aggregator).',
            'Built comprehensive automated testing suites and aligned technical features with client operational specifications, processing 15,000+ queries.',
            'Increased assessment workflow accuracy by 15% and accelerated project milestone delivery by 10% through end-to-end agile execution.'
          ]
        }
      ],
      projects: [
        {
          name: 'Loan Eligibility Checker',
          url: 'https://github.com/RNSsanjay/Loan-Eligible-Domestic.git',
          tech: 'React, Node.js, Express, Machine Learning',
          description: 'Loan approval web system that reduced manual verification by 12% and improved screening accuracy by 15% across 2,000+ applicants.'
        },
        {
          name: 'DocuMirror',
          url: 'https://github.com/RNSsanjay/Loan-Eligible-Domestic.git',
          tech: 'Full-Stack Web, AI Document Q&A, PDF Generation',
          description: 'AI document platform for document Q&A, image-to-HTML conversion, and editable PDF generation with 99.2% extraction precision.'
        },
        {
          name: 'AgriBridge',
          url: 'https://github.com/RNSsanjay/Loan-Eligible-Domestic.git',
          tech: 'React, Node.js, Express, MongoDB',
          description: 'Global agricultural trade platform connecting 500+ farmers, exporters, and importers with real-time responsive dashboards.'
        },
        {
          name: 'Exam Paper Analyzer',
          url: 'https://github.com/ProductFactory-01/COE-AI_Exam_Analyzer',
          tech: 'React, Python, FastAPI',
          description: 'User-friendly exam evaluation system that reduced evaluation turnaround times by 30% across multiple institutions.'
        },
        {
          name: 'Agentium',
          url: 'https://pypi.org/project/agentium/',
          tech: 'Python, Multi-Agent Architecture',
          description: 'Published Python library for building multi-agent AI architectures, reducing development boilerplate by 55%.'
        }
      ],
      education: [
        {
          degree: 'B.Tech in Artificial Intelligence & Machine Learning',
          institution: 'SNS College of Technology',
          year: 'Nov 2022 - Jun 2026',
          location: 'Coimbatore, Tamil Nadu',
          details: 'CGPA: 8.38 / 10'
        }
      ],
      certifications: [
        'Salesforce AI Associate and Agentforce Specialist (scores above 80%).',
        'Oracle AI Foundations Associate (92%) and Postman AI Student Expert certified.',
        'NPTEL IoT 4.0 Certification, NASSCOM Digital Edge (81%).'
      ]
    }
  },

  // 3. Voice Process, BPO, Client Relations & Business Analyst Archetype (from Communication Resume.html)
  communication: {
    id: 'communication',
    name: 'Voice Process, BPO & Client Relations',
    category: 'Voice Process / BPO / Customer Service / Customer Support / Telecalling / Client Relations / Business Analysis / Operations',
    description: 'Specialized in voice process operations, BPO, customer support, telecalling, client acquisition, requirement gathering, functional specifications, SLA adherence, stakeholder management, and cross-functional coordination.',
    defaultRole: 'Voice Process Executive | Client Handling | Business Analyst',
    baseFile: 'Communication Resume.html',
    profile: {
      fullName: 'SANJAY N',
      title: 'Business Analyst | Client Handling',
      email: '2005sanjaynrs@gmail.com',
      phone: '+91 93615 99018',
      location: 'Coimbatore, Tamil Nadu',
      portfolio: 'https://rns-forge.github.io/RNS_Professional_Profile/',
      linkedin: 'www.linkedin.com/in/sanjay--n',
      tools: [
        'MS Office (Excel, Word, PowerPoint)', 'Basic CRM Tools',
        'Email & Chat Support Systems', 'Internet & Data Handling'
      ],
      keySkills: [
        'Client Acquisition', 'Active Listening & Problem Solving', 'Communication',
        'Client Handling', 'Problem-Solving', 'Time Management',
        'Relationship Management', 'Market Analysis'
      ],
      skills: [
        'MS Office (Excel, Word, PowerPoint)', 'Basic CRM Tools', 'Email & Chat Support Systems', 'Internet & Data Handling',
        'Client Acquisition', 'Active Listening & Problem Solving', 'Communication', 'Client Handling', 'Problem-Solving', 'Time Management', 'Relationship Management', 'Market Analysis'
      ],
      skillCategories: {
        'Tools & Technologies': 'MS Office (Excel, Word, PowerPoint), Basic CRM Tools, Email & Chat Support Systems, Internet & Data Handling',
        'Key Skills': 'Client Acquisition, Active Listening & Problem Solving, Communication, Client Handling, Problem-Solving, Time Management, Relationship Management, Market Analysis'
      },
      experience: [
        {
          id: 'comm_exp_1',
          role: 'Business Analyst | Client Handling',
          company: 'SNS Square',
          period: 'Aug 2024 - Sep 2025',
          location: 'Coimbatore, TN',
          relevant: true,
          highlights: [
            'Managed client relationships by acting as a primary point of contact for communication and support.',
            'Gathered and analyzed client requirements and translated them into clear functional specifications.',
            'Coordinated with developers and technical teams to ensure accurate implementation of client needs.',
            'Handled client queries, provided timely updates, and ensured smooth project communication.'
          ]
        }
      ],
      education: [
        {
          degree: 'UG - B.Tech (AIML)',
          institution: 'SNS COLLEGE OF TECHNOLOGY',
          year: 'Nov 2022 - Jun 2026',
          location: 'Coimbatore, Tamil Nadu',
          details: 'Final CGPA: 8.38'
        },
        {
          degree: 'Schooling (HSC & SSLC)',
          institution: 'S.R.C Memorial Matric Higher Secondary School',
          year: 'Jun 2020 - May 2022',
          location: 'Coimbatore, Tamil Nadu',
          details: 'HSC (CS): 79% • SSLC: 60%'
        }
      ],
      languages: 'English (Fluent) • Tamil (Native)',
      certifications: [
        'NPTEL IoT 4.0 Certification, NASSCOM Digital edge completed with a score of 81%.',
        'Completed Effective Communication Certification from Tata Consultancy Services (TCS iON).'
      ]
    }
  },

  // 4. Quality Control & Precision Manufacturing Archetype (from Manufacturing.html)
  manufacturing: {
    id: 'manufacturing',
    name: 'Quality Checker & Precision Manufacturing Inspection',
    category: 'Quality Assurance / Quality Control / Inspection / Precision Metrology / CNC Machining / Manufacturing / ISO 9001:2015',
    description: 'Specialized in incoming, in-process, patrol, and final inspection of CNC-turned components, close-tolerance metrology, vernier calipers, micrometers, height gauges, bore gauges, air gauges, Cpk monitoring, and PPAP documentation.',
    defaultRole: 'Quality Checker | Quality Control & Inspection',
    baseFile: 'Manufacturing.html',
    profile: {
      fullName: 'SANJAY N',
      title: 'Quality Checker | Quality Control & Inspection | Steel Bar Components',
      email: '2005sanjaynrs@gmail.com',
      phone: '+91 93615 99018',
      location: 'Coimbatore, Tamil Nadu',
      portfolio: 'https://rns-forge.github.io/RNS_Professional_Profile/',
      linkedin: 'www.linkedin.com/in/sanjay--n',
      summary: 'Detail-oriented Quality Checker with 6 months of hands-on experience in incoming, in-process, patrol and final inspection of CNC-turned steel bar components at Anvil Automation, an ISO 9001:2015 precision manufacturing unit running 3 shifts. Skilled in using vernier calipers, micrometers, height gauges, bore gauges and air gauges to verify close-tolerance dimensions, and in recording defects, supporting corrective actions and maintaining quality documentation. B.Tech graduate in Artificial Intelligence & Machine Learning (CGPA 8.38). Seeking a Quality Inspector / Quality Control role in a precision manufacturing company.',
      skills: [
        'Incoming & In-Process Inspection', 'Final Outgoing Inspection', 'Vernier Calipers (Digital & Dial)',
        'Micrometers', 'Height Gauges', 'Bore Gauge Sets', 'Digital Air Gauges',
        'ISO 9001:2015 Procedures', 'PPAP Documentation', 'Process Capability (Cpk) Monitoring',
        'Non-Conformance Reporting (NCR)', 'Root Cause Analysis', 'Blueprint / Drawing Reading',
        'CNC Turning Inspection', 'MS Excel & Quality Logs'
      ],
      skillCategories: {
        'Inspection & Quality Skills': 'Incoming material inspection, in-process inspection, patrol inspection, final outgoing inspection, Vernier caliper, micrometer, height gauge, bore gauge set, digital air gauge, ISO 9001:2015, PPAP documentation, Cpk monitoring, non-conformance reporting, root cause analysis',
        'Manufacturing Knowledge': 'CNC turning (turning, grooving, threading, boring, facing), steel bar stock, close-tolerance machining, blueprint / drawing reading',
        'Professional & Software': 'Attention to detail, accuracy, communication, teamwork, problem solving, time management, shift-based working, MS Excel, MS Word, MS PowerPoint'
      },
      experience: [
        {
          id: 'mfg_exp_1',
          role: 'Quality Checker',
          company: 'Anvil Automation Pvt Ltd',
          companyNote: 'Precision manufacturer of CNC-turned, VMC-machined and die-cast components | ISO 9001:2015 | Coimbatore',
          period: 'Dec 2025 - May 2026',
          location: 'Coimbatore, TN',
          relevant: true,
          highlights: [
            'Incoming inspection: checked steel bar stock for size, length and condition against specification before release to the CNC turning section.',
            'In-process and patrol inspection: verified critical dimensions, grooves, threads, bores, facing and surface finish on CNC-turned steel bar components across 3 working shifts.',
            'Final inspection: performed final outgoing quality checks on finished steel bar components, releasing only conforming lots for dispatch.',
            'Measuring instruments: used digital and dial vernier calipers, micrometers, digital and dial height gauges, bore gauge sets and digital air gauge units for close-tolerance checks; worked with instruments maintained to NABL-accredited calibration standards.',
            'Process capability: monitored inspection data and Cpk trends against the plant\'s quality targets (minimum 1.66, target 1.70) and flagged drift to the production team.',
            'Non-conformance handling: identified, tagged and segregated rejected parts, documented defects, and coordinated with CNC operators and supervisors on containment and corrective action.',
            'Documentation: maintained inspection reports, checklists and defect logs in MS Excel and Word; supported PPAP documentation and internal quality audits.',
            'Quality system: followed ISO 9001:2015 procedures, SOPs, 5S and shop-floor safety practices.'
          ]
        }
      ],
      education: [
        {
          degree: 'B.Tech, Artificial Intelligence & Machine Learning',
          institution: 'SNS College of Technology',
          year: 'Nov 2022 - Jun 2026',
          location: 'Coimbatore, Tamil Nadu',
          details: 'CGPA: 8.38 / 10'
        },
        {
          degree: 'Schooling (HSC & SSLC)',
          institution: 'S.R.C Memorial Matric Higher Secondary School',
          year: 'Jun 2020 - May 2022',
          location: 'Coimbatore, Tamil Nadu',
          details: 'HSC (Computer Science): 79% • SSLC: 60%'
        }
      ],
      languages: 'English (Fluent) • Tamil (Native)'
    }
  }
};

/**
 * Main Dynamic HTML Dispatcher:
 * Dynamically routes to the exact style chosen for the target role:
 * 1. Manufacturing roles -> Manufacturing.html visual layout & style
 * 2. Voice process, BPO, Client handling -> Communication Resume.html visual layout & style
 * 3. Software, SDE, AI, Full Stack -> Developer Resume.html / FSD Resume.html visual layout & style
 */
export function generateResumeHtml(profile, archetypeId = 'developer') {
  if (archetypeId === 'manufacturing') {
    return generateManufacturingHtml(profile);
  }
  if (archetypeId === 'communication') {
    return generateCommunicationHtml(profile);
  }
  return generateDeveloperHtml(profile, archetypeId);
}

/**
 * Style 1: Manufacturing.html Visual Style
 */
function generateManufacturingHtml(profile) {
  const visibleExperiences = (profile.experience || []).filter(e => e.relevant !== false);

  return `
  <div class="resume-sheet archetype-manufacturing" id="resume-document">
    <header>
      <h1 data-editable-field="fullName">${escapeHtml(profile.fullName || 'SANJAY N')}</h1>
      <p class="role" data-editable-field="title">${escapeHtml(profile.title)}</p>
      <p class="contact">
        <span><a href="mailto:${escapeHtml(profile.email || '2005sanjaynrs@gmail.com')}" data-editable-field="email">${escapeHtml(profile.email || '2005sanjaynrs@gmail.com')}</a></span>
        <span><a href="tel:${escapeHtml(profile.phone || '+91 93615 99018')}" data-editable-field="phone">${escapeHtml(profile.phone || '+91 93615 99018')}</a></span>
        <span data-editable-field="location">${escapeHtml(profile.location || 'Coimbatore, Tamil Nadu')}</span>
        <span><a href="https://${escapeHtml(profile.linkedin || 'www.linkedin.com/in/sanjay--n')}" target="_blank">linkedin.com/in/sanjay--n</a></span>
      </p>
    </header>

    <section>
      <h2>Professional Summary</h2>
      <p class="summary" data-editable-field="summary">${escapeHtml(profile.summary)}</p>
    </section>

    <section>
      <h2>Professional Experience</h2>
      ${visibleExperiences.map((exp, expIdx) => `
        <div class="exp-entry" data-exp-index="${expIdx}">
          <div class="row">
            <span class="title"><b>${escapeHtml(exp.company)}</b> &ndash; ${escapeHtml(exp.role)}</span>
            <span class="date">${escapeHtml(exp.period)}</span>
          </div>
          ${exp.companyNote ? `<p class="company-note">${escapeHtml(exp.companyNote)}</p>` : ''}
          <ul>
            ${(exp.highlights || []).map((h, bIdx) => `<li data-bullet-index="${bIdx}">${escapeHtml(h)}</li>`).join('')}
          </ul>
        </div>
      `).join('')}
    </section>

    <section>
      <h2>Inspection &amp; Quality Skills</h2>
      ${profile.skillCategories ? `
        <ul>
          ${Object.entries(profile.skillCategories).map(([cat, list]) => `
            <li><strong>${escapeHtml(cat)}:</strong> ${escapeHtml(list)}</li>
          `).join('')}
        </ul>
      ` : `
        <ul>
          ${(profile.skills || []).map(s => `<li>${escapeHtml(s)}</li>`).join('')}
        </ul>
      `}
    </section>

    <section>
      <h2>Education</h2>
      ${(profile.education || []).map((edu, eduIdx) => `
        <div class="edu-entry" data-edu-index="${eduIdx}">
          <div class="row">
            <span class="title"><b>${escapeHtml(edu.institution)}</b> &ndash; ${escapeHtml(edu.degree)}</span>
            <span class="date">${escapeHtml(edu.year)}</span>
          </div>
          ${edu.details ? `<p class="edu-detail">${escapeHtml(edu.details)}</p>` : ''}
        </div>
      `).join('')}
    </section>

    ${profile.languages ? `
    <section>
      <h2>Languages</h2>
      <p>${escapeHtml(profile.languages)}</p>
    </section>
    ` : ''}
  </div>
  `;
}

/**
 * Style 2: Communication Resume.html Visual Style (Voice Process, BPO, Client Relations)
 */
function generateCommunicationHtml(profile) {
  const visibleExperiences = (profile.experience || []).filter(e => e.relevant !== false);

  return `
  <div class="resume-sheet archetype-communication" id="resume-document">
    <header>
      <h1 class="name" data-editable-field="fullName">${escapeHtml(profile.fullName || 'SANJAY N')}</h1>
      <p class="role" data-editable-field="title">${escapeHtml(profile.title)}</p>
      <div class="rule"></div>
      <p class="contact">
        <a href="mailto:${escapeHtml(profile.email || '2005sanjaynrs@gmail.com')}" data-editable-field="email">${escapeHtml(profile.email || '2005sanjaynrs@gmail.com')}</a> | 
        <a href="tel:${escapeHtml(profile.phone || '+91 93615 99018')}" data-editable-field="phone">${escapeHtml(profile.phone || '+91 93615 99018')}</a> | 
        <span data-editable-field="location">${escapeHtml(profile.location || 'Coimbatore, Tamil Nadu')}</span>
      </p>
    </header>

    <section class="sec s-sum">
      <h2>SUMMARY</h2>
      <div class="body">
        <p class="summary" data-editable-field="summary">${escapeHtml(profile.summary)}</p>
      </div>
    </section>

    <section class="sec s-work">
      <h2>WORK EXPERIENCE</h2>
      <div class="body">
        ${visibleExperiences.map((exp, expIdx) => `
          <div class="exp-entry" data-exp-index="${expIdx}">
            <div class="row">
              <span><b>${escapeHtml(exp.company)}</b> - ${escapeHtml(exp.role)}</span>
              <span>${escapeHtml(exp.period)}</span>
            </div>
            <ul>
              ${(exp.highlights || []).map((h, bIdx) => `<li data-bullet-index="${bIdx}">${escapeHtml(h)}</li>`).join('')}
            </ul>
          </div>
        `).join('')}
      </div>
    </section>

    ${(() => {
      // Intelligently and dynamically separate tools and key skills
      let toolsList = [];
      let skillsList = [];

      if (Array.isArray(profile.tools) && profile.tools.length > 0) {
        toolsList = profile.tools.slice();
      }
      if (Array.isArray(profile.keySkills) && profile.keySkills.length > 0) {
        skillsList = profile.keySkills.slice();
      }

      if (profile.skillCategories && (toolsList.length === 0 || skillsList.length === 0)) {
        for (const [catName, itemsVal] of Object.entries(profile.skillCategories)) {
          const items = (typeof itemsVal === 'string' ? itemsVal.split(',') : (Array.isArray(itemsVal) ? itemsVal : []))
            .map(i => i.trim()).filter(Boolean);
          const catLower = catName.toLowerCase();
          if (catLower.includes('tool') || catLower.includes('technolog') || catLower.includes('software') || catLower.includes('system') || catLower.includes('crm')) {
            toolsList.push(...items);
          } else {
            skillsList.push(...items);
          }
        }
      }

      if (toolsList.length === 0 && skillsList.length === 0 && Array.isArray(profile.skills)) {
        profile.skills.forEach(s => {
          const sLower = s.toLowerCase();
          if (sLower.includes('crm') || sLower.includes('office') || sLower.includes('tool') || sLower.includes('system') || sLower.includes('software') || sLower.includes('excel') || sLower.includes('dialer') || sLower.includes('jira') || sLower.includes('telephony') || sLower.includes('chat') || sLower.includes('email')) {
            toolsList.push(s);
          } else {
            skillsList.push(s);
          }
        });
        if (toolsList.length === 0 && skillsList.length > 0) {
          toolsList = skillsList.splice(0, Math.min(4, Math.ceil(skillsList.length / 2)));
        }
      }

      // Split tools into 2 balanced columns (cols2)
      const midTools = Math.ceil(toolsList.length / 2);
      const toolsCol1 = toolsList.slice(0, midTools);
      const toolsCol2 = toolsList.slice(midTools);

      // Split key skills into 3 balanced columns (cols3)
      const thirdSkills = Math.ceil(skillsList.length / 3);
      const skillsCol1 = skillsList.slice(0, thirdSkills);
      const skillsCol2 = skillsList.slice(thirdSkills, thirdSkills * 2);
      const skillsCol3 = skillsList.slice(thirdSkills * 2);

      return `
        <!-- ===== TOOLS & TECHNOLOGIES ===== -->
        <section class="sec s-tools">
          <h2>TOOLS &amp; TECHNOLOGIES</h2>
          <div class="body">
            <div class="cols2">
              <ul>
                ${toolsCol1.map(t => `<li>${escapeHtml(t)}</li>`).join('')}
              </ul>
              <ul>
                ${toolsCol2.map(t => `<li>${escapeHtml(t)}</li>`).join('')}
              </ul>
            </div>
          </div>
        </section>

        <!-- ===== KEY SKILLS ===== -->
        <section class="sec s-skill">
          <h2>KEY SKILLS</h2>
          <div class="body">
            <div class="cols3">
              <ul>
                ${skillsCol1.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
              </ul>
              <ul>
                ${skillsCol2.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
              </ul>
              <ul>
                ${skillsCol3.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
              </ul>
            </div>
          </div>
        </section>
      `;
    })()}

    <section class="sec s-edu">
      <h2>EDUCATION</h2>
      <div class="body">
        ${(profile.education || []).map((edu, eduIdx) => `
          <div class="edu-entry" data-edu-index="${eduIdx}">
            <div class="row">
              <span><b>${escapeHtml(edu.institution)}</b></span>
              <span>${escapeHtml(edu.year)}</span>
            </div>
            <div class="plain">${escapeHtml(edu.degree)}</div>
            ${edu.details ? `
              <ul>
                <li>${escapeHtml(edu.details)}</li>
              </ul>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </section>

    ${profile.languages ? `
    <section class="sec s-lang">
      <h2>LANGUAGES</h2>
      <div class="body">
        <p>${escapeHtml(profile.languages)}</p>
      </div>
    </section>
    ` : ''}

    ${profile.certifications && profile.certifications.length > 0 ? `
    <section class="sec s-ach">
      <h2>KEY ACHIEVEMENTS</h2>
      <div class="body">
        <ul>
          ${profile.certifications.map((c, cIdx) => `<li data-cert-index="${cIdx}">${escapeHtml(c)}</li>`).join('')}
        </ul>
      </div>
    </section>
    ` : ''}
  </div>
  `;
}

/**
 * Style 3: Developer Resume.html / FSD Resume.html Visual Style (Software, SDE, AI)
 */
function generateDeveloperHtml(profile, archetypeId = 'developer') {
  const visibleExperiences = (profile.experience || []).filter(e => e.relevant !== false);

  return `
  <div class="resume-sheet archetype-${archetypeId}" id="resume-document">
    <!-- ===== HEADER ===== -->
    <header class="head">
      <div>
        <h1 class="name" data-editable-field="fullName"><a href="https://rns-forge.github.io/RNS_Professional_Profile/" target="_blank">${escapeHtml(profile.fullName || 'SANJAY N')}</a></h1>
        <p class="role" data-editable-field="title">${escapeHtml(profile.title)}</p>
      </div>
      <div class="contact">
        <div><b>City :</b> <span data-editable-field="location">${escapeHtml(profile.location || 'Coimbatore, Tamil Nadu')}</span></div>
        <div><b>Email :</b> <a class="u" data-editable-field="email" href="mailto:${escapeHtml(profile.email || '2005sanjaynrs@gmail.com')}">${escapeHtml(profile.email || '2005sanjaynrs@gmail.com')}</a></div>
        <div><b>Phone :</b> <span data-editable-field="phone">${escapeHtml(profile.phone || '+91 93615 99018')}</span></div>
        <div><b>Github :</b> <a class="u" href="${escapeHtml(profile.github || 'https://github.com/RNS-Forge')}" target="_blank">${escapeHtml((profile.github || 'https://github.com/RNS-Forge').replace('https://', ''))}</a></div>
        <div class="wide"><b>LinkedIn :</b> <a class="u" href="https://${escapeHtml(profile.linkedin || 'www.linkedin.com/in/sanjay--n')}" target="_blank">${escapeHtml(profile.linkedin || 'www.linkedin.com/in/sanjay--n')}</a></div>
      </div>
    </header>

    <!-- ===== PROFESSIONAL SUMMARY ===== -->
    <section class="sec-summary">
      <h2>PROFESSIONAL SUMMARY</h2>
      <p class="summary" data-editable-field="summary">${escapeHtml(profile.summary)}</p>
    </section>

    <!-- ===== SKILLS / TOOLS ===== -->
    <section class="sec-skills">
      <h2>TECHNICAL SKILLS</h2>
      ${profile.skillCategories ? `
        <ul class="skills-cat-list">
          ${Object.entries(profile.skillCategories).map(([cat, list]) => `
            <li><b>${escapeHtml(cat)} :</b> <span data-editable-skill-cat="${escapeHtml(cat)}">${escapeHtml(list)}</span></li>
          `).join('')}
        </ul>
      ` : `
        <ul>
          ${(profile.skills || []).map(skill => `<li>${escapeHtml(skill)}</li>`).join('')}
        </ul>
      `}
    </section>

    <!-- ===== PROFESSIONAL EXPERIENCE ===== -->
    <section class="sec-experience">
      <h2>PROFESSIONAL EXPERIENCE</h2>

      ${visibleExperiences.map((exp, expIdx) => `
        <div class="exp-entry" data-exp-index="${expIdx}">
          <div class="exp-row-primary">
            <span class="exp-company-role">
              ${exp.companyUrl ? `<a class="plain exp-company" href="${escapeHtml(exp.companyUrl)}" target="_blank"><b>${escapeHtml(exp.company)}</b></a>` : `<b class="exp-company">${escapeHtml(exp.company)}</b>`}
              &ndash; <span class="exp-role">${escapeHtml(exp.role)}</span>
            </span>
            <span class="exp-period when">${escapeHtml(exp.period)}</span>
          </div>
          ${(exp.project || exp.location) ? `
            <div class="exp-row-secondary">
              <span class="exp-project">${exp.project ? `Project: <em>${escapeHtml(exp.project)}</em>` : ''}</span>
              <span class="exp-location">${escapeHtml(
                (exp.company && exp.company.toLowerCase().includes('axodian'))
                  ? 'Bangalore, KA (On-Site)'
                  : (exp.location || 'Coimbatore, TN')
              )}</span>
            </div>
          ` : ''}
          ${exp.companyNote ? `<p class="company-note">${escapeHtml(exp.companyNote)}</p>` : ''}
          <ul class="exp-bullets">
            ${(exp.highlights || []).slice(0, expIdx === 0 ? 3 : 2).map((bullet, bIdx) => `
              <li data-bullet-index="${bIdx}">${escapeHtml(bullet)}</li>
            `).join('')}
          </ul>
        </div>
      `).join('')}
    </section>

    <!-- ===== PROJECTS ===== -->
    ${profile.projects && profile.projects.length > 0 ? `
    <section class="sec-projects">
      <h2>PROJECTS</h2>
      <ul class="projects-list">
        ${profile.projects.slice(0, 2).map((proj, pIdx) => `
          <li data-proj-index="${pIdx}">
            ${proj.url ? `<a class="plain proj-name" href="${escapeHtml(proj.url)}" target="_blank"><b>${escapeHtml(proj.name)} &ndash;</b></a>` : `<b class="proj-name">${escapeHtml(proj.name)} &ndash;</b>`}
            <span class="proj-desc">${escapeHtml(proj.description)}</span>
          </li>
        `).join('')}
      </ul>
    </section>
    ` : ''}

    <!-- ===== EDUCATION ===== -->
    <section class="sec-education">
      <h2>EDUCATION</h2>
      ${(profile.education || []).map((edu, eduIdx) => `
        <div class="edu-entry" data-edu-index="${eduIdx}">
          <div class="edu-row-primary">
            <span class="edu-degree"><b>${escapeHtml(edu.degree || 'Degree')}</b></span>
            <span class="edu-year when">${escapeHtml(edu.year)}</span>
          </div>
          <div class="edu-row-secondary">
            <span class="edu-institution">${escapeHtml(edu.institution)}</span>
            <span class="edu-location">${escapeHtml(edu.details || 'CGPA: 8.38 / 10')}</span>
          </div>
        </div>
      `).join('')}
    </section>

    <!-- ===== AWARDS AND CERTIFICATION ===== -->
    ${profile.certifications && profile.certifications.length > 0 ? `
    <section class="sec-certifications">
      <h2>AWARDS AND CERTIFICATION</h2>
      <ul>
        ${profile.certifications.slice(0, 2).map((cert, cIdx) => `
          <li data-cert-index="${cIdx}">${escapeHtml(cert)}</li>
        `).join('')}
      </ul>
    </section>
    ` : ''}

    <!-- ===== LANGUAGES ===== -->
    ${profile.languages ? `
    <section class="sec-languages">
      <h2>LANGUAGES</h2>
      <p class="summary" data-editable-field="languages">${escapeHtml(profile.languages)}</p>
    </section>
    ` : ''}
  </div>
  `;
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
