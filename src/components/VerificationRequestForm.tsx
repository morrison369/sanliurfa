/**
 * Verification Request Form Component
 * Allows users to submit verification requests for places
 */

import React, { useState } from 'react';

interface VerificationRequestFormProps {
  placeId: string;
  placeName: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface FormState {
  isLoading: boolean;
  error: string | null;
  success: boolean;
}

export function VerificationRequestForm({
  placeId,
  placeName,
  onSuccess,
  onError
}: VerificationRequestFormProps) {
  const [state, setState] = useState<FormState>({
    isLoading: false,
    error: null,
    success: false
  });
  const [documents, setDocuments] = useState<File[]>([]);

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setDocuments(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setState({ isLoading: true, error: null, success: false });

    try {
      // In a real app, you'd upload documents to a file service first
      // For now, just send the verification request
      const response = await fetch(`/api/places/${placeId}/request-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documents: documents.map(f => ({ name: f.name, size: f.size }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Verification request failed');
      }

      setState({ isLoading: false, error: null, success: true });
      onSuccess?.();

      // Reset form
      setDocuments([]);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setState({ isLoading: false, error: null, success: false });
      }, 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setState({ isLoading: false, error: errorMessage, success: false });
      onError?.(errorMessage);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {placeName} için Doğrulama Talebinde Bulunun
        </h3>
        <p className="text-sm text-gray-600">
          Mekanınızı doğrulatarak güvenilirliğini artırın ve özel rozetler kazanın.
        </p>
      </div>

      {state.error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}

      {state.success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">
            ✓ Doğrulama talebiniz başarıyla gönderildi. Admin tarafından incelenecektir.
          </p>
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Destekleyici Belgeler (İsteğe Bağlı)
        </label>
        <input
          type="file"
          multiple
          onChange={handleDocumentChange}
          disabled={state.isLoading}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:border file:border-gray-300
            file:rounded file:text-sm file:font-medium
            file:bg-gray-50 file:text-gray-700
            hover:file:bg-gray-100
            disabled:opacity-50"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        />
        <p className="text-xs text-gray-500 mt-2">
          İşletme lisanı, kimlik belgesi vb. destekleyici dosyalar yükleyebilirsiniz.
        </p>
        {documents.length > 0 && (
          <div className="mt-3 space-y-1">
            {documents.map((doc, idx) => (
              <p key={idx} className="text-xs text-gray-600">
                ✓ {doc.name}
              </p>
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={state.isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        {state.isLoading ? 'Gönderiliyor...' : 'Doğrulama Talebinde Bulun'}
      </button>
    </form>
  );
}
