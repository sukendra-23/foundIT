import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../../services/notificationApi';

// ─── Icon map ────────────────────────────────────────────────────────────────
const TYPE_ICON = {
    CLAIM_SUBMITTED:         '📋',
    CLAIM_DECISION:          '⚖️',
    FINDER_REVIEW_REQUESTED: '🔔',
    MESSAGE_RECEIVED:        '💬',
    ADDITIONAL_INFO_REQUESTED: '❓',
    CLAIM_WITHDRAWN:         '↩️',
    RECOVERY_SUBMITTED:      '🎁',
    RECOVERY_UNDER_REVIEW:   '🔍',
    RECOVERY_APPROVED:       '🎉',
    RECOVERY_REJECTED:       '❌',
    RECOVERY_REVOKED:        '⚠️',
    RECOVERY_CANCELLED:      '↩️',
};

// ─── Relative time ───────────────────────────────────────────────────────────
const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(dateStr).toLocaleDateString();
};

// ─── Skeleton row ─────────────────────────────────────────────────────────────
const SkeletonRow = () => (
    <div style={{ padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#E2E8F0', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
            <div style={{ height: 12, background: '#E2E8F0', borderRadius: 4, marginBottom: 6, width: '70%' }} />
            <div style={{ height: 10, background: '#EEF2FF', borderRadius: 4, width: '90%' }} />
        </div>
    </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────
const NotificationBell = () => {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const panelRef = useRef(null);

    // ── Fetch unread count (lightweight) ──────────────────────────────────
    const fetchUnreadCount = useCallback(async () => {
        if (document.hidden) return;
        try {
            const res = await notificationApi.getUnreadCount();
            setUnreadCount(res.data.unreadCount || 0);
        } catch {
            // silent
        }
    }, []);

    // Poll every 20 seconds
    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 20000);
        return () => clearInterval(interval);
    }, [fetchUnreadCount]);

    // ── Fetch full list when panel opens ──────────────────────────────────
    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await notificationApi.getNotifications();
            setNotifications(res.data.notifications || []);
            setUnreadCount(res.data.unreadCount || 0);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }, []);

    const handleBellClick = () => {
        const next = !open;
        setOpen(next);
        if (next) fetchNotifications();
    };

    // ── Outside-click to close ────────────────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Mark all read ─────────────────────────────────────────────────────
    const handleMarkAllRead = async (e) => {
        e.stopPropagation();
        try {
            await notificationApi.markAllRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch {
            // silent
        }
    };

    // ── Click a notification row ───────────────────────────────────────────
    const handleNotificationClick = async (notif) => {
        setOpen(false);
        if (!notif.is_read) {
            try {
                await notificationApi.markRead(notif.id);
                setNotifications(prev =>
                    prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n)
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
            } catch {
                // silent
            }
        }
        if (notif.link) {
            navigate(notif.link);
        }
    };

    // ── Styles ────────────────────────────────────────────────────────────
    const btnStyle = {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: 'var(--color-gray-100)',
        color: 'var(--color-gray-700)',
        border: 'none',
        cursor: 'pointer',
        fontSize: 17,
        transition: 'background 0.2s',
        flexShrink: 0,
    };

    const badgeStyle = {
        position: 'absolute',
        top: -3,
        right: -3,
        background: '#EF4444',
        color: '#fff',
        fontSize: 10,
        fontWeight: 800,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 4px',
        boxShadow: '0 0 0 2px #fff',
    };

    const panelStyle = {
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        width: 360,
        maxHeight: 420,
        overflowY: 'auto',
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        zIndex: 9999,
        border: '1px solid #E2E8F0',
    };

    return (
        <div ref={panelRef} style={{ position: 'relative', display: 'inline-flex' }}>
            {/* Bell Button */}
            <button
                onClick={handleBellClick}
                style={btnStyle}
                title="Notifications"
                aria-label="Open notifications"
                aria-expanded={open}
            >
                🔔
                {unreadCount > 0 && (
                    <span style={badgeStyle}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {open && (
                <div style={panelStyle}>
                    {/* Panel Header */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderBottom: '1px solid #E2E8F0',
                        position: 'sticky',
                        top: 0,
                        background: '#fff',
                        zIndex: 1,
                    }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>
                            Notifications
                            {unreadCount > 0 && (
                                <span style={{
                                    marginLeft: 8,
                                    background: '#EEF2FF',
                                    color: '#4361EE',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: '2px 7px',
                                    borderRadius: 999,
                                }}>
                                    {unreadCount} new
                                </span>
                            )}
                        </span>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#4361EE',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    padding: '2px 6px',
                                }}
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Body */}
                    {loading ? (
                        <>
                            <SkeletonRow />
                            <SkeletonRow />
                            <SkeletonRow />
                        </>
                    ) : notifications.length === 0 ? (
                        <div style={{
                            padding: '40px 20px',
                            textAlign: 'center',
                            color: '#94A3B8',
                        }}>
                            <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
                            <p style={{ margin: 0, fontSize: 14 }}>No notifications yet</p>
                        </div>
                    ) : (
                        notifications.map((notif) => (
                            <div
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                style={{
                                    display: 'flex',
                                    gap: 10,
                                    padding: '12px 16px',
                                    cursor: notif.link ? 'pointer' : 'default',
                                    background: notif.is_read ? '#fff' : '#F0F4FF',
                                    borderBottom: '1px solid #F1F5F9',
                                    transition: 'background 0.15s',
                                    alignItems: 'flex-start',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = notif.is_read ? '#F8FAFC' : '#E8EFFE'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = notif.is_read ? '#fff' : '#F0F4FF'; }}
                            >
                                {/* Type icon */}
                                <div style={{
                                    fontSize: 18,
                                    width: 32,
                                    height: 32,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    background: '#EEF2FF',
                                    borderRadius: '50%',
                                }}>
                                    {TYPE_ICON[notif.type] || '🔔'}
                                </div>

                                {/* Content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontWeight: notif.is_read ? 500 : 700,
                                        fontSize: 13,
                                        color: '#0F172A',
                                        marginBottom: 2,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}>
                                        {notif.title}
                                    </div>
                                    {notif.body && (
                                        <div style={{
                                            fontSize: 12,
                                            color: '#64748B',
                                            lineHeight: 1.45,
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                        }}>
                                            {notif.body}
                                        </div>
                                    )}
                                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                                        {timeAgo(notif.created_at)}
                                    </div>
                                </div>

                                {/* Unread dot */}
                                {!notif.is_read && (
                                    <div style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        background: '#4361EE',
                                        flexShrink: 0,
                                        marginTop: 6,
                                    }} />
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
