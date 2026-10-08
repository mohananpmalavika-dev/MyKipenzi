import { randomUUID } from 'node:crypto';
import { db, one, transaction } from './db.js';
import { HttpError } from './security.js';
import { membership, assertCanContact, enqueue, conversationEvent } from './service.js';
import { validateEventInput, validateTodoInput } from '../shared/calendar.js';

/**
 * Calendar Events
 */

export async function getCalendarEvents(userId, conversationId, startDate, endDate) {
  await membership(userId, conversationId);

  const events = (
    await db.query(
      `SELECT e.*,
        jsonb_build_object('id', u.id, 'name', u.name, 'handle', u.handle) AS created_by,
        (SELECT jsonb_agg(jsonb_build_object('user_id', r.user_id, 'response', r.response, 'note', r.note, 'name', ru.name))
         FROM calendar_event_responses r
         JOIN users ru ON ru.id = r.user_id
         WHERE r.event_id = e.id) AS responses
       FROM calendar_events e
       JOIN users u ON u.id = e.created_by_id
       WHERE e.conversation_id = $1
         AND e.event_date >= $2
         AND e.event_date <= $3
       ORDER BY e.event_date ASC, e.event_time ASC NULLS LAST`,
      [conversationId, startDate, endDate],
    )
  ).rows;

  return events;
}

export async function createCalendarEvent(userId, conversationId, input) {
  return transaction(async (c) => {
    await membership(userId, conversationId, c);
    await assertCanContact(userId, conversationId, c);

    try {
      validateEventInput(input);
    } catch (error) {
      throw new HttpError(400, error.message);
    }

    const eventId = randomUUID();
    const event = await one(
      `INSERT INTO calendar_events(
        id, conversation_id, created_by_id, title, description,
        event_date, event_time, all_day, category, emoji, location,
        is_recurring, recurrence_pattern, recurrence_end_date, reminder_minutes
      ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        eventId,
        conversationId,
        userId,
        input.title,
        input.description || null,
        input.event_date,
        input.event_time || null,
        input.all_day !== false,
        input.category || 'special_date',
        input.emoji || '📅',
        input.location || null,
        input.is_recurring || false,
        input.recurrence_pattern || null,
        input.recurrence_end_date || null,
        input.reminder_minutes ?? 1440,
      ],
      c,
    );

    await conversationEvent(c, conversationId, 'calendar:event_created', {
      conversation_id: conversationId,
      event_id: eventId,
      created_by_id: userId,
    });

    return event;
  });
}

export async function updateCalendarEvent(userId, eventId, input) {
  return transaction(async (c) => {
    const event = await one(
      'SELECT * FROM calendar_events WHERE id = $1 FOR UPDATE',
      [eventId],
      c,
    );

    if (!event) throw new HttpError(404, 'Event not found');

    await membership(userId, event.conversation_id, c);

    if (event.created_by_id !== userId) {
      throw new HttpError(403, 'Only the event creator can edit this event');
    }

    try {
      validateEventInput({ ...event, ...input });
    } catch (error) {
      throw new HttpError(400, error.message);
    }

    const updated = await one(
      `UPDATE calendar_events SET
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        event_date = COALESCE($4, event_date),
        event_time = COALESCE($5, event_time),
        all_day = COALESCE($6, all_day),
        category = COALESCE($7, category),
        emoji = COALESCE($8, emoji),
        location = COALESCE($9, location),
        is_recurring = COALESCE($10, is_recurring),
        recurrence_pattern = COALESCE($11, recurrence_pattern),
        recurrence_end_date = COALESCE($12, recurrence_end_date),
        reminder_minutes = COALESCE($13, reminder_minutes),
        reminder_sent_at = CASE WHEN $4 IS NOT NULL OR $5 IS NOT NULL OR $13 IS NOT NULL THEN NULL ELSE reminder_sent_at END,
        updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [
        eventId,
        input.title,
        input.description,
        input.event_date,
        input.event_time,
        input.all_day,
        input.category,
        input.emoji,
        input.location,
        input.is_recurring,
        input.recurrence_pattern,
        input.recurrence_end_date,
        input.reminder_minutes,
      ],
      c,
    );

    await conversationEvent(c, event.conversation_id, 'calendar:event_updated', {
      conversation_id: event.conversation_id,
      event_id: eventId,
    });

    return updated;
  });
}

export async function deleteCalendarEvent(userId, eventId) {
  return transaction(async (c) => {
    const event = await one('SELECT * FROM calendar_events WHERE id = $1', [eventId], c);

    if (!event) throw new HttpError(404, 'Event not found');

    await membership(userId, event.conversation_id, c);

    if (event.created_by_id !== userId) {
      throw new HttpError(403, 'Only the event creator can delete this event');
    }

    await c.query('DELETE FROM calendar_events WHERE id = $1', [eventId]);

    await conversationEvent(c, event.conversation_id, 'calendar:event_deleted', {
      conversation_id: event.conversation_id,
      event_id: eventId,
    });

    return { ok: true };
  });
}

