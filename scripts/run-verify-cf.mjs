import { spawn } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';

function checkTcpPort(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function waitForPortListening(port, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ok = await checkTcpPort(port);
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 800));
  }
  return false;
}

async function fetchReport(port, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse response (${res.statusCode}): ${data.slice(0, 1000)}`));
        }
      });
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`HTTP request timed out after ${timeoutMs}ms`));
    });
    req.on('error', reject);
  });
}

async function main() {
  console.log('Starting wrangler dev for scripts/verify-cf.mjs on port 8787...');
  const wrangler = spawn('cmd.exe', ['/c', 'npx', 'wrangler', 'dev', 'scripts/verify-cf.mjs', '--port', '8787'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  });

  wrangler.stdout.on('data', (d) => {
    const s = d.toString();
    if (s.includes('Ready') || s.includes('http://') || s.includes('error') || s.includes('Error')) {
      process.stdout.write(`[wrangler] ${s}`);
    }
  });

  wrangler.stderr.on('data', (d) => {
    const s = d.toString();
    if (!s.includes('D1_ERROR: UNIQUE constraint') && !s.includes('D1_ERROR: FOREIGN KEY constraint')) {
      process.stderr.write(`[wrangler err] ${s}`);
    }
  });

  try {
    console.log('Waiting for port 8787 to be ready...');
    const isListening = await waitForPortListening(8787);
    if (!isListening) {
      throw new Error('Timed out waiting for port 8787 to listen');
    }

    console.log('\nWorker port is listening! Fetching complete verification report (running Sections 1-14)...');
    const report = await fetchReport(8787);

    console.log('\n========================================');
    console.log('      CF VERIFICATION REPORT SUMMARY    ');
    console.log('========================================');
    console.log('Timestamp:', report.timestamp);
    console.log('D1 Direct:', report.d1Direct?.success ? 'PASS' : 'FAIL');
    console.log('R2 Test:', report.r2Test?.success ? 'PASS' : 'FAIL');
    console.log('STORE-10 (Guest Orders & Price):', report.store10Verification?.guestOrderCreation?.success ? 'PASS' : 'FAIL');
    console.log('STORE-11 (Atomic Batch & Idempotency):', report.store11Verification?.atomicThreeItemOrderWithSimulatedFailure?.success ? 'PASS' : 'FAIL');
    console.log('STORE-12 (Business Profile & SEO):', report.store12Verification?.schemaOrgTechnicalSeo?.success ? 'PASS' : 'FAIL');

    console.log('\n--- STORE-13 VERIFICATION SUITE RESULTS ---');
    console.log('1. Guest Order Privacy & Token Enforcement:', report.store13Verification?.guestOrderPrivacyAndTokenEnforcement?.success ? 'PASS' : 'FAIL');
    console.log('   - Valid token accepted:', report.store13Verification?.guestOrderPrivacyAndTokenEnforcement?.validTokenAccepted);
    console.log('   - Invalid token rejected:', report.store13Verification?.guestOrderPrivacyAndTokenEnforcement?.invalidTokenRejected);
    console.log('   - Phone masked properly:', report.store13Verification?.guestOrderPrivacyAndTokenEnforcement?.phoneMaskedProperly);

    console.log('2. Contact Submission D1 Persistence & Anti-Spam:', report.store13Verification?.contactSubmissionD1Persistence?.success ? 'PASS' : 'FAIL');
    console.log('   - Honeypot bot trap caught:', report.store13Verification?.contactSubmissionD1Persistence?.honeypotCaught);
    console.log('   - Stored in D1 database:', report.store13Verification?.contactSubmissionD1Persistence?.storedInDatabase);
    console.log('   - HTML/script tags sanitized:', report.store13Verification?.contactSubmissionD1Persistence?.htmlSanitized);

    console.log('3. Media Storage Safety & Traversal Protection:', report.store13Verification?.mediaStorageSafetyAndPathTraversal?.success ? 'PASS' : 'FAIL');
    console.log('   - Path traversal attempts blocked:', report.store13Verification?.mediaStorageSafetyAndPathTraversal?.traversalRejected);
    console.log('   - Disallowed prefixes blocked:', report.store13Verification?.mediaStorageSafetyAndPathTraversal?.disallowedPrefixRejected);
    console.log('   - Disallowed extensions blocked:', report.store13Verification?.mediaStorageSafetyAndPathTraversal?.disallowedExtensionRejected);
    console.log('   - Valid public image accessible:', report.store13Verification?.mediaStorageSafetyAndPathTraversal?.validPublicUploadAccessible);

    console.log('4. Rate Limiting Protection (D1-backed):', report.store13Verification?.rateLimitingProtection?.success ? 'PASS' : 'FAIL');
    console.log('   - Under limit allowed:', report.store13Verification?.rateLimitingProtection?.underLimitAllowed);
    console.log('   - Limit exceeded blocked (429):', report.store13Verification?.rateLimitingProtection?.limitExceededBlocked);
    console.log('   - D1 record persisted:', report.store13Verification?.rateLimitingProtection?.d1RecordCreated);

    console.log('5. SEO Preflight, Robots & Multi-SKU Variants:', report.store13Verification?.seoPreflightRobotsAndStructuredData?.success ? 'PASS' : 'FAIL');
    console.log('   - Robots allows /api/media/ for Googlebot:', report.store13Verification?.seoPreflightRobotsAndStructuredData?.robotsAllowsMedia);
    console.log('   - Draft policies noindex readable (not blocked):', report.store13Verification?.seoPreflightRobotsAndStructuredData?.draftPolicyNoindexVerified);
    console.log('   - Multi-SKU variants verified without price cross-contamination:', report.store13Verification?.seoPreflightRobotsAndStructuredData?.multiSkuProductGroupValid);

    console.log('\n--- STORE-14 PRODUCTION READINESS SUITE RESULTS ---');
    console.log('1. Turnstile Fail-Closed Hardening:', report.store14Verification?.turnstileFailClosedHardening?.success ? 'PASS' : 'FAIL');
    console.log('   - Missing secret fails-closed:', report.store14Verification?.turnstileFailClosedHardening?.missingSecretFailsClosed);
    console.log('   - Dummy test secret blocked in prod:', report.store14Verification?.turnstileFailClosedHardening?.dummySecretRejectedInProd);
    console.log('   - Empty token rejected:', report.store14Verification?.turnstileFailClosedHardening?.emptyTokenRejected);

    console.log('2. Confirmation Token CSPRNG Entropy & D1 Storage:', report.store14Verification?.confirmationTokenCsprngEntropy?.success ? 'PASS' : 'FAIL');
    console.log('   - CSPRNG 192-bit token entropy:', report.store14Verification?.confirmationTokenCsprngEntropy?.csprngEntropy192Bits);
    console.log('   - D1 stores SHA-256 hash only:', report.store14Verification?.confirmationTokenCsprngEntropy?.d1StoresHashOnly);
    console.log('   - Timing-safe comparison match:', report.store14Verification?.confirmationTokenCsprngEntropy?.timingSafeMatchAccepted);
    console.log('   - Tampered token rejected:', report.store14Verification?.confirmationTokenCsprngEntropy?.tamperedTokenRejected);
    console.log('   - Legacy deterministic token fallback supported:', report.store14Verification?.confirmationTokenCsprngEntropy?.legacyTokenFallbackSupported);

    console.log('3. Admin CSRF & Fetch Metadata Protection:', report.store14Verification?.adminCsrfAndOriginValidation?.success ? 'PASS' : 'FAIL');
    console.log('   - Cross-origin mutation rejected:', report.store14Verification?.adminCsrfAndOriginValidation?.crossOriginMutationRejected);
    console.log('   - Same-origin mutation accepted:', report.store14Verification?.adminCsrfAndOriginValidation?.sameOriginMutationAccepted);
    console.log('   - Bearer API token accepted:', report.store14Verification?.adminCsrfAndOriginValidation?.bearerApiAccessAccepted);

    console.log('4. Public Media Prefix Isolation:', report.store14Verification?.publicMediaPrefixIsolation?.success ? 'PASS' : 'FAIL');
    console.log('   - tmp/ prefix rejected for guests:', report.store14Verification?.publicMediaPrefixIsolation?.tmpPrefixGuestRejected);
    console.log('   - products/ and brand/ public accessible:', report.store14Verification?.publicMediaPrefixIsolation?.productsPrefixPublicAllowed);
    console.log('   - Path traversal blocked:', report.store14Verification?.publicMediaPrefixIsolation?.traversalRejected);

    console.log('5. Admin Contact Inbox Persistence & Lifecycle:', report.store14Verification?.adminContactInboxEndToEnd?.success ? 'PASS' : 'FAIL');
    console.log('   - Customer message saved in D1:', report.store14Verification?.adminContactInboxEndToEnd?.submissionPersisted);
    console.log('   - Inbox query retrieved:', report.store14Verification?.adminContactInboxEndToEnd?.inboxListingRetrieved);
    console.log('   - Status updated to HANDLED:', report.store14Verification?.adminContactInboxEndToEnd?.statusUpdatedToHandled);

    console.log('\n========================================');
    console.log('ALL PASSED:', report.allPassed ? '✅ TRUE (ALL CHECKS PASSED)' : '❌ FALSE');
    console.log('========================================');

    if (!report.allPassed) {
      console.error('\nDetailed failed checks:');
      for (const [k, v] of Object.entries(report)) {
        if (typeof v === 'object' && v !== null && 'success' in v && !v.success) {
          console.error(`- ${k}:`, v);
        } else if (typeof v === 'object' && v !== null) {
          for (const [subK, subV] of Object.entries(v)) {
            if (typeof subV === 'object' && subV !== null && 'success' in subV && !subV.success) {
              console.error(`- ${k}.${subK}:`, subV);
            }
          }
        }
      }
      process.exitCode = 1;
    }
  } finally {
    console.log('\nStopping wrangler dev...');
    wrangler.kill('SIGKILL');
  }
}

main().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
