import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const LOST_JOURNEY_STEPS = [
  {
    step: '01',
    title: 'Report Your Lost Item',
    subtitle: 'Cryptographic Indexing & Category Tagging',
    desc: 'Describe what went missing with precise category, brand, model, color, and last known date & location coordinates. All serial numbers are stored privately.',
    icon: '📝',
    badge: 'Step 1 of 6',
    tip: 'Retain at least one private distinguishing feature (e.g., lockscreen photo or internal card order) for verification.',
    mockup: {
      type: 'form',
      title: 'Lost Item Submission Card',
      item: 'Apple iPhone 15 Pro',
      status: 'INDEXED IN DATABASE',
      fields: ['Category: Electronics', 'Geo-Radius: 500m Main Library', 'Serial: Private (Masked)']
    }
  },
  {
    step: '02',
    title: 'Upload Identifying Evidence',
    subtitle: 'Hardware Marks & Purchase Invoices',
    desc: 'Provide photos, distinctive wear marks, serial numbers, retail invoices, or protective stickers that prove your legitimate personal ownership.',
    icon: '📸',
    badge: 'Step 2 of 6',
    tip: 'Hairline scratches, custom case engravings, and receipts constitute gold-standard corroboration.',
    mockup: {
      type: 'evidence',
      title: 'Corroborating Proof Vault',
      item: 'Proof Artifacts: 3 Files',
      status: 'VERIFICATION READY',
      fields: ['Original Store Receipt (PDF)', 'Rear Case Scratch Photo', 'IMEI Match: 99.4%']
    }
  },
  {
    step: '03',
    title: 'Automated Match Discovery',
    subtitle: 'Proximity Engine & Feature Correlation',
    desc: 'FoundiT continuously scans incoming community found reports in your area, highlighting candidate matches with similarity scoring algorithms.',
    icon: '🔍',
    badge: 'Step 3 of 6',
    tip: 'Receive instant notifications the moment a matching item is found nearby.',
    mockup: {
      type: 'match',
      title: 'Platform Discovery Engine',
      item: 'Candidate Match Detected',
      status: 'CONFIDENCE: HIGH (94%)',
      fields: ['Temporal Overlap: 2h 15m', 'Location Distance: 45 meters', 'Hardware Traits: Matched']
    }
  },
  {
    step: '04',
    title: 'Submit Ownership Claim',
    subtitle: 'Double-Blind Verification Questions',
    desc: 'When you spot a candidate match, submit a claim answering specific proof questions that only the genuine owner would possess.',
    icon: '🛡️',
    badge: 'Step 4 of 6',
    tip: 'Double-blind claims ensure opportunists cannot guess what is inside a wallet or on a phone screen.',
    mockup: {
      type: 'claim',
      title: 'Ownership Claim Submission',
      item: 'Claim Ref: #CLM-4091',
      status: 'SUBMITTED TO AUDIT',
      fields: ['Lockscreen Wallpaper: Described', 'Card Count Inside: 4 Cards Named', 'Finder Notified for Review']
    }
  },
  {
    step: '05',
    title: 'Administrative Verification',
    subtitle: 'Objective Moderation & Audit Logging',
    desc: 'An independent platform administrator inspects submitted photos, finder responses, and evidence before authorizing any contact.',
    icon: '⚖️',
    badge: 'Step 5 of 6',
    tip: 'Prevents fraudulent handovers and ensures absolute fairness across community members.',
    mockup: {
      type: 'admin',
      title: 'Administrative Decision Log',
      item: 'Moderator Review Passed',
      status: 'STATUS: APPROVED',
      fields: ['Evidence Substantiated: YES', 'Audit Trail: Recorded on DB', 'Messaging Gate: UNLOCKED']
    }
  },
  {
    step: '06',
    title: 'Safe Handover Coordination',
    subtitle: 'Gated In-App Chat & Public Exchange',
    desc: 'Upon official administrative approval, direct chat unlocks securely so both parties can coordinate a safe campus or public return.',
    icon: '🤝',
    badge: 'Step 6 of 6',
    tip: 'Always conduct physical exchanges in broad daylight at authorized campus or public meeting spots.',
    mockup: {
      type: 'handover',
      title: 'Reunification Complete',
      item: 'Case #4091 Resolved',
      status: 'RETURN VERIFIED',
      fields: ['Meeting Spot: Campus Security Desk', 'Both Parties Confirmed: YES', 'Item Marked Returned']
    }
  }
];

