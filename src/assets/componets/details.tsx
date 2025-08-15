import '../styles/details.css';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import { Button, IconButton, Zoom } from '@mui/material';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import {  useState } from 'react';
export default function Details({ recuerdo, closeDetailGrid }) {
  const { id, url, title, description, location, tags, images = [] ,date} = recuerdo;

  // Si tu objeto trae solo `url` y un array de imágenes extra:
  const allImages = [url, ...images];

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentImage = allImages[currentIndex];

  const goNextImage = () => {
    setCurrentIndex(prev => (prev < allImages.length - 1 ? prev + 1 : prev));
  };

  const goBackImage = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : prev));
  };

  return (
    <Zoom in={true} style={{ transitionDelay: '100ms' }}>
      <div className="contenedor">
        <Grid>
          <Grid className="body" sx={{ width: '100%', height: '680px' }}>
            <Paper className="detailsPaper">
              <div className="detailsInnerBackdrop">
                {/* Imagen con flechas */}
                <div className="image-container">
                  {allImages.length > 0 ? (
                    <>
                      <IconButton onClick={goBackImage} className="arrow-button left">
                        <ArrowBackIosIcon />
                      </IconButton>

                      <img
                        src={currentImage}
                        alt={title}
                        className="details-image"
                        style={{ maxHeight: '400px', maxWidth: '70%' }}
                      />

                      <IconButton onClick={goNextImage} className="arrow-button right">
                        <ArrowForwardIcon />
                      </IconButton>
                    </>
                  ) : (
                    <div className="loading-container">
                      <div className="loading"></div>
                    </div>
                  )}
                </div>

                {/* Texto */}
                <h2 className="details-title">{title}</h2>
                <p className="details-description">{description}</p>
                <h3 className="details-location">{location}</h3>
                <h3 className="tag">{tags?.join(", ")}</h3>
                <h3 className='date'>{date}</h3>

                {/* Botón cerrar */}
                <Button
                  onClick={closeDetailGrid}
                  variant="contained"
                  color="primary"
                  sx={{ marginTop: 2, width: '100%', fontWeight: 600, fontSize: '1rem' }}
                >
                  Cerrar
                </Button>
              </div>
            </Paper>
          </Grid>
        </Grid>
      </div>
    </Zoom>
  );
}
