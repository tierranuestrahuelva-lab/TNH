import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { CartProvider } from "@/lib/cart";
import { ProtectedRoute } from "@/lib/ProtectedRoute";
import { Toaster } from "sonner";

import Login from "@/pages/Login";
import Shell from "@/pages/Shell";
import Dashboard from "@/pages/Dashboard";
import Catalog from "@/pages/Catalog";
import Orders from "@/pages/Orders";
import AIChat from "@/pages/AIChat";

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <CartProvider>
                    <BrowserRouter>
                        <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route
                                path="/"
                                element={
                                    <ProtectedRoute>
                                        <Shell />
                                    </ProtectedRoute>
                                }
                            >
                                <Route index element={<Navigate to="/dashboard" replace />} />
                                <Route path="dashboard" element={<Dashboard />} />
                                <Route path="catalogo" element={<Catalog />} />
                                <Route path="pedidos" element={<Orders />} />
                                <Route path="ia" element={<AIChat />} />
                            </Route>
                        </Routes>
                    </BrowserRouter>
                    <Toaster
                        position="bottom-right"
                        theme="system"
                        toastOptions={{
                            style: {
                                background: "hsl(var(--card))",
                                color: "hsl(var(--card-foreground))",
                                border: "1px solid hsl(var(--border))",
                            },
                        }}
                    />
                </CartProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
