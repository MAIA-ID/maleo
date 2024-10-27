let mockSegments = [
    {
        id: 0,
        start: 0,
        end: 0.49460189880245975,
        confidence: 0.7453834314216298,
        label: 'NO_SPEAKER',
        text: ''
    },
    {
        id: 2,
        start: 0.49460189880245975,
        end: 5.457676124716797,
        confidence: 0.9883406894997293,
        label: 'SPEAKER_2',
        text: 'Quilter is the apostle of the middle classes, and we are glad to welcome his gospel.'
    },
    {
        id: 0,
        start: 5.457676124716797,
        end: 5.867001834070557,
        confidence: 0.703976880195795,
        label: 'NO_SPEAKER',
        text: ''
    }
];

self.onmessage = async function (e) {
    const { type, audioFile } = e.data;

    if (type === 'process') {
        // Simulate processing time
        const totalSteps = 5;

        for (let step = 1; step <= totalSteps; step++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            self.postMessage({
                type: 'progress',
                progress: (step / totalSteps) * 100
            });
        }

        self.postMessage({
            type: 'complete',
            segments: mockSegments
        });
    }
};