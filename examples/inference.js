import { SpeakerDiarization } from '../index.js'
// Example usage
const example = async () => {
    const speakerDiarization = new SpeakerDiarization();
    const result = await speakerDiarization.inference({
        audio: './examples/audio.wav',  // File path for Node.js
        device: 'cpu', // or 'cuda'
        audioOptions: {
            targetSampleRate: 16000,
            normalizeAudio: true,
            removeSilence: true,
            silenceThreshold: -50,
        },
        progress_callback: (progress) => console.log('Progress:', progress)
    });

    console.log(result.segments);
};

example();