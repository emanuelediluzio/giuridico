import React from 'react';
import { Document, Packer, Paragraph, TextRun } from 'docx';

interface DownloadWordButtonProps {
  content: string;
  fileName?: string;
}

const DownloadWordButton: React.FC<DownloadWordButtonProps> = ({
  content,
  fileName = 'lettera_diffida.docx'
}) => {
  const handleDownload = async () => {
    try {
      // Crea un nuovo documento Word
      const doc = new Document({
        sections: [{
          properties: {},
          children: content.split('\n').map(line =>
            new Paragraph({
              children: [
                new TextRun({
                  text: line,
                  size: 24, // 12pt
                }),
              ],
            })
          ),
        }],
      });

      // Genera il file .docx
      const buffer = await Packer.toBuffer(doc);

      // Crea un blob e un URL per il download
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = new Blob([buffer as any], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      const url = window.URL.createObjectURL(blob);

      // Crea un link temporaneo e simula il click
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();

      // Pulisci
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Errore durante la generazione del file Word:', error);
      alert('Si è verificato un errore durante la generazione del file Word.');
    }
  };

  return (
    <button
      onClick={handleDownload}
      className="px-6 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition duration-150 ease-in-out shadow-sm flex items-center"
    >
      <svg
        className="w-5 h-5 mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      Scarica Word
    </button>
  );
};

export default DownloadWordButton; 