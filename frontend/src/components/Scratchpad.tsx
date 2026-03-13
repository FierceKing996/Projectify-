import { useEffect, useRef, useState } from 'react';
import { FiMic, FiMicOff, FiTrash2 } from 'react-icons/fi';

const SCRATCHPAD_STORAGE_KEY = 'agency_scratchpad_content';

interface BrowserSpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface BrowserSpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: BrowserSpeechRecognitionAlternative;
}

interface BrowserSpeechRecognitionResultList {
  length: number;
  [index: number]: BrowserSpeechRecognitionResult;
}

interface BrowserSpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: BrowserSpeechRecognitionResultList;
}

interface BrowserSpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface BrowserSpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface BrowserSpeechRecognitionConstructor {
  new(): BrowserSpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

function getStoredScratchpad() {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    return localStorage.getItem(SCRATCHPAD_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function getSpeechRecognitionConstructor() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function appendTranscript(previous: string, next: string) {
  const cleanedTranscript = next.trim();

  if (!cleanedTranscript) {
    return previous;
  }

  if (!previous.trim()) {
    return cleanedTranscript;
  }

  if (previous.endsWith(' ') || previous.endsWith('\n')) {
    return `${previous}${cleanedTranscript}`;
  }

  return `${previous} ${cleanedTranscript}`;
}

function getErrorMessage(errorCode: string) {
  switch (errorCode) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access was blocked. Allow microphone permission and try again.';
    case 'audio-capture':
      return 'No microphone was detected. Check your device audio input.';
    case 'network':
      return 'Voice recognition could not reach the browser speech service.';
    case 'no-speech':
      return 'No speech was detected. Try speaking a little closer to the microphone.';
    default:
      return 'Voice dictation stopped unexpectedly. Try again.';
  }
}

export default function Scratchpad() {
  const recognitionRef = useRef<BrowserSpeechRecognitionInstance | null>(null);
  const [note, setNote] = useState(getStoredScratchpad);
  const [isListening, setIsListening] = useState(false);
  const [dictationPreview, setDictationPreview] = useState('');
  const [recognitionError, setRecognitionError] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const speechRecognitionSupported = Boolean(getSpeechRecognitionConstructor());
  const wordCount = note.trim() ? note.trim().split(/\s+/).length : 0;

  useEffect(() => {
    try {
      localStorage.setItem(SCRATCHPAD_STORAGE_KEY, note);
      setLastSavedAt(new Date());
    } catch {
      setRecognitionError('Scratchpad could not be saved in this browser.');
    }
  }, [note]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setDictationPreview('');
  };

  const startListening = () => {
    if (isListening) {
      return;
    }

    const RecognitionConstructor = getSpeechRecognitionConstructor();

    if (!RecognitionConstructor) {
      setRecognitionError('Voice dictation is available only in supported browsers such as Chrome or Edge.');
      return;
    }

    setRecognitionError('');

    if (!recognitionRef.current) {
      const recognition = new RecognitionConstructor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = typeof navigator !== 'undefined' ? navigator.language || 'en-US' : 'en-US';

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = result[0]?.transcript || '';

          if (result.isFinal) {
            finalTranscript += `${transcript} `;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript.trim()) {
          setNote((previous) => appendTranscript(previous, finalTranscript));
        }

        setDictationPreview(interimTranscript.trim());
      };

      recognition.onerror = (event) => {
        setRecognitionError(getErrorMessage(event.error));
        setIsListening(false);
        setDictationPreview('');
      };

      recognition.onend = () => {
        setIsListening(false);
        setDictationPreview('');
      };

      recognitionRef.current = recognition;
    }

    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      setRecognitionError('Voice dictation is already active or the microphone is unavailable.');
      setIsListening(false);
    }
  };

  const clearScratchpad = () => {
    if (!window.confirm('Clear all scratchpad notes?')) {
      return;
    }

    stopListening();
    setRecognitionError('');
    setNote('');
  };

  return (
    <section className="h-full overflow-y-auto bg-gradient-to-br from-stone-100 via-slate-50 to-blue-50 px-6 py-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
          <div className="border-b border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(239,246,255,0.95))] px-6 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Personal Notes</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Scratchpad</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Jot down rough ideas, reminders, or fragments. Everything is saved locally in this browser.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
                  {wordCount} words
                </div>
                <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  {lastSavedAt ? `Saved at ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Saving...'}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Type anything here. Brain dumps, rough plans, meeting notes, half-formed ideas."
                  className="min-h-[420px] w-full resize-none rounded-2xl border-none bg-transparent px-5 py-5 text-sm leading-7 text-slate-700 outline-none placeholder:text-slate-400"
                />
              </div>

              {dictationPreview && (
                <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/70 px-4 py-3 text-sm text-blue-700">
                  Listening now: {dictationPreview}
                </div>
              )}
            </div>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Voice Capture</p>
                <h2 className="mt-2 text-lg font-semibold text-slate-900">Browser speech-to-text</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Uses your browser microphone support. No AI service is used by the app.
                </p>

                <div className="mt-4 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${isListening
                      ? 'bg-rose-600 text-white hover:bg-rose-700'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    disabled={!speechRecognitionSupported && !isListening}
                  >
                    {isListening ? <FiMicOff size={16} /> : <FiMic size={16} />}
                    {isListening ? 'Stop Dictation' : 'Start Dictation'}
                  </button>

                  <button
                    type="button"
                    onClick={clearScratchpad}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <FiTrash2 size={16} />
                    Clear Notes
                  </button>
                </div>

                {!speechRecognitionSupported && (
                  <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Voice dictation needs a browser with Web Speech API support, usually Chrome or Edge.
                  </p>
                )}

                {recognitionError && (
                  <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {recognitionError}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Tips</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-500">
                  <li>Press the mic, speak naturally, and the text will be appended to your note.</li>
                  <li>Use line breaks manually when you want to separate unrelated ideas.</li>
                  <li>Your scratchpad stays in local browser storage, so it is private to this device and browser profile.</li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
