import React, { useState } from 'react';

const VERIFICATION_SIMULATOR_STAGES = [
  {
    stage: 1,
    tag: 'Stage 01',
    name: 'Double-Blind Evidence Submission',
    actor: 'Owner & Finder',
    badgeColor: '#F43F5E',
    badgeBg: '#FFF1F2',
    icon: '📝',
    headline: 'Private Proof Without Data Leaks',
    desc: 'The claimant documents unique item traits (such as serial digits, unlock screen configuration, or receipts) into an encrypted vault. The finder documents external attributes while keeping identifiers partially concealed.',
    securityChecks: [
      { label: 'PII Data Sanitization', status: 'Passed', detail: 'Names, phone numbers & serials are cryptographically masked' },
      { label: 'Anti-Brute Force Protection', status: 'Enforced', detail: 'Prevents automated multiple guessing attempts' },
      { label: 'Geospatial Radius Check', status: 'Correlated', detail: 'Matches reported loss radius against discovery coordinates' }
    ],
    technicalArtifact: {
      type: 'PAYLOAD HASH',
      key: 'sha256: 9e4f••••••3c2b',
      access: 'Restricted (Admin & System Only)'
    }
  },
  {
    stage: 2,
    tag: 'Stage 02',
    name: 'Finder Collaborative Review',
    actor: 'Community Finder',
    badgeColor: '#D97706',
    badgeBg: '#FEF3C7',
    icon: '👥',
    headline: 'Corroborating Physical Custody',
    desc: 'The community finder receives a sanitized verification prompt. They confirm whether the claimant’s description matches the physical item in their possession, without ever seeing the claimant’s personal phone or email.',
    securityChecks: [
      { label: 'Double-Blind Prompting', status: 'Active', detail: 'Finder answers specific trait questions without leading clues' },
      { label: 'Zero Direct Contact Gate', status: 'Locked', detail: 'In-app and phone messaging remains locked to prevent pressure' },
      { label: 'Independent Attestation', status: 'Recorded', detail: 'Finder testimony is permanently appended to case file' }
    ],
    technicalArtifact: {
      type: 'FINDER ATTESTATION',
      key: 'verdict: CONFIRMED_MATCH',
      access: 'Forwarded to Administrative Moderation Queue'
    }
  },
  {
    stage: 3,
    tag: 'Stage 03',
    name: 'Independent Administrative Review',
    actor: 'Platform Administrator',
    badgeColor: '#0284C7',
    badgeBg: '#F0F9FF',
    icon: '⚖️',
    headline: 'Objective Human & Algorithmic Audit',
    desc: 'Certified administrators inspect corroborating photos, purchase invoices, and finder feedback against strict platform guidelines before authorizing any physical exchange.',
    securityChecks: [
      { label: 'Administrative Cross-Audit', status: 'Approved', detail: 'Manual review of retail invoices or hardware markings' },
      { label: 'Dispute & Abuse History Scan', status: 'Clean (0 Flags)', detail: 'Claimant and finder profiles audited for past compliance' },
      { label: 'Immutable Decision Stamping', status: 'Signed', detail: 'Formal approval stamped into tamper-evident database log' }
    ],
    technicalArtifact: {
      type: 'ADMIN DECISION SIGNATURE',
      key: 'decision: AUTHORIZED_BY_ADMIN',
      access: 'Appended to Audit Trail Log'
    }
  },
  {
    stage: 4,
    tag: 'Stage 04',
    name: 'Gated Communication & Handover',
    actor: 'Owner, Finder & Security',
    badgeColor: '#059669',
    badgeBg: '#ECFDF5',
    icon: '🤝',
    headline: 'Safe Public Reunification',
    desc: 'Only after administrative approval is granted does direct in-app messaging unlock. Participants arrange meeting points in public, monitored campus or municipal locations.',
    securityChecks: [
      { label: 'Controlled Chat Room', status: 'Unlocked', detail: 'Built-in chat with active automated content moderation' },
      { label: 'Designated Safe Exchange Spots', status: 'Recommended', detail: 'Pre-vetted public campus security desks or information hubs' },
      { label: 'Resolution Handshake Sign-Off', status: 'Completed', detail: 'Both parties confirm successful return to close the lifecycle' }
    ],
    technicalArtifact: {
      type: 'CASE LIFECYCLE RESOLUTION',
      key: 'status: RECOVERY_SUCCESS',
      access: 'Archived Permanently'
    }
  }
];

