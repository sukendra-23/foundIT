import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import PageContainer from '../components/layout/PageContainer';
import StatusBadge from '../components/common/StatusBadge';
import Button from '../components/common/Button';
import { Skeleton } from '../components/common/Loader';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../hooks/useAuth';
import { messageApi } from '../services/messageApi';
import { formatDate } from '../utils/formatters';

const formatMessageTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return isToday ? time : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${time}`;
};

const Messages = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const claimIdParam = searchParams.get('claimId');
  const convIdParam = searchParams.get('convId');

  const [conversations, setConversations] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedConvId, setSelectedConvId] = useState(convIdParam ? Number(convIdParam) : null);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);

  const [newMessageText, setNewMessageText] = useState('');
  const [sending, setSending] = useState(false);

  // Moderation & Abuse Reporting State (Feature F)
  const [reportingMsg, setReportingMsg] = useState(null);
  const [reportReason, setReportReason] = useState('HARASSMENT');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportedMessages, setReportedMessages] = useState({});

  const messagesContainerRef = useRef(null);
  const pollingRef = useRef(null);
  const lastMessageCountRef = useRef(0);
  const lastMessageIdRef = useRef(null);
  const initialLoadConvRef = useRef(null);

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll ONLY the messages container to bottom — never touches the browser window/page scroll
  const scrollContainerToBottom = (behavior = 'smooth') => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  };

  // Check if user is near the bottom of the message container (within 100px)
  const isNearBottom = () => {
    const el = messagesContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  };

  // 1. Fetch conversations list
  const fetchConversations = async (silent = false) => {
    if (!silent) setLoadingList(true);
    try {
      const res = await messageApi.getConversations();
      setConversations(res.data || []);
      return res.data || [];
    } catch (err) {
      if (!silent) toast('Failed to load conversations.', 'error');
      return [];
    } finally {
      if (!silent) setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchConversations().then((convList) => {
      // If navigated with claimId, get or create conversation
      if (claimIdParam) {
        messageApi.getByClaimId(claimIdParam)
          .then((res) => {
            const cid = res.data.conversationId;
            setSelectedConvId(cid);
            setSearchParams({ convId: cid });
            fetchConversations(true);
          })
          .catch(() => toast('Unable to access conversation for this claim.', 'error'));
      } else if (!selectedConvId && convList.length > 0) {
        // Select first conversation on desktop if none specified
        if (!isMobile) {
          setSelectedConvId(convList[0].id);
        }
      }
    });
  }, [claimIdParam]);

  // 2. Fetch active thread
  const fetchThread = async (convId, silent = false) => {
    if (!convId) return;
    if (!silent) setLoadingThread(true);
    try {
      const res = await messageApi.getConversationById(convId);
      setActiveConversation(res.data.conversation);
      setMessages(res.data.messages || []);

      // Mark as read
      messageApi.markAsRead(convId).catch(() => {});
      // Optimistically update unread count in conversations list
      setConversations(prev =>
        prev.map(c => c.id === convId ? { ...c, unreadCount: 0 } : c)
      );
    } catch (err) {
      if (!silent) toast('Failed to load messages.', 'error');
    } finally {
      if (!silent) setLoadingThread(false);
    }
  };

  useEffect(() => {
    if (selectedConvId) {
      // Reset tracking refs when switching conversations
      lastMessageCountRef.current = 0;
      lastMessageIdRef.current = null;
      initialLoadConvRef.current = null;
      fetchThread(selectedConvId);
      setSearchParams({ convId: selectedConvId });
    }
  }, [selectedConvId]);

  // Auto-scroll inside container for initial conversation load and new incoming messages
  // Strictly scrolls within messagesContainerRef — never touches browser window/page scroll
  useEffect(() => {
    if (messages.length === 0) return;

    const latestMsg = messages[messages.length - 1];
    const isInitialLoad = initialLoadConvRef.current !== selectedConvId;

    if (isInitialLoad) {
      initialLoadConvRef.current = selectedConvId;
      // Scroll container to bottom on conversation load without jumping the page
      requestAnimationFrame(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      });
    } else {
      const isNewMessage =
        messages.length > lastMessageCountRef.current &&
        lastMessageCountRef.current > 0;

      if (isNewMessage && isNearBottom()) {
        scrollContainerToBottom('smooth');
      }
    }

    lastMessageCountRef.current = messages.length;
    lastMessageIdRef.current = latestMsg?.id;
  }, [messages, selectedConvId]);

  // 3. Smart polling for new messages (every 4 seconds)
  useEffect(() => {
    if (!selectedConvId) return;

    pollingRef.current = setInterval(() => {
      if (!document.hidden && selectedConvId) {
        fetchThread(selectedConvId, true);
        fetchConversations(true);
      }
    }, 4000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [selectedConvId]);

  // 4. Send Message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessageText.trim() || sending || !selectedConvId) return;

    const text = newMessageText.trim();
    setSending(true);
    try {
      const res = await messageApi.sendMessage(selectedConvId, text);
      const sentMsg = res.data.data;
      // Add message to list and update refs
      setMessages(prev => {
        const updated = [...prev, sentMsg];
        lastMessageCountRef.current = updated.length;
        lastMessageIdRef.current = sentMsg?.id;
        return updated;
      });
      setNewMessageText('');

      // Auto-scroll inside container to latest message
      requestAnimationFrame(() => {
        scrollContainerToBottom('smooth');
      });

      // Refresh list to show updated last_message_at
      fetchConversations(true);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to send message.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportingMsg) return;

    setSubmittingReport(true);
    try {
      await messageApi.reportMessage(reportingMsg.id, reportReason, reportDetails);
      toast('Message reported to administration for review.', 'success');
      setReportedMessages(prev => ({ ...prev, [reportingMsg.id]: true }));
      setReportingMsg(null);
      setReportReason('HARASSMENT');
      setReportDetails('');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to submit report.', 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  const filteredConversations = conversations.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      (c.itemTitle && c.itemTitle.toLowerCase().includes(q)) ||
      (c.otherParticipantName && c.otherParticipantName.toLowerCase().includes(q)) ||
      String(c.claimId).includes(q)
    );
  });

  return (
    <div style={{ background: 'var(--color-gray-50)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <PageContainer style={{ paddingTop: '90px', paddingBottom: 'var(--space-12)', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Page Header */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Direct Communications
          </div>
          <h1 style={{ margin: '2px 0 0 0', fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-gray-900)' }}>
            Claim Messages
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
            Communicate securely regarding item identification, proof of ownership, and handover coordination.
          </p>
        </div>

        {/* 2-Pane Chat Workspace */}
        <div style={{
          background: '#fff',
          borderRadius: 'var(--radius-2xl)',
          border: '1px solid var(--color-gray-200)',
          boxShadow: 'var(--shadow-md)',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '320px minmax(0, 1fr)',
          height: isMobile ? 'calc(100dvh - 180px)' : 'calc(100vh - 220px)',
          minHeight: isMobile ? '460px' : '520px',
          maxHeight: '820px',
          overflow: 'hidden'
        }}>
          {/* LEFT SIDEBAR: Conversation List */}
          <div style={{
            borderRight: '1px solid var(--color-gray-200)',
            display: selectedConvId && isMobile ? 'none' : 'flex',
            flexDirection: 'column',
            background: '#F8FAFC',
            height: '100%',
            minHeight: 0,
            overflow: 'hidden'
          }}>
            {/* Search Box */}
            <div style={{ padding: 14, borderBottom: '1px solid #E2E8F0', background: '#fff', flexShrink: 0 }}>
              <input
                type="text"
                placeholder="Search by participant or item..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--color-gray-300)',
                  fontSize: 12,
                  outline: 'none'
                }}
              />
            </div>

            {/* List */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {loadingList ? (
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Skeleton height={60} />
                  <Skeleton height={60} />
                  <Skeleton height={60} />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-gray-400)', fontSize: 13 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                  <div style={{ fontWeight: 600 }}>No conversations found</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>
                    Start a chat from any active claim details page.
                  </div>
                </div>
              ) : (
                filteredConversations.map(conv => {
                  const isSelected = conv.id === selectedConvId;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedConvId(conv.id)}
                      style={{
                        padding: '12px 14px',
                        borderBottom: '1px solid #E2E8F0',
                        cursor: 'pointer',
                        background: isSelected ? '#EEF2FF' : '#fff',
                        borderLeft: isSelected ? '4px solid var(--color-primary)' : '4px solid transparent',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-gray-900)' }}>
                          {conv.otherParticipantName}
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--color-gray-400)' }}>
                          {formatMessageTime(conv.lastMessageAt || conv.createdAt)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                          background: conv.otherParticipantRole === 'Finder' ? '#DBEAFE' : '#EDE9FE',
                          color: conv.otherParticipantRole === 'Finder' ? '#1E40AF' : '#6D28D9'
                        }}>
                          {conv.otherParticipantRole}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--color-gray-500)', fontWeight: 600 }}>
                          Claim #{String(conv.claimId).padStart(4, '0')} · {conv.itemTitle}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{
                          fontSize: 12, color: conv.unreadCount > 0 ? 'var(--color-gray-900)' : 'var(--color-gray-500)',
                          fontWeight: conv.unreadCount > 0 ? 700 : 400,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px'
                        }}>
                          {conv.lastMessageText || 'No messages yet'}
                        </div>
                        {conv.unreadCount > 0 && (
                          <span style={{
                            background: 'var(--color-primary)', color: '#fff', fontSize: 10, fontWeight: 800,
                            padding: '2px 6px', borderRadius: 999, minWidth: 18, textAlign: 'center'
                          }}>
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT WORKSPACE: Message Thread */}
          <div style={{
            display: !selectedConvId && isMobile ? 'none' : 'flex',
            flexDirection: 'column',
            background: '#fff',
            height: '100%',
            minHeight: 0,
            overflow: 'hidden'
          }}>
            {!selectedConvId || (!activeConversation && loadingThread) ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--color-gray-400)', padding: 32 }}>
                <span style={{ fontSize: 48, marginBottom: 12 }}>💬</span>
                <h3 style={{ margin: 0, fontSize: 16, color: 'var(--color-gray-700)' }}>Select a conversation</h3>
                <p style={{ fontSize: 12, marginTop: 4 }}>Choose a discussion from the left to view messages and coordinate.</p>
              </div>
            ) : !activeConversation ? (
              <div style={{ padding: 24 }}><Skeleton height={200} /></div>
            ) : (
              <>
                {/* Thread Header */}
                <div style={{
                  padding: '12px 20px',
                  borderBottom: '1px solid var(--color-gray-200)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#F8FAFC',
                  flexShrink: 0
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Mobile Back Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedConvId(null)}
                      style={{
                        display: isMobile ? 'block' : 'none',
                        background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', padding: 4
                      }}
                    >
                      ←
                    </button>

                    {activeConversation.itemImage ? (
                      <img
                        src={activeConversation.itemImage}
                        alt="Item"
                        style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', border: '1px solid #E2E8F0' }}
                      />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                        📦
                      </div>
                    )}

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--color-gray-900)' }}>
                          {activeConversation.otherParticipantName}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                          background: activeConversation.otherParticipantRole === 'Finder' ? '#DBEAFE' : '#EDE9FE',
                          color: activeConversation.otherParticipantRole === 'Finder' ? '#1E40AF' : '#6D28D9'
                        }}>
                          {activeConversation.otherParticipantRole}
                        </span>
                        <StatusBadge status={activeConversation.claimStatus} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-gray-500)', marginTop: 2 }}>
                        Item: <strong>{activeConversation.itemTitle}</strong> ({activeConversation.itemCategory})
                      </div>
                    </div>
                  </div>

                  <Link
                    to={`/claims/${activeConversation.claimId}`}
                    style={{
                      fontSize: 12, color: 'var(--color-primary)', fontWeight: 700, textDecoration: 'none',
                      padding: '6px 12px', borderRadius: 6, background: '#EEF2FF'
                    }}
                  >
                    View Claim #{String(activeConversation.claimId).padStart(4, '0')} →
                  </Link>
                </div>

                {/* Read-only Banner if claim rejected or withdrawn */}
                {activeConversation.isReadOnly && (
                  <div style={{
                    padding: '8px 16px', background: '#FEF2F2', borderBottom: '1px solid #FEE2E2',
                    color: '#991B1B', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6,
                    flexShrink: 0
                  }}>
                    <span>🔒</span>
                    <span>This claim has been {activeConversation.claimStatus.toLowerCase()}. Messaging is closed. Existing history remains preserved for record-keeping.</span>
                  </div>
                )}

                {/* Privacy Advisory Banner (Feature E: Privacy & Safety) */}
                <div style={{
                  padding: '6px 16px', background: '#F0FDF4', borderBottom: '1px solid #DCFCE7',
                  color: '#166534', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6,
                  flexShrink: 0
                }}>
                  <span>🛡️</span>
                  <span><strong>Privacy Advisory:</strong> Never share passwords, bank accounts, or OTPs. Conversations are monitored for community safety.</span>
                </div>

                {/* Messages Bubbles Area */}
                <div ref={messagesContainerRef} style={{ flex: 1, minHeight: 0, padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {messages.length === 0 ? (
                    <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-gray-400)', fontSize: 13 }}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>🤝</div>
                      <div style={{ fontWeight: 700, color: 'var(--color-gray-600)' }}>Start the Conversation</div>
                      <div style={{ fontSize: 12, marginTop: 4, maxWidth: 320 }}>
                        Communicate safely about item specifics and verification. Please do not share sensitive financial or account information.
                      </div>
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isMe = msg.sender_id === user?.id;
                      return (
                        <div
                          key={msg.id}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isMe ? 'flex-end' : 'flex-start'
                          }}
                        >
                          <div style={{
                            maxWidth: '75%',
                            padding: '10px 14px',
                            borderRadius: isMe ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                            background: isMe ? 'var(--color-primary)' : '#F1F5F9',
                            color: isMe ? '#fff' : '#0F172A',
                            fontSize: 13,
                            lineHeight: 1.5,
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                          }}>
                            {msg.message_text}
                          </div>

                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            marginTop: 4, fontSize: 10, color: 'var(--color-gray-400)'
                          }}>
                            <span>{formatMessageTime(msg.created_at)}</span>
                            {isMe ? (
                              <span>{msg.is_read ? '✓✓ Read' : '✓ Sent'}</span>
                            ) : (
                              reportedMessages[msg.id] ? (
                                <span style={{ color: '#D97706', fontWeight: 700 }}>✓ Reported</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setReportingMsg(msg)}
                                  title="Report this message to administration"
                                  style={{
                                    background: 'none', border: 'none', color: 'var(--color-gray-400)',
                                    cursor: 'pointer', fontSize: 10, padding: 0, textDecoration: 'underline'
                                  }}
                                >
                                  🚩 Report
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Message Input Form */}
                {!activeConversation.isReadOnly ? (
                  <form
                    onSubmit={handleSendMessage}
                    style={{
                      padding: 14,
                      borderTop: '1px solid var(--color-gray-200)',
                      background: '#fff',
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-end',
                      flexShrink: 0
                    }}
                  >
                    <textarea
                      rows={2}
                      placeholder="Type a secure message... (Enter to send, Shift+Enter for newline)"
                      value={newMessageText}
                      onChange={e => setNewMessageText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      maxLength={2000}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--color-gray-300)',
                        fontSize: 13,
                        resize: 'none',
                        outline: 'none',
                        fontFamily: 'inherit'
                      }}
                    />

                    <Button
                      type="submit"
                      disabled={!newMessageText.trim() || sending}
                      loading={sending}
                      style={{ height: '42px', padding: '0 18px', flexShrink: 0 }}
                    >
                      Send
                    </Button>
                  </form>
                ) : (
                  <div style={{
                    padding: 14,
                    background: '#F8FAFC',
                    borderTop: '1px solid #E2E8F0',
                    textAlign: 'center',
                    fontSize: 12,
                    color: 'var(--color-gray-500)',
                    flexShrink: 0
                  }}>
                    Conversation is read-only.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        {/* Report Message Modal (Feature F: Abuse Reporting & Moderation) */}
        {reportingMsg && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: 16
          }}>
            <div style={{
              background: '#fff', borderRadius: 'var(--radius-xl)', maxWidth: 440, width: '100%',
              padding: 24, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#991B1B', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>🚨</span> Report Inappropriate Message
                </h3>
                <button
                  type="button"
                  onClick={() => setReportingMsg(null)}
                  style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--color-gray-400)' }}
                >
                  ✕
                </button>
              </div>

              <div style={{
                background: 'var(--color-gray-50)', padding: 10, borderRadius: 8, fontSize: 12,
                color: 'var(--color-gray-700)', marginBottom: 16, borderLeft: '3px solid #EF4444'
              }}>
                <div style={{ fontSize: 10, color: 'var(--color-gray-400)', marginBottom: 2 }}>Message Excerpt:</div>
                "{reportingMsg.message_text.length > 120 ? reportingMsg.message_text.substring(0, 120) + '...' : reportingMsg.message_text}"
              </div>

              <form onSubmit={handleReportSubmit}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-gray-700)', marginBottom: 6 }}>
                  Reason for reporting:
                </label>
                <select
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 6,
                    border: '1px solid var(--color-gray-300)', fontSize: 13, marginBottom: 14,
                    outline: 'none'
                  }}
                >
                  <option value="HARASSMENT">Harassment or abusive language</option>
                  <option value="SPAM">Spam or unwanted advertising</option>
                  <option value="SCAM_FRAUD">Scam, fraud, or suspicious demand</option>
                  <option value="INAPPROPRIATE">Asking for sensitive banking / private data</option>
                  <option value="OTHER">Other violation</option>
                </select>

                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-gray-700)', marginBottom: 6 }}>
                  Additional details (optional):
                </label>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={e => setReportDetails(e.target.value)}
                  maxLength={500}
                  placeholder="Provide context for our moderation team (max 500 chars)..."
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 6,
                    border: '1px solid var(--color-gray-300)', fontSize: 12, resize: 'none',
                    marginBottom: 16, fontFamily: 'inherit', outline: 'none'
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setReportingMsg(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    loading={submittingReport}
                    style={{ background: '#DC2626' }}
                  >
                    Submit Report
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </PageContainer>
      <Footer />
    </div>
  );
};

export default Messages;
