import { useState, useEffect } from 'react';
import { BarChart3, Plus, X, Send, Check, Users, Clock } from 'lucide-react';
import { api } from './api.js';
import { Modal, ButtonIcon } from './components.jsx';

/**
 * Poll Creation Modal
 * Create polls with multiple/single choice, anonymous voting
 */
export function CreatePollModal({ conversationId, onClose, onPollCreated }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [multipleChoice, setMultipleChoice] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [endsAt, setEndsAt] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCreate = async () => {
    // Validation
    if (!question.trim()) {
      setError('Please enter a question');
      return;
    }

    const validOptions = options.filter((opt) => opt.trim());
    if (validOptions.length < 2) {
      setError('Please provide at least 2 options');
      return;
    }

    try {
      setCreating(true);
      setError('');

      const result = await api(`/conversations/${conversationId}/polls`, {
        method: 'POST',
        body: {
          question: question.trim(),
          options: validOptions,
          multiple_choice: multipleChoice,
          anonymous: anonymous,
          ends_at: endsAt || null,
        },
      });

      onPollCreated(result);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal title="Create Poll" onClose={onClose} wide>
      <div className="poll-creation-modal">
        <div className="poll-question-input">
          <label>
            Poll Question
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What's your favorite food? (ഏറ്റവും ഇഷ്ടപ്പെട്ട ഭക്ഷണം?)"
              maxLength={200}
              autoFocus
            />
          </label>
        </div>

        <div className="poll-options">
          <label>Options (അഭിപ്രായങ്ങൾ)</label>
          {options.map((option, index) => (
            <div key={index} className="poll-option-input">
              <input
                type="text"
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                maxLength={100}
              />
              {options.length > 2 && (
                <button
                  type="button"
                  className="btn-icon-small"
                  onClick={() => removeOption(index)}
                  title="Remove option"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
          {options.length < 10 && (
            <button type="button" className="add-option-btn" onClick={addOption}>
              <Plus size={16} />
              Add Option
            </button>
          )}
        </div>

        <div className="poll-settings">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={multipleChoice}
              onChange={(e) => setMultipleChoice(e.target.checked)}
            />
            <span>
              <Check size={16} />
              Allow multiple answers
            </span>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
            />
            <span>
              <Users size={16} />
              Anonymous voting (hide who voted)
            </span>
          </label>

          <label>
            <Clock size={16} />
            Poll ends at (optional)
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </label>
        </div>

        {error && (
          <div className="poll-error" role="alert">
            {error}
          </div>
        )}

        <div className="modal-actions">
          <button type="button" onClick={onClose} disabled={creating}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleCreate}
            disabled={creating || !question.trim() || options.filter((o) => o.trim()).length < 2}
          >
            {creating ? (
              'Creating...'
            ) : (
              <>
                <Send size={18} />
                Create Poll
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Poll Display Component
 * Shows poll with results and voting
 */
export function PollMessage({ poll, currentUserId, onVote }) {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [voting, setVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    // Check if user has already voted
    if (poll.user_votes && poll.user_votes.includes(currentUserId)) {
      setHasVoted(true);
    }
  }, [poll, currentUserId]);

  const totalVotes = poll.results ? poll.results.reduce((sum, r) => sum + r.count, 0) : 0;
  const isEnded = poll.ends_at && new Date(poll.ends_at) < new Date();
  const canVote = !hasVoted && !isEnded;

  const handleVote = async () => {
    if (selectedOptions.length === 0) return;

    try {
      setVoting(true);
      await api(`/polls/${poll.id}/vote`, {
        method: 'POST',
        body: {
          option_indices: selectedOptions,
        },
      });

      setHasVoted(true);
      if (onVote) onVote(poll.id, selectedOptions);
    } catch (e) {
      alert('Failed to vote: ' + e.message);
    } finally {
      setVoting(false);
    }
  };

  const toggleOption = (index) => {
    if (poll.multiple_choice) {
      setSelectedOptions((prev) =>
        prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
      );
    } else {
      setSelectedOptions([index]);
    }
  };

  return (
    <div className="poll-message">
      <div className="poll-header">
        <BarChart3 size={20} />
        <span className="poll-label">Poll</span>
        {isEnded && <span className="poll-ended-badge">Ended</span>}
      </div>

      <h3 className="poll-question" dir="auto">
        {poll.question}
      </h3>

      <div className="poll-options-list">
        {poll.options.map((option, index) => {
          const result = poll.results?.find((r) => r.option_index === index);
          const voteCount = result?.count || 0;
          const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
          const isSelected = selectedOptions.includes(index);

          return (
            <div
              key={index}
              className={`poll-option ${canVote ? 'clickable' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={canVote ? () => toggleOption(index) : undefined}
            >
              <div className="poll-option-content">
                {canVote && (
                  <div className="poll-option-checkbox">
                    {poll.multiple_choice ? (
                      <input type="checkbox" checked={isSelected} readOnly />
                    ) : (
                      <input type="radio" checked={isSelected} readOnly />
                    )}
                  </div>
                )}

                <span className="poll-option-text" dir="auto">
                  {option}
                </span>

                {hasVoted && (
                  <span className="poll-option-votes">
                    {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
                  </span>
                )}
              </div>

              {hasVoted && (
                <div className="poll-option-bar">
                  <div className="poll-option-fill" style={{ width: `${percentage}%` }} />
                  <span className="poll-option-percentage">{percentage.toFixed(0)}%</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {canVote && (
        <button
          className="poll-vote-btn"
          onClick={handleVote}
          disabled={voting || selectedOptions.length === 0}
        >
          {voting ? 'Voting...' : `Vote (${selectedOptions.length} selected)`}
        </button>
      )}

      <div className="poll-footer">
        <span className="poll-total-votes">
          <Users size={14} />
          {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
        </span>
        {poll.anonymous && <span className="poll-anonymous-badge">Anonymous</span>}
        {poll.ends_at && !isEnded && (
          <span className="poll-ends-at">
            <Clock size={14} />
            Ends {new Date(poll.ends_at).toLocaleString()}
          </span>
        )}
      </div>

      {!poll.anonymous && hasVoted && poll.voters && (
        <details className="poll-voters">
          <summary>View voters ({poll.voters.length})</summary>
          <div className="poll-voters-list">
            {poll.voters.map((voter) => (
              <div key={voter.user_id} className="poll-voter">
                <span>{voter.user_name}</span>
                <span className="poll-voter-choices">
                  {voter.options.map((opt) => poll.options[opt]).join(', ')}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

/**
 * End Poll Action
 */
export async function endPoll(pollId) {
  await api(`/polls/${pollId}/end`, { method: 'POST' });
}

/**
 * Delete Poll
 */
export async function deletePoll(pollId) {
  await api(`/polls/${pollId}`, { method: 'DELETE' });
}

export default CreatePollModal;
