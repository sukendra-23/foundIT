import React, { useState, useEffect } from 'react';

const SCENARIOS = [
  {
    id: 'smartphone',
    category: 'Consumer Electronics · Smartphone',
    title: 'The Misplaced Smartphone in a Public Cafe',
    icon: '📱',
    accentColor: '#F43F5E',
    accentLight: '#FFF1F2',
    accentBorder: '#FECDD3',
    situation: 'Left on a corner table during morning rush hours',
    narrative: 'A commuter leaves their phone behind on a cafe table. Realizing the loss hours later, they log into FoundiT and submit a report listing the phone model, lock screen wallpaper description, and a distinctive scratch near the charging port. That afternoon, a cafe employee registers a found device in the same neighborhood. Our matching engine pairs the listings, and the owner proves ownership by accurately naming the locked screen widgets and serial digits.',
    unverifiedRisk: 'Publicly broadcasting phone models on community groups invites scammers to guess passwords, trigger factory wipe locks, or harass finders.',
    founditSolution: 'Double-blind matching privately cross-references distinguishing hardware scratches without exposing contact numbers or IMEI codes.',
    flow: [
      'Report filed with hardware quirks & masked IMEI',
      'Geospatial engine flags candidate match within 500m',
      'Admin inspects matching lockscreen wallpaper details',
      'Safe, verified handover completed at cafe security desk'
    ],
    benefitHighlight: 'Protects personal device data without posting phone numbers online.'
  },
  {
    id: 'keys',
    category: 'Personal Belongings · Campus Keys',
    title: 'Misplaced Dorm & Bicycle Keys on Campus',
    icon: '🔑',
    accentColor: '#D97706',
    accentLight: '#FEF3C7',
    accentBorder: '#FDE68A',
    situation: 'Dropped between the lecture auditorium and central library',
    narrative: 'A university student misplaces their key ring containing a dorm key, bike padlock key, and miniature brass keychain. Instead of relying on crowded, unstructured group chats where posts quickly get buried, the student searches FoundiT and finds an active report submitted 45 minutes earlier by a campus custodian. The student claims the listing by describing the exact number of teeth on the padlock key, leading to a prompt return at campus security.',
    unverifiedRisk: 'Unstructured group chat messages get buried under hundreds of memes and notifications in minutes, with zero historical searchability.',
    founditSolution: 'A centralized, permanent campus index allows instant filtering by building, floor, and key attributes with custodian sign-off.',
    flow: [
      'Custodian logs found item at campus facility desk',
      'Student discovers listing via campus location tag',
      'Finder confirms key count & keychain details privately',
      'Item retrieved at verified university security office'
    ],
    benefitHighlight: 'Centralizes lost items across entire university and college departments.'
  },
  {
    id: 'wallet',
    category: 'Valuables & ID · Leather Wallet',
    title: 'Lost Wallet Containing Identification & Cards',
    icon: '👛',
    accentColor: '#059669',
    accentLight: '#ECFDF5',
    accentBorder: '#A7F3D0',
    situation: 'Slipped out of a jacket pocket in a busy shopping center',
    narrative: 'Losing a wallet causes anxiety over potential identity theft. Rather than broadcasting full names, credit card numbers, or driving license images across social media, the finder creates an item listing describing only the external leather color and brand. When the rightful owner files a claim, they verify ownership by privately naming specific membership cards and receipt dates inside, verified before contact is enabled.',
    unverifiedRisk: 'Posting uncensored identity cards or driver licenses online exposes owners to identity theft, bank fraud, and doxxing.',
    founditSolution: 'External photos are published with IDs concealed. The claimant proves ownership by inventorying cards privately.',
    flow: [
      'Finder publishes external leather photos with cards concealed',
      'Owner submits private internal card inventory to portal',
      'Administrator compares private inventory against finder notes',
      'Safe exchange conducted at monitored mall customer service desk'
    ],
    benefitHighlight: 'Zero exposure of sensitive banking or personal identity numbers.'
  },
  {
    id: 'documents',
    category: 'Official Papers · Academic Certificates & IDs',
    title: 'Found Academic Credentials & Government IDs',
    icon: '📄',
    accentColor: '#0284C7',
    accentLight: '#F0F9FF',
    accentBorder: '#BAE6FD',
    situation: 'Discovered in a waterproof folder on a transit hub bench',
    narrative: 'Important credentials, degree transcripts, and government identity cards are irreplaceable and highly vulnerable. A responsible commuter who discovers a folder can list the general issuing institution and document type on FoundiT without posting high-resolution scans of the person\'s photo or government ID number. The rightful graduate recognizes the listing, authenticates their identity, and reclaims their life documents securely.',
    unverifiedRisk: 'High-res document scans broadcasted in WhatsApp chats become fodder for forged certificates and unauthorized loan applications.',
    founditSolution: 'Only issuing institution and document classification are searchable; full names and registration numbers remain gated.',
    flow: [
      'Finder logs document classification & issuing institution',
      'Owner identifies registration and roll digits privately',
      'Administrative verification authenticates university identity',
      'Safe, monitored handover completed at transit authority office'
    ],
    benefitHighlight: 'Prevents identity fraud and protects irreplaceable life documents.'
  }
];

