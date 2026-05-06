// Grilla.tsx
import { useState, useEffect, useMemo } from 'react'; // Add useMemo
import { Box, Paper, Button, Chip, Typography } from '@mui/material';
import { motion } from 'framer-motion';

import '../styles/grillete.css';
import Buscar from './filter'; 
import Loader from './loader';
import SpeechToText from './SpeechToText.js';
import NewMemory from './newMemory';
import Edit from './edit';
import Details from './details';
import { getRecuerdos, updateFavorite, backfillImageTags } from '../services/api.js';
import { Navigate,useNavigate } from 'react-router-dom';
import Footer from './Footer';

const sortRecuerdosByFavorite = (recuerdos: any[]) =>
  [...recuerdos].sort((a, b) => Number(b.favorite) - Number(a.favorite));

const toggleFavoriteInList = (recuerdos: any[], id: string | number) =>
  sortRecuerdosByFavorite(
    recuerdos.map((recuerdo) =>
      recuerdo.id === id ? { ...recuerdo, favorite: !recuerdo.favorite } : recuerdo
    )
  );

  export default function Grilla() {
  const navigate = useNavigate();
  const [valid, setValid] = useState<boolean | null>(null);
  const username = localStorage.getItem("username") || "";

  const [ALL_RECUERDOS, setAllRecuerdos] = useState<any[]>([]);
  const [originalRecuerdos, setOriginalRecuerdos] = useState<any[]>([]);
  const [filteredActive, setFilteredActive] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedRecuerdo, setSelectedRecuerdo] = useState<any>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showNewMemory, setShowNewMemory] = useState(false);
  const [update, setUpdate] = useState(false);
  const [PageNumber, setPageNumber] = useState(1);
  const [actualizando, setactualizando] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // New state
  const [backfilling, setBackfilling] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState('');
  const [toolsOpen, setToolsOpen] = useState(false);

  const handleBackfill = async () => {
    setBackfilling(true);
    setBackfillMsg('');
    try {
      const res = await backfillImageTags();
      const totalChanges = (res.updated || 0) + (res.embeddingsCreated || 0);
      if (totalChanges === 0) {
        setBackfillMsg('✓ Todo ya estaba analizado');
      } else {
        setBackfillMsg(`✓ ${res.updated || 0} etiqueta(s), ${res.embeddingsCreated || 0} embedding(s)`);
        setUpdate(prev => !prev); // recargar recuerdos
      }
    } catch {
      setBackfillMsg('✗ Error al procesar imágenes');
    } finally {
      setBackfilling(false);
      setTimeout(() => setBackfillMsg(''), 4000);
    }
  };

  useEffect(() => {
    const verifySession = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setValid(false);
        return;
      }

      try {
        const response = await fetch("/.netlify/functions/verify", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });

        const result = await response.json();
        setValid(result.valid);
      } catch {
        setValid(false);
      }
    };

    verifySession();
  }, []);

  const handleLoadMore = () => {
    setPageNumber((prev) => prev + 1);
  };

  const closeDetailGrid = () => {
    setShowDetails(false);
    setSelectedRecuerdo(null);
  };

  useEffect(() => {
    const fetchRecuerdos = async () => {
      setactualizando(true);
      const recuerdos = sortRecuerdosByFavorite(await getRecuerdos());
      setAllRecuerdos(recuerdos);
      setOriginalRecuerdos(recuerdos);
      setactualizando(false);
    };
    fetchRecuerdos();
  }, [update]);

  const filteredRecuerdos = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return ALL_RECUERDOS;

    return ALL_RECUERDOS.filter(
      (item) =>
        item.location.toLowerCase().includes(term) ||
        (item.tags && item.tags.some((tag: string) => tag.toLowerCase().includes(term))) ||
        (item.image_tags && item.image_tags.some((tag: string) => tag.toLowerCase().includes(term))) ||
        item.title.toLowerCase().includes(term) ||
        (item.description && item.description.toLowerCase().includes(term)) ||
        (item.image_description && item.image_description.toLowerCase().includes(term))
    );
  }, [ALL_RECUERDOS, searchTerm]);

  const visibleRecuerdos = useMemo(
    () => filteredRecuerdos.slice(0, PageNumber * 4),
    [filteredRecuerdos, PageNumber]
  );

  const showLoader = PageNumber * 4 < filteredRecuerdos.length;

  useEffect(() => {
    setPageNumber(1);
  }, [searchTerm]);


  const toggleFavorite = async (id: string | number) => {
    setAllRecuerdos((prevRecuerdos) => toggleFavoriteInList(prevRecuerdos, id));
    setOriginalRecuerdos((prevRecuerdos) => toggleFavoriteInList(prevRecuerdos, id));
    setSelectedRecuerdo((prevRecuerdo: any) =>
      prevRecuerdo?.id === id
        ? { ...prevRecuerdo, favorite: !prevRecuerdo.favorite }
        : prevRecuerdo
    );

    try {
      await updateFavorite(id);
    } catch (error) {
      setAllRecuerdos((prevRecuerdos) => toggleFavoriteInList(prevRecuerdos, id));
      setOriginalRecuerdos((prevRecuerdos) => toggleFavoriteInList(prevRecuerdos, id));
      setSelectedRecuerdo((prevRecuerdo: any) =>
        prevRecuerdo?.id === id
          ? { ...prevRecuerdo, favorite: !prevRecuerdo.favorite }
          : prevRecuerdo
      );
      console.error('Error updating favorite:', error);
    }
  };

  const handleClick = (recuerdo: any) => {
    setSelectedRecuerdo(recuerdo);
    setShowDetails(true);
  };

  const handleShowEdit = (recuerdo: any) => () => {
    setSelectedRecuerdo(recuerdo);
    setShowEdit(true);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 18, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: 'easeOut' as const } },
    hover: { y: -10, transition: { duration: 0.15 } },
  };

  if (valid === null) return <p>🔄 Verificando sesión...</p>;
  if (!valid) return <Navigate to="/login" />;

  return (
    <>
      <Box className="grilla-container">
      <Box className="grilla-content">
        <Box className="header">
          <Typography variant="h3" className="header-title">
            suas melhores lembranças {username}
          </Typography>

          <Box className="header-actions">
            <Buscar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
            <div className="tools-accordion">
              <button className="tools-toggle" onClick={() => setToolsOpen(prev => !prev)}>
                <span className={`tools-chevron${toolsOpen ? ' open' : ''}`}>&#9662;</span>
                Ferramentas
              </button>
              <div className={`tools-panel${toolsOpen ? ' open' : ''}`}>
                {visibleRecuerdos.length > 0 && (
                  <button className="tools-item" onClick={() => { setShowNewMemory(true); setToolsOpen(false); }}>
                    <span className="tools-item-icon">✨</span>
                    <span className="tools-item-label">Nuevo recuerdo</span>
                  </button>
                )}
                <div className="tools-item tools-item-stt">
                  <SpeechToText setAllRecuerdos={setAllRecuerdos} setFilteredActive={setFilteredActive} />
                </div>
                <div className="tools-divider" />
                <button
                  className={`tools-item${backfilling ? ' backfilling' : ''}`}
                  onClick={handleBackfill}
                  disabled={backfilling}
                >
                  <span className="tools-item-icon">{backfilling ? '' : '🔨'}</span>
                  <span className="tools-item-label">
                    {backfilling ? 'Procesando...' : backfillMsg || 'Analizar imágenes'}
                  </span>
                  {backfilling && <span className="backfill-spinner" />}
                </button>
                {filteredActive && (
                  <>
                    <div className="tools-divider" />
                    <button className="tools-item" onClick={() => { setAllRecuerdos(originalRecuerdos); setFilteredActive(false); setToolsOpen(false); }}>
                      <span className="tools-item-icon">👁</span>
                      <span className="tools-item-label">Mostrar todos</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </Box>
        </Box>

        {!actualizando && visibleRecuerdos.length === 0 && (
          <Typography className="error" variant="h5">
            😕 NO SE ENCONTRARON RESULTADOS 😕
          </Typography>
        )}

        {showNewMemory && (
          <NewMemory handleClose={() => setShowNewMemory(false)} update={setUpdate} open />
        )}

        {showEdit && (
          <Edit
            handleClose={() => setShowEdit(false)}
            recuerdo={selectedRecuerdo}
            open={showEdit}
            update={setUpdate}
          />
        )}

        {actualizando && (
          <Box className="loading-container">
            <div className="loading" />
          </Box>
        )}

        {showDetails && selectedRecuerdo && (
          <Details recuerdo={selectedRecuerdo} closeDetailGrid={closeDetailGrid} />
        )}

        <motion.div variants={containerVariants} initial="hidden" animate="show" className='grillaContainer'>
          {visibleRecuerdos.map((recuerdo: any) => (
            <div key={recuerdo.id}>
              <motion.div className="card-motion-wrapper" variants={itemVariants} whileHover="hover">
                <Paper className="card-glass">
                  <Box className="card-image-container">
                    <img
                      src={recuerdo.url}
                      alt={recuerdo.title}
                      className="card-image"
                      loading="lazy"
                      decoding="async"
                      width={320}
                      height={140}
                    />
                    <Box className="card-image-overlay" />
                    <Box className="card-image-content">
                      <Typography variant="subtitle1" className="card-title">
                        {recuerdo.title}
                      </Typography>
                      <button
                        onClick={() => toggleFavorite(recuerdo.id)}
                        aria-label={recuerdo.favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                        className={`favorite-button${recuerdo.favorite ? ' favorited' : ''}`}
                      >
                        {recuerdo.favorite ? '★' : '☆'}
                      </button>
                    </Box>
                  </Box>

                  <div className="card-body">
                    <Typography variant="body2" className="card-description">
                      {recuerdo.description && recuerdo.description.length > 150
                        ? recuerdo.description.slice(0, 150) + '...'
                        : recuerdo.description || ""}
                    </Typography>

                    <Typography variant="body2" className="card-location">
                      📍 {recuerdo.location}
                    </Typography>

                    <Typography variant="caption" className="card-date">
                      📅 {recuerdo.date}
                    </Typography>

                    {!!recuerdo.tags?.length && (
                      <div className="card-tags">
                        {recuerdo.tags.slice(0, 4).map((tag: string) => (
                          <Chip key={tag} label={tag} size="small" className="card-tag-chip" />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="card-actions">
                    <Button variant="contained" onClick={() => handleClick(recuerdo)} className="details-button">
                      Ver detalles
                    </Button>

                    <Button variant="outlined" color="primary" onClick={handleShowEdit(recuerdo)} className="edit-button">
                      Editar
                    </Button>
                  </div>
                </Paper>
              </motion.div>
            </div>
          ))}
        </motion.div>
      </Box>
      {showLoader && <Loader setPageNumber={handleLoadMore} />}
      <Footer />
    </Box>
    </>
  );
}
