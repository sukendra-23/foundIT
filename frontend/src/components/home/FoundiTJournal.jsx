import React, { useState, useEffect } from 'react';

const ARTICLES = [
  {
    id: 1,
    title: 'Lost Something? What You Should Do First.',
    category: 'Owner Guide',
    readTime: '4 min read',
    icon: '🧭',
    bgGradient: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
    summary: 'The critical first hours after misplacing an item dictate your chances of recovery. Learn the step-by-step checklist to retrace steps, protect serial identifiers, and file an effective report.',
    fullContent: {
      intro: 'Losing an essential everyday item—whether a smartphone, car keys, or wallet—triggers immediate stress. However, taking a disciplined, methodical approach significantly increases your chances of successful recovery.',
      sections: [
        {
          heading: '1. Retrace Your Steps Immediately',
          text: 'Mentally reconstruct your exact movements over the past 2–4 hours. Identify "transition points"—locations where you sat down, changed transportation, purchased an item, or adjusted outerwear. Physical items are most frequently dislodged during physical transitions.'
        },
        {
          heading: '2. Record Distinguishing Hardware Markers',
          text: 'Write down details that cannot be inferred from standard stock product photos: hairline scratches, customized stickers, specific keychain pendants, case colors, or engraved initials. These details will be your primary proof during verification.'
        },
        {
          heading: '3. Keep Secret Identifiers Private',
          text: 'Do not publish every single unique mark publicly in social groups. Retain at least one or two confidential traits (such as the lockscreen wallpaper photo, exact key count, or internal wallet card order) so genuine owners can substantiate claims without dispute.'
        },
        {
          heading: '4. File a Centralized FoundiT Report',
          text: 'File your report on FoundiT promptly. Entering precise category designations, dates, and geographic coordinates enables automated matching algorithms to alert you as soon as a community finder lists your item.'
        }
      ],
      takeaway: 'Acting within the first 24 hours while keeping distinguishing marks secure maximizes recovery probability.'
    }
  },
  {
    id: 2,
    title: "Found Something That Isn't Yours? Here's the Responsible Way to Handle It.",
    category: 'Finder Best Practices',
    readTime: '5 min read',
    icon: '🤝',
    bgGradient: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
    summary: 'Discovering an unattended item places trust in your hands. Explore the ethical guidelines for handling belongings, concealing private data, and coordinating safe handovers.',
    fullContent: {
      intro: 'When you find an unattended item on campus or in a public facility, your actions determine whether it returns safely to its owner or remains permanently lost.',
      sections: [
        {
          heading: '1. Avoid Unnecessary Handling and Inspection',
          text: 'Handle the item with care. If finding a wallet, do not remove cards or cash unnecessarily. If finding a phone, do not repeatedly guess lock codes, which could trigger automatic security wipe mechanisms.'
        },
        {
          heading: '2. Document Location Coordinates Immediately',
          text: 'Note the exact location, floor, bench, or public transit stop where the item was discovered. Precise location context is often the key correlation factor in matching algorithms.'
        },
        {
          heading: '3. Never Post High-Resolution Identity Cards Publicly',
          text: 'Posting uncensored student IDs, driver licenses, or passport photos on public social media exposes victims to identity theft and harassment. Instead, list the document type and issuing authority on FoundiT with personal details masked.'
        },
        {
          heading: '4. Require Independent Administrative Verification',
          text: 'Do not hand the item over to someone simply because they direct-message you claiming it is theirs. Ensure the platform administrators and system audit logs authenticate the claim first.'
        }
      ],
      takeaway: 'Responsible community finders protect owner privacy and rely on structured verification over informal handoffs.'
    }
  },
  {
    id: 3,
    title: 'How Can You Prove That a Lost Item Belongs to You?',
    category: 'Verification Standards',
    readTime: '4 min read',
    icon: '🛡️',
    bgGradient: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
    summary: 'Mass-manufactured gadgets look identical. Understand how platform moderators evaluate corroborating evidence, invoices, accessory pairings, and identifying quirks.',
    fullContent: {
      intro: 'Tens of thousands of identical space-gray smartphones and black earbuds are in circulation. When an item is found, how does the platform distinguish the rightful owner from an opportunistic claimant?',
      sections: [
        {
          heading: '1. Hardware Quirks and Physical Wear Patterns',
          text: 'No two actively used items remain identical. Subtle dents, slight cosmetic chips on corners, or third-party protective skins provide undeniable corroboration when matched against owner photos.'
        },
        {
          heading: '2. Purchase Records and Serial Digits',
          text: 'Original retail invoices, order confirmation emails, warranty registrations, or original retail packaging with matching barcode/IMEI digits constitute gold-standard proof for valuable electronics.'
        },
        {
          heading: '3. Unlocking and Software Artifacts',
          text: 'Describing unique lock screen notifications, bluetooth paired device names, or wallpaper layouts proves personal custody without needing to physically compromise the device.'
        },
        {
          heading: '4. Why Verification Protects Everyone',
          text: 'Strict verification prevents bad actors from claiming high-value items, preserving the integrity of community recovery networks.'
        }
      ],
      takeaway: 'Detailed corroborating proof guarantees that genuine owners are reunited with their possessions safely.'
    }
  },
  {
    id: 4,
    title: 'Why a Structured Lost & Found System Matters for Campuses and Communities.',
    category: 'Community Impact',
    readTime: '6 min read',
    icon: '🏛️',
    bgGradient: 'linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)',
    summary: 'Unorganized WhatsApp groups and cork noticeboards result in permanent property loss and privacy risks. Explore the benefits of centralized, audited recovery architectures.',
    fullContent: {
      intro: 'Across colleges, universities, and municipal transit centers, informal lost-and-found practices are breaking down under modern volume and security demands.',
      sections: [
        {
          heading: '1. The Pitfalls of Unstructured Social Channels',
          text: 'WhatsApp and Telegram groups suffer from rapid message churn—posts get buried in minutes. Searchability is poor, historical logs are lost, and personal contact details are broadcast indiscriminately.'
        },
        {
          heading: '2. The Danger of Unverified Handoffs',
          text: 'Informal arrangements have no dispute resolution mechanism. Anyone can contact a finder claiming ownership, creating opportunities for theft and disputes.'
        },
        {
          heading: '3. Institutional Auditability and Accountability',
          text: 'FoundiT provides institutional administrators with append-only audit trails, role-based moderation tools, and resolution metrics that demonstrate community safety compliance.'
        },
        {
          heading: '4. Centralization Maximizes Return Rates',
          text: 'A single, unified platform ensures that whether an item is found in the cafeteria, sports complex, or campus bus, it enters the same searchable ecosystem.'
        }
      ],
      takeaway: 'A structured, verified system transforms community recovery from chaotic chance into an organized public service.'
    }
  }
];

