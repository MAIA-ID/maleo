import { run } from '../index.js'
// Example usage
const example = async () => {
    const result = await run({
        audio: './examples/audio.wav',  // File path for Node.js
        device: 'cpu',
        audioOptions: {
            targetSampleRate: 16000,
            normalizeAudio: true,
            removeSilence: true,
            silenceThreshold: -50,
        },
        //progress_callback: (progress) => console.log('Progress:', progress)
    });

    console.table(result.segments);
};

example();