import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./auth";

export const ProtectedRoute = ({ children }) => {
    const { user } = useAuth();
    const [ready, setReady] = useState(false);

    useEffect(() => {
        // Give auth context a tick to rehydrate from localStorage
        const t = setTimeout(() => setReady(true), 30);
        return () => clearTimeout(t);
    }, []);

    if (!ready) return null;
    const hasToken = !!localStorage.getItem("tnh_token");
    if (!user && !hasToken) return <Navigate to="/login" replace />;
    return children;
};
