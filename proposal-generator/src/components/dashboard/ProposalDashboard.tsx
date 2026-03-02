'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-hooks';
import { useProposals } from '@/lib/proposal-hooks';
import { hasLegacyProposals, getLegacyProposalCount, migrateProposals } from '@/lib/migration';
import { DocumentType } from '@/types/database';

interface ProposalDashboardProps {
  onOpenProposal: (id: string, documentType?: DocumentType) => void;
}

export function ProposalDashboard({ onOpenProposal }: ProposalDashboardProps) {
  const { email, signOut } = useAuth();
  const { proposals, loading, error, createProposal, deleteProposal, duplicateProposal, refresh } = useProposals();
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

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
      onOpenProposal(newProposal.id, docType);
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

  const handleStartEditName = (id: string, currentName: string) => {
    setEditingNameId(id);
    setEditingName(currentName);
  };

  const handleSaveName = async () => {
    if (editingNameId && editingName.trim()) {
      try {
        await fetch(`/api/proposals/${editingNameId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: editingName.trim() }),
        });
        await refresh();
      } catch (err) {
        console.error('Failed to update name:', err);
      }
    }
    setEditingNameId(null);
    setEditingName('');
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
          /* Proposal Grid */
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {proposals.map((proposal) => (
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

                {/* Name (editable only for owner) */}
                <div className="mb-2">
                  {editingNameId === proposal.id && proposal.isOwner ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={handleSaveName}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                      autoFocus
                      className="w-full px-2 py-1 text-lg font-semibold border border-[#03143B] rounded focus:outline-none focus:ring-2 focus:ring-[#03143B]"
                    />
                  ) : (
                    <h3
                      onClick={() => proposal.isOwner && handleStartEditName(proposal.id, proposal.name)}
                      className={`text-lg font-semibold text-gray-900 truncate ${
                        proposal.isOwner ? 'cursor-pointer hover:text-[#03143B]' : ''
                      }`}
                      title={proposal.isOwner ? 'Click to edit name' : proposal.name}
                    >
                      {proposal.name}
                    </h3>
                  )}
                </div>

                {/* Company & Industry */}
                <div className="text-sm text-gray-500 mb-1">
                  {proposal.companyName || 'No company'}
                  {proposal.industry && <span className="text-gray-400"> &bull; {proposal.industry}</span>}
                </div>

                {/* Last Modified */}
                <div className="text-xs text-gray-400 mb-4">
                  Last modified: {formatDate(proposal.updatedAt)}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => onOpenProposal(proposal.id, proposal.documentType)}
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
        )}
      </main>
    </div>
  );
}
