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
        <p className="font-['Spectral',Georgia,serif] text-[13px] italic text-[#7b2d26]">
          Personal queue
        </p>
        <h2 className="font-['Spectral',Georgia,serif] text-4xl font-medium text-[#1c1b17]">
          Keep your reading moving.
        </h2>
        <p className="m-0 text-sm text-[#1c1b17]/60">
          Turn good intentions into the next small step.
        </p>
      </div>
      {error && (
        <div
          className="mb-5 border border-[#7b2d26] bg-[#f8ece9] p-3 text-xs text-[#7b2d26]"
          role="alert"
        >
          {error}
        </div>
      )}
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="self-start border border-[#1c1b17]/15 border-l-4 border-l-[#a9824f] bg-[#f3ecd9] p-6">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={20} className="text-[#7b2d26]" />
            <div>
              <p className="font-['Spectral',Georgia,serif] text-[13px] italic text-[#a9824f]">
                New task
              </p>
              <h3 className="font-['Spectral',Georgia,serif] text-lg font-semibold text-[#1c1b17]">
                Add a reading goal
              </h3>
            </div>
          </div>
          <form onSubmit={handleCreateTask} className="grid gap-2.5 mt-5">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Read chapter five"
              className="h-11 border-0 border-b border-[#1c1b17]/25 bg-transparent px-1 text-sm text-[#1c1b17] focus:border-[#0f3d2e] focus:outline-none"
              required
            />
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="h-11 border-0 border-b border-[#1c1b17]/25 bg-transparent px-1 text-sm text-[#1c1b17] focus:border-[#0f3d2e] focus:outline-none"
            >
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button
              className="inline-flex h-11 w-full items-center justify-center gap-1 bg-[#0f3d2e] px-3 text-xs font-semibold text-[#faf6ec] transition-colors hover:bg-[#18533f]"
              type="submit"
            >
              <Plus size={17} /> Add task
            </button>
          </form>
        </section>
        <section className="border-t border-[#1c1b17]/15">
          <div className="mb-1 flex items-start justify-between border-b border-[#1c1b17]/15 pb-4">
            <div>
              <p className="font-['Spectral',Georgia,serif] text-[13px] italic text-[#a9824f]">
                Your tasks
              </p>
              <h3 className="font-['Spectral',Georgia,serif] text-lg font-semibold text-[#1c1b17]">
                {tasks.length} open items
              </h3>
            </div>
            <CheckCircle2 size={20} className="text-[#0f3d2e]" />
          </div>
          <ul className="list-none p-0 m-0">
            {tasks.length === 0 ? (
              <li className="grid place-items-center gap-2 py-10 px-3 text-center text-[#1c1b17]/60">
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
                  className="flex items-center gap-2.5 border-b border-[#1c1b17]/15 py-4 last:border-b-0"
                >
                  <span
                    className={`h-3 w-3 shrink-0 rounded-full border-2 ${
                      task.completed
                        ? "border-[#0f3d2e] bg-[#0f3d2e]"
                        : "border-[#7b2d26]"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <strong className="block font-['Spectral',Georgia,serif] text-sm font-semibold text-[#1c1b17]">
                      {task.title}
                    </strong>
                    <small className="mt-1 block text-xs text-[#a9824f]">
                      {task.category?.name || "Uncategorized"}
                    </small>
                  </div>
                  {task.is_overdue && (
                    <span className="shrink-0 border border-[#7b2d26] px-2 py-1 text-xs font-semibold text-[#7b2d26]">
                      Overdue
                    </span>
                  )}
                  <span className="shrink-0 border border-[#1c1b17]/25 px-2 py-1 text-xs font-semibold text-[#1c1b17]/60">
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
