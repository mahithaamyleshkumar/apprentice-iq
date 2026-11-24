import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// MediaPipe/TFLite WASM writes C++ INFO/WARNING initialization logs to stderr (console.error).
// Reroute those benign delegate notices to console.info while preserving all real errors.
const originalConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  const first = typeof args[0] === 'string' ? args[0] : '';
  if (
    first.startsWith('INFO: Created TensorFlow Lite XNNPACK delegate') ||
    first.includes('Created TensorFlow Lite XNNPACK delegate for CPU') ||
    first.startsWith('WARNING: All log messages before absl::InitializeLog()')
  ) {
    console.info(...args);
    return;
  }
  originalConsoleError(...args);
};

createRoot(document.getElementById('root')!).render(<App />);

