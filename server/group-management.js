// Group Management API Endpoints
import { randomUUID, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { db, one, transaction } from './db.js';
import { HttpError } from './security.js';
import { limit } from './infra.js';
import { membership, conversationEvent } from './service.js';
import { id } from '../shared/contracts.js';

// Helper function to check if user is group admin
export async function assertGroupAdmin(userId, conversationId, client = db) {
  const member = await one(
    'SELECT is_admin FROM members WHERE conversation_id=$1 AND user_id=$2',
    [conversationId, userId],
    client,
  );
  if (!member || !member.is_admin) {
    throw new HttpError(403, 'Only group admins can perform this action.');
  }
}

// Helper function to check if conversation is a group
export async function assertIsGroup(conversationId, client = db) {
  const conversation = await one(
    'SELECT id FROM conversations WHERE id=$1 AND direct_key IS NULL AND deleted_at IS NULL',
    [conversationId],
    client,
  );
  if (!conversation) {
    throw new HttpError(404, 'Group not found.');
  }
  return conversation;
}

// Helper function to log group activity
async function logGroupActivity(conversationId, actorId, action, targetUserId = null, metadata = null, client = db) {
  await client.query(
    'INSERT INTO group_activities(id, conversation_id, actor_id, action, target_user_id, metadata) VALUES($1, $2, $3, $4, $5, $6)',
    [randomUUID(), conversationId, actorId, action, targetUserId, metadata ? JSON.stringify(metadata) : null],
  );
}

// Helper function to create system message
async function createSystemMessage(conversationId, messageType, actorId, targetUserId = null, metadata = null, client = db) {
  await client.query(
    'INSERT INTO system_messages(id, conversation_id, message_type, actor_id, target_user_id, metadata) VALUES($1, $2, $3, $4, $5, $6)',
    [randomUUID(), conversationId, messageType, actorId, targetUserId, metadata ? JSON.stringify(metadata) : null],
  );
}

// Update group profile (name, description, avatar)
export async function updateGroupProfile(req, res) {
  const cid = id.parse(req.params.id);
  const input = z.object({
    name: z.string().trim().min(1).max(80).optional(),
    description: z.string().trim().max(500).optional().nullable(),
    allow_member_invites: z.boolean().optional(),
    require_admin_approval: z.boolean().optional(),
  }).parse(req.body);

  await transaction(async (c) => {
    await membership(req.user.id, cid, c);
    await assertIsGroup(cid, c);
    await assertGroupAdmin(req.user.id, cid, c);

    const updates = [];
    const values = [cid];
    let paramCount = 1;

    if (input.name !== undefined) {
      updates.push(`name=$${++paramCount}`);
      values.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push(`description=$${++paramCount}`);
      values.push(input.description);
    }
    if (input.allow_member_invites !== undefined) {
      updates.push(`allow_member_invites=$${++paramCount}`);
      values.push(input.allow_member_invites);
    }
    if (input.require_admin_approval !== undefined) {
      updates.push(`require_admin_approval=$${++paramCount}`);
      values.push(input.require_admin_approval);
    }

    if (updates.length === 0) {
      throw new HttpError(400, 'No fields to update.');
    }

    await c.query(
      `UPDATE conversations SET ${updates.join(', ')} WHERE id=$1`,
      values,
    );

    if (input.name) {
      await logGroupActivity(cid, req.user.id, 'group_updated', null, { field: 'name', value: input.name }, c);
      await createSystemMessage(cid, 'group_renamed', req.user.id, null, { new_name: input.name }, c);
    }
    if (input.description !== undefined) {
      await logGroupActivity(cid, req.user.id, 'group_updated', null, { field: 'description' }, c);
    }
    if (input.allow_member_invites !== undefined || input.require_admin_approval !== undefined) {
      await logGroupActivity(cid, req.user.id, 'settings_changed', null, input, c);
    }

    await conversationEvent(c, cid, 'conversation:changed', { conversation_id: cid });
  });

  res.json({ ok: true });
}

// Add member to group
export async function addGroupMember(req, res) {
  await limit(`group-members:${req.user.id}`, 20, 60);
  const cid = id.parse(req.params.id);
  const input = z.object({
    handle: z.string().regex(/^[a-z0-9_]{3,30}$/),
  }).parse(req.body);

  const result = await transaction(async (c) => {
    await membership(req.user.id, cid, c);
    await assertIsGroup(cid, c);

    // Check if user can add members (either admin or group allows member invites)
    const member = await one(
      'SELECT is_admin, can_add_members FROM members WHERE conversation_id=$1 AND user_id=$2',
      [cid, req.user.id],
      c,
    );
    const group = await one(
      'SELECT allow_member_invites FROM conversations WHERE id=$1',
      [cid],
      c,
    );

    if (!member.is_admin && !member.can_add_members && !group.allow_member_invites) {
      throw new HttpError(403, 'You do not have permission to add members to this group.');
    }

    // Find the user to add
    const newUser = await one('SELECT id, name, handle FROM users WHERE handle=$1', [input.handle], c);
    if (!newUser) {
      throw new HttpError(404, 'User not found.');
    }
    if (newUser.id === req.user.id) {
      throw new HttpError(400, 'You are already in this group.');
    }

    // Check if user is already a member
    const existing = await one(
      'SELECT user_id FROM members WHERE conversation_id=$1 AND user_id=$2',
      [cid, newUser.id],
      c,
    );
    if (existing) {
      throw new HttpError(409, 'User is already a member of this group.');
    }

    // Check for blocks
    const allMembers = (await c.query(
      'SELECT user_id FROM members WHERE conversation_id=$1',
      [cid],
    )).rows.map(r => r.user_id);
    
    const blockExists = await one(
      'SELECT 1 FROM user_blocks WHERE (blocker_id=$1 AND blocked_id=ANY($2::uuid[])) OR (blocked_id=$1 AND blocker_id=ANY($2::uuid[]))',
      [newUser.id, allMembers],
      c,
    );
    
    if (blockExists) {
      throw new HttpError(403, 'Cannot add this user due to a block.');
    }

    // Check if user has privacy settings that require approval
    const userSettings = await one(
      'SELECT who_can_add_to_groups, require_group_approval FROM users WHERE id=$1',
      [newUser.id],
      c,
    );

    const isContact = await one(
      'SELECT 1 FROM conversations dc JOIN members m1 ON m1.conversation_id=dc.id AND m1.user_id=$1 JOIN members m2 ON m2.conversation_id=dc.id AND m2.user_id=$2 WHERE dc.direct_key IS NOT NULL',
      [req.user.id, newUser.id],
      c,
    );

    if (userSettings.who_can_add_to_groups === 'nobody') {
      throw new HttpError(403, 'This user has disabled group invitations.');
    }
    if (userSettings.who_can_add_to_groups === 'contacts' && !isContact) {
      throw new HttpError(403, 'This user only accepts group invitations from contacts.');
    }

    // Add member
    await c.query(
      'INSERT INTO members(conversation_id, user_id, added_by_id, joined_at) VALUES($1, $2, $3, now())',
      [cid, newUser.id, req.user.id],
    );

    await logGroupActivity(cid, req.user.id, 'member_added', newUser.id, null, c);
    await createSystemMessage(cid, 'member_added', req.user.id, newUser.id, { member_name: newUser.name }, c);
    await conversationEvent(c, cid, 'conversation:changed', { conversation_id: cid });
    
    return { member_id: newUser.id, member_name: newUser.name, member_handle: newUser.handle };
  });

  res.status(201).json(result);
}

// Remove member from group
export async function removeGroupMember(req, res) {
  const cid = id.parse(req.params.id);
  const targetUserId = id.parse(req.params.userId);

  await transaction(async (c) => {
    await membership(req.user.id, cid, c);
    await assertIsGroup(cid, c);
    await assertGroupAdmin(req.user.id, cid, c);

    if (targetUserId === req.user.id) {
      throw new HttpError(400, 'Use leave endpoint to leave the group.');
    }

    const targetMember = await one(
      'SELECT user_id, is_admin FROM members WHERE conversation_id=$1 AND user_id=$2',
      [cid, targetUserId],
      c,
    );

    if (!targetMember) {
      throw new HttpError(404, 'Member not found in this group.');
    }

    // Get member info before deleting
    const targetUser = await one('SELECT name FROM users WHERE id=$1', [targetUserId], c);

    await c.query(
      'DELETE FROM members WHERE conversation_id=$1 AND user_id=$2',
      [cid, targetUserId],
    );

    await logGroupActivity(cid, req.user.id, 'member_removed', targetUserId, null, c);
    await createSystemMessage(cid, 'member_removed', req.user.id, targetUserId, { member_name: targetUser.name }, c);
    await conversationEvent(c, cid, 'conversation:changed', { conversation_id: cid });
  });

  res.json({ ok: true });
}

// Leave group
export async function leaveGroup(req, res) {
  const cid = id.parse(req.params.id);

  await transaction(async (c) => {
    await membership(req.user.id, cid, c);
    await assertIsGroup(cid, c);

    const member = await one(
      'SELECT is_admin FROM members WHERE conversation_id=$1 AND user_id=$2',
      [cid, req.user.id],
      c,
    );

    // Count total admins
    const adminCount = Number(
      (await one('SELECT count(*) as count FROM members WHERE conversation_id=$1 AND is_admin=true', [cid], c)).count,
    );

    // If leaving user is the only admin, check if there are other members
    if (member.is_admin && adminCount === 1) {
      const memberCount = Number(
        (await one('SELECT count(*) as count FROM members WHERE conversation_id=$1', [cid], c)).count,
      );

      if (memberCount > 1) {
        throw new HttpError(400, 'Transfer admin role to another member before leaving.');
      }
    }

    await c.query(
      'DELETE FROM members WHERE conversation_id=$1 AND user_id=$2',
      [cid, req.user.id],
    );

    await logGroupActivity(cid, req.user.id, 'member_left', req.user.id, null, c);
    await createSystemMessage(cid, 'member_left', req.user.id, req.user.id, { member_name: req.user.name }, c);
    await conversationEvent(c, cid, 'conversation:changed', { conversation_id: cid });
  });

  res.json({ ok: true });
}

// Promote member to admin
export async function promoteToAdmin(req, res) {
  const cid = id.parse(req.params.id);
  const targetUserId = id.parse(req.params.userId);

  await transaction(async (c) => {
    await membership(req.user.id, cid, c);
    await assertIsGroup(cid, c);
    await assertGroupAdmin(req.user.id, cid, c);

    const targetMember = await one(
      'SELECT is_admin FROM members WHERE conversation_id=$1 AND user_id=$2',
      [cid, targetUserId],
      c,
    );

    if (!targetMember) {
      throw new HttpError(404, 'Member not found in this group.');
    }

    if (targetMember.is_admin) {
      throw new HttpError(409, 'User is already an admin.');
    }

    await c.query(
      'UPDATE members SET is_admin=true WHERE conversation_id=$1 AND user_id=$2',
      [cid, targetUserId],
    );

    const targetUser = await one('SELECT name FROM users WHERE id=$1', [targetUserId], c);

    await logGroupActivity(cid, req.user.id, 'admin_added', targetUserId, null, c);
    await createSystemMessage(cid, 'admin_promoted', req.user.id, targetUserId, { member_name: targetUser.name }, c);
    await conversationEvent(c, cid, 'conversation:changed', { conversation_id: cid });
  });

  res.json({ ok: true });
}

// Demote admin to regular member
export async function demoteFromAdmin(req, res) {
  const cid = id.parse(req.params.id);
  const targetUserId = id.parse(req.params.userId);

  await transaction(async (c) => {
    await membership(req.user.id, cid, c);
    await assertIsGroup(cid, c);
    await assertGroupAdmin(req.user.id, cid, c);

    const targetMember = await one(
      'SELECT is_admin FROM members WHERE conversation_id=$1 AND user_id=$2',
      [cid, targetUserId],
      c,
    );

    if (!targetMember) {
      throw new HttpError(404, 'Member not found in this group.');
    }

    if (!targetMember.is_admin) {
      throw new HttpError(409, 'User is not an admin.');
    }

    // Count total admins
    const adminCount = Number(
      (await one('SELECT count(*) as count FROM members WHERE conversation_id=$1 AND is_admin=true', [cid], c)).count,
    );

    if (adminCount === 1) {
      throw new HttpError(400, 'Cannot demote the only admin. Promote another member first.');
    }

    await c.query(
      'UPDATE members SET is_admin=false WHERE conversation_id=$1 AND user_id=$2',
      [cid, targetUserId],
    );

    const targetUser = await one('SELECT name FROM users WHERE id=$1', [targetUserId], c);

    await logGroupActivity(cid, req.user.id, 'admin_removed', targetUserId, null, c);
    await createSystemMessage(cid, 'admin_demoted', req.user.id, targetUserId, { member_name: targetUser.name }, c);
    await conversationEvent(c, cid, 'conversation:changed', { conversation_id: cid });
  });

  res.json({ ok: true });
}

// Update member permissions
export async function updateMemberPermissions(req, res) {
  const cid = id.parse(req.params.id);
  const targetUserId = id.parse(req.params.userId);
  const input = z.object({
    can_send_messages: z.boolean().optional(),
    can_add_members: z.boolean().optional(),
  }).parse(req.body);

  await transaction(async (c) => {
    await membership(req.user.id, cid, c);
    await assertIsGroup(cid, c);
    await assertGroupAdmin(req.user.id, cid, c);

    if (Object.keys(input).length === 0) {
      throw new HttpError(400, 'No permissions to update.');
    }

    const targetMember = await one(
      'SELECT user_id FROM members WHERE conversation_id=$1 AND user_id=$2',
      [cid, targetUserId],
      c,
    );

    if (!targetMember) {
      throw new HttpError(404, 'Member not found in this group.');
    }

    const updates = [];
    const values = [cid, targetUserId];
    let paramCount = 2;

    if (input.can_send_messages !== undefined) {
      updates.push(`can_send_messages=$${++paramCount}`);
      values.push(input.can_send_messages);
    }
    if (input.can_add_members !== undefined) {
      updates.push(`can_add_members=$${++paramCount}`);
      values.push(input.can_add_members);
    }

    await c.query(
      `UPDATE members SET ${updates.join(', ')} WHERE conversation_id=$1 AND user_id=$2`,
      values,
    );

    await logGroupActivity(cid, req.user.id, 'settings_changed', targetUserId, input, c);
    await conversationEvent(c, cid, 'conversation:changed', { conversation_id: cid });
  });

  res.json({ ok: true });
}

// Mute/unmute group
export async function toggleGroupMute(req, res) {
  const cid = id.parse(req.params.id);
  const input = z.object({
    muted: z.boolean(),
  }).parse(req.body);

  await transaction(async (c) => {
    await membership(req.user.id, cid, c);
    await assertIsGroup(cid, c);

    await c.query(
      'UPDATE members SET muted=$3 WHERE conversation_id=$1 AND user_id=$2',
      [cid, req.user.id, input.muted],
    );
  });

  res.json({ ok: true, muted: input.muted });
}

// Delete group (admin only)
export async function deleteGroup(req, res) {
  const cid = id.parse(req.params.id);

  await transaction(async (c) => {
    await membership(req.user.id, cid, c);
    await assertIsGroup(cid, c);
    await assertGroupAdmin(req.user.id, cid, c);

    await c.query(
      'UPDATE conversations SET deleted_at=now() WHERE id=$1',
      [cid],
    );

    await logGroupActivity(cid, req.user.id, 'group_deleted', null, null, c);
    await conversationEvent(c, cid, 'conversation:changed', { conversation_id: cid });
  });

  res.json({ ok: true });
}

// Get group details (members, admins, settings)
export async function getGroupDetails(req, res) {
  const cid = id.parse(req.params.id);
  await membership(req.user.id, cid);
  
  const group = await one(
    `SELECT c.id, c.name, c.description, c.avatar_id, c.created_by_id, c.allow_member_invites, c.require_admin_approval, c.created_at,
     (SELECT jsonb_agg(jsonb_build_object('id',u.id,'name',u.name,'handle',u.handle,'avatar_id',u.avatar_id,'is_admin',m.is_admin,'can_send_messages',m.can_send_messages,'can_add_members',m.can_add_members,'joined_at',m.joined_at) ORDER BY m.is_admin DESC, u.name) 
      FROM members m JOIN users u ON u.id=m.user_id WHERE m.conversation_id=c.id) AS members,
     (SELECT count(*)::int FROM members WHERE conversation_id=c.id) AS member_count
     FROM conversations c WHERE c.id=$1 AND c.direct_key IS NULL AND c.deleted_at IS NULL`,
    [cid],
  );

  if (!group) {
    throw new HttpError(404, 'Group not found.');
  }

  res.json(group);
}

// Create group invite link
export async function createInviteLink(req, res) {
  await limit(`group-invites:${req.user.id}`, 10, 60);
  const cid = id.parse(req.params.id);
  const input = z.object({
    expires_in_days: z.number().int().min(1).max(365).optional(),
    max_uses: z.number().int().min(1).max(1000).optional().nullable(),
  }).parse(req.body);

  const invite = await transaction(async (c) => {
    await membership(req.user.id, cid, c);
    await assertIsGroup(cid, c);
    await assertGroupAdmin(req.user.id, cid, c);

    const code = randomBytes(16).toString('base64url');
    const expiresAt = input.expires_in_days 
      ? new Date(Date.now() + input.expires_in_days * 24 * 60 * 60 * 1000)
      : null;

    const result = await one(
      'INSERT INTO group_invites(id, conversation_id, code, created_by_id, expires_at, max_uses) VALUES($1, $2, $3, $4, $5, $6) RETURNING *',
      [randomUUID(), cid, code, req.user.id, expiresAt, input.max_uses],
      c,
    );

    return result;
  });

  res.status(201).json({
    id: invite.id,
    code: invite.code,
    expires_at: invite.expires_at,
    max_uses: invite.max_uses,
    use_count: invite.use_count,
  });
}

// Get invite links for a group
export async function getInviteLinks(req, res) {
  const cid = id.parse(req.params.id);
  await membership(req.user.id, cid);
  await assertIsGroup(cid);
  await assertGroupAdmin(req.user.id, cid);

  const invites = (await db.query(
    `SELECT gi.id, gi.code, gi.created_by_id, u.name as created_by_name, gi.expires_at, gi.max_uses, gi.use_count, gi.revoked, gi.created_at
     FROM group_invites gi JOIN users u ON u.id=gi.created_by_id
     WHERE gi.conversation_id=$1 AND NOT gi.revoked
     ORDER BY gi.created_at DESC`,
    [cid],
  )).rows;

  res.json({ invites });
}

// Revoke invite link
export async function revokeInviteLink(req, res) {
  const cid = id.parse(req.params.id);
  const inviteId = id.parse(req.params.inviteId);

  await transaction(async (c) => {
    await membership(req.user.id, cid, c);
    await assertIsGroup(cid, c);
    await assertGroupAdmin(req.user.id, cid, c);

    const result = await c.query(
      'UPDATE group_invites SET revoked=true WHERE id=$1 AND conversation_id=$2',
      [inviteId, cid],
    );

    if (result.rowCount === 0) {
      throw new HttpError(404, 'Invite link not found.');
    }
  });

  res.json({ ok: true });
}

// Join group via invite link
export async function joinViaInviteLink(req, res) {
  await limit(`group-join:${req.user.id}`, 20, 60);
  const input = z.object({
    code: z.string().min(1),
  }).parse(req.body);

  const result = await transaction(async (c) => {
    const invite = await one(
      `SELECT gi.*, c.name as group_name, c.require_admin_approval
       FROM group_invites gi JOIN conversations c ON c.id=gi.conversation_id
       WHERE gi.code=$1 AND NOT gi.revoked AND c.deleted_at IS NULL`,
      [input.code],
      c,
    );

    if (!invite) {
      throw new HttpError(404, 'Invalid or expired invite link.');
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      throw new HttpError(410, 'This invite link has expired.');
    }

    if (invite.max_uses && invite.use_count >= invite.max_uses) {
      throw new HttpError(410, 'This invite link has reached its usage limit.');
    }

    // Check if already a member
    const existing = await one(
      'SELECT user_id FROM members WHERE conversation_id=$1 AND user_id=$2',
      [invite.conversation_id, req.user.id],
      c,
    );

    if (existing) {
      throw new HttpError(409, 'You are already a member of this group.');
    }

    // Check for blocks
    const members = (await c.query(
      'SELECT user_id FROM members WHERE conversation_id=$1',
      [invite.conversation_id],
    )).rows.map(r => r.user_id);

    const blockExists = await one(
      'SELECT 1 FROM user_blocks WHERE (blocker_id=$1 AND blocked_id=ANY($2::uuid[])) OR (blocked_id=$1 AND blocker_id=ANY($2::uuid[]))',
      [req.user.id, members],
      c,
    );

    if (blockExists) {
      throw new HttpError(403, 'Cannot join this group due to a block.');
    }

    // If requires approval, create join request
    if (invite.require_admin_approval) {
      const requestId = randomUUID();
      await c.query(
        'INSERT INTO group_join_requests(id, conversation_id, user_id, invite_id) VALUES($1, $2, $3, $4)',
        [requestId, invite.conversation_id, req.user.id, invite.id],
      );

      return { status: 'pending_approval', group_name: invite.group_name };
    }

    // Add member directly
    await c.query(
      'INSERT INTO members(conversation_id, user_id, joined_at) VALUES($1, $2, now())',
      [invite.conversation_id, req.user.id],
    );

    // Update invite use count
    await c.query(
      'UPDATE group_invites SET use_count=use_count+1 WHERE id=$1',
      [invite.id],
    );

    await logGroupActivity(invite.conversation_id, req.user.id, 'member_joined', req.user.id, { via_invite: true }, c);
    await createSystemMessage(invite.conversation_id, 'member_joined', req.user.id, req.user.id, { member_name: req.user.name }, c);
    await conversationEvent(c, invite.conversation_id, 'conversation:changed', { conversation_id: invite.conversation_id });

    return { status: 'joined', group_name: invite.group_name, conversation_id: invite.conversation_id };
  });

  res.json(result);
}

// Get pending join requests (admin only)
export async function getJoinRequests(req, res) {
  const cid = id.parse(req.params.id);
  await membership(req.user.id, cid);
  await assertIsGroup(cid);
  await assertGroupAdmin(req.user.id, cid);

  const requests = (await db.query(
    `SELECT jr.id, jr.user_id, u.name, u.handle, u.avatar_id, jr.message, jr.created_at
     FROM group_join_requests jr JOIN users u ON u.id=jr.user_id
     WHERE jr.conversation_id=$1 AND jr.status='pending'
     ORDER BY jr.created_at ASC`,
    [cid],
  )).rows;

  res.json({ requests });
}

// Approve/reject join request
export async function respondToJoinRequest(req, res) {
  const cid = id.parse(req.params.id);
  const requestId = id.parse(req.params.requestId);
  const input = z.object({
    action: z.enum(['approve', 'reject']),
  }).parse(req.body);

  await transaction(async (c) => {
    await membership(req.user.id, cid, c);
    await assertIsGroup(cid, c);
    await assertGroupAdmin(req.user.id, cid, c);

    const request = await one(
      'SELECT * FROM group_join_requests WHERE id=$1 AND conversation_id=$2 AND status=$3',
      [requestId, cid, 'pending'],
      c,
    );

    if (!request) {
      throw new HttpError(404, 'Join request not found.');
    }

    if (input.action === 'approve') {
      // Add member
      await c.query(
        'INSERT INTO members(conversation_id, user_id, joined_at) VALUES($1, $2, now())',
        [cid, request.user_id],
      );

      const newMember = await one('SELECT name FROM users WHERE id=$1', [request.user_id], c);

      await logGroupActivity(cid, req.user.id, 'member_added', request.user_id, { via_approval: true }, c);
      await createSystemMessage(cid, 'member_joined', request.user_id, request.user_id, { member_name: newMember.name }, c);
    }

    await c.query(
      'UPDATE group_join_requests SET status=$3, responded_at=now(), responded_by_id=$4 WHERE id=$1 AND conversation_id=$2',
      [requestId, cid, input.action === 'approve' ? 'approved' : 'rejected', req.user.id],
    );

    await conversationEvent(c, cid, 'conversation:changed', { conversation_id: cid });
  });

  res.json({ ok: true });
}

// Get group activity log
export async function getGroupActivity(req, res) {
  const cid = id.parse(req.params.id);
  await membership(req.user.id, cid);
  await assertIsGroup(cid);

  const input = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  }).parse(req.query);

  const activities = (await db.query(
    `SELECT ga.id, ga.action, ga.created_at,
     jsonb_build_object('id',actor.id,'name',actor.name,'handle',actor.handle) as actor,
     jsonb_build_object('id',target.id,'name',target.name,'handle',target.handle) as target_user,
     ga.metadata
     FROM group_activities ga
     LEFT JOIN users actor ON actor.id=ga.actor_id
     LEFT JOIN users target ON target.id=ga.target_user_id
     WHERE ga.conversation_id=$1
     ORDER BY ga.created_at DESC
     LIMIT $2 OFFSET $3`,
    [cid, input.limit, input.offset],
  )).rows;

  res.json({ activities });
}
