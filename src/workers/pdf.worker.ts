// PDF generation Web Worker — offloads @react-pdf/renderer from main thread.
// If module resolution fails, the main thread handles PDF generation.

import { pdf } from '@react-pdf/renderer';

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'generate-pdf') {
    try {
      // Dynamic import of the document factory
      const { createReportDocument } = await import('./pdf-document-factory');
      const doc = createReportDocument(payload);
      const blob = await pdf(doc).toBlob();

      self.postMessage({ type: 'pdf-ready', blob });
    } catch (error: any) {
      self.postMessage({ type: 'pdf-error', error: error.message });
    }
  }
};

export {};
