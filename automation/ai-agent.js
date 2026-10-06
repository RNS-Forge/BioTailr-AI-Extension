/**
 * BioTailr AI - Autonomous Screen Form Solving Agent
 * Multi-Model Cognitive Loop powered by Google Gemini & Groq APIs.
 * Observes browser form state, reasons over candidate profile & constraints, and drives native actions.
 */

class BioTailrApplyAgent {
  constructor(config = {}) {
    // Keys are resolved dynamically from main project .env via /api/keys or chrome.storage
    this.geminiApiKey = config.geminiApiKey || '';
    this.groqApiKey = config.groqApiKey || '';
    this.modelPreference = config.modelPreference || 'gemini';
    this.loadKeys();
  }

  async loadKeys() {
    // 1. Try local server endpoint if running
    try {
      const res = await fetch('http://localhost:3000/api/keys', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.geminiKey) this.geminiApiKey = data.geminiKey;
        if (data.groqKey) this.groqApiKey = data.groqKey;
        return;
      }
    } catch(e) {}

    // 2. Try chrome storage
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const stored = await chrome.storage.local.get(['gemini_api_key', 'groq_api_key']);
        if (stored.gemini_api_key) this.geminiApiKey = stored.gemini_api_key;
        if (stored.groq_api_key) this.groqApiKey = stored.groq_api_key;
      }
    } catch(e) {}
  }

  /**
   * 1. PERCEPTION: Extracts visible form elements, questions, options, and validation errors
   */
  perceiveScreen(dialog, jobInfo = {}) {
    if (!dialog) return null;

    const title = dialog.innerText.slice(0, 120).replace(/\n+/g, ' ');
    const modalText = (dialog.innerText || '').toLowerCase();

    // Check for errors on current screen
    const errors = Array.from(dialog.querySelectorAll('.artdeco-inline-feedback--error, [data-test-form-element-error-messages], .fb-form-element__error-message, [class*="error"]'))
      .map(e => e.innerText.trim())
      .filter(Boolean);

    // Extract all interactive elements
    const elements = [];
    const rawInputs = Array.from(dialog.querySelectorAll('input:not([type="hidden"]), select, textarea')).filter(el => {
      return !el.disabled && !el.readOnly && (el.offsetWidth > 0 || el.offsetHeight > 0 || el.type === 'file' || el.type === 'checkbox' || el.type === 'radio');
    });

    rawInputs.forEach((el, index) => {
      const tag = el.tagName.toLowerCase();
      const type = (el.getAttribute('type') || '').toLowerCase();
      const pContainer = el.closest('.fb-dash-form-element, .jobs-easy-apply-form-section__grouping, fieldset, div[class*="form-component"]') || el.parentElement;

      // Extract question label from label, fieldset legend, or parent text
      const parts = [];
      if (el.id) {
        try {
          const l = dialog.querySelector(`label[for="${CSS.escape(el.id)}"]`);
          if (l && l.innerText) parts.push(l.innerText);
        } catch(e) {}
      }
      const parentLabel = el.closest('label');
      if (parentLabel && parentLabel.innerText) parts.push(parentLabel.innerText);
      if (pContainer && pContainer.querySelector('legend, label, .t-14')) {
        parts.push(pContainer.querySelector('legend, label, .t-14').innerText);
      }
      if (el.getAttribute('aria-label')) parts.push(el.getAttribute('aria-label'));
      if (el.placeholder) parts.push(el.placeholder);
      if (el.name) parts.push(el.name);

      const label = parts.join(' ').replace(/\s+/g, ' ').trim();

      // Dropdown options
      let options = null;
      if (tag === 'select') {
        options = Array.from(el.options).map(o => ({ index: o.index, text: o.text.trim(), value: o.value }));
      }

      // Radio & Checkbox label text extraction (searches parent up to container)
      let optionText = '';
      if (type === 'radio' || type === 'checkbox') {
        let p = el.parentElement;
        while (p && p !== pContainer && p.tagName !== 'FORM') {
          if (p.innerText && p.innerText.trim()) {
            optionText = p.innerText.trim();
            break;
          }
          p = p.parentElement;
        }
      }

      elements.push({
        index,
        id: el.id,
        tag,
        type,
        role: el.getAttribute('role'),
        label,
        currentValue: el.value,
        checked: el.checked,
        options,
        optionText,
        required: el.required || label.toLowerCase().includes('required') || label.includes('*')
      });
    });

    // Check for remove buttons in Education / Work Experience
    const removeButtons = Array.from(dialog.querySelectorAll('button, a[role="button"]')).filter(b => {
      const t = (b.innerText || b.getAttribute('aria-label') || '').toLowerCase().trim();
      return t === 'remove' || t.includes('remove education') || t.includes('remove experience');
    }).map((b, i) => {
      const card = b.closest('li, .jobs-easy-apply-form-section__grouping, div[class*="group"]') || b.parentElement?.parentElement;
      return {
        buttonIndex: i,
        cardText: card ? card.innerText.replace(/\n+/g, ' ').trim().slice(0, 80) : ''
      };
    });

    // Action buttons
    const actionButtons = Array.from(dialog.querySelectorAll('button')).filter(b => b.offsetWidth > 0 && b.offsetHeight > 0).map(b => {
      const t = (b.innerText || b.getAttribute('aria-label') || '').trim();
      return { text: t, lower: t.toLowerCase() };
    });

    return {
      title,
      isEducationStep: modalText.includes('education') && !modalText.includes('work experience'),
      isWorkExperienceStep: modalText.includes('work experience'),
      isReviewStep: modalText.includes('review your application') || actionButtons.some(b => b.lower === 'submit application'),
      elements,
      removeButtons,
      actionButtons,
      errors,
      jobInfo
    };
  }

  /**
   * 2. REASONING: Uses Gemini or Groq to synthesize actions aligned with Candidate Sanjay N & constraints
   */
  async reasonActions(screenState, candidateContext) {
    const p = candidateContext.personal || {};
    const fullName = p.fullName || 'Sanjay N';

    // Build the AI Agent Prompt
    const systemPrompt = `You are BioTailr Autonomous Job Apply Agent.
Your job is to reason about the active application modal screen and output the exact form-filling actions and navigation decision.

Candidate Persona:
- Name: ${fullName}
- Email: ${p.email || '2005sanjaynrs@gmail.com'}
- Phone: ${p.phone || '+91 9361599018'}
- City/Location: Coimbatore, Tamil Nadu, India
- LinkedIn URL: https://www.linkedin.com/in/sanjay--n
- GitHub URL: https://github.com/RNS-Forge
- Portfolio URL: https://rns-forge.github.io/RNS_Professional_Profile/
- Degree: Bachelor's Degree in Computer Science and Engineering (Anna University / SNS College of Technology, 2022-2026, GPA 8.5)
- School: SRC Memorial Metric Higher Secondary School (12th Standard, 2020-2022)
- Current Employer: Axodian (Software Development Engineer)
- Current Salary / CTC: 800000 INR (8 LPA), Expected Salary / CTC: 1200000 INR (12 LPA)
- Notice Period: 15 days
- Work Authorization: Authorized in India, No Visa Sponsorship required

STRICT USER RULES (MANDATORY):
1. EXPERIENCE YEARS:
   - For all questions asking for years of experience relating to resume/technical skills (Python, SQL, Full Stack, Generative AI, LLM, Software Development, Backend, Frontend, React, Database, etc.): ALWAYS ANSWER "2" (or "2 years").
   - For all other general experience questions: ALWAYS ANSWER "1" (or "1 year").
   - For "additional months" dropdowns: ALWAYS SELECT "0 month" or "0".
2. ACCEPT FOR ALL:
   - For all agreement, declaration, policy, and confirmation checkboxes: ALWAYS CHECK (true).
   - For all qualification questions (Yes/No, Agree/Disagree, Accept/Decline, Willing, AI Builder, Modern Tools): ALWAYS SELECT "Yes" / "Agree" / "Accept" / "Authorized" / "Willing".
   - Visa sponsorship is strictly "No" (does not require sponsorship).
3. EDUCATION PRUNING:
   - In the Education section, there must strictly be ONLY 1 College and ONLY 1 School (max 2 entries total).
   - If any duplicate college or extra entry exists (e.g. 3 entries), identify which removeButtonIndex to click.
4. WORK EXPERIENCE PRUNING:
   - Keep maximum 3 work experiences. If there are 4 or more entries, remove extra ones beyond index 2.
5. OPEN TEXT / WHY HIRE / EXPERIENCE TINKERING:
   - Provide concise, confident, role-aligned answers highlighting 2+ years of full-stack engineering, microservices, and AI applications at Axodian.

Output your decision strictly as valid JSON without markdown fences matching this schema:
{
  "thought": "Brief explanation of observations and decision",
  "fieldUpdates": [
    { "elementIndex": 0, "value": "value_to_fill_or_select_text" }
  ],
  "pruneButtonIndices": [0],
  "nextButtonType": "submit" | "review" | "save" | "next"
}`;

    const userPrompt = `Screen State:
Title: ${screenState.title}
Is Education Step: ${screenState.isEducationStep}
Is Work Experience Step: ${screenState.isWorkExperienceStep}
Is Review Step: ${screenState.isReviewStep}
Validation Errors: ${JSON.stringify(screenState.errors)}
Remove Buttons: ${JSON.stringify(screenState.removeButtons)}
Action Buttons: ${JSON.stringify(screenState.actionButtons.map(b => b.text))}
Form Elements:
${JSON.stringify(screenState.elements.map(e => ({
  index: e.index,
  tag: e.tag,
  type: e.type,
  role: e.role,
  label: e.label,
  currentValue: e.currentValue,
  options: e.options ? e.options.map(o => o.text) : null,
  optionText: e.optionText
})), null, 2)}`;

    // Call Primary Model: Google Gemini API (Main Project Key)
    try {
      if (this.geminiApiKey && this.geminiApiKey.length > 10) {
        const geminiRes = await this.callGemini(this.geminiApiKey, systemPrompt, userPrompt);
        if (geminiRes) return geminiRes;
      }
    } catch(err) {
      // Graceful fallback
    }

    // Call Secondary Model: Groq API
    try {
      if (this.groqApiKey && this.groqApiKey.length > 10) {
        const groqRes = await this.callGroq(this.groqApiKey, systemPrompt, userPrompt);
        if (groqRes) return groqRes;
      }
    } catch(err) {}

    // High-Speed Built-In Deterministic Reasoning Engine
    return this.deterministicReasoning(screenState, candidateContext);
  }

  async callGemini(apiKey, systemPrompt, userPrompt) {
    const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
    const payload = {
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    };

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) return JSON.parse(rawText.replace(/```json\n?|\n?```/g, '').trim());
        }
      } catch(e) {}
    }
    return null;
  }

  async callGroq(apiKey, systemPrompt, userPrompt) {
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    const payload = {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    return JSON.parse(content);
  }

  /**
   * Deterministic Reasoning Engine (Zero-Latency Local Fallback)
   */
  deterministicReasoning(screenState, context) {
    const p = context.personal || {};
    const fullName = p.fullName || 'Sanjay N';
    const fieldUpdates = [];
    const pruneButtonIndices = [];

    // 1. Prune Education: strictly 1 College and 1 School
    if (screenState.isEducationStep && screenState.removeButtons.length > 2) {
      let hasCollege = false;
      let hasSchool = false;
      screenState.removeButtons.forEach(rb => {
        const text = rb.cardText.toLowerCase();
        const isSchool = /school|metric|matriculation|secondary|12th|10th/i.test(text);
        const isCollege = !isSchool && (/college|university|institute|institution|btech|bachelor|engineering/i.test(text) || text.includes('sns') || text.includes('anna'));

        if (isCollege && !hasCollege) { hasCollege = true; return; }
        if (isSchool && !hasSchool) { hasSchool = true; return; }
        pruneButtonIndices.push(rb.buttonIndex);
      });
    }

    // 2. Prune Work Experience: max 3
    if (screenState.isWorkExperienceStep && screenState.removeButtons.length > 3) {
      for (let i = 3; i < screenState.removeButtons.length; i++) {
        pruneButtonIndices.push(screenState.removeButtons[i].buttonIndex);
      }
    }

    // 3. Process each element
    screenState.elements.forEach(el => {
      const lbl = (el.label + ' ' + (el.optionText || '')).toLowerCase();
      const isTech = /resume|python|sql|full\s*stack|fullstack|ai|artificial|developer|engineer|software|backend|frontend|react|node|fastapi|javascript|typescript|database|cloud|aws|docker|git|api|web|llm/i.test(lbl);
      const isExperienceCount = /years.*experience|experience.*years|how\s*many\s*years|number\s*of\s*years|^years$/i.test(lbl) && !/salary|ctc|compensation|notice|grad/i.test(lbl);

      let val = null;

      if (el.tag === 'input' && ['text', 'number', 'tel', 'email', 'url', ''].includes(el.type)) {
        if (isExperienceCount) {
          val = isTech ? '2' : '1';
        } else if (/phone|mobile|contact/i.test(lbl)) {
          val = p.phone || '+91 9361599018';
        } else if (/email/i.test(lbl)) {
          val = p.email || '2005sanjaynrs@gmail.com';
        } else if (/first\s*name/i.test(lbl)) {
          val = p.firstName || 'Sanjay';
        } else if (/last\s*name/i.test(lbl)) {
          val = p.lastName || 'N';
        } else if (/city|location|town|where.*based/i.test(lbl)) {
          val = 'Coimbatore, Tamil Nadu, India';
        } else if (/linkedin/i.test(lbl)) {
          val = p.linkedinUrl || 'https://www.linkedin.com/in/sanjay--n';
        } else if (/portfolio|website|online.*url|other/i.test(lbl)) {
          val = p.portfolioUrl || 'https://rns-forge.github.io/RNS_Professional_Profile/';
        } else if (/github/i.test(lbl)) {
          val = p.githubUrl || 'https://github.com/RNS-Forge';
        } else if (/school|college|university|institution/i.test(lbl)) {
          val = 'Anna University';
        } else if (/degree|qualification/i.test(lbl)) {
          val = "Bachelor's Degree";
        } else if (/field\s*of\s*study|major|department/i.test(lbl)) {
          val = 'Computer Science and Engineering';
        } else if (/headline/i.test(lbl)) {
          val = 'Generative AI & Full Stack Engineer';
        } else if (/income.*expectation/i.test(lbl)) {
          val = '1,200,000 INR (12 LPA)';
        } else if (/current.*salary|current.*ctc/i.test(lbl)) {
          val = '800,000 INR (8 LPA)';
        } else if (/expected.*salary|expected.*ctc/i.test(lbl)) {
          val = '1,200,000 INR (12 LPA)';
        } else if (/organisation|organization|company/i.test(lbl)) {
          val = 'Axodian';
        } else if (/designation|job.*title/i.test(lbl)) {
          val = 'Full Stack & AI Engineer';
        } else if (/notice/i.test(lbl)) {
          val = '15';
        } else if (!el.currentValue) {
          val = fullName;
        }

        if (val !== null && (!el.currentValue || /phone|email|name|salary|ctc|years|city|location|school|linkedin|portfolio|url|other/i.test(lbl))) {
          fieldUpdates.push({ elementIndex: el.index, value: val });
        }
      } else if (el.tag === 'textarea') {
        if (/notice/i.test(lbl)) {
          val = '15 days';
        } else if (/current.*salary|current.*ctc/i.test(lbl)) {
          val = '800,000 INR (8 LPA)';
        } else if (/expected.*salary|expected.*ctc/i.test(lbl)) {
          val = '1,200,000 INR (12 LPA)';
        } else if (/tinkering|ai.*automation|software.*engineering/i.test(lbl)) {
          val = '2+ years of hands-on experience building full-stack software, agentic AI systems, LLM automation pipelines, and scalable backend microservices at Axodian. Deeply proficient in Python, FastAPI, React, modern Claude/OpenAI APIs, and autonomous agent workflows.';
        } else if (!el.currentValue) {
          val = `Dear Hiring Team,\n\nI am excited to apply for this engineering role. With 2+ years of production experience architecting high-performance Python backends, agentic AI workflows, and modern web applications at Axodian, I have a strong track record of shipping resilient, high-impact systems.\n\nSincerely,\n${fullName}`;
        }
        if (val !== null) {
          fieldUpdates.push({ elementIndex: el.index, value: val });
        }
      } else if (el.tag === 'select') {
        if (/month/i.test(lbl)) {
          val = '0 month';
        } else if (/start.*year|year.*start/i.test(lbl) || (el.id && el.id.includes('start-date-year'))) {
          val = '2022';
        } else if (/end.*year|year.*end|grad.*year/i.test(lbl) || (el.id && el.id.includes('end-date-year'))) {
          val = '2026';
        } else if (/start.*month/i.test(lbl)) {
          val = 'August';
        } else if (/end.*month/i.test(lbl)) {
          val = 'April';
        } else if (isExperienceCount) {
          val = isTech ? '2' : '1';
        } else {
          val = 'Yes';
        }
        fieldUpdates.push({ elementIndex: el.index, value: val });
      } else if (el.type === 'radio') {
        const explicitlyNo = /visa.*sponsorship|require.*sponsorship/i.test(lbl);
        val = explicitlyNo ? 'No' : 'Yes';
        fieldUpdates.push({ elementIndex: el.index, value: val });
      } else if (el.type === 'checkbox') {
        fieldUpdates.push({ elementIndex: el.index, value: 'check' });
      }
    });

    // Determine next button
    let nextButtonType = 'next';
    const actionTexts = screenState.actionButtons.map(b => b.lower);
    if (actionTexts.some(t => t.includes('submit application') || t === 'submit')) {
      nextButtonType = 'submit';
    } else if (actionTexts.some(t => t === 'save')) {
      nextButtonType = 'save';
    } else if (actionTexts.some(t => t.includes('review'))) {
      nextButtonType = 'review';
    }

    return {
      thought: 'BioTailr Agent evaluated screen state deterministically.',
      fieldUpdates,
      pruneButtonIndices,
      nextButtonType
    };
  }

  /**
   * 3. ACTUATION: Executes the AI Agent plan natively on the DOM
   */
  async executePlan(dialog, decisionPlan, onStatus = () => {}) {
    if (!dialog || !decisionPlan) return false;

    // A. Prune extra education or work experience cards
    if (decisionPlan.pruneButtonIndices && decisionPlan.pruneButtonIndices.length > 0) {
      const removeButtons = Array.from(dialog.querySelectorAll('button, a[role="button"]')).filter(b => {
        const t = (b.innerText || b.getAttribute('aria-label') || '').toLowerCase().trim();
        return t === 'remove' || t.includes('remove education') || t.includes('remove experience');
      });

      for (const idx of decisionPlan.pruneButtonIndices) {
        if (removeButtons[idx]) {
          onStatus(`[BioTailr Agent] Pruning extra entry #${idx + 1}...`);
          try {
            removeButtons[idx].click();
            await new Promise(r => setTimeout(r, 250));
            // Confirm modal if present
            const confirmBtn = document.querySelector('.artdeco-modal__confirm-dialog-btn, button[data-control-name="confirm_delete"], button.artdeco-button--primary');
            if (confirmBtn && confirmBtn !== removeButtons[idx]) {
              confirmBtn.click();
              await new Promise(r => setTimeout(r, 200));
            }
          } catch(e) {}
        }
      }
    }

    // B. Apply field updates
    const rawInputs = Array.from(dialog.querySelectorAll('input:not([type="hidden"]), select, textarea')).filter(el => {
      return !el.disabled && !el.readOnly && (el.offsetWidth > 0 || el.offsetHeight > 0 || el.type === 'file' || el.type === 'checkbox' || el.type === 'radio');
    });

    for (const update of (decisionPlan.fieldUpdates || [])) {
      const el = rawInputs[update.elementIndex];
      if (!el) continue;

      const tag = el.tagName.toLowerCase();
      const type = (el.getAttribute('type') || '').toLowerCase();
      const targetVal = String(update.value || '');

      if (tag === 'input' && ['text', 'number', 'tel', 'email', 'url', ''].includes(type)) {
        this.setNativeValue(el, targetVal);

        // Auto-solve typeahead comboboxes (e.g. Location or City)
        if (el.getAttribute('role') === 'combobox' || (el.id && el.id.includes('typeahead'))) {
          await new Promise(r => setTimeout(r, 200));
          const option = document.querySelector('[role="listbox"] [role="option"], .basic-typeahead__selectable, div[class*="typeahead"] div');
          if (option) {
            try { option.click(); } catch(e) {}
          }
        }
      } else if (tag === 'textarea') {
        this.setNativeValue(el, targetVal);
      } else if (tag === 'select') {
        const opts = Array.from(el.options);
        let matchIdx = opts.findIndex(o => o.text.trim().toLowerCase() === targetVal.toLowerCase() || o.value.toLowerCase() === targetVal.toLowerCase());
        if (matchIdx === -1) {
          matchIdx = opts.findIndex(o => o.text.toLowerCase().includes(targetVal.toLowerCase()) || targetVal.toLowerCase().includes(o.text.toLowerCase()));
        }
        if (matchIdx === -1 && /month/i.test(targetVal)) {
          matchIdx = opts.findIndex(o => o.text.includes('0'));
        }
        if (matchIdx === -1 && /yes/i.test(targetVal)) {
          matchIdx = opts.findIndex(o => o.text.trim().toLowerCase() === 'yes');
        }
        if (matchIdx !== -1 && el.selectedIndex !== matchIdx) {
          el.selectedIndex = matchIdx;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } else if (type === 'radio') {
        // Deep ancestry search for radio button label (grandparent / label / fieldset)
        let p = el.parentElement;
        let pText = '';
        while (p && p.tagName !== 'FIELDSET' && p.tagName !== 'FORM') {
          if (p.innerText && p.innerText.trim()) { pText = p.innerText.trim(); break; }
          p = p.parentElement;
        }
        const full = (el.value + ' ' + pText).toLowerCase();
        if ((/yes/i.test(targetVal) && /yes|agree|accept|confirm|true|authorized/i.test(full)) ||
            (/no/i.test(targetVal) && /no|false|decline/i.test(full))) {
          if (!el.checked) {
            el.click();
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      } else if (type === 'checkbox') {
        if (!el.checked) {
          el.click();
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }

    return true;
  }

  setNativeValue(element, value) {
    if (!element) return;
    const proto = element.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement?.prototype : window.HTMLInputElement?.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto || {}, 'value')?.set
      || Object.getOwnPropertyDescriptor(element.__proto__ || {}, 'value')?.set;

    if (setter) {
      setter.call(element, value);
    } else {
      element.value = value;
    }

    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  }
}

if (typeof window !== 'undefined') {
  window.BioTailrApplyAgent = BioTailrApplyAgent;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BioTailrApplyAgent;
}
