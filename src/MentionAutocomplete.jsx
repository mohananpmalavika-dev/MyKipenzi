import { useState, useEffect, useRef } from 'react';
import { AtSign } from 'lucide-react';
import { Avatar } from './components.jsx';

/**
 * Mention Autocomplete Component
 * Detects @ symbol in text input and shows member suggestions
 */
export function MentionAutocomplete({
  text,
  cursorPosition,
  members,
  onSelect,
  inputRef,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [mentionQuery, setMentionQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const suggestionRef = useRef(null);

  useEffect(() => {
    // Find @ mentions in text before cursor
    const textBeforeCursor = text.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex === -1) {
      setSuggestions([]);
      setShowAll(false);
      return;
    }

    const afterAt = textBeforeCursor.slice(lastAtIndex + 1);
    
    // Check if there's a space after @ (means mention is complete)
    if (afterAt.includes(' ')) {
      setSuggestions([]);
      setShowAll(false);
      return;
    }

    // Check if @ is at word boundary
    const beforeAt = textBeforeCursor.slice(0, lastAtIndex);
    if (beforeAt.length > 0 && !/[\s\n]$/.test(beforeAt)) {
      setSuggestions([]);
      setShowAll(false);
      return;
    }

    const query = afterAt.toLowerCase();
    setMentionQuery(query);

    // Special case: @all or @everyone
    if (query === 'all' || query === 'everyone' || query === '') {
      const allOption = {
        id: 'all',
        name: 'Everyone',
        handle: 'all',
        isSpecial: true,
      };
      const filteredMembers = members.filter(m =>
        m.name.toLowerCase().includes(query) ||
        m.handle.toLowerCase().includes(query)
      );
      setSuggestions([allOption, ...filteredMembers]);
      setShowAll(true);
    } else {
      // Filter members by name or handle
      const filtered = members.filter(m =>
        m.name.toLowerCase().includes(query) ||
        m.handle.toLowerCase().includes(query)
      );
      setSuggestions(filtered);
      setShowAll(false);
    }

    setSelectedIndex(0);

    // Calculate position for suggestion box
    if (inputRef.current) {
      const coords = getCaretCoordinates(inputRef.current, lastAtIndex);
      setPosition({
        top: coords.top - inputRef.current.scrollTop,
        left: coords.left - inputRef.current.scrollLeft,
      });
    }
  }, [text, cursorPosition, members, inputRef]);

  const handleSelect = (member) => {
    const textBeforeCursor = text.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex === -1) return;

    const beforeMention = text.slice(0, lastAtIndex);
    const afterCursor = text.slice(cursorPosition);
    const mentionText = member.isSpecial ? '@all' : `@${member.handle}`;
    
    const newText = beforeMention + mentionText + ' ' + afterCursor;
    const newCursorPos = beforeMention.length + mentionText.length + 1;

    onSelect(newText, newCursorPos, {
      type: member.isSpecial ? 'all' : 'user',
      id: member.id,
      name: member.name,
      handle: member.handle,
    });

    setSuggestions([]);
  };

  const handleKeyDown = (e) => {
    if (suggestions.length === 0) return false;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        return true;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return true;
      case 'Enter':
      case 'Tab':
        if (suggestions.length > 0) {
          e.preventDefault();
          handleSelect(suggestions[selectedIndex]);
          return true;
        }
        return false;
      case 'Escape':
        setSuggestions([]);
        return true;
      default:
        return false;
    }
  };

  // Expose keyboard handler to parent
  useEffect(() => {
    if (inputRef.current) {
      const input = inputRef.current;
      input.mentionKeyHandler = handleKeyDown;
      return () => {
        delete input.mentionKeyHandler;
      };
    }
  }, [handleKeyDown, suggestions, selectedIndex]);

  if (suggestions.length === 0) return null;

  return (
    <div
      ref={suggestionRef}
      className="mention-autocomplete"
      style={{
        bottom: '100%',
        left: `${Math.min(position.left, 300)}px`,
        marginBottom: '8px',
      }}
    >
      <div className="mention-list">
        {suggestions.map((member, index) => (
          <div
            key={member.id}
            className={`mention-item ${index === selectedIndex ? 'selected' : ''}`}
            onClick={() => handleSelect(member)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            {member.isSpecial ? (
              <div className="mention-special-avatar">
                <AtSign size={24} />
              </div>
            ) : (
              <Avatar
                src={
                  member.avatar_id
                    ? `/api/attachments/${member.avatar_id}/content`
                    : null
                }
                name={member.name}
                size={32}
              />
            )}
            <div className="mention-info">
              <span className="mention-name">{member.name}</span>
              <span className="mention-handle">@{member.handle}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mention-hint">
        <small>↑↓ Navigate • Enter/Tab Select • Esc Cancel</small>
      </div>
    </div>
  );
}

/**
 * Get caret coordinates for positioning autocomplete
 */
function getCaretCoordinates(element, position) {
  const div = document.createElement('div');
  const style = getComputedStyle(element);
  
  // Copy all relevant styles
  [...style].forEach(prop => {
    div.style[prop] = style[prop];
  });

  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre-wrap';
  div.style.wordWrap = 'break-word';
  div.style.top = '0';
  div.style.left = '0';

  document.body.appendChild(div);

  const text = element.value.substring(0, position);
  div.textContent = text;

  const span = document.createElement('span');
  span.textContent = element.value.substring(position) || '.';
  div.appendChild(span);

  const coordinates = {
    top: span.offsetTop,
    left: span.offsetLeft,
  };

  document.body.removeChild(div);
  return coordinates;
}

/**
 * Extract mentions from text
 */
export function extractMentions(text) {
  const mentions = [];
  const regex = /@(\w+)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    mentions.push({
      handle: match[1],
      position: match.index,
      length: match[0].length,
    });
  }

  return mentions;
}

/**
 * Highlight mentions in text for display
 */
export function highlightMentions(text, currentUserId) {
  const regex = /@(\w+)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    // Add mention
    const handle = match[1];
    parts.push({
      type: 'mention',
      content: match[0],
      handle: handle,
      isAll: handle === 'all' || handle === 'everyone',
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return parts;
}

/**
 * MentionText component - Renders text with highlighted mentions
 */
export function MentionText({ text, members = [], currentUserId }) {
  const parts = highlightMentions(text, currentUserId);

  return (
    <>
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return <span key={index}>{part.content}</span>;
        }

        if (part.isAll) {
          return (
            <span key={index} className="mention mention-all" title="Mentions everyone">
              {part.content}
            </span>
          );
        }

        const member = members.find(m => m.handle === part.handle);
        return (
          <span
            key={index}
            className={`mention ${member?.id === currentUserId ? 'mention-me' : ''}`}
            title={member ? member.name : part.handle}
          >
            {part.content}
          </span>
        );
      })}
    </>
  );
}
