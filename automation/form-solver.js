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
      || Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;

    if (valueSetter) {
      valueSetter.call(element, value);
    } else {
      element.value = value;
    }

    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  /**
   * Extract semantic label / question text describing an element
   */
  static getFieldLabel(element) {
    if (!element) return '';
    const parts = [];

    // 1. Explicit label via for attribute
    if (element.id) {
      const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
      if (label && label.innerText) parts.push(label.innerText);
    }

    // 2. Parent label
    const parentLabel = element.closest('label');
    if (parentLabel && parentLabel.innerText) parts.push(parentLabel.innerText);

    // 3. Fieldset legend or question container
    const fieldset = element.closest('fieldset, .jobs-easy-apply-form-section__grouping, .fb-dash-form-element');
    if (fieldset) {
      const legend = fieldset.querySelector('legend, label, .fb-dash-form-element__label, .t-14');
      if (legend && legend.innerText) parts.push(legend.innerText);
    }

    // 4. Attributes: aria-label, placeholder, name, id
    if (element.getAttribute('aria-label')) parts.push(element.getAttribute('aria-label'));
    if (element.getAttribute('placeholder')) parts.push(element.getAttribute('placeholder'));
    if (element.getAttribute('name')) parts.push(element.getAttribute('name'));
    if (element.id) parts.push(element.id);

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

    // Address & Location
    if (/street\s*address|address\s*line|home\s*address/i.test(l)) return p.address;
    if (/city|town/i.test(l)) return p.city;
    if (/state|province|region/i.test(l)) return p.state;
    if (/postal|zip|pin\s*code/i.test(l)) return p.postalCode;
    if (/country/i.test(l)) return p.country;

    // URLs & Links
    if (/linkedin/i.test(l)) return p.linkedinUrl;
    if (/github/i.test(l)) return p.githubUrl;
    if (/portfolio|website|personal\s*site|web\s*site/i.test(l)) return p.portfolioUrl;

    // Work Authorization & Legal
    if (/authorized.*work|legally.*authorized|work.*eligibility/i.test(l)) return w.authorizedInCountry || 'Yes';
    if (/sponsorship|require.*visa|need.*visa|future.*sponsorship/i.test(l)) return w.needSponsorship || 'No';
    if (/security\s*clearance/i.test(l)) return w.securityClearance || 'No';
    if (/visa\s*status/i.test(l)) return w.currentVisaStatus || 'Citizen';

    // Experience & Stats
    if (/years.*experience|experience.*years|how\s*many\s*years/i.test(l)) return exp.totalYears || '4';
    if (/notice\s*period|how\s*soon.*start/i.test(l)) return exp.noticePeriodDays || '15';
    if (/current\s*salary|current\s*ctc|current\s*compensation/i.test(l)) return exp.currentSalary || '800000';
    if (/expected\s*salary|expected\s*ctc|salary\s*expectation/i.test(l)) return exp.expectedSalary || '1200000';
    if (/current\s*company|present\s*company|current\s*employer/i.test(l)) return exp.currentCompany || 'Axodian';
    if (/current\s*title|current\s*role|designation/i.test(l)) return exp.currentTitle || 'Software Development Engineer';

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
    if (/why\s*work|why\s*join|interest\s*in/i.test(l)) return ans.whyWorkHere || '';
    if (/strength|skill|core\s*competenc/i.test(l)) return ans.strengths || '';
    if (/summary|about\s*yourself|cover\s*letter/i.test(l)) return ans.summary || '';

    // Smart default fallback for numeric questions: default to 3-4 years
    if (/numeric|count|years/i.test(l)) return exp.totalYears || '4';

    return null;
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
    if (tagName === 'input' && ['text', 'email', 'tel', 'number', 'url', ''].includes(type)) {
      const val = this.resolveValue(label, context);
      if (val !== null && val !== undefined) {
        // Only fill if empty, or if field is required/contact info
        if (!element.value || /phone|email|name|salary|years/i.test(label)) {
          this.setNativeValue(element, val);
          return true;
        }
      }
      return false;
    }

    // 2. Select Dropdowns
    if (tagName === 'select') {
      const val = this.resolveValue(label, context);
      if (!val) return false;

      let matchedIndex = -1;
      const options = Array.from(element.options);
      
      // Match exact or contains
      matchedIndex = options.findIndex(opt => opt.text.trim().toLowerCase() === val.toLowerCase() || opt.value.toLowerCase() === val.toLowerCase());
      if (matchedIndex === -1) {
        matchedIndex = options.findIndex(opt => opt.text.toLowerCase().includes(val.toLowerCase()) || val.toLowerCase().includes(opt.text.toLowerCase()));
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

    // 4. Radio buttons
    if (tagName === 'input' && type === 'radio') {
      const val = this.resolveValue(label, context);
      if (!val) return false;
      const radioText = (element.value || '') + ' ' + (element.getAttribute('aria-label') || '') + ' ' + (element.closest('label')?.innerText || '');
      if (radioText.toLowerCase().includes(val.toLowerCase()) || (/yes/i.test(val) && /yes/i.test(radioText)) || (/no/i.test(val) && /no/i.test(radioText))) {
        if (!element.checked) {
          element.click();
          element.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      return false;
    }

    // 5. Checkboxes (e.g. Terms / Agree / Confirmation)
    if (tagName === 'input' && type === 'checkbox') {
      if (/agree|accept|acknowledge|consent|confirm/i.test(label)) {
        if (!element.checked) {
          element.click();
          element.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
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
