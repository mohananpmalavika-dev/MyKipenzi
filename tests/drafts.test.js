import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { db, transaction, one } from '../server/db.js';
import { randomUUID } from 'node:crypto';

describe('Message Drafts', () => {
  let testUser1, testUser2, conversation;

  before(async () => {
    // Create test users
    testUser1 = await one(
      `INSERT INTO users(id, handle, name, email, password_hash, language)
       VALUES($1, $2, $3, $4, $5, $6) RETURNING *`,
      [randomUUID(), 'draft_test_user1', 'Draft Tester 1', 'draft1@test.local', 'hash', 'en']
    );

    testUser2 = await one(
      `INSERT INTO users(id, handle, name, email, password_hash, language)
       VALUES($1, $2, $3, $4, $5, $6) RETURNING *`,
      [randomUUID(), 'draft_test_user2', 'Draft Tester 2', 'draft2@test.local', 'hash', 'en']
    );

    // Create conversation
    const directKey = [testUser1.id, testUser2.id].sort().join(':');
    conversation = await one(
      `INSERT INTO conversations(id, direct_key) VALUES($1, $2) RETURNING *`,
      [randomUUID(), directKey]
    );

    // Add members
    await db.query(
      'INSERT INTO members(conversation_id, user_id) VALUES($1, $2), ($1, $3)',
      [conversation.id, testUser1.id, testUser2.id]
    );
  });

  after(async () => {
    // Cleanup
    await db.query('DELETE FROM users WHERE id IN ($1, $2)', [testUser1.id, testUser2.id]);
  });

  it('should save a new draft', async () => {
    const draftText = 'This is a test draft message';
    
    const draft = await one(
      `INSERT INTO message_drafts(user_id, conversation_id, text, source_language)
       VALUES($1, $2, $3, $4)
       ON CONFLICT(user_id, conversation_id)
       DO UPDATE SET text=EXCLUDED.text, source_language=EXCLUDED.source_language
       RETURNING *`,
      [testUser1.id, conversation.id, draftText, 'en']
    );

    assert.equal(draft.text, draftText);
    assert.equal(draft.user_id, testUser1.id);
    assert.equal(draft.conversation_id, conversation.id);
    assert.equal(draft.source_language, 'en');
  });

  it('should retrieve an existing draft', async () => {
    const draft = await one(
      'SELECT * FROM message_drafts WHERE user_id=$1 AND conversation_id=$2',
      [testUser1.id, conversation.id]
    );

    assert(draft);
    assert.equal(draft.text, 'This is a test draft message');
  });

  it('should update an existing draft', async () => {
    const updatedText = 'This is an updated draft message';
    
    const draft = await one(
      `INSERT INTO message_drafts(user_id, conversation_id, text, source_language)
       VALUES($1, $2, $3, $4)
       ON CONFLICT(user_id, conversation_id)
       DO UPDATE SET text=EXCLUDED.text, updated_at=now()
       RETURNING *`,
      [testUser1.id, conversation.id, updatedText, 'en']
    );

    assert.equal(draft.text, updatedText);
  });

  it('should delete a draft', async () => {
    await db.query(
      'DELETE FROM message_drafts WHERE user_id=$1 AND conversation_id=$2',
      [testUser1.id, conversation.id]
    );

    const draft = await one(
      'SELECT * FROM message_drafts WHERE user_id=$1 AND conversation_id=$2',
      [testUser1.id, conversation.id]
    );

    assert.equal(draft, null);
  });

  it('should handle empty draft deletion', async () => {
    // Insert a draft
    await one(
      `INSERT INTO message_drafts(user_id, conversation_id, text, source_language)
       VALUES($1, $2, $3, $4) RETURNING *`,
      [testUser1.id, conversation.id, 'Test', 'en']
    );

    // Delete when text is empty
    await db.query(
      'DELETE FROM message_drafts WHERE user_id=$1 AND conversation_id=$2',
      [testUser1.id, conversation.id]
    );

    const draft = await one(
      'SELECT * FROM message_drafts WHERE user_id=$1 AND conversation_id=$2',
      [testUser1.id, conversation.id]
    );

    assert.equal(draft, null);
  });

  it('should support multiple drafts per user', async () => {
    // Create another conversation
    const conversation2 = await one(
      `INSERT INTO conversations(id, direct_key) VALUES($1, $2) RETURNING *`,
      [randomUUID(), 'test-direct-key-2']
    );

    await db.query(
      'INSERT INTO members(conversation_id, user_id) VALUES($1, $2)',
      [conversation2.id, testUser1.id]
    );

    // Save drafts in both conversations
    await one(
      `INSERT INTO message_drafts(user_id, conversation_id, text, source_language)
       VALUES($1, $2, $3, $4) RETURNING *`,
      [testUser1.id, conversation.id, 'Draft 1', 'en']
    );

    await one(
      `INSERT INTO message_drafts(user_id, conversation_id, text, source_language)
       VALUES($1, $2, $3, $4) RETURNING *`,
      [testUser1.id, conversation2.id, 'Draft 2', 'en']
    );

    // Retrieve all drafts
    const drafts = (
      await db.query(
        'SELECT * FROM message_drafts WHERE user_id=$1 ORDER BY updated_at DESC',
        [testUser1.id]
      )
    ).rows;

    assert.equal(drafts.length, 2);
    assert.equal(drafts[0].text, 'Draft 2');
    assert.equal(drafts[1].text, 'Draft 1');

    // Cleanup
    await db.query('DELETE FROM conversations WHERE id=$1', [conversation2.id]);
  });

  it('should respect text length constraint', async () => {
    const longText = 'a'.repeat(5001); // Exceeds 5000 char limit

    await assert.rejects(
      async () => {
        await one(
          `INSERT INTO message_drafts(user_id, conversation_id, text, source_language)
           VALUES($1, $2, $3, $4) RETURNING *`,
          [testUser1.id, conversation.id, longText, 'en']
        );
      },
      { message: /violates check constraint/ }
    );
  });

  it('should auto-update timestamp on draft update', async () => {
    // Insert initial draft
    const draft1 = await one(
      `INSERT INTO message_drafts(user_id, conversation_id, text, source_language)
       VALUES($1, $2, $3, $4) RETURNING *`,
      [testUser1.id, conversation.id, 'Initial', 'en']
    );

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100));

    // Update draft
    const draft2 = await one(
      `UPDATE message_drafts 
       SET text='Updated'
       WHERE user_id=$1 AND conversation_id=$2
       RETURNING *`,
      [testUser1.id, conversation.id]
    );

    // updated_at should be different
    assert.notEqual(
      new Date(draft1.updated_at).getTime(),
      new Date(draft2.updated_at).getTime()
    );
  });

  it('should cascade delete drafts when conversation is deleted', async () => {
    // Create a temporary conversation
    const tempConv = await one(
      `INSERT INTO conversations(id, direct_key) VALUES($1, $2) RETURNING *`,
      [randomUUID(), 'temp-draft-test']
    );

    await db.query(
      'INSERT INTO members(conversation_id, user_id) VALUES($1, $2)',
      [tempConv.id, testUser1.id]
    );

    // Save a draft
    await one(
      `INSERT INTO message_drafts(user_id, conversation_id, text, source_language)
       VALUES($1, $2, $3, $4) RETURNING *`,
      [testUser1.id, tempConv.id, 'Temp draft', 'en']
    );

    // Delete conversation
    await db.query('DELETE FROM conversations WHERE id=$1', [tempConv.id]);

    // Draft should be gone
    const draft = await one(
      'SELECT * FROM message_drafts WHERE conversation_id=$1',
      [tempConv.id]
    );

    assert.equal(draft, null);
  });

  it('should cascade delete drafts when user is deleted', async () => {
    // Create temporary user
    const tempUser = await one(
      `INSERT INTO users(id, handle, name, email, password_hash, language)
       VALUES($1, $2, $3, $4, $5, $6) RETURNING *`,
      [randomUUID(), 'temp_draft_user', 'Temp', 'temp@test.local', 'hash', 'en']
    );

    await db.query(
      'INSERT INTO members(conversation_id, user_id) VALUES($1, $2)',
      [conversation.id, tempUser.id]
    );

    // Save a draft
    await one(
      `INSERT INTO message_drafts(user_id, conversation_id, text, source_language)
       VALUES($1, $2, $3, $4) RETURNING *`,
      [tempUser.id, conversation.id, 'Temp draft', 'en']
    );

    // Delete user
    await db.query('DELETE FROM users WHERE id=$1', [tempUser.id]);

    // Draft should be gone
    const draft = await one(
      'SELECT * FROM message_drafts WHERE user_id=$1',
      [tempUser.id]
    );

    assert.equal(draft, null);
  });

  it('should support different source languages', async () => {
    const languages = ['auto', 'en', 'ml', 'manglish', 'sw'];

    for (const lang of languages) {
      const draft = await one(
        `INSERT INTO message_drafts(user_id, conversation_id, text, source_language)
         VALUES($1, $2, $3, $4)
         ON CONFLICT(user_id, conversation_id)
         DO UPDATE SET source_language=EXCLUDED.source_language
         RETURNING *`,
        [testUser1.id, conversation.id, `Text in ${lang}`, lang]
      );

      assert.equal(draft.source_language, lang);
    }
  });
});
