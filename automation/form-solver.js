/**
 * BioTailr AI - Fast Form Solver
 * Matches DOM form fields against candidate context and dispatches native events instantly.
 */

class FastFormSolver {
  /**
   * Set native value bypassing React/Vue/Angular synthetic event wrappers
   */
  static setNativeValue(element, value) {
    if (!element) return;
    const valueSetter = Object.getOwnPropertyDescriptor(element.__proto__, 'value')?.set
      || Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
      || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement?.prototype || {}, 'value')?.set;

    if (valueSetter) {
      valueSetter.call(element, value);
    } else {
      element.value = value;
    }

    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));

    // Support for typeahead autocomplete dropdowns (e.g. LinkedIn location, city, company)
    const isCombobox = element.getAttribute('role') === 'combobox'
      || element.getAttribute('aria-autocomplete') === 'list'
      || (element.dataset && element.dataset.testid === 'typeahead-input')
      || Boolean(element.closest('.search-basic-typeahead, .search-vertical-typeahead'));

    if (isCombobox) {
      const trySelectOption = () => {
        const options = Array.from(document.querySelectorAll([
          '[role="listbox"] [role="option"]',
          'div[role="option"]',
          '.basic-typeahead__selectable-list li',
          '.search-basic-typeahead__results li',
          'ul[id*="typeahead"] li',
          'div[id*="typeahead"] li',
          '[role="listbox"] li',
          '[role="listbox"] > div'
        ].join(', '))).filter(o => o.offsetWidth > 0 || o.offsetHeight > 0);

        if (options.length > 0) {
          const opt = options[0];
          try {
            opt.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            opt.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
            opt.click();
          } catch(e) {}
          return true;
        }
        return false;
      };

      // Poll at multiple intervals to catch async dropdown rendering
      setTimeout(trySelectOption, 150);
      setTimeout(trySelectOption, 350);
      setTimeout(trySelectOption, 650);
    }
  }

  /**
   * Extract semantic label / question text describing an element
   */
  static getFieldLabel(element) {
    if (!element) return '';
    const parts = [];

    // 1. Explicit label via for attribute
    if (element.id) {
      try {
        const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
        if (label && label.innerText) parts.push(label.innerText);
      } catch(e) {}
    }

    // 2. Parent label
    const parentLabel = element.closest('label');
    if (parentLabel && parentLabel.innerText) parts.push(parentLabel.innerText);

    // 3. Fieldset legend or question container
    const fieldset = element.closest('fieldset, .jobs-easy-apply-form-section__grouping, .fb-dash-form-element, [data-test-single-typeahead-entity-form-component], div[class*="form-component"]');
    if (fieldset) {
      const legend = fieldset.querySelector('legend, label, .fb-dash-form-element__label, .t-14') || fieldset.previousElementSibling;
      if (legend && legend.innerText) parts.push(legend.innerText);
    }

    // 4. Attributes: aria-label, placeholder, name, id
    if (element.getAttribute('aria-label')) parts.push(element.getAttribute('aria-label'));
    if (element.getAttribute('placeholder')) parts.push(element.getAttribute('placeholder'));
    if (element.getAttribute('name')) parts.push(element.getAttribute('name'));
    if (element.id) parts.push(element.id);

    // 5. Combobox / Typeahead marker
    if (element.getAttribute('role') === 'combobox' || element.getAttribute('aria-autocomplete') === 'list' || Boolean(element.closest('.search-basic-typeahead, .search-vertical-typeahead'))) {
      parts.push('combobox typeahead');
    }

    return parts.join(' ').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  /**
   * Match field semantics against candidate context and return the value
   */
  static resolveValue(fieldLabel, context) {
    const p = context.personal || {};
    const w = context.workAuth || {};
    const exp = context.experience || {};
    const edu = context.education || {};
    const eeo = context.eeo || {};
    const ans = context.customAnswers || {};

    const l = fieldLabel;

    // Contact & Name
    if (/first\s*name|given\s*name|^fname$/i.test(l)) return p.firstName || p.fullName.split(' ')[0];
    if (/last\s*name|family\s*name|surname|^lname$/i.test(l)) return p.lastName || p.fullName.split(' ').slice(1).join(' ');
    if (/full\s*name|your\s*name|applicant\s*name|^name$/i.test(l)) return p.fullName;
    if (/email|e-mail/i.test(l)) return p.email;
    if (/phone|mobile|cell|contact\s*number/i.test(l)) return p.phone;

    // Address & Location (including Typeahead Location Comboboxes)
    if (/street\s*address|address\s*line|home\s*address/i.test(l)) return p.address || p.city || 'Bengaluru, Karnataka, India';
    if (/location|city|town|metro|area|where/i.test(l) || (/combobox|typeahead/i.test(l) && !/company|title|school|college|degree|skill|headline|name/i.test(l))) {
      return p.city || 'Bengaluru, Karnataka, India';
    }
    if (/state|province|region/i.test(l)) return p.state || 'Karnataka';
    if (/postal|zip|pin\s*code/i.test(l)) return p.postalCode || '560001';
    if (/country/i.test(l)) return p.country || 'India';

    // URLs & Links
    if (/linkedin/i.test(l)) return p.linkedinUrl || 'https://www.linkedin.com/in/sanjay--n';
    if (/github/i.test(l)) return p.githubUrl || 'https://github.com/RNS-Forge';
    if (/portfolio|website|personal\s*site|web\s*site|online.*url/i.test(l)) return p.portfolioUrl || 'https://rns-forge.github.io/RNS_Professional_Profile/';

    // Months of experience
    if (/additional\s*month|month/i.test(l) && !/notice/i.test(l)) return '0 month';

    // Work Authorization & Legal
    if (/authorized.*work|legally.*authorized|work.*eligibility/i.test(l)) return w.authorizedInCountry || 'Yes';
    if (/sponsorship|require.*visa|need.*visa|future.*sponsorship/i.test(l)) return w.needSponsorship || 'No';
    if (/security\s*clearance/i.test(l)) return w.securityClearance || 'No';
    if (/visa\s*status/i.test(l)) return w.currentVisaStatus || 'Citizen';

    // Experience & Stats: 2 years if related to resume / core tech, 1 year for all other general experience
    if (/years.*experience|experience.*years|how\s*many\s*years|number\s*of\s*years|^years$/i.test(l) && !/salary|ctc|compensation|notice|grad/i.test(l)) {
      if (/resume|python|sql|full\s*stack|fullstack|ai|artificial|developer|engineer|software|backend|frontend|react|node|fastapi|javascript|typescript|database|cloud|aws|docker|git|api|web|llm/i.test(l)) {
        return '2';
      }
      return '1';
    }
    if (/notice\s*period|how\s*soon.*start/i.test(l)) return exp.noticePeriodDays || '15';
    if (/current\s*salary|current\s*ctc|current\s*compensation/i.test(l)) return exp.currentSalary || '800000';
    if (/expected\s*salary|expected\s*ctc|salary\s*expectation/i.test(l)) return exp.expectedSalary || '1200000';
    if (/company|employer|organization/i.test(l)) return exp.currentCompany || 'Axodian';
    if (/title|role|position|designation/i.test(l)) return exp.currentTitle || 'Software Development Engineer';
    if (/industry/i.test(l)) return 'Information Technology and Services';

    // Education
    if (/gpa|cgpa|grade/i.test(l)) return edu.gpa || '8.5';
    if (/graduation\s*year|year\s*of\s*completion/i.test(l)) return edu.gradYear || '2026';
    if (/degree|qualification|highest\s*level\s*of\s*education/i.test(l)) return edu.degree || "Bachelor's Degree";
    if (/field\s*of\s*study|major|department/i.test(l)) return edu.fieldOfStudy || 'Computer Science and Engineering';
    if (/university|college|institution|school/i.test(l)) return edu.institution || 'Anna University';

    // Diversity & EEO
    if (/gender|sex/i.test(l)) return eeo.gender || 'Male';
    if (/veteran/i.test(l)) return eeo.veteranStatus || 'No';
    if (/disability/i.test(l)) return eeo.disabilityStatus || 'No';
    if (/race|ethnicity/i.test(l)) return eeo.raceEthnicity || 'Asian';

    // Common Open Questions
    if (/why\s*work|why\s*join|interest\s*in/i.test(l)) {
      return ans.whyWorkHere || `I am excited about this opportunity because my background in full-stack engineering, microservices, and Generative AI directly aligns with your technical mission. I thrive in high-impact environments solving complex scalability challenges.`;
    }
    if (/strength|skill|core\s*competenc/i.test(l)) {
      return ans.strengths || `Full-Stack Architecture, Python & TypeScript Microservices, Generative AI & Agentic Workflows, SQL/PostgreSQL Performance Optimization, and High-Speed Web Applications.`;
    }
    if (/cover\s*letter/i.test(l)) {
      return ans.coverLetter || `Dear Hiring Team,\n\nI am writing to express my strong interest in the AI / Software Engineering role. With 2+ years of specialized experience developing high-performance Python backends, agentic AI workflows, and modern full-stack systems, I have a proven track record of architecting scalable systems and delivering measurable impact.\n\nAt Axodian, I led the development and optimization of mission-critical platforms with 99.9% uptime. My technical foundation spans Generative AI, LLMs, RESTful API design, database query optimization, and responsive frontend systems.\n\nI look forward to discussing how my experience can contribute to your engineering objectives.\n\nSincerely,\n${p.fullName || 'Sanjay N'}\n${p.phone || '+91 9361599018'} | ${p.email || '2005sanjaynrs@gmail.com'}`;
    }
    if (/summary|about\s*yourself/i.test(l)) {
      return ans.summary || `${p.fullName || 'Sanjay N'} — Experienced Full Stack and Generative AI Engineer specializing in Python, scalable microservices, LLM agent architectures, and high-performance database engineering.`;
    }

    // Experience numeric fallback: 2 if related to resume skills, otherwise 1
    if (/years.*experience|experience.*years|how\s*many\s*years|number\s*of\s*years/i.test(l) && !/salary|ctc|compensation|notice/i.test(l)) {
      if (/resume|python|sql|full\s*stack|fullstack|ai|artificial|developer|engineer|software|backend|frontend|react|node|fastapi|javascript|typescript|database|cloud|aws|docker|git|api|web|llm/i.test(l)) {
        return '2';
      }
      return '1';
    }

    // Universal AI-generated response for Sanjay for all remaining text input boxes
    return this.generateAiTextForSanjay(l, context);
  }

  /**
   * Generates intelligent, role-aligned candidate text for any open input box for Sanjay N
   */
  static generateAiTextForSanjay(fieldLabel = '', context = {}) {
    const l = (fieldLabel || '').toLowerCase();
    const p = context.personal || {};
    const exp = context.experience || {};
    const fullName = p.fullName || 'Sanjay N';

    // Numeric inputs: 2 if related to resume/core skills, otherwise 1
    if (/years.*experience|experience.*years|how\s*many\s*years|count|months|period|gpa|ctc|salary/i.test(l)) {
      if (/salary|compensation|ctc/i.test(l)) return exp.expectedSalary || '1200000';
      if (/notice/i.test(l)) return exp.noticePeriodDays || '15';
      if (/gpa/i.test(l)) return '8.5';
      if (/resume|python|sql|full\s*stack|fullstack|ai|artificial|developer|engineer|software|backend|frontend|react|node|fastapi|javascript|typescript|database|cloud|aws|docker|git|api|web|llm/i.test(l)) {
        return '2';
      }
      return '1';
    }

    // Technology and Domain questions
    if (/python/i.test(l)) {
      return `2+ years of professional experience developing robust Python backends, FastAPI/Flask REST services, and high-throughput data processing pipelines.`;
    }
    if (/generative\s*ai|gen\s*ai|llm|agent|prompt|rag/i.test(l)) {
      return `Extensive hands-on experience architecting agentic AI systems, prompt optimization, RAG knowledge retrieval, and production LLM integrations (Gemini, Claude, GPT).`;
    }
    if (/sql|database|postgres|mysql|relational|query/i.test(l)) {
      return `2+ years designing optimized SQL queries, indexing, schema architecture, and high-performance transactional database systems.`;
    }
    if (/react|frontend|javascript|typescript|ui|web|full\s*stack/i.test(l)) {
      return `Full Stack Software Engineer proficient in React, TypeScript, modern JavaScript, and building clean, responsive user interfaces with sub-100ms response times.`;
    }
    if (/cloud|aws|docker|kubernetes|devops|ci\/cd/i.test(l)) {
      return `Demonstrated proficiency in Docker containerization, AWS cloud architecture, CI/CD automation pipelines, and scalable microservice infrastructure.`;
    }
    if (/relocat|willing.*move/i.test(l)) {
      return 'Yes, willing to relocate.';
    }
    if (/remote|hybrid|onsite|on-site|work\s*mode|location/i.test(l)) {
      return 'Coimbatore, Tamil Nadu, India (Open to on-site, hybrid, or remote)';
    }
    if (/why\s*hire|why\s*you|qualification|summary|about|describe|tell\s*me/i.test(l)) {
      return `${fullName} is an experienced Full Stack and AI Engineer with 2+ years of proven impact delivering high-scale microservices, automated workflows, and production Generative AI applications.`;
    }
    if (/project|achievement|proud/i.test(l)) {
      return `Spearheaded end-to-end development of AI-powered ATS resume matching systems and high-throughput web architectures delivering automated workflows with 99.9% reliability.`;
    }

    // Universal AI fallback for any input box for candidate Sanjay
    return `${fullName} — Full Stack & Generative AI Engineer (2+ years experience) specializing in scalable architectures, Python, microservices, and AI-enabled software solutions.`;
  }

  /**
   * Automatically fill any form element based on candidate context
   */
  static fillElement(element, context) {
    if (!element || element.disabled || element.readOnly) return false;
    const tagName = element.tagName.toLowerCase();
    const type = (element.getAttribute('type') || '').toLowerCase();
    const label = this.getFieldLabel(element);

    // 1. Text, Email, Tel, Number Inputs
    if (tagName === 'input' && ['text', 'email', 'tel', 'number', 'url', 'search', ''].includes(type)) {
      const val = this.resolveValue(label, context);
      if (val !== null && val !== undefined) {
        // Fill if empty, or if field is required/contact info/unfilled
        if (!element.value || /phone|email|name|salary|years/i.test(label) || element.required) {
          this.setNativeValue(element, val);
          return true;
        }
      }
      return false;
    }

    // 2. Select Dropdowns
    if (tagName === 'select') {
      let val = this.resolveValue(label, context);
      const options = Array.from(element.options);
      
      // Date selects: Start date (2022 / August), End date (2026 / April)
      if (/start.*year|year.*start/i.test(label) || (element.id && element.id.includes('start-date-year'))) {
        val = '2022';
      } else if (/end.*year|year.*end|grad.*year/i.test(label) || (element.id && element.id.includes('end-date-year'))) {
        val = '2026';
      } else if (/start.*month|month.*start/i.test(label) || (element.id && element.id.includes('start-date') && !element.id.includes('year'))) {
        val = 'August';
      } else if (/end.*month|month.*end/i.test(label) || (element.id && element.id.includes('end-date') && !element.id.includes('year'))) {
        val = 'April';
      }

      // If options are Yes/No and val is numeric or not found, default to "Yes" ("accept for all")
      const hasYes = options.some(opt => opt.text.trim().toLowerCase() === 'yes');
      const explicitlyNo = /visa.*sponsorship|require.*sponsorship|security.*clearance/i.test(label);
      if (hasYes && (!val || val === '1' || val === '2' || !/yes|no/i.test(val))) {
        val = explicitlyNo ? 'No' : 'Yes';
      }

      let matchedIndex = -1;
      if (val) {
        matchedIndex = options.findIndex(opt => opt.text.trim().toLowerCase() === val.toLowerCase() || opt.value.toLowerCase() === val.toLowerCase());
        if (matchedIndex === -1) {
          matchedIndex = options.findIndex(opt => opt.text.toLowerCase().includes(val.toLowerCase()) || val.toLowerCase().includes(opt.text.toLowerCase()));
        }
      }

      // Fallback: If still unmatched, choose "Yes" if available
      if (matchedIndex === -1 && hasYes && !explicitlyNo) {
        matchedIndex = options.findIndex(opt => opt.text.trim().toLowerCase() === 'yes');
      }

      if (matchedIndex !== -1 && element.selectedIndex !== matchedIndex) {
        element.selectedIndex = matchedIndex;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    }

    // 3. Textarea
    if (tagName === 'textarea') {
      const val = this.resolveValue(label, context);
      if (val && !element.value) {
        this.setNativeValue(element, val);
        return true;
      }
      return false;
    }

    // 4. Radio buttons: Accept for all affirmative choices (Yes / Accept / Agree / Authorized)
    if (tagName === 'input' && type === 'radio') {
      let val = this.resolveValue(label, context);
      
      let pEl = element.parentElement;
      let parentOptionText = '';
      while (pEl && pEl.tagName !== 'FIELDSET' && pEl.tagName !== 'FORM') {
        if (pEl.innerText && pEl.innerText.trim()) {
          parentOptionText = pEl.innerText.trim();
          break;
        }
        pEl = pEl.parentElement;
      }

      const radioText = `${element.value || ''} ${element.getAttribute('aria-label') || ''} ${parentOptionText}`.trim().toLowerCase();
      
      // Explicit negative check only if visa sponsorship or clearance requires 'No'
      const explicitlyNo = val === 'No' || /visa.*sponsorship|require.*sponsorship|future.*sponsorship/i.test(label);
      if (explicitlyNo && /no|false|decline|disagree/i.test(radioText)) {
        if (!element.checked) {
          element.click();
          element.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
        return false;
      }

      // "Accept for all" affirmative selection
      const isAffirmative = /yes|agree|accept|confirm|true|i have|eligible|authorized|willing/i.test(radioText);
      if (isAffirmative || (!explicitlyNo && (/yes/i.test(radioText) || !element.name || element.value === '1' || element.value === 'true' || val === 'Yes'))) {
        if (!element.checked) {
          element.click();
          element.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      return false;
    }

    // 5. Checkboxes: Accept for all (Agreements, terms, consents, confirmations)
    if (tagName === 'input' && type === 'checkbox') {
      if (!element.checked) {
        element.click();
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    }

    return false;
  }

  /**
   * Attach a PDF file to an input[type="file"] element via DataTransfer
   */
  static attachPdfBlob(fileInput, pdfBlob, filename = 'Sanjay_N_Resume_100_ATS.pdf') {
    if (!fileInput || !pdfBlob) return false;
    try {
      const file = new File([pdfBlob], filename, { type: 'application/pdf', lastModified: Date.now() });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;

      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      fileInput.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    } catch (e) {
      console.warn('FastFormSolver file attachment warning:', e);
      return false;
    }
  }
}

if (typeof window !== 'undefined') {
  window.FastFormSolver = FastFormSolver;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FastFormSolver;
}