const FOUND_JOURNEY_STEPS = [
  {
    step: '01',
    title: 'Discover an Unattended Item',
    subtitle: 'Securing Belongings in Public Spaces',
    desc: 'You notice a smartphone, set of keys, student ID, or personal accessory left behind in a public or campus facility.',
    icon: '👀',
    badge: 'Step 1 of 6',
    tip: 'Do not pry into personal phone data or take cards out of wallets unnecessarily.',
    mockup: {
      type: 'form',
      title: 'Discovery Logged',
      item: 'Unattended Belonging Secured',
      status: 'CUSTODY NOTED',
      fields: ['Location: Central Library Cafe', 'Timestamp: 10:45 AM', 'Item: Leather Wallet & Keys']
    }
  },
  {
    step: '02',
    title: 'Submit a Found Report',
    subtitle: 'Photos with Sensitive Data Masked',
    desc: 'Take clear external photos and note where and when you found it. Keep sensitive identifiers (like ID card numbers or full names) concealed.',
    icon: '📦',
    badge: 'Step 2 of 6',
    tip: 'FoundiT automatically keeps finder phone numbers and addresses private.',
    mockup: {
      type: 'evidence',
      title: 'Found Item Registry',
      item: 'Listing #FND-8820 Published',
      status: 'COMMUNITY SEARCHABLE',
      fields: ['Photos: 2 Uploaded', 'Sensitive Data: Auto-Masked', 'Coordinates Tagged: Library Fl 2']
    }
  },
  {
    step: '03',
    title: 'Platform Discovery & Matching',
    subtitle: 'Instant Candidate Alerts',
    desc: 'FoundiT notifies owners whose lost listings match your item category, location perimeter, and timeline automatically.',
    icon: '⚡',
    badge: 'Step 3 of 6',
    tip: 'You do not need to spam Facebook or WhatsApp groups—the platform alerts candidate owners directly.',
    mockup: {
      type: 'match',
      title: 'Proximity Match Broadcast',
      item: 'Candidate Owner Found',
      status: 'NOTIFICATION SENT',
      fields: ['Lost Report #LST-3301 Matches', 'Similarity Index: 92%', 'Owner Review Alert Active']
    }
  },
  {
    step: '04',
    title: 'Finder Review Participation',
    subtitle: 'Collaborative Evidence Validation',
    desc: 'When a claimant comes forward, review their claim details and confirm whether their description matches the actual item in your hands.',
    icon: '📋',
    badge: 'Step 4 of 6',
    tip: 'Your feedback gives administrators the ground-truth corroboration needed to approve the claim.',
    mockup: {
      type: 'claim',
      title: 'Finder Review Portal',
      item: 'Claimant Details Assessment',
      status: 'FEEDBACK SUBMITTED',
      fields: ['Does Keychain Match?: YES', 'Are Specific Keys Present?: YES', 'Finder Verdict: Authentic Owner']
    }
  },
  {
    step: '05',
    title: 'Admin Verification Gate',
    subtitle: 'Zero Unverified Handovers',
    desc: 'FoundiT moderators review both sides of evidence. No random handovers or fraudulent inquiries can bypass this security gate.',
    icon: '🛡️',
    badge: 'Step 5 of 6',
    tip: 'You are completely protected from fraudulent claimants or aggressive inquiries.',
    mockup: {
      type: 'admin',
      title: 'Security Clearance Gate',
      item: 'Administrative Oversight',
      status: 'CLAIM VERIFIED & AUTHORIZED',
      fields: ['Double-Blind Review: PASSED', 'Dispute Risk: 0%', 'Safe Chat Access: GRANTED']
    }
  },
  {
    step: '06',
    title: 'Coordinate Safe Return',
    subtitle: 'Protected Exchange & Community Thanks',
    desc: 'After approval, use built-in direct messaging to arrange a safe, verified exchange in a public venue and receive community gratitude.',
    icon: '🎉',
    badge: 'Step 6 of 6',
    tip: 'Experience the satisfaction of returning something vital to a grateful community member.',
    mockup: {
      type: 'handover',
      title: 'Reunification Success',
      item: 'Handover Completed Safely',
      status: 'COMMUNITY IMPACT +1',
      fields: ['Exchange Location: Campus Hub', 'Finder Commendation: Awarded', 'Lifecyle: Closed']
    }
  }
];

