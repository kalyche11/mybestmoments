import Home from '../assets/components/Home';
import Login from '../assets/components/Login';
import Grilla from './components/grillete'; 
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