const COMPARISON_ROWS = [
  {
    criterion: 'Personal Phone & Email Privacy',
    traditional: '❌ Phone numbers & personal IDs posted publicly on WhatsApp / Telegram / Facebook',
    foundit: '✅ Zero public exposure. Identities masked; communication gated until admin approval',
    accent: '#059669'
  },
  {
    criterion: 'Claimant Verification & Fraud Prevention',
    traditional: '❌ Anyone in the chat group can direct-message finder claiming it belongs to them',
    foundit: '✅ Double-blind proof requirement; invoices or distinguishing quirks checked independently',
    accent: '#059669'
  },
  {
    criterion: 'Finder Safety & Protection',
    traditional: '❌ Finders face aggressive harassment, random callers, and fraudulent demands',
    foundit: '✅ Finder identity protected; administrators handle moderation and screen inquiries',
    accent: '#059669'
  },
  {
    criterion: 'Dispute Resolution & Audit Records',
    traditional: '❌ Zero historical records; impossible to prove who originally received the item',
    foundit: '✅ Append-only tamper-evident audit logs preserve every action and timestamp',
    accent: '#059669'
  },
  {
    criterion: 'Centralization & Searchability',
    traditional: '❌ Posts buried within minutes; fragmented across dozens of unlinked groups',
    foundit: '✅ Unified institutional database with real-time geospatial matching alerts',
    accent: '#059669'
  }
];

const TRUST_PILLARS = [
  {
    icon: '🛡️',
    title: 'Evidence-Based Verification',
    badge: 'Zero Assumptions',
    desc: 'Claimants must furnish specific details—such as distinctive marks, unlock patterns, serial codes, or receipts—preventing opportunistic possession claims.'
  },
  {
    icon: '👥',
    title: 'Finder Review Participation',
    badge: 'Double Blind',
    desc: 'The finder reviews submitted claim specifics directly and provides feedback to confirm or contest whether the claimant truly identified the item.'
  },
  {
    icon: '⚖️',
    title: 'Independent Administrative Review',
    badge: 'Certified Gatekeepers',
    desc: 'Platform administrators inspect both the lost report and finder recovery documentation before approving any handover interaction.'
  },
  {
    icon: '🔒',
    title: 'Gated Communication & Privacy',
    badge: 'PII Protected',
    desc: 'Direct messaging remains locked until official review approval. Phone numbers, emails, and exact home addresses are never published to the public.'
  },
  {
    icon: '📜',
    title: 'Append-Only Audit Trails',
    badge: 'Immutable Database Logs',
    desc: 'Every status transition, decision justification, and participant action is preserved in tamper-evident database audit logs for dispute resolution.'
  },
  {
    icon: '🚨',
    title: 'Active Abuse Reporting & Moderation',
    badge: 'Real-Time Oversight',
    desc: 'Users can flag inappropriate messages or suspicious claims directly to administration for prompt investigation and platform enforcement.'
  }
];