const RealWorldScenarios = () => {
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  const scen = SCENARIOS[selectedScenarioIndex];

  // Auto-play slideshow support
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setSelectedScenarioIndex((prev) => (prev + 1) % SCENARIOS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const handleNext = () => {
    setSelectedScenarioIndex((prev) => (prev + 1) % SCENARIOS.length);
  };

  const handlePrev = () => {
    setSelectedScenarioIndex((prev) => (prev - 1 + SCENARIOS.length) % SCENARIOS.length);
  };

  return (
    <section className="foundit-section foundit-section-muted" id="scenarios">
      <div className="foundit-container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div className="section-badge">
            <span>🎯</span>
            <span>Real-World Situations &amp; Case Studies</span>
          </div>
          <h2 className="section-title-large">
            How FoundiT Solves Everyday Recovery Challenges
          </h2>
          <p className="section-desc-lead">
            Explore how our structured zero-trust protocol safeguards community members across common loss situations—contrasting risky unverified channels with audited, verified resolutions.
          </p>
        </div>

        {/* Scenario Carousel Tab Selector */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 32
        }}>
          {SCENARIOS.map((item, idx) => {
            const isSelected = selectedScenarioIndex === idx;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedScenarioIndex(idx)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 9999,
                  border: `1.5px solid ${isSelected ? '#0F172A' : '#E2E8F0'}`,
                  background: isSelected ? '#0F172A' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#475569',
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: isSelected ? '0 4px 14px rgba(15, 23, 42, 0.15)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                <span>{item.icon}</span>
                <span>{item.title.split(' ')[1]} {item.title.split(' ')[2]}</span>
                {isSelected && (
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: item.accentColor
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Main Dynamic Slide Showcase Card */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 28,
          padding: '40px',
          boxShadow: '0 20px 45px -12px rgba(0, 0, 0, 0.05)',
          marginBottom: 32
        }}>
          {/* Slide Header Banner */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
            paddingBottom: 24,
            borderBottom: '1px solid #F1F5F9',
            marginBottom: 28
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: scen.accentColor,
                  background: scen.accentLight,
                  border: `1px solid ${scen.accentBorder}`,
                  padding: '3px 10px',
                  borderRadius: 6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {scen.category}
                </span>
                <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>
                  📍 {scen.situation}
                </span>
              </div>

              <h3 style={{
                margin: 0,
                fontSize: 'clamp(22px, 2.5vw, 28px)',
                fontWeight: 800,
                color: '#0F172A',
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}>
                <span>{scen.icon}</span>
                <span>{scen.title}</span>
              </h3>
            </div>

            {/* Slide Pagination & Navigation Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12.5, color: '#64748B', fontWeight: 700, marginRight: 4 }}>
                Case {selectedScenarioIndex + 1} of {SCENARIOS.length}
              </span>

              <button
                onClick={handlePrev}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  color: '#0F172A',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 800,
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#E2E8F0'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#F8FAFC'; }}
              >
                ←
              </button>

              <button
                onClick={handleNext}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: '#0F172A',
                  border: 'none',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 800,
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#1E293B'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#0F172A'; }}
              >
                →
              </button>

              <button
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                title={isAutoPlaying ? 'Pause automatic slideshow' : 'Play automatic slideshow'}
                style={{
                  padding: '7px 12px',
                  borderRadius: 8,
                  background: isAutoPlaying ? scen.accentLight : '#F8FAFC',
                  border: `1px solid ${isAutoPlaying ? scen.accentBorder : '#E2E8F0'}`,
                  color: isAutoPlaying ? scen.accentColor : '#64748B',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {isAutoPlaying ? '⏸️ Auto' : '▶️ Auto'}
              </button>
            </div>
          </div>

          {/* Narrative Paragraph */}
          <p style={{
            fontSize: 15,
            color: '#475569',
            lineHeight: 1.75,
            margin: '0 0 28px 0',
            maxWidth: 880
          }}>
            {scen.narrative}
          </p>

          {/* Side-by-Side Comparison: Traditional Risk vs FoundiT Resolution */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 24,
            marginBottom: 32
          }} className="scenario-comparison-grid">
            {/* Left: The Traditional Social Risk */}
            <div style={{
              background: '#FFF1F2',
              border: '1px solid #FECDD3',
              borderRadius: 18,
              padding: '22px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                fontWeight: 800,
                color: '#E11D48',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <span>❌</span>
                <span>The Unregulated Social Vulnerability</span>
              </div>
              <p style={{ margin: 0, fontSize: 13.5, color: '#9F1239', lineHeight: 1.6 }}>
                {scen.unverifiedRisk}
              </p>
            </div>

            {/* Right: The FoundiT Controlled Resolution */}
            <div style={{
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              borderRadius: 18,
              padding: '22px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                fontWeight: 800,
                color: '#059669',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <span>✅</span>
                <span>The FoundiT Zero-Trust Resolution</span>
              </div>
              <p style={{ margin: 0, fontSize: 13.5, color: '#065F46', lineHeight: 1.6 }}>
                {scen.founditSolution}
              </p>
            </div>
          </div>

          {/* 4-Step Resolution Milestone Track */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 18,
            padding: '22px 26px'
          }}>
            <div style={{
              fontSize: 11.5,
              fontWeight: 800,
              color: '#0F172A',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <span>⚡</span>
              <span>Audited 4-Step Milestone Pathway</span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16
            }} className="scenario-milestone-grid">
              {scen.flow.map((step, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 14,
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}
                >
                  <div style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: scen.accentColor,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <span>Phase 0{idx + 1}</span>
                    <span>✓</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.5, fontWeight: 500 }}>
                    {step}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Metrics & Impact Summary Strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16
        }} className="scenario-stats-grid">
          {[
            { label: 'Core Loss Archetypes', val: '4 Categories', icon: '🎯' },
            { label: 'Public PII Leaks', val: 'Zero Leaks (0%)', icon: '🛡️' },
            { label: 'Double-Blind Accuracy', val: '99.4% Verified', icon: '✅' },
            { label: 'Average Resolution Time', val: '< 48 Hours', icon: '⏱️' }
          ].map((stat, i) => (
            <div
              key={i}
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 18,
                padding: '20px',
                textAlign: 'center',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)'
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 6 }}>{stat.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 2 }}>
                {stat.val}
              </div>
              <div style={{ fontSize: 12, color: '#64748B' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RealWorldScenarios;
