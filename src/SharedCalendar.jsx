import { useCallback, useEffect, useState } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Bell,
  Repeat,
  Heart,
  CheckCircle,
  Circle,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { ButtonIcon, Modal } from './components.jsx';
import { api } from './api.js';
import {
  EVENT_CATEGORIES,
  REMINDER_OPTIONS,
  RECURRENCE_PATTERNS,
  TODO_PRIORITIES,
  calculateCountdown,
  formatEventDate,
} from '../shared/calendar.js';
import { triggerHeartbeatHaptics } from './heartbeatAudio.js';

export function SharedCalendar({
  conversationId,
  user,
  peer,
  socket,
  onClose,
  onError,
}) {
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar' | 'todos'
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [todoLists, setTodoLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showTodoModal, setShowTodoModal] = useState(false);
  const [editingTodoList, setEditingTodoList] = useState(null);
  const [selectedList, setSelectedList] = useState(null);

  // Load calendar events for current month
  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      const startStr = formatDateKey(startDate);
      const endStr = formatDateKey(endDate);
      
      const data = await api(
        `/conversations/${conversationId}/calendar/events?start_date=${startStr}&end_date=${endStr}`,
      );
      setEvents(data || []);
    } catch (err) {
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  }, [conversationId, currentMonth, onError]);

  // Load to-do lists
  const loadTodoLists = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api(`/conversations/${conversationId}/calendar/todos`);
      setTodoLists(data || []);
    } catch (err) {
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  }, [conversationId, onError]);

  useEffect(() => {
    if (activeTab === 'calendar') {
      void loadEvents();
    } else {
      void loadTodoLists();
    }
  }, [activeTab, loadEvents, loadTodoLists]);

  // Real-time socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleCalendarUpdate = (payload) => {
      if (payload.conversation_id === conversationId) {
        if (activeTab === 'calendar') {
          void loadEvents();
        } else {
          void loadTodoLists();
        }
        triggerHeartbeatHaptics([40, 50]);
      }
    };

    socket.on('calendar:event_created', handleCalendarUpdate);
    socket.on('calendar:event_updated', handleCalendarUpdate);
    socket.on('calendar:event_deleted', handleCalendarUpdate);
    socket.on('calendar:event_response', handleCalendarUpdate);
    socket.on('calendar:list_created', handleCalendarUpdate);
    socket.on('calendar:list_updated', handleCalendarUpdate);
    socket.on('calendar:list_deleted', handleCalendarUpdate);
    socket.on('calendar:item_created', handleCalendarUpdate);
    socket.on('calendar:item_updated', handleCalendarUpdate);
    socket.on('calendar:item_toggled', handleCalendarUpdate);
    socket.on('calendar:item_deleted', handleCalendarUpdate);
    socket.on('calendar:reminder', handleCalendarUpdate);

    return () => {
      socket.off('calendar:event_created', handleCalendarUpdate);
      socket.off('calendar:event_updated', handleCalendarUpdate);
      socket.off('calendar:event_deleted', handleCalendarUpdate);
      socket.off('calendar:event_response', handleCalendarUpdate);
      socket.off('calendar:list_created', handleCalendarUpdate);
      socket.off('calendar:list_updated', handleCalendarUpdate);
      socket.off('calendar:list_deleted', handleCalendarUpdate);
      socket.off('calendar:item_created', handleCalendarUpdate);
      socket.off('calendar:item_updated', handleCalendarUpdate);
      socket.off('calendar:item_toggled', handleCalendarUpdate);
      socket.off('calendar:item_deleted', handleCalendarUpdate);
      socket.off('calendar:reminder', handleCalendarUpdate);
    };
  }, [socket, conversationId, activeTab, loadEvents, loadTodoLists]);

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const formatDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="daily-prompt-backdrop" onClick={onClose}>
      <div
        className="calendar-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-title"
      >
        {/* Modal Header */}
        <header className="calendar-modal-header">
          <div className="calendar-header-left">
            <span className="calendar-header-badge">
              <CalendarIcon size={16} />
              <span>Our Shared Calendar · നമ്മുടെ കലണ്ടർ</span>
            </span>
            <div className="calendar-tabs">
              <button
                type="button"
                className={`calendar-tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
                onClick={() => setActiveTab('calendar')}
              >
                <CalendarIcon size={14} />
                <span>Calendar</span>
              </button>
              <button
                type="button"
                className={`calendar-tab-btn ${activeTab === 'todos' ? 'active' : ''}`}
                onClick={() => setActiveTab('todos')}
              >
                <CheckCircle size={14} />
                <span>To-Do Lists</span>
              </button>
            </div>
          </div>
          <ButtonIcon label="Close modal" onClick={onClose} className="calendar-close-btn">
            <X size={19} />
          </ButtonIcon>
        </header>

        {/* Calendar View */}
        {activeTab === 'calendar' && (
          <CalendarView
            currentMonth={currentMonth}
            events={events}
            loading={loading}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
            onAddEvent={() => {
              setEditingEvent(null);
              setShowEventModal(true);
            }}
            onEditEvent={(event) => {
              setEditingEvent(event);
              setShowEventModal(true);
            }}
            onError={onError}
            conversationId={conversationId}
            user={user}
            peer={peer}
          />
        )}

        {/* To-Do Lists View */}
        {activeTab === 'todos' && (
          <TodoListsView
            lists={todoLists}
            loading={loading}
            onAddList={() => {
              setEditingTodoList(null);
              setShowTodoModal(true);
            }}
            onEditList={(list) => {
              setEditingTodoList(list);
              setShowTodoModal(true);
            }}
            onSelectList={setSelectedList}
            selectedList={selectedList}
            onError={onError}
            conversationId={conversationId}
            user={user}
            reload={loadTodoLists}
          />
        )}

        {/* Event Modal */}
        {showEventModal && (
          <EventModal
            event={editingEvent}
            conversationId={conversationId}
            onClose={() => {
              setShowEventModal(false);
              setEditingEvent(null);
            }}
            onSave={() => {
              setShowEventModal(false);
              setEditingEvent(null);
              void loadEvents();
            }}
            onError={onError}
          />
        )}

        {/* To-Do List Modal */}
        {showTodoModal && (
          <TodoListModal
            list={editingTodoList}
            conversationId={conversationId}
            onClose={() => {
              setShowTodoModal(false);
              setEditingTodoList(null);
            }}
            onSave={() => {
              setShowTodoModal(false);
              setEditingTodoList(null);
              void loadTodoLists();
            }}
            onError={onError}
          />
        )}
      </div>
    </div>
  );
}

// Calendar View Component
function CalendarView({
  currentMonth,
  events,
  loading,
  onPrevMonth,
  onNextMonth,
  onAddEvent,
  onEditEvent,
  onError,
  conversationId,
  user,
  peer,
}) {
  const monthName = currentMonth.toLocaleDateString('en', { month: 'long', year: 'numeric' });
  
  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0,
  ).getDate();
  
  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1,
  ).getDay();

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const getEventsForDay = (day) => {
    if (!day) return [];
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((e) => e.event_date === dateStr);
  };

  const today = new Date();
  const isToday = (day) => {
    return (
      day &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear() &&
      day === today.getDate()
    );
  };

  return (
    <div className="calendar-view">
      <div className="calendar-controls">
        <button type="button" onClick={onPrevMonth} className="calendar-nav-btn">
          <ChevronLeft size={20} />
        </button>
        <h3>{monthName}</h3>
        <button type="button" onClick={onNextMonth} className="calendar-nav-btn">
          <ChevronRight size={20} />
        </button>
        <button type="button" onClick={onAddEvent} className="calendar-add-btn">
          <Plus size={16} />
          <span>Add Event</span>
        </button>
      </div>

      <div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="calendar-day-header">
            {day}
          </div>
        ))}
        {days.map((day, index) => (
          <div
            key={index}
            className={`calendar-day ${!day ? 'empty' : ''} ${isToday(day) ? 'today' : ''}`}
          >
            {day && (
              <>
                <span className="day-number">{day}</span>
                <div className="day-events">
                  {getEventsForDay(day).map((event) => {
                    const category = EVENT_CATEGORIES[event.category] || EVENT_CATEGORIES.other;
                    const countdown = calculateCountdown(event.event_date, event.event_time);
                    return (
                      <button
                        key={event.id}
                        type="button"
                        className="day-event-badge"
                        style={{ '--event-color': category.color }}
                        onClick={() => onEditEvent(event)}
                        title={event.title}
                      >
                        <span>{event.emoji}</span>
                        <span className="event-title-short">{event.title}</span>
                        {countdown.isToday && (
                          <span className="event-countdown">{countdown.countdownText}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {loading && (
        <div className="calendar-loading">
          <p>Loading events...</p>
        </div>
      )}
    </div>
  );
}

// Event Modal Component
function EventModal({ event, conversationId, onClose, onSave, onError }) {
  const [formData, setFormData] = useState(
    event || {
      title: '',
      description: '',
      event_date: '',
      event_time: '',
      all_day: true,
      category: 'special_date',
      emoji: '📅',
      location: '',
      is_recurring: false,
      recurrence_pattern: null,
      recurrence_end_date: '',
      reminder_minutes: 1440,
    },
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (event) {
        await api(`/conversations/${conversationId}/calendar/events/${event.id}`, {
          method: 'PATCH',
          body: formData,
        });
      } else {
        await api(`/conversations/${conversationId}/calendar/events`, {
          method: 'POST',
          body: formData,
        });
      }
      triggerHeartbeatHaptics([60, 80]);
      onSave?.();
    } catch (err) {
      onError?.(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this event?')) return;
    setDeleting(true);
    try {
      await api(`/conversations/${conversationId}/calendar/events/${event.id}`, {
        method: 'DELETE',
      });
      onSave?.();
    } catch (err) {
      onError?.(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal title={event ? 'Edit Event' : 'New Event'} onClose={onClose}>
      <form onSubmit={handleSave} className="event-form">
        <div className="form-group">
          <label htmlFor="event-title">Event Title*</label>
          <input
            id="event-title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            maxLength={200}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="event-description">Description</label>
          <textarea
            id="event-description"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            maxLength={2000}
            rows={3}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="event-date">Date*</label>
            <input
              id="event-date"
              type="date"
              value={formData.event_date}
              onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="event-time">Time</label>
            <input
              id="event-time"
              type="time"
              value={formData.event_time || ''}
              onChange={(e) => setFormData({ ...formData, event_time: e.target.value, all_day: !e.target.value })}
              disabled={formData.all_day}
            />
          </div>
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={formData.all_day}
              onChange={(e) => setFormData({ ...formData, all_day: e.target.checked, event_time: e.target.checked ? '' : formData.event_time })}
            />
            <span>All-day event</span>
          </label>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="event-category">Category</label>
            <select
              id="event-category"
              value={formData.category}
              onChange={(e) => {
                const cat = EVENT_CATEGORIES[e.target.value];
                setFormData({ ...formData, category: e.target.value, emoji: cat?.icon || '📅' });
              }}
            >
              {Object.values(EVENT_CATEGORIES).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.labelEn}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="event-emoji">Emoji</label>
            <input
              id="event-emoji"
              type="text"
              value={formData.emoji}
              onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
              maxLength={10}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="event-location">Location</label>
          <input
            id="event-location"
            type="text"
            value={formData.location || ''}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            maxLength={500}
          />
        </div>

        <div className="form-group">
          <label htmlFor="event-reminder">Reminder</label>
          <select
            id="event-reminder"
            value={formData.reminder_minutes}
            onChange={(e) => setFormData({ ...formData, reminder_minutes: Number(e.target.value) })}
          >
            {REMINDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.labelEn}
              </option>
            ))}
          </select>
        </div>

        <div className="form-actions">
          {event && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="delete-btn"
            >
              <Trash2 size={16} />
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
          <button type="button" onClick={onClose} className="cancel-btn">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="save-btn">
            {saving ? 'Saving...' : event ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// To-Do Lists View Component
function TodoListsView({
  lists,
  loading,
  onAddList,
  onEditList,
  onSelectList,
  selectedList,
  onError,
  conversationId,
  user,
  reload,
}) {
  const [todoItems, setTodoItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    if (selectedList) {
      setLoadingItems(true);
      api(`/conversations/${conversationId}/calendar/todos/${selectedList.id}/items`)
        .then((items) => setTodoItems(items || []))
        .catch((err) => onError?.(err.message))
        .finally(() => setLoadingItems(false));
    } else {
      setTodoItems([]);
    }
  }, [selectedList, conversationId, onError]);

  return (
    <div className="todos-view">
      <div className="todos-header">
        <h3>To-Do Lists · കാര്യങ്ങൾ</h3>
        <button type="button" onClick={onAddList} className="calendar-add-btn">
          <Plus size={16} />
          <span>New List</span>
        </button>
      </div>

      <div className="todos-content">
        <div className="todos-sidebar">
          {loading ? (
            <p>Loading lists...</p>
          ) : lists.length === 0 ? (
            <p className="empty-state">No to-do lists yet</p>
          ) : (
            lists.map((list) => (
              <button
                key={list.id}
                type="button"
                className={`todo-list-item ${selectedList?.id === list.id ? 'active' : ''}`}
                onClick={() => onSelectList(list)}
              >
                <span className="list-emoji">{list.emoji}</span>
                <div className="list-info">
                  <span className="list-title">{list.title}</span>
                  <span className="list-stats">
                    {list.active_count} active · {list.completed_count} done
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="todos-main">
          {selectedList ? (
            <TodoItemsPanel
              list={selectedList}
              items={todoItems}
              loading={loadingItems}
              onError={onError}
              conversationId={conversationId}
              user={user}
              reload={() => {
                reload();
                onSelectList(selectedList);
              }}
            />
          ) : (
            <div className="empty-state-large">
              <CheckCircle size={48} />
              <p>Select a to-do list to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// To-Do Items Panel Component
function TodoItemsPanel({ list, items, loading, onError, conversationId, user, reload }) {
  const [newItemText, setNewItemText] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemText.trim()) return;
    
    setAdding(true);
    try {
      await api(`/conversations/${conversationId}/calendar/todos/${list.id}/items`, {
        method: 'POST',
        body: { text: newItemText, priority: 'normal' },
      });
      setNewItemText('');
      triggerHeartbeatHaptics([50, 60]);
      reload();
    } catch (err) {
      onError?.(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleToggleItem = async (itemId) => {
    try {
      await api(`/conversations/${conversationId}/calendar/todos/${list.id}/items/${itemId}/toggle`, {
        method: 'POST',
      });
      triggerHeartbeatHaptics([40]);
      reload();
    } catch (err) {
      onError?.(err.message);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Delete this item?')) return;
    try {
      await api(`/conversations/${conversationId}/calendar/todos/${list.id}/items/${itemId}`, {
        method: 'DELETE',
      });
      reload();
    } catch (err) {
      onError?.(err.message);
    }
  };

  const activeItems = items.filter((item) => !item.is_completed);
  const completedItems = items.filter((item) => item.is_completed);

  return (
    <div className="todo-items-panel">
      <div className="todo-items-header">
        <h4>{list.emoji} {list.title}</h4>
        {list.description && <p className="list-description">{list.description}</p>}
      </div>

      <form onSubmit={handleAddItem} className="add-item-form">
        <input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          placeholder="Add a new task..."
          maxLength={500}
          disabled={adding}
        />
        <button type="submit" disabled={adding || !newItemText.trim()}>
          <Plus size={16} />
        </button>
      </form>

      {loading ? (
        <p>Loading items...</p>
      ) : (
        <div className="todo-items-list">
          {activeItems.length > 0 && (
            <div className="todo-section">
              <h5>Active ({activeItems.length})</h5>
              {activeItems.map((item) => (
                <div key={item.id} className="todo-item">
                  <button
                    type="button"
                    className="todo-checkbox"
                    onClick={() => handleToggleItem(item.id)}
                  >
                    <Circle size={20} />
                  </button>
                  <div className="todo-item-content">
                    <span className="todo-text">{item.text}</span>
                    {item.due_date && (
                      <span className="todo-due">
                        <Clock size={12} /> {item.due_date}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="todo-delete"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {completedItems.length > 0 && (
            <div className="todo-section completed">
              <h5>Completed ({completedItems.length})</h5>
              {completedItems.map((item) => (
                <div key={item.id} className="todo-item">
                  <button
                    type="button"
                    className="todo-checkbox checked"
                    onClick={() => handleToggleItem(item.id)}
                  >
                    <CheckCircle size={20} />
                  </button>
                  <div className="todo-item-content">
                    <span className="todo-text completed">{item.text}</span>
                    {item.completed_by && (
                      <span className="todo-completed-by">
                        <Check size={12} /> by {item.completed_by.name}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="todo-delete"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {items.length === 0 && (
            <div className="empty-state">
              <p>No tasks yet. Add one above!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// To-Do List Modal Component
function TodoListModal({ list, conversationId, onClose, onSave, onError }) {
  const [formData, setFormData] = useState(
    list || {
      title: '',
      description: '',
      emoji: '✓',
      color: '#8b5cf6',
    },
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (list) {
        await api(`/conversations/${conversationId}/calendar/todos/${list.id}`, {
          method: 'PATCH',
          body: formData,
        });
      } else {
        await api(`/conversations/${conversationId}/calendar/todos`, {
          method: 'POST',
          body: formData,
        });
      }
      triggerHeartbeatHaptics([60, 80]);
      onSave?.();
    } catch (err) {
      onError?.(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={list ? 'Edit List' : 'New To-Do List'} onClose={onClose}>
      <form onSubmit={handleSave} className="todo-list-form">
        <div className="form-group">
          <label htmlFor="list-title">List Title*</label>
          <input
            id="list-title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            maxLength={100}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="list-description">Description</label>
          <textarea
            id="list-description"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            maxLength={1000}
            rows={2}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="list-emoji">Emoji</label>
            <input
              id="list-emoji"
              type="text"
              value={formData.emoji}
              onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
              maxLength={10}
            />
          </div>

          <div className="form-group">
            <label htmlFor="list-color">Color</label>
            <input
              id="list-color"
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onClose} className="cancel-btn">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="save-btn">
            {saving ? 'Saving...' : list ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
