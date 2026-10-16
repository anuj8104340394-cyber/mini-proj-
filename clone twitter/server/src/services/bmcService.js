const fs = require('fs');
const path = require('path');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Notification = require('../models/Notification');

const CIVIC_KEYWORDS = [
  // Roads and Traffic
  'pothole', 'potholes', 'road', 'roads', 'crater', 'street', 'pavement', 'footpath',
  'divider', 'speed breaker', 'bad patch', 'asphalt', 'tar', 'khadda', 'khadde', 'rasta',
  // Solid waste and Sanitation
  'garbage', 'trash', 'waste', 'bin', 'dump', 'dumping', 'debris', 'litter', 'clean',
  'dirty', 'smell', 'stench', 'kachra', 'safai', 'gandagi', 'dustbin',
  // Drainage and Water
  'drain', 'drainage', 'gutter', 'sewer', 'sewage', 'manhole', 'overflow', 'waterlogging',
  'flood', 'flooding', 'water', 'leak', 'pipe', 'pipeline', 'contamination', 'naala',
  'nallah', 'paani',
  // Public Health and Animals
  'mosquito', 'dengue', 'malaria', 'pest', 'stray', 'dog', 'dead animal', 'carcass',
  'clinic', 'hospital', 'fogging',
  // Encroachment
  'hawker', 'hawkers', 'illegal stall', 'vendor', 'encroachment', 'encroached',
  'sidewalk blocked', 'obstruction', 'atikraman',
  // Environment and Trees
  'tree', 'fallen tree', 'branch', 'branches', 'garden', 'park', 'chopped tree', 'pollution',
  // Streetlights and Electricity
  'streetlight', 'street light', 'lamp', 'dark', 'light not working', 'open wire',
  'electric pole', 'bijli', 'batti',
  // General Civic and Complaints
  'complaint', 'fix', 'broken', 'repair', 'urgent', 'hazard', 'danger', 'ward',
  'issue', 'problem', 'action', 'resolve', 'help', 'civic'
];

/**
 * Determines whether a post mentioning @bmc reports a genuine civic issue.
 */
const isCivicComplaint = (text) => {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase();
  if (!/@bmc\b/.test(lower)) return false;

  // Filter out pure casual greetings/thanks
  const stripped = lower.replace(/@bmc\b/g, '').replace(/[^\w\s]/g, '').trim();
  const casualPhrases = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'thanks', 'thank you'];
  if (casualPhrases.includes(stripped) || stripped.length < 5) {
    return false;
  }

  // Check if any civic keyword or complaint indicator is present
  const hasKeyword = CIVIC_KEYWORDS.some((kw) => {
    const regex = new RegExp(`\\b${kw.replace(/\s+/g, '\\s+')}\\b`, 'i');
    return regex.test(lower);
  });

  return hasKeyword || stripped.length >= 25; // Treat substantive detailed reports as civic complaints
};

/**
 * Converts a local file path or remote image URL into a base64 Data URL.
 */
const mediaToDataUrl = async (imagePathOrUrl, mediaType = 'image') => {
  if (!imagePathOrUrl) return null;

  // If already a data URL
  if (imagePathOrUrl.startsWith('data:')) {
    return imagePathOrUrl;
  }

  try {
    // If local file path starting with /uploads/ or uploads/
    if (imagePathOrUrl.startsWith('/uploads/') || imagePathOrUrl.startsWith('uploads/')) {
      const relativePath = imagePathOrUrl.startsWith('/') ? imagePathOrUrl.slice(1) : imagePathOrUrl;
      const fullPath = path.join(__dirname, '../../', relativePath);
      if (fs.existsSync(fullPath)) {
        const fileBuffer = fs.readFileSync(fullPath);
        const ext = path.extname(fullPath).toLowerCase();
        let mime = 'image/jpeg';
        if (ext === '.png') mime = 'image/png';
        else if (ext === '.webp') mime = 'image/webp';
        else if (ext === '.gif') mime = 'image/gif';
        else if (ext === '.mp4') mime = 'video/mp4';
        else if (ext === '.webm') mime = 'video/webm';
        else if (ext === '.mov') mime = 'video/quicktime';
        return `data:${mime};base64,${fileBuffer.toString('base64')}`;
      }
    }

    // If remote URL (e.g. Cloudinary)
    if (imagePathOrUrl.startsWith('http://') || imagePathOrUrl.startsWith('https://')) {
      const res = await fetch(imagePathOrUrl, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        const contentType = res.headers.get('content-type') || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg');
        return `data:${contentType};base64,${buffer.toString('base64')}`;
      }
    }
  } catch (err) {
    console.warn(`[bmcService] mediaToDataUrl warning for ${imagePathOrUrl}:`, err.message);
  }

  return null;
};

