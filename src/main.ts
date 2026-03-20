import './style.css';
import { extractTextFromPDF } from './utils/pdfParser';
import { analyzeResume, type CandidateResult } from './api/gemini';

// DOM Elements
const elements = {
  jobDescription: document.getElementById('jobDescription') as HTMLTextAreaElement,
  fileInput: document.getElementById('fileInput') as HTMLInputElement,
  uploadZone: document.getElementById('uploadZone') as HTMLDivElement,
  fileList: document.getElementById('fileList') as HTMLDivElement,
  analyzeBtn: document.getElementById('analyzeBtn') as HTMLButtonElement,
  loadingIndicator: document.getElementById('loadingIndicator') as HTMLDivElement,
  progressBar: document.getElementById('progressBar') as HTMLDivElement,
  resultsSection: document.getElementById('resultsSection') as HTMLDivElement,
  candidatesList: document.getElementById('candidatesList') as HTMLDivElement,
  topCandidateAlert: document.getElementById('topCandidateAlert') as HTMLDivElement,
  downloadBtn: document.getElementById('downloadBtn') as HTMLButtonElement,
};

// State
let selectedFiles: File[] = [];
let analysisResults: CandidateResult[] = [];

// Initialize
function init() {
  // Event Listeners
  elements.jobDescription.addEventListener('input', validateState);
  
  // File Upload Handlers
  elements.uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.uploadZone.classList.add('dragover');
  });
  elements.uploadZone.addEventListener('dragleave', () => elements.uploadZone.classList.remove('dragover'));
  elements.uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.uploadZone.classList.remove('dragover');
    if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
  });
  elements.fileInput.addEventListener('change', () => {
    if (elements.fileInput.files) handleFiles(elements.fileInput.files);
    // Reset the input value so the same file selection triggers 'change' again if needed
    elements.fileInput.value = '';
  });

  // Action Buttons
  elements.analyzeBtn.addEventListener('click', runAnalysis);
  elements.downloadBtn.addEventListener('click', downloadCSV);
}

function handleFiles(files: FileList) {
  const newFiles = Array.from(files).filter(f => f.type === 'application/pdf');
  selectedFiles = [...selectedFiles, ...newFiles];
  renderFileList();
  validateState();
}

function renderFileList() {
  elements.fileList.innerHTML = '';
  selectedFiles.forEach((file, index) => {
    const el = document.createElement('div');
    el.className = 'file-item';
    el.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
      <span style="flex:1" class="ellipsis">${file.name}</span>
      <button type="button" class="btn-remove" data-index="${index}" style="background:none;border:none;color:var(--danger);cursor:pointer">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    `;
    elements.fileList.appendChild(el);
  });

  // Attach remove listeners
  document.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt((e.currentTarget as HTMLButtonElement).dataset.index || '0', 10);
      selectedFiles.splice(idx, 1);
      renderFileList();
      validateState();
    });
  });
}

function validateState() {
  const hasJd = elements.jobDescription.value.trim().length > 0;
  const hasFiles = selectedFiles.length > 0;
  // Read key directly from the environment
  const hasKey = !!import.meta.env.VITE_GEMINI_API_KEY;

  elements.analyzeBtn.disabled = !(hasKey && hasJd && hasFiles);
}

async function runAnalysis() {
  elements.analyzeBtn.disabled = true;
  elements.loadingIndicator.classList.remove('hidden');
  elements.resultsSection.classList.add('hidden');
  elements.progressBar.style.width = '0%';
  analysisResults = [];

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  const jd = elements.jobDescription.value.trim();
  const total = selectedFiles.length;

  for (let i = 0; i < total; i++) {
    const file = selectedFiles[i];
    try {
      const text = await extractTextFromPDF(file);
      if (!text) throw new Error("Could not extract text.");
      
      const result = await analyzeResume(apiKey, jd, text);
      result.candidate = file.name.replace('.pdf', '');
      analysisResults.push(result);
      
    } catch (err: any) {
      analysisResults.push({
        candidate: file.name.replace('.pdf', ''),
        score: 0,
        strengths: ["Failed to process file"],
        gaps: [err.message || "Parse Error"],
        recommendation: "Not Fit"
      });
    }

    elements.progressBar.style.width = `${((i + 1) / total) * 100}%`;
  }

  // Sort by score
  analysisResults.sort((a, b) => b.score - a.score);

  renderResults();
  
  elements.loadingIndicator.classList.add('hidden');
  elements.analyzeBtn.disabled = false;
  elements.resultsSection.classList.remove('hidden');
  elements.resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function renderResults() {
  elements.candidatesList.innerHTML = '';
  
  if (analysisResults.length === 0) return;

  const top = analysisResults[0];
  elements.topCandidateAlert.classList.remove('hidden');
  elements.topCandidateAlert.innerHTML = `🏆 <strong>Top Candidate:</strong> ${top.candidate} (${top.score}% Match)`;

  analysisResults.forEach(res => {
    let recClass = 'fit-not';
    if (res.recommendation === 'Strong Fit') recClass = 'fit-strong';
    if (res.recommendation === 'Moderate Fit') recClass = 'fit-moderate';

    const strengthsHtml = res.strengths.map(s => `<li>${s}</li>`).join('');
    const gapsHtml = res.gaps.map(g => `<li>${g}</li>`).join('');

    const el = document.createElement('div');
    el.className = 'candidate-card';
    el.innerHTML = `
      <div class="card-summary">
        <div class="candidate-main">
          <div class="candidate-score">${res.score}%</div>
          <div class="candidate-info">
            <h4>${res.candidate}</h4>
            <span class="pill ${recClass}">${res.recommendation}</span>
          </div>
        </div>
        <div class="card-toggle">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </div>
      <div class="card-details">
        <div class="detail-list">
          <h5 class="strengths">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
            Key Strengths
          </h5>
          <ul>${strengthsHtml}</ul>
        </div>
        <div class="detail-list">
          <h5 class="gaps">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Key Gaps
          </h5>
          <ul>${gapsHtml}</ul>
        </div>
      </div>
    `;

    // Toggle logic
    const summary = el.querySelector('.card-summary') as HTMLDivElement;
    summary.addEventListener('click', () => {
      el.classList.toggle('expanded');
    });

    elements.candidatesList.appendChild(el);
  });
}

function downloadCSV() {
  if (analysisResults.length === 0) return;

  const headers = ['Candidate', 'Score', 'Recommendation', 'Strengths', 'Gaps'];
  const rows = analysisResults.map(r => [
    r.candidate,
    r.score.toString(),
    r.recommendation,
    '"' + r.strengths.join('; ') + '"',
    '"' + r.gaps.join('; ') + '"'
  ]);

  const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", "resume_analysis.csv");
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Bootstrap
init();
