-- USERS table
CREATE TABLE IF NOT EXISTS USERS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('USER', 'ADMIN') DEFAULT 'USER',
    status ENUM('ACTIVE', 'INACTIVE', 'BANNED') DEFAULT 'ACTIVE',
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- OTP_VERIFICATIONS table
CREATE TABLE IF NOT EXISTS OTP_VERIFICATIONS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    otp_hash VARCHAR(255) NOT NULL,
    attempts INT DEFAULT 0,
    expires_at DATETIME NOT NULL,
    status ENUM('PENDING', 'VERIFIED', 'EXPIRED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES USERS(id) ON DELETE CASCADE
);

-- PASSWORD_RESET_TOKENS table (Dedicated to password reset challenge lifecycle)
CREATE TABLE IF NOT EXISTS PASSWORD_RESET_TOKENS (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    otp_hash        VARCHAR(255) NOT NULL,
    reset_token     VARCHAR(500) NULL,
    attempts        INT DEFAULT 0,
    expires_at      DATETIME NOT NULL,
    consumed        BOOLEAN DEFAULT FALSE,
    revoked         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES USERS(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_expires (expires_at)
);

-- LOST_ITEMS table
CREATE TABLE IF NOT EXISTS LOST_ITEMS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    brand VARCHAR(100),
    model VARCHAR(100),
    color VARCHAR(50),
    identifying_details TEXT,
    location VARCHAR(255) NOT NULL,
    lost_date DATE NOT NULL,
    lost_time TIME,
    status ENUM('OPEN', 'MATCHED', 'RETURNED', 'CLOSED') DEFAULT 'OPEN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES USERS(id) ON DELETE CASCADE
);

-- FOUND_ITEMS table
CREATE TABLE IF NOT EXISTS FOUND_ITEMS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    brand VARCHAR(100),
    model VARCHAR(100),
    color VARCHAR(50),
    identifying_details TEXT,
    location VARCHAR(255) NOT NULL,
    found_date DATE NOT NULL,
    found_time TIME,
    status ENUM('OPEN', 'MATCHED', 'RETURNED', 'CLOSED') DEFAULT 'OPEN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES USERS(id) ON DELETE CASCADE
);

-- ITEM_IMAGES table
CREATE TABLE IF NOT EXISTS ITEM_IMAGES (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lost_item_id INT NULL,
    found_item_id INT NULL,
    image_url TEXT NOT NULL,
    public_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_item_type CHECK (
        (lost_item_id IS NOT NULL AND found_item_id IS NULL) OR
        (found_item_id IS NOT NULL AND lost_item_id IS NULL)
    ),
    FOREIGN KEY (lost_item_id) REFERENCES LOST_ITEMS(id) ON DELETE CASCADE,
    FOREIGN KEY (found_item_id) REFERENCES FOUND_ITEMS(id) ON DELETE CASCADE
);

-- CLAIMS table (Phase 6: Ownership Verification Workflow)
CREATE TABLE IF NOT EXISTS CLAIMS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    found_item_id INT NOT NULL,
    claimant_id INT NOT NULL,
    lost_item_id INT NULL,
    match_id INT NULL,
    claim_reason VARCHAR(255) NULL,
    ownership_details TEXT NULL,
    identifying_marks TEXT NULL,
    lost_date_claimed DATE NULL,
    lost_location_claimed VARCHAR(255) NULL,
    proof_description TEXT NULL,
    status ENUM('PENDING', 'FINDER_REVIEW', 'ADMIN_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN') DEFAULT 'PENDING',
    finder_response VARCHAR(50) NULL,
    finder_notes TEXT NULL,
    finder_responded_at DATETIME NULL,
    additional_info_requested BOOLEAN DEFAULT FALSE,
    additional_info_provided TEXT NULL,
    admin_notes TEXT NULL,
    decision_reason TEXT NULL,
    reviewed_by INT NULL,
    reviewed_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (found_item_id) REFERENCES FOUND_ITEMS(id) ON DELETE CASCADE,
    FOREIGN KEY (claimant_id) REFERENCES USERS(id) ON DELETE CASCADE,
    FOREIGN KEY (lost_item_id) REFERENCES LOST_ITEMS(id) ON DELETE SET NULL,
    FOREIGN KEY (match_id) REFERENCES MATCHES(id) ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by) REFERENCES USERS(id) ON DELETE SET NULL
);

-- CLAIM_EVIDENCE table (Private evidence attachments)
CREATE TABLE IF NOT EXISTS CLAIM_EVIDENCE (
    id INT AUTO_INCREMENT PRIMARY KEY,
    claim_id INT NOT NULL,
    image_url TEXT NOT NULL,
    public_id VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) DEFAULT 'image',
    description VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES CLAIMS(id) ON DELETE CASCADE
);

