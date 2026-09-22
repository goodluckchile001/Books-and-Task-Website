import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage.tsx";
import LoginPage from "./pages/LoginPage";
import TasksPage from "./pages/TasksPage.tsx";
import BookDetail from "./pages/BookDetail";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/books/:bookId" element={<BookDetail />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/tasks" element={<TasksPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
