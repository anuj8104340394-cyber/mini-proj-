/**
 * Automated test suite for Twitter Clone BMC integration service.
 * Tests:
 * 1. Civic complaint detection & keyword filtering (isCivicComplaint)
 * 2. Media conversion to base64 Data URLs (mediaToDataUrl)
 * 3. FastAPI forwarding with headers, idempotency keys, and retry (forwardComplaintToFastApi)
 * 4. Automated @bmc reply creation and idempotency (publishBmcReply)
 * 5. Full orchestration and failure handling (processPostIntegration)
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

const {
  isCivicComplaint,
  mediaToDataUrl,
  forwardComplaintToFastApi,
  publishBmcReply,
  processPostIntegration
} = require('../src/services/bmcService');

const Post = require('../src/models/Post');
const Comment = require('../src/models/Comment');
const User = require('../src/models/User');
const Notification = require('../src/models/Notification');

describe('BMC Civic Integration Service', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('isCivicComplaint', () => {
    it('should identify civic complaint with English keywords', () => {
      assert.strictEqual(
        isCivicComplaint('Deep pothole on SV Road near station @bmc please repair'),
        true
      );
      assert.strictEqual(
        isCivicComplaint('@bmc Massive garbage pile overflowing near Dadar market'),
        true
      );
      assert.strictEqual(
        isCivicComplaint('Water pipeline broken and leaking paani @bmc'),
        true
      );
    });

    it('should identify civic complaint with Hindi/Marathi keywords', () => {
      assert.strictEqual(
        isCivicComplaint('@bmc yahan bahut kachra jama ho gaya hai safai karo'),
        true
      );
      assert.strictEqual(
        isCivicComplaint('Sadak par khadde hain @bmc rasta theek karo'),
        true
      );
    });

    it('should reject posts that do not mention @bmc', () => {
      assert.strictEqual(
        isCivicComplaint('Deep pothole on SV Road near station please repair'),
        false
      );
    });

    it('should reject casual greetings, thanks, or short non-complaints', () => {
      assert.strictEqual(isCivicComplaint('Hello @bmc!'), false);
      assert.strictEqual(isCivicComplaint('Hi @bmc, good morning!'), false);
      assert.strictEqual(isCivicComplaint('Thank you @bmc'), false);
      assert.strictEqual(isCivicComplaint('@bmc hey'), false);
    });

    it('should accept detailed substantive reports even without explicit single keywords', () => {
      assert.strictEqual(
        isCivicComplaint('@bmc severe issue on 14th cross road blocking pedestrian movement during rush hours'),
        true
      );
    });
  });

  describe('mediaToDataUrl', () => {
    it('should return null for empty/null input', async () => {
      const result = await mediaToDataUrl(null);
      assert.strictEqual(result, null);
    });

    it('should pass through existing data URLs unchanged', async () => {
      const dataUrl = 'data:image/jpeg;base64,ZmFrZWltYWdlZGF0YQ==';
      const result = await mediaToDataUrl(dataUrl);
      assert.strictEqual(result, dataUrl);
    });
  });

  describe('forwardComplaintToFastApi', () => {
    it('should send correct payload and headers to FastAPI backend', async () => {
      let capturedUrl = '';
      let capturedOptions = {};

      global.fetch = async (url, options) => {
        capturedUrl = url;
        capturedOptions = options;
        return {
          ok: true,
          status: 201,
          json: async () => ({
            id: 'CMP-INTEG001',
            source: 'Twitter Clone',
            external_reference: 'post_12345'
          })
        };
      };

      const mockPost = {
        _id: 'post_12345',
        text: 'Broken drainage cover on Linking Road @bmc',
        location: 'Linking Road, Bandra',
        createdAt: new Date('2026-10-15T12:00:00Z'),
        mediaType: 'none'
      };

      const mockAuthor = { username: 'citizen_john' };

      const result = await forwardComplaintToFastApi(mockPost, mockAuthor);

      assert.strictEqual(result.id, 'CMP-INTEG001');
      assert.ok(capturedUrl.includes('/complaints'));
      assert.strictEqual(capturedOptions.method, 'POST');
      assert.strictEqual(capturedOptions.headers['Content-Type'], 'application/json');
      assert.ok(capturedOptions.headers['X-Service-Key']);

      const parsedBody = JSON.parse(capturedOptions.body);
      assert.strictEqual(parsedBody.text, mockPost.text);
      assert.strictEqual(parsedBody.source, 'Twitter Clone');
      assert.strictEqual(parsedBody.external_reference, 'post_12345');
      assert.strictEqual(parsedBody.user_reference, '@citizen_john');
      assert.strictEqual(parsedBody.location_name, 'Linking Road, Bandra');
    });

    it('should retry on transient failures and throw if all attempts fail', async () => {
      let attempts = 0;
      global.fetch = async () => {
        attempts++;
        return {
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          text: async () => 'FastAPI is overloaded'
        };
      };

      const mockPost = {
        _id: 'post_err_test',
        text: 'Pothole on SV road @bmc',
        mediaType: 'none'
      };

      await assert.rejects(
        async () => {
          // maxRetries = 1 for faster test execution
          await forwardComplaintToFastApi(mockPost, { username: 'user1' }, 1);
        },
        /HTTP 503/
      );

      assert.strictEqual(attempts, 2); // 1 initial + 1 retry
    });
  });

  describe('publishBmcReply', () => {
    it('should be idempotent and skip if reply was already recorded on post', async () => {
      const mockPost = {
        _id: 'post_already_replied',
        bmcReplied: true,
        bmcReplyCommentId: 'comment_999'
      };

      const result = await publishBmcReply(mockPost, { username: 'tester' }, 'CMP-12345');
      assert.strictEqual(result.skipped, true);
      assert.strictEqual(result.commentId, 'comment_999');
    });

    it('should create official comment authored by @bmc and record notification', async () => {
      const bmcUserId = 'bmc_user_id_obj';
      const authorId = 'author_user_id_obj';
      let commentCreatedWith = null;
      let notificationCreatedWith = null;
      let postSaved = false;

      // Mock User.findOne
      const origUserFindOne = User.findOne;
      User.findOne = async (query) => {
        if (query.username === 'bmc') {
          return { _id: bmcUserId, username: 'bmc', name: 'BMC Official' };
        }
        return null;
      };

      // Mock Comment.findOne (no prior comment)
      const origCommentFindOne = Comment.findOne;
      Comment.findOne = async () => null;

      // Mock Comment.create
      const origCommentCreate = Comment.create;
      Comment.create = async (doc) => {
        commentCreatedWith = doc;
        return { _id: 'new_comment_id_111', ...doc };
      };

      // Mock Notification.create
      const origNotificationCreate = Notification.create;
      Notification.create = async (doc) => {
        notificationCreatedWith = doc;
        return doc;
      };

      const mockPost = {
        _id: 'post_reply_test',
        bmcReplied: false,
        save: async function () {
          postSaved = true;
        }
      };

      try {
        const result = await publishBmcReply(
          mockPost,
          { _id: authorId, username: 'author_jane' },
          'CMP-REAL98765'
        );

        assert.strictEqual(result._id, 'new_comment_id_111');
        assert.strictEqual(commentCreatedWith.author, bmcUserId);
        assert.ok(commentCreatedWith.text.includes('CMP-REAL98765'));
        assert.ok(commentCreatedWith.text.includes('@author_jane'));
        assert.strictEqual(mockPost.bmcReplied, true);
        assert.strictEqual(mockPost.bmcReplyCommentId, 'new_comment_id_111');
        assert.strictEqual(postSaved, true);
        assert.strictEqual(notificationCreatedWith.recipient, authorId);
      } finally {
        User.findOne = origUserFindOne;
        Comment.findOne = origCommentFindOne;
        Comment.create = origCommentCreate;
        Notification.create = origNotificationCreate;
      }
    });
  });

  describe('processPostIntegration', () => {
    it('should mark post failed and not send reply when FastAPI returns failure', async () => {
      global.fetch = async () => ({
        ok: false,
        status: 500,
        statusText: 'Internal Error',
        text: async () => 'DB connection error'
      });

      let postSavedCount = 0;
      const mockPost = {
        _id: 'post_failure_test',
        text: 'Sewage overflowing @bmc',
        mediaType: 'none',
        author: { _id: 'author1', username: 'user1' },
        bmcComplaintId: null,
        integrationStatus: 'pending',
        integrationError: null,
        save: async function () {
          postSavedCount++;
        }
      };

      const origFindById = Post.findById;
      Post.findById = () => ({
        populate: () => Promise.resolve(mockPost)
      });

      try {
        await assert.rejects(async () => {
          await processPostIntegration('post_failure_test');
        }, /HTTP 500/);

        assert.strictEqual(mockPost.integrationStatus, 'failed');
        assert.ok(mockPost.integrationError.includes('HTTP 500'));
        assert.strictEqual(mockPost.bmcComplaintId, null);
        assert.strictEqual(mockPost.bmcReplied, undefined);
      } finally {
        Post.findById = origFindById;
      }
    });

    it('should retry only reply without re-forwarding if bmcComplaintId exists but reply failed', async () => {
      let forwardCalled = false;
      global.fetch = async () => {
        forwardCalled = true;
        return { ok: true, json: async () => ({ id: 'CMP-NEWID' }) };
      };

      let bmcReplyCalled = false;
      const origUserFindOne = User.findOne;
      User.findOne = async () => ({ _id: 'bmc_user', username: 'bmc' });
      const origCommentFindOne = Comment.findOne;
      Comment.findOne = async () => null;
      const origCommentCreate = Comment.create;
      Comment.create = async () => {
        bmcReplyCalled = true;
        return { _id: 'new_reply_id' };
      };

      const mockPost = {
        _id: 'post_already_registered',
        author: { _id: 'auth_id', username: 'rahul' },
        bmcComplaintId: 'CMP-EXISTING123',
        bmcReplied: false,
        integrationStatus: 'registered',
        save: async function () {}
      };

      const origFindById = Post.findById;
      Post.findById = () => ({
        populate: () => Promise.resolve(mockPost)
      });

      try {
        await processPostIntegration('post_already_registered');

        assert.strictEqual(forwardCalled, false, 'FastAPI should not be called again');
        assert.strictEqual(bmcReplyCalled, true, 'publishBmcReply should be called');
        assert.strictEqual(mockPost.bmcReplied, true);
      } finally {
        Post.findById = origFindById;
        User.findOne = origUserFindOne;
        Comment.findOne = origCommentFindOne;
        Comment.create = origCommentCreate;
      }
    });
  });
});