const RecoveryJourneys = () => {
  const [activeTab, setActiveTab] = useState('lost'); // 'lost' | 'found'
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const { isAuthenticated } = useAuth();

  const isLost = activeTab === 'lost';
  const steps = isLost ? LOST_JOURNEY_STEPS : FOUND_JOURNEY_STEPS;
  const currentStep = steps[activeStepIndex] || steps[0];

  // Reset active step when changing tabs
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setActiveStepIndex(0);
  };

  // Auto-play slideshow support
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setActiveStepIndex((prev) => (prev + 1) % steps.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isAutoPlaying, steps.length]);

  const handleNext = () => {
    setActiveStepIndex((prev) => (prev + 1) % steps.length);
  };

  const handlePrev = () => {
    setActiveStepIndex((prev) => (prev - 1 + steps.length) % steps.length);
  };

  const accentColor = isLost ? '#F43F5E' : '#10B981';
  const accentLight = isLost ? '#FFF1F2' : '#ECFDF5';
  const accentBorder = isLost ? '#FECDD3' : '#A7F3D0';

  return (
    <section className="foundit-section foundit-section-muted" id="recovery-journeys">
      <div className="foundit-container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div className="section-badge">
            <span>🔄</span>
            <span>Platform Community Architecture</span>
          </div>
          <h2 className="section-title-large">
            Two Journeys. One Trusted Platform.
          </h2>
          <p className="section-desc-lead">
            Whether you misplaced an essential belonging or discovered an item waiting for its owner, our structured 6-stage recovery pipeline ensures safety, privacy, and verification every step of the way.
          </p>
        </div>

        {/* Dynamic Dual-Tab Switcher with Stats */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 9999,
            padding: 6,
            display: 'inline-flex',
            gap: 8,
            boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.05)'
          }}>
            <button
              onClick={() => handleTabChange('lost')}
              style={{
                padding: '10px 24px',
                borderRadius: 9999,
                border: 'none',
                background: isLost ? '#0F172A' : 'transparent',
                color: isLost ? '#FFFFFF' : '#475569',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s ease'
              }}
            >
              <span>😟</span>
              <span>I Lost Something</span>
              {isLost && (
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#F43F5E' }} />
              )}
            </button>

            <button
              onClick={() => handleTabChange('found')}
              style={{
                padding: '10px 24px',
                borderRadius: 9999,
                border: 'none',
                background: !isLost ? '#0F172A' : 'transparent',
                color: !isLost ? '#FFFFFF' : '#475569',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s ease'
              }}
            >
              <span>🎉</span>
              <span>I Found Something</span>
              {!isLost && (
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981' }} />
              )}
            </button>
          </div>
        </div>

        {/* Milestone Progression Bar (Step 01 to 06) */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 20,
          padding: '16px 24px',
          marginBottom: 24,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
          overflowX: 'auto'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minWidth: 620,
            position: 'relative'
          }}>
            {/* Horizontal Line */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: 40,
              right: 40,
              height: 2,
              background: '#E2E8F0',
              zIndex: 1,
              transform: 'translateY(-50%)'
            }} />

            {/* Filled Progress Line */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: 40,
              width: `${(activeStepIndex / (steps.length - 1)) * (100 - 15)}%`,
              height: 2,
              background: accentColor,
              zIndex: 2,
              transform: 'translateY(-50%)',
              transition: 'width 0.3s ease'
            }} />

            {steps.map((st, i) => {
              const isActive = activeStepIndex === i;
              const isPast = activeStepIndex > i;
              return (
                <button
                  key={i}
                  onClick={() => setActiveStepIndex(i)}
                  style={{
                    position: 'relative',
                    zIndex: 3,
                    background: isActive ? '#0F172A' : (isPast ? accentColor : '#FFFFFF'),
                    color: isActive || isPast ? '#FFFFFF' : '#475569',
                    border: `2px solid ${isActive ? '#0F172A' : (isPast ? accentColor : '#CBD5E1')}`,
                    borderRadius: 9999,
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    fontSize: 12.5,
                    fontWeight: 700,
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: isActive ? '0 4px 12px rgba(15, 23, 42, 0.2)' : 'none'
                  }}
                >
                  <span>{st.icon}</span>
                  <span>Step {st.step}</span>
                  {isActive && (
                    <span style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: accentColor
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Interactive Slide Presentation Card */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 28,
          padding: '40px',
          boxShadow: '0 20px 45px -12px rgba(0, 0, 0, 0.05)',
          display: 'grid',
          gridTemplateColumns: '1.15fr 0.85fr',
          gap: 36,
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden'
        }} className="journey-interactive-slide">

          {/* Left Column: Rich Step Narrative & Guidance */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: accentColor,
                background: accentLight,
                border: `1px solid ${accentBorder}`,
                padding: '4px 12px',
                borderRadius: 9999
              }}>
                {currentStep.badge}
              </span>
              <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>
                {currentStep.subtitle}
              </span>
            </div>

            <h3 style={{
              margin: 0,
              fontSize: 'clamp(22px, 2.5vw, 30px)',
              fontWeight: 800,
              color: '#0F172A',
              lineHeight: 1.25,
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <span style={{ fontSize: 32 }}>{currentStep.icon}</span>
              <span>{currentStep.title}</span>
            </h3>

            <p style={{
              fontSize: 15,
              color: '#475569',
              lineHeight: 1.7,
              margin: '6px 0 0'
            }}>
              {currentStep.desc}
            </p>

            {/* Pro-Tip Box */}
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderLeft: `4px solid ${accentColor}`,
              borderRadius: 12,
              padding: '14px 18px',
              marginTop: 8
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                💡 Community Best Practice:
              </div>
              <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                {currentStep.tip}
              </div>
            </div>

            {/* Step Controls (Previous, Next, Auto-Slide) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 12,
              paddingTop: 16,
              borderTop: '1px solid #F1F5F9'
            }}>
              <button
                onClick={handlePrev}
                style={{
                  padding: '9px 18px',
                  borderRadius: 10,
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  color: '#0F172A',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F1F5F9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#F8FAFC'; }}
              >
                <span>←</span>
                <span>Previous</span>
              </button>

              <button
                onClick={handleNext}
                style={{
                  padding: '9px 20px',
                  borderRadius: 10,
                  background: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#1E293B'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#0F172A'; }}
              >
                <span>Next Step</span>
                <span>→</span>
              </button>

              <button
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                title={isAutoPlaying ? 'Pause automatic slideshow' : 'Play automatic slideshow'}
                style={{
                  padding: '9px 14px',
                  borderRadius: 10,
                  background: isAutoPlaying ? accentLight : '#F8FAFC',
                  border: `1px solid ${isAutoPlaying ? accentBorder : '#E2E8F0'}`,
                  color: isAutoPlaying ? accentColor : '#64748B',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>{isAutoPlaying ? '⏸️ Auto' : '▶️ Auto'}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Realistic Mockup Artifact */}
          <div style={{
            background: 'linear-gradient(135deg, #FAFAFA 0%, #FFFFFF 100%)',
            border: '1px solid #E2E8F0',
            borderRadius: 20,
            padding: '28px',
            boxShadow: '0 10px 30px -8px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.05em' }}>
                LIVE ARTIFACT
              </span>
            </div>

            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 14,
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#0F172A' }}>
                  {currentStep.mockup.title}
                </h4>
                <span style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: accentColor,
                  background: accentLight,
                  padding: '3px 8px',
                  borderRadius: 6
                }}>
                  {currentStep.mockup.status}
                </span>
              </div>

              <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
                📁 {currentStep.mockup.item}
              </div>

              <div style={{
                background: '#F8FAFC',
                borderRadius: 10,
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}>
                {currentStep.mockup.fields.map((fld, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#475569' }}>
                    <span style={{ color: accentColor, fontWeight: 800 }}>✓</span>
                    <span>{fld}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Context Footer */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12,
              color: '#64748B',
              paddingTop: 8
            }}>
              <span>🔒 Encrypted Verification Gate</span>
              <span style={{ color: '#0F172A', fontWeight: 700 }}>Stage {currentStep.step}/06</span>
            </div>
          </div>
        </div>

        {/* Bottom Comparison & Action Bar */}
        <div style={{
          marginTop: 36,
          background: '#FFFFFF',
          borderRadius: 24,
          border: '1px solid #E2E8F0',
          padding: '28px 36px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)'
        }}>
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
              {isLost ? 'Misplaced something on campus or in town?' : 'Discovered an unattended item waiting to go home?'}
            </h4>
            <p style={{ margin: 0, fontSize: 13.5, color: '#64748B' }}>
              {isLost
                ? 'Join thousands of community members who recovered keys, phones, and valuables through our verified network.'
                : 'Do the right thing safely. Submit a found listing with protected contact details.'}
            </p>
          </div>

          <Link
            to={isAuthenticated ? (isLost ? '/report-lost' : '/report-found') : '/login'}
            style={{
              padding: '12px 28px',
              borderRadius: 12,
              background: isLost ? '#0F172A' : '#10B981',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: 14,
              textDecoration: 'none',
              boxShadow: isLost ? '0 4px 14px rgba(15, 23, 42, 0.25)' : '0 4px 14px rgba(16, 185, 129, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span>{isLost ? '😟' : '🎉'}</span>
            <span>{isLost ? 'Report a Lost Item Now' : 'Report a Found Item Now'}</span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default RecoveryJourneys;
