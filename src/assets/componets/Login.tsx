import { TextField, Button, Box, Typography, Paper } from '@mui/material';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from './Footer';

export default function Login() {
    const navigate = useNavigate();
    const [error, setError] = useState('😊');

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('Verificando...'); // Provide feedback to the user
        const formData = new FormData(e.currentTarget);
        const username = formData.get('username') as string;
        const password = formData.get('password') as string;

        try {
            const response = await fetch('/.netlify/functions/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                const sessionData = {
                    isLogged: true,
                    username: result.username
                };
                localStorage.setItem('session', JSON.stringify(sessionData));
                navigate('/grillete');
            } else {
                setError('¡Ya no tienes acceso a esta web¡. Debo dejarte ir 🕊️');
            }
        } catch (err) {
            setError('❌ Ocurrió un error de red. Inténtalo de nuevo.');
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
                            label="Nombre"
                            variant="outlined"
                            margin="normal"
                            name='username'
                            autoComplete="username"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                }
                            }}
                        />
                        <TextField
                            fullWidth
                            type="password"
                            label="¿Puedes Entrar?"
                            variant="outlined"
                            margin="normal"
                            name='password'
                            autoComplete="current-password"
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
