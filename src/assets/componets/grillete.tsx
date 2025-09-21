// Grilla.tsx
import { useState, useEffect, useMemo } from 'react'; // Add useMemo
import { Box, Paper, Button, Chip, Typography } from '@mui/material';
import { motion } from 'framer-motion';

import '../styles/grillete.css';
import Buscar from './filter.tsx'; // Changed to .tsx
import Loader from './loader.tsx';
import NewMemoryButton from './newMemoryButton.js';
import NewMemory from './newMemory.js';
import Edit from './edit.js';
import Details from './details';
import { getRecuerdos, updateFavorite } from '../services/api.js';
import { Navigate,useNavigate } from 'react-router-dom';
import Footer from './Footer';

  export default function Grilla() {
  const navigate = useNavigate();
  const [valid, setValid] = useState<boolean | null>(null);
  const username = localStorage.getItem("username") || "";

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

  if (valid === null) return <p>🔄 Verificando sesión...</p>;
  if (!valid) return <Navigate to="/login" />;

    



  const [RECUERDOS, setRecuerdos] = useState<any[]>([]);
  const [ALL_RECUERDOS, setAllRecuerdos] = useState<any[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedRecuerdo, setSelectedRecuerdo] = useState<any>(null);
  const [ShowEdit, setShowEdit] = useState(false);
  const [showNewMemory, setShowNewMemory] = useState(false);
  const [update, setUpdate] = useState(false);
  const [PageNumber, setPageNumber] = useState(1);
  const [actualizando, setactualizando] = useState(false);
  const [showLoadder, setShowLoader] = useState(false); // Changed initial state
  const [searchTerm, setSearchTerm] = useState(''); // New state

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
      const recuerdos = await getRecuerdos();
      setAllRecuerdos(recuerdos);
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
        (item.tags && item.tags.some((tag) => tag.toLowerCase().includes(term)))
    );
  }, [ALL_RECUERDOS, searchTerm]);

  useEffect(() => {
    setRecuerdos(filteredRecuerdos.slice(0, PageNumber * 4));
    if (PageNumber * 4 < filteredRecuerdos.length) {
      setShowLoader(true);
    } else {
      setShowLoader(false);
    }
  }, [PageNumber, filteredRecuerdos]);

  useEffect(() => {
    setPageNumber(1);
  }, [searchTerm]);


  const toggleFavorite = async (id: string | number) => {
    await updateFavorite(ALL_RECUERDOS, id);
    setUpdate((prev) => !prev);
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
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: 'easeOut' } },
    hover: { y: -10, transition: { duration: 0.15 } },
  };

  return (
    <Box className="grilla-container">
      <Box className="grilla-content">
        <Box className="header">
          <Typography variant="h3" className="header-title">
            Tus mejores momentos, {username}
          </Typography>

          <Box className="header-actions">
            <Buscar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
            {RECUERDOS.length > 0 && (
              <NewMemoryButton handleClick={() => setShowNewMemory(true)} />
            )}
          </Box>
        </Box>

        {!actualizando && RECUERDOS.length === 0 && (
          <Typography className="error" variant="h5">
            😕 NO SE ENCONTRARON RESULTADOS 😕
          </Typography>
        )}

        {showNewMemory && (
          <NewMemory handleClose={() => setShowNewMemory(false)} update={setUpdate} open />
        )}

        {ShowEdit && (
          <Edit
            handleClose={() => setShowEdit(false)}
            recuerdo={selectedRecuerdo}
            open={ShowEdit}
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
          {RECUERDOS.map((recuerdo: any) => (
            <div key={recuerdo.id}>
              <motion.div className="card-motion-wrapper" variants={itemVariants} whileHover="hover">
                <Paper className="card-glass">
                  <Box className="card-image-container">
                    <img src={recuerdo.url} alt={recuerdo.title} className="card-image" loading="lazy" />
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
                      {recuerdo.description.length > 150
                        ? recuerdo.description.slice(0, 150) + '...'
                        : recuerdo.description}
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
      {showLoadder && <Loader setPageNumber={handleLoadMore} />}
      <Footer />
    </Box>
  );
}
