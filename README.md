# Speaker Diarization

A JavaScript library for speaker diarization - the process of partitioning an audio stream into segments according to speaker identity.

## Features

- Audio preprocessing with customizable options
- CPU, GPU, and WebGPU support
- Progress tracking during inference
- Flexible audio input handling
- Silence removal and audio normalization capabilities

## Prerequisites

### GPU Support

If you plan to use GPU acceleration, ensure you have the required CUDA libraries installed:

```bash
libcublasLt.so.12
```

For CUDA installation instructions, refer to the [NVIDIA cuDNN Installation Guide](https://docs.nvidia.com/deeplearning/cudnn/latest/installation/linux.html).

## Installation

```bash
npm install speaker-diarization
```

## Usage

### Basic Example

```javascript
import { SpeakerDiarization } from 'speaker-diarization';

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

    console.table(result.segments);
};

example();
```

### Running the Example

```bash
node examples/inference.js
```

## Configuration Options

### Audio Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| targetSampleRate | number | 16000 | Target sample rate for audio processing |
| normalizeAudio | boolean | true | Whether to normalize audio amplitude |
| removeSilence | boolean | true | Whether to remove silence segments |
| silenceThreshold | number | -50 | Threshold (in dB) for silence detection |

### Inference Options

| Option | Type | Description |
|--------|------|-------------|
| audio | string | Path to the audio file |
| device | 'cpu' \| 'cuda' | Processing device to use |
| progress_callback | function | Callback for tracking progress |

## Output Format

The inference method returns a result object containing segments with the following structure:

```typescript
interface Segment {
    start: number;      // Start time in seconds
    end: number;        // End time in seconds
    speaker: string;    // Speaker identifier
    confidence: number; // Confidence score
}
```

## Citation

If you use this library in your research, please cite:

```bibtex
@inproceedings{irawan2025cross,
  title = {Cross-Platform Speaker Diarization: Evaluating the Scalability of Maleo},
  author = {Eka Tresna Irawan and Ardi Mardiana and Dedy Hariyadi and I Putu Agus Eka Pratama},
  booktitle = {International Conference on Discoveries in Applied Sciences & Advanced Technology 2025},
  year = {2025}
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- NVIDIA for CUDA support