const FoundiTJournal = () => {
  const [selectedArticle, setSelectedArticle] = useState(null);

  // Lock body scroll when modal is open and handle ESC key
  useEffect(() => {
    if (!selectedArticle) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedArticle(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedArticle]);

  return (
    <section className="foundit-section foundit-section-alt" id="journal">
      <div className="foundit-container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <div className="section-badge">
            <span>📚</span>
            <span>The FoundiT Journal</span>
          </div>
          <h2 className="section-title-large">
            Stories, Guides &amp; Insights
          </h2>
          <p className="section-desc-lead">
            Practical ideas, responsible reporting, and helpful guidance for a world where every lost item deserves a chance to be found.
          </p>
        </div>

        {/* 4 Article Cards Grid */}
        <div className="journal-articles-grid">
          {ARTICLES.map((art) => (
            <div
              key={art.id}
              className="journal-card"
              onClick={() => setSelectedArticle(art)}
            >
              {/* Cover Banner */}
              <div className="journal-cover" style={{ background: art.bgGradient }}>
                <span>{art.icon}</span>
              </div>

              {/* Body */}
              <div className="journal-card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {art.category}
                  </span>
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>
                    ⏱️ {art.readTime}
                  </span>
                </div>

                <h3 style={{ margin: '0 0 10px 0', fontSize: 16, fontWeight: 800, color: '#0F172A', lineHeight: 1.4 }}>
                  {art.title}
                </h3>

                <p style={{ margin: '0 0 18px 0', fontSize: 13, color: '#64748B', lineHeight: 1.6, flex: 1 }}>
                  {art.summary}
                </p>

                <div style={{
                  paddingTop: 12,
                  borderTop: '1px solid #F1F5F9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#0F172A',
                  fontSize: 12.5,
                  fontWeight: 700
                }}>
                  <span>Read Article</span>
                  <span style={{ color: '#F43F5E' }}>→</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Read Article Isolated Modal */}
        {selectedArticle && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.72)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
              padding: '24px 16px',
              overscrollBehavior: 'contain'
            }}
            onClick={() => setSelectedArticle(null)}
          >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 20,
                maxWidth: 740,
                width: '100%',
                maxHeight: '86vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
                border: '1px solid #E2E8F0',
                position: 'relative',
                animation: 'fadeIn 0.2s ease-out'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Pinned Modal Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '18px 28px',
                  borderBottom: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  flexShrink: 0
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: '#059669',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    background: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    padding: '4px 10px',
                    borderRadius: 6
                  }}>
                    {selectedArticle.category}
                  </span>
                  <span style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>
                    ⏱️ {selectedArticle.readTime}
                  </span>
                </div>

                <button
                  onClick={() => setSelectedArticle(null)}
                  aria-label="Close article modal"
                  style={{
                    background: '#F1F5F9',
                    border: '1px solid #E2E8F0',
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: '#334155',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#E2E8F0'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#F1F5F9'; }}
                >
                  ✕
                </button>
              </div>

              {/* Isolated Scrollable Article Body */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  overscrollBehavior: 'contain',
                  padding: '28px 32px'
                }}
              >
                <h2 style={{
                  fontSize: 'clamp(20px, 3vw, 26px)',
                  fontWeight: 800,
                  color: '#0F172A',
                  margin: '0 0 16px 0',
                  lineHeight: 1.3
                }}>
                  {selectedArticle.title}
                </h2>

                <p style={{
                  fontSize: 15,
                  color: '#475569',
                  lineHeight: 1.7,
                  fontStyle: 'italic',
                  marginBottom: 28,
                  padding: '14px 18px',
                  background: '#F8FAFC',
                  borderRadius: 12,
                  borderLeft: '4px solid #F43F5E'
                }}>
                  {selectedArticle.fullContent.intro}
                </p>

                {/* Content Sections */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 22, marginBottom: 28 }}>
                  {selectedArticle.fullContent.sections.map((sec, i) => (
                    <div key={i} style={{ paddingBottom: 16, borderBottom: i < selectedArticle.fullContent.sections.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                      <h3 style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: '#0F172A',
                        margin: '0 0 8px 0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}>
                        {sec.heading}
                      </h3>
                      <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.7, margin: 0 }}>
                        {sec.text}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Key Takeaway Highlight Box */}
                <div style={{
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  borderLeft: '5px solid #10B981',
                  padding: '18px 22px',
                  borderRadius: 12,
                  marginBottom: 8
                }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: '#065F46',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <span>💡</span>
                    <span>Core Takeaway</span>
                  </div>
                  <div style={{ fontSize: 14, color: '#064E3B', fontWeight: 600, lineHeight: 1.5 }}>
                    {selectedArticle.fullContent.takeaway}
                  </div>
                </div>
              </div>

              {/* Pinned Modal Footer */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 28px',
                  borderTop: '1px solid #E2E8F0',
                  background: '#F8FAFC',
                  flexShrink: 0
                }}
              >
                <span style={{ fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>🛡️</span>
                  <span>FoundiT Verified Community Guide</span>
                </span>

                <button
                  onClick={() => setSelectedArticle(null)}
                  style={{
                    padding: '8px 20px',
                    background: '#0F172A',
                    color: '#FFFFFF',
                    borderRadius: 8,
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#1E293B'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#0F172A'; }}
                >
                  Done Reading
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default FoundiTJournal;
