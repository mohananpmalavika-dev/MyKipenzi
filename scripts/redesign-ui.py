from pathlib import Path

path = Path('src/App.jsx')
s = path.read_text(encoding='utf-8')
s = s.replace("import { io }", "import { FeatureDirectory, FriendshipDock, TogetherExplorer } from './FriendshipSpace.jsx';\nimport { io }")
s = s.replace('  Ticket,\n', '  Ticket,\n  Users,\n  LayoutGrid,\n')
s = s.replace("    [search, setSearch] = useState(''),", "    [search, setSearch] = useState(''),\n    [chatFilter, setChatFilter] = useState('All'),\n    [showTogether, setShowTogether] = useState(false),")
s = s.replace("`${c.peer.name} ${c.peer.handle}`.toLowerCase().includes(search.toLowerCase()),", "`${c.peer.name} ${c.peer.handle}`.toLowerCase().includes(search.toLowerCase()) &&\n      (chatFilter === 'All' || (chatFilter === 'Unread' ? c.unread > 0 : c.is_group)),")
marker = '    callPeer = conversations.find((c) => c.id === call.call?.conversation_id)?.peer;'
actions = '''
  const unavailable = !chosen ? 'Choose a conversation to begin' : chosen.contact_blocked ? 'Unavailable while this contact is blocked' : chosen.is_group ? 'Available in one-to-one friendships' : !connected ? 'Reconnect to start this activity' : sending || recording ? 'Finish your message first' : '';
  const activity = (id, title, description, icon, category, tone, onClick, live = true) => ({
    id, title, description, icon, category, tone, onClick,
    disabled: live ? Boolean(unavailable) : !chosen,
    reason: live ? unavailable : 'Choose a conversation to begin',
  });
  const friendshipActions = [
    activity('prompt', 'Daily check-in', 'One question. A little closer.', Sparkles, 'Show up', 'coral', () => { setShowDailyPrompt(true); setDailyPromptInvite(null); }),
    activity('music', 'Listen together', 'Your songs, in the same moment.', Headphones, 'Hang out', 'plum', () => { setShowMusicModal(true); setIsMusicMinimized(false); setMusicInvite(null); const track = musicEngine.currentTrack; socket?.emit('music:invite', { conversation_id: selected, track: { id: track.id, titleMl: track.titleMl, titleEn: track.titleEn } }); }),
    activity('games', 'Game night', 'Trivia, laughs, and friendly rivalry.', Gamepad2, 'Hang out', 'mint', () => { setShowCoupleGames(true); setCoupleGamesInvite(null); socket?.emit('couple_game:invite', { conversation_id: selected }); }),
    activity('watch', 'Watch party', 'Press play and watch side by side.', Film, 'Hang out', 'coral', () => { setShowWatchPartyModal(true); setIsWatchPartyMinimized(false); setWatchPartyInvite(null); const video = watchPartyVideo || CURATED_VIDEOS[0]; socket?.emit('video:invite', { conversation_id: selected, video: { id: video.id, youtubeId: video.youtubeId, titleMl: video.titleMl, titleEn: video.titleEn, thumbnail: video.thumbnail } }); }),
    activity('doodle', 'Doodle together', 'Make a wonderfully messy masterpiece.', Palette, 'Hang out', 'gold', () => { setShowDoodle(true); setDoodleInvite(null); socket?.emit('doodle:invite', { conversation_id: selected }); }),
    activity('duet', 'Voice duet', 'Two voices. One shared soundtrack.', Music, 'Hang out', 'plum', () => { setDuetPartnerAudioUrl(null); setShowVoiceDuet(true); }),
    activity('vault', 'Memory scrapbook', 'Keep the moments worth coming back to.', Camera, 'Make memories', 'gold', () => setShowMediaVault(true), false),
    activity('story', 'Our story', 'Milestones in your friendship journey.', HeartHandshake, 'Make memories', 'coral', () => { setShowStory(true); setStoryInvite(null); }),
    activity('capsule', 'Time capsule', 'A little surprise for your future selves.', Gift, 'Make memories', 'plum', () => { setShowTimeCapsule(true); setSelectedCapsuleId(null); setTimeCapsuleInvite(null); }),
    activity('recap', 'Month in review', 'Turn your shared moments into a story.', Film, 'Make memories', 'mint', () => { setSelectedRecapMonth(null); setShowMonthlyRecap(true); }),
    activity('hug', 'Send a hug', 'A small touch to say “I’m here.”', Hand, 'Show up', 'coral', () => { setShowVirtualTouch(true); setVirtualTouchInvite(null); socket?.emit('touch:invite', { conversation_id: selected, touch_mode: 'gentle' }); }),
    activity('heartbeat', 'Live heartbeat', 'Feel a little closer, wherever you are.', Heart, 'Show up', 'coral', () => { setShowHeartbeat(true); setHeartbeatInvite(null); socket?.emit('heartbeat:invite', { conversation_id: selected }); }),
    activity('surprises', 'Little surprises', 'Thoughtful notes and kindness coupons.', Ticket, 'Show up', 'gold', () => { setShowRomanticSurprises(true); setRomanticInvite(null); socket?.emit('romantic:invite', { conversation_id: selected }); }),
    activity('location', 'On my way', 'Share your live location and arrival time.', Navigation, 'Show up', 'mint', () => setShowLocationEta(true)),
    activity('battery', 'Battery care', 'A friendly reminder to stay charged.', Battery, 'Show up', 'mint', () => setShowBatteryModal(true)),
    activity('sleep', 'Wind down together', 'A shared, peaceful space for the night.', BedDouble, 'Hang out', 'plum', () => { setShowSleepModal(true); setIsSleepMinimized(false); setSleepInvite(null); }),
    activity('poetry', 'A note from the heart', 'Find the words for what you want to say.', Feather, 'Show up', 'gold', () => setShowLovePoet(true)),
    activity('ink', 'Invisible ink', 'Hide a message behind a little magic.', Wand2, 'Chat essentials', 'plum', () => setShowInvisibleInk(true)),
    activity('scheduled', 'Scheduled messages', 'Send a thought at just the right time.', Clock, 'Chat essentials', 'gold', () => setShowScheduled(true), false),
    activity('starred', 'Starred messages', 'Your favorite words, saved for later.', Star, 'Chat essentials', 'gold', () => setLibraryKind('starred'), false),
    activity('pinned', 'Pinned messages', 'Keep the important things close.', Pin, 'Chat essentials', 'coral', () => setLibraryKind('pinned'), false),
    activity('search', 'Search this chat', 'Find that thing you said that one time.', Search, 'Chat essentials', 'mint', () => setLibraryKind('messages'), false),
    activity('files', 'Shared files', 'All your photos and documents in one place.', Paperclip, 'Chat essentials', 'plum', () => setLibraryKind('photos'), false),
    activity('disappearing', 'Disappearing messages', 'Choose how long new messages stay.', Clock, 'Chat essentials', 'mint', () => setShowDisappearing(true), false),
    activity('export', 'Export chat', 'Download a copy of your conversation.', Download, 'Chat essentials', 'plum', () => setExportChat({ id: selected, title: chosen.peer.name }), false),
    ...(chosen?.is_group ? [activity('group', 'Group settings', 'Manage your people and group details.', Users, 'Chat essentials', 'mint', () => setShowGroupSettings(true), false)] : [activity('safety', 'Block or report user', 'Manage this contact and your boundaries.', ShieldCheck, 'Chat essentials', 'mint', () => setShowSafety(true), false)]),
    { id: 'appearance', title: 'Make it yours', description: 'Themes, reading size, and your profile.', icon: SettingsIcon, category: 'Chat essentials', tone: 'plum', onClick: () => setShowSettings(true) },
    { id: 'disguise', title: 'Disguise mode', description: 'Switch to your discreet calculator view.', icon: EyeOff, category: 'Chat essentials', tone: 'mint', onClick: () => setIsStealthDisguised(true) },
  ];
'''
assert marker in s
s = s.replace(marker, marker + actions)
# Keep calls and settings within reach; the entire toolkit moves into a searchable space.
start = s.index('              <div className="header-actions">')
end = s.index('\n            </header>', start)
s = s[:start] + '''              <div className="header-actions">
                <ButtonIcon label="Start voice call" disabled={!connected || !!call.call || chosen.contact_blocked || chosen.is_group} onClick={() => void call.start(selected, 'audio')}><Phone size={20} /></ButtonIcon>
                <ButtonIcon label="Start video call" disabled={!connected || !!call.call || chosen.contact_blocked || chosen.is_group} onClick={() => void call.start(selected, 'video')}><Video size={20} /></ButtonIcon>
                <button type="button" className="together-button" onClick={() => setShowTogether(true)}><LayoutGrid size={18} /><span>Together</span></button>
                <ButtonIcon label="Chat settings" onClick={() => setShowSettings(true)}><SettingsIcon size={20} /></ButtonIcon>
              </div>''' + s[end:]
