import React, { useEffect, useRef, useState } from 'react';
import '../styles/speechToText.css';
import '../styles/newMemoryButton.css';

type Props = {
  setAllRecuerdos?: (arr: any[]) => void;
  setFilteredActive?: (v: boolean) => void;
};

const SpeechToText: React.FC<Props> = ({ setAllRecuerdos, setFilteredActive }) => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState('');
  const [searching, setSearching] = useState(false);
  const recognitionRef = useRef<any>(null);
  const sessionRef = useRef('');

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      recognitionRef.current = null;
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const res = event.results[i];
        if (res.isFinal) {
          sessionRef.current += res[0].transcript + ' ';
        } else {
          interim += res[0].transcript;
        }
      }
      setTranscript(sessionRef.current + interim);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onerror = (e: any) => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try { recognition.stop?.(); } catch (e) {}
      recognitionRef.current = null;
    };
  }, []);

  const startRecognition = () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setMessage('SpeechRecognition no está disponible en este navegador. Prueba Chrome o Edge moderno.');
      return;
    }
    // No limpiar `sessionRef` ni `transcript` aquí: queremos seguir añadiendo texto al reanudar
    try {
      recognition.start();
      setListening(true);
    } catch (e) {
      setListening(false);
    }
  };

  const stopRecognition = () => {
    const recognition = recognitionRef.current;
    try {
      recognition?.stop();
    } catch (e) {}
    setListening(false);
  };

  const openModalAndStart = () => {
    setMessage('');
    setShowModal(true);
    // allow modal to render before starting (no clearing)
    setTimeout(() => startRecognition(), 50);
  };

  const closeModal = () => {
    stopRecognition();
    setShowModal(false);
    setMessage('');
  };

  const clear = () => {
    sessionRef.current = '';
    setTranscript('');
    setMessage('');
  };

  const findInTranscript = () => {
    // Enviar transcript al endpoint serverless que usa OpenAI y filtra recuerdos
    (async () => {
      try {
        setSearching(true);
        const res = await fetch('/.netlify/functions/searchRecuerdos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: transcript, filters: { tags: true, title: true, description: true, location: true } })
        });
        if (!res.ok) {
          await res.text();
          setSearching(false);
          setMessage('Error al buscar recuerdos');
          return;
        }
        const j = await res.json();
        const results = j.results || [];
        setSearching(false);
        if (!results.length) {
          setMessage('No se encontraron recuerdos coincidentes.');
          return;
        }
        // Update global ALL_RECUERDOS in parent if callback provided
        if (typeof setAllRecuerdos === 'function') {
          setAllRecuerdos(results);
        }
        if (typeof setFilteredActive === 'function') setFilteredActive(true);
        // close modal and show brief message
        closeModal();
      } catch (e) {
        setSearching(false);
        setMessage('Error inesperado al buscar recuerdos');
      }
    })();
  };

  return (
    <div className="speech-to-text">
      <button className="stt-open-btn new-memory-button" onClick={openModalAndStart} aria-haspopup="dialog">
        🎤 Fala que eu lembro
      </button>
      

      {showModal && (
        <div className="stt-overlay" role="dialog" aria-modal="true" onClick={closeModal}>
          <div className="stt-modal" onClick={(e) => e.stopPropagation()}>
            <button className="stt-close" onClick={closeModal} aria-label="Cerrar">✕</button>

            <div className="stt-mic-wrap">
              <div className={`mic-pulse ${listening ? 'listening' : ''}`}>
                <svg viewBox="0 0 24 24" width="60" height="60" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3z" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M19 11v1a7 7 0 0 1-14 0v-1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 19v3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {message && (
              <div className="stt-message" role="status" aria-live="polite">{message}</div>
            )}

            <div className="stt-status">
              <div className="stt-dot" />
              <div className="stt-text">{listening ? 'Escuchando...' : 'Inactivo'}</div>
            </div>

            <div className="stt-transcript" aria-live="polite">
              {transcript || <em className="stt-placeholder">Una joven tirada en el suelo de noche... 😆</em>}
            </div>

            {searching ? (
              <div style={{display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center'}}>
                <div className="stt-loader" aria-hidden="true" />
                <div style={{color: '#cbd5e1', fontWeight: 600}}>Buscando recuerdos...</div>
              </div>
            ) : (
              <div className="stt-controls">
                <button className="stt-action new-memory-button" onClick={() => (listening ? stopRecognition() : startRecognition())}>
                  {listening ? 'Detener' : 'Reanudar'}
                </button>
                <button className="stt-action stt-find" onClick={findInTranscript}>Buscar recuerdo</button>
                <button className="stt-action stt-secondary" onClick={clear}>Limpiar texto</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeechToText;
