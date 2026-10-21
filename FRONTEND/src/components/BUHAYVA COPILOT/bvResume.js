/* Turns a picked resume file into the payload bv-parse-resume expects.
   PDFs and images go to Gemini as-is (it reads them natively, layout included);
   Word and text files are converted to text here, because Gemini can't open .docx. */

export const RESUME_ACCEPT = '.pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp';
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

const BINARY_TYPES = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };

const extOf = (name) => name.split('.').pop().toLowerCase();

const toBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
  reader.onerror = () => reject(new Error('Could not read that file.'));
  reader.readAsDataURL(file);
});

export async function readResumeFile(file) {
  const ext = extOf(file.name);
  if (file.size > MAX_RESUME_BYTES) throw new Error('That file is over 5 MB.');

  if (BINARY_TYPES[ext]) {
    return { file_name: file.name, file: { mime_type: BINARY_TYPES[ext], data: await toBase64(file) } };
  }
  if (ext === 'docx') {
    /* Loaded on demand so the Word parser doesn't weigh down the rest of the portfolio. */
    const { default: mammoth } = await import('mammoth/mammoth.browser.js');
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return { file_name: file.name, text: value };
  }
  if (ext === 'txt' || ext === 'md') {
    return { file_name: file.name, text: await file.text() };
  }
  if (ext === 'doc') throw new Error('Old .doc files aren’t supported. Save it as .docx or PDF and try again.');
  throw new Error('Use a PDF, Word (.docx), text file or an image of your resume.');
}
