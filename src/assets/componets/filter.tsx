import TextField from '@mui/material/TextField';
import {searchFilter} from '../services/api.js'


export default function Buscar({setRecuerdos, recuerdos}){
const handleFilterMemory = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>{
    const recuerdosFiltrados = searchFilter(recuerdos,e.target.value)
    
    setRecuerdos(recuerdosFiltrados)
}
    return (
        <TextField className='buscar'
            label="Búsca lugares 🌎 o tags 🏖️"
            variant="outlined"
            color='warning'
            type='text'
            onChange={handleFilterMemory}
            sx={{
            width: '100%',           // ocupa todo el ancho disponible del padre
            maxWidth: '350px',       // nunca más ancho de 350px
            margin: '20px 0',
            '& .MuiOutlinedInput-root': {
                borderRadius: '50px',
                transition: 'all 0.3s ease-in-out',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                },
                '&.Mui-focused': {
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                transform: 'scale(1.02)',
                },
            }
            }}

        />
    );
};