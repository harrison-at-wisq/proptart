'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-hooks';
import { useProposals } from '@/lib/proposal-hooks';
import { hasLegacyProposals, getLegacyProposalCount, migrateProposals } from '@/lib/migration';
import { DocumentType } from '@/types/database';

export function ProposalDashboard() {
  const router = useRouter();
  const { email, signOut } = useAuth();
  const { proposals, loading, error, createProposal, deleteProposal, duplicateProposal, refresh } = useProposals();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'mine'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'proposal' | 'mou'>('all');
  const [sortBy, setSortBy] = useState<'last-modified' | 'first-created'>('last-modified');

  // Migration state
  const [showMigration, setShowMigration] = useState(false);
  const [migrationCount, setMigrationCount] = useState(0);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ success: number; failed: number } | null>(null);

  // Check for legacy proposals on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && hasLegacyProposals()) {
      setMigrationCount(getLegacyProposalCount());
      setShowMigration(true);
    }
  }, []);

  const handleCreateNew = async (docType: DocumentType = 'proposal') => {
    try {
      setActionLoading(true);
      const newProposal = await createProposal(undefined, docType);
      const route = docType === 'mou' ? `/mou/${newProposal.id}` : `/p/${newProposal.id}`;
      router.push(route);
    } catch (err) {
      console.error('Failed to create:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setActionLoading(true);
      await deleteProposal(id);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Failed to delete proposal:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      setActionLoading(true);
      await duplicateProposal(id);
    } catch (err) {
      console.error('Failed to duplicate proposal:', err);
    } finally {
      setActionLoading(false);
    }
  };


  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const result = await migrateProposals();
      setMigrationResult(result);
      await refresh();
    } catch (err) {
      console.error('Migration failed:', err);
    } finally {
      setMigrating(false);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#03143B] rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="3" y="8" width="18" height="12" rx="2" />
                  <rect x="7" y="3" width="10" height="7" rx="1" fill="#F59E0B" />
                  <rect x="6" y="10" width="5" height="1" rx="0.5" fill="#1e293b" />
                  <rect x="13" y="10" width="5" height="1" rx="0.5" fill="#1e293b" />
                  <rect x="19" y="12" width="2" height="4" rx="0.5" fill="#94a3b8" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Prop Tart</h1>
                <p className="text-sm text-gray-500">Your Proposals & MOUs</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {email && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{email}</span>
                  <button
                    onClick={signOut}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Sign out
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCreateNew('mou')}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-white border border-[#03143B] text-[#03143B] rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New MOU
                </button>
                <button
                  onClick={() => handleCreateNew('proposal')}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#03143B] text-white rounded-lg hover:bg-[#03143B]/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Proposal
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Migration Banner */}
      {showMigration && !migrationResult && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-800 font-medium">
                  Found {migrationCount} proposal{migrationCount > 1 ? 's' : ''} in local storage
                </p>
                <p className="text-blue-600 text-sm">
                  Would you like to migrate them to the cloud?
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleMigrate}
                  disabled={migrating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {migrating ? 'Migrating...' : 'Migrate Now'}
                </button>
                <button
                  onClick={() => setShowMigration(false)}
                  className="px-4 py-2 text-blue-600 hover:text-blue-800"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Migration Result */}
      {migrationResult && (
        <div className="bg-green-50 border-b border-green-200">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-green-800">
                Migration complete: {migrationResult.success} succeeded
                {migrationResult.failed > 0 && `, ${migrationResult.failed} failed`}
              </p>
              <button
                onClick={() => {
                  setMigrationResult(null);
                  setShowMigration(false);
                }}
                className="text-green-600 hover:text-green-800"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-4 border-[#03143B] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading proposals...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="text-red-500 mb-4">Error: {error}</div>
            <button
              onClick={() => refresh()}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Try Again
            </button>
          </div>
        ) : proposals.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No documents yet</h2>
            <p className="text-gray-500 mb-6">Create a proposal or MOU to get started.</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => handleCreateNew('mou')}
                disabled={actionLoading}
                className="px-6 py-3 bg-white border border-[#03143B] text-[#03143B] rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Create MOU
              </button>
              <button
                onClick={() => handleCreateNew('proposal')}
                disabled={actionLoading}
                className="px-6 py-3 bg-[#03143B] text-white rounded-lg hover:bg-[#03143B]/90 transition-colors disabled:opacity-50"
              >
                Create Proposal
              </button>
            </div>
          </div>
        ) : (
          <>
          {/* Filters */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {([
                { id: 'all' as const, label: 'All' },
                { id: 'mine' as const, label: 'My Proposals' },
              ]).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setOwnerFilter(opt.id)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    ownerFilter === opt.id
                      ? 'bg-white text-[#03143B] shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {([
                { id: 'all' as const, label: 'All Types' },
                { id: 'proposal' as const, label: 'Proposals' },
                { id: 'mou' as const, label: 'MOUs' },
              ]).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setTypeFilter(opt.id)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    typeFilter === opt.id
                      ? 'bg-white text-[#03143B] shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-1.5 bg-gray-100 border-0 rounded-lg text-sm font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#03143B]"
            >
              <option value="last-modified">Last Modified</option>
              <option value="first-created">First Created</option>
            </select>
          </div>

          {/* Proposal Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {proposals
              .filter((p) => ownerFilter === 'all' || p.isOwner)
              .filter((p) => typeFilter === 'all' || p.documentType === typeFilter)
              .sort((a, b) => {
                if (sortBy === 'last-modified') {
                  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
                }
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
              })
              .map((proposal) => (
              <div
                key={proposal.id}
                className={`bg-white rounded-lg border p-4 transition-colors ${
                  proposal.isOwner
                    ? 'border-gray-200 hover:border-[#03143B]/30'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                {/* Badges */}
                <div className="flex items-center gap-2 mb-2">
                  {/* Document Type Badge */}
                  {proposal.documentType === 'mou' ? (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-medium">
                      MOU
                    </span>
                  ) : (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
                      Proposal
                    </span>
                  )}
                  {/* Ownership Badge */}
                  {!proposal.isOwner && (
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                      View Only - {proposal.ownerEmail}
                    </span>
                  )}
                </div>

                {/* Company Name as Title */}
                <h3 className="text-lg font-semibold text-gray-900 truncate mb-1">
                  {proposal.companyName || 'Unnamed Company'}
                </h3>

                {/* AE Name */}
                {proposal.aeName && (
                  <div className="text-sm text-gray-500">
                    {proposal.aeName}
                  </div>
                )}

                {/* Last Modified */}
                <div className="text-xs text-gray-400 mb-3">
                  Last modified: {formatDate(proposal.updatedAt)}
                </div>

                {/* Quick Access Links */}
                {(proposal.hasGeneratedContent || proposal.micrositeCount > 0) && (
                  <div className="flex items-center gap-2 mb-3">
                    {proposal.hasGeneratedContent && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const route = proposal.documentType === 'mou'
                            ? `/mou/${proposal.id}/assets`
                            : `/p/${proposal.id}/assets`;
                          router.push(route);
                        }}
                        className="inline-flex items-center gap-1 text-xs text-[#03143B] bg-blue-50 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Assets
                      </button>
                    )}
                    {proposal.micrositeCount > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const route = proposal.documentType === 'mou'
                            ? `/mou/${proposal.id}/assets`
                            : `/p/${proposal.id}/assets`;
                          router.push(route);
                        }}
                        className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded hover:bg-emerald-100 transition-colors"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                        </svg>
                        {proposal.micrositeCount} {proposal.micrositeCount === 1 ? 'Microsite' : 'Microsites'}
                      </button>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const route = proposal.documentType === 'mou'
                        ? `/mou/${proposal.id}`
                        : `/p/${proposal.id}`;
                      router.push(route);
                    }}
                    className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                      proposal.isOwner
                        ? 'bg-[#03143B] text-white hover:bg-[#03143B]/90'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {proposal.isOwner ? 'Open' : 'View'}
                  </button>
                  {proposal.isOwner && (
                    <>
                      <button
                        onClick={() => handleDuplicate(proposal.id)}
                        disabled={actionLoading}
                        className="px-3 py-2 border border-gray-300 text-gray-600 text-sm rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
                        title="Duplicate"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      {deleteConfirmId === proposal.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDelete(proposal.id)}
                            disabled={actionLoading}
                            className="px-3 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-3 py-2 border border-gray-300 text-gray-600 text-sm rounded hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(proposal.id)}
                          className="px-3 py-2 border border-gray-300 text-gray-600 text-sm rounded hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </main>
    </div>
  );
}