export async function respondToEvent(userId, eventId, response, note = null) {
  return transaction(async (c) => {
    const event = await one('SELECT * FROM calendar_events WHERE id = $1', [eventId], c);

    if (!event) throw new HttpError(404, 'Event not found');

    await membership(userId, event.conversation_id, c);

    const responseRecord = await one(
      `INSERT INTO calendar_event_responses(event_id, user_id, response, note)
       VALUES($1, $2, $3, $4)
       ON CONFLICT(event_id, user_id)
       DO UPDATE SET response = EXCLUDED.response, note = EXCLUDED.note
       RETURNING *`,
      [eventId, userId, response, note],
      c,
    );

    await conversationEvent(c, event.conversation_id, 'calendar:event_response', {
      conversation_id: event.conversation_id,
      event_id: eventId,
      user_id: userId,
      response,
    });

    return responseRecord;
  });
}

/**
 * To-Do Lists
 */

export async function getTodoLists(userId, conversationId) {
  await membership(userId, conversationId);

  const lists = (
    await db.query(
      `SELECT l.*,
        jsonb_build_object('id', u.id, 'name', u.name) AS created_by,
        (SELECT COUNT(*)::int FROM todo_items WHERE list_id = l.id AND is_completed = false) AS active_count,
        (SELECT COUNT(*)::int FROM todo_items WHERE list_id = l.id AND is_completed = true) AS completed_count
       FROM todo_lists l
       JOIN users u ON u.id = l.created_by_id
       WHERE l.conversation_id = $1
       ORDER BY l.position ASC, l.created_at DESC`,
      [conversationId],
    )
  ).rows;

  return lists;
}

export async function createTodoList(userId, conversationId, input) {
  return transaction(async (c) => {
    await membership(userId, conversationId, c);

    const listId = randomUUID();
    const maxPosition = await one(
      'SELECT COALESCE(MAX(position), -1) AS max_pos FROM todo_lists WHERE conversation_id = $1',
      [conversationId],
      c,
    );

    const list = await one(
      `INSERT INTO todo_lists(id, conversation_id, created_by_id, title, description, emoji, color, position)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        listId,
        conversationId,
        userId,
        input.title,
        input.description || null,
        input.emoji || '✓',
        input.color || '#8b5cf6',
        maxPosition.max_pos + 1,
      ],
      c,
    );

    await conversationEvent(c, conversationId, 'calendar:list_created', {
      conversation_id: conversationId,
      list_id: listId,
    });

    return list;
  });
}

export async function updateTodoList(userId, listId, input) {
  return transaction(async (c) => {
    const list = await one('SELECT * FROM todo_lists WHERE id = $1 FOR UPDATE', [listId], c);

    if (!list) throw new HttpError(404, 'To-do list not found');

    await membership(userId, list.conversation_id, c);

    const updated = await one(
      `UPDATE todo_lists SET
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        emoji = COALESCE($4, emoji),
        color = COALESCE($5, color),
        updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [listId, input.title, input.description, input.emoji, input.color],
      c,
    );

    await conversationEvent(c, list.conversation_id, 'calendar:list_updated', {
      conversation_id: list.conversation_id,
      list_id: listId,
    });

    return updated;
  });
}

export async function deleteTodoList(userId, listId) {
  return transaction(async (c) => {
    const list = await one('SELECT * FROM todo_lists WHERE id = $1', [listId], c);

    if (!list) throw new HttpError(404, 'To-do list not found');

    await membership(userId, list.conversation_id, c);

    await c.query('DELETE FROM todo_lists WHERE id = $1', [listId]);

    await conversationEvent(c, list.conversation_id, 'calendar:list_deleted', {
      conversation_id: list.conversation_id,
      list_id: listId,
    });

    return { ok: true };
  });
}

export async function getTodoItems(userId, listId) {
  const list = await one('SELECT * FROM todo_lists WHERE id = $1', [listId]);

  if (!list) throw new HttpError(404, 'To-do list not found');

  await membership(userId, list.conversation_id);

  const items = (
    await db.query(
      `SELECT i.*,
        jsonb_build_object('id', u.id, 'name', u.name) AS created_by,
        CASE WHEN i.completed_by_id IS NOT NULL
          THEN jsonb_build_object('id', cu.id, 'name', cu.name)
          ELSE NULL
        END AS completed_by
       FROM todo_items i
       JOIN users u ON u.id = i.created_by_id
       LEFT JOIN users cu ON cu.id = i.completed_by_id
       WHERE i.list_id = $1
       ORDER BY i.is_completed ASC, i.position ASC, i.created_at DESC`,
      [listId],
    )
  ).rows;

  return items;
}

