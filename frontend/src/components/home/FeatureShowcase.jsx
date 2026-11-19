import React, { useState } from 'react';

const FEATURES = [
  {
    id: 'reporting',
    badge: 'Precision Data',
    title: 'Detailed Item Reporting',
    subtitle: 'Capturing Every Critical Identifying Trait',
    desc: 'Generic lost item descriptions fail to recover items. FoundiT enables granular reporting with high-resolution evidence photos, specific brand and model designations, color palettes, condition ratings, and precise geographic coordinates.',
    benefit: 'Eliminates ambiguity so genuine owners and finders can recognize the true item immediately.',
    mockup: {
      type: 'form',
      title: 'Item Report: MacBook Pro 14"',
      badge: 'Report #LST-0492',
      badgeColor: '#EF4444',
      items: [
        { label: 'Category', val: 'Electronics / Laptops' },
        { label: 'Identifiers', val: 'Space Gray · Scratch near MagSafe port' },
        { label: 'Location', val: 'Central Library, 2nd Floor Study Room' },
        { label: 'Date & Time', val: 'Yesterday at 16:30' }
      ]
    }
  },
  {
    id: 'discovery',
    badge: 'Multi-Attribute Search',
    title: 'Smart Item Discovery',
    subtitle: 'Connecting Lost Reports with Found Listings',
    desc: 'Our discovery engine cross-references categories, locations, dates, and textual descriptions. Whenever a new found item is listed, owners of similar lost items are surfaced with calculated match relevance scores.',
    benefit: 'Saves hours of scrolling through informal social media groups or physical noticeboards.',
    mockup: {
      type: 'matching',
      title: 'Match Analysis',
      badge: '94% Similarity Score',
      badgeColor: '#10B981',
      items: [
        { label: 'Category Overlap', val: 'Exact Match (Phones / Apple)' },
        { label: 'Geographic Radius', val: 'Within 250 meters (Campus Cafe)' },
        { label: 'Timeline Match', val: 'Reported within 2 hours of discovery' }
      ]
    }
  },
  {
    id: 'verification',
    badge: 'Two-Tier Validation',
    title: 'Structured Ownership Verification',
    subtitle: 'Proof-Based Claim Protection',
    desc: 'FoundiT protects community items from fraudulent claims. When a claimant steps forward, they must submit corroborating evidence—such as distinctive marks, unlock PIN patterns, or receipts—reviewed by both the finder and platform moderators.',
    benefit: 'Ensures items are handed over only to their verified legal owners, not opportunistic impostors.',
    mockup: {
      type: 'verification',
      title: 'Ownership Verification Docket',
      badge: 'Evidence Verified',
      badgeColor: '#3B82F6',
      items: [
        { label: 'Claimant Proof', val: 'Serial number photo matching device invoice' },
        { label: 'Finder Response', val: 'Confirmed identifying keychain tag' },
        { label: 'Review Stage', val: 'Administrative verification cleared' }
      ]
    }
  },
  {
    id: 'management',
    badge: 'Live Tracking',
    title: 'Complete Recovery Management',
    subtitle: 'Full Lifecycle Transparency from Start to Finish',
    desc: 'Never wonder what happened to your claim or submission. The My Recoveries dashboard delivers real-time stage progression across Pending Review, Under Review, Approved, and Handover Coordination with full audit trails.',
    benefit: 'Both finders and owners enjoy complete peace of mind with transparent milestone tracking.',
    mockup: {
      type: 'status',
      title: 'Recovery Tracker #REC-0018',
      badge: 'Stage 3: Approved',
      badgeColor: '#059669',
      items: [
        { label: 'Submission', val: '10 Nov · Evidence submitted by finder' },
        { label: 'Admin Determination', val: '11 Nov · Approved by Moderator' },
        { label: 'Next Milestone', val: 'Direct handover chat unlocked' }
      ]
    }
  },
  {
    id: 'communication',
    badge: 'Gated Privacy',
    title: 'Secure, Approved Communication',
    subtitle: 'Safe Coordination Without Exposing Personal Contacts',
    desc: 'To prevent harassment, spam, and premature handovers, direct messaging is strictly locked until platform administrators inspect the evidence and approve the recovery report. Once unlocked, participants coordinate safely within FoundiT.',
    benefit: 'No need to post personal phone numbers, home addresses, or social handles online.',
    mockup: {
      type: 'chat',
      title: 'Direct Handover Chat',
      badge: 'End-to-End Logged',
      badgeColor: '#8B5CF6',
      items: [
        { label: 'Finder', val: '"I have the keys with the brass guitar keychain."' },
        { label: 'Owner', val: '"Thank you so much! Can we meet at the campus desk?"' },
        { label: 'System Notice', val: '🔒 Messages monitored for safety' }
      ]
    }
  },
  {
    id: 'moderation',
    badge: 'Accountable Governance',
    title: 'Administrative Review & Audit Trails',
    subtitle: 'Human-in-the-Loop Integrity & Dispute Prevention',
    desc: 'Every status transition, feedback submission, and approval decision is immutably logged in append-only audit tables. Platform administrators can intervene, resolve conflicting claims, and enforce campus and community rules.',
    benefit: 'Creates an accountable, dispute-free community standard that institutions can trust.',
    mockup: {
      type: 'audit',
      title: 'Audit & Governance Log',
      badge: 'Audit Record #842',
      badgeColor: '#475569',
      items: [
        { label: 'Action Logged', val: 'Status changed PENDING -> APPROVED' },
        { label: 'Moderator', val: 'Admin Team (Staff ID #04)' },
        { label: 'Integrity Check', val: 'Lock-ordering concurrency check passed' }
      ]
    }
  }
];

