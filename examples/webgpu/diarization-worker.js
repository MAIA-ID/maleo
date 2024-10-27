import { SpeakerDiarization } from '@maia-id/maleo/browser.js'

let speakerDiarization;

async function initializeDiarization() {
    try {
        speakerDiarization = new SpeakerDiarization();
        self.postMessage({ type: 'init', status: 'success' });
    } catch (error) {
        self.postMessage({
            type: 'error',
            error: 'Failed to initialize diarization: ' + error.message
        });
    }
}

async function processAudioFile(audio, language) {
    try {
        console.log("Language : ", language)
        // Process the audio
        const result = await speakerDiarization.inference({
            audio,
            device: 'wasm',
            language,
            progress_callback: (progress) => {
                self.postMessage({
                    type: 'progress',
                    progress: progress * 100
                });
            }
        });

        console.log(result)

        self.postMessage({
            type: 'complete',
            segments: result.segments
        });
    } catch (error) {
        self.postMessage({
            type: 'error',
            error: 'Processing failed: ' + error.message
        });
    }
}

self.onmessage = async function (e) {
    const { type, audioFile, language } = e.data;

    switch (type) {
        case 'init':
            await initializeDiarization();
            break;

        case 'process':
            if (!speakerDiarization) {
                await initializeDiarization();
            }
            await processAudioFile(audioFile, language);
            break;

        default:
            self.postMessage({
                type: 'error',
                error: 'Unknown command: ' + type
            });
    }
};