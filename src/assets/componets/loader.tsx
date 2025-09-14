import { Button } from "@mui/material";
import '../styles/loader.css'

export default function Loader ({setPageNumber}){
    
    
    return (
        <div className="container">
            <Button className="load-more-button" onClick={setPageNumber}>Cargar más</Button>
        </div>
    )

}