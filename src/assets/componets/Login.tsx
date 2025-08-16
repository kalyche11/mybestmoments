import { TextField, Button, Box, Typography, Paper } from '@mui/material';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from './Footer';

export default function Login() {
    const navigate = useNavigate();
    const [error, setError] = useState('😊');

    const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const username = formData.get('username') as string;
        const password = formData.get('password') as string;

        if(username === 'Carlinhos' || username === 'Grays_Gostosa' && password === 'PAPAIeusomuitogostoso'){
            // Usamos un objeto para escalabilidad futura
            const sessionData = {
                isLogged: true,
                username: username
            };
            // Corregimos el typo 'isLogesd' a 'session' y guardamos el objeto
            localStorage.setItem('session', JSON.stringify(sessionData));
            navigate('/grillete');
        }else{
            setError('❌ Credenciales incorrectas')
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)',
                padding: 2
            }}
        >
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                style={{ width: '100%', maxWidth: 400 }}
            >
                <Paper
                    elevation={6}
                    sx={{
                        padding: 4,
                        borderRadius: 3,
                        background: 'rgba(255,255,255,0.9)',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                    }}
                >
                    <Typography
                        variant="h4"
                        align="center"
                        gutterBottom
                        sx={{
                            fontWeight: 'bold',
                            background: 'linear-gradient(90deg, #ff8a00, #e52e71)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        Bienvenido 👋
                    </Typography>
                    <Typography
                        variant="body2"
                        align="center"
                        sx={{ mb: 3, color: 'text.secondary' }}
                    >
                        Inicia sesión para continuar a tus mejores momentos
                       
                    </Typography>
                    <Typography
                        variant="body2"
                        align="center"
                        sx={{
                            mb: 3,
                            color: 'text.secondary',
                            }}
                    >
                        {error}
                    </Typography>

                    <form onSubmit={handleLogin}>
                        <TextField
                            fullWidth
                            label="Username"
                            variant="outlined"
                            margin="normal"
                            name='username'
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                }
                            }}
                        />
                        <TextField
                            fullWidth
                            type="password"
                            label="Password"
                            variant="outlined"
                            margin="normal"
                            name='password'
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                }
                            }}
                        />

                        <Button
                            variant="contained"
                            fullWidth
                            type="submit"
                            sx={{
                                mt: 3,
                                py: 1.5,
                                fontWeight: 'bold',
                                borderRadius: 3,
                                background: 'linear-gradient(90deg, #ff8a00, #e52e71)',
                                boxShadow: '0 4px 15px rgba(229, 46, 113, 0.4)',
                                transition: 'transform 0.2s ease',
                                '&:hover': {
                                    transform: 'scale(1.05)',
                                    boxShadow: '0 6px 20px rgba(229, 46, 113, 0.6)',
                                }
                            }}
                        >
                            🚀 Entrar
                        </Button>
                    </form>
                </Paper>
            </motion.div>
            <Footer />
        </Box>
    );
}
