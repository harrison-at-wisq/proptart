// MOU (Memorandum of Understanding) Types

export interface MOUCompanyInfo {
  companyName: string;
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  industry: string;
}

export interface MOUChallenge {
  headline: string;
  detail: string;
}

export type MOUValueDriver = 'cost' | 'compliance' | 'care';

export const MOU_VALUE_DRIVER_LABELS: Record<MOUValueDriver, string> = {
  cost: 'Cost',
  compliance: 'Compliance',
  care: 'Care',
};

export interface MOUValueAlignment {
  driver: MOUValueDriver;
  headline: string;
  description: string;
}

export interface MOUNextStep {
  title: string;
  description: string;
}

export interface MOUGeneratedContent {
  situationSummary: string;
  challenges: MOUChallenge[];
  valueAlignment: MOUValueAlignment[];
  proposedNextSteps: MOUNextStep[];
  closingStatement: string;
  generatedAt: string;
}

export interface MOUContentOverrides {
  situationSummary?: string;
  challenges?: Record<number, { headline?: string; detail?: string }>;
  valueAlignment?: Record<number, { headline?: string; description?: string }>;
  proposedNextSteps?: Record<number, { title?: string; description?: string }>;
  closingStatement?: string;
}

export interface MOUInputs {
  company: MOUCompanyInfo;
  callTranscripts: string;
  salesNotes?: string;
  generatedContent?: MOUGeneratedContent;
  contentOverrides?: MOUContentOverrides;
}

export const DEFAULT_MOU_INPUTS: MOUInputs = {
  company: {
    companyName: '',
    contactName: '',
    contactTitle: '',
    contactEmail: '',
    industry: '',
  },
  callTranscripts: '',
  salesNotes: '',
};