-- CLAIM_AUDIT_LOGS table (Immutable status & review history)
CREATE TABLE IF NOT EXISTS CLAIM_AUDIT_LOGS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    claim_id INT NOT NULL,
    performed_by INT NOT NULL,
    from_status VARCHAR(50) NULL,
    to_status VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES CLAIMS(id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES USERS(id) ON DELETE CASCADE
);

-- MATCHES table
CREATE TABLE IF NOT EXISTS MATCHES (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lost_item_id INT NOT NULL,
    found_item_id INT NOT NULL,
    score DECIMAL(5, 2) DEFAULT 0.00,
    status ENUM('SUGGESTED', 'CONFIRMED', 'DISMISSED') DEFAULT 'SUGGESTED',
    reviewed_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lost_item_id) REFERENCES LOST_ITEMS(id) ON DELETE CASCADE,
    FOREIGN KEY (found_item_id) REFERENCES FOUND_ITEMS(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES USERS(id) ON DELETE SET NULL
);

-- MESSAGES / CONVERSATIONS (Phase 7: In-App Messaging)
CREATE TABLE IF NOT EXISTS CLAIM_CONVERSATIONS (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    claim_id        INT NOT NULL UNIQUE,
    claimant_id     INT NOT NULL,
    finder_id       INT NOT NULL,
    last_message_at TIMESTAMP NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES CLAIMS(id) ON DELETE CASCADE,
    FOREIGN KEY (claimant_id) REFERENCES USERS(id) ON DELETE CASCADE,
    FOREIGN KEY (finder_id) REFERENCES USERS(id) ON DELETE CASCADE,
    INDEX idx_claim (claim_id),
    INDEX idx_claimant (claimant_id),
    INDEX idx_finder (finder_id),
    INDEX idx_last_message (last_message_at)
);

CREATE TABLE IF NOT EXISTS CLAIM_MESSAGES (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    sender_id       INT NOT NULL,
    message_text    TEXT NOT NULL,
    is_read         BOOLEAN DEFAULT FALSE,
    read_at         DATETIME NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES CLAIM_CONVERSATIONS(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES USERS(id) ON DELETE CASCADE,
    INDEX idx_conversation (conversation_id),
    INDEX idx_sender (sender_id),
    INDEX idx_created (created_at),
    INDEX idx_read (is_read)
);

-- USER_NOTIFICATIONS table (Phase 7 Step 2: In-App Notification Bell)
CREATE TABLE IF NOT EXISTS USER_NOTIFICATIONS (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    type        VARCHAR(50) NOT NULL COMMENT 'CLAIM_SUBMITTED | CLAIM_DECISION | FINDER_REVIEW_REQUESTED | MESSAGE_RECEIVED | ADDITIONAL_INFO_REQUESTED | CLAIM_WITHDRAWN',
    title       VARCHAR(255) NOT NULL,
    body        TEXT,
    link        VARCHAR(500) COMMENT 'Frontend route e.g. /claims/5',
    is_read     BOOLEAN DEFAULT FALSE,
    read_at     DATETIME NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user    (user_id),
    INDEX idx_read    (is_read),
    INDEX idx_created (created_at),
    FOREIGN KEY (user_id) REFERENCES USERS(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- MESSAGE_REPORTS (Phase 7 Feature F: Abuse & Moderation)
CREATE TABLE IF NOT EXISTS MESSAGE_REPORTS (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    message_id       INT NOT NULL,
    conversation_id  INT NOT NULL,
    reporter_id      INT NOT NULL,
    reported_user_id INT NOT NULL,
    reason           VARCHAR(50) NOT NULL COMMENT 'HARASSMENT | SPAM | SCAM_FRAUD | INAPPROPRIATE | OTHER',
    details          TEXT NULL,
    status           VARCHAR(30) DEFAULT 'PENDING' COMMENT 'PENDING | REVIEWED | DISMISSED | ACTION_TAKEN',
    reviewed_by      INT NULL,
    reviewed_at      DATETIME NULL,
    admin_notes      TEXT NULL,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_msg           (message_id),
    INDEX idx_conv          (conversation_id),
    INDEX idx_reporter      (reporter_id),
    INDEX idx_reported_user (reported_user_id),
    INDEX idx_status        (status),
    FOREIGN KEY (message_id) REFERENCES CLAIM_MESSAGES(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES CLAIM_CONVERSATIONS(id) ON DELETE CASCADE,
    FOREIGN KEY (reporter_id) REFERENCES USERS(id) ON DELETE CASCADE,
    FOREIGN KEY (reported_user_id) REFERENCES USERS(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES USERS(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
