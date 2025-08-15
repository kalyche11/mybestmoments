// Grilla.tsx
import { useState, useEffect } from 'react';
import { Box, Grid, Paper, Button, Chip, Typography } from '@mui/material';
import { motion } from 'framer-motion';

import '../styles/grillete.css'; // asegúrate de importar tus clases
import Buscar from './filter.js';
import NewMemoryButton from './newMemoryButton.js';
import NewMemory from './newMemory.js';
import Edit from './edit.js';
import Details from './details';
import { getRecuerdos,updateFavorite } from '../services/api.js';
import { mover } from '../funtions/mover.js';
import { Navigate } from 'react-router-dom';

export default function Grilla() {
  // verificar si esta logueado
 const session = localStorage.getItem('session');
  const UserName = session ? JSON.parse(session).username : '';


  if (!session) {
    return <Navigate to="/login" />;
  }

  const [RECUERDOS, setRecuerdos] = useState<any[]>([]);
  const [ALL_RECUERDOS, setAllRecuerdos] = useState<any[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedRecuerdo, setSelectedRecuerdo] = useState<any>(null);
  const [ShowEdit, setShowEdit] = useState(false);
  const [showNewMemory, setShowNewMemory] = useState(false);
  const [update, setUpdate] = useState(false);
  const [actualizando, setactualizando] = useState(false);

  const closeDetailGrid = () => {
    setShowDetails(false);
    setSelectedRecuerdo(null);
  };

  useEffect(() => {
    const fetchRecuerdos = async () => {
      setactualizando(true);
      const recuerdos = await getRecuerdos();
      setRecuerdos(recuerdos);
      setAllRecuerdos(recuerdos);
      setactualizando(false);
    };
    fetchRecuerdos();
  }, [update]);

  const toggleFavorite  = async (id: string | number) =>{
    const response = await updateFavorite(ALL_RECUERDOS,id);
    setUpdate(prev => !prev );
  }
    

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
        {/* Header + search */}
        <Box className="header">
          <Typography variant="h3" className="header-title">
            Tus mejores momentos, {UserName}
          </Typography>

          <Box className="header-actions">
            <Buscar recuerdos={ALL_RECUERDOS} setRecuerdos={setRecuerdos} />
            <NewMemoryButton handleClick={() => setShowNewMemory(true)} />
          </Box>
        </Box>

        {/* Empty state */}
        {!actualizando && RECUERDOS.length === 0 && (
          <Typography className="error" variant="h5">
            😕 NO SE ENCONTRARON RESULTADOS 😕
          </Typography>
        )}

        {/* Modales */}
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

        {/* Loading */}
        {actualizando && (
          <Box className="loading-container">
            <div className="loading" />
            <div className='loadingText'><Typography>Cargando recuerdos...</Typography></div>
          </Box>
        )}

        {/* Details */}
        {showDetails && selectedRecuerdo && (
          <Details recuerdo={selectedRecuerdo} closeDetailGrid={closeDetailGrid} />
        )}

        {/* Grid */}
        <motion.div variants={containerVariants} initial="hidden" animate="show" className='grillaContainer'>
            {RECUERDOS.map((recuerdo: any) => (
              <div key={recuerdo.id}  >
                <motion.div className="card-motion-wrapper" variants={itemVariants} whileHover="hover">
                  <Paper className="card-glass">
                    {/* Imagen */}
                    <Box className="card-image-container">
                      <img src={recuerdo.url} alt={recuerdo.title} className="card-image" />
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

                    {/* Body */}
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

                      {/* Tags */}
                      {!!recuerdo.tags?.length && (
                        <div className="card-tags">
                          {recuerdo.tags.slice(0, 4).map((tag: string) => (
                            <Chip key={tag} label={tag} size="small" className="card-tag-chip" />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
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
    </Box>
  );
}
