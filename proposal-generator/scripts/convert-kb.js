// Script to convert safebase knowledge CSV to JSON
const fs = require('fs');
const path = require('path');

// Read CSV file
const csvPath = '/Users/julian/cc/safebase_knowledge/comma-separated values.csv';
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV (handle quoted fields with commas and newlines)
function parseCSV(content) {
  const lines = [];
  let currentLine = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentLine.push(currentField);
      currentField = '';
    } else if (char === '\n' && !inQuotes) {
      currentLine.push(currentField);
      if (currentLine.length > 1 || currentLine[0]) {
        lines.push(currentLine);
      }
      currentLine = [];
      currentField = '';
    } else if (char !== '\r') {
      currentField += char;
    }
  }

  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField);
    lines.push(currentLine);
  }

  return lines;
}

// Categorize based on keywords
function categorize(question, answer) {
  const text = (question + ' ' + answer).toLowerCase();

  if (text.match(/security|soc\s*2|penetration|vulnerability|malware|antivirus|firewall|breach|incident/)) {
    return 'security';
  }
  if (text.match(/compliance|gdpr|ccpa|hipaa|privacy|regulation|audit|certification|certif/)) {
    return 'compliance';
  }
  if (text.match(/\bai\b|machine learning|model|llm|openai|anthropic|hallucin|guardrail/)) {
    return 'ai';
  }
  if (text.match(/integrat|api|workday|slack|teams|sharepoint|hcm|hris|sso|oauth/)) {
    return 'integration';
  }
  if (text.match(/implement|deploy|onboard|timeline|migration|setup|install/)) {
    return 'implementation';
  }
  if (text.match(/price|cost|fee|pricing|license|subscription/)) {
    return 'pricing';
  }
  if (text.match(/support|sla|help|training|documentation|customer success/)) {
    return 'support';
  }
  if (text.match(/company|founded|employee|headquart|team|about us|wisq is/)) {
    return 'company';
  }
  if (text.match(/encrypt|data\s*(at\s*rest|in\s*transit)|backup|retention|storage/)) {
    return 'data_protection';
  }
  if (text.match(/access|authentication|password|mfa|role|permission|rbac/)) {
    return 'access_control';
  }

  return 'other';
}

// Extract tags from question/answer
function extractTags(question, answer) {
  const tags = new Set();
  const text = (question + ' ' + answer).toLowerCase();

  const tagPatterns = [
    [/encrypt/i, 'encryption'],
    [/soc\s*2/i, 'soc2'],
    [/gdpr/i, 'gdpr'],
    [/ccpa/i, 'ccpa'],
    [/hipaa/i, 'hipaa'],
    [/aws/i, 'aws'],
    [/sso/i, 'sso'],
    [/mfa|multi.factor/i, 'mfa'],
    [/api/i, 'api'],
    [/backup/i, 'backup'],
    [/disaster.recovery/i, 'disaster-recovery'],
    [/penetration/i, 'penetration-testing'],
    [/vulnerability/i, 'vulnerability'],
    [/data.retention/i, 'data-retention'],
    [/audit/i, 'audit'],
    [/workday/i, 'workday'],
    [/slack/i, 'slack'],
    [/teams/i, 'teams'],
    [/sharepoint/i, 'sharepoint'],
    [/openai/i, 'openai'],
    [/anthropic/i, 'anthropic'],
    [/llm/i, 'llm'],
    [/zero.data.retention|zdr/i, 'zdr'],
  ];

  for (const [pattern, tag] of tagPatterns) {
    if (pattern.test(text)) {
      tags.add(tag);
    }
  }

  return Array.from(tags);
}

// Parse the CSV
const rows = parseCSV(csvContent);
const headers = rows[0];
const dataRows = rows.slice(1);

console.log(`Parsed ${dataRows.length} entries`);

// Convert to knowledge base format
const entries = [];
const seenQuestions = new Set();

for (let i = 0; i < dataRows.length; i++) {
  const row = dataRows[i];
  const question = (row[0] || '').trim();
  const answer = (row[1] || '').trim();
  const comment = (row[2] || '').trim();
  const access = (row[3] || '').trim();

  // Skip empty or duplicate questions
  if (!question || question.length < 10) continue;
  if (!answer || answer.length < 3) continue;

  // Skip entries that are just headers or placeholders
  if (answer === 'Wisq Reponses' || answer === 'Not applicable') continue;

  // Deduplicate by question text
  const normalizedQ = question.toLowerCase().replace(/[^\w\s]/g, '');
  if (seenQuestions.has(normalizedQ)) continue;
  seenQuestions.add(normalizedQ);

  const category = categorize(question, answer);
  const tags = extractTags(question, answer);

  entries.push({
    id: `kb-${String(i + 1).padStart(3, '0')}`,
    question,
    answer,
    category,
    tags,
    access: access === 'Private' ? 'private' : 'internal'
  });
}

console.log(`Created ${entries.length} unique entries`);

// Create the JSON structure
const knowledgeBase = {
  metadata: {
    lastUpdated: new Date().toISOString().split('T')[0],
    entryCount: entries.length,
    source: 'safebase_knowledge'
  },
  entries
};

// Write to file
const outputPath = path.join(__dirname, '..', 'src', 'data', 'wisq-knowledge-base.json');

// Ensure directory exists
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(knowledgeBase, null, 2));
console.log(`Written to ${outputPath}`);

// Print category breakdown
const categoryCount = {};
for (const entry of entries) {
  categoryCount[entry.category] = (categoryCount[entry.category] || 0) + 1;
}
console.log('\nCategory breakdown:');
for (const [cat, count] of Object.entries(categoryCount).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${cat}: ${count}`);
}
