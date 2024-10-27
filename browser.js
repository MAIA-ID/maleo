import { pipeline, AutoProcessor, AutoModelForAudioFrameClassification } from '@huggingface/transformers';

// Constants and Configurations
const AUDIO_CONSTANTS = {
    TARGET_SAMPLE_RATE: 16000,
    TARGET_CHANNELS: 1,
    SUPPORTED_FORMATS: ['wav', 'mp3', 'ogg', 'm4a', 'flac'],
    CHUNK_DURATION: 30,
    MIN_AUDIO_LENGTH: 0.1,
    MAX_AUDIO_LENGTH: 600,
    TEMP_DIR: process.env.TEMP_DIR || 'temp'
};

const PER_DEVICE_CONFIG = {
    webgpu: {
        dtype: {
            encoder_model: 'fp32',
            decoder_model_merged: 'q4',
        },
        device: 'webgpu',
        executionProvider: 'webgpu',
    },
    cuda: {
        dtype: {
            encoder_model: 'fp16',
            decoder_model_merged: 'q4',
        },
        device: 'cuda',
        executionProvider: 'cuda',
    },
    cpu: {
        dtype: 'fp32',
        device: 'cpu',
        executionProvider: 'cpu',
    },
    wasm: {
        dtype: 'q8',
        device: 'wasm',
        executionProvider: 'wasm',
    },
};

// Environment detection
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
const isBrowser = typeof window !== 'undefined';

class DeviceDetector {
    async checkWebGPU() {
        if (isNode) return false;
        if (!navigator.gpu) return false;
        try {
            const adapter = await navigator.gpu.requestAdapter();
            return !!adapter;
        } catch {
            return false;
        }
    }

    async getBestAvailableDevice() {
        if (await this.checkCUDA()) return 'cuda';
        if (await this.checkWebGPU()) return 'webgpu';
        return 'cpu';
    }
}

class AudioProcessor {
    constructor(options = {}) {
        this.options = {
            targetSampleRate: options.targetSampleRate || AUDIO_CONSTANTS.TARGET_SAMPLE_RATE,
            targetChannels: options.targetChannels || AUDIO_CONSTANTS.TARGET_CHANNELS,
            normalizeAudio: options.normalizeAudio !== false,
            removeSilence: options.removeSilence !== false,
            silenceThreshold: options.silenceThreshold || -50,
            tempDir: options.tempDir || AUDIO_CONSTANTS.TEMP_DIR,
            ...options
        };

    }

    async processAudioFile(input) {
        try {
            let audioData;
            

                // Browser processing
                if (input instanceof File) {
                    audioData = await this.processBrowserFile(input);
                } else if (input instanceof ArrayBuffer) {
                    audioData = await this.processBrowserArrayBuffer(input);
                } else if (input instanceof Float32Array) {
                    audioData = input;
                } else {
                    throw new Error('Unsupported input type in browser');
                }

            return await this.applyProcessingPipeline(audioData);
        } catch (error) {
            console.error('Audio processing error:', error);
            throw error;
        }
    }


    async processBrowserFile(file) {
        const buffer = await file.arrayBuffer();
        return this.processBrowserArrayBuffer(buffer);
    }

    async processBrowserArrayBuffer(buffer) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16_000 });

        try {
            const audioBuffer = await audioContext.decodeAudioData(buffer);
            let audio;
            if (audioBuffer.numberOfChannels === 2) {
                // Merge channels
                const SCALING_FACTOR = Math.sqrt(2);
                const left = audioBuffer.getChannelData(0);
                const right = audioBuffer.getChannelData(1);
                audio = new Float32Array(left.length);
                for (let i = 0; i < audioBuffer.length; ++i) {
                    audio[i] = SCALING_FACTOR * (left[i] + right[i]) / 2;
                }
            } else {
                audio = audioBuffer.getChannelData(0);
            }
            return audio;

        } catch (e) {
            console.error('processBrowserArrayBuffer error:', error);
            throw error;
        }
    }

    // Add this new method
    async applyProcessingPipeline(audioData) {
        // Implement your audio processing pipeline here
        // For example:
        if (this.options.normalizeAudio) {
            audioData = this.normalizeAudio(audioData);
        }
        if (this.options.removeSilence) {
            audioData = this.removeSilence(audioData);
        }
        // Add any other processing steps as needed
        return audioData;
    }

    // You might need to implement these methods as well
    normalizeAudio(audioData) {
        // Implement audio normalization
        // This is a placeholder implementation
        return audioData;
    }

    removeSilence(audioData) {
        // Implement silence removal
        // This is a placeholder implementation
        return audioData;
    }

    // ... other existing methods ...
}

class SpeakerDiarization {
    asr_model_id = 'onnx-community/whisper-base_timestamped';
    segmentation_model_id = 'onnx-community/pyannote-segmentation-3.0';
    
    asr_instance = null;
    segmentation_instance = null;
    segmentation_processor = null;
    audioProcessor = null;

