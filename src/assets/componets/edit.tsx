import {useState} from 'react';
import '../styles/edit.css'
import { actualizarRecuerdo,deleteMemory } from '../services/api.js';
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

interface NewMemoryProps {
    handleClose: () => void;
    open: boolean;
    update: React.Dispatch<React.SetStateAction<boolean>>;
    recuerdo: {
        id: string | number;
        url: string;
        title: string;
        description: string;
        location: string;
        tags: string[];
        images: string[];
        date: string;
    } | null;
}
export default function  Edit({recuerdo, handleClose, open,update} : NewMemoryProps) {
    if (!recuerdo) return null; // Evitar errores si es null

    const { id, url, title, description, location, tags, images, date = [] } = recuerdo;

    const [sent, setSent] = useState(false);
    const [form, setForm] = useState({
        title: title || '',
        url: url || '',
        images: images || [],
        description: description || '',
        location: location || '',
        tags: tags || [],
        id: id || '',
        date: date || ''

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

    }
    async function  handleDelete(id){
        setSent(true);
        await deleteMemory(id);
        handleClose();
        update(prev => !prev);
        setSent(false);
        
    }

    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sent) return; 
    setSent(true);
    try {
        const respuesta = await actualizarRecuerdo(id, form);
        if (respuesta.error) {
            throw new Error(respuesta.error);
        }

        // Limpia el formulario después de guardar
        setForm({

            title: '',
            url: '',
            images: [],
            description: '',
            location: '',
            tags: [],
            id: '',
            date: ''
        });
        handleClose();
    } catch (error) {
        console.error('Error updating recuerdo:', error);
    } finally {
        setSent(false);
        update(prev => !prev);
    }
    }

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth >
            
            <DialogTitle>
                <Typography variant="h5" fontWeight="bold" align='center'>
                    🖌️ EDITAR RECUERDO ✨
                </Typography>
            </DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <Stack spacing={3}>
                        <TextField disabled style={{display:'none'}}
                            label="ID"
                            value={form.id}
                            fullWidth
                            variant="outlined"
                            margin="dense"
                        />
                        <TextField
                            label="Título"
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
                            value={form.url}
                            onChange={handleChange}
                            fullWidth
                            variant="outlined"
                            margin="dense"
                        />
                        <TextField
                            label="Imagenes adicionales (links separados por comas)"
                            name="images"
                            value={form.images}
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
                            rows={4}
                            variant="outlined"
                            margin="dense"
                        />
                        <TextField
                            label="Location"
                            name="location"
                            value={form.location}
                            onChange={handleChange}
                            fullWidth
                            variant="outlined"
                            margin="dense"
                        />
                        <TextField
                            label="Tags (separados por comas)"
                            name="tags"
                            value={form.tags}
                            onChange={handleChange}
                            fullWidth
                            variant="outlined"
                            margin="dense"
                        />
                        <TextField
                                label="Fecha (opcional)"
                                InputLabelProps={{ shrink: true }}
                                name="date"
                                type="date"
                                value={form.date}
                                onChange={handleChange}
                                fullWidth
                                variant="outlined"
                                margin="dense"
                            />
                            
                    </Stack>
                </DialogContent>
                <DialogActions className='dialog-actions-responsive'>
                    <div className='eliminar'>
                        <Button
                            type='button'
                            color="error"
                            variant="contained"
                            disabled={sent}
                            onClick={() => handleDelete(id)}
                        >
                        Eliminar
                        </Button>
                        </div>
                        <div className='button-group'>
                            <Button onClick={handleClose} color="secondary" variant="outlined">
                            Cancelar
                            </Button>
                            <Button
                            type="submit"
                            color="primary"
                            variant="contained"
                            disabled={sent}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                            Actualizar
                            </Button>
                        
                        </div>

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