import {
  SavedProposal,
  ProposalStore,
  ProposalInputs,
  ProposalListItem,
  DEFAULT_PRICING,
  DEFAULT_HR_OPERATIONS,
  DEFAULT_LEGAL_COMPLIANCE,
  DEFAULT_EMPLOYEE_EXPERIENCE,
} from '@/types/proposal';

const STORAGE_KEY = 'prop-tart-proposals';
const OLD_STORAGE_KEY = 'wisq-proposal-form-data';

// Generate a unique ID
function generateId(): string {
  return `proposal-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Get the store from localStorage
function getStore(): ProposalStore {
  if (typeof window === 'undefined') {
    return { proposals: [], activeProposalId: null };
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse proposal store:', e);
    }
  }
  return { proposals: [], activeProposalId: null };
}

// Save the store to localStorage
function saveStore(store: ProposalStore): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

// Create default proposal data
function createDefaultProposalData(): ProposalInputs {
  return {
    company: {
      companyName: '',
      industry: 'Technology',
      headquarters: '',
      contactName: '',
      contactTitle: 'CHRO',
      contactEmail: '',
    },
    pricing: DEFAULT_PRICING,
    hrOperations: DEFAULT_HR_OPERATIONS,
    legalCompliance: DEFAULT_LEGAL_COMPLIANCE,
    employeeExperience: DEFAULT_EMPLOYEE_EXPERIENCE,
    painPoints: [],
    integrations: {
      hcm: '',
      identity: '',
      documents: '',
      communication: '',
      ticketing: '',
    },
    nextSteps: ['technical-deepdive', 'pilot-scope'],
  };
}

// Migrate from old storage format
export function migrateFromOldStorage(): SavedProposal | null {
  if (typeof window === 'undefined') return null;

  const oldData = localStorage.getItem(OLD_STORAGE_KEY);
  if (!oldData) return null;

  try {
    const data = JSON.parse(oldData) as Partial<ProposalInputs>;
    const now = new Date().toISOString();

    const proposal: SavedProposal = {
      id: generateId(),
      name: data.company?.companyName || 'Migrated Proposal',
      createdAt: now,
      updatedAt: now,
      data: {
        ...createDefaultProposalData(),
        ...data,
      } as ProposalInputs,
    };

    // Save to new storage
    const store = getStore();
    store.proposals.push(proposal);
    saveStore(store);

    // Remove old storage
    localStorage.removeItem(OLD_STORAGE_KEY);

    return proposal;
  } catch (e) {
    console.error('Failed to migrate old proposal data:', e);
    return null;
  }
}

// Get all proposals
export function getAllProposals(): SavedProposal[] {
  return getStore().proposals;
}

// Get proposals as list items (lighter weight for display)
export function getProposalList(): ProposalListItem[] {
  return getStore().proposals.map(p => ({
    id: p.id,
    name: p.name,
    companyName: p.data.company?.companyName || 'Unnamed',
    industry: p.data.company?.industry || 'Unknown',
    updatedAt: p.updatedAt,
  }));
}

// Get a single proposal by ID
export function getProposal(id: string): SavedProposal | null {
  const store = getStore();
  return store.proposals.find(p => p.id === id) || null;
}

// Create a new proposal
export function createProposal(name?: string): SavedProposal {
  const now = new Date().toISOString();
  const proposal: SavedProposal = {
    id: generateId(),
    name: name || 'New Proposal',
    createdAt: now,
    updatedAt: now,
    data: createDefaultProposalData(),
  };

  const store = getStore();
  store.proposals.push(proposal);
  store.activeProposalId = proposal.id;
  saveStore(store);

  return proposal;
}

// Save/update a proposal
export function saveProposal(proposal: SavedProposal): void {
  const store = getStore();
  const index = store.proposals.findIndex(p => p.id === proposal.id);

  const updatedProposal = {
    ...proposal,
    updatedAt: new Date().toISOString(),
    // Auto-update name from company name if it was default
    name: proposal.name === 'New Proposal' && proposal.data.company?.companyName
      ? proposal.data.company.companyName
      : proposal.name,
  };

  if (index >= 0) {
    store.proposals[index] = updatedProposal;
  } else {
    store.proposals.push(updatedProposal);
  }

  saveStore(store);
}

// Update proposal data (convenience function)
export function updateProposalData(id: string, data: ProposalInputs): void {
  const proposal = getProposal(id);
  if (proposal) {
    saveProposal({ ...proposal, data });
  }
}

// Update proposal name
export function updateProposalName(id: string, name: string): void {
  const proposal = getProposal(id);
  if (proposal) {
    saveProposal({ ...proposal, name });
  }
}

// Delete a proposal
export function deleteProposal(id: string): void {
  const store = getStore();
  store.proposals = store.proposals.filter(p => p.id !== id);
  if (store.activeProposalId === id) {
    store.activeProposalId = null;
  }
  saveStore(store);
}

// Duplicate a proposal
export function duplicateProposal(id: string): SavedProposal | null {
  const original = getProposal(id);
  if (!original) return null;

  const now = new Date().toISOString();
  const duplicate: SavedProposal = {
    id: generateId(),
    name: `${original.name} (Copy)`,
    createdAt: now,
    updatedAt: now,
    data: JSON.parse(JSON.stringify(original.data)), // Deep clone
  };

  const store = getStore();
  store.proposals.push(duplicate);
  saveStore(store);

  return duplicate;
}

// Get/set active proposal ID
export function getActiveProposalId(): string | null {
  return getStore().activeProposalId;
}

export function setActiveProposalId(id: string | null): void {
  const store = getStore();
  store.activeProposalId = id;
  saveStore(store);
}
