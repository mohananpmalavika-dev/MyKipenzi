// Contact Management Service
// Handles favorites, labels, notes, and sync operations

import { randomUUID } from 'node:crypto';
import { db, one, transaction } from './db.js';
import { HttpError } from './security.js';

// Get all contacts for a user with optional filtering
export async function getContacts(userId, options = {}) {
  const { favorite_only = false, label_id = null, search = '', offset = 0, limit = 50 } = options;
  
  let query = `
    SELECT 
      uc.*,
      u.id, u.name, u.handle, u.avatar_id, u.last_seen, u.online_status_visibility, u.last_seen_visibility,
      cn.note,
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('id', cl.id, 'name', cl.name, 'color', cl.color, 'icon', cl.icon))
         FROM contact_label_members clm
         JOIN contact_labels cl ON cl.id = clm.label_id
         WHERE clm.user_id = uc.user_id AND clm.contact_id = uc.contact_id),
        '[]'::jsonb
      ) AS labels,
      EXISTS(SELECT 1 FROM conversations c 
             JOIN members m1 ON m1.conversation_id = c.id AND m1.user_id = $1
             JOIN members m2 ON m2.conversation_id = c.id AND m2.user_id = u.id
             WHERE c.direct_key IS NOT NULL) AS has_conversation
    FROM user_contacts uc
    JOIN users u ON u.id = uc.contact_id
    LEFT JOIN contact_notes cn ON cn.user_id = uc.user_id AND cn.contact_id = uc.contact_id
    WHERE uc.user_id = $1
  `;
  
  const params = [userId];
  let paramIndex = 2;
  
  if (favorite_only) {
    query += ` AND uc.is_favorite = true`;
  }
  
  if (label_id) {
    query += ` AND EXISTS(SELECT 1 FROM contact_label_members WHERE user_id = $1 AND contact_id = uc.contact_id AND label_id = $${paramIndex})`;
    params.push(label_id);
    paramIndex++;
  }
  
  if (search) {
    query += ` AND (
      strpos(lower(u.name), lower($${paramIndex})) > 0 OR 
      strpos(u.handle, lower(ltrim($${paramIndex}, '@'))) > 0 OR
      strpos(lower(COALESCE(uc.nickname, '')), lower($${paramIndex})) > 0
    )`;
    params.push(search);
    paramIndex++;
  }
  
  query += ` ORDER BY uc.is_favorite DESC, uc.last_contacted_at DESC NULLS LAST, lower(u.name) LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit + 1, offset);
  
  const result = await db.query(query, params);
  const contacts = result.rows.slice(0, limit);
  const has_more = result.rows.length > limit;
  
  // Apply privacy filtering
  return {
    contacts: contacts.map(c => {
      const canSeeOnline = c.online_status_visibility === 'everyone' || c.online_status_visibility === 'contacts';
      const canSeeLastSeen = c.last_seen_visibility === 'everyone' || c.last_seen_visibility === 'contacts';
      const isOnline = c.last_seen && (new Date() - new Date(c.last_seen)) < 60000;
      
      return {
        id: c.contact_id,
        name: c.name,
        handle: c.handle,
        nickname: c.nickname,
        avatar_id: c.avatar_id,
        is_favorite: c.is_favorite,
        added_at: c.added_at,
        last_contacted_at: c.last_contacted_at,
        online: canSeeOnline ? isOnline : null,
        last_seen: canSeeLastSeen ? c.last_seen : null,
        note: c.note,
        labels: c.labels,
        has_conversation: c.has_conversation
      };
    }),
    has_more
  };
}

// Add a contact to favorites
export async function addContact(userId, contactId, options = {}) {
  if (userId === contactId) {
    throw new HttpError(400, 'You cannot add yourself as a contact.');
  }
  
  // Check if contact exists
  if (!(await one('SELECT id FROM users WHERE id=$1', [contactId]))) {
    throw new HttpError(404, 'User not found.');
  }
  
  // Check if blocked
  if (await one('SELECT 1 FROM user_blocks WHERE (blocker_id=$1 AND blocked_id=$2) OR (blocker_id=$2 AND blocked_id=$1)', [userId, contactId])) {
    throw new HttpError(403, 'Cannot add blocked users as contacts.');
  }
  
  const { nickname = null, is_favorite = true } = options;
  
  const result = await one(
    `INSERT INTO user_contacts(user_id, contact_id, nickname, is_favorite, added_at) 
     VALUES($1, $2, $3, $4, now()) 
     ON CONFLICT (user_id, contact_id) 
     DO UPDATE SET nickname = EXCLUDED.nickname, is_favorite = EXCLUDED.is_favorite
     RETURNING *`,
    [userId, contactId, nickname, is_favorite]
  );
  
  return result;
}

// Remove a contact
export async function removeContact(userId, contactId) {
  const result = await db.query(
    'DELETE FROM user_contacts WHERE user_id=$1 AND contact_id=$2 RETURNING contact_id',
    [userId, contactId]
  );
  
  if (result.rowCount === 0) {
    throw new HttpError(404, 'Contact not found.');
  }
  
  return { removed: true };
}

// Update contact details (nickname, favorite status)
export async function updateContact(userId, contactId, updates) {
  const allowed = ['nickname', 'is_favorite'];
  const fields = Object.keys(updates).filter(k => allowed.includes(k));
  
  if (fields.length === 0) {
    throw new HttpError(400, 'No valid fields to update.');
  }
  
  const setClauses = fields.map((f, i) => `${f} = $${i + 3}`).join(', ');
  const values = [userId, contactId, ...fields.map(f => updates[f])];
  
  const result = await one(
    `UPDATE user_contacts SET ${setClauses} WHERE user_id=$1 AND contact_id=$2 RETURNING *`,
    values
  );
  
  if (!result) {
    throw new HttpError(404, 'Contact not found.');
  }
  
  return result;
}

// Label management
export async function getLabels(userId) {
  const result = await db.query(
    `SELECT cl.*, 
     COUNT(clm.contact_id) AS member_count
     FROM contact_labels cl
     LEFT JOIN contact_label_members clm ON clm.label_id = cl.id
     WHERE cl.user_id = $1
     GROUP BY cl.id
     ORDER BY cl.position, cl.created_at`,
    [userId]
  );
  
  return result.rows;
}

export async function createLabel(userId, data) {
  const { name, color = null, icon = null } = data;
  
  // Get max position
  const maxPos = await one('SELECT COALESCE(MAX(position), -1) AS max FROM contact_labels WHERE user_id=$1', [userId]);
  
  const result = await one(
    `INSERT INTO contact_labels(id, user_id, name, color, icon, position) 
     VALUES($1, $2, $3, $4, $5, $6) 
     RETURNING *`,
    [randomUUID(), userId, name.trim(), color, icon, (maxPos?.max || -1) + 1]
  );
  
  return result;
}

export async function updateLabel(userId, labelId, updates) {
  const allowed = ['name', 'color', 'icon', 'position'];
  const fields = Object.keys(updates).filter(k => allowed.includes(k));
  
  if (fields.length === 0) {
    throw new HttpError(400, 'No valid fields to update.');
  }
  
  const setClauses = fields.map((f, i) => `${f} = $${i + 3}`).join(', ');
  const values = [userId, labelId, ...fields.map(f => f === 'name' ? updates[f].trim() : updates[f])];
  
  const result = await one(
    `UPDATE contact_labels SET ${setClauses} WHERE id=$2 AND user_id=$1 RETURNING *`,
    values
  );
  
  if (!result) {
    throw new HttpError(404, 'Label not found.');
  }
  
  return result;
}

export async function deleteLabel(userId, labelId) {
  const result = await db.query(
    'DELETE FROM contact_labels WHERE id=$1 AND user_id=$2 RETURNING id',
    [labelId, userId]
  );
  
  if (result.rowCount === 0) {
    throw new HttpError(404, 'Label not found.');
  }
  
  return { deleted: true };
}

// Add contact to label
export async function addContactToLabel(userId, labelId, contactId) {
  // Verify label ownership
  if (!(await one('SELECT id FROM contact_labels WHERE id=$1 AND user_id=$2', [labelId, userId]))) {
    throw new HttpError(404, 'Label not found.');
  }
  
  // Verify contact exists
  if (!(await one('SELECT 1 FROM user_contacts WHERE user_id=$1 AND contact_id=$2', [userId, contactId]))) {
    throw new HttpError(404, 'Contact not found. Add them as a contact first.');
  }
  
  await db.query(
    `INSERT INTO contact_label_members(label_id, user_id, contact_id) 
     VALUES($1, $2, $3) 
     ON CONFLICT DO NOTHING`,
    [labelId, userId, contactId]
  );
  
  return { added: true };
}

// Remove contact from label
export async function removeContactFromLabel(userId, labelId, contactId) {
  const result = await db.query(
    'DELETE FROM contact_label_members WHERE label_id=$1 AND user_id=$2 AND contact_id=$3 RETURNING label_id',
    [labelId, userId, contactId]
  );
  
  if (result.rowCount === 0) {
    throw new HttpError(404, 'Contact not in this label.');
  }
  
  return { removed: true };
}

// Notes management
export async function getContactNote(userId, contactId) {
  const result = await one(
    'SELECT note, created_at, updated_at FROM contact_notes WHERE user_id=$1 AND contact_id=$2',
    [userId, contactId]
  );
  
  return result || { note: null };
}

export async function setContactNote(userId, contactId, note) {
  // Verify contact exists
  if (!(await one('SELECT 1 FROM user_contacts WHERE user_id=$1 AND contact_id=$2', [userId, contactId]))) {
    throw new HttpError(404, 'Contact not found. Add them as a contact first.');
  }
  
  const trimmedNote = note.trim();
  
  if (!trimmedNote) {
    // Delete note if empty
    await db.query('DELETE FROM contact_notes WHERE user_id=$1 AND contact_id=$2', [userId, contactId]);
    return { note: null };
  }
  
  const result = await one(
    `INSERT INTO contact_notes(user_id, contact_id, note, created_at, updated_at) 
     VALUES($1, $2, $3, now(), now()) 
     ON CONFLICT (user_id, contact_id) 
     DO UPDATE SET note = EXCLUDED.note, updated_at = now()
     RETURNING *`,
    [userId, contactId, trimmedNote]
  );
  
  return result;
}

// Export contacts
export async function exportContacts(userId, format = 'json') {
  const contacts = await getContacts(userId, { limit: 10000 });
  
  let exportData;
  let mimeType;
  
  switch (format) {
    case 'json':
      exportData = JSON.stringify(contacts.contacts, null, 2);
      mimeType = 'application/json';
      break;
      
    case 'csv':
      const headers = 'Name,Handle,Nickname,Favorite,Added At,Last Contacted,Note,Labels\n';
      const rows = contacts.contacts.map(c => 
        [
          c.name,
          c.handle,
          c.nickname || '',
          c.is_favorite ? 'Yes' : 'No',
          c.added_at,
          c.last_contacted_at || '',
          (c.note || '').replace(/"/g, '""'),
          c.labels.map(l => l.name).join('; ')
        ].map(field => `"${field}"`).join(',')
      ).join('\n');
      exportData = headers + rows;
      mimeType = 'text/csv';
      break;
      
    case 'vcard':
      exportData = contacts.contacts.map(c => {
        const labels = c.labels.map(l => l.name).join(',');
        return [
          'BEGIN:VCARD',
          'VERSION:3.0',
          `FN:${c.name}`,
          `NICKNAME:${c.nickname || ''}`,
          `X-SOCIALPROFILE;TYPE=kipenzi:@${c.handle}`,
          labels ? `CATEGORIES:${labels}` : '',
          c.note ? `NOTE:${c.note.replace(/\n/g, '\\n')}` : '',
          'END:VCARD'
        ].filter(Boolean).join('\n');
      }).join('\n\n');
      mimeType = 'text/vcard';
      break;
      
    default:
      throw new HttpError(400, 'Unsupported format. Use json, csv, or vcard.');
  }
  
  // Log export
  await db.query(
    'INSERT INTO contact_exports(id, user_id, format, contact_count) VALUES($1, $2, $3, $4)',
    [randomUUID(), userId, format, contacts.contacts.length]
  );
  
  return { data: exportData, mimeType, count: contacts.contacts.length };
}

// Import contacts from JSON
export async function importContacts(userId, data) {
  if (!Array.isArray(data)) {
    throw new HttpError(400, 'Import data must be an array of contacts.');
  }
  
  let imported = 0;
  let skipped = 0;
  const errors = [];
  
  await transaction(async (client) => {
    for (const contact of data) {
      try {
        if (!contact.handle) {
          skipped++;
          continue;
        }
        
        // Find user by handle
        const user = await one('SELECT id FROM users WHERE handle=$1', [contact.handle], client);
        if (!user) {
          errors.push(`User @${contact.handle} not found`);
          skipped++;
          continue;
        }
        
        // Add contact
        await client.query(
          `INSERT INTO user_contacts(user_id, contact_id, nickname, is_favorite) 
           VALUES($1, $2, $3, $4) 
           ON CONFLICT (user_id, contact_id) DO NOTHING`,
          [userId, user.id, contact.nickname || null, contact.is_favorite !== false]
        );
        
        // Add note if provided
        if (contact.note) {
          await client.query(
            `INSERT INTO contact_notes(user_id, contact_id, note) 
             VALUES($1, $2, $3) 
             ON CONFLICT (user_id, contact_id) 
             DO UPDATE SET note = EXCLUDED.note, updated_at = now()`,
            [userId, user.id, contact.note]
          );
        }
        
        imported++;
      } catch (err) {
        errors.push(`Error importing @${contact.handle}: ${err.message}`);
        skipped++;
      }
    }
  });
  
  return { imported, skipped, errors: errors.slice(0, 10) };
}
