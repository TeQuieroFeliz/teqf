export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center space-y-8">
      <div className="max-w-3xl space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Event Management Web App
        </h1>
        <p className="text-muted-foreground text-lg">
          A powerful tool for your company to manage event categories, items,
          sub-events, and generate reports with ease. Designed for both admins
          and event staff with full Firebase integration.
        </p>
      </div>

      <div className="max-w-4xl mt-16 grid gap-10 md:grid-cols-2 text-left">
        <div>
          <h2 className="text-2xl font-semibold mb-2">For Admin</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Secure login via Firebase Auth</li>
            <li>Create & manage categories (e.g. Chairs, Flowers, etc.)</li>
            <li>Add, update, and delete items with images</li>
            <li>Manage all submitted events</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-2">For Company Members</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Login to create and manage events</li>
            <li>Add sub-events (e.g. Sangeet, Mehndi)</li>
            <li>Filter & select items by category</li>
            <li>Add quantity & notes per item</li>
            <li>Generate PDF and notify admin via email</li>
            <li>Edit & resubmit events anytime</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
