import { ProposalInputs } from './proposal';
import { MOUInputs } from './mou';

export type DocumentType = 'proposal' | 'mou';

export interface Database {
  public: {
    Tables: {
      proposals: {
        Row: {
          id: string;
          name: string;
          owner_email: string;
          data: ProposalInputs | MOUInputs;
          document_type: DocumentType;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_email: string;
          data: ProposalInputs | MOUInputs;
          document_type?: DocumentType;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          data?: ProposalInputs | MOUInputs;
          document_type?: DocumentType;
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
  documentType: DocumentType;
  hasGeneratedContent: boolean;
  micrositeSlug: string | null;
}
