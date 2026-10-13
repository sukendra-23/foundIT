import pool from '../config/db.js';

// Text Normalization
const normalize = (str) => {
    if (!str) return '';
    return str.toLowerCase().replace(/[^\w\s]/gi, ' ').replace(/\s+/g, ' ').trim();
};

const getKeywords = (str) => {
    const words = normalize(str).split(' ');
    // Filter out extremely common stop words or very short words if needed, here just > 2 chars
    return words.filter(w => w.length > 2);
};

// Scoring Logic
export const calculateScore = (lost, found) => {
    let score = 0;

    // 1. Category (20 points)
    if (lost.category && found.category && lost.category.toLowerCase() === found.category.toLowerCase()) {
        score += 20;
    }

    // 2. Title Keywords (25 points)
    const lostTitleKw = getKeywords(lost.title);
    const foundTitleKw = getKeywords(found.title);
    const titleIntersection = lostTitleKw.filter(kw => foundTitleKw.includes(kw));
    if (titleIntersection.length > 0) {
        // Give full 25 points if there is any meaningful keyword overlap
        score += 25;
    }

    // 3. Brand (15 points)
    if (lost.brand && found.brand && normalize(lost.brand) === normalize(found.brand)) {
        score += 15;
    }

    // 4. Color (10 points)
    if (lost.color && found.color && normalize(lost.color) === normalize(found.color)) {
        score += 10;
    }

    // 5. Location (15 points)
    const lostLocKw = getKeywords(lost.location);
    const foundLocKw = getKeywords(found.location);
    const locIntersection = lostLocKw.filter(kw => foundLocKw.includes(kw));
    if (locIntersection.length > 0) {
        score += 15;
    }

    // 6. Date Proximity (15 points)
    const lostDate = new Date(lost.lost_date);
    const foundDate = new Date(found.found_date);

    // Difference in days (found - lost)
    const diffTime = foundDate - lostDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // A found item usually happens on or AFTER the lost date.
    // Allow up to 2 days before due to timezone/memory fuzziness.
    if (diffDays >= -2 && diffDays <= 7) {
        score += 15; // Within a week
    } else if (diffDays > 7 && diffDays <= 14) {
        score += 10; // Within 2 weeks
    } else if (diffDays > 14 && diffDays <= 30) {
        score += 5; // Within a month
    }

    return score;
};

// Save matches to DB if score >= 50
const saveMatches = async (matches) => {
    if (matches.length === 0) return;

    const values = matches.map(m => [m.lost_item_id, m.found_item_id, m.score]);

    try {
        await pool.query(
            `INSERT IGNORE INTO MATCHES (lost_item_id, found_item_id, score) VALUES ?`,
            [values]
        );
    } catch (err) {
        console.error('Error saving matches:', err);
    }
};

// Run matching for a newly created or updated LOST item
export const runMatchingForLostItem = async (lostItemId) => {
    try {
        const [[lostItem]] = await pool.query('SELECT * FROM LOST_ITEMS WHERE id = ?', [lostItemId]);
        if (!lostItem || lostItem.status !== 'OPEN') return;

        // Fetch all OPEN found items
        const [foundItems] = await pool.query("SELECT * FROM FOUND_ITEMS WHERE status = 'OPEN'");

        const possibleMatches = [];
        for (const found of foundItems) {
            // Skip if it's the same user reporting both (they lost it and found it themselves?)
            if (lostItem.user_id === found.user_id) continue;

            const score = calculateScore(lostItem, found);
            if (score >= 50) {
                possibleMatches.push({
                    lost_item_id: lostItem.id,
                    found_item_id: found.id,
                    score
                });
            }
        }

        await saveMatches(possibleMatches);
    } catch (err) {
        console.error('Matching engine error (Lost Item):', err);
    }
};

// Run matching for a newly created or updated FOUND item
export const runMatchingForFoundItem = async (foundItemId) => {
    try {
        const [[foundItem]] = await pool.query('SELECT * FROM FOUND_ITEMS WHERE id = ?', [foundItemId]);
        if (!foundItem || foundItem.status !== 'OPEN') return;

        // Fetch all OPEN lost items
        const [lostItems] = await pool.query("SELECT * FROM LOST_ITEMS WHERE status = 'OPEN'");

        const possibleMatches = [];
        for (const lost of lostItems) {
            if (foundItem.user_id === lost.user_id) continue;

            const score = calculateScore(lost, foundItem);
            if (score >= 50) {
                possibleMatches.push({
                    lost_item_id: lost.id,
                    found_item_id: foundItem.id,
                    score
                });
            }
        }

        await saveMatches(possibleMatches);
    } catch (err) {
        console.error('Matching engine error (Found Item):', err);
    }
};
