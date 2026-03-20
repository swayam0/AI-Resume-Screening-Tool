import * as pdfjsLib from 'pdfjs-dist';

// Use Vite's static asset URL import so it bundles the worker offline
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export async function extractTextFromPDF(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();

    fileReader.onload = async function() {
      try {
        const typedarray = new Uint8Array(this.result as ArrayBuffer);
        
        // Load the PDF document
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        
        let fullText = '';
        
        // Loop through each page
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          // Join the text items
          const pageText = textContent.items
            // @ts-ignore
            .map(item => item.str)
            .join(' ');
            
          fullText += pageText + '\n';
        }
        
        resolve(fullText.trim());
      } catch (error) {
        console.error("Error extracting text from PDF", error);
        reject(error);
      }
    };

    fileReader.onerror = function() {
      reject(new Error("Failed to read file"));
    };

    fileReader.readAsArrayBuffer(file);
  });
}
