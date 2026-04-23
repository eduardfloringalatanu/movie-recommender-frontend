import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Movies } from "./pages/Movies";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                <Route element={<ProtectedRoute />}>
                    <Route path="/movies" element={<Movies />} />
                </Route>

                <Route path="*" element={<Navigate to="/movies" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;