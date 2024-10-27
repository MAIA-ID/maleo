import { AudioProcessor } from '@maia-id/maleo/browser.js'
let worker;
let isProcessing = false;

// Initialize Web Worker
function initWorker() {
    worker = new Worker(new URL('./diarization-worker.js', import.meta.url));
    
    worker.onmessage = function(e) {
        const { type, progress, segments } = e.data;
        
        if (type === 'progress') {
            updateProgress(progress);
        } else if (type === 'complete') {
            displayResults(segments);
            isProcessing = false;
            updateProgress(100);
        }
    };
}

// DOM Elements
const fileInput = document.getElementById('fileInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const processBtn = document.getElementById('processBtn');
const fileInfo = document.getElementById('fileInfo');
const alert = document.getElementById('alert');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const resultsContainer = document.getElementById('resultsContainer');
const resultsTableBody = document.getElementById('resultsTableBody');

// Event Listeners
selectFileBtn.addEventListener('click', () => fileInput.click());
processBtn.addEventListener('click', processAudio);
fileInput.addEventListener('change', handleFileSelect);

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('audio/')) {
        fileInfo.textContent = `Selected file: ${file.name}`;
        processBtn.disabled = false;
        alert.classList.remove('show');
    } else {
        fileInfo.textContent = '';
        processBtn.disabled = true;
        showAlert('Please select a valid audio file');
    }
}

function showAlert(message) {
    alert.textContent = message;
    alert.classList.add('show');
}

function updateProgress(value) {
    progressContainer.classList.remove('hidden');
    progressBar.style.width = `${value}%`;
    progressText.textContent = `Processing: ${value.toFixed(1)}%`;
}

async function processAudio() {
    if (!fileInput.files[0] || isProcessing) return;
    
    isProcessing = true;
    processBtn.disabled = true;
    resultsContainer.classList.add('hidden');
    const language = languageSelect.value;
    updateProgress(0);
    
    if (!worker) {
        initWorker();
    }
    const audioProcessor = new AudioProcessor({
      targetSampleRate: 16000,
      normalizeAudio: true,
      removeSilence: true,
      silenceThreshold: -50,
  });

  const audioFile = await audioProcessor.processAudioFile(fileInput.files[0]);

    worker.postMessage({
        type: 'process',
        audioFile,
        language
    });
}

function formatTime(seconds) {
    return seconds.toFixed(3);
}

function formatConfidence(confidence) {
    return (confidence * 100).toFixed(2) + '%';
}

function displayResults(segments) {
    resultsTableBody.innerHTML = '';
    
    segments.forEach(segment => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${segment.id}</td>
            <td>${formatTime(segment.start)}</td>
            <td>${formatTime(segment.end)}</td>
            <td>${formatConfidence(segment.confidence)}</td>
            <td>
                <span class="speaker-tag ${segment.label === 'NO_SPEAKER' ? 'no-speaker' : 'speaker'}">
                    ${segment.label}
                </span>
            </td>
            <td>${segment.text || '—'}</td>
        `;
        resultsTableBody.appendChild(row);
    });
    
    resultsContainer.classList.remove('hidden');
    processBtn.disabled = false;
}

// Initialize the worker
initWorker();