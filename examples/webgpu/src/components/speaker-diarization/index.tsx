import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle, Upload, Play, Square } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Segment {
    id: number;
    start: number;
    end: number;
    confidence: number;
    label: string;
    text: string;
}

const SpeakerDiarization = () => {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [segments, setSegments] = useState([]);
  const [error, setError] = useState(null);
  const workerRef = useRef(null);

  useEffect(() => {
    // Simulate worker with mock data for demo
    const mockData = [
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

    workerRef.current = {
      postMessage: () => {
        setIsProcessing(true);
        // Simulate processing
        setTimeout(() => {
          setSegments(mockData);
          setIsProcessing(false);
          setProgress(100);
        }, 2000);
      }
    };

    return () => {
      workerRef.current = null;
    };
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type.startsWith('audio/')) {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please select a valid audio file');
      setFile(null);
    }
  };

  const processAudio = () => {
    if (!file) return;
    
    setIsProcessing(true);
    setProgress(0);
    setSegments([]);
    
    workerRef.current.postMessage({
      type: 'process',
      audioFile: file
    });
  };

  const formatTime = (seconds) => {
    return seconds.toFixed(3);
  };

  const formatConfidence = (confidence) => {
    return (confidence * 100).toFixed(2) + '%';
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6 border">
        <h1 className="text-2xl font-bold mb-4">Speaker Diarization</h1>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <Button 
              onClick={() => document.getElementById('audio-input').click()}
              className="flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>Select Audio File</span>
            </Button>
            <input
              id="audio-input"
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              onClick={processAudio}
              disabled={!file || isProcessing}
              className="flex items-center space-x-2"
            >
              {isProcessing ? (
                <Square className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>{isProcessing ? 'Processing...' : 'Start Processing'}</span>
            </Button>
          </div>

          {file && (
            <div className="text-sm text-gray-600">
              Selected file: {file.name}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isProcessing && (
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                Processing: {progress.toFixed(1)}%
              </div>
              <Progress value={progress} />
            </div>
          )}
        </div>
      </div>

      {segments.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 border overflow-x-auto">
          <h2 className="text-xl font-semibold mb-4">Diarization Results</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">ID</TableHead>
                <TableHead className="w-24">Start (s)</TableHead>
                <TableHead className="w-24">End (s)</TableHead>
                <TableHead className="w-24">Confidence</TableHead>
                <TableHead className="w-32">Speaker</TableHead>
                <TableHead>Text</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {segments.map((segment) => (
                <TableRow key={`${segment.id}-${segment.start}`}>
                  <TableCell className="font-medium">{segment.id}</TableCell>
                  <TableCell>{formatTime(segment.start)}</TableCell>
                  <TableCell>{formatTime(segment.end)}</TableCell>
                  <TableCell>{formatConfidence(segment.confidence)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      segment.label === 'NO_SPEAKER' 
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {segment.label}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-md truncate">
                    {segment.text || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default SpeakerDiarization;