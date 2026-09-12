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
    <section className="pt-12">
      <div className="mb-8">
        <p className="text-xs font-black tracking-wider text-teal-700">
          PERSONAL QUEUE
        </p>
        <h2>Keep your reading moving.</h2>
        <p className="m-0 text-gray-600 text-base">
          Turn good intentions into the next small step.
        </p>
      </div>
      {error && (
        <div
          className="mb-5 p-3 text-red-900 bg-red-100 border border-red-300 rounded text-xs"
          role="alert"
        >
          {error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3.5">
        <section className="border border-gray-300 rounded-xl bg-white shadow-lg p-5 self-start">
          <div className="flex items-center gap-2.5">
            <div
              className="grid place-items-center w-9 h-9 text-white rounded-lg"
              style={{ background: "var(--coral)" }}
            >
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-xs font-black tracking-wider text-teal-700">
                NEW TASK
              </p>
              <h3>Add a reading goal</h3>
            </div>
          </div>
          <form onSubmit={handleCreateTask} className="grid gap-2.5 mt-5">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Read chapter five"
              className="h-10 border border-gray-300 rounded px-3 text-gray-900 bg-white bg-opacity-75"
              required
            />
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="h-10 border border-gray-300 rounded px-3 text-gray-900 bg-white bg-opacity-75 w-full"
            >
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button
              className="inline-flex items-center justify-center gap-1 h-10 px-3 rounded text-xs font-bold text-white w-full"
              style={{ background: "var(--coral)" }}
              type="submit"
            >
              <Plus size={17} /> Add task
            </button>
          </form>
        </section>
        <section className="border border-gray-300 rounded-xl bg-white shadow-lg p-5">
          <div className="flex items-start justify-between border-b border-gray-300 pb-4 mb-4">
            <div>
              <p className="text-xs font-black tracking-wider text-teal-700">
                YOUR TASKS
              </p>
              <h3>{tasks.length} open items</h3>
            </div>
            <CheckCircle2 size={20} className="text-teal-700" />
          </div>
          <ul className="list-none p-0 m-0">
            {tasks.length === 0 ? (
              <li className="grid place-items-center gap-2 py-10 px-3 text-teal-700 text-center">
                <CheckCircle2 size={22} />
                <strong className="text-gray-900 text-sm">No tasks yet</strong>
                <span className="text-gray-600 text-xs">
                  Add your first reading goal.
                </span>
              </li>
            ) : (
              tasks.map((task) => (
                <li
                  key={task.uuid}
                  className="flex items-center gap-2.5 py-3 px-0 border-b border-gray-300 last:border-b-0"
                >
                  <span
                    className={`flex-shrink-0 w-3 h-3 border-2 rounded-full ${
                      task.completed
                        ? "border-teal-700 bg-teal-700"
                        : "border-red-600"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <strong className="block text-gray-900 text-sm">
                      {task.title}
                    </strong>
                    <small className="block mt-1 text-gray-500 text-xs">
                      {task.category?.name || "Uncategorized"}
                    </small>
                  </div>
                  {task.is_overdue && (
                    <span className="flex-shrink-0 px-2 py-1 rounded-full text-xs font-black text-red-900 bg-red-100">
                      Overdue
                    </span>
                  )}
                  <span className="flex-shrink-0 px-2 py-1 rounded-full text-xs font-black text-gray-600 bg-gray-200">
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
