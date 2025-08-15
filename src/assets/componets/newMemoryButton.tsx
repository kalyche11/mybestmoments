import Button from '@mui/material/Button';
import './../styles/newMemoryButton.css';

export default function NewMemoryButton({ handleClick }) {
    return (
        <Button
            onClick={handleClick}
            type="button"
            variant="contained"
            className="new-memory-button"
        >
            <span className="plus-icon">+</span>
            <span>Nuevo ✨</span>
        </Button>
    );
}