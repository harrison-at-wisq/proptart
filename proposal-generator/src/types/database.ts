import { ProposalInputs } from './proposal';

export interface Database {
  public: {
    Tables: {
      proposals: {
        Row: {
          id: string;
          name: string;
          owner_email: string;
          data: ProposalInputs;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_email: string;
          data: ProposalInputs;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          data?: ProposalInputs;
          updated_at?: string;
        };
      };
    };
  };
}

// Proposal list item with ownership info
export interface ProposalListItemWithOwnership {
  id: string;
  name: string;
  companyName: string;
  industry: string;
  aeName: string;
  updatedAt: string;
  createdAt: string;
  ownerEmail: string;
  isOwner: boolean;
  hasGeneratedContent: boolean;
  micrositeCount: number;
  pdfCount: number;
  latestMicrositeSlug: string | null;
}
