import { SpeakerDiarization } from '../index.js'
// Example usage
const example = async () => {
    const speakerDiarization = new SpeakerDiarization();
    const result = await speakerDiarization.inference({
        audio: 'audio.wav',  // File path for Node.js
        language: "en",
        device: 'cpu', // or 'cuda'
        audioOptions: {
            targetSampleRate: 16000,
            normalizeAudio: true,
            removeSilence: true,
            silenceThreshold: -50,
        },
        progress_callback: (progress) => console.log('Progress:', progress)
    });

    console.table(result.segments);
};

example();