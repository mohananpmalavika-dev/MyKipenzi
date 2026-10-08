# Privacy Features Testing Checklist

## Pre-Deployment Testing

### Database Migration
- [ ] Backup production database before migration
- [ ] Run migration script on test database
- [ ] Verify new columns exist with correct constraints
- [ ] Check default values are set correctly for existing users
- [ ] Verify CHECK constraints work (try inserting invalid values)
- [ ] Test migration rollback if needed

### Backend API Testing

#### Profile Update Endpoint
- [ ] Update privacy settings via PATCH /api/profile
- [ ] Verify settings are saved to database
- [ ] Test with valid values: 'everyone', 'contacts', 'nobody'
- [ ] Test invalid values are rejected with appropriate error
- [ ] Verify response includes updated privacy settings
- [ ] Test partial updates (only one setting changed)
- [ ] Test concurrent profile updates

#### User Directory Endpoint
- [ ] Fetch user list with default privacy (everyone)
- [ ] Verify online status calculation (within 60 seconds)
- [ ] Verify last_seen timestamp formatting
- [ ] Test as non-contact viewing 'contacts' setting user
- [ ] Test as contact viewing 'contacts' setting user
- [ ] Test viewing 'nobody' setting user (should see null)
- [ ] Verify contact detection is accurate
- [ ] Test with users who have never been active (null last_seen)
- [ ] Test pagination with privacy filters
- [ ] Verify search functionality with privacy filters

#### Conversations Endpoint
- [ ] Fetch conversations list
- [ ] Verify last_seen timestamp updates for current user
- [ ] Verify peer status respects privacy settings
- [ ] Test with peers set to 'everyone' visibility
- [ ] Test with peers set to 'contacts' visibility
- [ ] Test with peers set to 'nobody' visibility
- [ ] Verify online status calculation for peers
- [ ] Test empty conversations list

#### Messages Endpoint
- [ ] Fetch messages from a conversation
- [ ] Verify last_seen timestamp updates for current user
- [ ] Test pagination with activity tracking
- [ ] Verify timestamp updates don't interfere with message loading

### Frontend Testing

#### Settings Component
- [ ] Open settings modal
- [ ] Verify privacy settings section is visible
- [ ] Check default values display correctly
- [ ] Change online_status_visibility dropdown
- [ ] Change last_seen_visibility dropdown
- [ ] Save settings
- [ ] Verify success message/feedback
- [ ] Reopen settings to confirm changes persisted
- [ ] Test all three options for each setting
- [ ] Test saving with no changes
- [ ] Test with slow network (loading states)
- [ ] Test error handling (network failure)

#### User Directory Component
- [ ] Open user directory
- [ ] Verify online users show green "● online"
- [ ] Verify offline users show "last seen X ago"
- [ ] Verify hidden status shows no indicator
- [ ] Test time formatting for various intervals:
  - [ ] Just now (< 1 minute)
  - [ ] Minutes ago (1-59 minutes)
  - [ ] Hours ago (1-23 hours)
  - [ ] Yesterday
  - [ ] Days ago (2-6 days)
  - [ ] Date for 7+ days
- [ ] Test search with status indicators
- [ ] Test load more with status indicators
- [ ] Verify status respects viewer's contact relationship

#### Conversations List
- [ ] View conversations list
- [ ] Verify online contacts show green dot
- [ ] Verify last seen appears below language
- [ ] Verify no indicator for hidden status
- [ ] Test with multiple conversations (mixed statuses)
- [ ] Test sorting doesn't break status display
- [ ] Test unread badge doesn't interfere with status
- [ ] Verify status updates when peer comes online/offline

#### Chat Header
- [ ] Open a conversation
- [ ] Verify "online" shows for active peer
- [ ] Verify "last seen X ago" shows for inactive peer
- [ ] Verify no status shows when privacy restricts
- [ ] Test status updates in real-time (if peer goes online)
- [ ] Verify mobile layout with status text

### Privacy Logic Testing

#### Everyone Setting
- [ ] User A sets status to 'everyone'
- [ ] User B (non-contact) can see A's status
- [ ] User C (contact) can see A's status
- [ ] Verify in user directory
- [ ] Verify in conversations list
- [ ] Verify in chat header

#### Contacts Setting
- [ ] User A sets status to 'contacts'
- [ ] User B (non-contact) cannot see A's status (null)
- [ ] User C (contact) can see A's status
- [ ] Verify in user directory
- [ ] Verify in conversations list
- [ ] Verify in chat header
- [ ] Test edge case: new conversation creation

