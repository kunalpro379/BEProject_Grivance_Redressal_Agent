import { Sun } from "lucide-react"
import { useTheme } from "./ThemeProvider"

const ThemeToggle = () => {
  const { toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      title="Light theme"
      className="rounded-full p-2 hover:bg-gray-100"
    >
      <Sun className="h-5 w-5 text-gray-600" />
    </button>
  )
}

export default ThemeToggle