start = s.index('                    <ButtonIcon\n                      label="Live Doodle Together', s.index('className="composer"'))
end = s.index('                    <ButtonIcon\n                      label="Attach file"', start)
s = s[:start] + '''                    <ButtonIcon label="Explore friendship features" disabled={sending || recording} onClick={() => setShowTogether(true)}><Plus size={21} /></ButtonIcon>
''' + s[end:]
start = s.index('                    <ButtonIcon\n                      label="Digital Time Capsule', s.index('className="composer"'))
end = s.index('                    <button\n                      type="submit"', start)
s = s[:start] + s[end:]
# Export needs a selected conversation (previously dereferenced an absent peer).
s = s.replace('<ButtonIcon label="Export chat" onClick={() => setExportChat({ id: selected, title: chosen.is_group ? chosen.name || chosen.peer.name : chosen.peer.name })}>', '<ButtonIcon label="Export chat" disabled={!chosen} onClick={() => setExportChat({ id: selected, title: chosen.is_group ? chosen.name || chosen.peer.name : chosen.peer.name })}>')
s = s.replace('        <aside className="nav-rail">', '        <aside className="nav-rail" aria-label="Main navigation">')
s = s.replace('<MessageCircle size={23} />\n          </ButtonIcon>', '<MessageCircle size={23} /><span>Chats</span>\n          </ButtonIcon>', 1)
s = s.replace('<Phone size={22} />\n          </ButtonIcon>', '<Phone size={22} /><span>Calls</span>\n          </ButtonIcon>\n          <ButtonIcon label="Together" className={`rail-btn ${tab === \'together\' ? \'active\' : \'\'}`} onClick={() => setTab(\'together\')}><HeartHandshake size={23} /><span>Together</span></ButtonIcon>\n          <ButtonIcon label="Search all messages" className="rail-btn" onClick={() => setShowGlobalSearch(true)}><Search size={22} /><span>Search</span></ButtonIcon>', 1)
s = s.replace('MY FAVORITE HUMAN', 'YOUR INNER CIRCLE')
s = s.replace("{tab === 'chats' ? 'Our Sanctuary' : 'Our Moments'}", "{tab === 'calls' ? 'Calls' : 'Your people'}")
s = s.replace('placeholder="Search our memories or your person..."', 'placeholder="Find a friend…"')
s = s.replace('        <div className="list-label">\n          OUR SAFE HAVEN', '''        <div className="chat-filters" aria-label="Conversation filters">{['All', 'Unread', 'Groups'].map(filter => <button type="button" key={filter} aria-pressed={chatFilter === filter} onClick={() => setChatFilter(filter)}>{filter}{filter === 'Unread' && conversations.some(c => c.unread > 0) && <span>{conversations.filter(c => c.unread > 0).length}</span>}</button>)}</div>
        <div className="list-label">
          CONVERSATIONS''')
