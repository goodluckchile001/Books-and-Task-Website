import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Plus } from "lucide-react";
import {
  API,
  type Category,
  type Task,
  unwrapResults,
  getErrorMessage,
} from "../api/client";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([API.get("/tasks/"), API.get("/categories/")])
      .then(([tasksResponse, categoriesResponse]) => {
        setTasks(unwrapResults<Task>(tasksResponse.data));
        setCategories(unwrapResults<Category>(categoriesResponse.data));
      })
      .catch((err: unknown) => setError(getErrorMessage(err)));
  }, []);

  const handleCreateTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      const response = await API.post("/tasks/", {
        title,
        category_id: categoryId ? Number(categoryId) : null,
        assigned_to_ids: [],
      });
      setTasks((current) => [...current, response.data]);
      setTitle("");
      setCategoryId("");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <section className="tasks-page">
      <div className="page-heading">
        <p className="eyebrow">PERSONAL QUEUE</p>
        <h2>Keep your reading moving.</h2>
        <p className="intro-copy">
          Turn good intentions into the next small step.
        </p>
      </div>
      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}
      <div className="tasks-layout">
        <section className="content-panel task-editor">
          <div className="section-heading">
            <div className="section-icon section-icon-coral">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="eyebrow">NEW TASK</p>
              <h3>Add a reading goal</h3>
            </div>
          </div>
          <form
            onSubmit={handleCreateTask}
            className="task-form task-form-stacked"
          >
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Read chapter five"
              required
            />
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button className="button button-coral" type="submit">
              <Plus size={17} /> Add task
            </button>
          </form>
        </section>
        <section className="content-panel">
          <div className="panel-title-row">
            <div>
              <p className="eyebrow">YOUR TASKS</p>
              <h3>{tasks.length} open items</h3>
            </div>
            <CheckCircle2 size={20} />
          </div>
          <ul className="task-list">
            {tasks.length === 0 ? (
              <li className="empty-state">
                <CheckCircle2 size={22} />
                <strong>No tasks yet</strong>
                <span>Add your first reading goal.</span>
              </li>
            ) : (
              tasks.map((task) => (
                <li key={task.uuid} className="task-item">
                  <span
                    className={`task-dot ${task.completed ? "is-complete" : ""}`}
                  />
                  <div>
                    <strong>{task.title}</strong>
                    <small>{task.category?.name || "Uncategorized"}</small>
                  </div>
                  {task.is_overdue && <span className="overdue">Overdue</span>}
                  <span className="task-state">
                    {task.completed ? "Done" : "Open"}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </section>
  );
}