const TrustAndSafety = () => {
  const [activeTab, setActiveTab] = useState('simulator'); // 'simulator' | 'comparison'
  const [selectedStageIndex, setSelectedStageIndex] = useState(0);

  const activeStage = VERIFICATION_SIMULATOR_STAGES[selectedStageIndex];

  return (
    <section className="foundit-section foundit-section-alt" id="trust-and-safety">
      <div className="foundit-container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div className="section-badge section-badge-emerald">
            <span>🛡️</span>
            <span>Security &amp; Integrity Architecture</span>
          </div>
          <h2 className="section-title-large">
            Built Around Trust, Safety &amp; Accountability
          </h2>
          <p className="section-desc-lead">
            Reuniting lost belongings requires more than good intentions. We enforce strict double-blind verification, administrative moderation gates, and immutable audit trails to protect your privacy.
          </p>
        </div>

        {/* View Mode Toggle: Interactive Simulator vs Comparison */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
          <div style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 9999,
            padding: 5,
            display: 'inline-flex',
            gap: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <button
              onClick={() => setActiveTab('simulator')}
              style={{
                padding: '10px 22px',
                borderRadius: 9999,
                border: 'none',
                background: activeTab === 'simulator' ? '#0F172A' : 'transparent',
                color: activeTab === 'simulator' ? '#FFFFFF' : '#475569',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s ease'
              }}
            >
              <span>🔬</span>
              <span>4-Stage Security Simulator</span>
            </button>

            <button
              onClick={() => setActiveTab('comparison')}
              style={{
                padding: '10px 22px',
                borderRadius: 9999,
                border: 'none',
                background: activeTab === 'comparison' ? '#0F172A' : 'transparent',
                color: activeTab === 'comparison' ? '#FFFFFF' : '#475569',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s ease'
              }}
            >
              <span>⚖️</span>
              <span>Traditional vs FoundiT Protocol</span>
            </button>
          </div>
        </div>

        {/* TAB 1: 4-STAGE INTERACTIVE SECURITY SIMULATOR */}
        {activeTab === 'simulator' && (
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 28,
            padding: '36px',
            boxShadow: '0 20px 45px -12px rgba(0, 0, 0, 0.05)',
            marginBottom: 44
          }}>
            {/* Stage Selector Pills */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 12,
              marginBottom: 32
            }} className="trust-stepper-grid">
              {VERIFICATION_SIMULATOR_STAGES.map((stg, i) => {
                const isSelected = selectedStageIndex === i;
                return (
                  <button
                    key={stg.stage}
                    onClick={() => setSelectedStageIndex(i)}
                    style={{
                      background: isSelected ? '#FFFFFF' : '#F8FAFC',
                      border: `1.5px solid ${isSelected ? '#0F172A' : '#E2E8F0'}`,
                      borderRadius: 16,
                      padding: '16px 18px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      boxShadow: isSelected ? '0 8px 20px -6px rgba(15, 23, 42, 0.12)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: stg.badgeColor,
                        letterSpacing: '0.05em'
                      }}>
                        {stg.tag}
                      </span>
                      <span style={{ fontSize: 18 }}>{stg.icon}</span>
                    </div>

                    <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>
                      {stg.name}
                    </div>

                    <div style={{ fontSize: 11.5, color: '#64748B' }}>
                      Actor: {stg.actor}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Stage Live Diagnostic Panel */}
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 20,
              padding: '28px',
              display: 'grid',
              gridTemplateColumns: '1.2fr 0.8fr',
              gap: 32,
              alignItems: 'center'
            }} className="trust-diagnostic-grid">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: activeStage.badgeColor,
                    background: activeStage.badgeBg,
                    padding: '3px 10px',
                    borderRadius: 6
                  }}>
                    {activeStage.tag} Active Analysis
                  </span>
                  <span style={{ fontSize: 12.5, color: '#64748B', fontWeight: 600 }}>
                    Governed by FoundiT Trust Standard
                  </span>
                </div>

                <h3 style={{ margin: '0 0 10px 0', fontSize: 22, fontWeight: 800, color: '#0F172A' }}>
                  {activeStage.headline}
                </h3>

                <p style={{ margin: '0 0 20px 0', fontSize: 14, color: '#475569', lineHeight: 1.7 }}>
                  {activeStage.desc}
                </p>

                {/* Technical Cryptographic Artifact */}
                <div style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 12,
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 12
                }}>
                  <div>
                    <span style={{ color: '#64748B', fontWeight: 600 }}>{activeStage.technicalArtifact.type}: </span>
                    <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>{activeStage.technicalArtifact.key}</strong>
                  </div>
                  <span style={{ color: '#059669', fontWeight: 700 }}>
                    {activeStage.technicalArtifact.access}
                  </span>
                </div>
              </div>

              {/* Right: Security Checkpoints List */}
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 16,
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)'
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  🛡️ Active Security Checkpoints
                </div>

                {activeStage.securityChecks.map((chk, idx) => (
                  <div key={idx} style={{
                    paddingBottom: idx < activeStage.securityChecks.length - 1 ? 12 : 0,
                    borderBottom: idx < activeStage.securityChecks.length - 1 ? '1px solid #F1F5F9' : 'none'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>{chk.label}</span>
                      <span style={{
                        fontSize: 10.5,
                        fontWeight: 800,
                        color: '#059669',
                        background: '#ECFDF5',
                        border: '1px solid #A7F3D0',
                        padding: '2px 8px',
                        borderRadius: 9999
                      }}>
                        ✓ {chk.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748B' }}>
                      {chk.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SIDE-BY-SIDE COMPARISON MATRIX */}
        {activeTab === 'comparison' && (
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 28,
            padding: '36px',
            boxShadow: '0 20px 45px -12px rgba(0, 0, 0, 0.05)',
            marginBottom: 44,
            overflowX: 'auto'
          }}>
            <div style={{ minWidth: 680 }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1.4fr 1.4fr',
                paddingBottom: 16,
                borderBottom: '2px solid #E2E8F0',
                marginBottom: 16,
                fontWeight: 800,
                fontSize: 13,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <div style={{ color: '#64748B' }}>Protection Pillar</div>
                <div style={{ color: '#DC2626' }}>Traditional Unregulated Socials</div>
                <div style={{ color: '#059669' }}>FoundiT Zero-Trust Architecture</div>
              </div>

              {COMPARISON_ROWS.map((row, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1.4fr 1.4fr',
                    gap: 16,
                    padding: '18px 0',
                    borderBottom: idx < COMPARISON_ROWS.length - 1 ? '1px solid #F1F5F9' : 'none',
                    fontSize: 13.5,
                    lineHeight: 1.55,
                    alignItems: 'center'
                  }}
                >
                  <div style={{ fontWeight: 800, color: '#0F172A' }}>
                    {row.criterion}
                  </div>
                  <div style={{
                    color: '#475569',
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    padding: '10px 14px',
                    borderRadius: 10,
                    fontSize: 12.5
                  }}>
                    {row.traditional}
                  </div>
                  <div style={{
                    color: '#064E3B',
                    background: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    padding: '10px 14px',
                    borderRadius: 10,
                    fontSize: 12.5,
                    fontWeight: 600
                  }}>
                    {row.foundit}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6 Trust Pillars Grid (Light & Sleek) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 20
        }}>
          {TRUST_PILLARS.map((pillar, i) => (
            <div
              key={i}
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 20,
                padding: '24px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 12px 24px -4px rgba(0, 0, 0, 0.06)';
                e.currentTarget.style.borderColor = '#CBD5E1';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.02)';
                e.currentTarget.style.borderColor = '#E2E8F0';
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontSize: 28 }}>{pillar.icon}</span>
                  <span style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    color: '#0F172A',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    padding: '3px 10px',
                    borderRadius: 9999
                  }}>
                    {pillar.badge}
                  </span>
                </div>

                <h4 style={{ margin: '0 0 8px 0', fontSize: 16.5, fontWeight: 800, color: '#0F172A' }}>
                  {pillar.title}
                </h4>

                <p style={{ margin: 0, fontSize: 13, color: '#64748B', lineHeight: 1.65 }}>
                  {pillar.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustAndSafety;