/**
 * Forwards an eligible civic complaint from Express to FastAPI.
 * Implements exponential backoff retry for transient network errors.
 */
const forwardComplaintToFastApi = async (post, author, maxRetries = 2) => {
  const bmcApiUrl = process.env.BMC_API_URL || 'http://localhost:8000';
  const serviceKey = process.env.BMC_SERVICE_KEY || 'bmc_shared_service_key_2026';

  let mediaDataUrl = null;
  if (post.image) {
    mediaDataUrl = await mediaToDataUrl(post.image, post.mediaType);
  }

  const payload = {
    text: post.text,
    source: 'Twitter Clone',
    external_reference: post._id.toString(),
    user_reference: author ? `@${author.username}` : undefined,
    location_name: post.location || undefined,
    created_at: post.createdAt ? post.createdAt.toISOString() : new Date().toISOString()
  };

  if (mediaDataUrl) {
    if (post.mediaType === 'video') {
      payload.video_base64 = mediaDataUrl;
    } else {
      payload.image_base64 = mediaDataUrl;
    }
  }

  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const response = await fetch(`${bmcApiUrl}/complaints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Key': serviceKey
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(`BMC API error (HTTP ${response.status}): ${errorBody || response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      lastError = err;
      console.warn(`[bmcService] Forward attempt ${attempt} failed: ${err.message}`);
      if (attempt <= maxRetries) {
        // Wait exponential backoff before retry (1s, 2s)
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }

  throw lastError || new Error('Failed to forward complaint to BMC API');
};

/**
 * Publishes an automated official reply from the @bmc account to the original post.
 * Idempotent: stores and checks reply state to prevent duplicate replies.
 */
const publishBmcReply = async (post, author, bmcComplaintId) => {
  if (post.bmcReplied && post.bmcReplyCommentId) {
    return { skipped: true, commentId: post.bmcReplyCommentId };
  }

  const bmcUser = await User.findOne({ username: 'bmc' });
  if (!bmcUser) {
    throw new Error('Official @bmc user account not found in database');
  }

  const replyText = `Hello @${author?.username || 'Citizen'}! Your civic complaint has been registered successfully with BMC. Complaint Reference ID: ${bmcComplaintId}. Your complaint has been forwarded for processing. You can track its status using the available complaint tracking features.`;

  // Check if reply already exists to prevent duplicate comments
  const existingComment = await Comment.findOne({
    post: post._id,
    author: bmcUser._id,
    text: { $regex: bmcComplaintId }
  });

  if (existingComment) {
    post.bmcReplied = true;
    post.bmcReplyCommentId = existingComment._id;
    await post.save();
    return existingComment;
  }

  // Create reply comment
  const comment = await Comment.create({
    post: post._id,
    author: bmcUser._id,
    text: replyText.trim(),
    parentComment: null
  });

  // Notify post author
  if (author && author._id && author._id.toString() !== bmcUser._id.toString()) {
    try {
      await Notification.create({
        recipient: author._id,
        sender: bmcUser._id,
        type: 'reply',
        post: post._id,
        message: `@bmc replied to your post: "${replyText.slice(0, 80)}..."`
      });
    } catch (notifyErr) {
      console.warn('[bmcService] Failed to create notification for @bmc reply:', notifyErr.message);
    }
  }

  // Update post reply tracking
  post.bmcReplied = true;
  post.bmcReplyCommentId = comment._id;
  await post.save();

  return comment;
};

/**
 * Orchestrates end-to-end integration for a Twitter post.
 * Handles partial failures gracefully:
 * - If FastAPI registration succeeds, marks registered.
 * - If reply publishing fails, keeps registered state so retries only send the reply.
 */
const processPostIntegration = async (postId) => {
  const post = await Post.findById(postId).populate('author', 'name username');
  if (!post) {
    throw new Error(`Post ${postId} not found`);
  }

  const author = post.author;

  // Step 1: Forward to FastAPI if not already registered
  if (!post.bmcComplaintId) {
    post.integrationStatus = 'processing';
    await post.save();

    try {
      const bmcResult = await forwardComplaintToFastApi(post, author);
      if (!bmcResult || !bmcResult.id) {
        throw new Error('BMC API did not return a valid complaint reference ID');
      }

      post.bmcComplaintId = bmcResult.id;
      post.integrationStatus = 'registered';
      post.isComplaint = true;
      post.integrationError = null;
      await post.save();
      console.log(`[bmcService] Complaint registered successfully: ${bmcResult.id} for post: ${post._id}`);
    } catch (err) {
      post.integrationStatus = 'failed';
      post.integrationError = err.message;
      await post.save();
      throw err;
    }
  }

  // Step 2: Publish automated reply from @bmc if not already sent
  if (post.bmcComplaintId && !post.bmcReplied) {
    try {
      await publishBmcReply(post, author, post.bmcComplaintId);
      console.log(`[bmcService] Official @bmc reply published for complaint: ${post.bmcComplaintId}`);
    } catch (replyErr) {
      console.error('[bmcService] Failed to publish @bmc reply:', replyErr.message);
      // Notice: we do NOT reset post.bmcComplaintId since BMC has already registered it!
      post.integrationError = `Complaint registered (${post.bmcComplaintId}), but reply failed: ${replyErr.message}`;
      await post.save();
      throw replyErr;
    }
  }

  return post;
};

/**
 * Handles complaint resolution and status synchronization from BMC backend.
 * 
 * Requirements:
 * - Genuine transition to 'resolved' publishes official @bmc reply:
 *   "Your complaint #ACTUAL_COMPLAINT_ID has been marked as resolved by BMC. Please check the BMC Complaint Portal for updates."
 * - Idempotency: Duplicate retries of the same eventKey or repeated calls when already
 *   resolved with reply do not create duplicate comments.
 * - Reopen & Re-resolve: Reopening transitions status to 'open' and notifies citizen.
 *   Subsequent resolution creates a new resolution reply for that resolution cycle.
 */
const syncResolutionFromBmc = async ({
  complaintId,
  externalReference,
  oldStatus,
  newStatus,
  eventKey,
  note
}) => {
  if (!complaintId && !externalReference) {
    throw new Error('complaintId or externalReference is required');
  }

  // 1. Locate the original Twitter post
  let post = null;
  if (externalReference) {
    try {
      post = await Post.findById(externalReference).populate('author', 'name username');
    } catch (err) {
      // If externalReference is not a valid Mongo ObjectId, continue to search by complaintId
    }
  }

  if (!post && complaintId) {
    post = await Post.findOne({ bmcComplaintId: complaintId }).populate('author', 'name username');
  }

  if (!post) {
    return {
      success: false,
      notFound: true,
      message: `Post not found for externalReference: ${externalReference} or complaintId: ${complaintId}`
    };
  }

  // Ensure bmcComplaintId mapping is maintained
  if (complaintId && !post.bmcComplaintId) {
    post.bmcComplaintId = complaintId;
    post.isComplaint = true;
  }

  // 2. Fetch the official @bmc account
  const bmcUser = await User.findOne({ username: 'bmc' });
  if (!bmcUser) {
    throw new Error('Official @bmc user account not found in database');
  }

  // 3. Handle Resolution
  if (newStatus === 'resolved') {
    // Idempotency Check: Has this specific resolution eventKey already been processed?
    if (eventKey && post.lastResolvedEventKey === eventKey) {
      return {
        success: true,
        skipped: true,
        reason: 'Event already processed',
        post
      };
    }

    // Check if post is ALREADY resolved and already has a resolution reply for this complaint
    if (post.status === 'resolved') {
      const existingResolutionComment = await Comment.findOne({
        post: post._id,
        author: bmcUser._id,
        text: { $regex: `#${complaintId}\\b.*marked as resolved` }
      });

      if (existingResolutionComment) {
        if (eventKey) {
          post.lastResolvedEventKey = eventKey;
          await post.save();
        }
        return {
          success: true,
          skipped: true,
          reason: 'Post already resolved with reply present',
          post,
          comment: existingResolutionComment
        };
      }
    }

    // Genuine transition into resolved:
    post.status = 'resolved';
    post.statusUpdatedAt = new Date();
    post.statusUpdatedBy = bmcUser._id;
    if (note) post.statusNote = note;
    post.lastResolvedEventKey = eventKey || `resolved:${complaintId}:${Date.now()}`;
    post.resolutionCount = (post.resolutionCount || 0) + 1;
    await post.save();

    // Publish official @bmc reply under the original post
    const replyText = `Your complaint #${complaintId} has been marked as resolved by BMC. Please check the BMC Complaint Portal for updates.`;
    const comment = await Comment.create({
      post: post._id,
      author: bmcUser._id,
      text: replyText,
      parentComment: null
    });

    // Notify citizen author through notification system
    const authorId = post.author?._id || post.author;
    if (authorId && authorId.toString() !== bmcUser._id.toString()) {
      try {
        await Notification.create({
          recipient: authorId,
          sender: bmcUser._id,
          type: 'status_update',
          post: post._id,
          message: `@bmc marked your complaint #${complaintId} as resolved.`,
          metadata: {
            complaintId,
            previousStatus: oldStatus,
            newStatus: 'resolved',
            eventKey,
            commentId: comment._id
          }
        });
      } catch (notifyErr) {
        console.warn('[bmcService] Failed to create resolution notification:', notifyErr.message);
      }
    }

    return {
      success: true,
      message: `Complaint #${complaintId} marked as resolved and @bmc reply published`,
      post,
      comment
    };
  }

  // 4. Handle Reopening (resolved -> open)
  if (newStatus === 'open' && oldStatus === 'resolved') {
    post.status = 'open';
    post.statusUpdatedAt = new Date();
    post.statusUpdatedBy = bmcUser._id;
    post.statusNote = note || 'Reopened by BMC';
    await post.save();

    const authorId = post.author?._id || post.author;
    if (authorId && authorId.toString() !== bmcUser._id.toString()) {
      try {
        await Notification.create({
          recipient: authorId,
          sender: bmcUser._id,
          type: 'status_update',
          post: post._id,
          message: `@bmc reopened your complaint #${complaintId} for further action.`,
          metadata: {
            complaintId,
            previousStatus: oldStatus,
            newStatus: 'open',
            eventKey
          }
        });
      } catch (notifyErr) {
        console.warn('[bmcService] Failed to create reopen notification:', notifyErr.message);
      }
    }

    return {
      success: true,
      reopened: true,
      message: `Complaint #${complaintId} reopened on Twitter`,
      post
    };
  }

  // 5. Handle any other intermediate statuses (in_progress, etc.)
  const validStatuses = ['open', 'in_progress', 'resolved', 'rejected'];
  if (validStatuses.includes(newStatus)) {
    post.status = newStatus;
    post.statusUpdatedAt = new Date();
    post.statusUpdatedBy = bmcUser._id;
    if (note) post.statusNote = note;
    await post.save();
  }

  return {
    success: true,
    message: `Status updated to ${newStatus}`,
    post
  };
};

module.exports = {
  CIVIC_KEYWORDS,
  isCivicComplaint,
  mediaToDataUrl,
  forwardComplaintToFastApi,
  publishBmcReply,
  processPostIntegration,
  syncResolutionFromBmc
};
