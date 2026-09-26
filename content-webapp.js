/**
 * BioTailr AI - Web App Bridge Content Script
 * Injected only on rns-forge.github.io/BioTailr-AI/* pages.
 * Bridges chrome.storage job data into the web app and relays the
 * generated resume HTML back to the extension side panel.
 */

(function () {
  'use strict';

  const urlParams = new URLSearchParams(window.location.search);
  const jobId = urlParams.get('extjob');

  // Only activate when the extension triggered this tab
  if (!jobId) return;

  console.log('[BioTailr Bridge] Extension job mode active. Job ID:', jobId);

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

    console.log('[BioTailr Bridge] Job data loaded:', jobData.targetRole);

    // Step 2: Wait for the web app to be ready, then inject job data via postMessage
    let attempts = 0;
    const maxAttempts = 30; // 15 seconds

    const tryInjectJob = () => {
      attempts++;
      // Check if web app has initialised by looking for a known DOM element
      const isReady = document.getElementById('screen-landing') ||
                      document.getElementById('screen-entry') ||
                      document.getElementById('btn-go-tailr');

      if (isReady || attempts >= maxAttempts) {
        // Give the app's DOMContentLoaded + initApp() a little extra time
        setTimeout(() => {
          console.log('[BioTailr Bridge] Posting BIOTAILR_EXT_JOB to web app...');
          window.postMessage({
            type: 'BIOTAILR_EXT_JOB',
            jobId,
            data: jobData
          }, '*');
        }, 600);
      } else {
        setTimeout(tryInjectJob, 500);
      }
    };

    tryInjectJob();
  });

  // Step 3: Listen for the web app's result postMessage
  window.addEventListener('message', (event) => {
    if (!event.data || event.data.type !== 'BIOTAILR_EXT_RESULT') return;
    if (event.data.jobId !== jobId) return;

    console.log('[BioTailr Bridge] Resume result received from web app.');

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

    const { compiledHtml, archetypeId, targetRole, atsScore } = event.data;

    // Relay result back to the extension background service worker
    chrome.runtime.sendMessage({
      action: 'RESUME_READY',
      jobId,
      compiledHtml,
      archetypeId,
      targetRole,
      atsScore: atsScore || 100
    }).catch((err) => {
      console.warn('[BioTailr Bridge] Could not relay result to extension:', err);
    });

    // Clean up storage entry now that it has been processed
    chrome.storage.local.remove(['biotailr_ext_job_' + jobId]);
  });

})();
