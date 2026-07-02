import { Hero } from "@/components/hero";
import { UsernameGenerator } from "@/components/whatsapp/username-generator";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-12 px-4 py-24">
      <Hero />
      <div className="w-full max-w-md">
        <UsernameGenerator />
      </div>
    </main>
  );
}
