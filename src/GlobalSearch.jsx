import { useEffect, useRef, useState } from 'react';
import { Search, X, Filter, Calendar, User, FileText, Image, Video, Music, ChevronDown } from 'lucide-react';
import { hasExpired } from '../shared/disappearing.js';
import { api } from './api.js';
import { Attachment, Modal } from './components.jsx';
import { stickers } from '../shared/constants.js';

export function GlobalSearch({ onClose, onOpenMessage, conversations }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters
  const [conversationFilter, setConversationFilter] = useState('');
  const [senderFilter, setSenderFilter] = useState('');
  const [mediaTypeFilter, setMediaTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const version = useRef(0);

  const performSearch = async (isLoadMore = false) => {
    if (!query.trim()) return;
    
    const currentVersion = ++version.current;
    const searchOffset = isLoadMore ? offset : 0;
    
    if (!isLoadMore) {
      setResults([]);
      setOffset(0);
    }
    
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        q: query.trim(),
        offset: searchOffset.toString(),
        media_type: mediaTypeFilter,
      });

      if (conversationFilter) params.set('conversation_id', conversationFilter);
      if (senderFilter) params.set('sender_id', senderFilter);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);

      const result = await api(`/messages/search?${params}`);
      
      if (currentVersion !== version.current) return;

      if (isLoadMore) {
        setResults(prev => [...prev, ...result.messages]);
        setOffset(searchOffset + result.messages.length);
      } else {
        setResults(result.messages);
        setOffset(result.messages.length);
      }
      
      setHasMore(result.has_more);
    } catch (e) {
      if (currentVersion === version.current) {
        setError(e.message);
      }
    } finally {
      if (currentVersion === version.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setHasMore(false);
      return;
    }

    const timer = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [query, conversationFilter, senderFilter, mediaTypeFilter, dateFrom, dateTo]);

  // Get unique senders from conversations
  const allSenders = conversations.flatMap(conv => 
    conv.is_group ? conv.members : [conv.peer]
  ).filter((sender, index, self) => 
    sender && sender.id && self.findIndex(s => s?.id === sender.id) === index
  );

  const highlightText = (text, searchQuery) => {
    if (!text || !searchQuery) return text;
    
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i}>{part}</mark> : part
    );
  };

  const getConversationName = (message) => {
    if (message.is_group) {
      return message.conversation_name || 'Group';
    }
    
    const conv = conversations.find(c => c.id === message.conversation_id);
    return conv?.peer?.name || 'Unknown';
  };

  const filteredResults = results.filter(m => !hasExpired(m));

  return (
    <Modal title="Search Messages" onClose={onClose} wide>
      <div className="global-search">
        <div className="search-header">
          <div className="search-input-wrapper">
            <Search size={18} />
            <input
              type="text"
              autoFocus
              placeholder="Search across all conversations..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={200}
              aria-label="Global search"
            />
            {query && (
              <button
                type="button"
                className="clear-search"
                onClick={() => setQuery('')}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          <button
            type="button"
            className={`filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            aria-label="Toggle filters"
          >
            <Filter size={18} />
            Filters
            <ChevronDown size={16} className={showFilters ? 'rotated' : ''} />
          </button>
        </div>

        {showFilters && (
          <div className="search-filters">
            <div className="filter-row">
              <label>
                <User size={16} />
                Sender
                <select
                  value={senderFilter}
                  onChange={(e) => setSenderFilter(e.target.value)}
                >
                  <option value="">All senders</option>
                  {allSenders.map(sender => (
                    <option key={sender.id} value={sender.id}>
                      {sender.name} (@{sender.handle})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <FileText size={16} />
                Conversation
                <select
                  value={conversationFilter}
                  onChange={(e) => setConversationFilter(e.target.value)}
                >
                  <option value="">All conversations</option>
                  {conversations.map(conv => (
                    <option key={conv.id} value={conv.id}>
                      {conv.is_group ? conv.name : conv.peer?.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="filter-row">
              <label>
                <Image size={16} />
                Media Type
                <select
                  value={mediaTypeFilter}
                  onChange={(e) => setMediaTypeFilter(e.target.value)}
                >
                  <option value="all">All messages</option>
                  <option value="photos">Photos</option>
                  <option value="videos">Videos</option>
                  <option value="audio">Audio</option>
                  <option value="documents">Documents</option>
                </select>
              </label>

              <label>
                <Calendar size={16} />
                Date From
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </label>

              <label>
                <Calendar size={16} />
                Date To
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </label>
            </div>

            {(conversationFilter || senderFilter || mediaTypeFilter !== 'all' || dateFrom || dateTo) && (
              <button
                type="button"
                className="clear-filters"
                onClick={() => {
                  setConversationFilter('');
                  setSenderFilter('');
                  setMediaTypeFilter('all');
                  setDateFrom('');
                  setDateTo('');
                }}
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        <div className="search-results" aria-busy={loading}>
          {!query.trim() && (
            <div className="search-empty">
              <Search size={48} />
              <p>Search for messages across all your conversations</p>
              <small>Try searching for keywords, file names, or phrases</small>
            </div>
          )}

          {query.trim() && !loading && !error && filteredResults.length === 0 && (
            <div className="search-empty">
              <p>No messages found matching "{query}"</p>
              <small>Try different keywords or adjust your filters</small>
            </div>
          )}

          {error && (
            <div className="search-error" role="alert">
              <p>{error}</p>
            </div>
          )}

          {filteredResults.map((message) => (
            <div
              key={message.id}
              className="search-result-item"
              onClick={() => onOpenMessage(message)}
              role="button"
              tabIndex={0}
            >
              <div className="result-header">
                <span className="result-conversation">
                  {getConversationName(message)}
                </span>
                <span className="result-date">
                  {new Date(message.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="result-sender">
                <strong>{message.sender.name}</strong>
                <span className="result-time">
                  {new Date(message.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {message.text && (
                <p className="result-text" dir="auto">
                  {highlightText(message.text, query.trim())}
                </p>
              )}

              {message.translation?.status === 'ready' &&
                message.translation.text !== message.text && (
                  <p className="result-translation" dir="auto">
                    {highlightText(message.translation.text, query.trim())}
                  </p>
                )}

              {message.sticker && (
                <div className="result-sticker">{stickers[message.sticker]}</div>
              )}

              {message.attachment && (
                <div className="result-attachment">
                  <small>
                    {highlightText(message.attachment.name, query.trim())}
                  </small>
                  <Attachment
                    attachment={message.attachment}
                    onError={() => {}}
                  />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="search-loading" role="status">
              Searching...
            </div>
          )}

          {hasMore && !loading && (
            <button
              type="button"
              className="load-more"
              onClick={() => performSearch(true)}
            >
              Load more results
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
