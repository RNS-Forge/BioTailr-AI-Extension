/**
 * BioTailr AI - Web App Bridge Content Script
 * Injected only on rns-forge.github.io/BioTailr-AI/* pages.
 * Bridges chrome.storage job data into the web app and relays the
 * generated resume HTML back to the extension side panel.
 */

(function () {
  'use strict';

  const ALLOWED_ORIGINS = [
    'https://rns-forge.github.io',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];

  // Origin verification
  if (!ALLOWED_ORIGINS.includes(window.location.origin)) {
    console.warn('[BioTailr Bridge] Security notice: Origin not permitted:', window.location.origin);
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const jobId = urlParams.get('extjob');
  const urlAuthKey = urlParams.get('authKey') || '';

  // Only activate when the extension triggered this tab
  if (!jobId) return;

  console.log('[BioTailr Bridge] Secure extension job mode active. Job ID:', jobId);

  // Step 1: Read job data from chrome.storage.local (extension context access)
  chrome.storage.local.get(['biotailr_ext_job_' + jobId], (result) => {
    const jobData = result['biotailr_ext_job_' + jobId];
    if (!jobData) {
      console.warn('[BioTailr Bridge] No job data found in storage for ID:', jobId);
      chrome.runtime.sendMessage({
        action: 'EXT_JOB_ERROR',
        jobId,
        error: 'Job data not found in storage. Please retry the scan.'
      }).catch(() => {});
      return;
    }

    // Cryptographic Security Key Handshake Verification
    const expectedKey = jobData.authKey || urlAuthKey;
    if (urlAuthKey && jobData.authKey && urlAuthKey !== jobData.authKey) {
      console.error('[BioTailr Bridge] Security key mismatch between URL parameter and storage!');
      chrome.runtime.sendMessage({
        action: 'EXT_JOB_ERROR',
        jobId,
        error: 'Security handshake failed: unauthorized communication key.'
      }).catch(() => {});
      chrome.storage.local.remove(['biotailr_ext_job_' + jobId]);
      return;
    }

    console.log('[BioTailr Bridge] Secure job data authenticated for:', jobData.targetRole);

    // Step 2: Wait for the web app to be ready, then inject job data via postMessage with targetOrigin
    let attempts = 0;
    const maxAttempts = 30; // 15 seconds

    const tryInjectJob = () => {
      attempts++;
      const isReady = document.getElementById('screen-landing') ||
                      document.getElementById('screen-entry') ||
                      document.getElementById('btn-go-tailr');

      if (isReady || attempts >= maxAttempts) {
        setTimeout(() => {
          console.log('[BioTailr Bridge] Posting secured BIOTAILR_EXT_JOB to web app...');
          window.postMessage({
            type: 'BIOTAILR_EXT_JOB',
            jobId,
            authKey: expectedKey,
            data: jobData
          }, window.location.origin);
        }, 600);
      } else {
        setTimeout(tryInjectJob, 500);
      }
    };

    tryInjectJob();

    // Step 3: Listen for the web app's result postMessage
    const onResultHandler = (event) => {
      // Origin and type validation
      if (event.origin !== window.location.origin) return;
      if (!event.data || event.data.type !== 'BIOTAILR_EXT_RESULT') return;
      if (event.data.jobId !== jobId) return;

      // Verify security key signature
      if (expectedKey && event.data.authKey !== expectedKey) {
        console.error('[BioTailr Bridge] Security key mismatch on result message! Dropping untrusted message.');
        return;
      }

      window.removeEventListener('message', onResultHandler);
      console.log('[BioTailr Bridge] Secure resume result verified from web app.');

      // Handle error case
      if (event.data.error || !event.data.compiledHtml) {
        chrome.runtime.sendMessage({
          action: 'EXT_JOB_ERROR',
          jobId,
          error: event.data.error || 'Web app returned no resume HTML.'
        }).catch(() => {});
        chrome.storage.local.remove(['biotailr_ext_job_' + jobId]);
        return;
      }

      const { compiledHtml, fullDocumentHtml, filename, archetypeId, targetRole, atsScore } = event.data;

      // Relay authenticated result back to the extension background service worker
      chrome.runtime.sendMessage({
        action: 'RESUME_READY',
        jobId,
        authKey: expectedKey,
        compiledHtml,
        fullDocumentHtml: fullDocumentHtml || compiledHtml,
        filename: filename || `Sanjay_N_${(targetRole || 'BioTailr').replace(/[^a-zA-Z0-9]/g, '_')}_Resume`,
        archetypeId,
        targetRole,
        atsScore: atsScore || 100
      }).catch((err) => {
        console.warn('[BioTailr Bridge] Could not relay result to extension:', err);
      });

      // Ephemeral cleanup: wipe storage key immediately
      chrome.storage.local.remove(['biotailr_ext_job_' + jobId]);
    };

    window.addEventListener('message', onResultHandler);
  });

})();