const FeatureShowcase = () => {
  return (
    <section className="foundit-section foundit-section-alt" id="features">
      <div className="foundit-container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <div className="section-badge">
            <span>⚡</span>
            <span>Platform Capabilities</span>
          </div>
          <h2 className="section-title-large">
            More Than a Lost &amp; Found Board
          </h2>
          <p className="section-desc-lead">
            FoundiT is an end-to-end recovery operating system. We combine structured reporting, intelligent match discovery, and strict administrative verification to reunite people with what matters.
          </p>
        </div>

        {/* Alternating Editorial Rows */}
        {FEATURES.map((feat, idx) => {
          const isEven = idx % 2 === 1;
          return (
            <div key={feat.id} className={`feature-editorial-row ${isEven ? 'reverse' : ''}`}>
              {/* Text Side */}
              <div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 6,
                  background: '#EEF2FF',
                  color: '#4361EE',
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 12
                }}>
                  {feat.badge}
                </div>

                <h3 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0', letterSpacing: '-0.01em' }}>
                  {feat.title}
                </h3>
                <h4 style={{ fontSize: 15, fontWeight: 600, color: '#4361EE', margin: '0 0 16px 0' }}>
                  {feat.subtitle}
                </h4>

                <p style={{ fontSize: 14.5, color: '#475569', lineHeight: 1.7, margin: '0 0 20px 0' }}>
                  {feat.desc}
                </p>

                {/* Real Benefit Highlight */}
                <div style={{
                  background: '#F8FAFC',
                  borderLeft: '4px solid #4361EE',
                  padding: '12px 16px',
                  borderRadius: '0 12px 12px 0',
                  fontSize: 13,
                  color: '#334155',
                  lineHeight: 1.6
                }}>
                  <strong style={{ color: '#0F172A' }}>Why it matters: </strong>
                  {feat.benefit}
                </div>
              </div>

              {/* Visual Mockup Card */}
              <div className="feature-preview-mockup">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>
                    {feat.mockup.title}
                  </span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: `${feat.mockup.badgeColor}18`,
                    color: feat.mockup.badgeColor,
                    border: `1px solid ${feat.mockup.badgeColor}35`
                  }}>
                    {feat.mockup.badge}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {feat.mockup.items.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: 12,
                        padding: '10px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 12.5
                      }}
                    >
                      <span style={{ color: '#64748B', fontWeight: 600 }}>{item.label}</span>
                      <span style={{ color: '#0F172A', fontWeight: 700, textAlign: 'right', maxWidth: '60%' }}>
                        {item.val}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Subtle Interactive Footer in Mockup */}
                <div style={{
                  marginTop: 16,
                  paddingTop: 12,
                  borderTop: '1px dashed #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  color: '#94A3B8'
                }}>
                  <span>FoundiT Verified Pipeline</span>
                  <span style={{ color: '#10B981', fontWeight: 700 }}>● Active Security Shield</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default FeatureShowcase;
