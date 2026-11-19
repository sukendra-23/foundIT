import React, { useState } from 'react';

const FAQS = [
  {
    q: 'What is FoundiT?',
    a: 'FoundiT is a full-stack, community-powered lost and found recovery platform. It provides a structured environment where individuals can report lost belongings, list found items, discover matches through intelligent criteria, and safely verify ownership under administrative oversight.',
    category: 'General'
  },
  {
    q: 'How do I report a lost item?',
    a: 'Log into your FoundiT account, navigate to "Report Lost", and fill in the item details including title, category, description, brand, model, color, date lost, and the location where it went missing. You can also upload up to 5 clear photos to help finders recognize it.',
    category: 'Reporting'
  },
  {
    q: 'How do I report an item I have found?',
    a: 'Click "Report Found" after signing in. Provide the general location, date discovered, and item category along with photos. We advise keeping certain identifying marks (such as specific keychain charms or internal wallet contents) partially concealed so claimants can verify themselves later.',
    category: 'Reporting'
  },
  {
    q: 'How can I identify a possible match?',
    a: 'FoundiT features an automated matching engine that cross-references categories, geographic perimeters, and dates. You can also use our live Search bar with filters to browse listings across campus and community locations.',
    category: 'Discovery'
  },
  {
    q: 'How do I prove that an item belongs to me?',
    a: 'When filing a claim or responding to a found listing, you provide specific evidence that only the genuine owner would know: purchase receipts, serial/IMEI numbers, unique scratches, or internal contents. Both the finder and platform moderators inspect this proof.',
    category: 'Verification'
  },
  {
    q: 'Why is administrator approval required?',
    a: 'Administrative review acts as an impartial safeguard. It ensures that claimants provide authentic proof, prevents fraudulent claims by bad actors, eliminates spam, and guarantees that community guidelines and privacy standards are upheld before any personal contact occurs.',
    category: 'Verification'
  },
  {
    q: 'Can I directly contact the finder or owner?',
    a: 'Direct contact is disabled during initial reporting to safeguard personal phone numbers and avoid harassment. Direct in-app communication is enabled only after an administrator reviews the evidence and approves the recovery claim.',
    category: 'Safety & Handover'
  },
  {
    q: 'When does messaging become available?',
    a: 'Messaging unlocks automatically inside the Messages dashboard as soon as a claim or recovery report reaches "APPROVED" status. Until then, the messaging portal displays a secure locked indicator.',
    category: 'Safety & Handover'
  },
  {
    q: 'Does approval automatically mean that my item has been returned?',
    a: 'No. Administrative approval certifies that ownership evidence has been verified and authorizes the participants to communicate. The actual physical handover is coordinated and conducted separately by the owner and finder.',
    category: 'Safety & Handover'
  },
  {
    q: 'How can I coordinate the physical handover?',
    a: 'Once messaging is unlocked, both parties can discuss a mutually convenient, well-lit, public meeting location—such as a campus security office, university library information desk, or local transit customer service center.',
    category: 'Safety & Handover'
  },
  {
    q: 'What happens if a recovery submission is rejected?',
    a: 'If a claim does not meet verification criteria or conflicts with authentic evidence, administrators reject it with a recorded explanation. The parent listing remains active so legitimate owners can still discover and claim it.',
    category: 'Verification'
  },
  {
    q: 'How is my personal information protected?',
    a: 'We never publish your email address, phone number, or home address on public item listings. Communications take place through our internal messaging service, accounts are secured via OTP authentication, and all interactions are backed by database audit logs.',
    category: 'General'
  }
];

const CATEGORIES = ['All', 'General', 'Reporting', 'Discovery', 'Verification', 'Safety & Handover'];

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState(0); // First item open by default
  const [activeCategory, setActiveCategory] = useState('All');
  const [filterQuery, setFilterQuery] = useState('');

  const filteredFaqs = FAQS.filter(faq => {
    const matchesCat = activeCategory === 'All' || faq.category === activeCategory;
    const matchesQuery = filterQuery.trim() === '' ||
      faq.q.toLowerCase().includes(filterQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(filterQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const toggleItem = (idx) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="foundit-section foundit-section-muted" id="faq">
      <div className="foundit-container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div className="section-badge">
            <span>❓</span>
            <span>Knowledge Base</span>
          </div>
          <h2 className="section-title-large">
            Frequently Asked Questions
          </h2>
          <p className="section-desc-lead">
            Everything you need to know about reporting, evidence verification, administrative approval, and safe handover coordination.
          </p>
        </div>

        {/* Category Pills & Search Filter */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          marginBottom: 32
        }}>
          {/* Category Tabs */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 8
          }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 9999,
                  border: '1px solid',
                  borderColor: activeCategory === cat ? '#4361EE' : '#E2E8F0',
                  background: activeCategory === cat ? '#4361EE' : '#FFFFFF',
                  color: activeCategory === cat ? '#FFFFFF' : '#475569',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.18s ease'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div style={{ width: '100%', maxWidth: 440 }}>
            <input
              type="text"
              placeholder="Filter questions (e.g. 'messaging', 'approval', 'handover')..."
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: 12,
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                fontSize: 13,
                outline: 'none',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
            />
          </div>
        </div>

        {/* Accordion List */}
        <div className="faq-accordion-list">
          {filteredFaqs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0', color: '#64748B' }}>
              No matching questions found for "{filterQuery}".
            </div>
          ) : (
            filteredFaqs.map((faq, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div key={idx} className={`faq-item ${isOpen ? 'open' : ''}`}>
                  <button
                    className="faq-trigger"
                    onClick={() => toggleItem(idx)}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <span className="faq-icon-pill">
                      {isOpen ? '✕' : '+'}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="faq-content">
                      <p style={{ margin: 0 }}>
                        {faq.a}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
