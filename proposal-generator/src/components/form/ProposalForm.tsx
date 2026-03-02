'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ProposalInputs,
  CompanyInfo,
  PricingInputs,
  HROperationsInputs,
  LegalComplianceInputs,
  EmployeeExperienceInputs,
  ValueDriver,
  PainPoint,
  CustomerIntegrations,
  NextStepId,
  AIPersonalizationInputs,
  GeneratedProposalContent,
  RFPAppendix,
  CustomPainPoint,
  CustomNextStep,
  FAQSection,
  FAQPageId,
  FAQ_PAGE_LABELS,
  INDUSTRIES,
  CONTACT_TITLES,
  VALUE_DRIVERS,
  VALUE_DRIVER_LABELS,
  VALUE_DRIVER_HEADLINES,
  VALUE_DRIVER_DESCRIPTIONS,
  PAIN_POINT_LABELS,
  DEFAULT_HR_OPERATIONS,
  DEFAULT_LEGAL_COMPLIANCE,
  DEFAULT_EMPLOYEE_EXPERIENCE,
  DEFAULT_PRICING,
} from '@/types/proposal';
import { PricingCalculator } from '@/components/calculators/PricingCalculator';
import { ROICalculator } from '@/components/calculators/ROICalculator';
import { AIPersonalizationSection } from '@/components/form/AIPersonalizationSection';
import { RFPResponseSection } from '@/components/form/RFPResponseSection';
import { calculatePricing } from '@/lib/pricing-calculator';
import { INTEGRATION_OPTIONS, NEXT_STEPS_OPTIONS } from '@/lib/content-templates';
import { getProposal, saveProposal } from '@/lib/proposal-storage';
import {
  CUSTOMER_QUOTES,
  QUOTE_SECTIONS_ORDER,
  QUOTE_SECTION_LABELS,
  getQuotesBySection,
  getQuoteById,
} from '@/lib/customer-quotes';

// Reusable dropdown with "Other" custom text support
function SelectWithOther({
  options,
  value,
  customValue,
  onChange,
  onCustomChange,
  label,
  placeholder,
}: {
  options: readonly string[];
  value: string;
  customValue?: string;
  onChange: (value: string) => void;
  onCustomChange: (value: string) => void;
  label: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03143B]"
      >
        {options[0] === '' ? null : <option value="">Select...</option>}
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
      {value === 'Other' && (
        <input
          type="text"
          value={customValue ?? ''}
          onChange={(e) => onCustomChange(e.target.value)}
          placeholder={placeholder || 'Please specify...'}
          className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03143B] bg-gray-50"
        />
      )}
    </div>
  );
}

type FormSection =
  | 'company'
  | 'pricing'
  | 'roi'
  | 'value-drivers'
  | 'ai-personalization'
  | 'customer-quotes'
  | 'faqs'
  | 'rfp-response'
  | 'review';

interface ProposalFormProps {
  proposalId: string | null;
  onSubmit: (inputs: ProposalInputs) => Promise<void>;
  onBack: () => void;
  isGenerating: boolean;
}

