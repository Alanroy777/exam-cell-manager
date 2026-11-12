import React from 'react';
import { useAppStore } from '../store';
import { api } from '../api';
import { Printer, Download, X } from 'lucide-react';

export const PrintPreviewModal: React.FC = () => {
  const { previewModal, closePreview } = useAppStore();
  const { isOpen, title, html } = previewModal;

  if (!isOpen) return null;

  const handlePrint = () => {
    api.printDocument(html);
  };

  const handleSavePdf = () => {
    const filename = `${title.replace(/[/\\?%*:|"<>]/g, '_')}.pdf`;
    api.saveDocumentAsPdf(html, filename);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col items-center justify-center p-4">
      {/* Modal Dialog Container */}
      <div className="bg-white rounded border border-slate-300 w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Bar */}
        <div className="bg-navy-900 text-white px-5 py-3 flex items-center justify-between border-b border-navy-800">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Document Print Preview (A4)
            </span>
            <h2 className="text-sm font-bold truncate max-w-xl">{title}</h2>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded text-xs font-semibold shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              onClick={handleSavePdf}
              className="flex items-center space-x-1.5 bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded text-xs font-semibold shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save as PDF</span>
            </button>

            <button
              onClick={closePreview}
              className="text-slate-400 hover:text-white p-1.5 rounded hover:bg-navy-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Iframe displaying the HTML Document */}
        <div className="flex-1 bg-slate-200 p-6 overflow-auto flex justify-center">
          <div className="w-[210mm] min-h-[297mm] bg-white shadow-md border border-slate-300">
            <iframe
              srcDoc={html}
              title="Print Preview"
              className="w-full h-full min-h-[297mm] border-0"
              style={{ display: 'block' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

