'use client';

import React, { useState, useRef, useCallback } from 'react';
import { UploadedDocument } from '@/types/proposal';

interface DocumentUploadProps {
  documents: UploadedDocument[];
  onDocumentsChange: (documents: UploadedDocument[]) => void;
  maxDocuments?: number;
}

export function DocumentUpload({
  documents,
  onDocumentsChange,
  maxDocuments = 5,
}: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);

    if (documents.length + fileArray.length > maxDocuments) {
      setError(`Maximum ${maxDocuments} documents allowed`);
      return;
    }

    setIsUploading(true);
    setError(null);

    for (const file of fileArray) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/parse-document', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          setError(result.error || 'Failed to parse document');
          continue;
        }

        const newDoc: UploadedDocument = {
          id: crypto.randomUUID(),
          name: result.fileName,
          type: result.fileType,
          content: result.text,
          uploadedAt: new Date().toISOString(),
        };

        onDocumentsChange([...documents, newDoc]);
      } catch (err) {
        console.error('Upload error:', err);
        setError('Failed to upload document');
      }
    }

    setIsUploading(false);
  }, [documents, maxDocuments, onDocumentsChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const removeDocument = useCallback((id: string) => {
    onDocumentsChange(documents.filter(doc => doc.id !== id));
  }, [documents, onDocumentsChange]);

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return (
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        );
      case 'docx':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        );
      case 'xlsx':
        return (
          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragging ? 'border-[#03143B] bg-[#03143B]/5' : 'border-gray-300 hover:border-gray-400'}
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.xlsx,.xls,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-2 border-[#03143B] border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-gray-600">Processing document...</p>
          </div>
        ) : (
          <>
            <svg className="w-10 h-10 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-gray-600 mb-1">
              <span className="font-medium text-[#03143B]">Click to upload</span> or drag and drop
            </p>
            <p className="text-sm text-gray-500">PDF, Word, Excel, or text files (max 10MB each)</p>
          </>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Uploaded documents list */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Uploaded Documents ({documents.length}/{maxDocuments})</p>
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
            >
              <div className="flex items-center gap-3">
                {getFileIcon(doc.type)}
                <div>
                  <p className="font-medium text-gray-900 text-sm">{doc.name}</p>
                  <p className="text-xs text-gray-500">
                    {doc.content.split(/\s+/).length.toLocaleString()} words
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeDocument(doc.id)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                title="Remove document"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
