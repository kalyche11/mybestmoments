import Home from '../assets/componets/Home';
import Login from '../assets/componets/Login';
import Grilla from './componets/grillete'; 
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles/app.css'
export default function App() {
    return (
        <div className="app-background">
            <div className="app-content">
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/grillete" element={<Grilla />} />
                    </Routes>
                </BrowserRouter>
            </div>
        </div>
    );
}