    async initialize(options = {}) {

        console.log(options)
        const device = options.device || await DeviceDetector.getBestAvailableDevice();
        const deviceConfig = PER_DEVICE_CONFIG[device];

        if (!deviceConfig) {
            throw new Error(`Unsupported device : ${device}`);
        }

        console.log(`Initializing unified pipeline with device: ${device}`);

        // Initialize audio processor with environment-specific options
        this.audioProcessor = new AudioProcessor({
            ...options.audioOptions
        });

        // Initialize ML models
        this.asr_instance ??= await pipeline('automatic-speech-recognition', this.asr_model_id, {
            ...deviceConfig,
            progress_callback: options.progress_callback,
        });

        this.segmentation_processor ??= await AutoProcessor.from_pretrained(
            this.segmentation_model_id,
            {
                progress_callback: options.progress_callback,
            }
        );

        const segmentationDevice = device === 'webgpu' ? 'wasm' : device;
        this.segmentation_instance ??= await AutoModelForAudioFrameClassification.from_pretrained(
            this.segmentation_model_id,
            {
                ...PER_DEVICE_CONFIG[segmentationDevice],
                progress_callback: options.progress_callback,
            }
        );

        return {
            device,
            audioProcessor: this.audioProcessor,
            models: {
                asr: this.asr_instance,
                segmentation: {
                    processor: this.segmentation_processor,
                    model: this.segmentation_instance
                }
            }
        };
    }

    async process(audio, options = {}) {
        // Ensure pipeline is initialized
        if (!this.asr_instance || !this.segmentation_instance || !this.audioProcessor) {
            await this.initialize(options);
        }

        try {
            // Split audio into chunks if needed
            const audioChunks = options.splitChunks 
                ? await this.splitAudioIntoChunks(audio)
                : [audio];

            const results = [];
            let totalProgress = 0;

            // Process each chunk
            for (let i = 0; i < audioChunks.length; i++) {
                const chunk = audioChunks[i];
                
                // Update progress
                if (options.progress_callback) {
                    totalProgress = (i / audioChunks.length) * 100;
                    options.progress_callback(totalProgress);
                }

                // Run speaker segmentation
                const segmentation = await this.runSegmentation(chunk);

                // Run ASR
                const transcription = await this.asr_instance(chunk, {
                    language: options.language || 'en',
                    return_timestamps: 'word',
                    chunk_length_s: 30,
                });

                // Merge segmentation and transcription
                const mergedResult = await this.mergeResults(segmentation, transcription);
                results.push(mergedResult);
            }

            // Final progress update
            if (options.progress_callback) {
                options.progress_callback(100);
            }

            // Combine results if there were multiple chunks
            return audioChunks.length > 1 ? this.combineResults(results) : results[0];

        } catch (error) {
            console.error('Processing error:', error);
            throw error;
        }
    }

    async inference(options) {
        try {
            return await this.process(options.audio, {
                device: options.device,
                language: options.language,
                audioOptions: {
                    ...options.audioOptions,
                    isNode,
                    isBrowser
                },
                splitChunks: options.splitChunks,
                progress_callback: options.progress_callback
            });
        } catch (error) {
            console.error('Pipeline error:', error);
            throw error;
        }
    }

    async splitAudioIntoChunks(audio) {
        const chunkSamples = Math.floor(AUDIO_CONSTANTS.CHUNK_DURATION * AUDIO_CONSTANTS.TARGET_SAMPLE_RATE);
        const chunks = [];

        for (let i = 0; i < audio.length; i += chunkSamples) {
            chunks.push(audio.slice(i, i + chunkSamples));
        }

        return chunks;
    }

    async runSegmentation(audio) {
        const features = await this.segmentation_processor(audio, {
            sampling_rate: AUDIO_CONSTANTS.TARGET_SAMPLE_RATE,
            return_tensors: true
        });

        const output = await this.segmentation_instance(features);
        return this.processSegmentationOutput(output, audio);
    }

    processSegmentationOutput(output, audio) {
        // Convert model output to speaker segments
        const scores = output.logits;
        const segments = this.segmentation_processor.post_process_speaker_diarization(scores, audio.length)[0];
        
        // Attach labels
        for (const segment of segments) {
            segment.label = this.segmentation_instance.config.id2label[segment.id];
        }

        return segments;
    }

    async mergeResults(segments, transcription) {
        return {
            segments: segments.map(segment => ({
                ...segment,
                text: this.findTranscriptionInTimeRange(transcription, segment.start, segment.end)
            })),
            text: transcription.text
        };
    }

    findTranscriptionInTimeRange(transcription, start, end) {
        // Find all words that fall within the given time range
        return transcription.chunks
            .filter(chunk => chunk.timestamp[0] >= start && chunk.timestamp[1] <= end)
            .map(chunk => chunk.text)
            .join(' ')
            .trim();
    }

    combineResults(results) {
        return {
            segments: results.flatMap((result, index) => 
                result.segments.map(segment => ({
                    ...segment,
                    start: segment.start + (index * AUDIO_CONSTANTS.CHUNK_DURATION),
                    end: segment.end + (index * AUDIO_CONSTANTS.CHUNK_DURATION)
                }))
            ),
            text: results.map(result => result.text).join(' ')
        };
    }
}

export {
    SpeakerDiarization,
    DeviceDetector,
    AudioProcessor,
    AUDIO_CONSTANTS,
    PER_DEVICE_CONFIG
};