export async function createTodoItem(userId, listId, input) {
  return transaction(async (c) => {
    const list = await one('SELECT * FROM todo_lists WHERE id = $1', [listId], c);

    if (!list) throw new HttpError(404, 'To-do list not found');

    await membership(userId, list.conversation_id, c);

    try {
      validateTodoInput(input);
    } catch (error) {
      throw new HttpError(400, error.message);
    }

    const itemId = randomUUID();
    const maxPosition = await one(
      'SELECT COALESCE(MAX(position), -1) AS max_pos FROM todo_items WHERE list_id = $1',
      [listId],
      c,
    );

    const item = await one(
      `INSERT INTO todo_items(id, list_id, conversation_id, created_by_id, text, due_date, priority, position)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        itemId,
        listId,
        list.conversation_id,
        userId,
        input.text,
        input.due_date || null,
        input.priority || 'normal',
        maxPosition.max_pos + 1,
      ],
      c,
    );

    await conversationEvent(c, list.conversation_id, 'calendar:item_created', {
      conversation_id: list.conversation_id,
      list_id: listId,
      item_id: itemId,
    });

    return item;
  });
}

export async function updateTodoItem(userId, itemId, input) {
  return transaction(async (c) => {
    const item = await one('SELECT * FROM todo_items WHERE id = $1 FOR UPDATE', [itemId], c);

    if (!item) throw new HttpError(404, 'To-do item not found');

    await membership(userId, item.conversation_id, c);

    const updated = await one(
      `UPDATE todo_items SET
        text = COALESCE($2, text),
        due_date = COALESCE($3, due_date),
        priority = COALESCE($4, priority),
        updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [itemId, input.text, input.due_date, input.priority],
      c,
    );

    await conversationEvent(c, item.conversation_id, 'calendar:item_updated', {
      conversation_id: item.conversation_id,
      item_id: itemId,
    });

    return updated;
  });
}

export async function toggleTodoItem(userId, itemId) {
  return transaction(async (c) => {
    const item = await one('SELECT * FROM todo_items WHERE id = $1 FOR UPDATE', [itemId], c);

    if (!item) throw new HttpError(404, 'To-do item not found');

    await membership(userId, item.conversation_id, c);

    const newCompletedState = !item.is_completed;

    const updated = await one(
      `UPDATE todo_items SET
        is_completed = $2,
        completed_by_id = CASE WHEN $2 THEN $3 ELSE NULL END,
        completed_at = CASE WHEN $2 THEN now() ELSE NULL END,
        updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [itemId, newCompletedState, userId],
      c,
    );

    await conversationEvent(c, item.conversation_id, 'calendar:item_toggled', {
      conversation_id: item.conversation_id,
      item_id: itemId,
      is_completed: newCompletedState,
    });

    return updated;
  });
}

export async function deleteTodoItem(userId, itemId) {
  return transaction(async (c) => {
    const item = await one('SELECT * FROM todo_items WHERE id = $1', [itemId], c);

    if (!item) throw new HttpError(404, 'To-do item not found');

    await membership(userId, item.conversation_id, c);

    await c.query('DELETE FROM todo_items WHERE id = $1', [itemId]);

    await conversationEvent(c, item.conversation_id, 'calendar:item_deleted', {
      conversation_id: item.conversation_id,
      item_id: itemId,
    });

    return { ok: true };
  });
}

/**
 * Process event reminders
 */
export async function processEventReminders() {
  await transaction(async (c) => {
    const now = new Date();

    // Get events that need reminders sent
    const events = (
      await c.query(
        `SELECT e.*, 
          CASE 
            WHEN e.event_time IS NOT NULL THEN
              (e.event_date::timestamp + e.event_time) - make_interval(mins => e.reminder_minutes)
            ELSE
              (e.event_date::timestamp + interval '9 hours') - make_interval(mins => e.reminder_minutes)
          END AS reminder_time
         FROM calendar_events e
         WHERE e.reminder_minutes > 0
           AND e.reminder_sent_at IS NULL
           AND e.event_date >= CURRENT_DATE
         LIMIT 50`,
      )
    ).rows;

    for (const event of events) {
      if (new Date(event.reminder_time) <= now) {
        // Mark reminder as sent
        await c.query(
          'UPDATE calendar_events SET reminder_sent_at = now() WHERE id = $1',
          [event.id],
        );

        // Queue push notifications for all members
        const members = (
          await c.query(
            'SELECT user_id FROM members WHERE conversation_id = $1',
            [event.conversation_id],
          )
        ).rows;

        for (const member of members) {
          await enqueue(c, 'calendar_reminder_push', {
            event_id: event.id,
            user_id: member.user_id,
          });
        }

        // Send real-time event
        await conversationEvent(c, event.conversation_id, 'calendar:reminder', {
          conversation_id: event.conversation_id,
          event_id: event.id,
        });
      }
    }
  });
}