s = s.replace("'Close & connected'", "'Connected'")
s = s.replace("'Where’s your partner in crime? Start our private sanctuary with a hello.'", "chatFilter !== 'All' ? `No ${chatFilter.toLowerCase()} conversations yet.` : 'Your people are one hello away.'")
s = s.replace('Unbreakable bond, zero barriers.', 'Friendship speaks every language.')
s = s.replace('        {chosen ? (', '''        {tab === 'together' ? (
          <div className="together-page"><header className="together-page-header"><span><HeartHandshake size={21} /> Together</span><button type="button" className="text-btn" onClick={() => setTab('chats')}><ArrowLeft size={16} /> Back to chats</button></header><FeatureDirectory actions={friendshipActions} person={chosen?.peer} onConnect={() => setShowContact(true)} /></div>
        ) : chosen ? (''', 1)
s = s.replace('                void selectConversation(c.id)', '                void selectConversation(c.id)')
s = s.replace('onClick={() => void selectConversation(c.id)}', "onClick={() => { if (tab === 'together') setTab('chats'); void selectConversation(c.id); }}")
s = s.replace("'My person · Ride or die forever 🤍'", "'In your corner, always'")
s = s.replace('Spill the tea... or just say you miss me 💬', 'A thought, a meme, a little hello…')
s = s.replace('Press Enter to send some love', 'Enter to send')
s = s.replace('      </main>\n      {showDisappearing', '''      </main>
      <FriendshipDock actions={friendshipActions} person={chosen?.peer} onExplore={() => setShowTogether(true)} onConnect={() => setShowContact(true)} />
      {showTogether && <TogetherExplorer actions={friendshipActions} person={chosen?.peer} onConnect={() => { setShowTogether(false); setShowContact(true); }} onClose={() => setShowTogether(false)} />}
      {showDisappearing''', 1)