export function ProposalForm({ proposalId, onSubmit, onBack, isGenerating }: ProposalFormProps) {
  const [activeSection, setActiveSection] = useState<FormSection>('company');
  const [isLoading, setIsLoading] = useState(!!proposalId);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Form state
  const [company, setCompany] = useState<CompanyInfo>({
    companyName: '',
    industry: 'Technology',
    headquarters: '',
    contactName: '',
    contactTitle: 'CHRO',
    contactEmail: '',
    crmRecordId: '',
  });

  const [pricing, setPricing] = useState<PricingInputs>(DEFAULT_PRICING);
  const [hrOperations, setHROperations] = useState<HROperationsInputs>(DEFAULT_HR_OPERATIONS);
  const [legalCompliance, setLegalCompliance] = useState<LegalComplianceInputs>(DEFAULT_LEGAL_COMPLIANCE);
  const [employeeExperience, setEmployeeExperience] = useState<EmployeeExperienceInputs>(DEFAULT_EMPLOYEE_EXPERIENCE);
  const [primaryValueDriver, setPrimaryValueDriver] = useState<ValueDriver | null>(null);
  const [painPoints, setPainPoints] = useState<PainPoint[]>([]);
  const [integrations, setIntegrations] = useState<CustomerIntegrations>({
    hcm: '',
    identity: '',
    documents: '',
    communication: '',
    ticketing: '',
  });
  const [nextSteps, setNextSteps] = useState<NextStepId[]>(['technical-deepdive', 'pilot-scope', 'implementation-kickoff']);
  const [coverQuote, setCoverQuote] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [aiPersonalization, setAIPersonalization] = useState<AIPersonalizationInputs>({
    customInstructions: '',
    uploadedDocuments: [],
    enableAccountResearch: false,
  });
  const [generatedContent, setGeneratedContent] = useState<GeneratedProposalContent | null>(null);
  const [rfpAppendix, setRFPAppendix] = useState<RFPAppendix>({
    enabled: false,
    questions: [],
    answers: [],
  });
  // Phase 3: Custom pain points, next steps, ordering
  const [customPainPoints, setCustomPainPoints] = useState<CustomPainPoint[]>([]);
  const [customNextSteps, setCustomNextSteps] = useState<CustomNextStep[]>([]);
  const [painPointOrder, setPainPointOrder] = useState<string[]>([]);
  const [nextStepOrder, setNextStepOrder] = useState<string[]>([]);
  // Inline form inputs for custom items
  const [newPPHeadline, setNewPPHeadline] = useState('');
  const [newPPImpact, setNewPPImpact] = useState('');
  const [newNSTitle, setNewNSTitle] = useState('');
  const [newNSDesc, setNewNSDesc] = useState('');
  // Customer Quotes
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([]);
  // Phase 4: FAQ sections
  const [faqSections, setFAQSections] = useState<FAQSection[]>([]);
  const [faqDealContext, setFaqDealContext] = useState('');
  const [faqGongNotes, setFaqGongNotes] = useState('');
  const [isGeneratingFaqs, setIsGeneratingFaqs] = useState(false);

  // Track whether initial load has completed to prevent saving empty state
  const hasLoadedRef = useRef(false);
  const currentProposalIdRef = useRef<string | null>(null);
  const apiSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<(() => void) | null>(null);
  const saveStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build the current form data object (used by save and submit)
  const buildFormData = useCallback((): ProposalInputs => ({
    company,
    pricing,
    hrOperations,
    legalCompliance,
    employeeExperience,
    primaryValueDriver: primaryValueDriver || undefined,
    painPoints,
    integrations,
    nextSteps,
    coverQuote: coverQuote || undefined,
    customNotes,
    customPainPoints: customPainPoints.length > 0 ? customPainPoints : undefined,
    customNextSteps: customNextSteps.length > 0 ? customNextSteps : undefined,
    painPointOrder: painPointOrder.length > 0 ? painPointOrder : undefined,
    nextStepOrder: nextStepOrder.length > 0 ? nextStepOrder : undefined,
    selectedQuotes: selectedQuotes.length > 0 ? selectedQuotes : undefined,
    faqSections: faqSections.length > 0 ? faqSections : undefined,
    aiPersonalization,
    generatedContent: generatedContent || undefined,
    rfpAppendix: rfpAppendix.enabled ? rfpAppendix : undefined,
  }), [company, pricing, hrOperations, legalCompliance, employeeExperience, primaryValueDriver, painPoints, integrations, nextSteps, coverQuote, customNotes, customPainPoints, customNextSteps, painPointOrder, nextStepOrder, selectedQuotes, faqSections, aiPersonalization, generatedContent, rfpAppendix]);

  // Explicit save function
  const saveNow = useCallback(async () => {
    if (!currentProposalIdRef.current) return;
    // Cancel any pending debounced save
    if (apiSaveTimeoutRef.current) {
      clearTimeout(apiSaveTimeoutRef.current);
      apiSaveTimeoutRef.current = null;
    }
    pendingSaveRef.current = null;

    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/proposals/${currentProposalIdRef.current}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: buildFormData() }),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      setSaveStatus('saved');
      if (saveStatusTimeoutRef.current) clearTimeout(saveStatusTimeoutRef.current);
      saveStatusTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus('error');
    }
  }, [buildFormData]);

  // Load saved form data on mount or when proposalId changes
  useEffect(() => {
    if (!proposalId) {
      hasLoadedRef.current = true;
      setIsLoading(false);
      return;
    }

    // Reset load state
    setIsLoading(true);
    setLoadError(null);
    hasLoadedRef.current = false;
    currentProposalIdRef.current = null;

    const abortController = new AbortController();

    function applyData(data: Partial<ProposalInputs>) {
      if (data.company) setCompany(data.company);
      if (data.pricing) setPricing(data.pricing);
      if (data.hrOperations) setHROperations(data.hrOperations);
      if (data.legalCompliance) setLegalCompliance(data.legalCompliance);
      if (data.employeeExperience) setEmployeeExperience(data.employeeExperience);
      if (data.primaryValueDriver) setPrimaryValueDriver(data.primaryValueDriver);
      if (data.painPoints) setPainPoints(data.painPoints);
      if (data.integrations) setIntegrations(data.integrations);
      if (data.nextSteps) setNextSteps(data.nextSteps);
      if (data.coverQuote) setCoverQuote(data.coverQuote);
      if (data.customNotes) setCustomNotes(data.customNotes);
      if (data.aiPersonalization) setAIPersonalization(data.aiPersonalization);
      if (data.generatedContent) setGeneratedContent(data.generatedContent);
      if (data.rfpAppendix) setRFPAppendix(data.rfpAppendix);
      if (data.customPainPoints) setCustomPainPoints(data.customPainPoints);
      if (data.customNextSteps) setCustomNextSteps(data.customNextSteps);
      if (data.painPointOrder) setPainPointOrder(data.painPointOrder);
      if (data.nextStepOrder) setNextStepOrder(data.nextStepOrder);
      if (data.faqSections) setFAQSections(data.faqSections);
      if (data.selectedQuotes) setSelectedQuotes(data.selectedQuotes);
    }

    // Fetch from API (Supabase is the source of truth)
    fetch(`/api/proposals/${proposalId}`, {
      cache: 'no-store',
      signal: abortController.signal,
    })
      .then(res => {
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        return res.json();
      })
      .then(json => {
        if (abortController.signal.aborted) return;
        if (json?.proposal?.data) {
          applyData(json.proposal.data as Partial<ProposalInputs>);
          currentProposalIdRef.current = proposalId;
          hasLoadedRef.current = true;
          setIsLoading(false);
        } else {
          setLoadError('No data found for this proposal');
          setIsLoading(false);
        }
      })
      .catch(err => {
        if (abortController.signal.aborted) return;
        console.error('Failed to load proposal:', err);
        setLoadError(err.message || 'Failed to load proposal');
        setIsLoading(false);
      });

    return () => { abortController.abort(); };
  }, [proposalId]);

  // Auto-save form data to API (debounced) when it changes
  useEffect(() => {
    // Don't save until initial load has completed
    if (!hasLoadedRef.current) return;
    // Don't save if no proposal ID
    if (!currentProposalIdRef.current) return;

    const data = buildFormData();

    // Debounced save to API (1s) — this is the source of truth
    if (apiSaveTimeoutRef.current) clearTimeout(apiSaveTimeoutRef.current);
    const idToSave = currentProposalIdRef.current;

    setSaveStatus('saving');
    const saveToApi = () => {
      fetch(`/api/proposals/${idToSave}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      })
        .then(res => {
          if (!res.ok) throw new Error(`Save failed: ${res.status}`);
          setSaveStatus('saved');
          if (saveStatusTimeoutRef.current) clearTimeout(saveStatusTimeoutRef.current);
          saveStatusTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 3000);
        })
        .catch(err => {
          console.error('Auto-save failed:', err);
          setSaveStatus('error');
        });
    };
    apiSaveTimeoutRef.current = setTimeout(saveToApi, 1000);
    pendingSaveRef.current = saveToApi;

    // Also mirror to localStorage if an entry already exists there
    const localProposal = getProposal(currentProposalIdRef.current);
    if (localProposal) {
      saveProposal({ ...localProposal, data });
    }

    // Cleanup: flush pending save immediately on unmount
    return () => {
      if (apiSaveTimeoutRef.current) {
        clearTimeout(apiSaveTimeoutRef.current);
        apiSaveTimeoutRef.current = null;
      }
      if (pendingSaveRef.current) {
        pendingSaveRef.current();
        pendingSaveRef.current = null;
      }
    };
  }, [buildFormData]);

  // Save on browser close/refresh and tab switch
  useEffect(() => {
    const flushSave = () => {
      if (currentProposalIdRef.current && hasLoadedRef.current) {
        const data = buildFormData();
        fetch(`/api/proposals/${currentProposalIdRef.current}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data }),
          keepalive: true,
        }).catch(() => {});
      }
    };
    const handleBeforeUnload = () => flushSave();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushSave();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [buildFormData]);

  // Keep ROI calculator in sync with pricing
  const updatePricing = useCallback((updates: Partial<PricingInputs>) => {
    setPricing((prev) => {
      const newPricing = { ...prev, ...updates };
      // Update employee experience population to match
      if (updates.employeeCount !== undefined) {
        setEmployeeExperience((emp) => ({
          ...emp,
          totalEmployeePopulation: updates.employeeCount!,
        }));
      }
      // Update Wisq license cost in HR operations
      const pricingOutput = calculatePricing(newPricing);
      setHROperations((hr) => ({
        ...hr,
        wisqLicenseCost: pricingOutput.annualRecurringRevenue,
      }));
      return newPricing;
    });
  }, []);

  const sections: { id: FormSection; label: string; icon: string }[] = [
    { id: 'company', label: 'Company Info', icon: '🏢' },
    { id: 'pricing', label: 'Pricing', icon: '💰' },
    { id: 'roi', label: 'ROI Calculator', icon: '📊' },
    { id: 'value-drivers', label: 'Value & Pain Points', icon: '🎯' },
    { id: 'ai-personalization', label: 'AI Personalization', icon: '🤖' },
    { id: 'customer-quotes', label: 'Customer Quotes', icon: '💬' },
    { id: 'faqs', label: 'FAQs', icon: '❓' },
    // { id: 'rfp-response', label: 'RFP Response', icon: '📋' }, // Hidden for now - feature in development
    { id: 'review', label: 'Review & Generate', icon: '✨' },
  ];

  const handleSubmit = async () => {
    // Save to Supabase before generating
    await saveNow();
    onSubmit(buildFormData());
  };

  const canProceed = () => {
    switch (activeSection) {
      case 'company':
        return company.companyName && company.contactName && company.contactEmail;
      case 'pricing':
        return pricing.employeeCount > 0;
      case 'roi':
        return true;
      case 'value-drivers':
        return painPoints.length > 0; // Value drivers are static, just need pain points
      case 'ai-personalization':
        return true; // AI personalization is optional
      case 'customer-quotes':
        return true; // Customer quotes are optional
      case 'faqs':
        return true; // FAQs are optional
      case 'rfp-response':
        return true; // RFP response is optional
      default:
        return true;
    }
  };

  const goToNextSection = () => {
    const currentIndex = sections.findIndex((s) => s.id === activeSection);
    if (currentIndex < sections.length - 1) {
      setActiveSection(sections[currentIndex + 1].id);
    }
  };

  const goToPrevSection = () => {
    const currentIndex = sections.findIndex((s) => s.id === activeSection);
    if (currentIndex > 0) {
      setActiveSection(sections[currentIndex - 1].id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={async () => { await saveNow(); onBack(); }}
                className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Dashboard"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-10 h-10 bg-[#03143B] rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  {/* Toaster body */}
                  <rect x="3" y="8" width="18" height="12" rx="2" />
                  {/* Toast popping out */}
                  <rect x="7" y="3" width="10" height="7" rx="1" fill="#F59E0B" />
                  {/* Toaster slots */}
                  <rect x="6" y="10" width="5" height="1" rx="0.5" fill="#1e293b" />
                  <rect x="13" y="10" width="5" height="1" rx="0.5" fill="#1e293b" />
                  {/* Lever */}
                  <rect x="19" y="12" width="2" height="4" rx="0.5" fill="#94a3b8" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Prop Tart</h1>
                <p className="text-sm text-gray-500">Create personalized sales proposals</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {saveStatus === 'saving' && (
                <span className="text-sm text-gray-400 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                  </svg>
                  Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="text-sm text-red-600 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3l9.66 16.59a1 1 0 01-.87 1.41H3.21a1 1 0 01-.87-1.41L12 3z" />
                  </svg>
                  Save failed
                </span>
              )}
              <button
                onClick={saveNow}
                disabled={!currentProposalIdRef.current || saveStatus === 'saving'}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Loading / Error states */}
      {isLoading && (
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <svg className="w-8 h-8 animate-spin text-[#4d65ff] mx-auto mb-4" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
            </svg>
            <p className="text-gray-500">Loading proposal...</p>
          </div>
        </div>
      )}
      {!isLoading && loadError && (
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <p className="text-red-600 font-medium mb-2">Failed to load proposal</p>
            <p className="text-gray-500 text-sm mb-4">{loadError}</p>
            <button
              onClick={() => {
                setLoadError(null);
                setIsLoading(true);
                fetch(`/api/proposals/${proposalId}`, { cache: 'no-store' })
                  .then(res => { if (!res.ok) throw new Error(`${res.status}`); return res.json(); })
                  .then(json => {
                    if (json?.proposal?.data) {
                      const data = json.proposal.data as Partial<ProposalInputs>;
                      if (data.company) setCompany(data.company);
                      if (data.pricing) setPricing(data.pricing);
                      if (data.hrOperations) setHROperations(data.hrOperations);
                      if (data.legalCompliance) setLegalCompliance(data.legalCompliance);
                      if (data.employeeExperience) setEmployeeExperience(data.employeeExperience);
                      if (data.primaryValueDriver) setPrimaryValueDriver(data.primaryValueDriver);
                      if (data.painPoints) setPainPoints(data.painPoints);
                      if (data.integrations) setIntegrations(data.integrations);
                      if (data.nextSteps) setNextSteps(data.nextSteps);
                      if (data.coverQuote) setCoverQuote(data.coverQuote);
                      if (data.customNotes) setCustomNotes(data.customNotes);
                      if (data.aiPersonalization) setAIPersonalization(data.aiPersonalization);
                      if (data.generatedContent) setGeneratedContent(data.generatedContent);
                      if (data.rfpAppendix) setRFPAppendix(data.rfpAppendix);
                      if (data.customPainPoints) setCustomPainPoints(data.customPainPoints);
                      if (data.customNextSteps) setCustomNextSteps(data.customNextSteps);
                      if (data.painPointOrder) setPainPointOrder(data.painPointOrder);
                      if (data.nextStepOrder) setNextStepOrder(data.nextStepOrder);
                      if (data.faqSections) setFAQSections(data.faqSections);
                      if (data.selectedQuotes) setSelectedQuotes(data.selectedQuotes);
                      currentProposalIdRef.current = proposalId;
                      hasLoadedRef.current = true;
                      setIsLoading(false);
                    } else {
                      setLoadError('No data found');
                      setIsLoading(false);
                    }
                  })
                  .catch(err => { setLoadError(err.message); setIsLoading(false); });
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-[#4d65ff] rounded-md hover:bg-[#3d55ef]"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Progress Nav */}
      {!isLoading && !loadError && <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 py-2">
            {sections.map((section, index) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? 'bg-[#03143B] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{section.icon}</span>
                <span className="hidden md:inline">{section.label}</span>
                <span className="md:hidden">{index + 1}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>}

      {/* Main Content */}
      {!isLoading && !loadError && <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Company Info Section */}
        {activeSection === 'company' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Company Information</h2>
              <p className="text-gray-600 mt-1">
                Enter details about the prospect company and primary contact.
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={company.companyName}
                    onChange={(e) => setCompany({ ...company, companyName: e.target.value })}
                    placeholder="Acme Corporation"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03143B]"
                  />
                </div>

                <SelectWithOther
                  options={INDUSTRIES}
                  value={company.industry}
                  customValue={company.customIndustry}
                  onChange={(value) => setCompany({ ...company, industry: value as typeof company.industry })}
                  onCustomChange={(value) => setCompany({ ...company, customIndustry: value })}
                  label="Industry *"
                  placeholder="Enter industry..."
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Headquarters
                  </label>
                  <input
                    type="text"
                    value={company.headquarters}
                    onChange={(e) => setCompany({ ...company, headquarters: e.target.value })}
                    placeholder="San Francisco, CA"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03143B]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CRM Record ID
                  </label>
                  <input
                    type="text"
                    value={company.crmRecordId}
                    onChange={(e) => setCompany({ ...company, crmRecordId: e.target.value })}
                    placeholder="Optional - for tracking"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03143B]"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Primary Contact</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    value={company.contactName}
                    onChange={(e) => setCompany({ ...company, contactName: e.target.value })}
                    placeholder="Jane Smith"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03143B]"
                  />
                </div>

                <SelectWithOther
                  options={CONTACT_TITLES}
                  value={company.contactTitle}
                  customValue={company.customContactTitle}
                  onChange={(value) => setCompany({ ...company, contactTitle: value as typeof company.contactTitle })}
                  onCustomChange={(value) => setCompany({ ...company, customContactTitle: value })}
                  label="Title *"
                  placeholder="Enter title..."
                />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Contact Information</h3>
              <p className="text-sm text-gray-500 mb-4">This will appear as the CTA contact on the final proposal page</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">AE Name and Email *</label>
                <select
                  value={company.contactEmail}
                  onChange={(e) => setCompany({ ...company, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03143B]"
                >
                  <option value="">Select AE...</option>
                  <option value="Alex Macaulay | alex@wisq.com">Alex Macaulay | alex@wisq.com</option>
                  <option value="Fraser Aitken | faitken@wisq.com">Fraser Aitken | faitken@wisq.com</option>
                  <option value="Marc Lombardo | mlombardo@wisq.com">Marc Lombardo | mlombardo@wisq.com</option>
                  <option value="Scott Sinatra | ssinatra@wisq.com">Scott Sinatra | ssinatra@wisq.com</option>
                  <option value="Jim Barnett | jjb@wisq.com">Jim Barnett | jjb@wisq.com</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Current Tech Stack</h3>
              <p className="text-sm text-gray-500 mb-4">Select the tools this customer currently uses</p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <SelectWithOther
                  options={INTEGRATION_OPTIONS.hcm}
                  value={integrations.hcm}
                  customValue={integrations.customHcm}
                  onChange={(value) => setIntegrations({ ...integrations, hcm: value })}
                  onCustomChange={(value) => setIntegrations({ ...integrations, customHcm: value })}
                  label="HCM / HRIS"
                  placeholder="Enter HCM system..."
                />
                <SelectWithOther
                  options={INTEGRATION_OPTIONS.identity}
                  value={integrations.identity}
                  customValue={integrations.customIdentity}
                  onChange={(value) => setIntegrations({ ...integrations, identity: value })}
                  onCustomChange={(value) => setIntegrations({ ...integrations, customIdentity: value })}
                  label="Identity / SSO"
                  placeholder="Enter identity provider..."
                />
                <SelectWithOther
                  options={INTEGRATION_OPTIONS.documents}
                  value={integrations.documents}
                  customValue={integrations.customDocuments}
                  onChange={(value) => setIntegrations({ ...integrations, documents: value })}
                  onCustomChange={(value) => setIntegrations({ ...integrations, customDocuments: value })}
                  label="Documents"
                  placeholder="Enter document platform..."
                />
                <SelectWithOther
                  options={INTEGRATION_OPTIONS.communication}
                  value={integrations.communication}
                  customValue={integrations.customCommunication}
                  onChange={(value) => setIntegrations({ ...integrations, communication: value })}
                  onCustomChange={(value) => setIntegrations({ ...integrations, customCommunication: value })}
                  label="Communication"
                  placeholder="Enter communication tool..."
                />
                <SelectWithOther
                  options={INTEGRATION_OPTIONS.ticketing}
                  value={integrations.ticketing}
                  customValue={integrations.customTicketing}
                  onChange={(value) => setIntegrations({ ...integrations, ticketing: value })}
                  onCustomChange={(value) => setIntegrations({ ...integrations, customTicketing: value })}
                  label="Ticketing"
                  placeholder="Enter ticketing system..."
                />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Cover Page Highlights</h3>
              <p className="text-sm text-gray-500 mb-4">Optional key messages for the cover page. Use separate lines for each highlight point.</p>
              <textarea
                value={coverQuote}
                onChange={(e) => setCoverQuote(e.target.value)}
                placeholder={"Reduce HR response times by 80%\nImprove employee satisfaction scores\nFull compliance audit trail"}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03143B]"
              />
            </div>
          </div>
        )}

        {/* Pricing Section */}
        {activeSection === 'pricing' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Pricing Configuration</h2>
              <p className="text-gray-600 mt-1">
                Configure the investment based on employee count and product selection.
              </p>
            </div>

            <PricingCalculator inputs={pricing} onChange={updatePricing} />
          </div>
        )}

        {/* ROI Calculator Section */}
        {activeSection === 'roi' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">ROI Calculator</h2>
              <p className="text-gray-600 mt-1">
                Model the return on investment across HR operations, compliance, and employee
                experience.
              </p>
            </div>

            <ROICalculator
              hrInputs={hrOperations}
              legalInputs={legalCompliance}
              employeeInputs={employeeExperience}
              onHRChange={(updates) => setHROperations({ ...hrOperations, ...updates })}
              onLegalChange={(updates) => setLegalCompliance({ ...legalCompliance, ...updates })}
              onEmployeeChange={(updates) => setEmployeeExperience({ ...employeeExperience, ...updates })}
            />
          </div>
        )}

        {/* Value Drivers & Pain Points Section */}
        {activeSection === 'value-drivers' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Value Drivers & Pain Points</h2>
              <p className="text-gray-600 mt-1">
                All three value drivers will be included. Optionally select one to emphasize.
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Value Drivers
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Click to select a primary value driver to emphasize (optional)
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                {VALUE_DRIVERS.map((driver) => (
                  <button
                    key={driver}
                    onClick={() => {
                      setPrimaryValueDriver(primaryValueDriver === driver ? null : driver);
                    }}
                    className={`p-4 rounded-lg border-2 text-left transition-colors ${
                      primaryValueDriver === driver
                        ? 'border-[#03143B] bg-[#03143B]/5 ring-2 ring-[#03143B]/20'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-lg font-bold ${primaryValueDriver === driver ? 'text-[#03143B]' : 'text-gray-700'}`}>
                        {VALUE_DRIVER_LABELS[driver]}
                      </span>
                      {primaryValueDriver === driver && (
                        <span className="px-2 py-0.5 bg-[#03143B] text-white text-xs font-medium rounded">
                          PRIMARY
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-gray-900 text-sm mb-1">
                      {VALUE_DRIVER_HEADLINES[driver]}
                    </p>
                    <p className="text-xs text-gray-500">
                      {VALUE_DRIVER_DESCRIPTIONS[driver]}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Pain Points (Select all that apply)
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {(Object.keys(PAIN_POINT_LABELS) as PainPoint[]).map((point) => (
                  <button
                    key={point}
                    onClick={() => {
                      if (painPoints.includes(point)) {
                        setPainPoints(painPoints.filter((p) => p !== point));
                        setPainPointOrder(prev => prev.filter(id => id !== point));
                      } else {
                        setPainPoints([...painPoints, point]);
                        setPainPointOrder(prev => [...prev, point]);
                      }
                    }}
                    className={`p-4 rounded-lg border-2 text-left transition-colors ${
                      painPoints.includes(point)
                        ? 'border-[#03143B] bg-[#03143B]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          painPoints.includes(point)
                            ? 'bg-[#03143B] border-[#03143B]'
                            : 'border-gray-300'
                        }`}
                      >
                        {painPoints.includes(point) && (
                          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12">
                            <path
                              fill="currentColor"
                              d="M10.28 2.28L4.5 8.06 1.72 5.28a.75.75 0 00-1.06 1.06l3.5 3.5a.75.75 0 001.06 0l6.5-6.5a.75.75 0 00-1.06-1.06z"
                            />
                          </svg>
                        )}
                      </span>
                      <span className="text-gray-900">{PAIN_POINT_LABELS[point]}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Custom Pain Points */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Custom Pain Points</h4>
                {customPainPoints.map((cp) => (
                  <div key={cp.id} className="flex items-start gap-2 mb-2 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{cp.headline}</p>
                      <p className="text-gray-500 text-xs">{cp.impact}</p>
                    </div>
                    <button
                      onClick={() => {
                        setCustomPainPoints(prev => prev.filter(p => p.id !== cp.id));
                        setPainPointOrder(prev => prev.filter(id => id !== cp.id));
                      }}
                      className="text-red-500 hover:text-red-700 text-sm p-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-[#03143B] font-medium hover:underline">
                    + Add Custom Pain Point
                  </summary>
                  <div className="mt-2 space-y-2 p-3 bg-gray-50 rounded-lg">
                    <input
                      type="text"
                      value={newPPHeadline}
                      onChange={(e) => setNewPPHeadline(e.target.value)}
                      placeholder="Headline (e.g., 'Legacy System Limitations')"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#03143B]"
                    />
                    <input
                      type="text"
                      value={newPPImpact}
                      onChange={(e) => setNewPPImpact(e.target.value)}
                      placeholder="Impact description..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#03143B]"
                    />
                    <button
                      onClick={() => {
                        if (newPPHeadline && newPPImpact) {
                          const newId = `custom-pp-${Date.now()}`;
                          const newPP: CustomPainPoint = { id: newId, headline: newPPHeadline, impact: newPPImpact };
                          setCustomPainPoints(prev => [...prev, newPP]);
                          setPainPointOrder(prev => [...prev, newId]);
                          setNewPPHeadline('');
                          setNewPPImpact('');
                        }
                      }}
                      className="px-4 py-2 bg-[#03143B] text-white text-sm rounded-md hover:bg-[#020e29]"
                    >
                      Add Pain Point
                    </button>
                  </div>
                </details>
              </div>

              {/* Ordered list with reordering */}
              {painPointOrder.length > 1 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Display Order</h4>
                  <div className="space-y-1">
                    {painPointOrder.map((id, index) => {
                      const label = (PAIN_POINT_LABELS as Record<string, string>)[id]
                        || customPainPoints.find(cp => cp.id === id)?.headline
                        || id;
                      return (
                        <div key={id} className="flex items-center gap-2 text-sm py-1 px-2 bg-gray-50 rounded">
                          <span className="text-gray-400 w-5 text-center">{index + 1}</span>
                          <span className="flex-1 text-gray-700">{label}</span>
                          <button
                            disabled={index === 0}
                            onClick={() => {
                              setPainPointOrder(prev => {
                                const arr = [...prev];
                                [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
                                return arr;
                              });
                            }}
                            className="text-gray-400 hover:text-gray-700 disabled:opacity-30 p-0.5"
                          >
                            &#9650;
                          </button>
                          <button
                            disabled={index === painPointOrder.length - 1}
                            onClick={() => {
                              setPainPointOrder(prev => {
                                const arr = [...prev];
                                [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
                                return arr;
                              });
                            }}
                            className="text-gray-400 hover:text-gray-700 disabled:opacity-30 p-0.5"
                          >
                            &#9660;
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Proposed Next Steps
              </h3>
              <p className="text-sm text-gray-500 mb-4">Select the next steps to include in the proposal</p>
              <div className="grid md:grid-cols-2 gap-3">
                {NEXT_STEPS_OPTIONS.map((step) => (
                  <button
                    key={step.id}
                    onClick={() => {
                      if (nextSteps.includes(step.id as NextStepId)) {
                        setNextSteps(nextSteps.filter((s) => s !== step.id));
                        setNextStepOrder(prev => prev.filter(id => id !== step.id));
                      } else {
                        setNextSteps([...nextSteps, step.id as NextStepId]);
                        setNextStepOrder(prev => [...prev, step.id]);
                      }
                    }}
                    className={`p-4 rounded-lg border-2 text-left transition-colors ${
                      nextSteps.includes(step.id as NextStepId)
                        ? 'border-[#03143B] bg-[#03143B]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          nextSteps.includes(step.id as NextStepId)
                            ? 'bg-[#03143B] border-[#03143B]'
                            : 'border-gray-300'
                        }`}
                      >
                        {nextSteps.includes(step.id as NextStepId) && (
                          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12">
                            <path
                              fill="currentColor"
                              d="M10.28 2.28L4.5 8.06 1.72 5.28a.75.75 0 00-1.06 1.06l3.5 3.5a.75.75 0 001.06 0l6.5-6.5a.75.75 0 00-1.06-1.06z"
                            />
                          </svg>
                        )}
                      </span>
                      <div>
                        <span className="font-medium text-gray-900">{step.title}</span>
                        <p className="text-sm text-gray-500">{step.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Custom Next Steps */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Custom Next Steps</h4>
                {customNextSteps.map((cs) => (
                  <div key={cs.id} className="flex items-start gap-2 mb-2 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{cs.title}</p>
                      <p className="text-gray-500 text-xs">{cs.description}</p>
                    </div>
                    <button
                      onClick={() => {
                        setCustomNextSteps(prev => prev.filter(s => s.id !== cs.id));
                        setNextStepOrder(prev => prev.filter(id => id !== cs.id));
                      }}
                      className="text-red-500 hover:text-red-700 text-sm p-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-[#03143B] font-medium hover:underline">
                    + Add Custom Next Step
                  </summary>
                  <div className="mt-2 space-y-2 p-3 bg-gray-50 rounded-lg">
                    <input
                      type="text"
                      value={newNSTitle}
                      onChange={(e) => setNewNSTitle(e.target.value)}
                      placeholder="Title (e.g., 'Executive alignment session')"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#03143B]"
                    />
                    <input
                      type="text"
                      value={newNSDesc}
                      onChange={(e) => setNewNSDesc(e.target.value)}
                      placeholder="Description..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#03143B]"
                    />
                    <button
                      onClick={() => {
                        if (newNSTitle && newNSDesc) {
                          const newId = `custom-ns-${Date.now()}`;
                          const newNS: CustomNextStep = { id: newId, title: newNSTitle, description: newNSDesc };
                          setCustomNextSteps(prev => [...prev, newNS]);
                          setNextStepOrder(prev => [...prev, newId]);
                          setNewNSTitle('');
                          setNewNSDesc('');
                        }
                      }}
                      className="px-4 py-2 bg-[#03143B] text-white text-sm rounded-md hover:bg-[#020e29]"
                    >
                      Add Next Step
                    </button>
                  </div>
                </details>
              </div>

              {/* Ordered list with reordering */}
              {nextStepOrder.length > 1 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Display Order</h4>
                  <div className="space-y-1">
                    {nextStepOrder.map((id, index) => {
                      const predefined = NEXT_STEPS_OPTIONS.find(s => s.id === id);
                      const label = predefined?.title
                        || customNextSteps.find(cs => cs.id === id)?.title
                        || id;
                      return (
                        <div key={id} className="flex items-center gap-2 text-sm py-1 px-2 bg-gray-50 rounded">
                          <span className="text-gray-400 w-5 text-center">{index + 1}</span>
                          <span className="flex-1 text-gray-700">{label}</span>
                          <button
                            disabled={index === 0}
                            onClick={() => {
                              setNextStepOrder(prev => {
                                const arr = [...prev];
                                [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
                                return arr;
                              });
                            }}
                            className="text-gray-400 hover:text-gray-700 disabled:opacity-30 p-0.5"
                          >
                            &#9650;
                          </button>
                          <button
                            disabled={index === nextStepOrder.length - 1}
                            onClick={() => {
                              setNextStepOrder(prev => {
                                const arr = [...prev];
                                [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
                                return arr;
                              });
                            }}
                            className="text-gray-400 hover:text-gray-700 disabled:opacity-30 p-0.5"
                          >
                            &#9660;
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes</h3>
              <textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Any additional context or requirements for this proposal..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03143B]"
              />
            </div>
          </div>
        )}

        {/* AI Personalization Section */}
        {activeSection === 'ai-personalization' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">AI Personalization</h2>
              <p className="text-gray-600 mt-1">
                Use AI to generate personalized content based on instructions, documents, and account research.
              </p>
            </div>

            <AIPersonalizationSection
              inputs={aiPersonalization}
              proposalInputs={{
                company,
                pricing,
                hrOperations,
                legalCompliance,
                employeeExperience,
                primaryValueDriver: primaryValueDriver || undefined,
                painPoints,
                integrations,
                nextSteps,
                customNotes,
              }}
              onChange={setAIPersonalization}
              onGenerate={setGeneratedContent}
            />

            {generatedContent && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-green-800">AI Content Generated</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Personalized content has been generated and will be included in the proposal.
                      You can edit any text after generating the proposal.
                    </p>
                    <p className="text-xs text-green-600 mt-2">
                      Generated at: {new Date(generatedContent.generatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Customer Quotes Section */}
        {activeSection === 'customer-quotes' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Customer Quotes</h2>
              <p className="text-gray-600 mt-1">
                Add social proof to your proposal. Select up to one quote per section.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {(() => {
                  const sectionsWithQuotes = QUOTE_SECTIONS_ORDER.filter(section =>
                    selectedQuotes.some(id => getQuoteById(id)?.section === section)
                  ).length;
                  return `${sectionsWithQuotes} of ${QUOTE_SECTIONS_ORDER.length} sections have quotes`;
                })()}
              </p>
            </div>

            {QUOTE_SECTIONS_ORDER.map((section) => {
              const sectionQuotes = getQuotesBySection(section);
              const selectedInSection = selectedQuotes.find(id => getQuoteById(id)?.section === section);

              return (
                <div key={section} className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {QUOTE_SECTION_LABELS[section]}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {selectedInSection ? '1 quote selected' : 'No quote selected'}
                  </p>
                  <div className="space-y-3">
                    {sectionQuotes.map((quote) => {
                      const isSelected = selectedQuotes.includes(quote.id);
                      return (
                        <button
                          key={quote.id}
                          onClick={() => {
                            setSelectedQuotes(prev => {
                              // Remove any existing quote for this section
                              const filtered = prev.filter(id => getQuoteById(id)?.section !== section);
                              // Toggle: if clicking the already-selected quote, just remove it
                              if (isSelected) return filtered;
                              // Otherwise add the new one
                              return [...filtered, quote.id];
                            });
                          }}
                          className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                            isSelected
                              ? 'border-[#4d65ff] bg-[#4d65ff]/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                isSelected
                                  ? 'bg-[#4d65ff] border-[#4d65ff]'
                                  : 'border-gray-300'
                              }`}
                            >
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" viewBox="0 0 12 12">
                                  <path
                                    fill="currentColor"
                                    d="M10.28 2.28L4.5 8.06 1.72 5.28a.75.75 0 00-1.06 1.06l3.5 3.5a.75.75 0 001.06 0l6.5-6.5a.75.75 0 00-1.06-1.06z"
                                  />
                                </svg>
                              )}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-900 text-sm italic leading-relaxed">
                                &ldquo;{quote.text}&rdquo;
                              </p>
                              <div className="flex items-center gap-3 mt-2">
                                <p className="text-gray-500 text-xs">
                                  &mdash; {quote.attribution}
                                </p>
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                                  {quote.theme}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* FAQ Section */}
        {activeSection === 'faqs' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">FAQs & Objection Handling</h2>
              <p className="text-gray-600 mt-1">
                Generate anticipated questions from IT, CFO, and CEO stakeholders. Provide deal context for more relevant FAQs.
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Deal Context (Optional)</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">HubSpot Deal Summary</label>
                  <textarea
                    value={faqDealContext}
                    onChange={(e) => setFaqDealContext(e.target.value)}
                    placeholder="Paste deal notes, stage info, or summary from HubSpot..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03143B]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gong Call Notes</label>
                  <textarea
                    value={faqGongNotes}
                    onChange={(e) => setFaqGongNotes(e.target.value)}
                    placeholder="Paste relevant notes from Gong call recordings..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#03143B]"
                  />
                </div>
              </div>

              <button
                onClick={async () => {
                  setIsGeneratingFaqs(true);
                  try {
                    const response = await fetch('/api/generate-faqs', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        proposalInputs: {
                          company,
                          pricing,
                          painPoints,
                          integrations,
                          primaryValueDriver,
                        },
                        dealContext: faqDealContext || undefined,
                        gongNotes: faqGongNotes || undefined,
                      }),
                    });
                    if (response.ok) {
                      const data = await response.json();
                      setFAQSections(data.faqSections || []);
                    }
                  } catch (err) {
                    console.error('FAQ generation failed:', err);
                  } finally {
                    setIsGeneratingFaqs(false);
                  }
                }}
                disabled={isGeneratingFaqs}
                className="mt-4 px-6 py-2 bg-[#03143B] text-white rounded-lg hover:bg-[#020e29] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isGeneratingFaqs ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating FAQs...
                  </>
                ) : (
                  'Generate FAQs'
                )}
              </button>
            </div>

            {/* Editable FAQ List */}
            {faqSections.length > 0 && (
              <div className="space-y-4">
                {faqSections.map((section, sectionIndex) => (
                  <div key={section.pageId} className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {FAQ_PAGE_LABELS[section.pageId]}
                      </h3>
                      <button
                        onClick={() => {
                          setFAQSections(prev => prev.filter((_, i) => i !== sectionIndex));
                        }}
                        className="text-sm text-red-500 hover:text-red-700"
                      >
                        Remove Section
                      </button>
                    </div>
                    <div className="space-y-3">
                      {section.faqs.map((faq, faqIndex) => (
                        <div key={faqIndex} className="border border-gray-100 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 space-y-2">
                              <input
                                type="text"
                                value={faq.question}
                                onChange={(e) => {
                                  setFAQSections(prev => {
                                    const updated = [...prev];
                                    updated[sectionIndex] = {
                                      ...updated[sectionIndex],
                                      faqs: updated[sectionIndex].faqs.map((f, i) =>
                                        i === faqIndex ? { ...f, question: e.target.value } : f
                                      ),
                                    };
                                    return updated;
                                  });
                                }}
                                className="w-full px-2 py-1 text-sm font-medium text-gray-900 border border-transparent hover:border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#03143B] focus:border-[#03143B]"
                              />
                              <textarea
                                value={faq.answer}
                                onChange={(e) => {
                                  setFAQSections(prev => {
                                    const updated = [...prev];
                                    updated[sectionIndex] = {
                                      ...updated[sectionIndex],
                                      faqs: updated[sectionIndex].faqs.map((f, i) =>
                                        i === faqIndex ? { ...f, answer: e.target.value } : f
                                      ),
                                    };
                                    return updated;
                                  });
                                }}
                                rows={2}
                                className="w-full px-2 py-1 text-sm text-gray-600 border border-transparent hover:border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#03143B] focus:border-[#03143B]"
                              />
                            </div>
                            <button
                              onClick={() => {
                                setFAQSections(prev => {
                                  const updated = [...prev];
                                  updated[sectionIndex] = {
                                    ...updated[sectionIndex],
                                    faqs: updated[sectionIndex].faqs.filter((_, i) => i !== faqIndex),
                                  };
                                  return updated;
                                });
                              }}
                              className="text-gray-400 hover:text-red-500 p-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          setFAQSections(prev => {
                            const updated = [...prev];
                            updated[sectionIndex] = {
                              ...updated[sectionIndex],
                              faqs: [...updated[sectionIndex].faqs, { question: '', answer: '' }],
                            };
                            return updated;
                          });
                        }}
                        className="text-sm text-[#03143B] font-medium hover:underline"
                      >
                        + Add FAQ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* RFP Response Section */}
        {activeSection === 'rfp-response' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">RFP Response Appendix</h2>
              <p className="text-gray-600 mt-1">
                Generate grounded answers to RFP questions. Answers are matched against Wisq&apos;s knowledge base for accuracy.
              </p>
            </div>

            <RFPResponseSection
              appendix={rfpAppendix}
              uploadedDocuments={aiPersonalization.uploadedDocuments}
              company={company}
              accountResearch={generatedContent?.accountResearch}
              onChange={setRFPAppendix}
            />

            {rfpAppendix.enabled && rfpAppendix.answers.length > 0 && (
              <div className={`border rounded-lg p-4 ${
                rfpAppendix.answers.some(a => a.source === 'needs_manual' && !a.answer)
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    rfpAppendix.answers.some(a => a.source === 'needs_manual' && !a.answer)
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}>
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {rfpAppendix.answers.some(a => a.source === 'needs_manual' && !a.answer) ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      )}
                    </svg>
                  </div>
                  <div>
                    <h4 className={`font-medium ${
                      rfpAppendix.answers.some(a => a.source === 'needs_manual' && !a.answer)
                        ? 'text-yellow-800'
                        : 'text-green-800'
                    }`}>
                      {rfpAppendix.answers.some(a => a.source === 'needs_manual' && !a.answer)
                        ? 'RFP Appendix Ready (with warnings)'
                        : 'RFP Appendix Ready'}
                    </h4>
                    <p className={`text-sm mt-1 ${
                      rfpAppendix.answers.some(a => a.source === 'needs_manual' && !a.answer)
                        ? 'text-yellow-700'
                        : 'text-green-700'
                    }`}>
                      {rfpAppendix.answers.filter(a => a.source === 'knowledge_base').length} KB matches,{' '}
                      {rfpAppendix.answers.filter(a => a.source === 'ai_generated').length} AI generated,{' '}
                      {rfpAppendix.answers.filter(a => a.source === 'needs_manual' && !a.answer).length} need manual input
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Review Section */}
        {activeSection === 'review' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Review & Generate</h2>
              <p className="text-gray-600 mt-1">
                Review your inputs before generating the proposal.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Company</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Company</dt>
                    <dd className="font-medium">{company.companyName || '—'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Industry</dt>
                    <dd className="font-medium">{company.industry}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Contact</dt>
                    <dd className="font-medium">{company.contactName || '—'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Title</dt>
                    <dd className="font-medium">{company.contactTitle}</dd>
                  </div>
                </dl>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Investment</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Employees</dt>
                    <dd className="font-medium">{pricing.employeeCount.toLocaleString()}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Platform</dt>
                    <dd className="font-medium">{pricing.yearlyConfig[0]?.platform.included ? 'Yes' : 'No'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Workflows</dt>
                    <dd className="font-medium">{pricing.yearlyConfig[0]?.workflows.included ? 'Yes' : 'No'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Annual Investment</dt>
                    <dd className="font-medium text-[#03143B]">
                      ${calculatePricing(pricing).annualRecurringRevenue.toLocaleString()}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Value Drivers</h3>
                <ol className="space-y-2">
                  {VALUE_DRIVERS.map((driver) => (
                    <li key={driver} className="flex items-center gap-2 text-sm">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                        primaryValueDriver === driver ? 'bg-[#03143B] text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {primaryValueDriver === driver ? '★' : '•'}
                      </span>
                      <span className={primaryValueDriver === driver ? 'font-semibold' : ''}>
                        {VALUE_DRIVER_LABELS[driver]}: {VALUE_DRIVER_HEADLINES[driver]}
                      </span>
                      {primaryValueDriver === driver && (
                        <span className="text-xs bg-[#03143B]/10 text-[#03143B] px-1.5 py-0.5 rounded">Primary</span>
                      )}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pain Points</h3>
                {painPoints.length > 0 ? (
                  <ul className="space-y-1">
                    {painPoints.map((point) => (
                      <li key={point} className="flex items-center gap-2 text-sm">
                        <span className="w-1.5 h-1.5 bg-[#03143B] rounded-full" />
                        <span>{PAIN_POINT_LABELS[point]}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-sm">No pain points selected</p>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#03143B] to-[#020e29] rounded-lg p-8 text-white text-center">
              <h3 className="text-xl font-semibold mb-2">Ready to Generate</h3>
              <p className="text-white/80 mb-6">
                Click the button below to generate your personalized Wisq proposal.
              </p>
              <button
                onClick={handleSubmit}
                disabled={isGenerating}
                className="px-8 py-3 bg-white text-[#03143B] font-semibold rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Generating Proposal...
                  </span>
                ) : (
                  'Generate Proposal'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={goToPrevSection}
            disabled={activeSection === sections[0].id}
            className="px-6 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Back
          </button>

          {activeSection !== 'review' ? (
            <button
              onClick={goToNextSection}
              disabled={!canProceed()}
              className="px-6 py-2 bg-[#03143B] text-white rounded-lg hover:bg-[#020e29] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue →
            </button>
          ) : null}
        </div>
      </main>}
    </div>
  );
}
