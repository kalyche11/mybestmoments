import { Card, CardContent, Typography, Button, Box } from "@mui/material";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Footer from './Footer';

export default function Home() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 2,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        <Card
          sx={{
            minWidth: 320,
            maxWidth: 600,
            padding: 3,
            boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
            borderRadius: "20px",
            background: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(10px)",
          }}
        >
          <CardContent>
            <Typography
              variant="h3"
              component="div"
              sx={{
                fontWeight: "bold",
                textAlign: "center",
                background: "linear-gradient(to right, #ff9966, #ff5e62)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Welcome to My Best Moments 💫✨
            </Typography>

            <Typography
              sx={{
                mb: 3,
                textAlign: "center",
                fontSize: "1.2rem",
                color: "rgba(0,0,0,0.7)",
              }}
            >
              Un espacio para compartir tus  recuerdos más especiales (●'◡'●)
            </Typography>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ display: "flex", justifyContent: "center" }}
            >
              <Button
                variant="contained"
                size="large"
                sx={{
                  background: "linear-gradient(to right, #ff9966, #ff5e62)",
                  paddingX: 4,
                  paddingY: 1.5,
                  fontSize: "1.1rem",
                  fontWeight: "bold",
                  boxShadow: "0 5px 15px rgba(0,0,0,0.3)",
                  borderRadius: "50px",
                  transition: "all 0.3s ease",
                }}
                onClick={() => navigate("/login")}
              >
                ¡Comenzar Ahora! 🌄✨
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
      <Footer />
    </Box>
  );
}
