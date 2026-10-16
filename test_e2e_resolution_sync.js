/**
 * End-to-End Test Suite for BMC Complaint-Resolution Synchronization
 * Tests:
 * 1. Citizen registers complaint on Twitter Clone with @bmc mention
 * 2. Forwarded to BMC portal, complaint reference mapped both ways
 * 3. BMC staff logs into BMC portal and marks complaint as 'resolved'
 * 4. Automatic @bmc reply published under original post with exact complaint ID
 * 5. Citizen notified and post status updated
 * 6. Repeated resolution calls / retries are idempotent (no duplicate replies)
 * 7. Reopening complaint (resolved -> open) updates post and notifies citizen
 * 8. Re-resolving (open -> resolved) generates exactly one new resolution reply
 * 9. Security: unauthorized requests rejected with 401/403
 * 10. Non-existent post returns 404
 */

const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const TWITTER_API = 'http://localhost:5000/api';
const BMC_API = 'http://localhost:8000';
const SERVICE_KEY = 'bmc_shared_service_key_2026';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n🚀 Starting End-to-End Complaint Resolution Synchronization Tests...\n');

  // --- TEST GROUP 1: Security & Authentication ---
  console.log('📌 Test Group 1: Security & Authentication on Twitter Webhook');
  {
    // 1. Missing service key
    const resNoAuth = await fetch(`${TWITTER_API}/posts/bmc-resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ complaintId: 'TEST-1', newStatus: 'resolved' })
    });
    assert(resNoAuth.status === 401, `Missing X-Service-Key returns 401 (got ${resNoAuth.status})`);

    // 2. Invalid service key
    const resBadAuth = await fetch(`${TWITTER_API}/posts/bmc-resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': 'incorrect_secret_key'
      },
      body: JSON.stringify({ complaintId: 'TEST-1', newStatus: 'resolved' })
    });
    assert(resBadAuth.status === 403, `Invalid X-Service-Key returns 403 (got ${resBadAuth.status})`);

    // 3. Missing required fields
    const resMissing = await fetch(`${TWITTER_API}/posts/bmc-resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': SERVICE_KEY
      },
      body: JSON.stringify({})
    });
    assert(resMissing.status === 400, `Missing required fields returns 400 (got ${resMissing.status})`);

    // 4. Non-existent post
    const resNotFound = await fetch(`${TWITTER_API}/posts/bmc-resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': SERVICE_KEY
      },
      body: JSON.stringify({ complaintId: 'NON_EXISTENT_ID_99999', newStatus: 'resolved' })
    });
    assert(resNotFound.status === 404, `Non-existent complaint returns 404 (got ${resNotFound.status})`);
  }

  // --- TEST GROUP 2: Full End-to-End Registration & Resolution Flow ---
  console.log('\n📌 Test Group 2: Full E2E Flow (Twitter Register -> BMC Portal -> Staff Resolve -> @bmc Reply)');

  let citizenToken = '';
  let citizenUser = null;
  let twitterPost = null;
  let bmcComplaintId = null;
  let staffToken = '';

  // 1. Login as citizen on Twitter
  {
    const loginRes = await fetch(`${TWITTER_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'sarahc',
        password: 'password123'
      })
    });
    const loginData = await loginRes.json();
    assert(loginRes.ok && loginData.token, `Citizen 'sarahc' logged in successfully on Twitter`);
    citizenToken = loginData.token;
    citizenUser = loginData.user;
  }

  // 2. Create complaint post mentioning @bmc
  {
    const testUnique = Date.now();
    const postRes = await fetch(`${TWITTER_API}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${citizenToken}`
      },
      body: JSON.stringify({
        text: `Severe waterlogging and broken drainage near Bandra station @bmc please inspect and fix urgently #${testUnique}`,
        location: 'Bandra West'
      })
    });
    const postData = await postRes.json();
    assert(postRes.ok && postData.post?._id, `Citizen created civic post on Twitter (ID: ${postData.post?._id})`);
    twitterPost = postData.post;
    bmcComplaintId = twitterPost.bmcComplaintId;
    assert(Boolean(bmcComplaintId), `Twitter post successfully registered with BMC (BMC ID: ${bmcComplaintId})`);
    assert(twitterPost.integrationStatus === 'registered', `Post integrationStatus is 'registered'`);
    assert(twitterPost.status === 'open', `Post initial complaint status is 'open'`);
  }

  // 3. Verify complaint appears in BMC backend with mapping
  {
    const bmcRes = await fetch(`${BMC_API}/bmc/complaints/${encodeURIComponent(bmcComplaintId)}`, {
      headers: { 'X-Service-Key': SERVICE_KEY }
    });
    assert(bmcRes.ok, `Complaint ${bmcComplaintId} verified present in BMC API (status ${bmcRes.status})`);
    const bmcData = await bmcRes.json();
    assert(bmcData.external_reference === twitterPost._id, `BMC complaint external_reference correctly maps to Twitter Post ID: ${twitterPost._id}`);
    assert(bmcData.status === 'open', `BMC complaint status is 'open'`);
  }

  // 4. Verify initial registration reply from @bmc exists under Twitter post
  {
    const commentsRes = await fetch(`${TWITTER_API}/posts/${twitterPost._id}/comments`);
    const commentsData = await commentsRes.json();
    const comments = commentsData.comments || [];
    const regComment = comments.find(c => c.author?.username === 'bmc' && c.text.includes(bmcComplaintId));
    assert(Boolean(regComment), `Initial official @bmc registration reply is visible under Twitter post`);
  }

  // 5. Staff login on BMC Portal
  {
    const staffLoginRes = await fetch(`${BMC_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'bmc.staff1@local.bmc',
        password: 'Admin@123'
      })
    });
    const staffData = await staffLoginRes.json();
    assert(staffLoginRes.ok && staffData.access_token, `BMC Staff logged in successfully as admin`);
    staffToken = staffData.access_token;
  }

  // 6. BMC Staff marks complaint as 'resolved'
  {
    console.log(`  ⚡ BMC Staff resolving complaint ${bmcComplaintId}...`);
    const resolveRes = await fetch(`${BMC_API}/complaints/${encodeURIComponent(bmcComplaintId)}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${staffToken}`
      },
      body: JSON.stringify({ status: 'resolved' })
    });
    const resolveData = await resolveRes.json();
    assert(resolveRes.ok, `BMC staff status transition to 'resolved' committed in BMC DB (HTTP ${resolveRes.status})`);
    assert(resolveData.status === 'resolved', `BMC complaint status is now 'resolved'`);
  }

  // 7. Verify Twitter Post status and @bmc resolution reply
  {
    // Small delay for any async processing
    await new Promise(r => setTimeout(r, 600));

    // Fetch updated Twitter post
    const updatedPostRes = await fetch(`${TWITTER_API}/posts/${twitterPost._id}`);
    const updatedPostData = await updatedPostRes.json();
    const post = updatedPostData.post;
    assert(post.status === 'resolved', `Twitter post status updated to 'resolved' (got: ${post.status})`);

    // Check comments for the resolution reply
    const commentsRes = await fetch(`${TWITTER_API}/posts/${twitterPost._id}/comments`);
    const commentsData = await commentsRes.json();
    const comments = commentsData.comments || [];

    const resolutionComments = comments.filter(c =>
      c.author?.username === 'bmc' &&
      c.text.includes(`#${bmcComplaintId}`) &&
      c.text.includes('marked as resolved')
    );

    assert(resolutionComments.length === 1, `EXACTLY ONE @bmc resolution reply appears under post (found: ${resolutionComments.length})`);

    const expectedText = `Your complaint #${bmcComplaintId} has been marked as resolved by BMC. Please check the BMC Complaint Portal for updates.`;
    assert(resolutionComments[0]?.text === expectedText, `Reply text exactly matches expected template: "${resolutionComments[0]?.text}"`);

    // Check citizen notifications
    const notifRes = await fetch(`${TWITTER_API}/notifications`, {
      headers: { 'Authorization': `Bearer ${citizenToken}` }
    });
    const notifData = await notifRes.json();
    const notifs = notifData.notifications || [];
    const resolveNotif = notifs.find(n => n.message && n.message.includes(bmcComplaintId) && n.message.includes('resolved'));
    assert(Boolean(resolveNotif), `Citizen received resolution notification on Twitter: "${resolveNotif?.message}"`);
  }

  // --- TEST GROUP 3: Idempotency & Duplicate Prevention ---
  console.log('\n📌 Test Group 3: Idempotency & Duplicate Prevention');
  {
    // 1. Repeated calls to BMC status endpoint with 'resolved' should be rejected (already resolved)
    const repeatBmc = await fetch(`${BMC_API}/complaints/${encodeURIComponent(bmcComplaintId)}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${staffToken}`
      },
      body: JSON.stringify({ status: 'resolved' })
    });
    assert(repeatBmc.status === 409, `Calling BMC status endpoint with 'resolved' when already resolved is rejected with 409 (got ${repeatBmc.status})`);

    // 2. Direct retry of the resolution webhook with same eventKey should be skipped
    const directRetry = await fetch(`${TWITTER_API}/posts/bmc-resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': SERVICE_KEY
      },
      body: JSON.stringify({
        complaintId: bmcComplaintId,
        externalReference: twitterPost._id,
        oldStatus: 'open',
        newStatus: 'resolved',
        eventKey: `test-retry-${Date.now()}`
      })
    });
    const directRetryData = await directRetry.json();
    assert(directRetry.ok && directRetryData.skipped === true, `Direct repeated resolution webhook safely skipped (skipped: ${directRetryData.skipped})`);

    // 3. Verify still only 1 resolution reply
    const commentsRes = await fetch(`${TWITTER_API}/posts/${twitterPost._id}/comments`);
    const commentsData = await commentsRes.json();
    const resolutionComments = (commentsData.comments || []).filter(c =>
      c.author?.username === 'bmc' &&
      c.text.includes(`#${bmcComplaintId}`) &&
      c.text.includes('marked as resolved')
    );
    assert(resolutionComments.length === 1, `Still EXACTLY ONE resolution reply after retry attempts (found: ${resolutionComments.length})`);
  }

  // --- TEST GROUP 4: Reopening and Re-resolving ---
  console.log('\n📌 Test Group 4: Reopening and Re-resolving Policy');
  {
    // 1. Staff reopens complaint from 'resolved' to 'open'
    console.log(`  ⚡ BMC Staff reopening complaint ${bmcComplaintId}...`);
    const reopenRes = await fetch(`${BMC_API}/complaints/${encodeURIComponent(bmcComplaintId)}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${staffToken}`
      },
      body: JSON.stringify({ status: 'open' })
    });
    const reopenData = await reopenRes.json();
    assert(reopenRes.ok && reopenData.status === 'open', `BMC complaint reopened to 'open' (HTTP ${reopenRes.status})`);

    await new Promise(r => setTimeout(r, 600));

    // Verify Twitter post status updated to 'open'
    const postAfterReopenRes = await fetch(`${TWITTER_API}/posts/${twitterPost._id}`);
    const postAfterReopen = (await postAfterReopenRes.json()).post;
    assert(postAfterReopen.status === 'open', `Twitter post status updated to 'open' upon reopening`);

    // 2. Staff resolves complaint again (Resolution cycle 2)
    console.log(`  ⚡ BMC Staff resolving reopened complaint ${bmcComplaintId} again...`);
    const reResolveRes = await fetch(`${BMC_API}/complaints/${encodeURIComponent(bmcComplaintId)}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${staffToken}`
      },
      body: JSON.stringify({ status: 'resolved' })
    });
    assert(reResolveRes.ok, `Re-resolution committed in BMC DB (HTTP ${reResolveRes.status})`);

    await new Promise(r => setTimeout(r, 600));

    // Verify Twitter post status back to 'resolved'
    const postAfterReResolveRes = await fetch(`${TWITTER_API}/posts/${twitterPost._id}`);
    const postAfterReResolve = (await postAfterReResolveRes.json()).post;
    assert(postAfterReResolve.status === 'resolved', `Twitter post status back to 'resolved'`);

    // Verify new resolution reply was published for this second resolution cycle
    const commentsRes = await fetch(`${TWITTER_API}/posts/${twitterPost._id}/comments`);
    const commentsData = await commentsRes.json();
    const resolutionComments = (commentsData.comments || []).filter(c =>
      c.author?.username === 'bmc' &&
      c.text.includes(`#${bmcComplaintId}`) &&
      c.text.includes('marked as resolved')
    );
    assert(resolutionComments.length === 2, `Second resolution cycle published a new @bmc reply (total resolution replies: ${resolutionComments.length})`);
  }

  console.log('\n========================================');
  console.log(`🏁 Test Summary: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
