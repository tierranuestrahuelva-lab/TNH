import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const raw = localStorage.getItem("tnh_user");
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(false);

    const login = async (username, password) => {
        setLoading(true);
        try {
            const { data } = await api.post("/auth/login", { username, password });
            localStorage.setItem("tnh_token", data.token);
            localStorage.setItem("tnh_user", JSON.stringify(data.user));
            setUser(data.user);
            return data.user;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem("tnh_token");
        localStorage.removeItem("tnh_user");
        setUser(null);
    };

    useEffect(() => {
        const token = localStorage.getItem("tnh_token");
        if (token && !user) {
            api.get("/auth/me")
                .then((r) => setUser(r.data))
                .catch(() => logout());
        }
    }, []); // eslint-disable-line

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
