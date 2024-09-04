
import { pipeline, AutoProcessor, AutoModelForAudioFrameClassification } from '@huggingface/transformers';
import wavefile from 'wavefile';

const PER_DEVICE_CONFIG = {
    webgpu: {
        dtype: {
            encoder_model: 'fp32',
            decoder_model_merged: 'q4',
        },
        device: 'webgpu',
    },
    wasm: {
        dtype: 'q8',
        device: 'wasm',
    },
};

/**
 * This class uses the Singleton pattern to ensure that only one instance of the model is loaded.
 */
class PipelineSingeton {
    static asr_model_id = 'onnx-community/whisper-base_timestamped';
    static asr_instance = null;

    static segmentation_model_id = 'onnx-community/pyannote-segmentation-3.0';
    static segmentation_instance = null;
    static segmentation_processor = null;

    static async getInstance(progress_callback = null, device = 'wasm') {
        this.asr_instance ??= pipeline('automatic-speech-recognition', this.asr_model_id, {
            //...PER_DEVICE_CONFIG[device],
            progress_callback,
        });

        this.segmentation_processor ??= AutoProcessor.from_pretrained(this.segmentation_model_id, {
            progress_callback,
        });
        this.segmentation_instance ??= AutoModelForAudioFrameClassification.from_pretrained(this.segmentation_model_id, {
            // NOTE: WebGPU is not currently supported for this model
            // See https://github.com/microsoft/onnxruntime/issues/21386
            device: 'cpu',
            dtype: 'fp32',
            progress_callback,
        });

        return Promise.all([this.asr_instance, this.segmentation_processor, this.segmentation_instance]);
    }
}

async function load({ device }) {
    console.log({
        status: 'loading',
        data: `Loading models (${device})...`
    });

    // Load the pipeline and save it for future use.
    const [transcriber, segmentation_processor, segmentation_model] = await PipelineSingeton.getInstance(x => {
        // We also add a progress callback to the pipeline so that we can
        // track model loading.
        console.log(x);
    }, device);

    if (device === 'wasm') {
        console.log({
            status: 'loading',
            data: 'Compiling shaders and warming up model...'
        });

        await transcriber(new Float32Array(16_000), {
            language: 'en',
        });
    }

    console.log({ status: 'loaded' });
}

async function segment(processor, model, audio) {
    const inputs = await processor(audio);
    const { logits } = await model(inputs);
    const segments = processor.post_process_speaker_diarization(logits, audio.length)[0];

    // Attach labels
    for (const segment of segments) {
        segment.label = model.config.id2label[segment.id];
    }

    return segments;
}

async function run({ audio, language }) {
    const [transcriber, segmentation_processor, segmentation_model] = await PipelineSingeton.getInstance();

    const start = performance.now();

    // Run transcription and segmentation in parallel
    const [transcript, segments] = await Promise.all([
        transcriber(audio, {
            language,
            return_timestamps: 'word',
            chunk_length_s: 30,
        }),
        segment(segmentation_processor, segmentation_model, audio)
    ]);
    console.table(segments, ['start', 'end', 'id', 'label', 'confidence']);

    const end = performance.now();

    console.log({ status: 'complete', result: { transcript, segments }, time: end - start });
    console.table(transcript.chunks);
}

// Listen for messages from the main thread
// self.addEventListener('message', async (e) => {
//     const { type, data } = e.data;

//     switch (type) {
//         case 'load':
//             load(data);
//             break;

//         case 'run':
//             run(data);
//             break;
//     }
// });

// load({
//     device: "wasm"
// })

//let url = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav';
let url = "http://localhost:8000/1.wav";
let buffer = Buffer.from(await fetch(url).then(x => x.arrayBuffer()))

// Read .wav file and convert it to required format
let wav = new wavefile.WaveFile(buffer);
wav.toBitDepth('32f'); // Pipeline expects input as a Float32Array
wav.toSampleRate(16000); // Whisper expects audio with a sampling rate of 16000
let audioData = wav.getSamples();
if (Array.isArray(audioData)) {
  if (audioData.length > 1) {
    const SCALING_FACTOR = Math.sqrt(2);

    // Merge channels (into first channel to save memory)
    for (let i = 0; i < audioData[0].length; ++i) {
      audioData[0][i] = SCALING_FACTOR * (audioData[0][i] + audioData[1][i]) / 2;
    }
  }

  // Select first channel
  console.log(audioData);
  audioData = audioData[0];
}

run({
    audio: audioData,
    language : "id"
})

