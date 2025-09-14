import '../styles/details.css';
import Paper from '@mui/material/Paper';
import { Button, IconButton, Zoom } from '@mui/material';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useState, useMemo } from 'react';

export default function Details({ recuerdo, closeDetailGrid }) {
  const { id, url, title, description, location, tags, images = [], date } = recuerdo;

  const allImages = useMemo(() => [url, ...images].filter(Boolean), [url, images]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentImage = allImages[currentIndex];

  const goNextImage = () => {
    if (currentIndex < allImages.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goBackImage = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const showPrev = currentIndex > 0;
  const showNext = currentIndex < allImages.length - 1;

  return (
    <Zoom in={true} style={{ transitionDelay: '100ms' }}>
      <div className="contenedor">
        <Paper className="detailsPaper">
          <div className="detailsInnerBackdrop">
            <div className="image-container">
              {allImages.length > 0 ? (
                <>
                  <IconButton onClick={goBackImage} disabled={!showPrev} className="arrow-button left">
                    <ArrowBackIosIcon />
                  </IconButton>
                  <img
                    src={currentImage}
                    alt={title}
                    className="details-image"
                  />
                  <IconButton onClick={goNextImage} disabled={!showNext} className="arrow-button right">
                    <ArrowForwardIcon />
                  </IconButton>
                </>
              ) : (
                <div className="loading-container">
                  <div className="loading"></div>
                </div>
              )}
            </div>

            
              <h2 className="details-title">{title}</h2>
              <p className="details-description" style={{ textAlign: 'justify' }}>{description}</p>
              <h3 className="details-location">{location}</h3>
              <h3 className="tag">{tags?.join(", ")}</h3>
              <h3 className='date'>{date}</h3>
           
            </div>

            <Button
              onClick={closeDetailGrid}
              variant="contained"
              color="primary"
              sx={{ marginTop: 2, width: '100%', fontWeight: 600, fontSize: '1rem' }}
            >
              Cerrar
            </Button>
          </Paper>
      </div>
    </Zoom>
  );
}