# Replace the empty workspace with an invitation and useful routes.
start = s.index('          <div className="chat-welcome">')
end = s.index('\n        )}', start)
s = s[:start] + '''          <div className="chat-welcome friendship-welcome">
            <div className="welcome-topline"><span className="eyebrow dark">GOOD TO HAVE YOU HERE, {user.name.split(' ')[0].toUpperCase()}</span><span className="friendship-pill"><HeartHandshake size={14} /> The ride-or-die club</span></div>
            <div className="welcome-postcard"><span className="postcard-stamp">ALWAYS IN YOUR CORNER</span><HeartHandshake size={72} strokeWidth={1.25} /><span className="postcard-signature">a little closer, every day.</span><span className="postcard-star">✳</span></div>
            <h2>{tab === 'calls' ? <>A familiar voice.<br /><em>A better day.</em></> : <>Big laughs. Little moments.<br /><em>Your kind of people.</em></>}</h2>
            <p>{tab === 'calls' ? 'Choose a friend from your conversations to see your call history or start a voice or video call.' : 'For the 2 a.m. talks, the “you had to be there” stories, and the friends who always get you. Make yourself at home.'}</p>
            <div className="welcome-actions"><button className="primary compact" onClick={() => setShowContact(true)}><Plus size={18} /> Find your people</button><button type="button" className="secondary" onClick={() => setTab('together')}><Sparkles size={17} /> Explore Together</button></div>
            <div className="welcome-feature-row"><button type="button" onClick={() => setShowContact(true)}><MessageCircle size={22} /><strong>Keep the conversation going</strong><span>Real talks, voice notes, and inside jokes.</span><ArrowRight size={17} /></button><button type="button" onClick={() => setTab('together')}><Headphones size={22} /><strong>Make time for each other</strong><span>Music, games, and little shared rituals.</span><ArrowRight size={17} /></button><button type="button" onClick={() => setShowTogether(true)}><Camera size={22} /><strong>Save the good stuff</strong><span>A home for the memories you make.</span><ArrowRight size={17} /></button></div>
            <div className="welcome-footnote"><Globe2 size={15} /> Malayalam, Manglish, English, Kiswahili. Friendship feels like home in every language.</div>
          </div>''' + s[end:]
# Auth: actual capabilities and clearer account actions, avoiding an unsupported privacy promise.
s = s.replace('OUR PRIVATE SANCTUARY · JUST THE TWO OF US', 'THE RIDE-OR-DIE CLUB')
s = s.replace('Through thick & thin,', 'Life’s better with')
s = s.replace('you’re my person.', 'your people.')
s = s.replace('<em>Always.</em>', '<em>Always in your corner.</em>')
s = s.replace('Every late-night rant, every dumb inside joke, every tear and unfiltered truth that belongs only between us. There’s room for our entire world right here.', 'A home for late-night talks, ridiculous inside jokes, and the friends who make ordinary days feel extraordinary.')
s = s.replace('Unfiltered midnight talks & secrets', 'Chats that feel like you')
s = s.replace('Hearing your voice fixes everything', 'Calls, music & shared moments')
s = s.replace('Our bond across every language', 'Friendship across languages')
s = s.replace('A secret sanctuary built for two die-hard souls.', 'Made for the friends who feel like home.')
s = s.replace('SAFE & SACRED BETWEEN US', 'YOUR PEOPLE. YOUR PLACE.')
s = s.replace("'Let’s set up our private corner.' : 'Welcome back, my favorite human.'", "'Find your kind of people.' : 'Welcome back.'")
s = s.replace("'A few quick details, then straight to your ride-or-die.'", "'Create your account and make room for more little moments.'")
s = s.replace("'Got gossip? Missed me? A breakdown to share? Spill it all right here.'", "'Your favorite conversations are waiting. Come on in.'")
s = s.replace('Enable AI translation and soulmate voice reading', 'Enable AI translation and voice reading')
s = s.replace('Speak freely in Malayalam, Swahili, or English. Gemini & Edge-TTS will translate and speak in natural voices.', 'Allow your messages to be processed by AI providers for translation and voice features. You can change this in Settings.')
s = s.replace("'Open our sanctuary'", "'Create account'")
s = s.replace("'Step inside'", "'Sign in'")
s = s.replace("'Already have our sanctuary?'", "'Already have an account?'")
s = s.replace('Strictly confidential between the two of us.', 'Your space, your choices.')
s = s.replace('Zero eavesdropping. Just pure love, real trust, and unfiltered honesty.', 'Manage your privacy, AI preferences, and notifications in Settings.')
path.write_text(s, encoding='utf-8')
p = Path('src/main.jsx')
s = p.read_text(encoding='utf-8').replace("import './ai-memory-innovations.css';", "import './ai-memory-innovations.css';\nimport './friendship-theme.css';")
p.write_text(s, encoding='utf-8')
p = Path('src/useThemeAndFontSize.js')
s = p.read_text(encoding='utf-8').replace("accent: '#17483e', background: '#f8f9f5', bubble: '#e5ecdc'", "accent: '#65445f', background: '#faf7f2', bubble: '#eee3ed'")
s = s.replace("isDark ? '#0e1613' : '#163c35'", "isDark ? '#211b27' : '#65445f'")
p.write_text(s, encoding='utf-8')
