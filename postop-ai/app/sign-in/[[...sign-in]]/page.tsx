import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0f] via-[#100622] to-[#1b013a]">
      <SignIn
        appearance={{
          elements: {
            rootBox: "flex justify-center",
            card: "shadow-2xl rounded-2xl backdrop-blur-xl bg-white/10 border border-white/10",
          },
        }}
      />
    </div>
  );
}
