import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    // Force light theme across the app
    setTheme("light");
    localStorage.removeItem("theme");
    document.documentElement.classList.remove("dark");
  }, []);

  const toggleTheme = () => {
    // No-op to keep the app in light theme only
    setTheme("light");
    localStorage.removeItem("theme");
    document.documentElement.classList.remove("dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);