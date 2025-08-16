import React, { useState } from 'react';
import { crearNuevoRecuerdo } from '../services/api.js';
import '../styles/newMemory.css';
import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Typography,
    Stack,
} from '@mui/material';
import { nanoid } from 'nanoid';

interface NewMemoryProps {
    handleClose: () => void;
    open: boolean;
    update: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function NewMemory({ handleClose, open,update }: NewMemoryProps) {
interface FormState {
  id?: string | number;
  url: string;
  title: string;
  description: string;
  location: string;
  tags: string[];
  images: string[];
  date: string;
}
    const [sent, setSent] = useState(false);
    const [id] = useState(() => nanoid());
    const [form, setForm] = useState<FormState>({
            id:id,
            url: '',
            title: '',
            description: '',
            location: '',
            tags: [],
            images: [],
            date: ''
            });
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const [name, value] = [e.target.name, e.target.value];
        if (name === 'images') {
            // Convierte la cadena de imágenes separadas por comas en un array
            const imagesArray = value.split(',').map(img => img.trim());
            setForm({ ...form, [name]: imagesArray });
            
        }else if (name === 'tags') {
            // Convierte la cadena de etiquetas separadas por comas en un array
            const tagsArray = value.split(',').map(tag => tag.trim());
            setForm({ ...form, [name]: tagsArray });
            
        }else
        setForm({ ...form, [name]: value });

    };
const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (sent) return; // Evita envíos dobles
    setSent(true);

    try {
        await crearNuevoRecuerdo(form);

        // Limpia el formulario después de guardar
        setForm({
            id:'',
            title: '',
            url: '',
            images: [],
            description: '',
            location: '',
            tags : [],
            date: ''
        });

        handleClose();
    } catch (error) {
        console.error('Error al crear el recuerdo:', error);
        alert('Hubo un problema al guardar el recuerdo. Intenta de nuevo.');
    } finally {
        setSent(false);
        update(prev => !prev);
    }
};


    

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth >
            
            <DialogTitle>
                <Typography variant="h5" fontWeight="bold" align='center'>
                    💫NUEVO RECUERDO ✨
                </Typography>
            </DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <Stack spacing={3}>
                        <TextField
                            label="Title"
                            name="title"
                            value={form.title}
                            onChange={handleChange}
                            required
                            fullWidth
                            variant="outlined"
                            margin="dense"
                        />
                        <TextField
                            label="Imagen principal link"
                            name="url"
                            onChange={handleChange}
                            fullWidth
                            variant="outlined"
                            margin="dense"
                        />
                        <TextField
                            label="Imagenes adicionales (links separados por comas)"
                            name="images"
                            onChange={handleChange}
                            fullWidth
                            variant="outlined"
                            margin="dense"
                        />
                        
                        <TextField
                            label="Description"
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            required
                            fullWidth
                            multiline
                            minRows={3}
                            variant="outlined"
                            margin="dense"
                        />
                        <TextField
                            label="Ubicación"
                            name="location"
                            value={form.location}
                            onChange={handleChange}
                            fullWidth
                            variant="outlined"
                            margin="dense"
                        />
                        <TextField
                            label="Fecha (opcional)"
                            name="date"
                            type="date"
                            value={form.date}
                            onChange={handleChange}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                            variant="outlined"
                            margin="dense"
                        />
                        <TextField
                            label="Etiquetas (separadas por comas)"
                            name="tags"
                            onChange={handleChange}
                            fullWidth
                            variant="outlined"
                            margin="dense"
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    
                        <Button onClick={handleClose} color="secondary" variant="outlined">
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        color="primary"
                        variant="contained"
                        disabled={sent} // opcional, para evitar doble clic
                        >
                        Guardar
                    </Button>
                        
                            
                        

                    
                </DialogActions>
            </form>
                {sent && (
                    <div className="padreLoading">
                        <div className="loading" style={{ width: 18, height: 18 }}></div>

                    </div>
                    )}
        </Dialog>
        
    );
}