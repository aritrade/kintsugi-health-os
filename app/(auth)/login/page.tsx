import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { DemoLoginButton } from "@/components/demo-login-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <ThemeToggle className="absolute right-4 top-4 bg-card" />
      <Card>
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Sign in to continue your investigation.</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm mode="login" />

          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <DemoLoginButton />

          <p className="mt-4 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link href="/signup" className="font-medium text-primary">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
