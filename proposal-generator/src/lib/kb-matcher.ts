import Fuse from 'fuse.js';
import { KBEntry } from '@/types/proposal';
import knowledgeBase from '@/data/wisq-knowledge-base.json';

// Type assertion for the imported JSON
const kbEntries = knowledgeBase.entries as KBEntry[];

// Configure Fuse.js for fuzzy matching
const fuse = new Fuse(kbEntries, {
  keys: [
    { name: 'question', weight: 0.7 },
    { name: 'answer', weight: 0.2 },
    { name: 'tags', weight: 0.1 },
  ],
  threshold: 0.4, // 0 = exact match, 1 = match anything
  includeScore: true,
  minMatchCharLength: 3,
  ignoreLocation: true,
  findAllMatches: true,
});

export interface KBMatchResult {
  matched: boolean;
  confidence: number;
  kbEntry?: KBEntry;
  score?: number;
}

/**
 * Find the best matching knowledge base entry for a question
 * @param question The question to match
 * @returns Match result with confidence score
 */
export function findKBMatch(question: string): KBMatchResult {
  if (!question || question.trim().length < 10) {
    return { matched: false, confidence: 0 };
  }

  const results = fuse.search(question.trim());

  if (results.length === 0) {
    return { matched: false, confidence: 0 };
  }

  const bestMatch = results[0];
  // Fuse.js score: 0 = perfect match, 1 = no match
  // Convert to confidence: 1 = perfect match, 0 = no match
  const confidence = 1 - (bestMatch.score ?? 1);

  return {
    matched: confidence >= 0.5, // Consider it a match if confidence >= 50%
    confidence,
    kbEntry: bestMatch.item,
    score: bestMatch.score,
  };
}

/**
 * Find multiple matching KB entries for a question
 * @param question The question to match
 * @param limit Maximum number of results
 * @returns Array of match results sorted by confidence
 */
export function findKBMatches(question: string, limit: number = 5): KBMatchResult[] {
  if (!question || question.trim().length < 10) {
    return [];
  }

  const results = fuse.search(question.trim(), { limit });

  return results.map(result => ({
    matched: true,
    confidence: 1 - (result.score ?? 1),
    kbEntry: result.item,
    score: result.score,
  }));
}

/**
 * Get relevant KB context for AI generation
 * Returns top matching entries to provide context for LLM
 * @param question The question to find context for
 * @param limit Maximum number of context entries
 * @returns Array of KB entries relevant to the question
 */
export function getKBContext(question: string, limit: number = 3): KBEntry[] {
  const matches = findKBMatches(question, limit);
  return matches
    .filter(m => m.confidence >= 0.3) // Only include reasonably relevant matches
    .map(m => m.kbEntry!)
    .filter(Boolean);
}

/**
 * Get all KB entries for a specific category
 * @param category The category to filter by
 * @returns Array of KB entries in that category
 */
export function getKBByCategory(category: string): KBEntry[] {
  return kbEntries.filter(entry => entry.category === category);
}

/**
 * Get KB statistics
 */
export function getKBStats() {
  const categories: Record<string, number> = {};
  for (const entry of kbEntries) {
    categories[entry.category] = (categories[entry.category] || 0) + 1;
  }

  return {
    totalEntries: kbEntries.length,
    categories,
    lastUpdated: knowledgeBase.metadata.lastUpdated,
  };
}

export { kbEntries };