#### Nobody Setting
- [ ] User A sets status to 'nobody'
- [ ] User B (non-contact) cannot see A's status (null)
- [ ] User C (contact) cannot see A's status (null)
- [ ] Verify in user directory
- [ ] Verify in conversations list
- [ ] Verify in chat header
- [ ] Verify A can still send/receive messages normally

### Edge Cases

#### Null/Missing Data
- [ ] User with null last_seen (never been active)
- [ ] User with very old last_seen (years ago)
- [ ] Database query timeout scenarios
- [ ] Missing avatar_id with status display

#### Contact Relationship
- [ ] Two users with no conversation (non-contacts)
- [ ] Users who deleted then recreated conversation
- [ ] One-way conversation initiation (before other user responds)
- [ ] Multiple conversations between same users (shouldn't happen but test)

#### Time Calculations
- [ ] User active exactly 60 seconds ago (boundary test)
- [ ] User active 59 seconds ago (should be online)
- [ ] User active 61 seconds ago (should be offline)
- [ ] System clock skew handling
- [ ] Different timezones
- [ ] DST transitions

#### Real-time Updates
- [ ] User A is viewing directory while User B comes online
- [ ] Status updates reflected via WebSocket (if implemented)
- [ ] Multiple tabs open (status consistency)
- [ ] Long-lived sessions (status doesn't stale)

### Performance Testing

#### Database Queries
- [ ] Profile: Measure query time for large user base
- [ ] Verify indices are used effectively
- [ ] Test with 1000+ conversations
- [ ] Test with 10,000+ users in directory
- [ ] Verify N+1 query problems don't exist
- [ ] Check query execution plans

#### Frontend Performance
- [ ] Large conversations list (100+) renders smoothly
- [ ] User directory with 1000+ users scrolls smoothly
- [ ] Time formatting doesn't cause jank
- [ ] Status updates don't trigger unnecessary re-renders
- [ ] Memory leaks with status polling (if implemented)

### Security Testing

#### Privacy Bypass Attempts
- [ ] Try to see hidden status via API manipulation
- [ ] Verify server-side filtering (not just client-side)
- [ ] Test SQL injection in privacy settings
- [ ] Test XSS in status display
- [ ] Verify JWT/session auth on privacy endpoints
- [ ] Test CSRF protection on settings update

#### Data Leakage
- [ ] Inspect network requests for unauthorized data
- [ ] Verify null values returned (not false/0)
- [ ] Check browser console for leaked data
- [ ] Verify WebSocket messages respect privacy
- [ ] Test error messages don't leak status info

### Cross-Browser Testing
- [ ] Chrome/Edge (desktop)
- [ ] Firefox (desktop)
- [ ] Safari (desktop)
- [ ] Mobile Safari (iOS)
- [ ] Chrome (Android)
- [ ] Test responsive layouts with status

### Accessibility Testing
- [ ] Screen reader announces status correctly
- [ ] Status colors have sufficient contrast
- [ ] Keyboard navigation works with new elements
- [ ] Focus indicators visible
- [ ] ARIA labels accurate

### Regression Testing
- [ ] Existing features still work:
  - [ ] User registration
  - [ ] Login/logout
  - [ ] Sending messages
  - [ ] Voice/video calls
  - [ ] File uploads
  - [ ] Profile updates (other fields)
  - [ ] Language settings
  - [ ] Push notifications
  - [ ] Message translation

## Post-Deployment Monitoring

### Metrics to Track
- [ ] Profile update API success rate
- [ ] Average response time for /api/users
- [ ] Database query performance for privacy-filtered queries
- [ ] Frontend error rates (status rendering)
- [ ] User adoption of privacy features (analytics)

### Common Issues to Watch For
- [ ] Users confused by privacy options
- [ ] Performance degradation with privacy queries
- [ ] Status not updating in real-time
- [ ] Timezone-related bugs in time formatting
- [ ] Mobile layout issues with status text

### Rollback Plan
If critical issues found:
1. Document the issue clearly
2. Assess impact (blocking vs. non-blocking)
3. Quick fix possible? Apply hotfix
4. Not fixable quickly? Roll back database migration
5. Revert backend and frontend code
6. Monitor for stability
7. Communicate to users

## Sign-off

- [ ] All critical tests pass
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Documentation complete
- [ ] Team trained on new feature
- [ ] User communication prepared
- [ ] Rollback plan documented

**Tested by:** ________________  
**Date:** ________________  
**Approved for deployment:** ☐ Yes ☐ No
